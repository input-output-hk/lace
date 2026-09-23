import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { viewsActions } from '@lace-contract/views';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { BehaviorSubject, firstValueFrom, NEVER, of, Subject } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../src/browser/const';
import { initializeCardanoDappConnectorDependencies } from '../src/browser/store/dependencies/dapp-connector';
import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';
import { TxSignErrorCode } from '../src/common/api-error';
import {
  cardanoDappConnectorActions,
  cardanoDappConnectorReducers,
  cardanoDappConnectorSelectors,
} from '../src/common/store/slice';

import {
  FOREIGN_ADDRESS,
  OWN_ADDRESS,
  SPEND_INPUT,
  blockStages,
  utxo,
} from './support/collateral-api-fixture';

import type { ActionCreators, Selectors } from '../src';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoDappConnectorState } from '../src/common/store/slice';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountUtxoMap } from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

type SignAnswerAction = { payload: { requestId?: string } };

/**
 * The NON-PREEMPTABILITY of the refused screen, plus the pending slot's
 * carrier property on the extension.
 *
 * The dApp-facing rejection is immediate, so the attacker is CLOCKED: it
 * learns from its own code-1 rejection exactly when to fire a follow-up
 * `signTx`. Both extension surfaces render ONLY from the single pending slot
 * (`selectPendingSignTxRequest`; `sheetPages.tsx` discards its route props),
 * and nothing on the signTx path is a busy check, a queue or a supersede
 * guard -- so if the refused flow released the consent slot, that follow-up
 * would repaint the refused screen away and suppress the disclosure entirely.
 *
 * What holds it is the `concatMap` in `connectCardanoDappConnectorApi`,
 * which serves requests one at a time: a second request arriving while the
 * first flow is alive is QUEUED behind it, never started over it. That is a
 * property of PRODUCTION wiring, not of any test scaffold, so this file
 * drives the real side effect end to end (the `wiring-detectors.test.ts`
 * harness idiom: only the extension transport is mocked) and asserts:
 *   1. a second sign request arriving while the refused screen is open emits
 *      NO second `setPendingSignTxRequest` -- the slot still holds the
 *      refusal, with its own request id;
 *   2. dismissal releases the slot, and only then -- and only then is the
 *      queued request shown.
 */

vi.mock('webextension-polyfill', () => ({
  runtime: { id: 'test-extension-id' },
}));

vi.mock('@lace-lib/dapp-connector', () => ({
  senderOrigin: (sender: Runtime.MessageSender) => sender.url,
}));

const mockExposeApi = vi.fn();
const mockShutdown = vi.fn();

vi.mock('@lace-lib/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-lib/extension-messaging');
  return {
    ...actual,
    exposeApi: (...arguments_: unknown[]) => {
      mockExposeApi(...arguments_);
      // The connector relays messenger.disconnect$ into the confirmation
      // callback; no port ever drops in these scenarios.
      return { shutdown: mockShutdown, messenger: { disconnect$: NEVER } };
    },
  };
});

const ACCOUNT_ID = AccountId('acct-refused');
const WALLET_ID = WalletId('wallet-refused');
const ORIGIN = 'https://test-dapp.com';
const CHAIN_ID = Cardano.ChainIds.Preprod;
const SENDER: SenderContext = {
  sender: { url: ORIGIN, tab: { id: 1 } } as SenderContext['sender'],
};

const account: AnyAccount = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Refused Test Account',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: CHAIN_ID,
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

const wallet: AnyWallet = {
  walletId: WALLET_ID,
  name: 'Refused Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [account],
} as unknown as AnyWallet;

const mockAddresses: AnyAddress[] = [
  {
    address: OWN_ADDRESS,
    accountId: ACCOUNT_ID,
    blockchainName: 'Cardano',
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
  } as unknown as AnyAddress,
];

const txId32 = (seed: string) =>
  seed.padEnd(64, '0').slice(0, 64) as Cardano.TransactionId;
const OWN_COLLATERAL_TX_ID = txId32('a1');
const OWN_COLLATERAL_INPUT: Cardano.TxIn = {
  txId: OWN_COLLATERAL_TX_ID,
  index: 0,
};
const OWN_COLLATERAL_UTXO = utxo(OWN_COLLATERAL_TX_ID, 0, OWN_ADDRESS);

