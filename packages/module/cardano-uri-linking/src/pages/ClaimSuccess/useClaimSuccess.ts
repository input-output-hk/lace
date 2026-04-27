import { convertLovelacesToAda } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { Asset } from 'expo-asset';
import { useCallback, useMemo } from 'react';

import cardanoBlueLogo from '../../assets/cardano-blue.png';
import { useLaceSelector } from '../../hooks';

import type { StackScreenProps } from '@lace-lib/navigation';
import type { ClaimSuccessToken } from '@lace-lib/ui-toolkit';

export const useClaimSuccess = ({
  navigation,
}: StackScreenProps<StackRoutes.ClaimSuccess>) => {
  const { t } = useTranslation();
  const claimResponse = useLaceSelector(
    'cardanoUriLinking.selectClaimResponse',
  );
  const tokenMetadata = useLaceSelector(
    'cardanoUriLinking.selectTokenMetadata',
  );
  const nftMetadata = useLaceSelector('cardanoUriLinking.selectNftMetadata');

  const lovelaces = claimResponse?.lovelaces;
  const code = claimResponse?.code;

  const handleNavigateToHome = useCallback(() => {
    navigation.navigate(StackRoutes.Home, {
      screen: TabRoutes.Portfolio,
    });
  }, [navigation]);

  const shouldShowViewTransactionButton = useMemo(() => code === 202, [code]);

  const adaBalance = useMemo(() => {
    if (!lovelaces || Number(lovelaces) <= 0) return undefined;
    return convertLovelacesToAda(lovelaces);
  }, [lovelaces]);

  const adaLogo = useMemo(() => Asset.fromModule(cardanoBlueLogo).uri, []);

  const formattedTokens = useMemo<ClaimSuccessToken[]>(() => {
    const tokens = (tokenMetadata ?? []).map(token => ({
      assetId: token.assetId as string,
      name: token.name,
      balance: token.balance,
      image: token.image,
    }));
    const nfts = (nftMetadata ?? []).map(nft => ({
      assetId: nft.assetId as string,
      name: nft.name,
      balance: '1', // NFTs typically have balance of 1
      image: nft.image,
    }));
    return [...tokens, ...nfts];
  }, [tokenMetadata, nftMetadata]);

  const title = t('v2.cardano-uri-linking.claim-success.title');
  const description = t('v2.cardano-uri-linking.claim-success.description');
  const viewTransactionLabel = t('v2.generic.view-transaction');
  const doneLabel = t('v2.cardano-uri-linking.claim.button.done');

  return {
    claimResponse,
    adaBalance,
    adaLogo,
    shouldShowViewTransactionButton,
    tokens: formattedTokens,
    title,
    description,
    viewTransactionLabel,
    doneLabel,
    // TODO: add onViewTransaction action
    onViewTransaction: handleNavigateToHome,
    onDone: handleNavigateToHome,
  };
};
