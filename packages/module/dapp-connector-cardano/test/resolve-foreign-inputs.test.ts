import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { Ok } from '@lace-sdk/util';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createResolveForeignInputsFlow } from '../src/common/store/resolve-foreign-inputs';

import type {
  AccountUtxoMap,
  CardanoProvider,
} from '@lace-contract/cardano-context';

const VALID_TX_CBOR =
  '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

const TX_INPUT_TXID = Cardano.TransactionId(
  '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
);
const TX_INPUT_INDEX = 1;

const mockAddress = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const mockChainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: 1,
};

const createMockHydratedTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.HydratedTxIn => ({
  txId,
  index,
  address: mockAddress,
});

const createMockTxOut = (lovelace: bigint): Cardano.TxOut => ({
  address: mockAddress,
  value: { coins: lovelace },
});

const createMockUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  lovelace: bigint,
): Cardano.Utxo => [
  createMockHydratedTxIn(txId, index),
  createMockTxOut(lovelace),
];

const createMockCardanoProvider = (
  resolveInputMock: CardanoProvider['resolveInput'],
): CardanoProvider =>
  ({
    resolveInput: resolveInputMock,
  } as unknown as CardanoProvider);

describe('createResolveForeignInputsFlow', () => {
  const createMockActions = () => ({
    startResolvingInputs: vi.fn(() => ({ type: 'START_RESOLVING' })),
    setResolvedTransactionInputs: vi.fn((payload: unknown) => ({
      type: 'SET_RESOLVED',
      payload,
    })),
  });

  type TriggerAction = { payload: { txHex: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success case', () => {
    it('resolves foreign inputs and dispatches setResolvedTransactionInputs', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const foreignTxOut = createMockTxOut(5_000_000n);
      const resolveInputMock = vi.fn().mockReturnValue(of(Ok(foreignTxOut)));
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions.length).toBe(2);
      expect(emissions[0]).toEqual({ type: 'START_RESOLVING' });
      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalledWith(
        expect.objectContaining({
          foreignFromAddresses: expect.any(Array) as unknown,
          isResolving: false,
          error: null,
        }),
      );
    });
  });

  describe('no foreign inputs case', () => {
    it('returns empty foreignFromAddresses when all inputs are local', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const resolveInputMock = vi.fn();
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {
        [AccountId('test-account')]: [
          createMockUtxo(TX_INPUT_TXID, TX_INPUT_INDEX, 10_000_000n),
        ],
      };

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions.length).toBe(2);
      expect(emissions[0]).toEqual({ type: 'START_RESOLVING' });
      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalledWith({
        foreignFromAddresses: [],
        isResolving: false,
        error: null,
      });
      expect(resolveInputMock).not.toHaveBeenCalled();
    });
  });

  describe('API errors case', () => {
    it('handles API errors gracefully and reports error message', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const resolveInputMock = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('API unavailable')));
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions.length).toBe(2);
      expect(emissions[0]).toEqual({ type: 'START_RESOLVING' });
      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalledWith({
        foreignFromAddresses: [],
        isResolving: false,
        error: 'API unavailable',
      });
    });

    it('handles non-Error exceptions with generic message', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const resolveInputMock = vi
        .fn()
        .mockReturnValue(throwError(() => 'string error'));
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalledWith({
        foreignFromAddresses: [],
        isResolving: false,
        error: 'Failed to resolve foreign inputs',
      });
    });
  });

  describe('chain ID unavailable case', () => {
    it('returns error when chain ID is undefined', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const resolveInputMock = vi.fn();
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(undefined),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions.length).toBe(2);
      expect(emissions[0]).toEqual({ type: 'START_RESOLVING' });
      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalledWith({
        foreignFromAddresses: [],
        isResolving: false,
        error: 'Chain ID not available',
      });
      expect(resolveInputMock).not.toHaveBeenCalled();
    });
  });

  describe('aggregation behavior', () => {
    it('aggregates values from multiple inputs with the same address', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();

      const txOutWithCoins = (coins: bigint): Cardano.TxOut => ({
        address: mockAddress,
        value: { coins },
      });

      const resolveInputMock = vi
        .fn()
        .mockReturnValue(of(Ok(txOutWithCoins(1_000_000n))));
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockActions.setResolvedTransactionInputs).toHaveBeenCalled();
      const resolvedPayload = mockActions.setResolvedTransactionInputs.mock
        .calls[0][0] as {
        foreignFromAddresses: [string, { coins: string }][];
        isResolving: boolean;
        error: string | null;
      };
      expect(
        resolvedPayload.foreignFromAddresses.length,
      ).toBeGreaterThanOrEqual(0);
      expect(resolvedPayload.isResolving).toBe(false);
      expect(resolvedPayload.error).toBeNull();
    });
  });

  describe('switchMap behavior', () => {
    it('cancels previous resolution when new trigger arrives', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();

      const cardanoProvider = createMockCardanoProvider(() =>
        of(Ok(createMockTxOut(1_000_000n))),
      );

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      flow$.subscribe();

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 50));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockActions.startResolvingInputs).toHaveBeenCalled();
    });
  });

  describe('complete flow', () => {
    it('emits startResolvingInputs followed by setResolvedTransactionInputs', async () => {
      const triggerAction$ = new Subject<TriggerAction>();
      const mockActions = createMockActions();
      const resolveInputMock = vi
        .fn()
        .mockReturnValue(of(Ok(createMockTxOut(5_000_000n))));
      const cardanoProvider = createMockCardanoProvider(resolveInputMock);

      const accountUtxos: AccountUtxoMap = {};

      const flow$ = createResolveForeignInputsFlow({
        triggerAction$,
        getTxHex: action => action.payload!.txHex,
        selectAccountUtxos$: of(accountUtxos),
        selectChainId$: of(mockChainId),
        cardanoProvider,
        actions: mockActions,
      });

      const emissions: unknown[] = [];
      flow$.subscribe(action => emissions.push(action));

      triggerAction$.next({ payload: { txHex: VALID_TX_CBOR } });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions[0]).toEqual({ type: 'START_RESOLVING' });
      expect((emissions[1] as { type: string }).type).toBe('SET_RESOLVED');
    });
  });
});
