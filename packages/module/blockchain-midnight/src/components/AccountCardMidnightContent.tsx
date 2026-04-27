import { useTranslation } from '@lace-contract/i18n';
import { getDustTokenTickerByNetwork } from '@lace-contract/midnight-context';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  CustomTag,
  Row,
  Column,
  Text,
  TokenGroupSummary,
  spacing,
  isExtensionSidePanel,
  isWeb,
  type ColorType,
} from '@lace-lib/ui-toolkit';
import {
  parseLocaleNumber,
  shouldCompactDustValue,
} from '@lace-lib/util-render';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useLaceSelector } from '../hooks';

import { DustTankProgressIndicator } from './DustTankProgressIndicator';

import type { DustTankStatus, MidnightDustData } from '../hooks';

interface AccountCardMidnightContentProps {
  accountId: string;
  dustData: MidnightDustData | undefined;
}

export const AccountCardMidnightContent = ({
  accountId,
  dustData,
}: AccountCardMidnightContentProps) => {
  const { t } = useTranslation();
  const networkType = useLaceSelector('network.selectNetworkType');
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );

  const tokens = useMemo(() => {
    const accountTokens =
      tokensGroupedByAccount[AccountId(accountId)]?.fungible ?? [];
    return accountTokens.map(token => ({
      name: token.displayLongName,
      ...(token.metadata?.image && { icon: { uri: token.metadata.image } }),
    }));
  }, [tokensGroupedByAccount, accountId]);

  const dustTicker =
    dustData?.ticker || getDustTokenTickerByNetwork(networkType);

  const midnightLabels = useMemo(
    () => ({
      dustTankEmpty: t('v2.midnight.account-card.dust-tank-empty', {
        dustTicker,
      }),
      dustTankRefilling: String(
        t('v2.midnight.account-card.dust-tank-refilling'),
      ),
      dustTankFilled: t('v2.midnight.account-card.dust-tank-filled'),
      dustTankDecaying: String(
        t('v2.midnight.account-card.dust-tank-decaying'),
      ),
    }),
    [t, dustTicker],
  );

  const current = dustData?.current ?? '0';
  const max = dustData?.max ?? '0';
  const status: DustTankStatus = dustData?.status ?? 'empty';
  const timeRemaining = dustData?.timeRemaining;

  const tagColorMap: Record<DustTankStatus, ColorType> = {
    filled: 'positive',
    refilling: 'primary',
    decaying: 'neutral',
    empty: 'negative',
  };

  const tagLabelMap: Record<DustTankStatus, string> = {
    filled: midnightLabels.dustTankFilled,
    refilling: `${midnightLabels.dustTankRefilling}${
      timeRemaining ? ` (${timeRemaining})` : ''
    }`,
    decaying: `${midnightLabels.dustTankDecaying}${
      timeRemaining ? ` (${timeRemaining})` : ''
    }`,
    empty: midnightLabels.dustTankEmpty,
  };

  const tagColor = tagColorMap[status];
  const tagLabel = tagLabelMap[status] ?? midnightLabels.dustTankEmpty;

  const shouldShowProgressIndicator =
    status === 'refilling' || status === 'decaying';

  const shouldStackDustValues = useMemo(() => {
    const isDustValueLong =
      shouldCompactDustValue(current) || shouldCompactDustValue(max);
    return (isExtensionSidePanel || !isWeb) && isDustValueLong;
  }, [current, max]);

  const currentValue = Number.parseFloat(parseLocaleNumber(current)) || 0;
  const maxValue = Number.parseFloat(parseLocaleNumber(max)) || 0;

  const renderDustValues = () => (
    <>
      <Text.S
        numberOfLines={1}
        accessibilityLabel={current}
        selectable
        style={styles.dustValue}
        testID="dust-tank-current-value">
        {current}
      </Text.S>
      <Text.XS
        variant="secondary"
        numberOfLines={1}
        accessibilityLabel={max}
        selectable
        style={styles.dustValue}
        testID="dust-tank-max-value">
        / {max} {dustTicker}
      </Text.XS>
    </>
  );

  return (
    <Row
      justifyContent="space-between"
      alignItems="center"
      gap={spacing.S}
      style={styles.midnightInfoRow}>
      <Row style={styles.midnightTokensWrapper}>
        <TokenGroupSummary tokens={tokens} type="tokens" />
      </Row>
      <Column
        gap={spacing.XS}
        alignItems="center"
        style={styles.dustTankContainer}>
        {shouldStackDustValues ? (
          <Column alignItems="center" style={styles.dustValuesStack}>
            {renderDustValues()}
          </Column>
        ) : (
          <Row
            gap={spacing.XS}
            alignItems="center"
            style={styles.dustValuesRow}>
            {renderDustValues()}
          </Row>
        )}
        <CustomTag
          size="S"
          color={tagColor}
          backgroundType="semiTransparent"
          label={tagLabel}
          testID="dust-tank-tag"
          icon={
            shouldShowProgressIndicator && (
              <DustTankProgressIndicator
                current={currentValue}
                max={maxValue}
                status={status}
                size={12}
              />
            )
          }
        />
      </Column>
    </Row>
  );
};

const styles = StyleSheet.create({
  midnightInfoRow: {
    width: '100%',
  },
  midnightTokensWrapper: {
    flex: 1,
    minWidth: 0,
  },
  dustTankContainer: {
    flexShrink: 1,
    minWidth: 0,
  },
  dustValuesRow: {
    maxWidth: '100%',
  },
  dustValuesStack: {
    maxWidth: '100%',
    gap: 2,
  },
  dustValue: {
    flexShrink: 1,
    maxWidth: '100%',
  },
});
