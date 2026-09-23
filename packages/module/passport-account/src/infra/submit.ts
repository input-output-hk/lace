import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

/** Waits for the given number of milliseconds; injected so tests control time. */
export type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = async ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

/**
 * Node rejections caused by the wallet's dust view lagging the chain: a
 * transaction built before the previous one landed can reuse a dust
 * nullifier (DustDoubleSpend) or emit an empty dust action set
 * (NotNormalized), and the node rejects it at submission.
 */
const DUST_RACE_PATTERN =
  /SubmissionError|Invalid Transaction|DustDoubleSpend|NotNormalized/;

export type SubmitWithDustRetryOptions = {
  /** Waits between attempts; defaults to a real timer. */
  sleep?: Sleep;
  /** Retries after the first attempt (default 3). */
  maxRetries?: number;
  /** Delay before each retry (default 10 seconds). */
  retryDelayMs?: number;
};

const errorText = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/**
 * Whether an error reports the verdict of a transaction that reached the
 * chain. midnight-js raises these carrying the finalized data, and builds
 * the message out of it, so the message can quote node text that reads
 * like a dust-race rejection. Such a submission consumed its
 * authorisation, so it must never be resubmitted whatever it says.
 */
const isFinalizedVerdict = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'finalizedTxData' in error;

/**
 * Runs a submission with a dust-race retry. A submission the node rejects
 * changes no chain state and invalidates no signed authorisation, so
 * waiting for the wallet's dust view to catch up and resubmitting is
 * sound. Only the documented dust-race rejections are retried; any other
 * error, or a dust race persisting past the retry budget, is rethrown.
 */
export const submitWithDustRetry = async <T>(
  submit: () => Promise<T>,
  {
    sleep = defaultSleep,
    maxRetries = 3,
    retryDelayMs = 10_000,
  }: SubmitWithDustRetryOptions = {},
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await submit();
    } catch (error) {
      const isDustRace =
        !isFinalizedVerdict(error) && DUST_RACE_PATTERN.test(errorText(error));
      if (!isDustRace || attempt >= maxRetries) throw error;
      await sleep(retryDelayMs);
    }
  }
};

/**
 * Proves, balances, and submits one unproven contract transaction through
 * the given midnight-js providers and resolves with the finalized
 * transaction data.
 */
export type ContractTxSubmitter<TProviders, TOptions> = (
  providers: TProviders,
  options: TOptions,
) => Promise<FinalizedTxData>;

export type SubmitTxConfig<TProviders, TOptions> =
  SubmitWithDustRetryOptions & {
    /** Submission entry point; defaults to midnight-js-contracts' submitTx. */
    submit?: ContractTxSubmitter<TProviders, TOptions>;
  };

const defaultSubmit = async <TProviders, TOptions>(): Promise<
  ContractTxSubmitter<TProviders, TOptions>
> => {
  const contracts = await import('@midnight-ntwrk/midnight-js-contracts');
  return contracts.submitTx as unknown as ContractTxSubmitter<
    TProviders,
    TOptions
  >;
};

/**
 * Submits an unproven deployment or call transaction through midnight-js,
 * wrapped in {@link submitWithDustRetry} so dust-race rejections rebuild
 * and resubmit instead of failing the flow.
 */
export const submitTx = async <TProviders, TOptions>(
  providers: TProviders,
  options: TOptions,
  config: SubmitTxConfig<TProviders, TOptions> = {},
): Promise<FinalizedTxData> => {
  const { submit, ...retryOptions } = config;
  const run = submit ?? (await defaultSubmit<TProviders, TOptions>());
  return submitWithDustRetry(async () => run(providers, options), retryOptions);
};

/**
 * Where the submission entry points carry the finalized status: directly
 * on the finalized data of a deploy or maintenance submission, and under
 * `public` on the finalized data of a circuit call.
 */
type FinalizedStatusData = {
  status?: unknown;
  public?: { status?: unknown };
};

const finalizedStatus = (finalized: unknown): unknown => {
  const data = finalized as FinalizedStatusData | null | undefined;
  return data?.public?.status ?? data?.status;
};

/**
 * Rejects a transaction that landed with a failing status. Such a
 * submission resolves, but the circuit's effects were discarded, so
 * nothing the call was meant to advance may be treated as done. A
 * submission carrying no status is accepted: absence is not a failure
 * verdict.
 *
 * Throwing here happens after {@link submitWithDustRetry} has resolved,
 * and the message matches none of the dust-race patterns, so a status
 * failure is never resubmitted: the transaction reached the chain, and a
 * rebuild could present an authorisation the contract has consumed.
 */
export const assertSubmitted = (label: string, finalized: unknown): void => {
  const status = finalizedStatus(finalized);
  if (String(status).toLowerCase().includes('fail')) {
    throw new Error(`${label} failed: ${JSON.stringify(status)}`);
  }
};
