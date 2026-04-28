import type { ComponentType } from 'react';

import type { ActivityType } from './const';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AppConfig } from '@lace-contract/module';
import type {
  MetadataByTokenId,
  StoredTokenMetadata,
  TokenId,
} from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';
import type { BigNumber, Timestamp } from '@lace-sdk/util';

type BlockchainSpecificPart<BlockchainSpecificMetadata = unknown> = {
  blockchainSpecific?: BlockchainSpecificMetadata;
};

export type Activity<BlockchainSpecificMetadata = unknown> =
  BlockchainSpecificPart<BlockchainSpecificMetadata> & {
    accountId: AccountId;
    activityId: string;
    timestamp: Timestamp;
    tokenBalanceChanges: Array<{ tokenId: TokenId; amount: BigNumber }>;
    type: ActivityType;
  };

export type RewardActivity<BlockchainSpecificMetadata = unknown> = Omit<
  Activity<BlockchainSpecificMetadata>,
  'type'
> & {
  type: ActivityType.Rewards;
};

export type ActivityDetail<BlockchainSpecificMetadata = unknown> =
  Activity<BlockchainSpecificMetadata> & {
    fee: string;
    address: string;
  };

export type ActivityDetailsSheetUICustomisation = UICustomisation<
  {
    ActivityDetailsContent: ComponentType<ActivityDetailsContentProps>;
  },
  { blockchainName: BlockchainName }
>;

export type ActivityDetailsContentProps = {
  activityDetail: ActivityDetail | undefined;
  activityId: string;
  explorerUrl: string;
  address: AnyAddress | undefined;
  accountId: AccountId;
  getMainTokenBalanceChange?: GetActivityTokenBalanceChange;
  tokensMetadataByTokenId: MetadataByTokenId;
};

export type ActivitiesListUICustomisation = UICustomisation<{
  ActivitiesList: ComponentType<{
    items: Activity[];
    tokensMetadataByTokenId: MetadataByTokenId;
  }>;
}>;

/**
 * The data required to represent a token balance change in a transaction bundle
 */
export type ActivityTokenBalanceChange = {
  tokenId: TokenId;
  token: StoredTokenMetadata | undefined;
  amount: BigNumber;
};

export type TokensInfoSummary = {
  title: {
    amount: string;
    label: string;
  };
  subtitle?: string;
};

export type GetActivityTokenBalanceChange = (
  tokenBalanceChanges: Array<ActivityTokenBalanceChange>,
) => ActivityTokenBalanceChange | undefined;

export type GetActivityTokensInfoSummary = (
  tokenBalanceChanges: Array<ActivityTokenBalanceChange>,
  translations: {
    nfts: string;
    tokens: string;
    mixed: string;
    unknownToken: string;
  },
) => TokensInfoSummary;

export type ActivitiesItemUICustomisation<AddressData = unknown> =
  UICustomisation<
    {
      getExplorerUrl: (params: {
        config?: AppConfig;
        address: AnyAddress<AddressData>;
        activityId: Activity['activityId'];
      }) => string;
      /**
       * Some blockchains allow for transaction bundles including various tokens.
       * Returns the "main" token balance change that should be displayed in the
       * activity history (e.g: ADA for Cardano).
       */
      getMainTokenBalanceChange?: GetActivityTokenBalanceChange;
      /**
       * Some blockchains allow for transaction bundles including various tokens.
       * Returns the tokens info summary that should be displayed in the
       * activity history (e.g: NFTs for Cardano).
       */
      getTokensInfoSummary?: GetActivityTokensInfoSummary;

      /**
       * Some blockchains require a specific action when an activity is clicked
       * (e.g: navigate to transaction explorer)
       */
      onActivityClick?: (params: {
        config?: AppConfig;
        address: AnyAddress<AddressData>;
        activityId: Activity['activityId'];
      }) => void;
    },
    {
      blockchainName: BlockchainName;
    }
  >;

export type ActivityOfTokenUICustomisation = UICustomisation<{
  activityPagePath: string;
}>;
