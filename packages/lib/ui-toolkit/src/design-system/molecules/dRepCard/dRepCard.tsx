import { useTranslation } from '@lace-contract/i18n';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { spacing, useTheme } from '../../../design-tokens';
import { Avatar, Card, Row, Text, Column } from '../../atoms';
import { isWeb } from '../../util';

// Lovelace → ADA. Kept local to avoid a ui-toolkit → contract dependency
// (mirrors EpochsRewards); matches `@lace-contract/cardano-context`.
const ADA_DECIMALS = 6;
const VOTING_POWER_MAX_FRACTION_DIGITS = 2;

export type DRepCardProps = {
  drepId: string;
  amount: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
  name?: string;
  cip105DrepId?: string;
  votingPowerLovelace?: string;
  description?: string;
  avatarUri?: string;
};

const truncate = (s: string, head = 10, tail = 8): string =>
  s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;

// Formats via the shared, BigNumber-based, locale-aware path (matches the
// governance voting-power figures rendered elsewhere). Number() would lose
// precision on aggregate voting power past 2^53 lovelace and 'en-US' would
// give the wrong separators in non-English locales.
const lovelaceToAda = (lovelace: string): string =>
  `₳ ${formatAmountToLocale(
    lovelace,
    ADA_DECIMALS,
    VOTING_POWER_MAX_FRACTION_DIGITS,
  )}`;

export const DRepCard = ({
  drepId,
  amount,
  isActive,
  onPress,
  testID = 'drep-card',
  name,
  cip105DrepId,
  votingPowerLovelace,
  description,
  avatarUri,
}: DRepCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const isRegistered =
    cip105DrepId !== undefined || votingPowerLovelace !== undefined;

  return (
    <Pressable onPress={handlePress} style={styles.pressable}>
      <Card
        testID={testID}
        blur={!isWeb}
        cardStyle={[
          styles.card,
          { backgroundColor: theme.background.primary },
        ]}>
        <Row alignItems="center" justifyContent="space-between">
          <Avatar
            size={40}
            shape="rounded"
            content={{
              ...(avatarUri !== undefined && { img: { uri: avatarUri } }),
            }}
            fallbackIcon="User"
            style={styles.avatar}
            testID={`${testID}-avatar`}
          />
          <Column style={styles.info} gap={spacing.XS}>
            <Text.S testID={`${testID}-drep-id`} numberOfLines={1}>
              {isRegistered ? name ?? truncate(cip105DrepId ?? drepId) : drepId}
            </Text.S>
            {isRegistered ? (
              <>
                {name !== undefined && cip105DrepId !== undefined && (
                  <Text.XS
                    variant="secondary"
                    testID={`${testID}-cip105-id`}
                    numberOfLines={1}>
                    {truncate(cip105DrepId)}
                  </Text.XS>
                )}
                {votingPowerLovelace !== undefined && (
                  <Text.XS
                    variant="secondary"
                    testID={`${testID}-voting-power`}>
                    {lovelaceToAda(votingPowerLovelace)}
                  </Text.XS>
                )}
              </>
            ) : (
              <Text.XS variant="secondary" testID={`${testID}-amount`}>
                {amount}
              </Text.XS>
            )}
            {description !== undefined && (
              <Text.XS
                variant="secondary"
                testID={`${testID}-description`}
                numberOfLines={2}>
                {description}
              </Text.XS>
            )}
          </Column>
          <Text.XS
            style={[
              styles.badge,
              {
                color: isActive ? theme.data.positive : theme.data.negative,
                borderColor: isActive
                  ? theme.data.positive
                  : theme.data.negative,
              },
            ]}
            testID={`${testID}-status`}>
            {isActive
              ? t('v2.governance.drep-details.status.active')
              : t('v2.governance.drep-details.status.inactive')}
          </Text.XS>
        </Row>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  card: {
    padding: spacing.M,
    gap: spacing.XS,
  },
  avatar: {
    marginRight: spacing.S,
  },
  info: {
    flex: 1,
    marginRight: spacing.S,
  },
  badge: {
    paddingHorizontal: spacing.S,
    paddingVertical: spacing.XS,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
