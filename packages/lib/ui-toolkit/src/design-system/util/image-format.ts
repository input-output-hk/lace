import {
  getIpfsCidPath,
  ipfsGatewayUrl,
  IPFS_GATEWAY_URL,
  isDataUri,
  isProxiedImageUrl,
  isSafeRasterDataUri,
  proxyImageUrl,
} from '@lace-lib/image-url';

import { isWeb } from './commons';

import type { ImageProxyConfig } from '@lace-lib/image-url';
import type { ImageSource } from 'expo-image';

type ImageFormatConfig = {
  /** IPFS gateway origin (a trailing `/ipfs` is tolerated); `/ipfs/<cid>` is appended. */
  webIpfsGatewayUrl?: string;
  /** As `webIpfsGatewayUrl`, for native. */
  ipfsGatewayUrl?: string;
  /** Origin of the Lace normalizing image proxy (ADR 42). */
  imageProxyUrl?: string;
  // Hex-encoded imgproxy IMGPROXY_KEY/IMGPROXY_SALT. All three values must be
  // present to proxy at all: the deployed proxy answers unsigned requests with
  // 403, so a build missing any of them loads remote images directly.
  imageProxyKey?: string;
  imageProxySalt?: string;
};

// eslint-disable-next-line functional/no-let
let imageFormatConfig: ImageFormatConfig = {};

export const configureImageFormat = (config: ImageFormatConfig): void => {
  imageFormatConfig = { ...imageFormatConfig, ...config };
};

const getImageProxyConfig = (): ImageProxyConfig => ({
  url: imageFormatConfig.imageProxyUrl,
  key: imageFormatConfig.imageProxyKey,
  salt: imageFormatConfig.imageProxySalt,
});

const getProxiedImageUrl = (url: string): string =>
  proxyImageUrl(url, getImageProxyConfig());

const getConfiguredIpfsUrl = (cidPath: string): string =>
  ipfsGatewayUrl(
    cidPath,
    isWeb
      ? imageFormatConfig.webIpfsGatewayUrl
      : imageFormatConfig.ipfsGatewayUrl,
  );

// Captures the CID from an `/ipfs/<cid>` URL — the CID alone: a retry of a
// directory CID cannot know which file under it was wanted, and the sub-path
// may already be proxy-escaped. Non-global, so it is safe to share and use with
// RegExp.exec (no lastIndex state).
const IPFS_CID_PATH = /\/ipfs\/([^/?#]+)/;

// Web-only error-retry: re-point an image that failed to load at the built-in
// gateway, whatever gateway it came from. Unlike getAssetImageUrl this does
// look inside a gateway url: by the time it runs, that url has already proven
// it does not serve the bytes.
export const getWebIpfsFallbackSource = (uri?: string): ImageSource | null => {
  if (!isWeb || !uri) return null;
  if (uri.startsWith(`${IPFS_GATEWAY_URL}/ipfs/`)) return null;

  try {
    // Proxy sources are one encoded segment; exclude the output format before
    // decoding so a bare CID does not acquire the proxy's output suffix.
    const source = isProxiedImageUrl(uri, getImageProxyConfig())
      ? decodeURIComponent(uri.split('/plain/')[1].slice(0, -'@webp'.length))
      : uri;
    const cid = IPFS_CID_PATH.exec(source)?.[1];
    return cid ? { uri: ipfsGatewayUrl(cid) } : null;
  } catch {
    return null;
  }
};

export const formatDataUri = (params: { img: string; type: string }): string =>
  `data:image/${params.type};base64,${params.img}`;

export const getImageUri = (source: ImageSource): string | undefined => {
  if (typeof source === 'string') {
    return source || undefined;
  }
  if (source && typeof source === 'object' && 'uri' in source) {
    return source.uri || undefined;
  }
  return undefined;
};

/**
 * Refuse an SVG *media type* the same way `@lace-lib/image-url` refuses an SVG
 * `data:` URI (audit M-301): raw attacker bytes must not be wrappable into a
 * scriptable `data:image/svg+xml` by the base64 fallback at the end of
 * getAssetImageUrl. Mirrors the http(s)-only guard already live on DRep avatars
 * in `@lace-contract/governance-center`.
 */
const isSvgMediaType = (mediaType?: string): boolean =>
  mediaType !== undefined && /svg/i.test(mediaType);

export const getAssetImageUrl = (
  image?: string,
  mediaType?: string,
): string | undefined => {
  if (!image) return;
  // Every data: URI is resolved here, before anything else, so none can slip
  // past to the generic-scheme passthrough below (audit M-301). Local bytes,
  // so never proxied either.
  if (isDataUri(image)) return isSafeRasterDataUri(image) ? image : undefined;

  // Molecules and Avatar can both resolve the same URI. Only URLs that enforce
  // raster output may bypass another normalization pass.
  if (isProxiedImageUrl(image, getImageProxyConfig())) return image;

  // An `ipfs` reference (the scheme, or a bare CID) names content, not a host,
  // so it has to be resolved onto a gateway before anything can fetch it. A url
  // that already names a gateway is left alone and taken by the http branch.
  const ipfsCidPath = getIpfsCidPath(image);
  if (ipfsCidPath !== undefined) {
    return getProxiedImageUrl(getConfiguredIpfsUrl(ipfsCidPath));
  }

  if (image.startsWith('//')) return getProxiedImageUrl(`https:${image}`);
  if (/^https?:\/\//i.test(image)) return getProxiedImageUrl(image);

  // Any other uri scheme should be used as-is. This prevents treating platform asset urls/paths as base64 data.
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(image)) return image;

  // Web/static asset paths should be used as-is. Don't treat base64 strings like "/9j/..." as paths.
  const hasImageExtension = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(image);
  const isKnownAssetPath =
    image.includes('/expo/assets/') ||
    image.includes('/assets/') ||
    image.startsWith('assets/') ||
    image.startsWith('expo/assets/');
  if (hasImageExtension && (image.startsWith('/') || isKnownAssetPath))
    return image;

  // Refuse SVG media types so raw attacker bytes can't be wrapped into a
  // scriptable data:image/svg+xml here (M-301); fall through to the fallback.
  if (isSvgMediaType(mediaType)) return undefined;
  // consider detecting the image mime type from base64 hash
  return formatDataUri({ img: image, type: mediaType || 'png' });
};
