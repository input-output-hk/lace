import { describe, expect, it } from 'vitest';

import { getIpfsCidPath, IPFS_GATEWAY_URL, ipfsGatewayUrl } from '../src';

// A real CIDv1, from the LW-15013 proxy example.
const CID = 'bafybeict2kq6gt4ikgulypt7h7nwj4hmfi2kevrqvnx2osibfulyy5x3hu';
// A real CIDv0.
const CID_V0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

describe('getIpfsCidPath', () => {
  it.each([
    ['the ipfs:// scheme', `ipfs://${CID}`, CID],
    [
      'the ipfs:// scheme with a redundant ipfs/ prefix',
      `ipfs://ipfs/${CID}`,
      CID,
    ],
    ['a scheme-less ipfs/ prefix', `ipfs/${CID}`, CID],
    ['a bare CIDv1', CID, CID],
    ['a bare CIDv0', CID_V0, CID_V0],
    [
      'a directory CID, keeping the path',
      `ipfs://${CID}/art.png`,
      `${CID}/art.png`,
    ],
    [
      'a bare CID with the gateway filename query',
      `${CID}?filename=art.png`,
      `${CID}?filename=art.png`,
    ],
  ])('extracts the cid path from %s', (_name, uri, expected) => {
    expect(getIpfsCidPath(uri)).toBe(expected);
  });

  // A url that already names a gateway is an ordinary http url: rewriting it
  // onto ours would break an image that loads today, so the http branch takes
  // it and the proxy sees it unchanged.
  it.each([
    ['a third-party gateway url', `https://ipfs.io/ipfs/${CID}`],
    ['our own gateway url', `${IPFS_GATEWAY_URL}/ipfs/${CID}`],
    [
      "blockfrost's nested gateway path",
      `https://ipfs.blockfrost.io/api/v0/ipfs/gateway/${CID}`,
    ],
    ['an https url with no ipfs segment', 'https://example.com/art.png'],
    [
      'a url whose path merely contains /ipfs/',
      'https://x.example/a/ipfs/b.png',
    ],
    ['a data uri', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'],
    ['a bundled asset path', '/expo/assets/logo.png'],
    ['a raw base64 payload', 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbybl'],
    ['a plain filename', 'logo.png'],
    ['an empty string', ''],
  ])('returns undefined for %s', (_name, uri) => {
    expect(getIpfsCidPath(uri)).toBeUndefined();
  });
});

describe('ipfsGatewayUrl', () => {
  it('defaults to the built-in gateway', () => {
    expect(ipfsGatewayUrl(CID)).toBe(`${IPFS_GATEWAY_URL}/ipfs/${CID}`);
  });

  it.each([
    ['an origin', 'https://my.gateway'],
    ['an origin with a trailing slash', 'https://my.gateway/'],
    ['an origin that already names the /ipfs path', 'https://my.gateway/ipfs'],
    ['an /ipfs path with a trailing slash', 'https://my.gateway/ipfs/'],
  ])('accepts a configured gateway given as %s', (_name, gateway) => {
    expect(ipfsGatewayUrl(CID, gateway)).toBe(`https://my.gateway/ipfs/${CID}`);
  });
});
