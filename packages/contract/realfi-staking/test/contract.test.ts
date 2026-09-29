import { FeatureFlagKey } from '@lace-contract/feature';
import { describe, expect, it } from 'vitest';

import {
  CARDANO_NETWORK_MAGIC,
  FEATURE_FLAG_REALFI,
  getRealFiConfigFromFlags,
  hasAnyRealFiNetwork,
  isGenesisBoostActive,
  isLaunchSeasonActive,
  MAINNET_REALFI_CONFIG,
  PREPROD_REALFI_CONFIG,
  PREVIEW_REALFI_CONFIG,
  realfiProviderDependencyContract,
  realfiStakingStoreContract,
} from '../src';

import type { BlockchainNetworkId } from '@lace-contract/network';

describe('@lace-contract/realfi-staking public surface', () => {
  it('exposes an exactly-one store contract', () => {
    expect(realfiStakingStoreContract.contractType).toBe('store');
    expect(realfiStakingStoreContract.instance).toBe('exactly-one');
    expect(realfiStakingStoreContract.name).toBe('realfi-staking-store');
  });

  it('exposes the provider sideEffectDependency contract', () => {
    expect(realfiProviderDependencyContract.contractType).toBe(
      'sideEffectDependency',
    );
  });

  it('exposes FEATURE_FLAG_REALFI', () => {
    expect(FEATURE_FLAG_REALFI).toBe('REALFI');
  });

  describe('getRealFiConfigFromFlags', () => {
    const previewNetworkId =
      `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;
    const preprodNetworkId =
      `cardano-${CARDANO_NETWORK_MAGIC.preprod}` as BlockchainNetworkId;
    const mainnetNetworkId =
      `cardano-${CARDANO_NETWORK_MAGIC.mainnet}` as BlockchainNetworkId;

    it('enables a payload network on its bundled defaults (empty override)', () => {
      const flag = {
        key: FEATURE_FLAG_REALFI,
        payload: { preview: {}, preprod: {} },
      };
      expect(getRealFiConfigFromFlags([flag], previewNetworkId)).toEqual(
        PREVIEW_REALFI_CONFIG,
      );
      expect(getRealFiConfigFromFlags([flag], preprodNetworkId)).toEqual(
        PREPROD_REALFI_CONFIG,
      );
    });

    it('overrides top-level properties on top of the default', () => {
      const flag = {
        key: FEATURE_FLAG_REALFI,
        payload: {
          preview: { realfiApiUrl: 'https://override.example/graphql' },
        },
      };
      expect(getRealFiConfigFromFlags([flag], previewNetworkId)).toEqual({
        ...PREVIEW_REALFI_CONFIG,
        realfiApiUrl: 'https://override.example/graphql',
      });
    });

    it('enables mainnet on its bundled defaults (payload entry is the on-switch)', () => {
      const flag = {
        key: FEATURE_FLAG_REALFI,
        payload: { mainnet: {} },
      };
      expect(getRealFiConfigFromFlags([flag], mainnetNetworkId)).toEqual(
        MAINNET_REALFI_CONFIG,
      );
    });

    it('is off for a network absent from the payload', () => {
      const flag = { key: FEATURE_FLAG_REALFI, payload: { preview: {} } };
      expect(
        getRealFiConfigFromFlags([flag], preprodNetworkId),
      ).toBeUndefined();
      // mainnet has a compile-time default but no payload entry → still off.
      expect(
        getRealFiConfigFromFlags([flag], mainnetNetworkId),
      ).toBeUndefined();
    });

    it('is off when the REALFI flag is absent', () => {
      expect(
        getRealFiConfigFromFlags(
          [{ key: FeatureFlagKey('OTHER') }],
          previewNetworkId,
        ),
      ).toBeUndefined();
      expect(getRealFiConfigFromFlags([], previewNetworkId)).toBeUndefined();
    });

    it('is off when an override corrupts a required property', () => {
      const badFlag = {
        key: FEATURE_FLAG_REALFI,
        payload: { preview: { realfiApiUrl: 123 } },
      };
      expect(
        getRealFiConfigFromFlags([badFlag as never], previewNetworkId),
      ).toBeUndefined();
    });

    it('is off for a non-Cardano / unknown network', () => {
      expect(
        getRealFiConfigFromFlags(
          [{ key: FEATURE_FLAG_REALFI, payload: { preview: {} } }],
          undefined,
        ),
      ).toBeUndefined();
    });
  });

  describe.each([
    ['isGenesisBoostActive', isGenesisBoostActive],
    ['isLaunchSeasonActive', isLaunchSeasonActive],
  ])('%s', (_name, isActive) => {
    const activeFrom = '2026-09-13T00:00:00Z';
    const activeTo = '2026-09-27T23:59:59Z';
    const fromMs = Date.parse(activeFrom);
    const toMs = Date.parse(activeTo);
    const window = { activeFrom, activeTo };

    it('is active from the start instant up to and including the end instant', () => {
      expect(isActive(window, fromMs)).toBe(true);
      expect(isActive(window, toMs - 1)).toBe(true);
      expect(isActive(window, toMs)).toBe(true);
    });

    it('is inactive before the start instant and after the end instant', () => {
      expect(isActive(window, fromMs - 1)).toBe(false);
      expect(isActive(window, toMs + 1)).toBe(false);
    });

    it('is open-ended from the start instant when no end instant is given', () => {
      const farFutureMs = Date.parse('2999-01-01T00:00:00Z');
      expect(isActive({ activeFrom }, fromMs)).toBe(true);
      expect(isActive({ activeFrom }, farFutureMs)).toBe(true);
      expect(isActive({ activeFrom, activeTo: null }, farFutureMs)).toBe(true);
      expect(isActive({ activeFrom }, fromMs - 1)).toBe(false);
    });

    it('fails closed on a missing start or a malformed bound', () => {
      expect(isActive(undefined, fromMs)).toBe(false);
      expect(isActive({}, fromMs)).toBe(false);
      expect(isActive({ activeTo }, fromMs)).toBe(false);
      expect(isActive({ activeFrom: 'not-a-date' }, fromMs)).toBe(false);
      // A malformed end must not become "never ends".
      expect(isActive({ activeFrom, activeTo: '' }, fromMs)).toBe(false);
      expect(isActive({ activeFrom, activeTo: 'not-a-date' }, fromMs)).toBe(
        false,
      );
      // Untrusted CMS payload: a non-string must not reach Date.parse.
      expect(isActive({ activeFrom, activeTo: 123 as never }, fromMs)).toBe(
        false,
      );
    });
  });

  describe('bundled network defaults', () => {
    it('declare no promotion windows — PostHog owns both schedules', () => {
      for (const config of [
        PREVIEW_REALFI_CONFIG,
        PREPROD_REALFI_CONFIG,
        MAINNET_REALFI_CONFIG,
      ]) {
        expect(config.genesisBoost).toBeUndefined();
        expect(config.launchSeason).toBeUndefined();
      }
    });
  });

  describe('hasAnyRealFiNetwork', () => {
    it('is true only when some recognized network resolves to a valid config', () => {
      // No flag / empty payload → nothing loads.
      expect(hasAnyRealFiNetwork([])).toBe(false);
      expect(hasAnyRealFiNetwork([{ key: FEATURE_FLAG_REALFI }])).toBe(false);
      expect(
        hasAnyRealFiNetwork([{ key: FEATURE_FLAG_REALFI, payload: {} }]),
      ).toBe(false);
      // Unrecognized keys are not network definitions.
      expect(
        hasAnyRealFiNetwork([
          { key: FEATURE_FLAG_REALFI, payload: { bogus: {} } },
        ]),
      ).toBe(false);
      // A recognized entry whose merged config fails validation does not count.
      expect(
        hasAnyRealFiNetwork([
          {
            key: FEATURE_FLAG_REALFI,
            payload: { preview: { realfiApiUrl: 123 } },
          } as never,
        ]),
      ).toBe(false);
      // One valid network definition is enough.
      expect(
        hasAnyRealFiNetwork([
          {
            key: FEATURE_FLAG_REALFI,
            payload: { bogus: {}, preprod: {} },
          },
        ]),
      ).toBe(true);
    });
  });
});
