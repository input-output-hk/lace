import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { cardanoCustodyActions } from '@lace-contract/cardano-context';
import {
  createCustodyAccountRecord,
  deriveCustodyDeviceKey,
} from '@lace-lib/cardano-custody';
import { Err } from '@lace-lib/util';
import { firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CustodyBuildFailure } from '../../../src/store/custody/build-failure';
import { makeCustodyCreatorIndexProbing } from '../../../src/store/custody/creator-index-probe-side-effect';

import {
  chainId,
  deviceAccountPublicKey,
  fakeProvider,
  identityOf,
  providerError,
  utxo,
  version,
} from './fixtures';

import type {
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
} from '@lace-contract/cardano-context';

const readFailure = vi.hoisted(() => ({
  error: undefined as Error | undefined,
}));

vi.mock(
  '../../../src/store/custody/custody-creator-index',
  async importOriginal => {
    const actual = await importOriginal<
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      typeof import('../../../src/store/custody/custody-creator-index')
    >();
    return {
      ...actual,
      readCustodyCreatorIndex: async (
        ...args: Parameters<typeof actual.readCustodyCreatorIndex>
      ) => {
        if (readFailure.error !== undefined) throw readFailure.error;
        return actual.readCustodyCreatorIndex(...args);
      },
    };
  },
);

const device = {} as { xpub: Crypto.Bip32PublicKeyHex };
const identityAt = async (index: number) => {
  const key = await deriveCustodyDeviceKey(device.xpub, index);
  if (!key.ok) throw new Error('fixture key');
  return identityOf(key.value.keyHash);
};

beforeAll(async () => {
  device.xpub = await deviceAccountPublicKey();
});

const probeRequest = (
  overrides: Partial<CardanoCustodyCreatorIndexProbeRequest> = {},
): CardanoCustodyCreatorIndexProbeRequest => ({
  requestId: 'probe-1',
  accountValidatorHash: version.accountValidatorHash,
  deviceAccountPublicKey: device.xpub,
  creatorIndex: 2,
  ...overrides,
});

type ProbeOutcome =
  | { ok: false; error: CardanoCustodyCreatorIndexProbeError }
  | { ok: true; result: CardanoCustodyCreatorIndexProbeResult };

const sideEffectWith = (
  requests: CardanoCustodyCreatorIndexProbeRequest[],
  {
    provider = fakeProvider().provider,
    chain = chainId,
    logger = dummyLogger,
  }: {
    provider?: ReturnType<typeof fakeProvider>['provider'];
    /** `null` while the store knows no chain id. */
    chain?: Cardano.ChainId | null;
    logger?: typeof dummyLogger;
  } = {},
) =>
  makeCustodyCreatorIndexProbing()(
    {
      cardanoCustody: {
        probeCustodyCreatorIndex$: of(
          ...requests.map(request =>
            cardanoCustodyActions.cardanoCustody.probeCustodyCreatorIndex(
              request,
            ),
          ),
        ),
      },
    } as never,
    { cardanoContext: { selectChainId$: of(chain ?? undefined) } } as never,
    {
      cardanoProvider: provider,
      logger,
      actions: cardanoCustodyActions,
    } as never,
  );

const runProbe = async (
  request: CardanoCustodyCreatorIndexProbeRequest,
  options: Parameters<typeof sideEffectWith>[1] = {},
): Promise<ProbeOutcome> => {
  const action = await firstValueFrom(sideEffectWith([request], options));
  const payload = action.payload as
    | { requestId: string; error: CardanoCustodyCreatorIndexProbeError }
    | { requestId: string; result: CardanoCustodyCreatorIndexProbeResult };
  expect(payload.requestId).toBe(request.requestId);
  return 'result' in payload
    ? { ok: true, result: payload.result }
    : { ok: false, error: payload.error };
};

/** A chain where the credential at `index` is registered; its address holds the state NFT when `holdsNft`. */
const registeredAt = async (index: number, holdsNft: boolean) => {
  const identity = await identityAt(index);
  return fakeProvider({
    rewardAccount: rewardAccount => ({
      isRegistered: rewardAccount === identity.rewardAccount,
      withdrawableAmount: 0n,
    }),
    utxosAt: address =>
      address === identity.address
        ? [
            utxo(77, {
              address: identity.address,
              value: {
                coins: 2_000_000n,
                ...(holdsNft && {
                  assets: new Map([[identity.stateNftAssetId, 1n]]),
                }),
              },
            }),
          ]
        : [],
  });
};

