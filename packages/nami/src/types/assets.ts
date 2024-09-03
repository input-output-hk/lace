export interface Asset {
  name: string;
  labeledName: string;
  displayName: string;
  policy: string;
  fingerprint: string;
  unit: string;
  quantity: string;
  decimals: number;
  image?: string;
}
export interface CardanoAsset {
  unit: string;
  quantity: string;
}

export type AssetInput = Asset & {
  input: string;
};
