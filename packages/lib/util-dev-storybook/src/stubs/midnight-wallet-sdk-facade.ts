import {
  DustAddress,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { of } from 'rxjs';

export class WalletFacade {
  public dust = {
    serializeState: () => 'serialized dust wallet state',
  };
  public shielded = {
    serializeState: () => 'serialized shielded wallet state',
  };
  public unshielded = {
    serializeState: () => 'serialized unshielded wallet state',
  };

  public static async init() {
    return new WalletFacade();
  }

  public static async fetchTermsAndConditions() {
    return { url: 'https://midnight.network/terms', hash: 'stub-hash' };
  }

  public start() {}
  public state = () =>
    of({
      dust: {
        capabilities: {
          keys: {
            getAddress: () => new DustAddress(0n),
          },
        },
        state: {
          progress: {
            isStrictlyComplete: () => true,
          },
        },
        balance: () => 100000n,
      },
      shielded: {
        address: new ShieldedAddress(
          new ShieldedCoinPublicKey(
            Buffer.from('ShieldedCoinPublicKey'.padEnd(32, '\0')),
          ),
          new ShieldedEncryptionPublicKey(
            Buffer.from('ShieldedEncryptionPublicKey'.padEnd(32, '\0')),
          ),
        ),
        state: {
          progress: {
            isStrictlyComplete: () => true,
          },
        },
        totalCoins: [
          {
            coin: {
              mt_index: 0n,
              value: 123000000000n,
            },
          },
        ],
      },
      unshielded: {
        address: new UnshieldedAddress(
          Buffer.from('UnshieldedAddress'.padEnd(32, '\0')),
        ),
        availableCoins: [
          {
            meta: {},
            utxo: {
              type: '0000000000000000000000000000000000000000000000000000000000000000',
              value: 456000n,
            },
          },
        ],
        pendingCoins: [],
        state: {
          progress: {
            isStrictlyComplete: () => true,
          },
        },
        syncProgress: {
          synced: true,
        },
        transactionHistory: {
          getAll: function* () {},
        },
      },
    });

  public async balanceFinalizedTransaction() {}
  public async balanceUnboundTransaction() {}
  public async balanceUnprovenTransaction() {}
  public async calculateTransactionFee() {
    return 0n;
  }
  public async estimateTransactionFee() {
    return 0n;
  }
  public async finalizeRecipe() {}
  public async finalizeTransaction() {}
  public async stop() {}
  public async submitTransaction() {}
  public async transferTransaction() {}
}
