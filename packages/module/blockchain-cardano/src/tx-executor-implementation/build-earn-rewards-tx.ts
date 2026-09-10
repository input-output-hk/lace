import { Cardano } from '@cardano-sdk/core';
import {
  LOVELACE_TOKEN_ID,
  TransactionBuilder,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  BuildEarnRewardsTx,
  BuildEarnRewardsTxResult,
  SpecificDRepOption,
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

/** Earn-rewards delegates to a real DRep only — `SpecificDRepOption` excludes the
 * abstain / no-confidence sentinels at the type level, so this builder cannot
 * emit an Always-Abstain vote even if a caller tried. */
const dRepOptionToDelegate = (
  dRep: SpecificDRepOption,
): Cardano.DelegateRepresentative => Cardano.DRepID.toCredential(dRep.drepId);

/**
 * Builds a single transaction that delegates stake to a pool AND delegates
 * voting power to a DRep. Both delegations ride on one fee and one signature —
 * the defining property of the earn-rewards one-tap flow, not a convenience.
 *
 * The stake key is registered in the same tx when not yet registered, as a
 * granular Conway `Registration` certificate (explicit deposit) followed by
 * `StakeDelegation`, NOT the combined `StakeRegistrationDelegation`: the
 * hardware key agents' certificate mappers (Ledger and Trezor alike) reject
 * the combo, and this transaction must be signable by every destination a
 * migration can create. Registration precedes delegation, which the ledger
 * requires; a separate `VoteDelegation` certificate adds the DRep.
 */
export const makeBuildEarnRewardsTx =
  (dependencies: SideEffectDependencies): BuildEarnRewardsTx =>
  params =>
    defer(async (): Promise<BuildEarnRewardsTxResult> => {
      const { accountId, poolId, dRep } = params;

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

      const changeAddress = Cardano.PaymentAddress(accountAddresses[0].address);

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

      // Neither leg supplied means no certificate to emit — refusing beats
      // minting a fee-only transaction that delegates nothing.
      if (poolId === undefined && dRep === undefined) {
        return {
          success: false,
          error: new Error(
            'Nothing to delegate: neither a stake pool nor a DRep was supplied',
          ),
        };
      }

      const delegate = dRep ? dRepOptionToDelegate(dRep) : undefined;
      // No pool → vote-only: the account already stakes somewhere and we must not
      // move that delegation. Its stake key is therefore already registered; if it
      // somehow is not, the vote certificate would reference an unregistered
      // credential and the ledger would reject the tx, so fail loudly here.
      if (poolId === undefined && !isStakeKeyAlreadyRegistered) {
        return {
          success: false,
          error: new Error(
            'Cannot delegate voting power for an unregistered stake key without a pool delegation',
          ),
        };
      }

      const shouldRegisterStakeKey =
        poolId !== undefined && !isStakeKeyAlreadyRegistered;

      const builder = new TransactionBuilder(networkMagic, protocolParameters)
        .setChangeAddress(changeAddress)
        .expiresIn(TWO_HOURS_IN_SECONDS)
        .setUnspentOutputs(availableUtxo);

      if (poolId !== undefined) {
        if (shouldRegisterStakeKey) {
          builder.addNewStakeAddressCertificate(
            stakeCredential,
            BigInt(protocolParameters.stakeKeyDeposit),
          );
        }
        builder.addStakeDelegationCertificate(poolId, stakeCredential);
      }
      if (delegate) {
        builder.addVoteDelegationCertificate(stakeCredential, delegate);
      }

      const tx = await builder.build();
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
