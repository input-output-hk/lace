import { Cardano } from '@cardano-sdk/core';
import { addressesActions, type Address } from '@lace-contract/addresses';
import { type TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, HexBytes } from '@lace-sdk/util';
import { describe, it } from 'vitest';

import { trackOwnHandleAliases } from '../../src/store/side-effects';
import { Handle, HandleType } from '../../src/value-objects';

import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const actions = {
  ...addressesActions,
};

/** ADA Handle policy ID for Cardano Mainnet */
const MAINNET_HANDLE_POLICY_ID =
  'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';

/** ADA Handle policy ID for Cardano Preview testnet */
const PREVIEW_HANDLE_POLICY_ID =
  '8d18d786e92776c824607fd8e193ec535c79dc61ea2405ddf3b09fe3';

/** A non-handle policy ID for testing filtering */
const OTHER_POLICY_ID =
  '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82';

const testAddress1 =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Address;
const testAddress2 =
  'addr_test1qpq7kl5dxqhzl9m0fvxs3k8rlprl0hqy2hf5qqqqqqqqqqqqqq5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwqc5wnxv' as Address;
const testAccountId = 'test-account-1' as AccountId;

/**
 * Encodes a string to hex for use in token IDs.
 */
const encodeToHex = (string_: string): string => HexBytes.fromUTF8(string_);

interface MockTokenOptions {
  policyId: string;
  assetNameHex: string;
  address: Address;
  blockchainName?: BlockchainName;
}

/**
 * Creates a mock Token for testing.
 */
const createMockToken = ({
  policyId,
  assetNameHex,
  address,
  blockchainName = 'Cardano',
}: MockTokenOptions): Token => ({
  tokenId: `${policyId}${assetNameHex}` as TokenId,
  address,
  accountId: testAccountId,
  blockchainName,
  available: BigNumber(1n),
  pending: BigNumber(0n),
  displayLongName: 'Test Token',
  displayShortName: 'TST',
  decimals: 0,
});

const groupTokensByAccount = (...tokens: Token[]) => ({
  [testAccountId]: { fungible: tokens, nfts: [] as Token[] },
});

