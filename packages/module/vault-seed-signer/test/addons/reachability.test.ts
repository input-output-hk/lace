import { describe, expect, it } from 'vitest';

import loadHwBlockchainSupport from '../../src/addons/hw-blockchain-support';
import loadOnboardingOptions from '../../src/addons/onboarding-options';
import loadSignerFactory from '../../src/addons/signer-factory';

import type {
  HwBlockchainSupport,
  OnboardingOption,
} from '@lace-contract/onboarding-v2';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const cardanoSeedSignerAccount = {
  accountType: 'HardwareSeedSigner',
  blockchainName: 'Cardano',
} as AnyAccount;

const bitcoinSeedSignerAccount = {
  accountType: 'HardwareSeedSigner',
  blockchainName: 'Bitcoin',
} as AnyAccount;

const inMemoryAccount = {
  accountType: 'InMemory',
  blockchainName: 'Cardano',
} as AnyAccount;

const options = (loadOnboardingOptions as () => OnboardingOption[])();
const support = (loadHwBlockchainSupport as () => HwBlockchainSupport[])();

describe('vault-seed-signer addon reachability', () => {
  describe('loadOnboardingOptions', () => {
    it('advertises a single Seed Signer tile', () => {
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('seed-signer');
    });

    it('shows only the logo, with no models subtext like Ledger and Trezor', () => {
      const [option] = options as Array<
        Extract<OnboardingOption, { isHwDevice: true }>
      >;
      expect(option.device.logo).toBe('SeedSigner');
      expect(option.device.models).toHaveLength(0);
    });
  });

  describe('loadHwBlockchainSupport', () => {
    it('advertises Cardano support', () => {
      expect(
        support.some(
          s =>
            s.blockchainName === 'Cardano' &&
            s.deviceOptionId === 'seed-signer',
        ),
      ).toBe(true);
    });

    it('advertises Bitcoin support', () => {
      expect(
        support.some(
          s =>
            s.blockchainName === 'Bitcoin' &&
            s.deviceOptionId === 'seed-signer-bitcoin',
        ),
      ).toBe(true);
    });
  });

  describe('loadSignerFactory', () => {
    const factory = loadSignerFactory();

    it('canSign a Cardano HardwareSeedSigner account', () => {
      expect(factory.canSign(cardanoSeedSignerAccount)).toBe(true);
    });

    it('canSign a Bitcoin HardwareSeedSigner account', () => {
      expect(factory.canSign(bitcoinSeedSignerAccount)).toBe(true);
    });

    it('does not sign in-memory accounts', () => {
      expect(factory.canSign(inMemoryAccount)).toBe(false);
    });
  });
});
