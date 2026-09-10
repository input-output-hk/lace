import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';
import { DappId } from '@lace-contract/dapp-connector';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import {
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-lib/extension-messaging';
import { EMPTY, firstValueFrom, map, Observable, of, tap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../../../src/api-error';
import { WalletApiMethodNames } from '../../../src/const';
import { BITCOIN_WALLET_API_CHANNEL } from '../../../src/messaging';
import {
  handleRequestValidation,
  initializeBitcoinDappConnectorSideEffectDependencies,
} from '../../../src/store/dependencies/dapp-connector';

import type { BitcoinDappConnectorProvider } from '../../../src/store/dependencies/bitcoin-dapp-connector-api';
import type { BitcoinConfirmationRequest } from '../../../src/store/dependencies/create-confirmation-callback';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { RemoteApiMethod } from '@lace-lib/extension-messaging';
import type { Logger } from 'ts-log';
import type { Runtime } from 'webextension-polyfill';

vi.mock('webextension-polyfill', () => ({ runtime: {} }));

vi.mock('@lace-lib/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-lib/extension-messaging');
  return {
    ...actual,
    exposeApi: vi.fn(() => ({ shutdown: vi.fn() })),
  };
});

const AUTHORIZED_ORIGIN = 'https://authorized-test-dapp.com';
const OTHER_ORIGIN = 'https://other-dapp.com';
const ACCOUNT_ID = AccountId('account-1');
const OTHER_ACCOUNT_ID = AccountId('account-2');
const ACCOUNT_ADDRESS = 'bc1qauthorizedaccount';
const OTHER_ACCOUNT_ADDRESS = 'bc1qotheraccount';
const VALID_PSBT_BASE64 = 'cHNidP8BAAoAAAAAAAAAAAAA';
const VALID_PSBT_HEX = Buffer.from(VALID_PSBT_BASE64, 'base64').toString('hex');

const authorizedDapps$: Observable<AuthorizedDappsDataSlice> = of({
  Bitcoin: [
    {
      walletId: WalletId('13e603103d9f6d5aa0cb445ed0d801a9'),
      blockchain: 'Bitcoin',
      isPersisted: true,
      dapp: {
        id: DappId('authorized-dapp-id'),
        name: 'Test DApp',
        origin: AUTHORIZED_ORIGIN,
        imageUrl: '',
      },
    },
  ],
} as unknown as AuthorizedDappsDataSlice);

const createSender = (origin: string): Runtime.MessageSender =>
  ({ url: `${origin}/app` } as Runtime.MessageSender);

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  trace: vi.fn(),
} as unknown as Logger;

type ConnectorParams = Parameters<
  ReturnType<
    typeof initializeBitcoinDappConnectorSideEffectDependencies
  >['connectBitcoinDappConnector']
>[0];

const createMockAddress = (address: string, accountId: AccountId): AnyAddress =>
  ({ address, accountId, blockchainName: 'Bitcoin' } as unknown as AnyAddress);

const createConnectorParams = (
  overrides: Partial<ConnectorParams> = {},
): ConnectorParams => ({
  authorizedDapps$,
  isUnlocked$: of(true),
  handleRequests: () => EMPTY,
  addresses$: of([
    createMockAddress(ACCOUNT_ADDRESS, ACCOUNT_ID),
    createMockAddress(OTHER_ACCOUNT_ADDRESS, OTHER_ACCOUNT_ID),
  ]),
  accountUtxos$: of({}),
  accountTokens$: of({}),
  activeNetworkId$: of(BitcoinNetworkId('mainnet')),
  bitcoinProvider: {
    getUTxOs: vi.fn(),
    submitTransaction: vi.fn(),
  } as unknown as BitcoinDappConnectorProvider,
  getAccountIdForOrigin: (origin: string) => {
    if (origin === AUTHORIZED_ORIGIN) return ACCOUNT_ID;
    if (origin === OTHER_ORIGIN) return OTHER_ACCOUNT_ID;
    return undefined;
  },
  signMessage: vi.fn(),
  signPsbt: vi.fn(async () => 'signed-psbt'),
  buildSendTx: vi.fn(),
  confirmSendTx: vi.fn(),
  submitRawTx: vi.fn(),
  ...overrides,
});

