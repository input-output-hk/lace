import {
  convertHttpUrlToWebsocket,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import { networkId } from '@lace-contract/midnight-context/src/stub-data';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIError } from '../../src/api-error';
import { MidnightDappConnectorApi } from '../../src/store/dependencies/midnight-dapp-connector-api';

import type { MidnightDappConnectorApiOptions } from '../../src/store/dependencies/midnight-dapp-connector-api';
import type {
  MidnightWalletsByAccountId,
  MidnightNetworkConfig,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type {
  DesiredInput,
  DesiredOutput,
} from '@midnight-ntwrk/dapp-connector-api';

vi.mock('@midnight-ntwrk/wallet-sdk-address-format', () => ({
  MidnightBech32m: { parse: (address: string) => address },
  ShieldedAddress: {
    codec: { decode: (_networkId: string, address: string) => address },
  },
  ShieldedCoinPublicKey: {
    codec: {
      encode: () => ({
        asString: () => 'bech32m-shielded-coin-public-key',
      }),
    },
  },
  ShieldedEncryptionPublicKey: {
    codec: {
      encode: () => ({
        asString: () => 'bech32m-shielded-encryption-public-key',
      }),
    },
  },
  UnshieldedAddress: {
    codec: { decode: (_networkId: string, address: string) => address },
  },
}));

const mockWalletState = {
  shielded: {
    balances: { token1: 100n },
    address: {
      coinPublicKeyString: vi.fn().mockReturnValue('shielded-address'),
    },
    coinPublicKey: {
      toHexString: vi.fn().mockReturnValue('shielded-coin-public-key'),
    },
    encryptionPublicKey: {
      toHexString: vi.fn().mockReturnValue('shielded-encryption-public-key'),
    },
  },

  unshielded: {
    balances: {
      token2: 200n,
      [ledger.nativeToken().raw]: 1000n,
    },
  },

  dust: {
    balance: vi.fn().mockReturnValue(1000n),
    availableCoinsWithFullInfo: vi
      .fn()
      .mockReturnValue([{ maxCap: 5000000000000n }]),
  },
};

const mockNetworkConfig: MidnightNetworkConfig = {
  indexerAddress: 'http://test-indexer-uri',
  proofServerAddress: 'http://test-prover-uri',
  nodeAddress: 'http://test-substrate-uri',
};
const mockNetwork$ = of({ config: mockNetworkConfig, networkId });
const mockNetworkWithPreview$ = of({
  config: mockNetworkConfig,
  networkId: NetworkId.NetworkId.Preview,
});

const initialSupportedNetworkIds = MidnightSDKNetworkId.filter(
  id => id !== 'devnet' && id !== 'testnet',
);

const userConfirmation = vi.fn().mockResolvedValue({
  accessAuthSecret: vi.fn(),
  isConfirmed: true,
});

const optionsWithoutWallet: MidnightDappConnectorApiOptions = {
  wallets$: of({}),
  network$: mockNetwork$,
  userConfirmTransaction: userConfirmation,
  supportedNetworksIds$: of(initialSupportedNetworkIds),
  isUnlocked$: of(true),
};

describe('MidnightDappConnectorApi', () => {
  let mockWallet: MidnightWallet;
  let mockWallet$: Observable<MidnightWalletsByAccountId>;
  let optionsWithWallet: MidnightDappConnectorApiOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet = {
      accountId: 'test-account-id',
      networkId: NetworkId.NetworkId.Preview,
      state: vi.fn().mockReturnValue(of(mockWalletState)),
      address$: of({
        dust: 'dust-address',
        unshielded: 'unshielded-address',
        shielded: 'shielded-address',
      }),
    } as unknown as MidnightWallet;

    mockWallet$ = of({ [mockWallet.accountId]: mockWallet });

    optionsWithWallet = {
      ...optionsWithoutWallet,
      wallets$: mockWallet$,
    };
  });

  describe('getNetworkId', () => {
    it('should return network id', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getNetworkId();
      expect(result).toBe(NetworkId.NetworkId.Preview);
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getNetworkId()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getShieldedBalances', () => {
    it('should return shielded balances', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getShieldedBalances();
      expect(result).toEqual({ token1: 100n });
      expect(mockWallet.state).toHaveBeenCalled();
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getShieldedBalances()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getUnshieldedBalances', () => {
    it('should return unshielded balances', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getUnshieldedBalances();
      expect(result).toEqual({
        '0000000000000000000000000000000000000000000000000000000000000000':
          1000n,
        token2: 200n,
      });
      expect(mockWallet.state).toHaveBeenCalled();
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getUnshieldedBalances()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getDustBalance', () => {
    it('should return dust balance', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const result = await api.getDustBalance();
      expect(result).toEqual({
        balance: 1000n,
        cap: 5000000000000n,
      });
      expect(mockWallet.state).toHaveBeenCalled();
    });
  });

  describe('getShieldedAddresses', () => {
    it('should return shielded addresses in bech32m format', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getShieldedAddresses();
      expect(result).toEqual({
        shieldedAddress: 'shielded-address',
        shieldedCoinPublicKey: 'bech32m-shielded-coin-public-key',
        shieldedEncryptionPublicKey: 'bech32m-shielded-encryption-public-key',
      });
      expect(mockWallet.state).toHaveBeenCalled();
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getShieldedAddresses()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getUnshieldedAddress', () => {
    it('should return unshielded address', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getUnshieldedAddress();
      expect(result).toEqual({ unshieldedAddress: 'unshielded-address' });
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getUnshieldedAddress()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getDustAddress', () => {
    it('should return dust address', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getDustAddress();
      expect(result).toEqual({ dustAddress: 'dust-address' });
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getDustAddress()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status when wallet is available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getConnectionStatus();
      expect(result).toEqual({
        status: 'connected',
        networkId: NetworkId.NetworkId.Preview,
      });
    });

    it('should return disconnected status when wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      const result = await api.getConnectionStatus();
      expect(result).toEqual({ status: 'disconnected' });
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);
      const result = await api.getConfiguration();
      expect(result).toEqual({
        networkId: NetworkId.NetworkId.Preview,
        indexerUri: mockNetworkConfig.indexerAddress,
        indexerWsUri: convertHttpUrlToWebsocket(
          mockNetworkConfig.indexerAddress,
        ),
        proverServerUri: mockNetworkConfig.proofServerAddress,
        substrateNodeUri: mockNetworkConfig.nodeAddress,
      });
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);
      await expect(api.getConfiguration()).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });

    it('should throw error if network config is not available', async () => {
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        network$: of(undefined),
      });
      await expect(api.getConfiguration()).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'Network configuration is unavailable',
        ),
      );
    });
  });

  describe('submitTransaction', () => {
    it('should submit transaction successfully', async () => {
      const mockSerializedTx =
        '6d69646e696768743a7472616e73616374696f6e5b76365d287369676e61747572655b76315d2c70726f6f662c706564657273656e2d7363686e6f72725b76315d293a';
      const mockDeserializedTx = {} as unknown as ledger.Transaction<
        ledger.SignatureEnabled,
        ledger.Proof,
        ledger.Binding
      >;
      const mockSubmitTransaction = vi.fn().mockReturnValue(of(undefined));

      // Mock the Transaction.deserialize to return a mock transaction object
      vi.spyOn(ledger.Transaction, 'deserialize').mockResolvedValue(
        mockDeserializedTx,
      );

      mockWallet.submitTransaction = mockSubmitTransaction;

      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.submitTransaction(mockSerializedTx);

      expect(ledger.Transaction.deserialize).toHaveBeenCalledWith(
        'signature',
        'proof',
        'binding',
        Buffer.from(mockSerializedTx, 'hex'),
      );
      expect(mockSubmitTransaction).toHaveBeenCalledWith(mockDeserializedTx);
      expect(mockSubmitTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);

      await expect(api.submitTransaction('mock-transaction')).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });

    it('should propagate wallet submission errors', async () => {
      const mockError = new Error('Network submission failed');

      mockWallet.submitTransaction = vi.fn().mockReturnValue(
        new Observable(subscriber => {
          subscriber.error(mockError);
        }),
      );

      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await expect(api.submitTransaction('mock-transaction')).rejects.toThrow(
        mockError,
      );
    });
  });

  describe('makeIntent', () => {
    const mockSerializedTx = Buffer.from('mock-serialized-tx');
    const mockFinalizedTx = {
      serialize: vi.fn().mockReturnValue(mockSerializedTx),
    };
    const mockRecipe = { type: 'UNPROVEN_TRANSACTION' as const };

    const shieldedInputs: DesiredInput[] = [
      { kind: 'shielded', type: 'token-a', value: 1000n },
    ];

    const shieldedOutputs: DesiredOutput[] = [
      {
        kind: 'shielded',
        type: 'token-b',
        value: 500n,
        recipient: 'shielded-recipient-address',
      },
    ];

    const defaultOptions = { intentId: 'random' as const, payFees: true };

    beforeEach(() => {
      mockWallet.initSwap = vi.fn().mockReturnValue(of(mockRecipe));
      mockWallet.signRecipe = vi.fn().mockReturnValue(of(mockRecipe));
      mockWallet.finalizeRecipe = vi.fn().mockReturnValue(of(mockFinalizedTx));
    });

    it('should create intent transaction with shielded inputs and outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const result = await api.makeIntent(
        shieldedInputs,
        shieldedOutputs,
        defaultOptions,
      );

      expect(result.tx).toBe(mockSerializedTx.toString('hex'));
      expect(mockWallet.initSwap).toHaveBeenCalledWith(
        { shielded: { 'token-a': 1000n } },
        [
          {
            type: 'shielded',
            outputs: [
              {
                type: 'token-b',
                receiverAddress: 'shielded-recipient-address',
                amount: 500n,
              },
            ],
          },
        ],
        expect.objectContaining({ payFees: true }),
      );
      expect(mockWallet.signRecipe).not.toHaveBeenCalled();
      expect(mockWallet.finalizeRecipe).toHaveBeenCalledWith(mockRecipe);
    });

    it('should create intent transaction with unshielded inputs and outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const unshieldedInputs: DesiredInput[] = [
        { kind: 'unshielded', type: 'token-x', value: 2000n },
      ];
      const unshieldedOutputs: DesiredOutput[] = [
        {
          kind: 'unshielded',
          type: 'token-y',
          value: 1000n,
          recipient: 'unshielded-recipient-address',
        },
      ];

      await api.makeIntent(unshieldedInputs, unshieldedOutputs, defaultOptions);

      expect(mockWallet.initSwap).toHaveBeenCalledWith(
        { unshielded: { 'token-x': 2000n } },
        [
          {
            type: 'unshielded',
            outputs: [
              {
                type: 'token-y',
                receiverAddress: 'unshielded-recipient-address',
                amount: 1000n,
              },
            ],
          },
        ],
        expect.objectContaining({ payFees: true }),
      );
    });

    it('should create intent transaction with mixed inputs and outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const mixedInputs: DesiredInput[] = [
        { kind: 'shielded', type: 'token-a', value: 500n },
        { kind: 'unshielded', type: 'token-b', value: 300n },
      ];
      const mixedOutputs: DesiredOutput[] = [
        {
          kind: 'shielded',
          type: 'token-c',
          value: 200n,
          recipient: 'shielded-address',
        },
        {
          kind: 'unshielded',
          type: 'token-d',
          value: 100n,
          recipient: 'unshielded-address',
        },
      ];

      await api.makeIntent(mixedInputs, mixedOutputs, defaultOptions);

      expect(mockWallet.initSwap).toHaveBeenCalledWith(
        {
          shielded: { 'token-a': 500n },
          unshielded: { 'token-b': 300n },
        },
        expect.arrayContaining([
          {
            type: 'unshielded',
            outputs: [
              {
                type: 'token-d',
                receiverAddress: 'unshielded-address',
                amount: 100n,
              },
            ],
          },
          {
            type: 'shielded',
            outputs: [
              {
                type: 'token-c',
                receiverAddress: 'shielded-address',
                amount: 200n,
              },
            ],
          },
        ]),
        expect.objectContaining({ payFees: true }),
      );
    });

    it('should aggregate multiple inputs of the same kind and type', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const inputs: DesiredInput[] = [
        { kind: 'shielded', type: 'token-a', value: 500n },
        { kind: 'shielded', type: 'token-a', value: 300n },
      ];

      await api.makeIntent(inputs, shieldedOutputs, defaultOptions);

      expect(mockWallet.initSwap).toHaveBeenCalledWith(
        { shielded: { 'token-a': 800n } },
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should forward payFees: false option', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.makeIntent(shieldedInputs, shieldedOutputs, {
        intentId: 'random',
        payFees: false,
      });

      expect(mockWallet.initSwap).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.objectContaining({ payFees: false }),
      );
    });

    it('should skip signRecipe for shielded-only inputs and outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.makeIntent(shieldedInputs, shieldedOutputs, {
        intentId: 'random',
        payFees: false,
      });

      expect(mockWallet.signRecipe).not.toHaveBeenCalled();
      expect(mockWallet.finalizeRecipe).toHaveBeenCalledWith(mockRecipe);
    });

    it('should call signRecipe when inputs have unshielded parts', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const unshieldedInputs: DesiredInput[] = [
        { kind: 'unshielded', type: 'token-x', value: 100n },
      ];

      await api.makeIntent(unshieldedInputs, shieldedOutputs, defaultOptions);

      expect(mockWallet.signRecipe).toHaveBeenCalledWith(mockRecipe);
    });

    it('should throw error when user rejects the transaction', async () => {
      const rejectingConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      });
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        userConfirmTransaction: rejectingConfirmation,
      });

      await expect(
        api.makeIntent(shieldedInputs, shieldedOutputs, defaultOptions),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'User rejected transaction'),
      );

      expect(mockWallet.initSwap).not.toHaveBeenCalled();
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);

      await expect(
        api.makeIntent(shieldedInputs, shieldedOutputs, defaultOptions),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('checkNetworkSupport', () => {
    const optionsWithPreviewNetwork = {
      wallets$: of({} as MidnightWalletsByAccountId),
      network$: mockNetworkWithPreview$,
      userConfirmTransaction: userConfirmation,
      supportedNetworksIds$: of(initialSupportedNetworkIds),
      isUnlocked$: of(true),
    };

    beforeEach(() => {
      optionsWithPreviewNetwork.wallets$ = mockWallet$;
    });

    it('resolves when network is supported and matches active network', async () => {
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      await expect(
        api.checkNetworkSupport(NetworkId.NetworkId.Preview),
      ).resolves.toBeUndefined();
    });

    it('resolves when wallet is null but network matches active network', async () => {
      optionsWithPreviewNetwork.wallets$ = of({});
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      await expect(
        api.checkNetworkSupport(NetworkId.NetworkId.Preview),
      ).resolves.toBeUndefined();
    });

    it('resolves when network name string matches active network', async () => {
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      await expect(api.checkNetworkSupport('preview')).resolves.toBeUndefined();
    });

    it('throws APIError for invalid network ID', async () => {
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      const invalidNetworkId = 'UnsupportedNet-123';
      await expect(api.checkNetworkSupport(invalidNetworkId)).rejects.toThrow(
        new APIError(
          ErrorCodes.InvalidRequest,
          `Invalid network ID: ${invalidNetworkId}\nValid networks are: ${MidnightSDKNetworkId.join(
            ', ',
          )}`,
        ),
      );
    });

    it('throws APIError for unsupported network ID', async () => {
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      await expect(
        api.checkNetworkSupport(NetworkId.NetworkId.DevNet),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InvalidRequest,
          `Unsupported network ID: ${
            NetworkId.NetworkId.DevNet
          }\nSupported networks are: ${initialSupportedNetworkIds.join(', ')}`,
        ),
      );
    });

    it('throws APIError when network ID does not match active network', async () => {
      const api = new MidnightDappConnectorApi(optionsWithPreviewNetwork);
      await expect(
        api.checkNetworkSupport(NetworkId.NetworkId.Undeployed),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InvalidRequest, 'Network ID mismatch'),
      );
    });

    it('throws InternalError when active network is unavailable', async () => {
      const api = new MidnightDappConnectorApi({
        ...optionsWithPreviewNetwork,
        network$: of(undefined),
      });
      await expect(
        api.checkNetworkSupport(NetworkId.NetworkId.Preview),
      ).rejects.toThrow(
        new APIError(
          ErrorCodes.InternalError,
          'Active network ID is unavailable',
        ),
      );
    });
  });

  describe.todo('getTxHistory');

  describe('balanceSealedTransaction', () => {
    const mockSerializedTx = 'deadbeef';
    const mockFinalizedSerializedTx = Buffer.from('mock-finalized-tx');
    const mockDeserializedTx = {
      toString: () => 'deserialized-sealed-tx',
    } as unknown as ledger.Transaction<
      ledger.SignatureEnabled,
      ledger.Proof,
      ledger.Binding
    >;
    const mockRecipe = { type: 'UNPROVEN_TRANSACTION' as const };
    const mockSignedRecipe = { type: 'SIGNED_RECIPE' as const };
    const mockFinalizedTx = {
      serialize: vi.fn().mockReturnValue(mockFinalizedSerializedTx),
    };
    const mockSender = { sender: { url: 'https://test-dapp.io' } };

    beforeEach(() => {
      vi.spyOn(ledger.Transaction, 'deserialize').mockResolvedValue(
        mockDeserializedTx,
      );
      mockWallet.balanceFinalizedTransaction = vi
        .fn()
        .mockReturnValue(of(mockRecipe));
      mockWallet.signRecipe = vi.fn().mockReturnValue(of(mockSignedRecipe));
      mockWallet.finalizeRecipe = vi.fn().mockReturnValue(of(mockFinalizedTx));
    });

    it('should balance sealed transaction and return serialized hex', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const result = await api.balanceSealedTransaction(
        mockSerializedTx,
        { payFees: true },
        mockSender,
      );

      expect(result.tx).toBe(mockFinalizedSerializedTx.toString('hex'));
      expect(ledger.Transaction.deserialize).toHaveBeenCalledWith(
        'signature',
        'proof',
        'binding',
        Buffer.from(mockSerializedTx, 'hex'),
      );
      expect(mockWallet.balanceFinalizedTransaction).toHaveBeenCalledWith(
        mockDeserializedTx,
        expect.objectContaining({ tokenKindsToBalance: undefined }),
      );
      expect(mockWallet.signRecipe).toHaveBeenCalledWith(mockRecipe);
      expect(mockWallet.finalizeRecipe).toHaveBeenCalledWith(mockSignedRecipe);
    });

    it('should pass tokenKindsToBalance when payFees is false', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.balanceSealedTransaction(
        mockSerializedTx,
        { payFees: false },
        mockSender,
      );

      expect(mockWallet.balanceFinalizedTransaction).toHaveBeenCalledWith(
        mockDeserializedTx,
        expect.objectContaining({
          tokenKindsToBalance: ['shielded', 'unshielded'],
        }),
      );
    });

    it('should throw error when user rejects the transaction', async () => {
      const rejectingConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      });
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        userConfirmTransaction: rejectingConfirmation,
      });

      await expect(
        api.balanceSealedTransaction(
          mockSerializedTx,
          { payFees: true },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'User rejected transaction'),
      );

      expect(mockWallet.balanceFinalizedTransaction).not.toHaveBeenCalled();
    });

    it('should throw error when sender context is missing', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await expect(
        api.balanceSealedTransaction(mockSerializedTx, { payFees: true }),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Missing sender context'),
      );
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);

      await expect(
        api.balanceSealedTransaction(
          mockSerializedTx,
          { payFees: true },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe('balanceUnsealedTransaction', () => {
    const mockSerializedTx = 'deadbeef';
    const mockFinalizedSerializedTx = Buffer.from('mock-finalized-tx');
    const mockDeserializedTx = {
      toString: () => 'deserialized-unsealed-tx',
    } as unknown as ledger.Transaction<
      ledger.SignatureEnabled,
      ledger.Proof,
      ledger.PreBinding
    >;
    const mockRecipe = { type: 'UNPROVEN_TRANSACTION' as const };
    const mockSignedRecipe = { type: 'SIGNED_RECIPE' as const };
    const mockFinalizedTx = {
      serialize: vi.fn().mockReturnValue(mockFinalizedSerializedTx),
    };
    const mockSender = { sender: { url: 'https://test-dapp.io' } };

    beforeEach(() => {
      vi.spyOn(ledger.Transaction, 'deserialize').mockResolvedValue(
        mockDeserializedTx,
      );
      mockWallet.balanceUnboundTransaction = vi
        .fn()
        .mockReturnValue(of(mockRecipe));
      mockWallet.signRecipe = vi.fn().mockReturnValue(of(mockSignedRecipe));
      mockWallet.finalizeRecipe = vi.fn().mockReturnValue(of(mockFinalizedTx));
    });

    it('should balance unsealed transaction and return serialized hex', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const result = await api.balanceUnsealedTransaction(
        mockSerializedTx,
        { payFees: true },
        mockSender,
      );

      expect(result.tx).toBe(mockFinalizedSerializedTx.toString('hex'));
      expect(ledger.Transaction.deserialize).toHaveBeenCalledWith(
        'signature',
        'proof',
        'pre-binding',
        Buffer.from(mockSerializedTx, 'hex'),
      );
      expect(mockWallet.balanceUnboundTransaction).toHaveBeenCalledWith(
        mockDeserializedTx,
        expect.objectContaining({ tokenKindsToBalance: undefined }),
      );
      expect(mockWallet.signRecipe).toHaveBeenCalledWith(mockRecipe);
      expect(mockWallet.finalizeRecipe).toHaveBeenCalledWith(mockSignedRecipe);
    });

    it('should pass tokenKindsToBalance when payFees is false', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.balanceUnsealedTransaction(
        mockSerializedTx,
        { payFees: false },
        mockSender,
      );

      expect(mockWallet.balanceUnboundTransaction).toHaveBeenCalledWith(
        mockDeserializedTx,
        expect.objectContaining({
          tokenKindsToBalance: ['shielded', 'unshielded'],
        }),
      );
    });

    it('should throw error when user rejects the transaction', async () => {
      const rejectingConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      });
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        userConfirmTransaction: rejectingConfirmation,
      });

      await expect(
        api.balanceUnsealedTransaction(
          mockSerializedTx,
          { payFees: true },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'User rejected transaction'),
      );

      expect(mockWallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });

    it('should throw error when sender context is missing', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await expect(
        api.balanceUnsealedTransaction(mockSerializedTx, { payFees: true }),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Missing sender context'),
      );
    });

    it('should throw error if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);

      await expect(
        api.balanceUnsealedTransaction(
          mockSerializedTx,
          { payFees: true },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });
  describe('makeTransfer', () => {
    const mockSerializedTx = Buffer.from('mock-serialized-tx');
    const mockFinalizedTx = {
      serialize: vi.fn().mockReturnValue(mockSerializedTx),
    };
    const mockRecipe = { type: 'UNPROVEN_TRANSACTION' as const };

    const shieldedOutputs: DesiredOutput[] = [
      {
        kind: 'shielded',
        type: 'token-a',
        value: 500n,
        recipient: 'shielded-recipient-address',
      },
    ];

    beforeEach(() => {
      mockWallet.transferTransaction = vi.fn().mockReturnValue(of(mockRecipe));
      mockWallet.signRecipe = vi.fn().mockReturnValue(of(mockRecipe));
      mockWallet.finalizeRecipe = vi.fn().mockReturnValue(of(mockFinalizedTx));
    });

    it('should create transfer transaction with shielded outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const result = await api.makeTransfer(shieldedOutputs, {
        payFees: true,
      });

      expect(result.tx).toBe(mockSerializedTx.toString('hex'));
      expect(mockWallet.transferTransaction).toHaveBeenCalledWith(
        [
          {
            type: 'shielded',
            outputs: [
              {
                type: 'token-a',
                receiverAddress: 'shielded-recipient-address',
                amount: 500n,
              },
            ],
          },
        ],
        expect.objectContaining({ payFees: true }),
      );
    });

    it('should forward payFees: false option', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.makeTransfer(shieldedOutputs, { payFees: false });

      expect(mockWallet.transferTransaction).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ payFees: false }),
      );
    });

    it('should default payFees to true when not specified', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.makeTransfer(shieldedOutputs, undefined);

      expect(mockWallet.transferTransaction).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ payFees: true }),
      );
    });

    it('should skip signRecipe for shielded-only outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      await api.makeTransfer(shieldedOutputs, { payFees: false });

      expect(mockWallet.signRecipe).not.toHaveBeenCalled();
      expect(mockWallet.finalizeRecipe).toHaveBeenCalledWith(mockRecipe);
    });

    it('should call signRecipe for unshielded outputs', async () => {
      const api = new MidnightDappConnectorApi(optionsWithWallet);

      const unshieldedOutputs: DesiredOutput[] = [
        {
          kind: 'unshielded',
          type: 'token-b',
          value: 300n,
          recipient: 'unshielded-recipient-address',
        },
      ];

      await api.makeTransfer(unshieldedOutputs, { payFees: true });

      expect(mockWallet.signRecipe).toHaveBeenCalledWith(mockRecipe);
      expect(mockWallet.finalizeRecipe).toHaveBeenCalled();
    });

    it('should throw error when user rejects the transaction', async () => {
      const rejectingConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      });
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        userConfirmTransaction: rejectingConfirmation,
      });

      await expect(
        api.makeTransfer(shieldedOutputs, { payFees: true }),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'User rejects transaction'),
      );

      expect(mockWallet.transferTransaction).not.toHaveBeenCalled();
    });
  });

  describe('signData', () => {
    const mockSender = { sender: { url: 'https://test-dapp.io' } };
    const mockSignResult = {
      signature: 'mock-signature',
      verifyingKey: 'mock-verifying-key',
    };

    it('should sign hex-encoded data and return signature', async () => {
      const mockSignData = vi.fn().mockReturnValue(of(mockSignResult));
      const wallet = {
        ...mockWallet,
        signData: mockSignData,
      } as unknown as MidnightWallet;

      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        wallets$: of({ [wallet.accountId]: wallet }),
      });

      const result = await api.signData(
        '48656c6c6f',
        { encoding: 'hex', keyType: 'unshielded' },
        mockSender,
      );

      expect(result).toEqual({
        data: '48656c6c6f',
        signature: 'mock-signature',
        verifyingKey: 'mock-verifying-key',
      });
      expect(mockSignData).toHaveBeenCalledWith(
        new Uint8Array(Buffer.from('48656c6c6f', 'hex')),
      );
    });

    it('should sign base64-encoded data and return signature', async () => {
      const mockSignData = vi.fn().mockReturnValue(of(mockSignResult));
      const wallet = {
        ...mockWallet,
        signData: mockSignData,
      } as unknown as MidnightWallet;

      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        wallets$: of({ [wallet.accountId]: wallet }),
      });

      const result = await api.signData(
        'SGVsbG8=',
        { encoding: 'base64', keyType: 'unshielded' },
        mockSender,
      );

      expect(result).toEqual({
        data: 'SGVsbG8=',
        signature: 'mock-signature',
        verifyingKey: 'mock-verifying-key',
      });
      expect(mockSignData).toHaveBeenCalledWith(
        new Uint8Array(Buffer.from('SGVsbG8=', 'base64')),
      );
    });

    it('should sign text-encoded data and return signature', async () => {
      const mockSignData = vi.fn().mockReturnValue(of(mockSignResult));
      const wallet = {
        ...mockWallet,
        signData: mockSignData,
      } as unknown as MidnightWallet;

      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        wallets$: of({ [wallet.accountId]: wallet }),
      });

      const result = await api.signData(
        'Hello',
        { encoding: 'text', keyType: 'unshielded' },
        mockSender,
      );

      expect(result).toEqual({
        data: 'Hello',
        signature: 'mock-signature',
        verifyingKey: 'mock-verifying-key',
      });
      expect(mockSignData).toHaveBeenCalledWith(
        new TextEncoder().encode('Hello'),
      );
    });

    it('should throw if user rejects data signing', async () => {
      const rejectedConfirmation = vi
        .fn()
        .mockResolvedValue({ isConfirmed: false, accessAuthSecret: vi.fn() });
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        userConfirmTransaction: rejectedConfirmation,
      });

      await expect(
        api.signData(
          'Hello',
          { encoding: 'text', keyType: 'unshielded' },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.Rejected, 'User rejected data signing'),
      );
    });

    it('should throw if wallet is not available', async () => {
      const api = new MidnightDappConnectorApi(optionsWithoutWallet);

      await expect(
        api.signData(
          'Hello',
          { encoding: 'text', keyType: 'unshielded' },
          mockSender,
        ),
      ).rejects.toThrow(
        new APIError(ErrorCodes.InternalError, 'Wallet is unavailable'),
      );
    });
  });

  describe.todo('hintUsage');

  describe('isLocked (app-lock integration)', () => {
    it('should return true when app is locked', async () => {
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        isUnlocked$: of(false),
      });

      expect(await api.isLocked()).toBe(true);
    });

    it('should return false when app is unlocked', async () => {
      const api = new MidnightDappConnectorApi({
        ...optionsWithWallet,
        isUnlocked$: of(true),
      });

      expect(await api.isLocked()).toBe(false);
    });
  });
});
