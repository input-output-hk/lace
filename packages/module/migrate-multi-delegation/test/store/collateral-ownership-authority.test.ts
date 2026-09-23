// @vitest-environment node
//
// Node, not this package's default jsdom: the Cardano SDK's CBOR/bech32 path
// fails cross-realm under jsdom, and this file drives the REAL guard over a
// real transaction rather than asserting on plumbing.
import { CollateralOwnershipError } from '@lace-contract/cardano-context';
import { withCollateralOwnershipGuard } from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Err, HexBytes, Ok } from '@lace-lib/util';
import {
  CASE_B_TX,
  FOREIGN_ADDRESS,
  NO_COLLATERAL_TX,
  OWN_COLLATERAL,
  OWN_COLLATERAL_UTXO,
  WALLET_ADDRESS,
} from '@lace-lib/util-dev-cardano';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { signTx } from '../../src/store/side-effects';
import { migrateMultiDelegationActions } from '../../src/store/slice';

import type { AccountContext } from '../../src/store/side-effects';
import type { Cardano, Serialization } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const accountId = AccountId('account-1');
const walletId = WalletId('wallet-1');

const account = {
  accountId,
  walletId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 },
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AccountContext['account'];

const wallet = {
  walletId,
  type: WalletType.InMemory,
  metadata: { name: 'Test Wallet', order: 0 },
  accounts: [],
  blockchainSpecific: {
    Cardano: { encryptedRootPrivateKey: 'encrypted-key' },
  },
} as unknown as AnyWallet;

const logger = (): SideEffectDependencies['logger'] => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
});

/**
 * A collateral-reserved own UTxO: in the settled authority, ABSENT from the
 * available/spendable view. The settled authority is the collateral
 * resolver's local layer; wiring `ownershipUtxo$` to the available view
 * would send the rule to the provider for exactly this shape.
 */
const context = (ownershipUtxos = [OWN_COLLATERAL_UTXO]): AccountContext => ({
  account,
  wallet$: of(wallet),
  accountAddresses$: of([
    { address: WALLET_ADDRESS } as unknown as GroupedAddress,
  ]),
  accountUtxo$: of([]),
  ownershipUtxo$: of(ownershipUtxos),
});

const tx = (cbor: string) =>
  ({ toCbor: () => cbor } as unknown as Serialization.Transaction);

const run = async (
  accountContext: AccountContext,
  innerSign: ReturnType<typeof vi.fn>,
  {
    log = logger(),
    cardanoProvider = { resolveInput: vi.fn() },
  }: {
    log?: SideEffectDependencies['logger'];
    cardanoProvider?: { resolveInput: ReturnType<typeof vi.fn> };
  } = {},
) =>
  new Promise<void>(resolve => {
    signTx(
      accountContext,
      {
        logger: log,
        cardanoProvider,
        actions: { ...migrateMultiDelegationActions },
        accessAuthSecret: vi.fn(),
        authenticate: vi.fn(),
        signerFactory: {
          canSign: vi.fn().mockReturnValue(true),
          createDataSigner: vi.fn(),
          createTransactionSigner: (
            context_: CardanoTransactionSignerContext,
          ) => withCollateralOwnershipGuard({ sign: innerSign }, context_),
        },
      } as never,
      false,
    )(tx(CASE_B_TX)).subscribe({
      complete: () => {
        resolve();
      },
    });
  });

describe('the sweep-free multi-delegation origin builds its ownership authority from the settled set', () => {
  const signed = () =>
    vi.fn(() =>
      of({ serializedTx: HexBytes(NO_COLLATERAL_TX), signatureCount: 1 }),
    );

  it('refuses a case-(b) tx whose collateral input is settled-only', async () => {
    const innerSign = signed();
    const log = logger();

    await run(context(), innerSign, { log });

    expect(innerSign).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      'Failed to sign migration tx',
      expect.any(CollateralOwnershipError),
    );
  });

  it('a case-(b) tx whose collateral the settled authority lacks reaches the signer when the provider cannot resolve it either: an unidentifiable input is not ours (LW-15506)', async () => {
    const innerSign = signed();
    const log = logger();
    const resolveInput = vi.fn(() => of(Err(new Error('provider down'))));

    await run(context([]), innerSign, {
      log,
      cardanoProvider: { resolveInput },
    });

    expect(resolveInput).toHaveBeenCalledOnce();
    expect(innerSign).toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalledWith(
      'Failed to sign migration tx',
      expect.any(CollateralOwnershipError),
    );
  });

  it('control: the same tx reaches the signer once the provider PROVES that collateral foreign, so the refusal above is not vacuous', async () => {
    const innerSign = signed();
    const resolveInput = vi.fn(() =>
      of(
        Ok({
          address: FOREIGN_ADDRESS,
          value: { coins: 5_000_000n },
        } as Cardano.TxOut),
      ),
    );

    await run(context([]), innerSign, { cardanoProvider: { resolveInput } });

    expect(resolveInput).toHaveBeenCalledWith(
      OWN_COLLATERAL,
      expect.objectContaining({ chainId: account.blockchainSpecific.chainId }),
    );
    expect(innerSign).toHaveBeenCalled();
  });

  it('a settled-authority hit never consults the provider', async () => {
    const resolveInput = vi.fn();

    await run(context(), signed(), { cardanoProvider: { resolveInput } });

    expect(resolveInput).not.toHaveBeenCalled();
  });
});
