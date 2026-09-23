import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Avatar,
  Column,
  Row,
  Sheet,
  Text,
  radius,
  spacing,
  truncateText,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatLocaleNumber } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLaceSelector } from '../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

const AVATAR_SIZE = 48;
/** truncateText(…, 13) → "addr1...x7k2q": each end long enough to tell accounts apart. */
const ADDRESS_LABEL_LENGTH = 13;

const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

/**
 * "R-Points by account" sheet (LW-15495 AC6), pushed from the explainer. The
 * R-Points card rolls every account into one wallet-wide figure, while RealFi
 * accounts points per account address — this sheet is the bridge, splitting
 * the card total by account. Rows read the same persisted snapshots the card
 * sums, so they always add up to the card figure; accounts RealFi reports no
 * points for are omitted (the footer note explains why).
 */
export const RealFiRPointsByAccount = (
  props: SheetScreenProps<SheetRoutes.RealFiRPointsByAccount>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const allRPoints = useLaceSelector('realfiPosition.selectAllRPoints');
  const accountAddresses = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );

  const rows = useMemo(() => {
    const accounts = Array.isArray(cardanoAccounts) ? cardanoAccounts : [];
    return accounts.flatMap(account => {
      const snapshot = allRPoints[account.accountId];
      if (!snapshot || snapshot.totalPoints <= 0) return [];
      const address = accountAddresses.find(
        entry => entry.accountId === account.accountId,
      )?.address;
      return [
        {
          accountId: account.accountId,
          name: account.metadata.name,
          avatarUri: account.metadata.avatarUri,
          address: address
            ? truncateText(address, ADDRESS_LABEL_LENGTH)
            : undefined,
          points: formatLocaleNumber(String(snapshot.totalPoints), 0),
        },
      ];
    });
  }, [cardanoAccounts, allRPoints, accountAddresses]);

  const onGotIt = useCallback(() => {
    NavigationControls.closeSheet();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.season.by-account.title')}
          leftIconOnPress={navigation.goBack}
          testID="r-points-by-account-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.season.explainer.got-it'),
            onPress: onGotIt,
            testID: 'r-points-by-account-got-it',
          }}
        />
      ),
    });
  }, [navigation, t, onGotIt]);

  return (
    <Sheet.Scroll contentContainerStyle={staticStyles.scrollContent}>
      <Column gap={spacing.L}>
        <Text.S align="center" testID="r-points-by-account-lead">
          {t('realfi.season.by-account.lead')}
        </Text.S>
        {rows.map(row => (
          <View
            key={row.accountId}
            style={styles.rowCard}
            testID={`r-points-by-account-row-${row.accountId}`}>
            <Row alignItems="center" gap={spacing.M}>
              <Avatar
                size={AVATAR_SIZE}
                shape="rounded"
                content={{
                  ...(row.avatarUri && { img: { uri: row.avatarUri } }),
                  fallback: row.name,
                }}
              />
              <Column style={styles.rowText}>
                {row.address ? (
                  <Text.S variant="secondary" numberOfLines={1}>
                    {row.address}
                  </Text.S>
                ) : null}
                <Text.M numberOfLines={1}>{row.name}</Text.M>
              </Column>
              <Row alignItems="center" gap={spacing.XS}>
                <Text.M testID={`r-points-by-account-points-${row.accountId}`}>
                  {row.points}
                </Text.M>
                <Text.S variant="tertiary">
                  {t('realfi.season.r-points.label')}
                </Text.S>
              </Row>
            </Row>
          </View>
        ))}
        <Text.S variant="tertiary" testID="r-points-by-account-note">
          {t('realfi.season.by-account.note')}
        </Text.S>
      </Column>
    </Sheet.Scroll>
  );
};

const staticStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.L,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    rowCard: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.M,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
  });
