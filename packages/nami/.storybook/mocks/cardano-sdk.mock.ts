import { fn } from '@storybook/test';

export const Cardano = {
  Address: {
    fromBech32: fn().mockName('fromBech32'),
    fromBytes: fn().mockName('fromBytes'),
  },
  NetworkMagics: {},
};

export const WalletType = {
  InMemory: "InMemory",
  Ledger: "Ledger",
  Trezor: "Trezor",
  Script: "Script"
}

export const Serialization = {
  Transaction: {
    fromCbor: (d) => ({
      toCore: () => d
    })
  },
  TransactionOutput: function () {},
  Value: function () {
    return { setMultiasset: () => {} };
  },
  AuxiliaryData: function () {
    return { setMetadata: () => {} };
  },
  TransactionMetadatum: function () {},
  GeneralTransactionMetadata: function () {},
};

Serialization.TransactionMetadatum.fromCore = fn().mockName('fromCore');

export const ProviderUtil = {
  jsonToMetadatum: fn().mockName('jsonToMetadatum'),
};

export const Ed25519KeyHashHex = fn().mockName('Ed25519KeyHashHex');

export const handleHttpProvider = fn().mockName('handleHttpProvider');

export const contextLogger = fn().mockName('contextLogger');
