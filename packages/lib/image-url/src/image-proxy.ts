import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { base64urlnopad } from '@scure/base';

/**
 * Origin + credentials of the Lace normalizing image proxy (ADR 42), as an app
 * supplies them from its build-time environment.
 *
 * `key`/`salt` are the hex-encoded imgproxy `IMGPROXY_KEY`/`IMGPROXY_SALT`.
 * They ship inside the client bundle, so the signature is an anti-abuse measure
 * (a bot that has not unpacked a Lace build cannot mint proxy urls) rather than
 * an authenticity guarantee.
 *
 * A partial config disables proxying entirely: the deployed proxy answers
 * unsigned requests with 403, so a build missing any of the three must load
 * images directly rather than emit urls that resolve to nothing.
 */
export type ImageProxyConfig = {
  url?: string;
  key?: string;
  salt?: string;
};

// imgproxy signs the path that follows the signature segment: HMAC-SHA256 of
// (salt || path), URL-safe-base64 encoded without padding.
const signPath = (path: string, key: string, salt: string): string =>
  base64urlnopad.encode(
    hmac(
      sha256,
      hexToBytes(key),
      concatBytes(hexToBytes(salt), utf8ToBytes(path)),
    ),
  );

// Encoding the entire source as one segment prevents browser dot-segment
// normalization from changing the signed path. imgproxy decodes it once.
const escapeSourceUrl = (sourceUrl: string): string | undefined => {
  try {
    return encodeURIComponent(sourceUrl);
  } catch {
    return undefined;
  }
};

// Credentials are public: the origin and a valid signature do not prove that
// a URL normalizes bytes. Accept only our bounded, explicitly raster path.
const NORMALIZED_PATH =
  /^[\w-]{43}\/rs:fit:1024:1024\/plain\/(?:[\w.!~*'()-]|%[\dA-F]{2})+@webp$/;

/**
 * Whether `url` already requests normalized raster bytes from the proxy.
 *
 * Other URLs on the same origin still need proxying: attacker-selected
 * processing options can disable normalization even with a valid signature.
 */
export const isProxiedImageUrl = (
  url: string,
  { url: origin }: ImageProxyConfig,
): boolean => {
  const prefix = `${origin?.trim().replace(/\/+$/, '')}/`;
  return (
    !!origin?.trim() &&
    url.startsWith(prefix) &&
    NORMALIZED_PATH.test(url.slice(prefix.length))
  );
};

/**
 * Route remote image bytes through the image proxy, in imgproxy's "plain"
 * source-url syntax, as WebP fitted within 1024×1024 without upscaling rasters.
 *
 * Returns `sourceUrl` unchanged when the proxy is not fully configured, and
 * when it already requests normalized raster bytes — safe to apply twice.
 * Callers must keep local `data:` and bundled-asset urls away from it: only
 * remote bytes belong on the proxy.
 */
export const proxyImageUrl = (
  sourceUrl: string,
  config: ImageProxyConfig,
): string => {
  // Trimmed: these arrive from a build-time env, and a secret that picked up a
  // trailing newline is a configured proxy, not an unset one.
  const url = config.url?.trim();
  const key = config.key?.trim();
  const salt = config.salt?.trim();
  if (!url || !key || !salt) return sourceUrl;
  if (isProxiedImageUrl(sourceUrl, { url })) return sourceUrl;
  const origin = url.replace(/\/+$/, '');
  const escaped = escapeSourceUrl(sourceUrl);
  // Malformed UTF-16 metadata cannot be represented by encodeURIComponent.
  if (escaped === undefined) return sourceUrl;
  const path = `/rs:fit:1024:1024/plain/${escaped}@webp`;
  try {
    return `${origin}/${signPath(path, key, salt)}${path}`;
  } catch {
    // A credential that is not even-length hex makes hexToBytes throw, and this
    // runs inside render — an uncaught throw would take out the screen for a
    // cosmetic image. Only a misconfigured build can reach it (mint metadata
    // cannot), so bypassing is both safe and the answer an unset config gets.
    return sourceUrl;
  }
};
