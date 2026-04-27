import { Cardano } from '@cardano-sdk/core';
import {
  LOVELACE_TOKEN_ID,
  TransactionBuilder,
  filterSpendableUtxos,
  type AccountRewardAccountDetailsMap,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-sdk/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  BuildDeregistrationTx,
  BuildDeregistrationTxResult,
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

/**
 * Gets the stake key deposit for the given account if it is registered.
 * Returns the deposit amount if registered, undefined if not registered or details not available.
 */
const getStakeKeyDeposit = (
  accountId: AccountId,
  rewardAccountDetails: AccountRewardAccountDetailsMap,
  protocolParameters: Cardano.ProtocolParameters,
): bigint | undefined => {
  const details = rewardAccountDetails[accountId];
  if (!details) return undefined;
  if (!details.rewardAccountInfo?.isRegistered) return undefined;
  return BigInt(protocolParameters.stakeKeyDeposit);
};

/**
 * Constructs a reward account address from a stake credential.
 */
const getRewardAccount = (
  stakeCredential: Cardano.Credential,
  networkMagic: Cardano.NetworkMagics,
): Cardano.RewardAccount => {
  const networkId =
    networkMagic === Cardano.NetworkMagics.Mainnet
      ? Cardano.NetworkId.Mainnet
      : Cardano.NetworkId.Testnet;
  return Cardano.RewardAccount.fromCredential(stakeCredential, networkId);
};

/**
 * Gets the withdrawable amount for the given account.
 */
const getWithdrawableAmount = (
  accountId: AccountId,
  rewardAccountDetails: AccountRewardAccountDetailsMap,
): bigint => {
  const details = rewardAccountDetails[accountId];
  if (!details?.rewardAccountInfo?.withdrawableAmount) return 0n;
  return BigInt(details.rewardAccountInfo.withdrawableAmount.toString());
};

export const makeBuildDeregistrationTx =
  (dependencies: SideEffectDependencies): BuildDeregistrationTx =>
  params =>
    defer(async (): Promise<BuildDeregistrationTxResult> => {
      const { accountId } = params;

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

      // Check if stake key is registered (can only de-register if registered)
      const deposit = getStakeKeyDeposit(
        accountId,
        rewardAccountDetails,
        protocolParameters as Cardano.ProtocolParameters,
      );

      if (deposit === undefined) {
        return {
          success: false,
          error: new Error(
            'Stake key is not registered or reward account details not available',
          ),
        };
      }

      const builder = new TransactionBuilder(
        networkMagic,
        protocolParameters as Cardano.ProtocolParameters,
      )
        .setChangeAddress(changeAddress)
        .expiresIn(TWO_HOURS_IN_SECONDS)
        .setUnspentOutputs(availableUtxo);

      // Get withdrawable amount - if non-zero, add withdrawal before deregistration
      // Cardano doesn't allow deregistering a stake key with non-zero reward balance
      const withdrawableAmount = getWithdrawableAmount(
        accountId,
        rewardAccountDetails,
      );

      if (withdrawableAmount > 0n) {
        const rewardAccount = getRewardAccount(stakeCredential, networkMagic);
        builder.addRewardsWithdrawal(rewardAccount, withdrawableAmount);
      }

      // Add the Conway-era unregistration certificate with deposit
      builder.addStakeDeregistrationCertificate(stakeCredential, deposit);

      const tx = builder.build();

      const core = tx.toCore();
      const feeBigint = core.body.fee;

      const fees: FeeEntry[] = [
        { amount: BigNumber(feeBigint), tokenId: LOVELACE_TOKEN_ID },
      ];

      const serializedTx = tx.toCbor();

      // depositReturn is positive (user gets this back)
      const depositReturn = String(deposit);

      return {
        success: true,
        serializedTx,
        fees,
        depositReturn,
      };
    }).pipe(
      catchError((error: Error) =>
        of({
          success: false as const,
          error,
        }),
      ),
    );
