import { isWeb } from './commons';

import type { ImageSource } from 'expo-image';

const BASE_IPFS_GATEWAY_URL = 'https://ipfs.blockfrost.dev';

type ImageFormatConfig = {
  webIpfsGatewayUrl?: string;
  ipfsGatewayUrl?: string;
};

// eslint-disable-next-line functional/no-let
let imageFormatConfig: ImageFormatConfig = {};

export const configureImageFormat = (config: ImageFormatConfig): void => {
  imageFormatConfig = { ...imageFormatConfig, ...config };
};

// Captures the CID (and any sub-path) from an `/ipfs/<cid>` URL. Non-global,
// so it is safe to share and use with RegExp.exec (no lastIndex state).
const IPFS_CID_PATH = /\/ipfs\/([^/?#]+)/;

export const getWebIpfsFallbackUri = (uri?: string): string | undefined => {
  if (!uri) return;
  if (!isWeb) return uri;

  if (uri.includes('://ipfs.blockfrost.dev/ipfs/')) return uri;

  const match = IPFS_CID_PATH.exec(uri);
  if (!match) return uri;

  const cid = match[1];
  if (!cid) return uri;

  return `${BASE_IPFS_GATEWAY_URL}/ipfs/${cid}`;
};

export const getWebIpfsFallbackSource = (uri?: string): ImageSource | null => {
  if (!isWeb || !uri) return null;

  const match = IPFS_CID_PATH.exec(uri);
  if (!match) return null;
  const cid = match[1];
  if (!cid) return null;

  if (uri.includes('://ipfs.blockfrost.dev/ipfs/')) return null;
  return { uri: `${BASE_IPFS_GATEWAY_URL}/ipfs/${cid}` };
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
 * Attacker-controlled token/NFT/dApp metadata must never reach an `<img src>`
 * as an inline SVG: SVG can carry scripts and — unlike raster data URIs — is a
 * code-execution surface if the browser's SVG-as-`<img>` sandbox ever fails
 * (NWL R1 audit M-301). Blocklisting SVG spellings is bypassable (casing,
 * percent-encoding, MIME aliases), so instead we *allowlist* known-safe raster
 * `data:` media types and refuse every other `data:` URI — SVG in any form,
 * and non-image data URIs, included — falling through to the icon fallback. SVG
 * *media types* are refused the same way. Remote http(s)/ipfs images are
 * unaffected. Mirrors the http(s)-only guard already live on DRep avatars in
 * @lace-contract/governance-center.
 */
const SAFE_RASTER_DATA_URI = /^data:image\/(png|jpe?g|gif|webp|avif|bmp)[;,]/i;
const isSvgMediaType = (mediaType?: string): boolean =>
  mediaType !== undefined && /svg/i.test(mediaType);

export const getAssetImageUrl = (
  image?: string,
  mediaType?: string,
): string | undefined => {
  if (!image) return;
  if (image.startsWith('http')) return image;
  // Handle every data: URI here (case-insensitive) so none can slip past to the
  // generic-scheme passthrough below. Only known-safe raster media types are
  // allowed through; SVG in any spelling/encoding, and non-image data: URIs,
  // fall through to the icon fallback.
  if (/^data:/i.test(image))
    return SAFE_RASTER_DATA_URI.test(image) ? image : undefined;
  if (image.startsWith('ipfs')) {
    const ipfsGateway = isWeb
      ? imageFormatConfig.webIpfsGatewayUrl
      : imageFormatConfig.ipfsGatewayUrl;

    const base = (ipfsGateway || BASE_IPFS_GATEWAY_URL).replace(/\/+$/, '');
    const path = image.replace(/^ipfs:\/\//, '').replace(/^ipfs\//, '');

    return `${base}/ipfs/${path}`;
  }

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
