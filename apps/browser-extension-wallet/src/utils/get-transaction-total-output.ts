import { CardanoTxOut } from '../types';
import BigNumber from 'bignumber.js';

/**
 * returns the transaction total amount of ada output
 */
export const getTransactionTotalOutput = (outputs: CardanoTxOut[]): BigNumber =>
  outputs.reduce((total, output) => total.plus(output.value.coins.toString()), new BigNumber(0));

export const getTransactionTotalOutputByAddress = (outputs: CardanoTxOut[], targetAddress: string): BigNumber =>
  outputs.reduce((total, output) => {
    if (output.address === targetAddress) {
      return total.plus(output.value.coins.toString());
    }
    return total;
  }, new BigNumber(0));
