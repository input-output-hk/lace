import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { mergeMap, NEVER, of, Subject, tap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../src/browser/const';
import { signTx$ } from '../src/browser/store/util';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import { createCardanoConfirmationCallback } from '../src/common/store/dependencies/create-confirmation-callback';
import {
  cardanoDappConnectorActions,
  cardanoDappConnectorReducers,
  cardanoDappConnectorSelectors,
} from '../src/common/store/slice';

import {
  ACCOUNT_ID,
  CASE_A_TX_CBOR,
  CASE_B_TX_CBOR,
  chainId,
  mockAccount,
  mockAddresses,
  mockWallet,
  ORIGIN,
  OWN_COLLATERAL_UTXO,
} from './support/collateral-api-fixture';

import type { SigningResult } from '../src/browser/store/util';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type {
  CardanoDappConnectorState,
  PendingSignTxRequest,
} from '../src/common/store/slice';
import type { ActionCreators } from '../src/index';
import type { Cardano } from '@cardano-sdk/core';
import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoAccountAddressHistoryMap,
} from '@lace-contract/cardano-context';
import type { View } from '@lace-contract/views';
import type { Subscriber } from 'rxjs';

/**
 * The failure this file exists to make impossible: the refused state renders
 * perfectly in both component tests, `tsc` is green, and PRODUCTION still
 * shows the NORMAL review screen -- with a live Sign button -- for a
 * case-(b) transaction, because the verdict was dropped somewhere between
 * `#validateCanSign` and the slice both render modes read.
 *
 * Three hops copy EXPLICIT fields and silently drop anything unlisted:
 *   HOP 1  `create-confirmation-callback.ts` -- the `type === 'signTx'`
 *          spread that builds `CardanoConfirmationRequest`;
 *   HOP 2  `browser/store/util.ts` -- `signTx$`'s `setPendingSignTxRequest`
 *          payload;
 *   HOP 3  `common/store/slice.ts` -- the `PendingSignTxRequest` type and
 *          its reducer, which is what `selectPendingSignTxRequest` answers
 *          and what BOTH render modes read (never the sheet route params).
 *
 * So this is a SEAM test, not a mocked one: the REAL confirmation callback,
 * the REAL `signTx$` side effect and the REAL slice reducer/selector are
 * strung together and driven from `api.signTx`. Component-level mocks would
 * be blind to every one of the three hops.
 *
 * Both directions are asserted: a block verdict arrives at the selector, and
 * an ALLOW verdict arrives as `null` (a field hardcoded to the refused case
 * would pass the first half alone).
 */

const SENDER: SenderContext = {
  sender: {
    url: ORIGIN,
    tab: { id: 1, title: 'Test DApp', windowId: 7 },
  } as SenderContext['sender'],
};

const actions = {
  ...cardanoDappConnectorActions,
  ...viewsActions,
  ...authenticationPromptActions,
} as unknown as ActionCreators;

const reducer = cardanoDappConnectorReducers.cardanoDappConnector;
const selectPendingSignTxRequest = (state: CardanoDappConnectorState) =>
  cardanoDappConnectorSelectors.cardanoDappConnector.selectPendingSignTxRequest(
    { cardanoDappConnector: state },
  );

/** A confirm or reject as the views dispatch it; no id answers the head. */
type SignAnswerAction = { payload: { requestId?: string } };

type Wiring = {
  api: CardanoDappConnectorApi;
  emitted: { type: string; payload?: unknown }[];
  /** Every request that crossed HOP 1 into the real `signTx$`. */
  requestsAtSignTxSeam: CardanoConfirmationRequest[];
  confirmSignTx$: Subject<SignAnswerAction>;
  signTransaction: ReturnType<typeof vi.fn>;
  shutdown: () => void;
};

/**
 * A popup-window view already at the sign-tx location, so the REAL `signTx$`
 * takes its popup branch to completion (the sheet branch needs a sidePanel
 * view; neither branch is mocked here).
 */
const OPEN_VIEWS: View[] = [
  {
    id: ViewId('sign-tx-popup'),
    location: CARDANO_DAPP_SIGN_TX_LOCATION,
    type: 'popupWindow',
  },
];

/**
 * Strings the production channel together: the REAL confirmation callback ->
 * the REAL `signTx$` -> the actions it emits. Only the store dispatch is
 * replaced (by collecting the actions), and they are then fed to the REAL
 * reducer in each test.
 */
