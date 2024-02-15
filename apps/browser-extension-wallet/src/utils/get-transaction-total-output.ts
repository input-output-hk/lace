import { CardanoTxOut } from '../types';
import BigNumber from 'bignumber.js';

/**
 * returns the transaction total amount of ada output
 */
export const getTransactionTotalOutput = (outputs: CardanoTxOut[]): BigNumber =>
  outputs.reduce((total, output) => total.plus(output.value.coins.toString()), new BigNumber(0));
