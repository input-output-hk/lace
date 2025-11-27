import { UtxoProvider } from '@cardano-sdk/core';
import { utxo } from './ProviderStub';

export const utxoProviderStub = (): UtxoProvider => ({
  healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  utxoByAddresses: jest.fn().mockResolvedValue(utxo)
});
