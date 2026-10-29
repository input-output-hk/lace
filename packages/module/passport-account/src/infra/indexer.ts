import { ByteArray, HexBytes } from '@lace-lib/util';

import type { IndexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

/** The slice of the midnight-js public data provider this client reads. */
export type IndexerPublicData = Pick<
  IndexerPublicDataProvider,
  'queryContractState'
>;

export type IndexerContractAddress = Parameters<
  IndexerPublicData['queryContractState']
>[0];

/**
 * GraphQL POST transport towards the indexer's HTTP endpoint. Injected so
 * the platform picks the transport and node tests run without a network.
 */
export type IndexerFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}>;

/**
 * The WebSocket surface the action replay uses, WHATWG-shaped so the
 * browser and node globals both satisfy it. Injected for tests.
 */
export type IndexerSocket = {
  addEventListener(
    type: 'error' | 'message' | 'open',
    listener: (event: { data?: unknown; message?: string }) => void,
  ): void;
  send(data: string): void;
  close(): void;
};

export type CreateIndexerSocket = (
  url: string,
  protocol: string,
) => IndexerSocket;

/** One replayed action of a contract address, in chain order. */
export type ContractActionRecord = {
  kind: 'ContractCall' | 'ContractDeploy' | 'ContractUpdate';
  entryPoint?: string;
  txHash: string;
  /** Wallet-style transaction identifiers (the SDK's txId encoding). */
  identifiers: string[];
  blockHeight: number;
  /** Zswap commitment-tree window of the carrying transaction. */
  startIndex?: number;
  endIndex?: number;
};

/**
 * One shielded output a transaction created, as the ledger's own event
 * reports it: the coin commitment as lowercase hex, the contract that
 * received the coin when its recipient is a contract, and the position
 * the commitment took in the Zswap commitment tree.
 */
export type ShieldedOutputRecord = {
  commitment: string;
  contractAddress?: string;
  index: bigint;
};

/**
 * The shielded events of one transaction: the outputs it created, and the
 * nullifier of every shielded coin it spent, as lowercase hex.
 */
export type ShieldedTransactionEvents = {
  outputs: ShieldedOutputRecord[];
  nullifiers: string[];
};

export type EnumerateContractActionsOptions = {
  /** Deadline for the full replay (default 60 seconds). */
  timeoutMs?: number;
  /** Grace period after the frontier for same-transaction siblings (default 500ms). */
  drainMs?: number;
};

export type IndexerClient = {
  queryContractState: (
    address: IndexerContractAddress,
  ) => ReturnType<IndexerPublicData['queryContractState']>;
  enumerateContractActions: (
    address: string,
    options?: EnumerateContractActionsOptions,
  ) => Promise<ContractActionRecord[]>;
  queryShieldedEvents: (txHash: string) => Promise<ShieldedTransactionEvents>;
};

export type CreateIndexerClientProps = {
  /** Indexer GraphQL HTTP endpoint. */
  indexerUrl: string;
  /** Indexer GraphQL WebSocket endpoint. */
  indexerWsUrl: string;
  fetchHttp?: IndexerFetch;
  createSocket?: CreateIndexerSocket;
  /** Provider factory; defaults to midnight-js' indexer provider. */
  createPublicDataProvider?: () => Promise<IndexerPublicData>;
};

const TX_FIELDS = `transaction {
  hash
  block { height }
  ... on RegularTransaction { identifiers zswapStartIndex zswapEndIndex }
}`;

const ACTION_FIELDS = `
  __typename
  ... on ContractDeploy { ${TX_FIELDS} }
  ... on ContractCall   { entryPoint ${TX_FIELDS} }
  ... on ContractUpdate { ${TX_FIELDS} }
`;

type RawContractAction = {
  __typename: ContractActionRecord['kind'];
  entryPoint?: string;
  transaction?: {
    hash?: string;
    identifiers?: string[];
    block?: { height?: number };
    zswapStartIndex?: number;
    zswapEndIndex?: number;
  };
};

type GraphQlPayload = {
  data?: { contractAction?: RawContractAction | null };
  errors?: unknown[];
};

type RawLedgerEvent = { raw?: string };

/** The ledger event of one shielded output, as ledger-v9 types its details. */
type ShieldedOutputEvent = {
  tag: 'zswapOutput';
  commitment: string;
  contract: string | undefined;
  mtIndex: bigint;
};

