import { v1 as uuid } from 'uuid';
import { CoSigner } from './AddCoSigners';

// CoSigners data includes data of the current user.
// The coSignersIndexOfCurrentUser helps to identify that data to differentiate them in the UI.
export const indexOfCoSignersDataOfCurrentUser = 0;

export const createCoSignerObject = (keys = ''): CoSigner => ({ id: uuid(), keys, name: '' });

export const ensureCorrectCoSignersDataShape = (inputCoSigners: CoSigner[]) => {
  if (!inputCoSigners[indexOfCoSignersDataOfCurrentUser]?.keys) {
    throw new Error('CoSigner data of current user missing keys');
  }
  return Array.from({ length: 3 }, (_, index) => inputCoSigners[index] || createCoSignerObject());
};