type ExposedProps = {
  baseChannel: string;
  api$: Observable<Record<string, (...args: unknown[]) => Promise<unknown>>>;
  properties: Record<string, RemoteApiMethod>;
};

const getExposedProperties = (): ExposedProps => {
  const [props] = vi.mocked(exposeApi).mock.calls[0] as unknown as [
    ExposedProps,
  ];
  return props;
};

describe('handleRequestValidation', () => {
  it('throws Refused when the wallet is locked', async () => {
    await expect(
      handleRequestValidation(
        createSender(AUTHORIZED_ORIGIN),
        authorizedDapps$,
        of(false),
      ),
    ).rejects.toThrow('Wallet is locked');
  });

  it('throws Refused when the origin is not an authorized Bitcoin dApp', async () => {
    const rejection = handleRequestValidation(
      createSender('https://unauthorized.com'),
      authorizedDapps$,
      of(true),
    );

    await expect(rejection).rejects.toBeInstanceOf(BitcoinAPIError);
    await expect(rejection).rejects.toMatchObject({
      code: BitcoinAPIErrorCode.Refused,
    });
  });

  it('throws Refused when the sender is missing', async () => {
    await expect(
      handleRequestValidation(undefined, authorizedDapps$, of(true)),
    ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.Refused });
  });

  it('resolves when the wallet is unlocked and the origin is authorized', async () => {
    await expect(
      handleRequestValidation(
        createSender(AUTHORIZED_ORIGIN),
        authorizedDapps$,
        of(true),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('initializeBitcoinDappConnectorSideEffectDependencies', () => {
  beforeEach(() => {
    vi.mocked(exposeApi).mockClear();
    vi.mocked(exposeApi).mockReturnValue({
      shutdown: vi.fn(),
    } as unknown as ReturnType<typeof exposeApi>);
  });

  const connect = (overrides: Partial<ConnectorParams> = {}) => {
    const { connectBitcoinDappConnector } =
      initializeBitcoinDappConnectorSideEffectDependencies({ logger });
    return connectBitcoinDappConnector(
      createConnectorParams(overrides),
    ).subscribe();
  };

  it('exposes every wallet API method on the Bitcoin wallet channel', () => {
    const subscription = connect();

    const props = getExposedProperties();
    expect(props.baseChannel).toBe(BITCOIN_WALLET_API_CHANNEL);
    expect(Object.keys(props.properties)).toEqual(WalletApiMethodNames);
    for (const method of Object.values(props.properties)) {
      expect(method.propType).toBe(
        RemoteApiPropertyType.MethodReturningPromise,
      );
    }

    subscription.unsubscribe();
  });

  it('gives getNetwork an unlock-only validate without a transform', async () => {
    const subscription = connect();

    const { requestOptions } = getExposedProperties().properties.getNetwork;
    expect(requestOptions.transform).toBeUndefined();
    await expect(
      requestOptions.validate?.(
        { method: 'getNetwork', args: [] },
        createSender('https://unauthorized.com'),
      ),
    ).resolves.toBeUndefined();

    subscription.unsubscribe();
  });

  it('rejects getNetwork validation with Refused when the wallet is locked', async () => {
    const subscription = connect({ isUnlocked$: of(false) });

    const { requestOptions } = getExposedProperties().properties.getNetwork;
    await expect(
      requestOptions.validate?.(
        { method: 'getNetwork', args: [] },
        createSender(AUTHORIZED_ORIGIN),
      ),
    ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.Refused });

    subscription.unsubscribe();
  });

  it('validates origin authorization on every method except getNetwork', async () => {
    const subscription = connect();

    const { properties } = getExposedProperties();
    for (const methodName of WalletApiMethodNames.filter(
      name => name !== 'getNetwork',
    )) {
      const { requestOptions } = properties[methodName];
      await expect(
        requestOptions.validate?.(
          { method: methodName, args: [] },
          createSender('https://unauthorized.com'),
        ),
      ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.Refused });
      await expect(
        requestOptions.validate?.(
          { method: methodName, args: [] },
          createSender(AUTHORIZED_ORIGIN),
        ),
      ).resolves.toBeUndefined();
    }

    subscription.unsubscribe();
  });

  it('appends the sender to the arguments of authorized methods', () => {
    const subscription = connect();

    const sender = createSender(AUTHORIZED_ORIGIN);
    const { requestOptions } = getExposedProperties().properties.getAccounts;

    expect(
      requestOptions.transform?.({ method: 'getAccounts', args: [] }, sender),
    ).toEqual({ method: 'getAccounts', args: [{ sender }] });
    expect(() =>
      requestOptions.transform?.({ method: 'getAccounts', args: [] }),
    ).toThrow('Unknown sender');

    subscription.unsubscribe();
  });

  it('drops a spoofed trailing sender context on getAccounts and serves the real origin', async () => {
    const subscription = connect();

    const sender = createSender(AUTHORIZED_ORIGIN);
    const spoofed = { sender: createSender(OTHER_ORIGIN) };
    const props = getExposedProperties();
    const walletApi = await firstValueFrom(props.api$);

    const transformed = props.properties.getAccounts.requestOptions.transform?.(
      { method: 'getAccounts', args: [spoofed] },
      sender,
    );

    expect(transformed).toEqual({ method: 'getAccounts', args: [{ sender }] });
    await expect(
      walletApi.getAccounts(...(transformed?.args ?? [])),
    ).resolves.toEqual([ACCOUNT_ADDRESS]);

    subscription.unsubscribe();
  });

  it('drops a spoofed trailing sender context on signPsbt and confirms with the real dApp', async () => {
    const requests: BitcoinConfirmationRequest[] = [];
    const signPsbt = vi.fn(async () => VALID_PSBT_BASE64);
    const subscription = connect({
      signPsbt,
      handleRequests: (request$: Observable<BitcoinConfirmationRequest>) =>
        request$.pipe(
          tap(request => {
            requests.push(request);
            request.resolve({ isConfirmed: true });
          }),
          map(() => 'handled'),
        ),
    });

    const sender = createSender(AUTHORIZED_ORIGIN);
    const spoofed = { sender: createSender(OTHER_ORIGIN) };
    const props = getExposedProperties();
    const walletApi = await firstValueFrom(props.api$);

    const transformed = props.properties.signPsbt.requestOptions.transform?.(
      { method: 'signPsbt', args: [VALID_PSBT_HEX, undefined, spoofed] },
      sender,
    );

    expect(transformed).toEqual({
      method: 'signPsbt',
      args: [VALID_PSBT_HEX, undefined, { sender }],
    });
    await expect(
      walletApi.signPsbt(...(transformed?.args ?? [])),
    ).resolves.toBe(VALID_PSBT_HEX);
    expect(requests).toHaveLength(1);
    expect(requests[0].requestingDapp.origin).toBe(AUTHORIZED_ORIGIN);
    expect(signPsbt).toHaveBeenCalledWith(
      VALID_PSBT_BASE64,
      ACCOUNT_ID,
      undefined,
    );

    subscription.unsubscribe();
  });

  it('shuts down the exposed API and the confirmation callback on teardown', () => {
    const shutdown = vi.fn();
    vi.mocked(exposeApi).mockReturnValue({
      shutdown,
    } as unknown as ReturnType<typeof exposeApi>);
    const teardownSpy = vi.fn();
    const subscription = connect({
      handleRequests: () => new Observable<never>(() => teardownSpy),
    });

    subscription.unsubscribe();

    expect(shutdown).toHaveBeenCalled();
    expect(teardownSpy).toHaveBeenCalled();
  });
});
