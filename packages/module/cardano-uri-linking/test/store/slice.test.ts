import { BlockchainNetworkId } from '@lace-contract/network';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  cardanoUriLinkingActions as actions,
  cardanoUriLinkingSelectors as selectors,
  cardanoUriLinkingReducers as reducers,
} from '../../src/store/slice';

import type { CardanoUriLinkingState } from '../../src/store/slice';
import type {
  ClaimNftWithMetadata,
  ClaimResponseError,
  ClaimResponseSuccess,
  ClaimTokenWithCdnMetadata,
} from '../../src/types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';

describe('cardanoUriLinking slice', () => {
  let initialState: CardanoUriLinkingState;

  beforeEach(() => {
    initialState = {
      error: null,
      claimResponse: null,
      claimingAccount: null,
      claimingAddress: null,
      isSubmitting: false,
      tokenMetadata: null,
      isLoadingTokenMetadata: false,
      nftMetadata: null,
      isLoadingNftMetadata: false,
    };
  });

  describe('reducers', () => {
    describe('setError', () => {
      it('should set error state to provided ClaimResponseError', () => {
        const error: ClaimResponseError = { code: 404, status: 'notfound' };
        const action = actions.cardanoUriLinking.setError(error);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.error).toEqual(error);
      });

      it.each([
        [{ code: 400, status: 'invalidaddress' }],
        [{ code: 400, status: 'missingcode' }],
        [{ code: 400, status: 'invalidnetwork' }],
        [{ code: 404, status: 'notfound' }],
        [{ code: 409, status: 'alreadyclaimed' }],
        [{ code: 410, status: 'expired' }],
        [{ code: 425, status: 'tooearly' }],
        [{ code: 429, status: 'ratelimited' }],
      ] as ClaimResponseError[][])(
        'should set error for code %o',
        (error: ClaimResponseError) => {
          const action = actions.cardanoUriLinking.setError(error);
          const state = reducers.cardanoUriLinking(initialState, action);

          expect(state.error).toEqual(error);
        },
      );

      it('should clear error when passed null', () => {
        const stateWithError: CardanoUriLinkingState = {
          ...initialState,
          error: { code: 404, status: 'notfound' },
        };
        const action = actions.cardanoUriLinking.setError(null);
        const state = reducers.cardanoUriLinking(stateWithError, action);

        expect(state.error).toBeNull();
      });
    });

    describe('setClaimResponse', () => {
      it('should set claim response for 200 success type', () => {
        const response: ClaimResponseSuccess = {
          code: 200,
          status: 'accepted',
          lovelaces: '1000000',
          queue_position: 1,
          tokens: {},
        };
        const action = actions.cardanoUriLinking.setClaimResponse(response);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.claimResponse).toEqual(response);
      });

      it('should set claim response for 201 success type', () => {
        const response: ClaimResponseSuccess = {
          code: 201,
          status: 'queued',
          lovelaces: '2000000',
          queue_position: 5,
          tokens: {},
        };
        const action = actions.cardanoUriLinking.setClaimResponse(response);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.claimResponse).toEqual(response);
      });

      it('should set claim response for 202 success type', () => {
        const response: ClaimResponseSuccess = {
          code: 202,
          status: 'claimed',
          lovelaces: '3000000',
          tokens: {},
          tx_hash: 'abc123def456',
        } as ClaimResponseSuccess;
        const action = actions.cardanoUriLinking.setClaimResponse(response);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.claimResponse).toEqual(response);
      });

      it('should clear claim response when passed null', () => {
        const stateWithResponse: CardanoUriLinkingState = {
          ...initialState,
          claimResponse: {
            code: 200,
            status: 'accepted',
            lovelaces: '1000000',
            queue_position: 1,
            tokens: {},
          },
        };
        const action = actions.cardanoUriLinking.setClaimResponse(null);
        const state = reducers.cardanoUriLinking(stateWithResponse, action);

        expect(state.claimResponse).toBeNull();
      });
    });

    describe('setClaimingAccount', () => {
      it('should set the selected account', () => {
        const account = {
          accountId: 'acc-1',
          walletId: 'wallet-1',
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          metadata: { name: 'Test Account' },
        } as unknown as AnyAccount;

        const action = actions.cardanoUriLinking.setClaimingAccount(account);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.claimingAccount).toEqual(account);
      });

      it('should clear claiming account when passed null', () => {
        const stateWithAccount: CardanoUriLinkingState = {
          ...initialState,
          claimingAccount: {
            accountId: 'acc-1',
            walletId: 'wallet-1',
            blockchainNetworkId: BlockchainNetworkId('cardano-preprod'),
          } as unknown as AnyAccount,
        };
        const action = actions.cardanoUriLinking.setClaimingAccount(null);
        const state = reducers.cardanoUriLinking(stateWithAccount, action);

        expect(state.claimingAccount).toBeNull();
      });
    });

    describe('setClaimingAddress', () => {
      it('should set the selected address', () => {
        const address = {
          address: 'addr1qxyz...',
          accountId: 'acc-1',
        } as unknown as AnyAddress;

        const action = actions.cardanoUriLinking.setClaimingAddress(address);
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.claimingAddress).toEqual(address);
      });

      it('should clear claiming address when passed null', () => {
        const stateWithAddress: CardanoUriLinkingState = {
          ...initialState,
          claimingAddress: {
            address: 'addr1qxyz...',
            accountId: 'acc-1',
          } as unknown as AnyAddress,
        };
        const action = actions.cardanoUriLinking.setClaimingAddress(null);
        const state = reducers.cardanoUriLinking(stateWithAddress, action);

        expect(state.claimingAddress).toBeNull();
      });
    });

    describe('submitClaim', () => {
      it('should set isSubmitting to true and clear error', () => {
        const stateWithError: CardanoUriLinkingState = {
          ...initialState,
          error: { code: 404, status: 'notfound' },
        };
        const action = actions.cardanoUriLinking.submitClaim({
          faucet_url: 'https://example.com/claim',
          code: 'test-code',
        });
        const state = reducers.cardanoUriLinking(stateWithError, action);

        expect(state.isSubmitting).toBe(true);
        expect(state.error).toBeNull();
      });
    });

    describe('submitClaimSuccess', () => {
      it('should set claimResponse, clear isSubmitting, and clear error', () => {
        const stateSubmitting: CardanoUriLinkingState = {
          ...initialState,
          isSubmitting: true,
        };
        const response: ClaimResponseSuccess = {
          code: 200,
          status: 'accepted',
          lovelaces: '1000000',
          queue_position: 1,
          tokens: {},
        };
        const action = actions.cardanoUriLinking.submitClaimSuccess(response);
        const state = reducers.cardanoUriLinking(stateSubmitting, action);

        expect(state.isSubmitting).toBe(false);
        expect(state.claimResponse).toEqual(response);
        expect(state.error).toBeNull();
      });
    });

    describe('submitClaimFailed', () => {
      it('should set error and clear isSubmitting', () => {
        const stateSubmitting: CardanoUriLinkingState = {
          ...initialState,
          isSubmitting: true,
        };
        const error: ClaimResponseError = { code: 404, status: 'notfound' };
        const action = actions.cardanoUriLinking.submitClaimFailed(error);
        const state = reducers.cardanoUriLinking(stateSubmitting, action);

        expect(state.isSubmitting).toBe(false);
        expect(state.error).toEqual(error);
      });
    });

    describe('loadTokenMetadata', () => {
      it('should set isLoadingTokenMetadata to true', () => {
        const action = actions.cardanoUriLinking.loadTokenMetadata();
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.isLoadingTokenMetadata).toBe(true);
      });
    });

    describe('tokenMetadataLoaded', () => {
      it('should set tokenMetadata and clear isLoadingTokenMetadata', () => {
        const stateLoading: CardanoUriLinkingState = {
          ...initialState,
          isLoadingTokenMetadata: true,
        };
        const metadata: ClaimTokenWithCdnMetadata[] = [
          {
            assetId: 'policy.name' as Cardano.AssetId,
            balance: '100',
            name: 'Test Token',
            image: 'https://example.com/image.png',
          } as ClaimTokenWithCdnMetadata,
        ];
        const action = actions.cardanoUriLinking.tokenMetadataLoaded(metadata);
        const state = reducers.cardanoUriLinking(stateLoading, action);

        expect(state.isLoadingTokenMetadata).toBe(false);
        expect(state.tokenMetadata).toEqual(metadata);
      });
    });

    describe('tokenMetadataFailed', () => {
      it('should clear isLoadingTokenMetadata', () => {
        const stateLoading: CardanoUriLinkingState = {
          ...initialState,
          isLoadingTokenMetadata: true,
        };
        const action = actions.cardanoUriLinking.tokenMetadataFailed();
        const state = reducers.cardanoUriLinking(stateLoading, action);

        expect(state.isLoadingTokenMetadata).toBe(false);
      });
    });

    describe('loadNftMetadata', () => {
      it('should set isLoadingNftMetadata to true', () => {
        const action = actions.cardanoUriLinking.loadNftMetadata();
        const state = reducers.cardanoUriLinking(initialState, action);

        expect(state.isLoadingNftMetadata).toBe(true);
      });
    });

    describe('nftMetadataLoaded', () => {
      it('should set nftMetadata and clear isLoadingNftMetadata', () => {
        const stateLoading: CardanoUriLinkingState = {
          ...initialState,
          isLoadingNftMetadata: true,
        };
        const metadata: ClaimNftWithMetadata[] = [
          {
            assetId: 'policy.assetname' as Cardano.AssetId,
            name: 'Test NFT',
            image: 'ipfs://QmTest123',
            policyId: 'policy',
            assetName: 'assetname',
          },
        ];
        const action = actions.cardanoUriLinking.nftMetadataLoaded(metadata);
        const state = reducers.cardanoUriLinking(stateLoading, action);

        expect(state.isLoadingNftMetadata).toBe(false);
        expect(state.nftMetadata).toEqual(metadata);
      });
    });

    describe('nftMetadataFailed', () => {
      it('should clear isLoadingNftMetadata', () => {
        const stateLoading: CardanoUriLinkingState = {
          ...initialState,
          isLoadingNftMetadata: true,
        };
        const action = actions.cardanoUriLinking.nftMetadataFailed();
        const state = reducers.cardanoUriLinking(stateLoading, action);

        expect(state.isLoadingNftMetadata).toBe(false);
      });
    });

    describe('reset', () => {
      it('should reset state to initial values', () => {
        const modifiedState: CardanoUriLinkingState = {
          error: { code: 404, status: 'notfound' },
          claimResponse: {
            code: 200,
            status: 'accepted',
            lovelaces: '1000000',
            queue_position: 1,
            tokens: {},
          },
          claimingAccount: { accountId: 'acc-1' } as unknown as AnyAccount,
          claimingAddress: { address: 'addr1...' } as unknown as AnyAddress,
          isSubmitting: true,
          tokenMetadata: [
            { assetId: 'test' as Cardano.AssetId },
          ] as ClaimTokenWithCdnMetadata[],
          isLoadingTokenMetadata: true,
          nftMetadata: [
            { assetId: 'test-nft' as Cardano.AssetId },
          ] as ClaimNftWithMetadata[],
          isLoadingNftMetadata: true,
        };
        const action = actions.cardanoUriLinking.reset();
        const state = reducers.cardanoUriLinking(modifiedState, action);

        expect(state).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    it('should select error state', () => {
      const error: ClaimResponseError = { code: 404, status: 'notfound' };
      const state = {
        cardanoUriLinking: { ...initialState, error },
      };

      const selected = selectors.cardanoUriLinking.selectError(state);

      expect(selected).toEqual(error);
    });

    it('should select null error when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectError(state);

      expect(selected).toBeNull();
    });

    it('should select claim response', () => {
      const claimResponse: ClaimResponseSuccess = {
        code: 200,
        status: 'accepted',
        lovelaces: '1000000',
        queue_position: 1,
        tokens: {},
      };
      const state = {
        cardanoUriLinking: { ...initialState, claimResponse },
      };

      const selected = selectors.cardanoUriLinking.selectClaimResponse(state);

      expect(selected).toEqual(claimResponse);
    });

    it('should select null claim response when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectClaimResponse(state);

      expect(selected).toBeNull();
    });

    it('should select claiming account', () => {
      const claimingAccount = {
        accountId: 'acc-1',
        walletId: 'wallet-1',
        blockchainNetworkId: BlockchainNetworkId('cardano-preview'),
      } as unknown as AnyAccount;
      const state = {
        cardanoUriLinking: { ...initialState, claimingAccount },
      };

      const selected = selectors.cardanoUriLinking.selectClaimingAccount(state);

      expect(selected).toEqual(claimingAccount);
    });

    it('should select null claiming account when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectClaimingAccount(state);

      expect(selected).toBeNull();
    });

    it('should select claiming address', () => {
      const claimingAddress = {
        address: 'addr1qxyz...',
        accountId: 'acc-1',
      } as unknown as AnyAddress;
      const state = {
        cardanoUriLinking: { ...initialState, claimingAddress },
      };

      const selected = selectors.cardanoUriLinking.selectClaimingAddress(state);

      expect(selected).toEqual(claimingAddress);
    });

    it('should select null claiming address when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectClaimingAddress(state);

      expect(selected).toBeNull();
    });

    it('should select isSubmitting', () => {
      const state = {
        cardanoUriLinking: { ...initialState, isSubmitting: true },
      };

      const isSubmitting =
        selectors.cardanoUriLinking.selectIsSubmitting(state);

      expect(isSubmitting).toBe(true);
    });

    it('should select false isSubmitting when not submitting', () => {
      const state = { cardanoUriLinking: initialState };

      const isSubmitting =
        selectors.cardanoUriLinking.selectIsSubmitting(state);

      expect(isSubmitting).toBe(false);
    });

    it('should select tokenMetadata', () => {
      const tokenMetadata: ClaimTokenWithCdnMetadata[] = [
        {
          assetId: 'policy.name' as Cardano.AssetId,
          balance: '100',
          name: 'Test Token',
          image: 'https://example.com/image.png',
        } as ClaimTokenWithCdnMetadata,
      ];
      const state = {
        cardanoUriLinking: { ...initialState, tokenMetadata },
      };

      const selected = selectors.cardanoUriLinking.selectTokenMetadata(state);

      expect(selected).toEqual(tokenMetadata);
    });

    it('should select null tokenMetadata when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectTokenMetadata(state);

      expect(selected).toBeNull();
    });

    it('should select isLoadingTokenMetadata', () => {
      const state = {
        cardanoUriLinking: { ...initialState, isLoadingTokenMetadata: true },
      };

      const isLoadingTokenMetadata =
        selectors.cardanoUriLinking.selectIsLoadingTokenMetadata(state);

      expect(isLoadingTokenMetadata).toBe(true);
    });

    it('should select false isLoadingTokenMetadata when not loading', () => {
      const state = { cardanoUriLinking: initialState };

      const isLoadingTokenMetadata =
        selectors.cardanoUriLinking.selectIsLoadingTokenMetadata(state);

      expect(isLoadingTokenMetadata).toBe(false);
    });

    it('should select nftMetadata', () => {
      const nftMetadata: ClaimNftWithMetadata[] = [
        {
          assetId: 'policy.assetname' as Cardano.AssetId,
          name: 'Test NFT',
          image: 'ipfs://QmTest123',
          policyId: 'policy',
          assetName: 'assetname',
        },
      ];
      const state = {
        cardanoUriLinking: { ...initialState, nftMetadata },
      };

      const selected = selectors.cardanoUriLinking.selectNftMetadata(state);

      expect(selected).toEqual(nftMetadata);
    });

    it('should select null nftMetadata when not set', () => {
      const state = { cardanoUriLinking: initialState };

      const selected = selectors.cardanoUriLinking.selectNftMetadata(state);

      expect(selected).toBeNull();
    });

    it('should select isLoadingNftMetadata', () => {
      const state = {
        cardanoUriLinking: { ...initialState, isLoadingNftMetadata: true },
      };

      const isLoadingNftMetadata =
        selectors.cardanoUriLinking.selectIsLoadingNftMetadata(state);

      expect(isLoadingNftMetadata).toBe(true);
    });

    it('should select false isLoadingNftMetadata when not loading', () => {
      const state = { cardanoUriLinking: initialState };

      const isLoadingNftMetadata =
        selectors.cardanoUriLinking.selectIsLoadingNftMetadata(state);

      expect(isLoadingNftMetadata).toBe(false);
    });
  });
});
