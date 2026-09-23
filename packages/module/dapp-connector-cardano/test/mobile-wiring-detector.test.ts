import { Cardano, Serialization } from '@cardano-sdk/core';
import { withCollateralOwnershipGuard } from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TxSignErrorCode } from '../src/common/api-error';
import { handleSignTxConfirmation } from '../src/mobile/store/side-effects';

import { FOREIGN_ADDRESS, OWN_ADDRESS } from './support/collateral-api-fixture';

import type { WebViewResponse } from '../src/common/store/slice';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// Native/RN-only modules `mobile/store/side-effects.ts` imports at load time
// -- same two mocks `sign-tx-native-script-mobile.test.ts` already
// establishes for driving this module's side effects outside a RN runtime.
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: vi.fn(), closeSheet: vi.fn() },
  SheetRoutes: {},
}));
vi.mock('../src/mobile/services/cip30-message-handler', () => ({
  handleCip30Message: vi.fn(),
}));

/**
 * Mobile's `#validateCanSign` equivalent is production-unreachable: mobile's
 * CIP-30 `signTx` never calls `walletApi.signTx()`. Mobile's REAL protection
 * is `handleSignTxConfirmation`
 * (`handleSignTxConfirmation`), which builds its own
 * `ownershipUtxos` union (`:920-923`, settled `selectCollateralOwnershipUtxos$` union the
 * chained resolver) and passes it to `signerFactory.createTransactionSigner`
 * -- i.e. mobile's refusal is sourced from the WRAPPED FACTORY's
 * `CollateralOwnershipError`, not from a pre-consent check.
 *
 * This test drives that real side effect (the exact harness idiom already
 * established and reviewed in `sign-tx-native-script-mobile.test.ts`'s
 * `runConfirmation`), with a REAL `withCollateralOwnershipGuard`-wrapped
 * factory -- the same wrapper every production Cardano factory uses -- and a
 * collateral-reserved own UTxO (present in `selectCollateralOwnershipUtxos$`, absent
 * from `selectAvailableAccountUtxos$`), exactly mirroring `wiring-detectors
 * .test.ts`'s w1 but for the mobile construction site at `:920-923` instead
 * of the browser one. If mobile's `ownershipUtxos`
 * construction were ever swapped to the available view, this input would
 * miss the resolver's local layer and the guard would have to ask the
 * provider -- so the provider staying silent is what proves the wiring.
 */

const ACCOUNT_ID = AccountId('acct-mobile-wiring');
const WALLET_ID = WalletId('wallet-mobile-wiring');
const ORIGIN = 'https://test-dapp.com';
const REQUEST_ID = 'req-mobile-wiring-1';

const chainId = { networkId: 0, networkMagic: 1 } as Cardano.ChainId;

const account: AnyAccount = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Mobile Wiring Test Account',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId,
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

const wallet: AnyWallet = {
  walletId: WALLET_ID,
  name: 'Mobile Wiring Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [account],
} as unknown as AnyWallet;

const allAddresses = [
  {
    accountId: ACCOUNT_ID,
    address: OWN_ADDRESS,
    data: {
      type: 0,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: Cardano.RewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      ),
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  },
];

const txId32 = (seed: string) =>
  seed.padEnd(64, '0').slice(0, 64) as Cardano.TransactionId;
const SPEND_INPUT: Cardano.TxIn = { txId: txId32('f'.repeat(64)), index: 0 };
const RESERVED_TX_ID = txId32('a1a1');
const RESERVED_INPUT: Cardano.TxIn = { txId: RESERVED_TX_ID, index: 0 };
const RESERVED_UTXO: Cardano.Utxo = [
  { ...RESERVED_INPUT, address: OWN_ADDRESS },
  {
    address: OWN_ADDRESS,
    value: { coins: 5_000_000n } as unknown as Cardano.Value,
  },
];

const CASE_B_TX_BODY = {
  inputs: [SPEND_INPUT],
  outputs: [
    {
      address: OWN_ADDRESS,
      value: { coins: 1_000_000n } as unknown as Cardano.Value,
    },
  ],
  fee: 170_000n,
  collaterals: [RESERVED_INPUT],
  collateralReturn: {
    address: FOREIGN_ADDRESS,
    value: { coins: 2_000_000n } as unknown as Cardano.Value,
  },
} as Cardano.TxBody;

const CASE_B_TX_CBOR = Serialization.Transaction.fromCore({
  id: txId32('a1a2'),
  body: CASE_B_TX_BODY,
  witness: { signatures: new Map() },
} as Cardano.Tx).toCbor() as string;