const setUpWiring = (
  overrides: Partial<CardanoDappConnectorApiDependencies> = {},
): Wiring => {
  const emitted: { type: string; payload?: unknown }[] = [];
  const requestsAtSignTxSeam: CardanoConfirmationRequest[] = [];
  const subscriber = {
    next: (action: { type: string; payload?: unknown }) => emitted.push(action),
    error: () => undefined,
    complete: () => undefined,
  } as unknown as Subscriber<{ type: string; payload?: unknown }>;

  const confirmSignTx$ = new Subject<SignAnswerAction>();
  const rejectSignTx$ = new Subject<SignAnswerAction>();
  const signingResult$ = new Subject<SigningResult>();

  const { callback, shutdown } = createCardanoConfirmationCallback(
    request$ =>
      request$.pipe(
        tap(request => requestsAtSignTxSeam.push(request)),
        // One request per test, driven straight into the real side effect.
        mergeMap(request =>
          signTx$({
            request,
            selectOpenViews$: of(OPEN_VIEWS),
            actions,
            confirmSignTx$,
            rejectSignTx$,
            viewDisconnected$: new Subject(),
            signingResult$,
          }),
        ),
      ),
    subscriber,
    // No wallet-api port drops in this harness.
    NEVER,
  );

  const signTransaction = vi.fn().mockResolvedValue('witness-set-cbor');
  const api = new CardanoDappConnectorApi({
    accountUtxos$: of({} as AccountUtxoMap),
    ownershipUtxos$: of({
      [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
    } as unknown as AccountUtxoMap),
    accountUnspendableUtxos$: of({} as AccountUtxoMap),
    rewardAccountDetails$: of({} as AccountRewardAccountDetailsMap),
    addresses$: of(mockAddresses),
    accountTransactionHistory$: of({} as CardanoAccountAddressHistoryMap),
    chainId$: of(chainId),
    allAccounts$: of([mockAccount]),
    allWallets$: of([mockWallet]),
    getAccountIdForOrigin: (origin: string) =>
      origin === ORIGIN ? ACCOUNT_ID : undefined,
    resolveChainedInputs: (): Cardano.Utxo[] => [],
    userConfirmationRequest: callback,
    signTransaction,
    submitTransaction: vi.fn(),
    ...overrides,
  });

  return {
    api,
    emitted,
    requestsAtSignTxSeam,
    confirmSignTx$,
    signTransaction,
    shutdown,
  };
};

const pendingRequestAfterReducer = (
  emitted: { type: string; payload?: unknown }[],
): PendingSignTxRequest | null => {
  const setPending = emitted.filter(
    action =>
      action.type ===
      cardanoDappConnectorActions.cardanoDappConnector.setPendingSignTxRequest
        .type,
  );
  expect(setPending).toHaveLength(1);
  // HOP 3, exercised for real: the action goes through the slice reducer and
  // is read back through the selector both render modes use.
  const state = reducer(
    undefined,
    setPending[0] as Parameters<typeof reducer>[1],
  );
  return selectPendingSignTxRequest(state);
};

beforeEach(() => {
  (globalThis as { chrome?: unknown }).chrome = {
    sidePanel: { setPanelBehavior: () => {} },
  };
});

describe('the verdict reaches the surface', () => {
  it('case (b): the block verdict survives all three explicit-field hops and is readable at selectPendingSignTxRequest', async () => {
    const txCbor = CASE_B_TX_CBOR;
    const expected = 'foreign-collateral-return';
    const { api, emitted, requestsAtSignTxSeam, signTransaction, shutdown } =
      setUpWiring();

    await expect(api.signTx(txCbor, true, SENDER)).rejects.toMatchObject({
      name: 'TxSignError',
    });

    // HOP 1: the confirmation callback carried the verdict onto the request.
    expect(requestsAtSignTxSeam).toHaveLength(1);
    expect(requestsAtSignTxSeam[0].collateralRefusal).toBe(expected);
    expect(requestsAtSignTxSeam[0].txHex).toBe(txCbor);

    // HOP 2 + HOP 3: `signTx$`'s payload, through the real reducer.
    const pending = pendingRequestAfterReducer(emitted);
    expect(pending?.collateralRefusal).toBe(expected);
    expect(pending?.dappOrigin).toBe(ORIGIN);

    // The surface was actually asked to open, in the mode this harness
    // simulates (no side panel -> popup window at the sign-tx location).
    expect(
      emitted.some(
        action =>
          action.type === viewsActions.views.openView.type &&
          (action.payload as { location?: string }).location ===
            CARDANO_DAPP_SIGN_TX_LOCATION,
      ),
    ).toBe(true);

    expect(signTransaction).not.toHaveBeenCalled();
    shutdown();
  });

  it('the ALLOW direction reaches the same slot with the verdict NULL -- so a field hardcoded to a refusal cannot pass', async () => {
    const {
      api,
      emitted,
      requestsAtSignTxSeam,
      confirmSignTx$,
      signTransaction,
      shutdown,
    } = setUpWiring();

    const signing = api.signTx(CASE_A_TX_CBOR, true, SENDER);
    await vi.waitFor(() => {
      expect(requestsAtSignTxSeam).toHaveLength(1);
    });

    expect(requestsAtSignTxSeam[0].collateralRefusal).toBeNull();
    const pending = pendingRequestAfterReducer(emitted);
    expect(pending?.collateralRefusal).toBeNull();
    expect(pending?.txHex).toBe(CASE_A_TX_CBOR);

    // The allow path is a real consent round-trip: it waits for the user. An
    // answer naming no request is applied to the one at the head.
    confirmSignTx$.next({ payload: {} });
    await expect(signing).resolves.toBe('witness-set-cbor');
    expect(signTransaction).toHaveBeenCalledTimes(1);
    shutdown();
  });
});
