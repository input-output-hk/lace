import {
  isCardanoAddress,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  createUICustomisation,
  formatAmountRawToDenominated,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';

import type {
  ActivitiesItemUICustomisation,
  ActivityTokenBalanceChange,
  TokensInfoSummary,
} from '@lace-contract/activities';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type { TokenId } from '@lace-contract/tokens';

const isAdaTokenId = (tokenId: TokenId) => tokenId === LOVELACE_TOKEN_ID;

/**
 * The minimum amount of ADA that must be present in a transaction to consider the ADA part of the transaction as
 * a separate token that the user is interested in.
 */
const INSIGNIFICANT_LOVELACE_THRESHHOLD_IN_MULTI_ASSET_TX = 5000000n;

/**
 * Customizes the UI for the activities list specific to the Cardano blockchain.
 *
 * This method provides various customizations required for displaying Cardano-specific activities.
 * It includes the ability to identify Cardano activities, construct transaction explorer URLs, determine balance
 * changes for the primary token (ADA), and summarize information about associated tokens such as NFTs and other
 * native assets.
 */
const activitiesListUiCustomisation = () =>
  createUICustomisation<ActivitiesItemUICustomisation<CardanoAddressData>>({
    key: 'cardano',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Cardano',
    getExplorerUrl: ({ config, address, activityId }) => {
      if (!config) return '';
      const { cexplorerUrls } = config;
      if (isCardanoAddress(address) && address.data) {
        const { networkMagic } = address.data;
        const explorerUrl = cexplorerUrls[networkMagic];
        return `${explorerUrl}/tx/${activityId}`;
      }
      return '';
    },
    getMainTokenBalanceChange: (
      tokenBalanceChanges: ActivityTokenBalanceChange[],
    ) =>
      tokenBalanceChanges.find(balanceChange =>
        isAdaTokenId(balanceChange.tokenId),
      ),
    /**
     * Computes a summary of token balance changes in a Cardano transaction.
     *
     * This function evaluates a set of token balance changes and determines the appropriate
     * way to summarize them based on several conditions, including whether the changes involve
     * ADA, NFTs, and/or other tokens. Transactions are grouped into specific categories such as
     * single token changes, mixed assets, or multi-token transactions.
     *
     * @param tokenBalanceChanges - An array of token balance changes.
     * @param translations - An object containing translation strings for labels.
     * @returns A summary object containing the structured token summary information.
     */
    getTokensInfoSummary: (
      tokenBalanceChanges,
      translations,
    ): TokensInfoSummary => {
      // Any Cardano transaction must have exactly one ADA token change
      const adaChange = tokenBalanceChanges.find(t => isAdaTokenId(t.tokenId));
      // This should never happen, but we need some default
      if (!adaChange) {
        return {
          title: {
            amount: BigNumber(0n),
            label: translations.unknownToken,
          },
        };
      }

      const absAdaAmount = BigNumber.abs(adaChange.amount);
      const isAdaBelowThreshold =
        absAdaAmount < INSIGNIFICANT_LOVELACE_THRESHHOLD_IN_MULTI_ASSET_TX;

      const nfts = tokenBalanceChanges.filter(t => t.token?.isNft);
      const isNFTsOnly =
        isAdaBelowThreshold && nfts.length === tokenBalanceChanges.length - 1; // substract ADA change
      const tokens = tokenBalanceChanges.filter(t => !t.token?.isNft);
      const isTokensOnly = tokens.length === tokenBalanceChanges.length;
      // Do not count ADA as token when below threshhold
      const tokensCount = tokens.length - (isAdaBelowThreshold ? 1 : 0);

      // Case: a single token balance change (must be ADA)
      if (tokenBalanceChanges.length === 1) {
        return {
          title: {
            amount: formatAmountRawToDenominated(
              adaChange.amount,
              adaChange.token?.decimals,
              adaChange.token?.displayDecimalPlaces,
            ),
            label:
              adaChange.token?.ticker ??
              adaChange.token?.name ??
              translations.unknownToken,
          },
        };
      }

      // Case: A single Cardano native asset + ADA
      if (isAdaBelowThreshold && tokenBalanceChanges.length === 2) {
        const nativeTokenChange = tokenBalanceChanges.find(
          t => !isAdaTokenId(t.tokenId),
        );
        if (nativeTokenChange) {
          const isNFT = nativeTokenChange.token?.isNft;
          const decimals = isNFT ? 0 : nativeTokenChange.token?.decimals;
          const displayDecimalPlaces = isNFT
            ? 0
            : nativeTokenChange.token?.displayDecimalPlaces;
          // Do not show an amount for single NFTs
          // Show token amounts as approximated (≈)
          const amount = isNFT
            ? ''
            : '≈' +
              formatAmountRawToDenominated(
                nativeTokenChange.amount,
                decimals,
                displayDecimalPlaces,
              );

          // ADA amount is below threshhold -> show amount of native asset
          return {
            title: {
              amount,
              label:
                nativeTokenChange.token?.ticker ??
                nativeTokenChange.token?.name ??
                translations.unknownToken,
            },
          };
        }
      }

      // Case: multiple NFTs plus the mandatory ADA token change
      if (isNFTsOnly) {
        return {
          title: {
            amount: nfts.length.toString(),
            label: translations.nfts,
          },
        };
      }

      // Case: multiple Tokens
      if (isTokensOnly) {
        return {
          title: {
            amount: tokensCount.toString(),
            label: translations.tokens,
          },
        };
      }

      // Case: mixed NFTs and Tokens
      return {
        title: {
          amount: (tokensCount + nfts.length).toString(),
          label: translations.mixed,
        },
        subtitle: `${tokensCount} ${translations.tokens}, ${nfts.length} ${translations.nfts}`,
      };
    },
  }) as ActivitiesItemUICustomisation;

export default activitiesListUiCustomisation;
