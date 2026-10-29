import { Address, CredentialType } from '../Address';

import type { PaymentAddress } from '../Address';

export const isScriptAddress = (address: PaymentAddress): boolean => {
  if (!Address.isValidBech32(address)) {
    return false;
  }

  const baseAddress = Address.fromBech32(address).asBase();
  const paymentCredential = baseAddress?.getPaymentCredential();
  const stakeCredential = baseAddress?.getStakeCredential();
  return (
    paymentCredential?.type === CredentialType.ScriptHash &&
    stakeCredential?.type === CredentialType.ScriptHash
  );
};
