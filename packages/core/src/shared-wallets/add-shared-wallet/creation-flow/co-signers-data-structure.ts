import { v1 as uuid } from 'uuid';
import { CoSigner } from './AddCoSigners';

// CoSigners data includes data of the current user.
// The coSignersIndexOfCurrentUser helps to identify that data to differentiate them in the UI.
export const indexOfCoSignersDataOfCurrentUser = 0;

export const createCoSignerObject = (sharedWalletKey = ''): CoSigner => ({ id: uuid(), name: '', sharedWalletKey });

export const ensureCorrectCoSignersDataShape = (inputCoSigners: CoSigner[]) => {
  if (!inputCoSigners[indexOfCoSignersDataOfCurrentUser]?.sharedWalletKey) {
    throw new Error('CoSigner data of current user missing sharedWalletKey');
  }
  return Array.from({ length: 3 }, (_, index) => inputCoSigners[index] || createCoSignerObject());
};
