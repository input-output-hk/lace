export type ValidateAddress = (address: string) => { isValid: boolean };

export type CoSigner = { address: string; isValid: boolean; id: string };
