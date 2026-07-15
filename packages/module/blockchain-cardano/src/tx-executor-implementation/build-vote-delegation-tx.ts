import { Cardano } from '@cardano-sdk/core';
import {
  LOVELACE_TOKEN_ID,
  TransactionBuilder,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-sdk/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  BuildVoteDelegationTx,
  BuildVoteDelegationTxResult,
  DRepOption,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { FeeEntry } from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';

const TWO_HOURS_IN_SECONDS = 7200;

const getStakeCredentialFromAddress = (
  address: string,
): Cardano.Credential | undefined => {
  const cardanoAddress = Cardano.Address.fromString(address);
  if (!cardanoAddress) return undefined;

  const baseAddress = cardanoAddress.asBase();
  if (!baseAddress) return undefined;

  return baseAddress.getStakeCredential();
};

const isStakeKeyRegistered = (
  accountId: AccountId,
  rewardAccountDetails: AccountRewardAccountDetailsMap,
): boolean | undefined => {
  const details = rewardAccountDetails[accountId];
  if (!details) return undefined;
  return details.rewardAccountInfo?.isRegistered ?? false;
};

const dRepOptionToDelegate = (
  dRep: DRepOption,
): Cardano.DelegateRepresentative => {
  if (dRep.type === 'alwaysAbstain') return { __typename: 'AlwaysAbstain' };
  if (dRep.type === 'alwaysNoConfidence')
    return { __typename: 'AlwaysNoConfidence' };
  return Cardano.DRepID.toCredential(dRep.drepId);
};

export const makeBuildVoteDelegationTx =
  (dependencies: SideEffectDependencies): BuildVoteDelegationTx =>
  params =>
    defer(async (): Promise<BuildVoteDelegationTxResult> => {
      const { accountId, dRep } = params;

      const [
        networkMagic,
        protocolParameters,
        allAccountUtxos,
        unspendableAccountUtxos,
        cardanoAddresses,
        rewardAccountDetails,
      ] = await Promise.all([
        firstValueFrom(dependencies.txExecutorCardano.cardanoNetworkMagic$),
        firstValueFrom(
          dependencies.txExecutorCardano.cardanoProtocolParameters$,
        ),
        firstValueFrom(dependencies.txExecutorCardano.cardanoAccountUtxos$),
        firstValueFrom(
          dependencies.txExecutorCardano.cardanoAccountUnspendableUtxos$,
        ),
        firstValueFrom(dependencies.txExecutorCardano.cardanoAddresses$),
        firstValueFrom(
          dependencies.txExecutorCardano.cardanoRewardAccountDetails$,
        ),
      ]);

      if (!networkMagic) {
        return {
          success: false,
          error: new Error('Network magic not available'),
        };
      }

      if (!protocolParameters) {
        return {
          success: false,
          error: new Error('Protocol parameters not available'),
        };
      }

      const availableUtxo = filterSpendableUtxos(
        allAccountUtxos[accountId] ?? [],
        unspendableAccountUtxos[accountId] ?? [],
      );

      const accountAddresses: AnyAddress[] = cardanoAddresses.filter(
        (addr): addr is AnyAddress =>
          addr.accountId === accountId && addr.blockchainName === 'Cardano',
      );

      if (!accountAddresses[0]) {
        return {
          success: false,
          error: new Error('No Cardano addresses found for account'),
        };
      }

      const changeAddress = Cardano.PaymentAddress(
        accountAddresses[0].address as string,
      );

      const stakeCredential = getStakeCredentialFromAddress(
        accountAddresses[0].address,
      );

      if (!stakeCredential) {
        return {
          success: false,
          error: new Error('Could not extract stake credential from address'),
        };
      }

      const isStakeKeyAlreadyRegistered = isStakeKeyRegistered(
        accountId,
        rewardAccountDetails,
      );

      if (isStakeKeyAlreadyRegistered === undefined) {
        return {
          success: false,
          error: new Error('Reward account details not available yet'),
        };
      }

      const delegate = dRepOptionToDelegate(dRep);

      const builder = new TransactionBuilder(networkMagic, protocolParameters)
        .setChangeAddress(changeAddress)
        .expiresIn(TWO_HOURS_IN_SECONDS)
        .setUnspentOutputs(availableUtxo);

      const shouldRegisterStakeKey = !isStakeKeyAlreadyRegistered;

      if (shouldRegisterStakeKey) {
        builder.addVoteRegistrationDelegationCertificate(
          delegate,
          stakeCredential,
          BigInt(protocolParameters.stakeKeyDeposit),
        );
      } else {
        builder.addVoteDelegationCertificate(stakeCredential, delegate);
      }

      const tx = builder.build();
      const core = tx.toCore();
      const feeBigint = core.body.fee;

      const fees: FeeEntry[] = [
        { amount: BigNumber(feeBigint), tokenId: LOVELACE_TOKEN_ID },
      ];

      const serializedTx = tx.toCbor();

      const deposit = shouldRegisterStakeKey
        ? String(protocolParameters.stakeKeyDeposit)
        : '';

      return {
        success: true,
        serializedTx,
        fees,
        deposit,
      };
    }).pipe(
      catchError((error: Error) =>
        of({
          success: false as const,
          error,
        }),
      ),
    );
