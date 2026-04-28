import { emip3decrypt } from '@cardano-sdk/key-management';
import { WalletType } from '@lace-contract/wallet-repo';
import { ByteArray } from '@lace-sdk/util';
import { switchMap, from, take, tap } from 'rxjs';

import {
  initialiseRecoveryPhraseChannel,
  RecoveryPhraseRequestError,
} from '../mnemonic-channel';

import type { SideEffect } from '..';
import type { OnMnemonicRequest } from '../mnemonic-channel';
import type { LaceInit } from '@lace-contract/module';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';

export const createRecoveryPhraseSideEffect =
  (onMnemonicRequest: OnMnemonicRequest): SideEffect =>
  (_, { wallets: { selectAll$ } }, { authenticate, accessAuthSecret }) =>
    onMnemonicRequest(({ walletId, authenticationPromptConfig }) =>
      selectAll$.pipe(
        take(1),
        switchMap(wallets => {
          const wallet = wallets
            .filter((w): w is InMemoryWallet => w.type === WalletType.InMemory)
            .find(w => w.walletId === walletId);

          if (!wallet) {
            throw new Error('InMemory wallet not found for recovery phrase');
          }

          return authenticate(authenticationPromptConfig).pipe(
            tap(success => {
              if (success) return;
              throw new RecoveryPhraseRequestError('cancelled');
            }),
            switchMap(() =>
              accessAuthSecret(authSecret =>
                from(
                  emip3decrypt(
                    ByteArray.fromHex(wallet.encryptedRecoveryPhrase),
                    authSecret,
                  ).then(ByteArray),
                ),
              ),
            ),
          );
        }),
      ),
    );

/**
 * Initializes all side effects for the recovery-phrase contract.
 */
export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const [recoveryPhraseChannelExtension] = await loadModules(
    'addons.loadRecoveryPhraseChannelExtension',
  );
  const { onRequest } = initialiseRecoveryPhraseChannel({
    exposeChannel: recoveryPhraseChannelExtension?.exposeRecoveryPhraseChannel,
  });
  return [createRecoveryPhraseSideEffect(onRequest)];
};
