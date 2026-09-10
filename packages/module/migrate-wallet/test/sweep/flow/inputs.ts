import {
  CardanoAccountId,
  CardanoNetworkId,
  cardanoNetworkMagicToNetworkType,
} from '@lace-contract/cardano-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { of } from 'rxjs';

import { getUtxos } from '../../cardano/queries';
import {
  addressData,
  buildCardanoAccount,
  buildCardanoAddressRecord,
} from '../../support/cardano-account';

import { buildActionObservables } from './action-observables';
import { buildDependencies } from './dependencies';
import { buildEncryptedRoot } from './source-identity';
import { buildStateObservables } from './state-observables';

import type { FlowTriggers } from './action-observables';
import type { SideEffect } from '../../../src';
import type {
  SourceContext,
  SourceContextResolver,
} from '../../../src/store/side-effects';
import type { DerivedAccount } from '../../cardano/account';
import type { Providers } from '../../cardano/queries';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

type ActionObservables = Parameters<SideEffect>[0];
type StateObservables = Parameters<SideEffect>[1];
type Dependencies = Parameters<SideEffect>[2];

export type FlowInputs = {
  actionObservables: ActionObservables;
  stateObservables: StateObservables;
  dependencies: Dependencies;
  resolveSourceContext: SourceContextResolver;
  triggers: FlowTriggers;
  sourceWalletId: WalletId;
  sourceAccountId: AccountId;
  wallet: AnyWallet;
};

/**
 * Assembles everything the real makeRunDiscovery / makeRunSweep side-effects
 * consume, seeded from live provider reads. The source context is supplied
 * through the injected resolveSourceContext. State observables carry only the
 * wizard ids and the destination address record.
 */
export const buildFlowInputs = async ({
  source,
  destination,
  providers,
}: {
  source: DerivedAccount;
  destination: DerivedAccount;
  providers: Providers;
}): Promise<FlowInputs> => {
  const walletId = WalletId.deriveFromMnemonic(source.mnemonic);
  // Distinct walletId per role, as production migration has: source and
  // destination are separate wallets, so their account ids must not collide.
  const destinationWalletId = WalletId.deriveFromMnemonic(destination.mnemonic);
  const networkMagic = source.chainId.networkMagic;
  const networkId = CardanoNetworkId(networkMagic);

  const cardanoAccountFor = (
    accountWalletId: WalletId,
    account: DerivedAccount,
  ) =>
    buildCardanoAccount({
      accountId: CardanoAccountId(
        accountWalletId,
        account.accountIndex,
        networkMagic,
      ),
      walletId: accountWalletId,
      accountIndex: account.accountIndex,
      chainId: account.chainId,
      extendedAccountPublicKey: account.extendedAccountPublicKey,
      blockchainNetworkId: networkId,
      networkType: cardanoNetworkMagicToNetworkType(networkMagic),
    });

  const sourceAccount = cardanoAccountFor(walletId, source);
  const destinationAccount = cardanoAccountFor(
    destinationWalletId,
    destination,
  );
  const sourceAccountId = sourceAccount.accountId;
  const destinationAccountId = destinationAccount.accountId;

  const utxos = await getUtxos(providers, source.address);
  const protocolParameters = await providers.networkInfo.protocolParameters();

  // The encrypted root is what signSweepTx reopens under the auth secret to
  // derive a key agent per signing account, and what the scan reopens to derive
  // each extra account's xpub. Sealed from the source mnemonic with the same
  // headless secret accessAuthSecret hands back.
  const wallet = {
    walletId,
    type: 'InMemory',
    accounts: [sourceAccount, destinationAccount],
    blockchainSpecific: {
      Cardano: {
        encryptedRootPrivateKey: await buildEncryptedRoot(
          source.mnemonic,
          source.chainId,
        ),
      },
    },
  } as unknown as AnyWallet;

  // injected resolveSourceContext: emit the prebuilt context, skipping the
  // synced-store selectors createSourceContext$ would otherwise read (so that
  // store-selector assembly is not exercised by this harness). The resolver
  // ignores its (ids, stateObservables) args by design.
  const sourceContext: SourceContext = {
    wallet,
    chainId: source.chainId,
    protocolParameters,
    utxos,
    addresses: source.knownAddresses,
    signingAccounts: [
      {
        accountId: sourceAccountId,
        accountIndex: source.accountIndex,
        extendedAccountPublicKey: source.extendedAccountPublicKey,
      },
    ],
  };
  const resolveSourceContext: SourceContextResolver = () => of(sourceContext);

  const stateObservables = buildStateObservables({
    walletId,
    sourceAccountId,
    destinationAccountId,
    destinationRecord: buildCardanoAddressRecord({
      accountId: destinationAccountId,
      address: destination.address,
      data: addressData(destination.grouped, networkMagic),
    }),
  });

  const { actionObservables, triggers } = buildActionObservables();

  return {
    actionObservables,
    stateObservables,
    dependencies: buildDependencies(providers, {
      mnemonic: source.mnemonic,
      chainId: source.chainId,
      accountIndex: source.accountIndex,
    }),
    resolveSourceContext,
    triggers,
    sourceWalletId: walletId,
    sourceAccountId,
    wallet,
  };
};
