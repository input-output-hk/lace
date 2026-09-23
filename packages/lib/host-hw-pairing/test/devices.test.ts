import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  HARDWARE_ONBOARDING_OPTIONS,
  hwPairingChoiceOf,
  hwPairingChoicesFor,
  isHwDevice,
  SUPPORTED_DEVICES,
} from '../src';

import type { HardwareOnboardingOption } from '@lace-contract/onboarding-v2';
import type { HwDevice } from '@lace-contract/vault';

const DEVICES: HwDevice[] = ['ledger', 'trezor', 'seed-signer', 'keystone'];

const hardwareOptions =
  HARDWARE_ONBOARDING_OPTIONS as HardwareOnboardingOption[];

describe('SUPPORTED_DEVICES', () => {
  it('offers the four devices the host can pair, keyed by their HwDevice id', () => {
    expect(SUPPORTED_DEVICES.map(({ id }) => id)).toEqual(DEVICES);
  });

  it('names each device with a logo and no models, so a tile shows only the logo', () => {
    expect(SUPPORTED_DEVICES).toEqual([
      { id: 'ledger', name: 'LEDGER', models: [], logo: 'Ledger' },
      { id: 'trezor', name: 'TREZOR', models: [], logo: 'Trezor' },
      {
        id: 'seed-signer',
        name: 'Seed Signer',
        models: [],
        logo: 'SeedSigner',
      },
      { id: 'keystone', name: 'Keystone', models: [], logo: 'Keystone' },
    ]);
  });
});

describe('HARDWARE_ONBOARDING_OPTIONS', () => {
  it('advertises every device as a hardware option, which is what raises the HW entry', () => {
    expect(hardwareOptions).toHaveLength(DEVICES.length);
    expect(hardwareOptions.every(({ isHwDevice: isHw }) => isHw)).toBe(true);
    expect(hardwareOptions.map(({ id }) => id)).toEqual(DEVICES);
  });

  it('carries the wallet type each device is paired as', () => {
    expect(hardwareOptions.map(({ walletType }) => walletType)).toEqual([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.HardwareSeedSigner,
      WalletType.HardwareKeystone,
    ]);
  });

  it('repeats the tile descriptor, so the option and the device step agree', () => {
    expect(hardwareOptions.map(({ device }) => device)).toEqual(
      SUPPORTED_DEVICES,
    );
  });
});

describe('isHwDevice', () => {
  it.each(DEVICES)('accepts %s', device => {
    expect(isHwDevice(device)).toBe(true);
  });

  it.each(['', 'ledger-bitcoin', 'Ledger', 'unknown'])(
    'rejects %s',
    candidate => {
      expect(isHwDevice(candidate)).toBe(false);
    },
  );
});

describe('hwPairingChoicesFor', () => {
  it.each(DEVICES)('offers Cardano and Bitcoin for %s', device => {
    expect(hwPairingChoicesFor(device)).toEqual([
      { optionId: device, device, blockchain: 'Cardano' },
      { optionId: `${device}-bitcoin`, device, blockchain: 'Bitcoin' },
    ]);
  });
});

describe('hwPairingChoiceOf', () => {
  it('resolves every option id the blockchain step can render', () => {
    const choices = DEVICES.flatMap(device => hwPairingChoicesFor(device));

    expect(choices.map(({ optionId }) => hwPairingChoiceOf(optionId))).toEqual(
      choices,
    );
  });

  it('answers undefined for an id from no tile, so a stray press dispatches nothing', () => {
    expect(hwPairingChoiceOf('ledger-midnight')).toBeUndefined();
    expect(hwPairingChoiceOf('')).toBeUndefined();
  });
});