/** The ledger event of one shielded spend, as ledger-v9 types its details. */
type ShieldedInputEvent = {
  tag: 'zswapInput';
  nullifier: string;
};

const isShieldedOutputEvent = (content: {
  tag: string;
}): content is ShieldedOutputEvent => content.tag === 'zswapOutput';

const isShieldedInputEvent = (content: {
  tag: string;
}): content is ShieldedInputEvent => content.tag === 'zswapInput';

type TransactionEventsPayload = {
  data?: { transactions?: { zswapLedgerEvents?: RawLedgerEvent[] }[] };
  errors?: unknown[];
};

type SubscriptionMessage = {
  type?: string;
  payload?: {
    data?: { contractActions?: RawContractAction };
    errors?: unknown[];
  };
};

const toRecord = (action: RawContractAction): ContractActionRecord => {
  const transaction = action.transaction ?? {};
  return {
    kind: action.__typename,
    entryPoint: action.entryPoint ?? undefined,
    txHash: String(transaction.hash ?? ''),
    identifiers: (transaction.identifiers ?? []).map(String),
    blockHeight: Number(transaction.block?.height ?? 0),
    startIndex:
      transaction.zswapStartIndex == null
        ? undefined
        : Number(transaction.zswapStartIndex),
    endIndex:
      transaction.zswapEndIndex == null
        ? undefined
        : Number(transaction.zswapEndIndex),
  };
};

const stripHexPrefix = (address: string): string => address.replace(/^0x/, '');

const HEX_BYTES_PATTERN = /^(?:[0-9a-fA-F]{2})*$/;

/**
 * The bytes of a ledger event the indexer returned as hex. A payload that
 * is not whole hex bytes is refused outright: decoding it leniently would
 * hand the ledger a truncated event and lose the output it described.
 */
const eventBytes = (raw: string): Uint8Array => {
  if (!HEX_BYTES_PATTERN.test(raw)) {
    throw new Error(`transactions query: ledger event is not hex: "${raw}"`);
  }
  return ByteArray.fromHex(HexBytes(raw));
};

/**
 * Reads Passport contract data from a Midnight indexer: the current
 * contract state through the midnight-js public data provider, the
 * complete per-address action history through the indexer's
 * contractActions subscription, and the shielded outputs a transaction
 * created and the coins it spent through the ledger events the indexer
 * keeps per transaction.
 */
