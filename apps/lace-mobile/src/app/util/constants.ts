type EnvironmentVariablesType = {
  BLOCKFROST_IPFS_URL: string | undefined;
  WEB_IPFS_GATEWAY_URL: string | undefined;
};

const environment = process.env as Record<string, string | undefined>;

export const BLOCKFROST_IPFS_URL: EnvironmentVariablesType['BLOCKFROST_IPFS_URL'] =
  environment.EXPO_PUBLIC_BLOCKFROST_IPFS_URL ||
  environment.BLOCKFROST_IPFS_URL ||
  environment.NX_BLOCKFROST_IPFS_URL;

export const WEB_IPFS_GATEWAY_URL: EnvironmentVariablesType['WEB_IPFS_GATEWAY_URL'] =
  environment.EXPO_PUBLIC_WEB_IPFS_GATEWAY_URL;
