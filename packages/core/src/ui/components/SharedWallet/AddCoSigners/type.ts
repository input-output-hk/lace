export type ValidateAddress = (address: string) => Promise<{ isValid: boolean }>;

export type CoSigner = { address: string; isValid: boolean; id: string };
