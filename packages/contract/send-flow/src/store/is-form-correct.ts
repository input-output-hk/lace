import type { StateOpen } from '../types';

export const isFormCorrect = (form: StateOpen['form']): boolean => {
  const { address, tokenTransfers, blockchainSpecific } = form;

  const isAddressOk = address.dirty && !address.error;
  const isTransfersOk = tokenTransfers.every(
    tt => tt.amount.dirty && !tt.amount.error,
  );

  const isBlockchainSpecificOk =
    !blockchainSpecific ||
    (blockchainSpecific.dirty && !blockchainSpecific.error);

  return isAddressOk && isTransfersOk && isBlockchainSpecificOk;
};