// A cleanly decodable "signed" version of the SAME body -- used only as the
// stub inner signer's would-be response, so that if the guard is ever
// bypassed (e.g. by the swap this file's sensitivity check perturbs), the
// pipeline reaches a genuine ALLOW/success outcome instead of an incidental
// CBOR-decode error, keeping the red signal legible.
const SIGNED_CASE_B_TX_CBOR = Serialization.Transaction.fromCore({
  id: txId32('a1a2'),
  body: CASE_B_TX_BODY,
  witness: {
    signatures: new Map([['a'.repeat(64) as never, 'b'.repeat(128) as never]]),
  },
} as Cardano.Tx).toCbor() as string;

const CASE_B_MESSAGE =
  "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.";

/**
 * A real `CardanoSignerFactory`-shaped factory using the REAL
 * `withCollateralOwnershipGuard` (the exact wrapper all seven production
 * factories use) around a stub inner signer that must never be invoked when
 * the guard blocks.
 */
const innerSign = vi.fn((_request: CardanoSignRequest) =>
  of({
    serializedTx: HexBytes(SIGNED_CASE_B_TX_CBOR),
    signatureCount: 1,
  } as CardanoSignResult),
);
const wrappedGuardFactory = {
  canSign: () => true,
  createTransactionSigner: (context: CardanoTransactionSignerContext) =>
    withCollateralOwnershipGuard(
      { sign: innerSign } as CardanoTransactionSigner,
      context,
    ),
};

describe('mobile wiring detector: handleSignTxConfirmation ownership-context construction', () => {
  it('a collateral-reserved own UTxO (settled-only, absent from the available view) is REFUSED via the real wrapped factory, sourced from CollateralOwnershipError', async () => {
    innerSign.mockClear();
    const confirmSignTx$ = new Subject<void>();
    const setWebViewResponse = vi.fn((response: WebViewResponse) => ({
      type: 'setWebViewResponse',
      payload: response,
    }));
    const clearPendingSignTxRequest = vi.fn(() => ({
      type: 'clearPendingSignTxRequest',
    }));

    const actionObservables = { cardanoDappConnector: { confirmSignTx$ } };
    const stateObservables = {
      cardanoDappConnector: {
        selectPendingSignTxRequest$: of({
          requestId: REQUEST_ID,
          dappOrigin: ORIGIN,
          txHex: CASE_B_TX_CBOR,
          partialSign: true,
        }),
        selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
      },
      wallets: {
        selectActiveNetworkAccounts$: of([account]),
        selectAll$: of([wallet]),
      },
      addresses: { selectAllAddresses$: of(allAddresses) },
      cardanoContext: {
        selectChainId$: of(chainId),
        // The available/spendable view -- feeds `resolutionUtxos` only.
        // EXCLUDES the collateral-reserved UTxO, as a real reservation would.
        selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: [] }),
        // The ownership authority -- the collateral resolver's local layer.
        // INCLUDES the collateral-reserved UTxO. Deliberately DIFFERENT
        // content from the available view above: if production swapped which
        // one feeds the resolver, this input would be a local miss and the
        // provider below would be consulted.
        selectCollateralOwnershipUtxos$: of({ [ACCOUNT_ID]: [RESERVED_UTXO] }),
      },
    };
    const deps = {
      actions: {
        cardanoDappConnector: { setWebViewResponse, clearPendingSignTxRequest },
      },
      accessAuthSecret: vi.fn(),
      authenticate: vi.fn().mockReturnValue(of(true)),
      signerFactory: wrappedGuardFactory,
      cardanoProvider: { resolveInput: vi.fn() },
    };

    const emitted: { type: string; payload?: WebViewResponse }[] = [];
    const subscription = handleSignTxConfirmation(
      actionObservables as unknown as Parameters<
        typeof handleSignTxConfirmation
      >[0],
      stateObservables as unknown as Parameters<
        typeof handleSignTxConfirmation
      >[1],
      deps as unknown as Parameters<typeof handleSignTxConfirmation>[2],
    ).subscribe(action =>
      emitted.push(action as { type: string; payload?: WebViewResponse }),
    );

    confirmSignTx$.next();
    await vi.waitFor(() => {
      expect(emitted.some(a => a.type === 'setWebViewResponse')).toBe(true);
    });
    subscription.unsubscribe();

    const response = emitted.find(a => a.type === 'setWebViewResponse')!
      .payload!;

    // The guard refuses after consent with the extension's CIP-30 code
    // (LW-15498): TxSignErrorCode.ProofGeneration, code 1, with the case copy.
    // Before LW-15498 mobile flattened this to APIErrorCode.InternalError.
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
    expect(response.error?.info).toBe(CASE_B_MESSAGE);
    expect(innerSign).not.toHaveBeenCalled();
    // A local-layer hit: the verdict needed no provider round-trip.
    expect(deps.cardanoProvider.resolveInput).not.toHaveBeenCalled();
  });
});
