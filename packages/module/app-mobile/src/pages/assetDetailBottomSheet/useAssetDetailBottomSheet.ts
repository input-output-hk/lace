import {
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import { useNftDetail } from './useNftDetail';
import { useTokenDetail } from './useTokenDetail';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const useAssetDetailBottomSheet = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.AssetDetailBottomSheet>) => {
  const selectedToken = route.params.token;
  const folders = useLaceSelector('tokenFolders.selectAllFolders');
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const networkType = useLaceSelector('network.selectNetworkType');

  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const {
    info: tokenInfo,
    headerTitle: nftHeaderTitle,
    theme: nftTheme,
    selectedNft: formattedSelectedNft,
    metadataItems: nftMetadataItems,
    onSendPress: nftOnSendPress,
    sendMenuLabel: nftSendMenuLabel,
  } = useNftDetail(selectedToken, folders);

  const { tokenDetailProps, tokenDetailsUICustomisation } = useTokenDetail({
    navigation,
    route,
    isTokenPricingEnabled,
  });

  return {
    selectedToken,
    tokenDetailProps,
    tokenDetailsUICustomisation,
    tokenInfo,
    nftHeaderTitle,
    nftTheme,
    formattedSelectedNft,
    nftMetadataItems,
    nftOnSendPress,
    nftSendMenuLabel,
    isTokenPricingEnabled,
  };
};
