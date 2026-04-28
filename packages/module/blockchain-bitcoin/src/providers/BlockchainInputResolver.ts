import { firstValueFrom } from 'rxjs';

import type { InputResolver } from './InputResolver';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';
import type {
  BitcoinNetwork,
  BitcoinProvider,
} from '@lace-contract/bitcoin-context';

/**
 * Represents an implementation of the `InputResolver` interface that fetches detailed information
 * about a transaction input from the blockchain data provider.
 */
export class BlockchainInputResolver implements InputResolver {
  /**
   * Creates an instance of `BlockchainInputResolver`.
   *
   * @param {BitcoinProvider} dataProvider - The provider used to fetch transaction data from the blockchain.
   * @param network
   */
  public constructor(
    private readonly dataProvider: BitcoinProvider,
    private readonly network: BitcoinNetwork,
  ) {}

  /**
   * Resolves the transaction input to a `UTxO` object providing detailed information
   * about the input, including the owning address and the amount.
   *
   * @param {string} txId - The hexadecimal string representing the transaction ID of the input to resolve.
   * @param {number} index - The zero-based index of the input within the transaction's list of outputs.
   *
   * @returns {Promise<BitcoinUTxO>} A promise that resolves to a `BitcoinUTxO` object containing the resolved input details.
   * If the input cannot be resolved, the promise should reject with an error explaining the failure.
   */
  public async resolve(txId: string, index: number): Promise<BitcoinUTxO> {
    const result = await firstValueFrom(
      this.dataProvider.getTransaction({ network: this.network }, txId),
    );
    const transaction = result.unwrapOr(null);

    if (!transaction || index >= transaction.outputs.length) {
      throw new Error('Transaction or output index not found');
    }

    const output = transaction.outputs[index];

    return {
      txId,
      index,
      address: output.address,
      satoshis: output.satoshis,
      script: '',
      confirmations: transaction.confirmations,
      height: transaction.blockHeight,
      runes: [],
      inscriptions: [],
    };
  }
}
