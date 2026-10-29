// NOTE: every read below must stay a STATIC `process.env.EXPO_PUBLIC_*` member
// expression — metro only inlines static reads, and an aliased or computed one
// resolves against a react-native `process.env` that holds nothing but
// NODE_ENV, so it is always undefined in a build.
export const WEB_IPFS_GATEWAY_URL = process.env
  .EXPO_PUBLIC_WEB_IPFS_GATEWAY_URL as string | undefined;

export const IMAGE_PROXY_URL = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL as
  | string
  | undefined;

export const IMAGE_PROXY_KEY = process.env.EXPO_PUBLIC_IMAGE_PROXY_KEY as
  | string
  | undefined;

export const IMAGE_PROXY_SALT = process.env.EXPO_PUBLIC_IMAGE_PROXY_SALT as
  | string
  | undefined;
