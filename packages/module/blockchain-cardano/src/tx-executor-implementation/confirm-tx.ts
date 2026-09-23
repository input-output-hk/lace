import { Cardano } from '@cardano-sdk/core';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import {
  createInputResolver,
  isCardanoAddress,
} from '@lace-contract/cardano-context';
import { signerAuthFromPrompt } from '@lace-contract/signer';
import {
  genericErrorResults,
  type TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import { isHardwareWallet } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { mapHwSigningError } from '@lace-lib/util-hw';
import { filterRedacted } from '@lace-lib/util-redacted';
import { serializeError, type ErrorObject } from '@lace-lib/util-store';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { mergePreExistingVkeys } from './merge-pre-existing-vkeys';

import type { AddressType } from '@cardano-sdk/key-management';
import type {
  AccountUtxoMap,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

export const makeConfirmTx = (
  {
    txExecutorCardano: { cardanoAddresses$ },
    accessAuthSecret,
    authenticate,
    signerFactory,
  }: SideEffectDependencies,
  cardanoAvailableAccountUtxos$: Observable<AccountUtxoMap>,
  cardanoCollateralOwnershipUtxos$: Observable<AccountUtxoMap>,
): TxExecutorImplementation['confirmTx'] => {
  return ({ serializedTx, wallet, accountId }) => {
    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    return cardanoAddresses$.pipe(
      blockingWithLatestFrom(
        combineLatest([
          cardanoAvailableAccountUtxos$,
          cardanoCollateralOwnershipUtxos$,
        ]),
      ),
      switchMap(([cardanoAddresses, utxoViews]) => {
        const [cardanoAvailableAccountUtxos, cardanoOwnershipUtxos] = utxoViews;
        // TODO: We need account known addresses here.
        const knownAddresses = cardanoAddresses
          .filter(
            addr =>
              addr.accountId === accountId && addr.blockchainName === 'Cardano',
          )
          .filter(isCardanoAddress)
          .map(addr => ({
            type: addr.data?.type as unknown as AddressType,
            index: addr.data?.index as unknown as number,
            networkId: addr.data?.networkId as unknown as Cardano.NetworkId,
            accountIndex: addr.data?.accountIndex as unknown as number,
            address: Cardano.PaymentAddress(addr.address),
            rewardAccount: addr.data
              ?.rewardAccount as unknown as Cardano.RewardAccount,
            stakeKeyDerivationPath: addr.data?.stakeKeyDerivationPath,
          }));

        const availableUtxo = cardanoAvailableAccountUtxos[accountId] ?? [];
        // The collateral resolver's only layer: the ownership authority
        // (settled + own pending outputs), not `availableUtxo`, which
        // subtracts the collateral-reserved UTxOs. No provider here: an
        // input this cannot resolve is not ours (LW-15506).
        const ownershipUtxos = cardanoOwnershipUtxos[accountId] ?? [];

        const context: CardanoTransactionSignerContext = {
          wallet,
          accountId,
          knownAddresses,
          utxo: availableUtxo,
          collateralInputResolver: createInputResolver(ownershipUtxos),
          auth,
        };
        const signer = signerFactory.createTransactionSigner(context);

        return signer.sign({ serializedTx: HexBytes(serializedTx) }).pipe(
          map(result => ({
            serializedTx: mergePreExistingVkeys(
              HexBytes(serializedTx),
              result.serializedTx,
            ),
            success: true as const,
          })),
        );
      }),
      catchError((error: Error) => of(hwAwareConfirmTxError(error, wallet))),
    );
  };
};

const hwAwareConfirmTxError = (error: Error, wallet: AnyWallet) => {
  if (!isHardwareWallet(wallet)) {
    return genericErrorResults.confirmTx({ error });
  }
  const keys = mapHwSigningError(error);
  return {
    error: filterRedacted(serializeError(error)) as ErrorObject,
    errorTranslationKeys: {
      title: keys.title as TranslationKey,
      subtitle: keys.subtitle as TranslationKey,
    },
    success: false as const,
  };
};
