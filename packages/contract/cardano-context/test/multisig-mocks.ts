import { Cardano } from '@cardano-sdk/core';
import { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';

import { threeAccountCardanoWalletAccounts } from './mocks';

import type { CardanoMultiSigAccountProps } from '../src/types';
import type { MultiSigWalletAccount } from '@lace-contract/wallet-repo';

export const multiSigAccount: MultiSigWalletAccount<CardanoMultiSigAccountProps> =
  {
    ...threeAccountCardanoWalletAccounts[0],
    accountType: 'MultiSig',
    accountId: AccountId('multisig-account'),
    walletId: WalletId('multisig-wallet'),
    ownSigners: [],
    blockchainSpecific: {
      chainId: Cardano.ChainIds.Preprod,
      paymentKeyPath: { index: 0, role: 0 },
      stakingKeyPath: { index: 0, role: 2 },
      paymentScript: {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireSignature,
        keyHash: Ed25519KeyHashHex('a'.repeat(56)),
      },
      stakingScript: {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireSignature,
        keyHash: Ed25519KeyHashHex('b'.repeat(56)),
      },
    },
  };
