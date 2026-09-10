import {
  BITCOIN_TOKEN_ID,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../../../src/api-error';
import { BitcoinDappConnectorApi } from '../../../src/store/dependencies/bitcoin-dapp-connector-api';

import type {
  BitcoinDappConnectorApiDependencies,
  BitcoinDappConnectorProvider,
} from '../../../src/store/dependencies/bitcoin-dapp-connector-api';
import type { BitcoinConfirmationCallback } from '../../../src/store/dependencies/create-confirmation-callback';
import type { SenderContext, SignPsbtOptions } from '../../../src/types';
import type { ProviderError } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';
import type { Token } from '@lace-contract/tokens';
import type { Runtime } from 'webextension-polyfill';

const TEST_DAPP_ORIGIN = 'https://test-dapp.com';
const ACCOUNT_ID = AccountId('account-1');
const OTHER_ACCOUNT_ID = AccountId('account-2');
const ACCOUNT_ADDRESS = 'bc1qaccountaddress1';
const SECOND_ACCOUNT_ADDRESS = 'bc1qaccountaddress2';
const VALID_PSBT_BASE64 = 'cHNidP8BAAoAAAAAAAAAAAAA';
const VALID_PSBT_HEX = Buffer.from(VALID_PSBT_BASE64, 'base64').toString('hex');

/** signPsbt speaks hex at the dApp boundary; the wallet works in base64. */
const asPsbtHex = (psbtBase64: string): string =>
  Buffer.from(psbtBase64, 'base64').toString('hex');

const network = bitcoin.networks.bitcoin;
const accountPayment = bitcoin.payments.p2wpkh({
  hash: Buffer.alloc(20, 1),
  network,
});
const foreignPayment = bitcoin.payments.p2wpkh({
  hash: Buffer.alloc(20, 2),
  network,
});
const PREVIOUS_TXID = 'ab'.repeat(32);

/**
 * Builds a PSBT spending one previous output per given script, paying the
 * account. An undefined script leaves that input without a previous output, so
 * no signer could ever sign it. A sighashType, when given, is the one every
 * input requests.
 */
const buildPsbt = (
  inputScripts: (Buffer | undefined)[],
  sighashType?: number,
): string => {
  const psbt = new bitcoin.Psbt({ network });
  inputScripts.forEach((script, index) => {
    psbt.addInput({
      hash: PREVIOUS_TXID,
      index,
      ...(script ? { witnessUtxo: { script, value: 50_000 } } : {}),
      ...(sighashType === undefined ? {} : { sighashType }),
    });
  });
  psbt.addOutput({ address: accountPayment.address!, value: 40_000 });
  return psbt.toBase64();
};

/**
 * Builds a PSBT whose input embeds a previous transaction that does not hash to
 * the outpoint it claims to spend. Its value cannot be trusted, so the input
 * counts as carrying no previous output even though the PSBT looks
 * self-contained.
 */
const buildPsbtWithMismatchedPreviousTx = (): string => {
  const previousTx = new bitcoin.Transaction();
  previousTx.version = 2;
  previousTx.addInput(Buffer.alloc(32, 0), 0);
  previousTx.addOutput(foreignPayment.output!, 50_000);

  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({
    hash: PREVIOUS_TXID,
    index: 0,
    nonWitnessUtxo: previousTx.toBuffer(),
  });
  psbt.addOutput({ address: accountPayment.address!, value: 40_000 });
  return psbt.toBase64();
};

const createMockSenderContext = (
  origin: string = TEST_DAPP_ORIGIN,
): SenderContext => ({
  sender: {
    url: `${origin}/app`,
    tab: { title: 'Test DApp', favIconUrl: `${origin}/favicon.ico` },
  } as Runtime.MessageSender,
});

const createMockAddress = (
  address: string,
  accountId: AccountId,
  blockchainName = 'Bitcoin',
): AnyAddress =>
  ({ address, accountId, blockchainName } as unknown as AnyAddress);

const createMockUtxo = (overrides: Partial<BitcoinUTxO> = {}): BitcoinUTxO => ({
  txId: 'a'.repeat(64),
  index: 0,
  satoshis: 10_000,
  address: ACCOUNT_ADDRESS,
  script: '0014aabbccdd',
  confirmations: 1,
  height: 100,
  runes: [],
  inscriptions: [],
  ...overrides,
});

const createDependencies = (
  overrides: Partial<BitcoinDappConnectorApiDependencies> = {},
): BitcoinDappConnectorApiDependencies => ({
  addresses$: of([
    createMockAddress(ACCOUNT_ADDRESS, ACCOUNT_ID),
    createMockAddress(SECOND_ACCOUNT_ADDRESS, ACCOUNT_ID),
    createMockAddress('bc1qotheraccount', OTHER_ACCOUNT_ID),
    createMockAddress('addr1cardano', ACCOUNT_ID, 'Cardano'),
  ]),
  accountUtxos$: of({ [ACCOUNT_ID]: [createMockUtxo()] }),
  accountTokens$: of<Record<string, { fungible: Token[]; nfts: Token[] }>>({
    [ACCOUNT_ID]: {
      fungible: [
        {
          tokenId: BITCOIN_TOKEN_ID,
          available: BigNumber(120_000n),
          pending: BigNumber(30_000n),
        } as unknown as Token,
      ],
      nfts: [],
    },
  }),
  activeNetworkId$: of(BitcoinNetworkId('mainnet')),
  bitcoinProvider: {
    getUTxOs: vi.fn(() => of(Ok({ items: [], cursor: '' }))),
    submitTransaction: vi.fn(() => of(Ok('txid'))),
  } as unknown as BitcoinDappConnectorProvider,
  getAccountIdForOrigin: vi.fn(origin =>
    origin === TEST_DAPP_ORIGIN ? ACCOUNT_ID : undefined,
  ),
  userConfirmationRequest: vi.fn(async () => ({
    isConfirmed: true,
  })) as unknown as BitcoinConfirmationCallback,
  signMessage: vi.fn(async () => 'deadbeef'),
  signPsbt: vi.fn(async (psbtBase64: string) => psbtBase64),
  buildSendTx: vi.fn(async () => ({
    psbtBase64: VALID_PSBT_BASE64,
    serializedTx: 'built-serialized-tx',
    netSatoshis: -6000,
  })),
  confirmSendTx: vi.fn(async () => 'sent-txid'),
  submitRawTx: vi.fn(async () => 'broadcast-txid'),
  ...overrides,
});

const createApi = (
  overrides: Partial<BitcoinDappConnectorApiDependencies> = {},
) => {
  const dependencies = createDependencies(overrides);
  return { api: new BitcoinDappConnectorApi(dependencies), dependencies };
};

const expectApiError = async (
  promise: Promise<unknown>,
  code: BitcoinAPIErrorCode,
  messagePart?: string,
) => {
  const error = await promise.then(
    () => {
      throw new Error('Expected the call to reject');
    },
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BitcoinAPIError);
  expect((error as BitcoinAPIError).code).toBe(code);
  if (messagePart) {
    expect((error as BitcoinAPIError).message).toContain(messagePart);
  }
};

describe('BitcoinDappConnectorApi', () => {
  describe('getAccounts', () => {
    it('returns the Bitcoin addresses of the account bound to the origin', async () => {
      const { api } = createApi();

      const accounts = await api.getAccounts(createMockSenderContext());

      expect(accounts).toEqual([ACCOUNT_ADDRESS, SECOND_ACCOUNT_ADDRESS]);
    });

    it('rejects with InternalError when no session account exists for the origin', async () => {
      const { api } = createApi();

      await expectApiError(
        api.getAccounts(createMockSenderContext('https://unauthorized.com')),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
    });

    it('rejects with InternalError when the sender context is missing', async () => {
      const { api } = createApi();

      await expectApiError(
        api.getAccounts({ sender: undefined } as unknown as SenderContext),
        BitcoinAPIErrorCode.InternalError,
        'Missing sender context',
      );
    });

    it('rejects with InternalError when the sender has no resolvable origin', async () => {
      const { api } = createApi();

      await expectApiError(
        api.getAccounts({ sender: {} as Runtime.MessageSender }),
        BitcoinAPIErrorCode.InternalError,
        'Could not determine dApp origin',
      );
    });
  });

  describe('getNetwork', () => {
    it('returns mainnet for the mainnet network id without a sender', async () => {
      const { api } = createApi();

      await expect(api.getNetwork()).resolves.toBe('mainnet');
    });

    it('returns testnet for the testnet network id', async () => {
      const { api } = createApi({
        activeNetworkId$: of(BitcoinNetworkId('testnet4')),
      });

      await expect(api.getNetwork()).resolves.toBe('testnet');
    });

    it('rejects with InternalError when no Bitcoin network is active', async () => {
      const { api } = createApi({ activeNetworkId$: of(undefined) });

      await expectApiError(
        api.getNetwork(),
        BitcoinAPIErrorCode.InternalError,
        'No active Bitcoin network',
      );
    });
  });

  describe('getBalance', () => {
    const tokensFor = (available: bigint, pending: bigint) =>
      of<Record<string, { fungible: Token[]; nfts: Token[] }>>({
        [ACCOUNT_ID]: {
          fungible: [
            {
              tokenId: BITCOIN_TOKEN_ID,
              available: BigNumber(available),
              pending: BigNumber(pending),
            } as unknown as Token,
          ],
          nfts: [],
        },
      });

    it('reports the wallet balance split into confirmed and pending', async () => {
      const { api } = createApi({
        accountTokens$: tokensFor(11_000n, 5000n),
      });

      await expect(api.getBalance(createMockSenderContext())).resolves.toEqual({
        confirmed: 11000,
        unconfirmed: 5000,
        total: 16000,
      });
    });

    it('reports zero unconfirmed when the account has nothing pending', async () => {
      const { api } = createApi({ accountTokens$: tokensFor(7000n, 0n) });

      await expect(api.getBalance(createMockSenderContext())).resolves.toEqual({
        confirmed: 7000,
        unconfirmed: 0,
        total: 7000,
      });
    });

    it('returns zero balances when the account has no Bitcoin token yet', async () => {
      const { api } = createApi({
        accountTokens$: of<
          Record<string, { fungible: Token[]; nfts: Token[] }>
        >({}),
      });

      await expect(api.getBalance(createMockSenderContext())).resolves.toEqual({
        confirmed: 0,
        unconfirmed: 0,
        total: 0,
      });
    });

    it('rejects with InternalError when no session account exists', async () => {
      const { api } = createApi();

      await expectApiError(
        api.getBalance(createMockSenderContext('https://unauthorized.com')),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
    });
  });

  describe('getUtxos', () => {
    it('maps the account UTXO set to the Unisat shape', async () => {
      const { api } = createApi({
        accountUtxos$: of({
          [ACCOUNT_ID]: [
            createMockUtxo({
              txId: 'b'.repeat(64),
              index: 3,
              satoshis: 42,
              script: '0014ffee',
              address: ACCOUNT_ADDRESS,
            }),
          ],
        }),
      });

      await expect(api.getUtxos(createMockSenderContext())).resolves.toEqual([
        {
          txid: 'b'.repeat(64),
          vout: 3,
          satoshis: 42,
          scriptPk: '0014ffee',
          address: ACCOUNT_ADDRESS,
        },
      ]);
    });

    it('falls back to the provider when the account is not in the UTXO map', async () => {
      const getUTxOs = vi.fn((_context, address: string) =>
        of(
          Ok({
            items: [createMockUtxo({ address, satoshis: 11 })],
            cursor: '',
          }),
        ),
      );
      const { api } = createApi({
        accountUtxos$: of({}),
        bitcoinProvider: {
          getUTxOs,
          submitTransaction: vi.fn(),
        } as unknown as BitcoinDappConnectorProvider,
      });

      const utxos = await api.getUtxos(createMockSenderContext());

      expect(getUTxOs).toHaveBeenCalledTimes(2);
      expect(getUTxOs).toHaveBeenCalledWith(
        { network: 'mainnet' },
        ACCOUNT_ADDRESS,
        {},
      );
      expect(getUTxOs).toHaveBeenCalledWith(
        { network: 'mainnet' },
        SECOND_ACCOUNT_ADDRESS,
        {},
      );
      expect(utxos.map(utxo => utxo.address)).toEqual([
        ACCOUNT_ADDRESS,
        SECOND_ACCOUNT_ADDRESS,
      ]);
    });

    it('rejects with InternalError when the provider returns a non-integer satoshi amount', async () => {
      const { api } = createApi({
        accountUtxos$: of({}),
        bitcoinProvider: {
          getUTxOs: vi.fn(() =>
            of(Ok({ items: [createMockUtxo({ satoshis: 1.5 })], cursor: '' })),
          ),
          submitTransaction: vi.fn(),
        } as unknown as BitcoinDappConnectorProvider,
      });

      await expectApiError(
        api.getUtxos(createMockSenderContext()),
        BitcoinAPIErrorCode.InternalError,
        'invalid satoshi amount',
      );
    });

    it('rejects with InternalError when the provider fallback fails', async () => {
      const { api } = createApi({
        accountUtxos$: of({}),
        bitcoinProvider: {
          getUTxOs: vi.fn(() =>
            of(Err({ reason: 'provider down' } as unknown as ProviderError)),
          ),
          submitTransaction: vi.fn(),
        } as unknown as BitcoinDappConnectorProvider,
      });

      await expectApiError(
        api.getUtxos(createMockSenderContext()),
        BitcoinAPIErrorCode.InternalError,
        'Failed to fetch UTXOs',
      );
    });

    it('rejects with InternalError when no session account exists for the origin', async () => {
      const { api } = createApi();

      await expectApiError(
        api.getUtxos(createMockSenderContext('https://unauthorized.com')),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
    });
  });

  describe('signMessage', () => {
    it('confirms with the account address and returns the signature as base64', async () => {
      const signMessage = vi.fn(async () => 'deadbeef');
      const { api, dependencies } = createApi({ signMessage });
      const context = createMockSenderContext();

      const signature = await api.signMessage('hello', 'ecdsa', context);

      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        context.sender,
        'signMessage',
        { address: ACCOUNT_ADDRESS, message: 'hello', signatureType: 'ecdsa' },
      );
      expect(signMessage).toHaveBeenCalledWith({
        address: ACCOUNT_ADDRESS,
        message: 'hello',
        signatureType: 'ecdsa',
      });
      expect(signature).toBe(Buffer.from('deadbeef', 'hex').toString('base64'));
      expect(Buffer.from(signature, 'base64').toString('hex')).toBe('deadbeef');
    });

    it('defaults the signature type to ecdsa when the dApp omits it', async () => {
      const { api, dependencies } = createApi();
      const context = createMockSenderContext();

      await api.signMessage('hello', context);

      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        context.sender,
        'signMessage',
        { address: ACCOUNT_ADDRESS, message: 'hello', signatureType: 'ecdsa' },
      );
    });

    it('passes bip322-simple through to the confirmation and the signer', async () => {
      const { api, dependencies } = createApi();
      const context = createMockSenderContext();

      await api.signMessage('hello', 'bip322-simple', context);

      expect(dependencies.signMessage).toHaveBeenCalledWith({
        address: ACCOUNT_ADDRESS,
        message: 'hello',
        signatureType: 'bip322-simple',
      });
    });

    it('rejects with Refused when the user declines and never calls the signer', async () => {
      const signMessage = vi.fn();
      const { api } = createApi({
        signMessage,
        userConfirmationRequest: vi.fn(async () => ({
          isConfirmed: false,
        })) as unknown as BitcoinConfirmationCallback,
      });

      await expectApiError(
        api.signMessage('hello', createMockSenderContext()),
        BitcoinAPIErrorCode.Refused,
        'User rejected message signing',
      );
      expect(signMessage).not.toHaveBeenCalled();
    });

    it('propagates signer errors', async () => {
      const { api } = createApi({
        signMessage: vi.fn(async () => {
          throw new Error('device disconnected');
        }),
      });

      await expect(
        api.signMessage('hello', createMockSenderContext()),
      ).rejects.toThrow('device disconnected');
    });

    it('rejects with InternalError when the signer returns non-hex output', async () => {
      const { api } = createApi({
        signMessage: vi.fn(async () => 'not-hex!'),
      });

      await expectApiError(
        api.signMessage('hello', createMockSenderContext()),
        BitcoinAPIErrorCode.InternalError,
        'not valid hex',
      );
    });

    it('rejects with InternalError when the account has no addresses', async () => {
      const { api, dependencies } = createApi({ addresses$: of([]) });

      await expectApiError(
        api.signMessage('hello', createMockSenderContext()),
        BitcoinAPIErrorCode.InternalError,
        'No addresses available',
      );
      expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
    });

    it('rejects with InternalError when no session account exists', async () => {
      const { api, dependencies } = createApi();

      await expectApiError(
        api.signMessage(
          'hello',
          createMockSenderContext('https://unauthorized.com'),
        ),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
      expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
    });

    it('rejects with InternalError when no sender context is appended', async () => {
      const { api } = createApi();

      await expectApiError(
        api.signMessage('hello'),
        BitcoinAPIErrorCode.InternalError,
        'Missing sender context',
      );
    });
  });

  describe('signPsbt', () => {
    it('confirms and returns the delegate result', async () => {
      const { api, dependencies } = createApi();
      const context = createMockSenderContext();
      const options = { toSignInputs: [{ index: 0 }] };

      const signed = await api.signPsbt(VALID_PSBT_HEX, options, context);

      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        context.sender,
        'signPsbt',
        { psbtsBase64: [VALID_PSBT_BASE64], accountId: ACCOUNT_ID, options },
      );
      expect(dependencies.signPsbt).toHaveBeenCalledWith(
        VALID_PSBT_BASE64,
        ACCOUNT_ID,
        options,
      );
      expect(signed).toBe(VALID_PSBT_HEX);
    });

    it('signs with undefined options when the dApp omits them', async () => {
      const { api, dependencies } = createApi();

      await api.signPsbt(VALID_PSBT_HEX, createMockSenderContext());

      expect(dependencies.signPsbt).toHaveBeenCalledWith(
        VALID_PSBT_BASE64,
        ACCOUNT_ID,
        undefined,
      );
    });

    it('keeps the trusted trailing sender when the dApp passes a sender-shaped options object', async () => {
      const { api, dependencies } = createApi();
      const context = createMockSenderContext();
      const spoofed = createMockSenderContext('https://attacker.com');

      await api.signPsbt(VALID_PSBT_HEX, spoofed, context);

      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        context.sender,
        'signPsbt',
        {
          psbtsBase64: [VALID_PSBT_BASE64],
          accountId: ACCOUNT_ID,
          options: undefined,
        },
      );
      expect(dependencies.signPsbt).toHaveBeenCalledWith(
        VALID_PSBT_BASE64,
        ACCOUNT_ID,
        undefined,
      );
    });

    it('treats an options object with an undefined sender field as options', async () => {
      const { api, dependencies } = createApi();
      const context = createMockSenderContext();
      const options = {
        sender: undefined,
        autoFinalized: true,
      } as unknown as SignPsbtOptions;

      await api.signPsbt(VALID_PSBT_HEX, options, context);

      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        context.sender,
        'signPsbt',
        { psbtsBase64: [VALID_PSBT_BASE64], accountId: ACCOUNT_ID, options },
      );
      expect(dependencies.signPsbt).toHaveBeenCalledWith(
        VALID_PSBT_BASE64,
        ACCOUNT_ID,
        options,
      );
    });

    it('rejects a non-hex PSBT with InvalidRequest before confirming', async () => {
      const { api, dependencies } = createApi();

      await expectApiError(
        api.signPsbt('not base64!!', createMockSenderContext()),
        BitcoinAPIErrorCode.InvalidRequest,
        'Invalid hex-encoded PSBT',
      );
      expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
    });

    it('rejects autoFinalized: false with InvalidRequest before confirming', async () => {
      const { api, dependencies } = createApi();

      await expectApiError(
        api.signPsbt(
          VALID_PSBT_HEX,
          { autoFinalized: false } as SignPsbtOptions,
          createMockSenderContext(),
        ),
        BitcoinAPIErrorCode.InvalidRequest,
        'autoFinalized: false',
      );
      expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
      expect(dependencies.signPsbt).not.toHaveBeenCalled();
    });

    it('rejects with Refused when the user declines and never signs', async () => {
      const { api, dependencies } = createApi({
        userConfirmationRequest: vi.fn(async () => ({
          isConfirmed: false,
        })) as unknown as BitcoinConfirmationCallback,
      });

      await expectApiError(
        api.signPsbt(VALID_PSBT_HEX, createMockSenderContext()),
        BitcoinAPIErrorCode.Refused,
        'User rejected PSBT signing',
      );
      expect(dependencies.signPsbt).not.toHaveBeenCalled();
    });

    it('propagates signer errors', async () => {
      const { api } = createApi({
        signPsbt: vi.fn(async () => {
          throw new Error('signing failed');
        }),
      });

      await expect(
        api.signPsbt(VALID_PSBT_HEX, createMockSenderContext()),
      ).rejects.toThrow('signing failed');
    });

    it('rejects with InternalError when no session account exists', async () => {
      const { api } = createApi();

      await expectApiError(
        api.signPsbt(
          VALID_PSBT_HEX,
          createMockSenderContext('https://unauthorized.com'),
        ),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
    });

    describe('unsignable inputs', () => {
      const psbtDependencies = {
        addresses$: of([
          createMockAddress(accountPayment.address!, ACCOUNT_ID),
          createMockAddress(foreignPayment.address!, OTHER_ACCOUNT_ID),
        ]),
      };

      it('refuses an input spending an address outside the connected account before the review opens', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([
          accountPayment.output,
          foreignPayment.output,
        ]);

        await expectApiError(
          api.signPsbt(asPsbtHex(psbtBase64), createMockSenderContext()),
          BitcoinAPIErrorCode.InvalidRequest,
          'Cannot sign input(s) 1',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
        expect(dependencies.signPsbt).not.toHaveBeenCalled();
      });

      it('refuses a toSignInputs index the connected account does not own before the review opens', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([
          accountPayment.output,
          foreignPayment.output,
        ]);

        await expectApiError(
          api.signPsbt(
            asPsbtHex(psbtBase64),
            { toSignInputs: [{ index: 1 }] },
            createMockSenderContext(),
          ),
          BitcoinAPIErrorCode.InvalidRequest,
          'Cannot sign input(s) 1',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
      });

      it('refuses an input whose previous output the PSBT does not embed before the review opens', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([accountPayment.output, undefined]);

        await expectApiError(
          api.signPsbt(asPsbtHex(psbtBase64), createMockSenderContext()),
          BitcoinAPIErrorCode.InvalidRequest,
          'Cannot sign input(s) 1: the PSBT does not include the previous output they spend',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
        expect(dependencies.signPsbt).not.toHaveBeenCalled();
      });

      it('refuses an input whose embedded previous transaction does not hash to its outpoint before the review opens', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbtWithMismatchedPreviousTx();

        await expectApiError(
          api.signPsbt(asPsbtHex(psbtBase64), createMockSenderContext()),
          BitcoinAPIErrorCode.InvalidRequest,
          'Cannot sign input(s) 0: the PSBT does not include the previous output they spend',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
        expect(dependencies.signPsbt).not.toHaveBeenCalled();
      });

      it('refuses a toSignInputs selection that leaves an input unsigned before the review opens', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([
          accountPayment.output,
          accountPayment.output,
        ]);

        await expectApiError(
          api.signPsbt(
            asPsbtHex(psbtBase64),
            { toSignInputs: [{ index: 0 }] },
            createMockSenderContext(),
          ),
          BitcoinAPIErrorCode.InvalidRequest,
          'toSignInputs must cover every input',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
        expect(dependencies.signPsbt).not.toHaveBeenCalled();
      });

      it('opens the review for a toSignInputs selection that covers every input', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([
          accountPayment.output,
          accountPayment.output,
        ]);

        await api.signPsbt(
          asPsbtHex(psbtBase64),
          { toSignInputs: [{ index: 0 }, { index: 1 }] },
          createMockSenderContext(),
        );

        expect(dependencies.userConfirmationRequest).toHaveBeenCalled();
        expect(dependencies.signPsbt).toHaveBeenCalled();
      });

      it('rejects with InternalError when the connected account has no addresses to judge ownership by', async () => {
        const { api, dependencies } = createApi({ addresses$: of([]) });

        await expectApiError(
          api.signPsbt(
            asPsbtHex(buildPsbt([accountPayment.output])),
            createMockSenderContext(),
          ),
          BitcoinAPIErrorCode.InternalError,
          'No addresses available for the connected account',
        );
        expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
      });

      it('opens the review when every input spends an account address', async () => {
        const { api, dependencies } = createApi(psbtDependencies);
        const psbtBase64 = buildPsbt([accountPayment.output]);

        await api.signPsbt(asPsbtHex(psbtBase64), createMockSenderContext());

        expect(dependencies.userConfirmationRequest).toHaveBeenCalled();
        expect(dependencies.signPsbt).toHaveBeenCalled();
      });

      describe('non-default sighash', () => {
        it.each([
          ['SIGHASH_NONE', bitcoin.Transaction.SIGHASH_NONE],
          ['SIGHASH_SINGLE', bitcoin.Transaction.SIGHASH_SINGLE],
          [
            'SIGHASH_ALL | SIGHASH_ANYONECANPAY',
            bitcoin.Transaction.SIGHASH_ALL |
              bitcoin.Transaction.SIGHASH_ANYONECANPAY,
          ],
        ])(
          'refuses an input requesting %s before the review opens',
          async (_name, sighashType) => {
            const { api, dependencies } = createApi(psbtDependencies);

            await expectApiError(
              api.signPsbt(
                asPsbtHex(buildPsbt([accountPayment.output], sighashType)),
                createMockSenderContext(),
              ),
              BitcoinAPIErrorCode.InvalidRequest,
              'Cannot sign input(s) 0: only SIGHASH_ALL is supported',
            );
            expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
            expect(dependencies.signPsbt).not.toHaveBeenCalled();
          },
        );

        it('refuses a toSignInputs entry that allows a sighash other than SIGHASH_ALL', async () => {
          const { api, dependencies } = createApi(psbtDependencies);

          await expectApiError(
            api.signPsbt(
              asPsbtHex(buildPsbt([accountPayment.output])),
              {
                toSignInputs: [
                  {
                    index: 0,
                    sighashTypes: [
                      bitcoin.Transaction.SIGHASH_ALL,
                      bitcoin.Transaction.SIGHASH_SINGLE,
                    ],
                  },
                ],
              },
              createMockSenderContext(),
            ),
            BitcoinAPIErrorCode.InvalidRequest,
            'Cannot sign input(s) 0: only SIGHASH_ALL is supported',
          );
          expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
          expect(dependencies.signPsbt).not.toHaveBeenCalled();
        });

        it('opens the review for a PSBT that requests SIGHASH_ALL explicitly', async () => {
          const { api, dependencies } = createApi(psbtDependencies);
          const psbtBase64 = buildPsbt(
            [accountPayment.output],
            bitcoin.Transaction.SIGHASH_ALL,
          );

          await api.signPsbt(
            asPsbtHex(psbtBase64),
            {
              toSignInputs: [
                { index: 0, sighashTypes: [bitcoin.Transaction.SIGHASH_ALL] },
              ],
            },
            createMockSenderContext(),
          );

          expect(dependencies.userConfirmationRequest).toHaveBeenCalled();
          expect(dependencies.signPsbt).toHaveBeenCalled();
        });
      });
    });
  });

  describe('sendBitcoin', () => {
    it('builds, reviews, then confirms and returns the txid', async () => {
      const { api, dependencies } = createApi();
      const options = { feeRate: 5 };

      const txid = await api.sendBitcoin(
        'bc1qrecipient',
        1234,
        options,
        createMockSenderContext(),
      );

      expect(dependencies.buildSendTx).toHaveBeenCalledWith(
        'bc1qrecipient',
        1234,
        { accountId: ACCOUNT_ID, feeRate: 5 },
      );
      expect(dependencies.userConfirmationRequest).toHaveBeenCalledWith(
        expect.anything(),
        'signPsbt',
        { psbtsBase64: [VALID_PSBT_BASE64], accountId: ACCOUNT_ID },
      );
      expect(dependencies.confirmSendTx).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        serializedTx: 'built-serialized-tx',
        netSatoshis: -6000,
      });
      expect(txid).toBe('sent-txid');
    });

    it('confirms without a net effect when the build could not derive one', async () => {
      const { api, dependencies } = createApi({
        buildSendTx: vi.fn(async () => ({
          psbtBase64: VALID_PSBT_BASE64,
          serializedTx: 'built-serialized-tx',
        })),
      });

      await api.sendBitcoin('bc1qrecipient', 1234, createMockSenderContext());

      expect(dependencies.confirmSendTx).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        serializedTx: 'built-serialized-tx',
        netSatoshis: undefined,
      });
    });

    it('builds with only the account id when the dApp omits options', async () => {
      const { api, dependencies } = createApi();

      await api.sendBitcoin('bc1qrecipient', 1234, createMockSenderContext());

      expect(dependencies.buildSendTx).toHaveBeenCalledWith(
        'bc1qrecipient',
        1234,
        { accountId: ACCOUNT_ID },
      );
    });

    it('rejects with Refused and never confirms when the user declines', async () => {
      const { api, dependencies } = createApi({
        userConfirmationRequest: vi.fn(async () => ({
          isConfirmed: false,
        })) as unknown as BitcoinConfirmationCallback,
      });

      await expectApiError(
        api.sendBitcoin('bc1qrecipient', 1234, createMockSenderContext()),
        BitcoinAPIErrorCode.Refused,
        'User rejected the transaction',
      );
      expect(dependencies.confirmSendTx).not.toHaveBeenCalled();
    });

    it('rejects with InternalError when no session account exists', async () => {
      const { api, dependencies } = createApi();

      await expectApiError(
        api.sendBitcoin(
          'bc1qrecipient',
          1234,
          createMockSenderContext('https://unauthorized.com'),
        ),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
      expect(dependencies.buildSendTx).not.toHaveBeenCalled();
    });

    it('propagates errors from the build step', async () => {
      const { api } = createApi({
        buildSendTx: vi.fn(async () => {
          throw new Error('insufficient funds');
        }),
      });

      await expect(
        api.sendBitcoin('bc1qrecipient', 1234, createMockSenderContext()),
      ).rejects.toThrow('insufficient funds');
    });
  });

  describe('pushTx', () => {
    it('broadcasts through the transaction executor so the tx lands in pending', async () => {
      const { api, dependencies } = createApi();

      const txid = await api.pushTx('deadbeef', createMockSenderContext());

      expect(dependencies.submitRawTx).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        rawTxHex: 'deadbeef',
      });
      expect(dependencies.userConfirmationRequest).not.toHaveBeenCalled();
      expect(txid).toBe('broadcast-txid');
    });

    it.each(['', 'xyz', 'abc'])(
      'rejects malformed hex "%s" with InvalidRequest',
      async rawTxHex => {
        const { api, dependencies } = createApi();

        await expectApiError(
          api.pushTx(rawTxHex, createMockSenderContext()),
          BitcoinAPIErrorCode.InvalidRequest,
          'Invalid hex-encoded transaction',
        );
        expect(
          dependencies.bitcoinProvider.submitTransaction,
        ).not.toHaveBeenCalled();
      },
    );

    it('propagates a failed submission from the executor', async () => {
      const { api } = createApi({
        submitRawTx: vi.fn(async () => {
          throw new BitcoinAPIError(
            BitcoinAPIErrorCode.InternalError,
            'Transaction submission failed',
          );
        }),
      });

      await expectApiError(
        api.pushTx('deadbeef', createMockSenderContext()),
        BitcoinAPIErrorCode.InternalError,
        'Transaction submission failed',
      );
    });

    it('rejects with InternalError when no session account exists', async () => {
      const { api } = createApi();

      await expectApiError(
        api.pushTx(
          'deadbeef',
          createMockSenderContext('https://unauthorized.com'),
        ),
        BitcoinAPIErrorCode.InternalError,
        'No account found for origin',
      );
    });
  });
});
