import { cardanoCustodyActions } from '@lace-contract/cardano-context';
import { Ok } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { lastValueFrom, of, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  custodyTransactionSideEffects,
  makeCustodyTransactionBuilding,
} from '../../../src/store/custody/build-side-effect';

import {
  accountId,
  collateralFunding,
  deviceAccountPublicKey,
  expectFailure,
  fakeProvider,
  feeFunding,
  granteeKeyHash,
  providerError,
  runBuild,
  stateObservables,
} from './fixtures';

import type { CardanoCustodyBuildRequest } from '@lace-contract/cardano-context';

const createRequest = async (
  requestId = 'create',
): Promise<CardanoCustodyBuildRequest> => ({
  requestId,
  operation: {
    type: 'create',
    deviceAccountPublicKey: await deviceAccountPublicKey(),
  },
  funding: feeFunding(),
});

describe('custody transaction build side effect', () => {
  it('is composed into the module store with the creator index probe', () => {
    expect(custodyTransactionSideEffects).toHaveLength(2);
  });

  it('answers every request under its own id', async () => {
    const requests = [await createRequest('a'), await createRequest('b')];
    const actions = await lastValueFrom(
      makeCustodyTransactionBuilding()(
        {
          cardanoCustody: {
            buildCustodyTransaction$: of(
              ...requests.map(request =>
                cardanoCustodyActions.cardanoCustody.buildCustodyTransaction(
                  request,
                ),
              ),
            ),
          },
        } as never,
        stateObservables() as never,
        {
          cardanoProvider: fakeProvider().provider,
          logger: dummyLogger,
          actions: cardanoCustodyActions,
        } as never,
      ).pipe(toArray()),
    );
    expect(
      actions.map(action => [
        action.type,
        (action.payload as { requestId: string }).requestId,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ['cardanoCustody/buildCustodyTransactionCompleted', 'a'],
        ['cardanoCustody/buildCustodyTransactionCompleted', 'b'],
      ]),
    );
  });

  it('carries the request and the answer as serializable payloads', async () => {
    const request = await createRequest();
    const action =
      cardanoCustodyActions.cardanoCustody.buildCustodyTransaction(request);
    expect(action.payload.requestId).toBe('create');
    expect(JSON.parse(JSON.stringify(action.payload))).toEqual(action.payload);
    expect(Serializable.from(action.payload.request)).toEqual(request);
  });

  it('refuses a creation without fee mode funding', async () => {
    const request = await createRequest();
    expect(
      expectFailure(
        await runBuild({
          ...request,
          funding: collateralFunding(),
        } as never),
      ),
    ).toMatchObject({ code: 'invalid-operation', reason: 'funding-mode' });
  });

  it('refuses fee mode funding for every operation on an existing account', async () => {
    const { provider } = fakeProvider();
    for (const operation of [
      { type: 'grant-spend', grantee: granteeKeyHash, outputs: [] },
      { type: 'revoke-all-grants' },
    ] as const) {
      expect(
        expectFailure(
          await runBuild(
            {
              requestId: 'op',
              accountId,
              operation,
              funding: feeFunding(),
            } as never,
            { provider },
          ),
        ),
      ).toMatchObject({ code: 'invalid-operation', reason: 'funding-mode' });
    }
    expect(provider.getUtxosAtAddress).not.toHaveBeenCalled();
  });

  it('refuses an account operation without an account', async () => {
    expect(
      expectFailure(
        await runBuild({
          requestId: 'op',
          operation: { type: 'revoke-all-grants' },
          funding: feeFunding(),
        } as never),
      ),
    ).toMatchObject({ code: 'invalid-operation', reason: 'unknown-operation' });
  });

  it('refuses an operation type it does not know', async () => {
    expect(
      expectFailure(
        await runBuild({
          requestId: 'op',
          accountId,
          operation: { type: 'create' },
          funding: collateralFunding(),
        } as never),
      ),
    ).toMatchObject({ code: 'invalid-operation', reason: 'unknown-operation' });
  });

  it('reports a missing chain id as unavailable', async () => {
    expect(
      expectFailure(
        await runBuild(await createRequest(), {
          store: { chainId: undefined },
        }),
      ),
    ).toEqual({
      code: 'unavailable',
      message: 'Cardano chain id not available',
    });
  });

  it('reports missing era summaries as unavailable', async () => {
    for (const eraSummaries of [undefined, []]) {
      expect(
        expectFailure(
          await runBuild(await createRequest(), { store: { eraSummaries } }),
        ),
      ).toEqual({
        code: 'unavailable',
        message: 'Cardano era summaries not available',
      });
    }
  });

  it('reports a protocol parameter read failure as unavailable', async () => {
    const { provider } = fakeProvider({
      protocolParameters: providerError('down'),
    });
    expect(
      expectFailure(await runBuild(await createRequest(), { provider })),
    ).toMatchObject({
      code: 'unavailable',
      message: expect.stringContaining(
        'Cardano protocol parameters',
      ) as unknown,
    });
  });

  it('reports an unexpected provider answer as build-failed and logs it', async () => {
    const { provider } = fakeProvider();
    provider.evaluateTx.mockImplementation(() => of(Ok(null)) as never);
    const logger = { ...dummyLogger, error: vi.fn() };
    expect(
      expectFailure(
        await runBuild(await createRequest(), { provider, logger }),
      ),
    ).toMatchObject({ code: 'build-failed' });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('reports a thrown non-error as build-failed', async () => {
    const { provider } = fakeProvider();
    const throwing = {
      find: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'not an error';
      },
    };
    provider.evaluateTx.mockImplementation(() => of(Ok(throwing)) as never);
    expect(
      expectFailure(await runBuild(await createRequest(), { provider })),
    ).toEqual({ code: 'build-failed', message: 'not an error' });
  });
});
