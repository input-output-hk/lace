import {
  MidnightAccountId,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-sdk/util';

import { encryptedRecoveryPhrase } from '../const';

import type { InMemoryWallet } from '@lace-contract/wallet-repo';

export const midnightWalletId = WalletId('47465cb360ddc86cf7ad81282abfdbc3');
export const midnightWalletEntity: InMemoryWallet = {
  walletId: midnightWalletId,
  encryptedRecoveryPhrase,
  metadata: {
    name: 'My Midnight',
    order: 0,
  },
  type: WalletType.InMemory,
  accounts: [
    {
      walletId: midnightWalletId,
      accountId: MidnightAccountId(midnightWalletId, 0, 'preview'),
      networkType: 'testnet',
      blockchainNetworkId: MidnightNetworkId('preview'),
      blockchainSpecific: {
        networkId: 'preview',
        nightExternalKey: {
          derivationPath: {
            accountIndex: 0,
            index: 0,
            role: 0,
          },
          encryptedKey:
            '80584582df247c5300f233584d00ba26980393b21f515ffc809254a50ddfbc676556005b5f7940e3d81cfc969a50567c31a2a7299365b385ae368ab464c80386a939f2ae22c2b265b6ad4d67c6369cae7de8f8ea8b7ffa5285d2307d',
        },
        zswapKey: {
          derivationPath: {
            accountIndex: 0,
            index: 0,
            role: 3,
          },
          encryptedKey:
            '2e85242144ad91fdd6bb3148b9cef2cc8a55b3dcc2093723ea51070a475e299e269478eb0fb23fc8306929d40cf90bd31ac611c0d254564322ba06bf661c0964b419a117ab0c5fafa840c8d91ac4021533aee8f72aa3ee53cbc47728',
        },
        dustKey: {
          derivationPath: {
            accountIndex: 0,
            index: 0,
            role: 2,
          },
          encryptedKey:
            '3847d45b86bb47ad98d245b87b16025df0196c284cb82d8760f788a3d46c6c40a57a1a1eb995c6e7556d78d4041b74900b320e2db61ede73684f53ed5f5f87d2bc39c4854e01d492048f822be3192a4728b9a56a10e7c9313ce8b83c',
        },
      },
      accountType: 'InMemory',
      blockchainName: 'Midnight',
      metadata: {
        name: 'Midnight',
      },
    },
  ],
  blockchainSpecific: {
    Midnight: {
      encryptedSeed: HexBytes(
        'e3a916fbffc59fe97b690e08f94d23c294ed235a053b18d7df27a192f3cacc6d1b154ef8b9aa9e6d85a1312f4de0f30e56542ffb8cd1403595098f514219f25fe880b16f03ef2f6362699bde62130580ed34b9de849815fe5f0d92a8d374fa36024ed25e8f32f327417990cd7b408412591cac81e4bc8ed083db42d4',
      ),
    },
  },
  isPassphraseConfirmed: false,
};