export const createIndexerClient = ({
  indexerUrl,
  indexerWsUrl,
  fetchHttp = globalThis.fetch,
  createSocket = (url, protocol) => new WebSocket(url, protocol),
  createPublicDataProvider,
}: CreateIndexerClientProps): IndexerClient => {
  const defaultProvider = async (): Promise<IndexerPublicData> => {
    const { indexerPublicDataProvider } = await import(
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
    );
    return indexerPublicDataProvider({
      queryURL: indexerUrl,
      subscriptionURL: indexerWsUrl,
    });
  };

  let providerPromise: Promise<IndexerPublicData> | undefined;
  const provider = async (): Promise<IndexerPublicData> =>
    (providerPromise ??= (createPublicDataProvider ?? defaultProvider)());

  const postQuery = async <Payload extends { errors?: unknown[] }>(
    name: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<Payload> => {
    const response = await fetchHttp(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      throw new Error(
        `${name} query failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    const body = (await response.json()) as Payload;
    if (body.errors?.length) {
      throw new Error(`${name} query: ${JSON.stringify(body.errors)}`);
    }
    return body;
  };

  const latestContractAction = async (
    address: string,
  ): Promise<ContractActionRecord | null> => {
    const body = await postQuery<GraphQlPayload>(
      'contractAction',
      `query($address: HexEncoded!) { contractAction(address: $address) { ${ACTION_FIELDS} } }`,
      { address: stripHexPrefix(address) },
    );
    const action = body.data?.contractAction;
    return action ? toRecord(action) : null;
  };

  /*
   * The indexer's contractAction QUERY returns a single action (the latest
   * at or before an offset); enumeration is the contractActions
   * SUBSCRIPTION, which replays the complete per-address history from a
   * block height. The point query supplies the frontier (the latest
   * action); the subscription is replayed from genesis until the frontier
   * arrives, then closed, so a discovering wallet needs nothing but the
   * contract address.
   */
  const enumerateContractActions = async (
    address: string,
    { timeoutMs = 60_000, drainMs = 500 }: EnumerateContractActionsOptions = {},
  ): Promise<ContractActionRecord[]> => {
    const frontier = await latestContractAction(address);
    if (!frontier) return [];

    return new Promise<ContractActionRecord[]>((resolve, reject) => {
      const actions: ContractActionRecord[] = [];
      const socket = createSocket(indexerWsUrl, 'graphql-transport-ws');
      let drain: ReturnType<typeof setTimeout> | undefined;
      const deadline = setTimeout(() => {
        fail(
          new Error(
            `contractActions replay timed out after ${timeoutMs}ms (${actions.length} received)`,
          ),
        );
      }, timeoutMs);
      const finish = (error?: Error) => {
        clearTimeout(deadline);
        if (drain) clearTimeout(drain);
        try {
          socket.close();
        } catch {
          /* already closed */
        }
        if (error) reject(error);
        else resolve(actions);
      };
      const fail = (error: Error) => {
        finish(error);
      };

      socket.addEventListener('error', event => {
        fail(new Error(`indexer websocket: ${event.message ?? 'error'}`));
      });
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'connection_init' }));
      });
      socket.addEventListener('message', event => {
        const message = JSON.parse(String(event.data)) as SubscriptionMessage;
        switch (message.type ?? '') {
          case 'connection_ack': {
            socket.send(
              JSON.stringify({
                id: '1',
                type: 'subscribe',
                payload: {
                  query: `subscription($address: HexEncoded!) {
                    contractActions(address: $address, offset: { height: 0 }) { ${ACTION_FIELDS} }
                  }`,
                  variables: { address: stripHexPrefix(address) },
                },
              }),
            );
            break;
          }
          case 'next': {
            if (message.payload?.errors?.length) {
              fail(
                new Error(
                  `contractActions subscription: ${JSON.stringify(
                    message.payload.errors,
                  )}`,
                ),
              );
              break;
            }
            const action = message.payload?.data?.contractActions;
            if (!action) break;
            actions.push(toRecord(action));
            // The stream is live and unbounded; stop once the frontier has
            // been replayed, draining briefly for same-transaction siblings.
            if (actions.at(-1)?.txHash === frontier.txHash && !drain) {
              drain = setTimeout(() => {
                finish();
              }, drainMs);
            }
            break;
          }
          case 'error': {
            fail(
              new Error(
                `contractActions subscription: ${JSON.stringify(
                  message.payload,
                )}`,
              ),
            );
            break;
          }
          case 'complete': {
            finish();
            break;
          }
          default: {
            break;
          }
        }
      });
    });
  };

  /**
   * The indexer keeps, per transaction, the events the ledger emitted while
   * applying it; a shielded output's event carries the commitment and the
   * tree index the ledger assigned, so the index is read, never inferred
   * from the transaction's position window, and a shielded spend's event
   * carries the nullifier the ledger recorded for the coin it consumed.
   */
  const queryShieldedEvents = async (
    txHash: string,
  ): Promise<ShieldedTransactionEvents> => {
    const body = await postQuery<TransactionEventsPayload>(
      'transactions',
      `query($offset: TransactionOffset!) { transactions(offset: $offset) { hash ... on RegularTransaction { zswapLedgerEvents { raw } } } }`,
      { offset: { hash: stripHexPrefix(txHash) } },
    );
    const events = (body.data?.transactions ?? []).flatMap(
      transaction => transaction.zswapLedgerEvents ?? [],
    );
    const found: ShieldedTransactionEvents = { outputs: [], nullifiers: [] };
    if (events.length === 0) return found;
    const { Event } = await import('@midnightntwrk/ledger-v9');
    for (const { raw } of events) {
      const { content } = Event.deserialize(
        eventBytes(stripHexPrefix(raw ?? '')),
      );
      if (isShieldedOutputEvent(content)) {
        found.outputs.push({
          commitment: content.commitment.toLowerCase(),
          ...(content.contract === undefined
            ? {}
            : { contractAddress: content.contract.toLowerCase() }),
          index: content.mtIndex,
        });
      } else if (isShieldedInputEvent(content)) {
        found.nullifiers.push(content.nullifier.toLowerCase());
      }
    }
    return found;
  };

  return {
    queryContractState: async address =>
      (await provider()).queryContractState(address),
    enumerateContractActions,
    queryShieldedEvents,
  };
};
