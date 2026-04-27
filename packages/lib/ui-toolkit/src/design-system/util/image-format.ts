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

export const getWebIpfsFallbackUri = (uri?: string): string | undefined => {
  if (!uri) return;
  if (!isWeb) return uri;

  if (uri.includes('://ipfs.blockfrost.dev/ipfs/')) return uri;

  const match = uri.match(/\/ipfs\/([^/?#]+)/);
  if (!match) return uri;

  const cid = match[1];
  if (!cid) return uri;

  return `${BASE_IPFS_GATEWAY_URL}/ipfs/${cid}`;
};

export const getWebIpfsFallbackSource = (uri?: string): ImageSource | null => {
  if (!isWeb || !uri) return null;

  const match = uri.match(/\/ipfs\/([^/?#]+)/);
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

export const getAssetImageUrl = (
  image?: string,
  mediaType?: string,
): string | undefined => {
  if (!image) return;
  if (image.startsWith('http')) return image;
  if (image.startsWith('data:image/')) return image;
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

  // consider detecting the image mime type from base64 hash
  return formatDataUri({ img: image, type: mediaType || 'png' });
};
