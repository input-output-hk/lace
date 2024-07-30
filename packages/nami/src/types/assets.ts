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

export type AssetInput = Asset & {
  input: string;
};