const txSuffix = { value: 0 };
const buildTx = ({
  collateralReturnAddress,
}: {
  collateralReturnAddress: Cardano.PaymentAddress;
}): string => {
  txSuffix.value += 1;
  return Serialization.Transaction.fromCore({
    id: txId32(`c${txSuffix.value}`),
    body: {
      inputs: [SPEND_INPUT],
      outputs: [
        {
          address: OWN_ADDRESS,
          value: { coins: 1_000_000n } as unknown as Cardano.Value,
        },
      ],
      fee: 170_000n,
      collaterals: [OWN_COLLATERAL_INPUT],
      collateralReturn: {
        address: collateralReturnAddress,
        value: { coins: 2_000_000n } as unknown as Cardano.Value,
      },
    } as Cardano.TxBody,
    witness: { signatures: new Map() },
  } as Cardano.Tx).toCbor() as string;
};

const CASE_B_TX_CBOR = buildTx({ collateralReturnAddress: FOREIGN_ADDRESS });
const CASE_A_TX_CBOR = buildTx({ collateralReturnAddress: OWN_ADDRESS });

const CASE_B_MESSAGE =
  "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.";

const reducer = cardanoDappConnectorReducers.cardanoDappConnector;
const selectPendingSignTxRequest = (state: CardanoDappConnectorState) =>
  cardanoDappConnectorSelectors.cardanoDappConnector.selectPendingSignTxRequest(
    { cardanoDappConnector: state },
  );

interface ExposeApiConfig {
  api$: Observable<CardanoDappConnectorApi>;
}
const firstFromApi$ = async (): Promise<CardanoDappConnectorApi> => {
  const calls = mockExposeApi.mock.calls as [[ExposeApiConfig, unknown]];
  return firstValueFrom(calls.at(-1)![0].api$);
};

/** One live, production-wired side effect; only the transport is mocked. */
const setUpWiring = async () => {
  const openViews$ = new BehaviorSubject<View[]>([]);
  const rejectSignTx$ = new Subject<SignAnswerAction>();
  const emitted: { type: string; payload?: unknown }[] = [];
  const logger = {
    ...dummyLogger,
    warn: vi.fn(),
  };

  const actionObservables = {
    cardanoDappConnector: {
      confirmConnect$: new Subject<void>(),
      rejectConnect$: new Subject<void>(),
      confirmSignTx$: new Subject<void>(),
      rejectSignTx$,
      confirmSignData$: new Subject<void>(),
      rejectSignData$: new Subject<void>(),
    },
    views: { viewDisconnected$: new Subject<{ payload: string }>() },
  };

  const stateObservables = {
    views: { selectOpenViews$: openViews$ },
    appLock: { isUnlocked$: of(true) },
    dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
    cardanoContext: {
      selectChainId$: of(CHAIN_ID),
      selectCollateralOwnershipUtxos$: of({
        [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
      } as unknown as AccountUtxoMap),
      selectAvailableAccountUtxos$: of({
        [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
      } as unknown as AccountUtxoMap),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(mockAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([account]),
      selectAll$: of([wallet]),
    },
  };

  const deps = {
    // The SAME spy on both seams: the API class logs the block, the browser
    // side effect logs the presentation, and the pair is what tells a
    // suppressed refusal from a shown one.
    connectCardanoDappConnector: initializeCardanoDappConnectorDependencies({
      logger,
    }).connectCardanoDappConnector,
    // The REAL action creators: this file exercises the real `signTx$` /
    // `refusedSignTx$`, which dispatch through them.
    actions: {
      ...cardanoDappConnectorActions,
      ...viewsActions,
      ...authenticationPromptActions,
      activities: { upsertActivities: vi.fn() },
    },
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
      getTransactionDetails: vi.fn().mockReturnValue(of(Err(new Error('n/a')))),
    },
    // Never reached: the case-(b) request is refused, and the case-(a) one
    // waits in the queue and is never confirmed.
    signerFactory: {
      canSign: () => false,
      createTransactionSigner: () => {
        throw new Error('not exercised by this scenario');
      },
    },
    logger,
  };

  const sideEffect$ = connectCardanoDappConnectorApi(
    actionObservables as unknown as ActionObservables<ActionCreators>,
    stateObservables as unknown as StateObservables<Selectors>,
    deps as unknown as SideEffectDependencies &
      WithLaceContext<Selectors, ActionCreators>,
  );
  const subscription = sideEffect$.subscribe(action =>
    emitted.push(action as { type: string; payload?: unknown }),
  );
  const walletApi = await firstFromApi$();

  return {
    walletApi,
    subscription,
    emitted,
    openViews$,
    rejectSignTx$,
    logger,
  };
};

const setPendingActions = (emitted: { type: string; payload?: unknown }[]) =>
  emitted.filter(
    action =>
      action.type ===
      cardanoDappConnectorActions.cardanoDappConnector.setPendingSignTxRequest
        .type,
  );

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as { chrome?: unknown }).chrome = {
    sidePanel: { setPanelBehavior: () => {} },
  };
});

