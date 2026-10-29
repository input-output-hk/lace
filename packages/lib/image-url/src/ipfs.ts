import * as CidValidator from '@biglup/is-cid';

/**
 * The gateway an `ipfs` reference resolves to.
 *
 * blockfrost rather than one of the large public gateways because this url is
 * loaded by a BROWSER whenever no proxy is configured: dweb.link, ipfs.io and
 * nftstorage.link all answer a browser User-Agent with a bot-management 403
 * whose body carries `Cross-Origin-Resource-Policy: same-origin`, which the
 * browser surfaces as ERR_BLOCKED_BY_RESPONSE.NotSameOrigin — an image that
 * cannot render. A CID nobody pinned with blockfrost can still 504; the proxy
 * is what normalizes content, so the client needs no second gateway.
 */
export const IPFS_GATEWAY_URL = 'https://ipfs.blockfrost.dev';

// A protocol-less reference is IPFS content when its first path segment is a
// valid CID (`<cid>`, `<cid>/image.png`, or `<cid>?filename=art.png` — the
// gateway convention, so a query terminates the CID just as `/` does). The CID
// check is what keeps base64 payloads and plain filenames from being misread
// as IPFS.
const startsWithCid = (uri: string): boolean => {
  const [cid] = uri.split(/[/?#]/);
  return cid !== undefined && cid !== '' && CidValidator.isValid(cid);
};

/**
 * The `<cid>[/path][?query]` an `ipfs` reference names — the `ipfs://` scheme
 * or a bare CID — or `undefined` when the input is not one.
 *
 * A url that merely contains `/ipfs/<cid>` is deliberately NOT one: it is an
 * ordinary http url that already names a gateway, and rewriting it onto ours
 * would break an image that loads today. It reaches the proxy unchanged.
 *
 * The trailing path and query are preserved, so a directory CID keeps pointing
 * at the file inside it.
 */
export const getIpfsCidPath = (uri: string): string | undefined => {
  if (uri.startsWith('ipfs://') || uri.startsWith('ipfs/')) {
    return uri.replace(/^ipfs:\/\//, '').replace(/^ipfs\//, '');
  }
  return startsWithCid(uri) ? uri : undefined;
};

/**
 * A gateway url for `cidPath`. `gateway` is an origin; a value that already
 * ends in `/ipfs` is accepted too, so an app's configured gateway works in
 * either spelling.
 */
export const ipfsGatewayUrl = (
  cidPath: string,
  gateway: string = IPFS_GATEWAY_URL,
): string =>
  `${gateway.replace(/\/+$/, '').replace(/\/ipfs$/, '')}/ipfs/${cidPath}`;
