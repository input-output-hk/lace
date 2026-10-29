import * as cardanoEntry from '@laceio/sdk/cardano';
import {
  Cardano,
  createLaceWallet,
  createLazyInMemoryVaultModule,
  createPasskeyKeySource,
  createRemotePasskeySigner,
  HexBlob,
  m,
  Serialization,
  type CreateLazyInMemoryVaultModuleProps,
  type WithMnemonicWords,
} from '@laceio/sdk/cardano';
import * as rootEntry from '@laceio/sdk';
import * as Domain from '@laceio/cardano/core';
import { HexBlob as DomainHexBlob } from '@laceio/cardano/util';
import {
  type Result,
  createLazyInMemoryVaultModule as createFromRoot,
  createPasskeyKeySource as createFromRootKeySource,
  type WithMnemonicWords as RootWithMnemonicWords,
} from '@laceio/sdk';

// Both builds' fixture: the canary build adds no Cardano or root export it
// names. A consumer that lacks a package the declarations import
// reads its types as `any`, which accepts every value, so each directive below
// goes unused. A type-level `0 extends 1 & T` test misses this `any`, because
// the `any` of an unresolved import satisfies `false` as well as `true`.
// @ts-expect-error A number is not a Result.
0 satisfies Result<number, Error>;
// @ts-expect-error A number is not an address.
0 satisfies Cardano.PaymentAddress;
// @ts-expect-error A number is not a UTxO.
0 satisfies Cardano.Utxo;
// @ts-expect-error A number is not a transaction.
0 satisfies Serialization.Transaction;
// @ts-expect-error A number is not a hex blob.
0 satisfies HexBlob;

// Experimental exports are absent from both entries in either build: only
// the canary build's experimental entry has them (ADR 66).
// @ts-expect-error Custody accounts are experimental.
void cardanoEntry.createCardanoCustodyAccount;
// @ts-expect-error Custody accounts are experimental.
void rootEntry.createCardanoCustodyAccount;
// @ts-expect-error The custody sponsor client is experimental.
void cardanoEntry.createCardanoCustodySponsorClient;
// @ts-expect-error Passport accounts are experimental.
void rootEntry.m.createPassportAccountModule;
// @ts-expect-error Passport accounts are experimental.
void rootEntry.createRemotePassportSeams;
// @ts-expect-error MIP-0015 secrets are experimental.
void rootEntry.deriveSymmetricSecret;

declare const source: WithMnemonicWords;
const rootSource: RootWithMnemonicWords = source;
const props: CreateLazyInMemoryVaultModuleProps = {
  withMnemonicWords: rootSource,
};
createLazyInMemoryVaultModule(props);
createFromRoot(props);

const cardanoKeySource = createPasskeyKeySource({ rpId: 'localhost' });
cardanoKeySource.withPasskeyMnemonic(async words => words.length);
// @ts-expect-error The key source exposes the wallet words only.
cardanoKeySource.deriveSecret({ domain: 'consumer', context: 'account-0' });
// @ts-expect-error No entry point exposes session mnemonic access.
cardanoKeySource.withSessionMnemonic(async words => words.length);
const rootKeySource = createFromRootKeySource({ rpId: 'localhost' });
// @ts-expect-error The key source exposes the wallet words only.
rootKeySource.deriveSecret({ domain: 'consumer', context: 'account-0' });
// @ts-expect-error No entry point exposes session mnemonic access.
rootKeySource.withSessionMnemonic(async words => words.length);

const wallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.blockchainCardano,
    m.cardanoProviderBlockfrost,
    m.cryptoCardanoSdk,
  ] as const,
  environment: 'development',
  config: {},
});
void wallet;
const hostedSigner = createRemotePasskeySigner({
  signerUrl: 'https://signer.example',
});
void hostedSigner;

// One Cardano domain layer: the SDK's types are @laceio/cardano's, so a value
// typed by either is the other's, classes with private members included.
// @ts-expect-error A number is not a transaction: @laceio/cardano resolves.
0 satisfies Domain.Serialization.Transaction;
declare const domainTransaction: Domain.Serialization.Transaction;
domainTransaction satisfies Serialization.Transaction;
declare const sdkTransaction: Serialization.Transaction;
sdkTransaction satisfies Domain.Serialization.Transaction;
declare const domainAddress: Domain.Cardano.Address;
domainAddress satisfies Cardano.Address;
DomainHexBlob('00') satisfies HexBlob;
