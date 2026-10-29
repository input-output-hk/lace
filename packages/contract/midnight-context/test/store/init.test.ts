import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCAL_PROOF_SERVER_URL,
  defaultLocalProofServerMode,
  MidnightSDKNetworkIds,
  TEMENOS_PROOF_SERVER_MODES,
} from '../../src/const';
import store from '../../src/store/init';

import type { PersistedState } from 'redux-persist';

const getPersistConfig = async () => {
  const initialized = await store(
    {
      runtime: {
        app: 'lace-extension',
        config: {
          defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
        },
      },
    } as never,
    {} as never,
  );
  const config = initialized.persistConfig?.midnightContext;
  if (!config?.migrate || config.version === undefined)
    throw new Error('Missing Midnight persistence migration configuration');
  return { migrate: config.migrate, version: config.version };
};

const migrate = async (state: PersistedState) => {
  const config = await getPersistConfig();
  return config.migrate(state, config.version);
};

describe('Midnight persistence migrations', () => {
  it('advances already-migrated v12 profiles to a new migration version', async () => {
    expect((await getPersistConfig()).version).toBe(14);
  });

  it('preserves the v12 retirement when upgrading a v11 profile', async () => {
    const state = {
      _persist: { version: 11, rehydrated: true },
      isPortfolioBannerDismissed: true,
      userNetworksConfigOverrides: {
        mainnet: { proofServerAddress: 'https://retired.example/mainnet' },
        preprod: {
          proofServerAddress: 'https://retired.example/preprod',
          nodeAddress: 'https://node.example',
        },
        preview: { proofServerAddress: DEFAULT_LOCAL_PROOF_SERVER_URL },
      },
    };

    expect(await migrate(state)).toEqual({
      _persist: state._persist,
      isPortfolioBannerDismissed: true,
      userNetworksConfigOverrides: {
        mainnet: {},
        preprod: { nodeAddress: 'https://node.example' },
        preview: {},
      },
    });
  });

  it('keeps a released v12 profile on the default provider', async () => {
    const state = {
      _persist: { version: 12, rehydrated: true },
      userNetworksConfigOverrides: { preview: {} },
    };

    expect(await migrate(state)).toEqual(state);
    expect(state.userNetworksConfigOverrides.preview).not.toHaveProperty(
      'proofServer',
    );
  });

  it('removes a residual legacy URL from v12 without reviving its provider', async () => {
    const state = {
      _persist: { version: 12, rehydrated: true },
      userNetworksConfigOverrides: {
        preview: { proofServerAddress: 'https://retired.example/preview' },
      },
    };

    expect(await migrate(state)).toEqual({
      _persist: state._persist,
      userNetworksConfigOverrides: { preview: {} },
    });
  });

  it.each([
    ['local', defaultLocalProofServerMode],
    ['Temenos', TEMENOS_PROOF_SERVER_MODES.preview],
  ] as const)(
    'preserves a new-format %s selection from a pre-release v12 profile',
    async (_provider, proofServer) => {
      const state = {
        _persist: { version: 12, rehydrated: true },
        isPortfolioBannerDismissed: true,
        userNetworksConfigOverrides: {
          preview: {
            proofServer,
            proofServerAddress: 'https://retired.example/preview',
          },
        },
      };

      expect(await migrate(state)).toEqual({
        _persist: state._persist,
        isPortfolioBannerDismissed: true,
        userNetworksConfigOverrides: { preview: { proofServer } },
      });
    },
  );

  it.each([11, 12])(
    'handles a v%s profile without overrides',
    async version => {
      const state = { _persist: { version, rehydrated: true } };
      expect(await migrate(state)).toEqual(state);
    },
  );

  it('handles a new profile without persisted state', async () => {
    expect(await migrate(undefined)).toBeUndefined();
  });

  it('leaves an already-v14 profile unchanged', async () => {
    const state = {
      _persist: { version: 14, rehydrated: true },
      userNetworksConfigOverrides: {
        preview: { proofServer: TEMENOS_PROOF_SERVER_MODES.preview },
      },
    };
    expect(await migrate(state)).toBe(state);
  });
});

describe('Temenos deployment migration', () => {
  it('updates old mainnet and preview TEE selections and preserves other overrides', async () => {
    const oldMode = TEMENOS_PROOF_SERVER_MODES.preprod;
    const state = {
      _persist: { version: 13, rehydrated: true },
      userNetworksConfigOverrides: {
        mainnet: { proofServer: oldMode, nodeAddress: 'https://node.example' },
        preprod: { proofServer: oldMode },
        preview: { proofServer: oldMode },
      },
    };
    await migrate(state);
    expect(state.userNetworksConfigOverrides).toEqual({
      mainnet: {
        proofServer: TEMENOS_PROOF_SERVER_MODES.mainnet,
        nodeAddress: 'https://node.example',
      },
      preprod: { proofServer: oldMode },
      preview: { proofServer: TEMENOS_PROOF_SERVER_MODES.preview },
    });
  });

  describe.each(['mainnet', 'preview'] as const)('%s selections', networkId => {
    it.each([
      defaultLocalProofServerMode,
      {
        kind: 'delegated' as const,
        url: 'https://api.proofserver.wastedp.io',
        label: 'Other provider',
      },
      {
        ...TEMENOS_PROOF_SERVER_MODES[networkId]!,
        url: 'https://unknown.example',
      },
      TEMENOS_PROOF_SERVER_MODES[networkId]!,
    ])('preserves other selections: %j', async proofServer => {
      const state = {
        _persist: { version: 13, rehydrated: true },
        userNetworksConfigOverrides: { [networkId]: { proofServer } },
      };
      await migrate(state);
      expect(state.userNetworksConfigOverrides[networkId].proofServer).toBe(
        proofServer,
      );
    });
  });
});
