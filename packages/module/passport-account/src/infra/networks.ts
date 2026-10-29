import type { PassportNetworkConfig } from '@lace-contract/passport';

/** The endpoints of a network preset: everything but the artefact bundle. */
type NetworkEndpoints = Omit<PassportNetworkConfig, 'artefactUrl'>;

/**
 * Midnight devnet, the public network that runs the ledger 9 line the
 * vendored contract targets. Its id is the segment devnet addresses carry
 * (`mn_addr_devnet1...`), the indexer is reached over HTTPS with its
 * subscriptions over a websocket twin, and the node is reached over the
 * HTTPS RPC, from which the clients derive the websocket relay. The
 * network hosts no proof server and no artefact bundle.
 */
const MIDNIGHT_DEVNET_ENDPOINTS: NetworkEndpoints = {
  networkId: 'devnet',
  indexerUrl: 'https://indexer.devnet.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.devnet.midnight.network/api/v4/graphql/ws',
  nodeUrl: 'https://rpc.devnet.midnight.network',
};

/** What the devnet preset leaves to the consumer. */
export type MidnightDevnetNetworkProps = {
  /**
   * Base URL of the hosted artefact bundle the module downloads circuit
   * assets from; the network hosts none, so every consumer supplies its
   * own.
   */
  artefactUrl: string;
};

/**
 * The network config of Midnight devnet with the consumer's artefact
 * bundle. The preset carries the public endpoints only: the proof server
 * runs locally and is wired through the prover and the sponsor, and the
 * artefact bundle is hosted by the consumer.
 */
export const midnightDevnetNetwork = ({
  artefactUrl,
}: MidnightDevnetNetworkProps): PassportNetworkConfig => ({
  ...MIDNIGHT_DEVNET_ENDPOINTS,
  artefactUrl,
});

/**
 * A network id is written verbatim into the bech32m prefix of every
 * address on that network, after an underscore that separates the prefix
 * segments, so it is lowercase and carries no underscore. The bech32m
 * alphabet also has no zero, which the address codec refuses.
 */
const NETWORK_ID_PATTERN = /^[a-z1-9-]+$/;

const HTTP_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
const WS_PROTOCOLS: ReadonlySet<string> = new Set(['ws:', 'wss:']);

const protocolOf = (
  field: keyof PassportNetworkConfig,
  url: string,
): string => {
  try {
    return new URL(url).protocol;
  } catch {
    throw new Error(
      `The Passport network ${field} "${url}" is not an absolute URL.`,
    );
  }
};

const requireProtocol = (
  field: keyof PassportNetworkConfig,
  url: string,
  allowed: ReadonlySet<string>,
): void => {
  const protocol = protocolOf(field, url);
  if (!allowed.has(protocol)) {
    throw new Error(
      `The Passport network ${field} "${url}" must use ${[...allowed].join(
        ' or ',
      )}, not ${protocol}.`,
    );
  }
};

/**
 * Checks a network config against what the Midnight clients do with it,
 * so a misconfigured network fails when the module is built rather than
 * inside the first chain flow. The node and artefact URLs are reached over
 * HTTP and the node URL is also rewritten to its websocket relay by
 * replacing the scheme, so both must be http(s); the indexer subscription
 * URL is opened as a websocket, so it must be ws(s). Returns the config it
 * was given.
 */
export const validatePassportNetwork = (
  network: PassportNetworkConfig,
): PassportNetworkConfig => {
  if (!NETWORK_ID_PATTERN.test(network.networkId)) {
    throw new Error(
      `The Passport network id "${network.networkId}" is not a Midnight network id: it must be lowercase letters, digits other than zero, and hyphens.`,
    );
  }
  requireProtocol('indexerUrl', network.indexerUrl, HTTP_PROTOCOLS);
  requireProtocol('indexerWsUrl', network.indexerWsUrl, WS_PROTOCOLS);
  requireProtocol('nodeUrl', network.nodeUrl, HTTP_PROTOCOLS);
  requireProtocol('artefactUrl', network.artefactUrl, HTTP_PROTOCOLS);
  return network;
};
