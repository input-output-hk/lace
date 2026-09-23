import { useTranslation } from '@lace-contract/i18n';
import {
  Avatar,
  Column,
  Divider,
  Icon,
  Logos,
  Row,
  Sheet,
  Text,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useDispatchLaceAction } from '../hooks';
import { useActiveRealFiConfig } from '../use-realfi-config';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const TOKEN_ICON_SIZE = 32;

type TokenOption =
  SheetScreenProps<SheetRoutes.RealFiSelectStakeToken>['route']['params']['tokens'][number];

/**
 * Stake-input token picker, opened from Manage Stake. Mirrors the swap
 * select-token sheet: a tappable list of the available stake inputs; picking one
 * records it (the `stakeInputTokenSelected` action Manage Stake reads) and
 * closes back to Manage Stake, and the header back button returns without a
 * change. The options are handed in as serializable params (already derived in
 * Manage Stake), so the sheet does not re-run the discovery.
 */
export const RealFiSelectStakeToken = (
  props: SheetScreenProps<SheetRoutes.RealFiSelectStakeToken>,
) => {
  const { navigation } = props;
  const { tokens, selectedTokenId } = props.route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const config = useActiveRealFiConfig();
  const selectToken = useDispatchLaceAction(
    'realfiPosition.stakeInputTokenSelected',
  );

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.select-token.title')}
          leftIconOnPress={navigation.goBack}
          testID="realfi-select-token-header"
        />
      ),
    });
  }, [navigation, t]);

  // USDr / sUSDr carry vector brand logos; everything else uses its wallet
  // raster icon (passed as a uri), falling back to an initial-letter avatar.
  const brandLogoFor = useCallback(
    (tokenId: string): React.ReactNode | undefined => {
      if (tokenId === config?.usdrTokenId)
        return <Logos.Usdr size={TOKEN_ICON_SIZE} />;
      if (tokenId === config?.susdrTokenId)
        return <Logos.Susdr size={TOKEN_ICON_SIZE} />;
      return undefined;
    },
    [config],
  );

  const onSelect = useCallback(
    (tokenId: string) => {
      // Record the pick (Manage Stake reads it) and return to Manage Stake.
      selectToken({ tokenId });
      navigation.goBack();
    },
    [selectToken, navigation],
  );

  const renderIcon = useCallback(
    (token: TokenOption): React.ReactNode => {
      const brand = brandLogoFor(token.tokenId);
      if (brand) return brand;
      return (
        <Avatar
          size={TOKEN_ICON_SIZE}
          shape="rounded"
          content={
            token.iconUri
              ? {
                  img: { uri: token.iconUri },
                  fallback: token.name.slice(0, 2).toUpperCase(),
                }
              : { fallback: token.name.slice(0, 2).toUpperCase() }
          }
        />
      );
    },
    [brandLogoFor],
  );

  return (
    <Sheet.Scroll contentContainerStyle={styles.content}>
      <Column>
        {tokens.map((token, index) => (
          <React.Fragment key={token.tokenId}>
            {index > 0 && <Divider />}
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(token.tokenId);
              }}
              testID={`realfi-select-token-${token.tokenId}`}>
              <Row alignItems="center" gap={spacing.M} style={styles.left}>
                {renderIcon(token)}
                <Text.M numberOfLines={1}>{token.name}</Text.M>
              </Row>
              <Row alignItems="center" gap={spacing.S}>
                <Text.S variant="secondary">
                  {formatAmountToLocale(token.available, token.decimals)}
                </Text.S>
                {token.tokenId === selectedTokenId && (
                  <Icon name="Tick" size={16} color={theme.text.primary} />
                )}
              </Row>
            </Pressable>
          </React.Fragment>
        ))}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.M,
    paddingTop: spacing.M,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.M,
    gap: spacing.M,
  },
  left: {
    flexShrink: 1,
  },
});
