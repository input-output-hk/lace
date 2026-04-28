import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { Roles } from '@midnight-ntwrk/wallet-sdk-hd';

import {
  MidnightAccountId,
  MidnightDustAddress,
  MidnightNetworkId,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
} from './value-objects';

import type { MidnightAccountProps } from './types';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

export const networkId = NetworkId.NetworkId.Undeployed;
export const password = 'password';
export const walletId = WalletId('walletId');
export const midnightDustAddress = MidnightDustAddress(
  'mn_dust_undeployed1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzz2mtpt2',
);
export const midnightShieldedAddress = MidnightShieldedAddress(
  'mn_shield-addr_undeployed1tffkxdesnqz86wvds2aprwuprpvzvag5t3mkveddr33hr7xyhlhyjqqvfftm8asg986dx9puzwkmedeune9nfkuqvtmccmxtjwvlrvcrh5gv3',
);
export const midnightUnshieldedAddress = MidnightUnshieldedAddress(
  'mn_addr_undeployed1gkasr3z3vwyscy2jpp53nzr37v7n4r3lsfgj6v5g584dakjzt0xqun4d4r',
);
export const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon diesel';
export const accountId = MidnightAccountId(walletId, 0, networkId);
export const midnightAccount: InMemoryWalletAccount<MidnightAccountProps> = {
  blockchainName: 'Midnight',
  accountId,
  networkType: 'testnet',
  blockchainNetworkId: MidnightNetworkId(networkId),
  accountType: 'InMemory',
  blockchainSpecific: {
    accountIndex: 0,
    dustKey: {
      encryptedKey: HexBytes(
        'fde5e10a455dbb9a1e30e6e09e9c8865649b1bb32e85586dd41aab6e06cf4d8a28723d92df08180e185227689140c64627aa035536d401bd43d1761a6909beda3c28c197d9f4261eff95e2fbdcef8476c33c1b88b88d32ea0497c293',
      ),
      derivationPath: {
        accountIndex: 0,
        index: 0,
        role: Roles.Dust,
      },
    },
    nightExternalKey: {
      encryptedKey: HexBytes(
        'fde5e10a455dbb9a1e30e6e09e9c8865649b1bb32e85586dd41aab6e06cf4d8a28723d92df08180e185227689140c64627aa035536d401bd43d1761a6909beda3c28c197d9f4261eff95e2fbdcef8476c33c1b88b88d32ea0497c293',
      ),
      derivationPath: {
        accountIndex: 0,
        index: 0,
        role: Roles.NightExternal,
      },
    },
    zswapKey: {
      encryptedKey: HexBytes(
        'fde5e10a455dbb9a1e30e6e09e9c8865649b1bb32e85586dd41aab6e06cf4d8a28723d92df08180e185227689140c64627aa035536d401bd43d1761a6909beda3c28c197d9f4261eff95e2fbdcef8476c33c1b88b88d32ea0497c293',
      ),
      derivationPath: {
        accountIndex: 0,
        index: 0,
        role: Roles.Zswap,
      },
    },
    networkId,
  },
  metadata: { name: 'mn adc' },
  walletId,
};
export const midnightWallet: InMemoryWallet<MidnightAccountProps> = {
  walletId,
  accounts: [midnightAccount],
  blockchainSpecific: {
    Midnight: {
      encryptedSeed: HexBytes(
        '5f40b1e033e52804f3da7e089673c5c0dcf8d47552ffa32aa5e64c0fa3b3dbdd14b622cefb12ded37f88cf462b52a16b8644a69a833894615fa985a879597a48ed2b1295eb1134cf0493c7286da4d302af278b98ff5323ffd1578225417527f4a8cc7bec3240a8686c04f6ef49690a75c5b84fde5a4de640dd20ec42',
      ),
    },
  },
  encryptedRecoveryPhrase: '0001020304050607080910' as HexBytes,
  type: WalletType.InMemory,
  metadata: {
    name: 'test-wallet',
    order: 0,
  },
  isPassphraseConfirmed: true,
};