describe('the refused screen is non-preemptable (production-wired)', () => {
  it('a SECOND sign request arriving while the refused screen is open cannot repaint or replace it; dismissal is what releases the slot', async () => {
    const { walletApi, subscription, emitted, openViews$, rejectSignTx$ } =
      await setUpWiring();

    // 1. The poisoned request: rejected at once, screen requested.
    await expect(
      walletApi.signTx(CASE_B_TX_CBOR, true, SENDER),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });

    expect(
      emitted.some(
        action =>
          action.type === viewsActions.views.openView.type &&
          (action.payload as { location?: string }).location ===
            CARDANO_DAPP_SIGN_TX_LOCATION,
      ),
    ).toBe(true);

    const afterFirst = setPendingActions(emitted);
    expect(afterFirst).toHaveLength(1);
    const refusedState = reducer(
      undefined,
      afterFirst[0] as Parameters<typeof reducer>[1],
    );
    const refusedPending = selectPendingSignTxRequest(refusedState);
    expect(refusedPending?.collateralRefusal).toBe('foreign-collateral-return');
    // The slot holds the verdict AND the request identity, and that slot is
    // the only thing either extension surface renders from.
    expect(refusedPending?.requestId).toContain(ORIGIN);
    expect(refusedPending?.dappOrigin).toBe(ORIGIN);

    // The refused window is now open.
    openViews$.next([
      {
        id: 'sign-tx-popup',
        location: CARDANO_DAPP_SIGN_TX_LOCATION,
        type: 'popupWindow',
      } as unknown as View,
    ]);

    // 2. The clocked follow-up: an ordinary, allow-verdict request fired
    // immediately after the attacker sees its rejection. It must NOT reach
    // the surface while the refused screen is up -- it waits in the queue,
    // so it is deliberately not awaited here.
    const followUp = walletApi.signTx(CASE_A_TX_CBOR, true, SENDER);
    followUp.catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(setPendingActions(emitted)).toHaveLength(1);
    const stillRefused = selectPendingSignTxRequest(
      setPendingActions(emitted).reduce(
        (state, action) =>
          reducer(state, action as Parameters<typeof reducer>[1]),
        undefined as unknown as CardanoDappConnectorState,
      ),
    );
    expect(stillRefused?.collateralRefusal).toBe('foreign-collateral-return');
    expect(stillRefused?.requestId).toBe(refusedPending?.requestId);

    // 3. Only the user's dismissal releases the slot.
    expect(
      emitted.some(
        action =>
          action.type ===
          cardanoDappConnectorActions.cardanoDappConnector
            .clearPendingSignTxRequest.type,
      ),
    ).toBe(false);

    rejectSignTx$.next({ payload: {} });
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(
      emitted.some(
        action =>
          action.type ===
          cardanoDappConnectorActions.cardanoDappConnector
            .clearPendingSignTxRequest.type,
      ),
    ).toBe(true);

    // 4. The follow-up was queued, not dropped: it takes the slot only now,
    // as an ordinary reviewable request.
    const afterDismissal = setPendingActions(emitted);
    expect(afterDismissal).toHaveLength(2);
    expect(
      (afterDismissal[1] as { payload: { collateralRefusal: unknown } }).payload
        .collateralRefusal,
    ).toBeNull();

    subscription.unsubscribe();
  });

  it('both render modes read the pending slot, and neither reads the sheet route params', () => {
    const read = (relative: string) =>
      readFileSync(path.join(__dirname, '..', relative), 'utf8');

    // `useDappPopupFlow` is the only source of `request` in both views, and
    // it is hardwired to the slot selector. If a future change routed the
    // verdict through route params instead, this pin would have to be
    // revisited deliberately.
    expect(read('src/browser/hooks/useDappPopupFlow.ts')).toContain(
      "signTx: 'cardanoDappConnector.selectPendingSignTxRequest'",
    );
    for (const view of [
      'src/browser/views/CardanoDappSignTxPopup.tsx',
      'src/browser/views/CardanoDappSignTx.tsx',
    ]) {
      const source = read(view);
      expect(source).toContain('useDappPopupFlow({');
      // The verdict is read off that request, whatever the access idiom.
      expect(source).toMatch(/request\??\.collateralRefusal/);
      expect(source).not.toContain('route.params');
    }
  });
});