describe('trackOwnHandleAliases', () => {
  describe('mainnet', () => {
    it('emits setAliases action for valid handle tokens', () => {
      const handleName = 'myhandle';
      const assetNameHex = encodeToHex(handleName);
      const handleToken = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex,
        address: testAddress1,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(handleToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle(`$${handleName}`),
                  },
                ],
              }),
            });
          },
        };
      });
    });

    it('handles multiple handle tokens across different addresses', () => {
      const handle1 = 'alice';
      const handle2 = 'bob';
      const token1 = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex(handle1),
        address: testAddress1,
      });
      const token2 = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex(handle2),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(token1, token2),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle(`$${handle1}`),
                  },
                  {
                    address: testAddress2,
                    aliasType: HandleType(),
                    alias: Handle(`$${handle2}`),
                  },
                ],
              }),
            });
          },
        };
      });
    });
  });

  describe('preview network', () => {
    it('emits setAliases action for valid handle tokens on preview', () => {
      const handleName = 'testhandle';
      const handleToken = createMockToken({
        policyId: PREVIEW_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex(handleName),
        address: testAddress1,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(handleToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Preview,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle(`$${handleName}`),
                  },
                ],
              }),
            });
          },
        };
      });
    });
  });

  describe('filtering', () => {
    it('does not emit when no handle tokens exist', () => {
      const nonHandleToken = createMockToken({
        policyId: OTHER_POLICY_ID,
        assetNameHex: encodeToHex('sometoken'),
        address: testAddress1,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(nonHandleToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      });
    });

    it('filters out non-Cardano tokens', () => {
      const cardanoHandle = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('cardanohandle'),
        address: testAddress1,
        blockchainName: 'Cardano',
      });
      const bitcoinToken = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('notahandle'),
        address: testAddress2,
        blockchainName: 'Bitcoin',
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(cardanoHandle, bitcoinToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle('$cardanohandle'),
                  },
                ],
              }),
            });
          },
        };
      });
    });

    it('does not emit on unsupported networks (preprod)', () => {
      const handleToken = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('myhandle'),
        address: testAddress1,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(handleToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Preprod,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      });
    });

    it('does not emit when chainId is not available', () => {
      const handleToken = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('myhandle'),
        address: testAddress1,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(handleToken),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: undefined }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      });
    });
  });

  describe('handle name decoding', () => {
    it('skips tokens with handle names that are too short', () => {
      // Handle name "a" results in "$a" which is only 2 chars (MIN_LENGTH requires > 2)
      const shortHandle = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('a'),
        address: testAddress1,
      });
      const validHandle = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('validhandle'),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(shortHandle, validHandle),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress2,
                    aliasType: HandleType(),
                    alias: Handle('$validhandle'),
                  },
                ],
              }),
            });
          },
        };
      });
    });

    it('skips tokens with invalid UTF-8 in asset name', () => {
      // Invalid UTF-8 sequence: 0xff is not a valid UTF-8 byte
      const invalidUtf8Token = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: 'ff',
        address: testAddress1,
      });
      const validHandle = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('validhandle'),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(invalidUtf8Token, validHandle),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress2,
                    aliasType: HandleType(),
                    alias: Handle('$validhandle'),
                  },
                ],
              }),
            });
          },
        };
      });
    });
  });

  describe('reactive updates', () => {
    it('does not emit when irrelevant tokens change', () => {
      const handleToken = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('myhandle'),
        address: testAddress1,
      });
      const irrelevantToken1 = createMockToken({
        policyId: OTHER_POLICY_ID,
        assetNameHex: encodeToHex('token1'),
        address: testAddress2,
      });
      const irrelevantToken2 = createMockToken({
        policyId: OTHER_POLICY_ID,
        assetNameHex: encodeToHex('token2'),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              // Handle token stays the same, only irrelevant tokens change
              selectTokensGroupedByAccount$: cold('a--b--c', {
                a: groupTokensByAccount(handleToken, irrelevantToken1),
                b: groupTokensByAccount(handleToken, irrelevantToken2),
                c: groupTokensByAccount(
                  handleToken,
                  irrelevantToken1,
                  irrelevantToken2,
                ),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Should only emit once on initial subscription, not on subsequent irrelevant changes
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle('$myhandle'),
                  },
                ],
              }),
            });
          },
        };
      });
    });

    it('emits new aliases when handle tokens change', () => {
      const handle1 = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('first'),
        address: testAddress1,
      });
      const handle2 = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('second'),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a--b', {
                a: groupTokensByAccount(handle1),
                b: groupTokensByAccount(handle1, handle2),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', {
                a: Cardano.ChainIds.Mainnet,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a--b', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle('$first'),
                  },
                ],
              }),
              b: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle('$first'),
                  },
                  {
                    address: testAddress2,
                    aliasType: HandleType(),
                    alias: Handle('$second'),
                  },
                ],
              }),
            });
          },
        };
      });
    });

    it('emits new aliases when network changes', () => {
      const mainnetHandle = createMockToken({
        policyId: MAINNET_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('mainnethandle'),
        address: testAddress1,
      });
      const previewHandle = createMockToken({
        policyId: PREVIEW_HANDLE_POLICY_ID,
        assetNameHex: encodeToHex('previewhandle'),
        address: testAddress2,
      });

      testSideEffect(trackOwnHandleAliases, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            tokens: {
              selectTokensGroupedByAccount$: cold('a', {
                a: groupTokensByAccount(mainnetHandle, previewHandle),
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a--b', {
                a: Cardano.ChainIds.Mainnet,
                b: Cardano.ChainIds.Preview,
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a--b', {
              a: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress1,
                    aliasType: HandleType(),
                    alias: Handle('$mainnethandle'),
                  },
                ],
              }),
              b: actions.addresses.setAliases({
                aliases: [
                  {
                    address: testAddress2,
                    aliasType: HandleType(),
                    alias: Handle('$previewhandle'),
                  },
                ],
              }),
            });
          },
        };
      });
    });
  });
});
