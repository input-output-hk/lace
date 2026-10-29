export const PUBLISHED_PEER_RANGES: Record<
  string,
  { pin: string; published: string }
>;
export const publishedPeerRange: (name: string, version: string) => string;
export const manifestForDistribution: (
  distribution: string,
) => Record<string, unknown>;
export const packSdk: (options: {
  distribution?: string;
  out: string;
  name?: string;
  version?: string;
  development?: boolean;
}) => {
  name: string;
  version: string;
  filename: string;
  path: string;
  sha256: string;
  integrity: string;
};
