import {
  activitiesItemCustomizationsAddonContract,
  activitiesStoreContract,
} from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
} from '@lace-contract/app';
import {
  BITCOIN_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
  bitcoinProviderContract,
} from '@lace-contract/bitcoin-context';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import { networkStoreContract } from '@lace-contract/network';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
  chainMinimumAmountTokenValidatorAddonContract,
  sendFlowStoreContract,
} from '@lace-contract/send-flow';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  DUST_THRESHOLD as commonDustThreshold,
  getExtendedPubKeys as commonGetExtendedPubKeys,
} from '../src/common';
import sdkModule, {
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
  bitcoinAccountWallets$,
  buildBitcoinPayment,
  DUST_THRESHOLD,
  getExtendedPubKeys,
  signBitcoinTransactionWithSeed,
} from '../src/sdk';
import { signBitcoinTransactionWithSeed as seedSigner } from '../src/signing/sign-bitcoin-transaction-with-seed';
import * as txBuilder from '../src/tx-builder';
import { bitcoinAccountWallets$ as accountWallets$ } from '../src/wallet';

const willLoad = (...keys: string[]) =>
  sdkModule.feature?.willLoad(keys.map(key => ({ key })) as never, {} as never);

const names = (contracts: readonly { name: string }[]) =>
  contracts.map(({ name }) => name).sort();

describe('blockchain-bitcoin sdk module', () => {
  it('is named blockchain-bitcoin', () => {
    expect(sdkModule.moduleName).toBe('blockchain-bitcoin');
  });

  it('loads only when the Bitcoin feature flag is present', () => {
    expect(willLoad(BITCOIN_FEATURE_FLAG)).toBe(true);
    expect(willLoad('OTHER')).toBe(false);
    expect(willLoad()).toBe(false);
  });

  it('exposes only the headless addons', () => {
    expect(Object.keys(sdkModule.addons).sort()).toEqual([
      'loadAddressBookAddressValidators',
      'loadInMemoryWalletIntegration',
      'loadSignerFactory',
      'loadTokenIdMapper',
    ]);
  });

  it('implements only the headless contracts', () => {
    expect(names(sdkModule.implements?.contracts ?? [])).toEqual(
      names([
        inMemoryIntegrationAddonContract,
        tokensStoreContract,
        addressesStoreContract,
        syncStoreContract,
        addressBookAddressValidatorAddonContract,
        tokenIdMapperAddonContract,
        signerFactoryAddonContract,
      ]),
    );
  });

  it('depends only on the headless contracts', () => {
    expect(names(sdkModule.dependsOn?.contracts ?? [])).toEqual(
      names([
        bitcoinProviderContract,
        bitcoinFeeMarketProvider,
        networkStoreContract,
        walletRepoStoreContract,
        walletActiveStateDependencyContract,
        activitiesStoreContract,
        tokensStoreContract,
      ]),
    );
  });

  it('does not implement or depend on the UI and send flow contracts', () => {
    const dropped = names([
      accountUICustomisationAddonContract,
      sendFlowSheetUICustomisationAddonContract,
      activitiesItemCustomizationsAddonContract,
      txExecutorImplementationAddonContract,
      addressValidatorAddonContract,
      baseTokenAddonContract,
      chainMinimumAmountTokenValidatorAddonContract,
      sendFlowStoreContract,
    ]);
    const used = [
      ...names(sdkModule.implements?.contracts ?? []),
      ...names(sdkModule.dependsOn?.contracts ?? []),
    ];
    expect(used.filter(name => dropped.includes(name))).toEqual([]);
  });

  it('exports the seed signer and extended public key derivation', () => {
    expect(signBitcoinTransactionWithSeed).toBe(seedSigner);
    expect(getExtendedPubKeys).toBe(commonGetExtendedPubKeys);
  });

  it('exports the dust threshold', () => {
    expect(DUST_THRESHOLD).toBe(commonDustThreshold);
  });

  it('exports the payment builder, its errors and the account wallets', () => {
    expect(buildBitcoinPayment).toBe(txBuilder.buildBitcoinPayment);
    expect(BitcoinTxBuildError).toBe(txBuilder.BitcoinTxBuildError);
    expect(BitcoinTxBuildErrorCode).toBe(txBuilder.BitcoinTxBuildErrorCode);
    expect(bitcoinAccountWallets$).toBe(accountWallets$);
  });
});
