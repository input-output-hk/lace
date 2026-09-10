import type { StateOpen } from '../types';

export const isFormCorrect = (form: StateOpen['form']): boolean => {
  const { address, tokenTransfers, blockchainSpecific } = form;

  const isAddressOk = address.dirty && !address.error;
  // A form with no transfers can never send anything: `every` is vacuously true
  // for `[]`, so without the length guard an empty form reports "correct",
  // enabling Review and letting the machine build a transaction with nothing
  // to send (which the executors then destructure blindly).
  const isTransfersOk =
    tokenTransfers.length > 0 &&
    tokenTransfers.every(tt => tt.amount.dirty && !tt.amount.error);

  const isBlockchainSpecificOk =
    !blockchainSpecific ||
    (blockchainSpecific.dirty && !blockchainSpecific.error);

  return isAddressOk && isTransfersOk && isBlockchainSpecificOk;
};
