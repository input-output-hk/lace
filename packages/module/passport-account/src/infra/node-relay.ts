import { HexBytes } from '@lace-lib/util';

/**
 * Transaction status callback shape of the polkadot extrinsic watch, kept
 * structural so tests inject plain objects.
 */
type ExtrinsicStatus = {
  type: string;
  isInBlock: boolean;
  isInvalid: boolean;
  isDropped: boolean;
  isUsurped: boolean;
  isFinalityTimeout: boolean;
};

type SubmittableResult = { status: ExtrinsicStatus };

type SendCallback = (result: SubmittableResult) => void;

type NodeApi = {
  tx: Record<
    string,
    Record<
      string,
      (hex: string) => {
        send: (callback: SendCallback) => Promise<() => void>;
      }
    >
  >;
  disconnect: () => Promise<void>;
};

/** Connects an extrinsic api to the node; injected so tests stub it. */
export type ConnectNodeApi = (nodeUrl: string) => Promise<NodeApi>;

const defaultConnect: ConnectNodeApi = async nodeUrl => {
  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  return (await ApiPromise.create({
    provider: new WsProvider(nodeUrl.replace(/^http/, 'ws')),
    noInitWarn: true,
  })) as unknown as NodeApi;
};

const bytesToHex = (bytes: Uint8Array): string =>
  `0x${HexBytes.fromByteArray(bytes)}`;

const submitOverRelay = async (
  api: NodeApi,
  tx: { serialize: () => Uint8Array },
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const stopWatching = (): void => {
      void unsubscribe.then(stop => {
        stop();
      });
    };

    const onStatus = ({ status }: SubmittableResult): void => {
      if (status.isInBlock) {
        stopWatching();
        resolve();
      } else if (status.isInvalid || status.isDropped || status.isUsurped) {
        stopWatching();
        reject(new Error(`Transaction ${status.type}`));
      }
    };

    const unsubscribe = api.tx['midnight']
      ['sendMnTransaction'](bytesToHex(tx.serialize()))
      .send(onStatus);
    unsubscribe.catch(reject);
  });

/**
 * Submits serialized Midnight transactions over the node's extrinsic
 * relay (`midnight.sendMnTransaction`) and resolves once the transaction
 * is in a block, mirroring the reference wallet's submission semantics.
 * A mempool rejection surfaces as the node's RPC error (for example
 * `Invalid Transaction`), so the dust-race retry can classify it; an
 * invalid, dropped, or usurped status rejects with the status name.
 */
export const createNodeRelaySubmissionService = async (
  nodeUrl: string,
  connect: ConnectNodeApi = defaultConnect,
): Promise<{
  submitTransaction: (tx: { serialize: () => Uint8Array }) => Promise<void>;
  close: () => Promise<void>;
}> => {
  const api = await connect(nodeUrl);
  return {
    submitTransaction: async tx => submitOverRelay(api, tx),
    close: async () => {
      await api.disconnect();
    },
  };
};
