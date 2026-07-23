import { describe, expect, it } from 'vitest';

import loadHwBlockchainSupport from '../../src/addons/hw-blockchain-support';
import loadOnboardingOptions from '../../src/addons/onboarding-options';
import loadSignerFactory from '../../src/addons/signer-factory';

import type {
  HwBlockchainSupport,
  OnboardingOption,
} from '@lace-contract/onboarding-v2';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const cardanoKeystoneAccount = {
  accountType: 'HardwareKeystone',
  blockchainName: 'Cardano',
} as AnyAccount;

const bitcoinKeystoneAccount = {
  accountType: 'HardwareKeystone',
  blockchainName: 'Bitcoin',
} as AnyAccount;

const inMemoryAccount = {
  accountType: 'InMemory',
  blockchainName: 'Cardano',
} as AnyAccount;

const options = (loadOnboardingOptions as () => OnboardingOption[])();
const support = (loadHwBlockchainSupport as () => HwBlockchainSupport[])();

describe('vault-keystone addon reachability', () => {
  describe('loadOnboardingOptions', () => {
    it('advertises a single Keystone tile', () => {
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('keystone');
    });

    it('shows the Keystone logo and the supported device model', () => {
      const [option] = options as Array<
        Extract<OnboardingOption, { isHwDevice: true }>
      >;
      expect(option.device.logo).toBe('Keystone');
      expect(option.device.name).toBe('Keystone');
      expect(option.device.models).toEqual([]);
    });

    it('marks the option as an air-gapped hardware device', () => {
      const [option] = options as Array<
        Extract<OnboardingOption, { isHwDevice: true }>
      >;
      expect(option.isHwDevice).toBe(true);
      expect(option.isAirGapped).toBe(true);
    });
  });

  describe('loadHwBlockchainSupport', () => {
    it('advertises Cardano and Bitcoin support with per-blockchain option ids', () => {
      expect(support).toHaveLength(2);
      expect(support[0]).toMatchObject({
        blockchainName: 'Cardano',
        deviceOptionId: 'keystone',
      });
      expect(support[1]).toMatchObject({
        blockchainName: 'Bitcoin',
        deviceOptionId: 'keystone-bitcoin',
      });
    });

    it('leaves Cardano account selection with the app', () => {
      expect(support[0].accountSelection).toBeUndefined();
    });

    it('lets the device dictate the Bitcoin account', () => {
      expect(support[1].accountSelection).toBe('device');
    });
  });

  describe('loadSignerFactory', () => {
    const factory = loadSignerFactory();

    it('canSign a Cardano HardwareKeystone account', () => {
      expect(factory.canSign(cardanoKeystoneAccount)).toBe(true);
    });

    it('canSign a Bitcoin HardwareKeystone account', () => {
      expect(factory.canSign(bitcoinKeystoneAccount)).toBe(true);
    });

    it('does not sign in-memory accounts', () => {
      expect(factory.canSign(inMemoryAccount)).toBe(false);
    });
  });
});
