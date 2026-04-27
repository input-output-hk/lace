import { useTranslation } from '@lace-contract/i18n';
import { TokenId } from '@lace-contract/tokens';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import type { Folder, Token } from '@lace-contract/tokens';

export const useNftDetail = (token?: Token | null, folders?: Folder[]) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const foldersMap = useMemo(
    () => new Map(folders?.map(folder => [folder.id, folder])),
    [folders],
  );

  const selectedNft = token;

  const folderIds = useLaceSelector(
    'tokenFolders.selectFolderIdsByTokenId',
    selectedNft ? TokenId(selectedNft.tokenId) : TokenId(''),
  );

  const sendMenuLabel = t('v2.menu.send');
  const headerTitle = selectedNft?.metadata?.name || t('v2.nft-detail.title');

  const accountId = useLaceSelector(
    'wallets.selectActiveAccountContext',
  )?.accountId;

  const metadataItems = Object.entries(
    selectedNft?.metadata?.additionalProperties ?? {},
  ).map(([label, value]) => ({
    label,
    value,
    testID: label.toLowerCase().replace(/\s+/g, '-'),
  }));

  const onSendPress = useCallback(() => {
    if (selectedNft) {
      NavigationControls.sheets.navigate(SheetRoutes.Send, {
        accountId,
        assetsSelected: [selectedNft],
      });
    }
  }, [selectedNft, accountId]);

  const formattedSelectedNft = {
    metadata: {
      image: selectedNft?.metadata?.image || '',
    },
  };

  const blockchainSpecific: { policyId?: string } = selectedNft?.metadata
    ?.blockchainSpecific ?? { policyId: '' };

  const info = {
    policyId: blockchainSpecific.policyId ?? '',
    assetId: selectedNft?.tokenId.toString() ?? '',
    mediaUrl: selectedNft?.metadata?.image ?? '',
    folderIds:
      folderIds
        .map(id => foldersMap.get(id)?.name)
        .filter(Boolean)
        .join(', ') ?? '',
  };

  return {
    info,
    theme,
    sendMenuLabel,
    headerTitle,
    metadataItems: selectedNft ? metadataItems : [],
    onSendPress,
    selectedNft: formattedSelectedNft,
  };
};
