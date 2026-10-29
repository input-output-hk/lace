import { expect, it, vi } from 'vitest';

import { createLaceWallet } from '../src/create-lace-wallet';
import * as m from '../src/modules-cardano';
import { createPasskeyWalletEntity } from '../src/passkey-wallet-entity';
import { PasskeyWalletMismatchError } from '../src/passkey-wallet-mismatch-error';

import type { PasskeyKeySource } from '@lace-lib/passkey';

it('starts with empty in-memory wallet state and exposes no wallet on binding failure', async () => {
  const wallet = await createLaceWallet({
    modules: [m.featureDev, m.storageInMemory] as const,
    environment: 'development',
    config: {},
  });
  expect(wallet.getState().wallets?.ids).toEqual([]);
  const assertion = vi.fn();
  const keySource = {
    credentialRef: () => ({
      credentialId: 'AQID',
      rpId: 'localhost',
      recipeVersion: 'v1',
    }),
    withPasskeyMnemonic: assertion,
  } as unknown as PasskeyKeySource;
  await expect(
    createPasskeyWalletEntity(wallet, {
      keySource,
      walletName: 'Preprod',
      expectedBinding: {
        credentialId: 'other',
        rpId: 'localhost',
        recipeVersion: 'v1',
        fingerprint: 'x',
      },
    }),
  ).rejects.toThrow(PasskeyWalletMismatchError);
  expect(assertion).not.toHaveBeenCalled();
  expect(wallet.getState().wallets?.ids).toEqual([]);
});
