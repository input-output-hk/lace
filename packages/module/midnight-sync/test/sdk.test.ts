import { AuthSecret } from '@lace-contract/authentication-prompt';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { ByteArray } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { createMidnightSyncModule, FEATURE_FLAG_MIDNIGHT } from '../src/sdk';

import type { MidnightSyncAuth } from '../src/sdk';
import type { Contract, ModuleInitProps } from '@lace-contract/module';

// Loading the store init pulls in the engine's WASM, which takes seconds under full-suite load.
vi.setConfig({ testTimeout: 30_000 });

const secret = AuthSecret(ByteArray.fromUTF8('sdk-password'));
const auth: MidnightSyncAuth = {
  accessAuthSecret: callback => callback(secret),
  authenticate: () => of(true),
};

// A headless loadout must name the testnet a wallet starts on.
const runtimeProps = (): ModuleInitProps =>
  ({
    runtime: { config: { defaultMidnightTestnetNetworkId: 'preview' } },
  } as ModuleInitProps);

const contractNames = (contracts?: { contracts: readonly Contract[] }) =>
  contracts?.contracts.map(({ name }) => name);

describe('createMidnightSyncModule', () => {
  it('loads only behind the Midnight feature flag', () => {
    const { feature } = createMidnightSyncModule({ auth });

    expect(
      feature?.willLoad([{ key: FEATURE_FLAG_MIDNIGHT }], 'production'),
    ).toBe(true);
    expect(
      feature?.willLoad(
        [{ key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' }],
        'production',
      ),
    ).toBe(false);
  });

  it('depends on the engine contracts only, not the app shell', () => {
    const module = createMidnightSyncModule({ auth });

    expect(contractNames(module.dependsOn)).toEqual([
      'activities-store',
      'failures-store',
      'feature-store',
      'network-store',
      'wallet-active-state-dependency',
      'wallet-repo-store',
    ]);
    expect(contractNames(module.implements)).toContain(
      'midnight-context-store',
    );
  });

  it('serves the caller’s auth to the engine and composes its side effects', async () => {
    const module = createMidnightSyncModule({ auth });
    const { default: init } = await module.store!.load();
    const loaded = await init(runtimeProps(), {
      logger: dummyLogger,
    });

    const served = await firstValueFrom(
      loaded.sideEffectDependencies!.accessAuthSecret!(authSecret =>
        of(authSecret),
      ),
    );
    expect(served).toBe(secret);
    expect(
      await firstValueFrom(
        loaded.sideEffectDependencies!.authenticate!({
          confirmButtonLabel: 'app.loading',
          message: 'app.loading',
        }),
      ),
    ).toBe(true);
    expect(
      loaded.sideEffectDependencies!.startMidnightAccountWallet,
    ).toBeTypeOf('function');
    expect(loaded.sideEffects).toHaveLength(1);
  });

  it('refuses to start without a valid testnet for a wallet to start on', async () => {
    const module = createMidnightSyncModule({ auth });
    const { default: init } = await module.store!.load();

    for (const config of [{}, { defaultMidnightTestnetNetworkId: 'mainnet' }])
      await expect(async () =>
        init({ runtime: { config } } as ModuleInitProps, {
          logger: dummyLogger,
        }),
      ).rejects.toThrow('config.defaultMidnightTestnetNetworkId');
  });

  it("serves the engine's wallet registry of the loading instance", async () => {
    const module = createMidnightSyncModule({ auth });
    const props = runtimeProps();
    const { default: init } = await module.store!.load();
    const loaded = await init(props, { logger: dummyLogger });
    const { default: initEngine } = await module.addons.loadMidnightEngine();
    const engine = initEngine(props, { logger: dummyLogger });

    expect(contractNames(module.implements)).toContain('midnight-engine-addon');
    expect(engine).toBe(loaded.sideEffectDependencies!.midnightWallets$);
    expect(engine).toBe(initEngine(props, { logger: dummyLogger }));
    expect(initEngine(runtimeProps(), { logger: dummyLogger })).not.toBe(
      engine,
    );
  });
});
