import { defer, finalize, of } from 'rxjs';
import { dummyLogger } from 'ts-log';

import { migrateWalletActions } from '../../../src/store/slice';

import { cardanoProviderShim } from './provider-shim';
import { buildSignerFactory } from './signer-factory';
import { HEADLESS_AUTH_SECRET } from './source-identity';

import type { SideEffect } from '../../../src';
import type { Providers } from '../../cardano/queries';
import type { SignerConfig } from '../../cardano/signing';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { Observable } from 'rxjs';

type Dependencies = Parameters<SideEffect>[2];

const mw = migrateWalletActions.migrateWallet;

/**
 * The side-effect dependencies backed by real infrastructure: a cardanoProvider
 * on Blockfrost, a signerFactory keyed from the source mnemonic (so the real
 * signSweepTx runs), no-op auth for the headless run, the real action creators,
 * and a logger. Cast to the full type where injected. The side-effects read
 * only this subset, as the module's unit test asserts.
 */
export const buildDependencies = (
  providers: Providers,
  signer: SignerConfig,
): Dependencies =>
  ({
    cardanoProvider: cardanoProviderShim(providers),
    signerFactory: buildSignerFactory(signer),
    // Headless: authenticate auto-confirms. signSweepTx reopens the wallet's
    // encrypted root under the auth secret, and the scan derives extra-account
    // xpubs the same way, so hand each call a fresh clone of the headless secret
    // the root was sealed with, zeroed on completion.
    authenticate: () => of(true),
    accessAuthSecret: <T>(
      callback: (authSecret: AuthSecret) => Observable<T>,
    ): Observable<T> =>
      defer(() => {
        const clone = Uint8Array.from(
          HEADLESS_AUTH_SECRET,
        ) as unknown as AuthSecret;
        return callback(clone).pipe(
          finalize(() => (clone as unknown as Uint8Array).fill(0)),
        );
      }),
    actions: {
      migrateWallet: mw,
      activities: {
        upsertActivities: (payload: unknown) => ({
          type: 'activities/upsertActivities' as const,
          payload,
        }),
      },
    },
    logger: dummyLogger,
  } as unknown as Dependencies);
