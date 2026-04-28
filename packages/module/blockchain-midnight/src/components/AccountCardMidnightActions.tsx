import { useTranslation } from '@lace-contract/i18n';
import { getDustTokenTickerByNetwork } from '@lace-contract/midnight-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  ActionButton,
  isExtensionSidePanel,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { parseLocaleNumber } from '@lace-lib/util-render';
import React, { useCallback, useMemo } from 'react';

import { useLaceSelector } from '../hooks';

import type { MidnightDustData } from '../hooks';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { Token } from '@lace-contract/tokens';

interface AccountCardMidnightActionsProps {
  accountId: string;
  dustData: MidnightDustData | undefined;
  showTitle?: boolean;
  nightToken: Token<MidnightSpecificTokenMetadata> | undefined;
}

export const AccountCardMidnightActions = ({
  accountId,
  dustData,
  showTitle,
  nightToken,
}: AccountCardMidnightActionsProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const networkType = useLaceSelector('network.selectNetworkType');
  const dustTicker = useMemo(
    () => dustData?.ticker || getDustTokenTickerByNetwork(networkType),
    [dustData?.ticker, networkType],
  );

  const hasNightBalance = useMemo(
    () => nightToken?.available != null && BigInt(nightToken.available) > 0n,
    [nightToken],
  );
  const isDesignatedForDust = useMemo(() => {
    if (!dustData) return false;
    return Number.parseFloat(parseLocaleNumber(dustData.max || '0')) > 0;
  }, [dustData]);

  // TODO in LW-14544: Re-enable re-designation when external designation is supported
  const isGenerateDustDisabled = isDesignatedForDust || !hasNightBalance;
  const dustActionLabel = isDesignatedForDust
    ? t('v2.midnight.account-card.generating-dust', { dustTicker })
    : t('v2.midnight.account-card.generate-dust', { dustTicker });

  const shouldShowTitle = showTitle ?? !isExtensionSidePanel;

  const handleGenerateDustPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.DustDesignation, {
      accountId: AccountId(accountId),
    });
  }, [accountId]);

  const actionButtonStyle = useMemo(
    () => ({ backgroundColor: 'transparent' as const }),
    [],
  );
  const disabledActionButtonStyle = useMemo(
    () => [
      { backgroundColor: 'transparent' as const },
      { backgroundColor: theme.background.tertiary },
    ],
    [theme],
  );

  return (
    <ActionButton
      icon="Dust"
      title={dustActionLabel}
      showTitle={shouldShowTitle}
      onPress={handleGenerateDustPress}
      disabled={isGenerateDustDisabled}
      containerStyle={
        isGenerateDustDisabled ? disabledActionButtonStyle : actionButtonStyle
      }
      testID="account-card-generate-dust-button"
    />
  );
};
