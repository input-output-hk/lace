import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import {
  type SheetScreenProps,
  type SheetRoutes,
  NavigationControls,
} from '@lace-lib/navigation';
import {
  isWeb,
  shareString,
  useCopyToClipboard,
  useTheme,
  getBlockchainColor,
} from '@lace-lib/ui-toolkit';
import { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { AccountSettingsUICustomisation } from '@lace-contract/account-management';
import type { BlockchainName } from '@lace-lib/util-store';

/**
 * Generic AccountKey hook for all blockchains.
 * Uses getPublicKeys UICustomisation per blockchain when available.
 */
export const useAccountKey = ({
  route,
}: SheetScreenProps<SheetRoutes.AccountKey>) => {
  const { walletId, accountId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const shouldShowShareButton = !isWeb;
  const showToast = useDispatchLaceAction('ui.showToast');

  const currentAccount = useLaceSelector('wallets.selectAccountById', {
    walletId,
    accountId,
  });

  const blockchainName = currentAccount?.blockchainName;
  const [accountSettingsUICustomisation] = useUICustomisation(
    'addons.loadAccountSettingsUICustomisations',
    currentAccount ?? { blockchainName: 'Unknown' as BlockchainName },
  ) as [AccountSettingsUICustomisation | undefined];

  const qrCodeBgColor = blockchainName
    ? getBlockchainColor(blockchainName)
    : undefined;

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      showToast({
        text: t('v2.account-settings.your-keys.copied-success'),
        color: 'positive',
        duration: 3,
        leftIcon: {
          name: 'Checkmark',
          size: 20,
          color: theme.brand.white,
        },
      });
    },
    onError: () => {
      showToast({
        text: t('v2.account-settings.your-keys.copied-error'),
        color: 'negative',
        duration: 3,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
          color: theme.brand.white,
        },
      });
    },
  });

  const handleShare = useCallback(
    (value: string) => {
      void shareString(value);
    },
    [shareString],
  );

  const handleDone = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  return {
    title: t('v2.account-settings.your-keys.public-key'),
    PublicKeysSupplier: accountSettingsUICustomisation?.PublicKeysSupplier,
    currentAccount,
    chainType: blockchainName,
    qrCodeBgColor,
    copyButtonLabel: t('v2.account-settings.your-keys.copy'),
    shareButtonLabel: t('v2.account-settings.your-keys.share'),
    doneButtonLabel: t('v2.account-settings.your-keys.done'),
    onCopy: copyToClipboard,
    onShare: handleShare,
    onDone: handleDone,
    doneButtonTestID: 'account-key-done-button',
    shouldShowShareButton,
  };
};
