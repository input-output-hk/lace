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

/**
 * Reads Passport contract data from a Midnight indexer: the current
 * contract state through the midnight-js public data provider, and the
 * complete per-address action history through the indexer's
 * contractActions subscription.
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

  const latestContractAction = async (
    address: string,
  ): Promise<ContractActionRecord | null> => {
    const response = await fetchHttp(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($address: HexEncoded!) { contractAction(address: $address) { ${ACTION_FIELDS} } }`,
        variables: { address: stripHexPrefix(address) },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `contractAction query failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    const body = (await response.json()) as GraphQlPayload;
    if (body.errors?.length) {
      throw new Error(`contractAction query: ${JSON.stringify(body.errors)}`);
    }
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

  return {
    queryContractState: async address =>
      (await provider()).queryContractState(address),
    enumerateContractActions,
  };
};