describe('a delayed refusal is distinguishable in the logs', () => {
  it('a refusal that reaches the surface logs BOTH the block and the presentation', async () => {
    const { walletApi, subscription, logger } = await setUpWiring();

    await expect(
      walletApi.signTx(CASE_B_TX_CBOR, true, SENDER),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });

    expect(blockStages(logger)).toContain('refused');
    expect(blockStages(logger)).toContain('screen-presented');

    subscription.unsubscribe();
  });

  it('ordering: a dApp that PARKS the consent slot first only DELAYS the screen -- the refusal is presented once the parked request settles, and the log pair shows the gap', async () => {
    const {
      walletApi,
      subscription,
      emitted,
      openViews$,
      rejectSignTx$,
      logger,
    } = await setUpWiring();

    // The popup is registered up front, so the parked flow waits on the user
    // rather than on registration.
    openViews$.next([
      {
        id: 'sign-tx-popup',
        location: CARDANO_DAPP_SIGN_TX_LOCATION,
        type: 'popupWindow',
      } as unknown as View,
    ]);

    // The benign request parks the single consent slot: nothing answers it,
    // so its flow stays alive. Preempting a live consent flow would be the
    // worse trade, so the refusal has to wait its turn.
    const parked = walletApi.signTx(CASE_A_TX_CBOR, true, SENDER);
    parked.catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(setPendingActions(emitted)).toHaveLength(1);

    // Now the poisoned one. Funds are protected at once -- it is refused with
    // the same code-1 rejection -- but its disclosure is queued, not shown.
    await expect(
      walletApi.signTx(CASE_B_TX_CBOR, true, SENDER),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });
    await new Promise(resolve => setTimeout(resolve, 20));

    // The screen has not opened yet: no second pending-request write.
    expect(setPendingActions(emitted)).toHaveLength(1);
    expect(
      (
        setPendingActions(emitted)[0] as {
          payload: { collateralRefusal: unknown };
        }
      ).payload.collateralRefusal,
    ).toBeNull();

    // ...and THAT is visible: the block was logged, the presentation was not.
    // An incident responder can tell a refusal the user has not seen from one
    // they have.
    expect(blockStages(logger)).toContain('refused');
    expect(blockStages(logger)).not.toContain('screen-presented');

    // The user declines the parked request; the queue moves on and the
    // refused screen takes the slot with its verdict.
    rejectSignTx$.next({ payload: {} });
    await new Promise(resolve => setTimeout(resolve, 20));

    const afterParkedSettles = setPendingActions(emitted);
    expect(afterParkedSettles).toHaveLength(2);
    expect(
      (afterParkedSettles[1] as { payload: { collateralRefusal: unknown } })
        .payload.collateralRefusal,
    ).toBe('foreign-collateral-return');
    expect(blockStages(logger)).toContain('screen-presented');

    subscription.unsubscribe();
  });
});