describe('custody creator index probe side effect', () => {
  it('reports an unregistered creator index', async () => {
    const { provider } = fakeProvider();

    expect(await runProbe(probeRequest(), { provider })).toEqual({
      ok: true,
      result: {
        accountValidatorHash: version.accountValidatorHash,
        creatorIndex: 2,
        status: 'unregistered',
      },
    });
    expect(provider.getUtxosAtAddress).not.toHaveBeenCalled();
    expect(provider.evaluateTx).not.toHaveBeenCalled();
  });

  it("reports the creator's account with its record", async () => {
    const { provider } = await registeredAt(2, true);

    expect(await runProbe(probeRequest(), { provider })).toEqual({
      ok: true,
      result: {
        accountValidatorHash: version.accountValidatorHash,
        creatorIndex: 2,
        status: 'account',
        record: createCustodyAccountRecord(await identityAt(2)),
      },
    });
  });

  it('reports a credential someone else registered first', async () => {
    const { provider } = await registeredAt(2, false);

    expect(await runProbe(probeRequest(), { provider })).toMatchObject({
      ok: true,
      result: { status: 'pre-registered', creatorIndex: 2 },
    });
  });

  it('answers every probe under its own id', async () => {
    const actions = await lastValueFrom(
      sideEffectWith([
        probeRequest({ requestId: 'a', creatorIndex: 0 }),
        probeRequest({ requestId: 'b', creatorIndex: 1 }),
      ]).pipe(toArray()),
    );

    expect(
      actions.map(({ payload }) => {
        const { requestId, result } = payload as {
          requestId: string;
          result: CardanoCustodyCreatorIndexProbeResult;
        };
        return [requestId, result.creatorIndex];
      }),
    ).toEqual(
      expect.arrayContaining([
        ['a', 0],
        ['b', 1],
      ]),
    );
  });

  it('refuses a contract version Lace does not support', async () => {
    const { provider } = fakeProvider();
    const accountValidatorHash = Crypto.Hash28ByteBase16('5e'.repeat(28));

    expect(
      await runProbe(probeRequest({ accountValidatorHash }), { provider }),
    ).toEqual({
      ok: false,
      error: { code: 'unsupported-contract-version', accountValidatorHash },
    });
    expect(provider.getRewardAccountInfo).not.toHaveBeenCalled();
  });

  it.each([-1, 0.5, 2 ** 31, Number.NaN])(
    'refuses creator index %s, which is not a soft derivation index',
    async creatorIndex => {
      const { provider } = fakeProvider();

      expect(
        await runProbe(probeRequest({ creatorIndex }), { provider }),
      ).toEqual({
        ok: false,
        error: {
          code: 'invalid-operation',
          reason: 'invalid-start-index',
          message: `Invalid creator index ${creatorIndex}`,
        },
      });
      expect(provider.getRewardAccountInfo).not.toHaveBeenCalled();
    },
  );

  it('reports a missing chain id as unavailable', async () => {
    expect(await runProbe(probeRequest(), { chain: null })).toEqual({
      ok: false,
      error: { code: 'unavailable', message: 'Cardano chain id not available' },
    });
  });

  it('refuses a device key that does not derive', async () => {
    expect(
      await runProbe(
        probeRequest({
          deviceAccountPublicKey: `${'00'.repeat(31)}7f${'ab'.repeat(
            32,
          )}` as Crypto.Bip32PublicKeyHex,
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: 'invalid-operation', reason: 'invalid-device-key' },
    });
  });

  it('reports a chain read failure as unavailable', async () => {
    const { provider } = fakeProvider();
    provider.getRewardAccountInfo.mockReturnValue(
      of(Err(providerError('down'))) as never,
    );

    expect(await runProbe(probeRequest(), { provider })).toMatchObject({
      ok: false,
      error: {
        code: 'unavailable',
        message: expect.stringContaining('Custody reward account') as unknown,
      },
    });
  });

  it('reports an identity the chain id cannot carry as unavailable', async () => {
    expect(
      await runProbe(probeRequest(), {
        chain: {
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: Cardano.NetworkMagics.Mainnet,
        },
      }),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  });

  it('reports any other typed failure as build-failed', async () => {
    readFailure.error = new CustodyBuildFailure({ code: 'stale-control' });
    try {
      expect(await runProbe(probeRequest())).toEqual({
        ok: false,
        error: {
          code: 'build-failed',
          message: 'Unexpected creator index probe failure: stale-control',
        },
      });
    } finally {
      readFailure.error = undefined;
    }
  });

  it('reports an unexpected failure as build-failed and logs it', async () => {
    const logger = { ...dummyLogger, error: vi.fn() };
    readFailure.error = new Error('boom');
    try {
      expect(await runProbe(probeRequest(), { logger })).toEqual({
        ok: false,
        error: { code: 'build-failed', message: 'boom' },
      });
      expect(logger.error).toHaveBeenCalled();
    } finally {
      readFailure.error = undefined;
    }
  });
});
