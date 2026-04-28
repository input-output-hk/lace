import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Column, Icon, Row, Text } from '../../atoms';
import { hexToRgba, openUrl } from '../../util';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

export type DappDetailsSocialLinksSectionProps = {
  title: string;
  links: Array<{ type: string; url: string }>;
};

const getSocialAccentColor = (type: string, theme: Theme) => {
  switch (type.toLowerCase()) {
    case 'discord':
      return theme.brand.support;
    case 'github':
      return theme.brand.orange;
    case 'medium':
      return theme.brand.yellow;
    case 'telegram':
      return theme.brand.pinkish;
    case 'twitter':
      return theme.brand.ascending;
    default:
      return theme.brand.ascending;
  }
};

const SocialLinkItem = memo(({ type, url }: { type: string; url: string }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const accentColor = useMemo(
    () => getSocialAccentColor(type, theme),
    [theme, type],
  );

  const iconName = useMemo(
    () => (type.charAt(0).toUpperCase() + type.slice(1)) as IconName,
    [type],
  );

  const onPress = useCallback(() => {
    void openUrl({
      url,
      onError: () => {
        // TODO: handle error
      },
    });
  }, [url]);

  return (
    <Pressable onPress={onPress}>
      <Row
        testID="dapp-details-social-link-wrapper"
        style={[staticStyles.socialLinkRow, styles.socialLinkRow]}>
        <View
          style={[
            staticStyles.socialLinkIconWrapper,
            { backgroundColor: hexToRgba(accentColor, 0.12) },
          ]}>
          <Icon
            testID="dapp-details-social-link-icon"
            name={iconName}
            size={16}
            color={accentColor}
          />
        </View>
        <Column style={staticStyles.socialLinkContent}>
          <Text.XS
            testID="dapp-details-social-link-type"
            style={styles.socialLinkType}
            variant="secondary">
            {type}
          </Text.XS>
          <Text.S
            testID="dapp-details-social-link-url"
            style={[staticStyles.socialLinkUrl, styles.socialLinkUrl]}>
            {url}
          </Text.S>
        </Column>
        <Icon name="ArrowUpRight" size={16} color={accentColor} />
      </Row>
    </Pressable>
  );
});

export const DappDetailsSocialLinksSection = memo(
  ({ title, links }: DappDetailsSocialLinksSectionProps) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    return (
      <Column
        style={staticStyles.section}
        testID="dapp-details-social-links-wrapper">
        <Text.M
          testID="dapp-details-social-links-title"
          variant="secondary"
          style={[staticStyles.sectionTitle, styles.sectionTitle]}>
          {title}
        </Text.M>
        {links.map((link, index) => (
          <SocialLinkItem
            key={`${link.type}-${index}`}
            type={link.type}
            url={link.url}
          />
        ))}
      </Column>
    );
  },
);

const staticStyles = StyleSheet.create({
  section: {
    gap: spacing.M,
  },
  sectionTitle: {
    marginBottom: spacing.XS,
  },
  socialLinkRow: {
    gap: spacing.M,
    alignContent: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.M,
  },
  socialLinkIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.rounded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkContent: {
    display: 'flex',
    flex: 1,
  },
  socialLinkUrl: {
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      color: theme.text.primary,
    },
    socialLinkType: {
      textTransform: 'capitalize',
      color: theme.text.secondary,
    },
    socialLinkRow: {
      borderRadius: radius.M,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border.middle,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      backgroundColor: theme.background.primary,
    },
    socialLinkUrl: {
      color: theme.brand.ascending,
    },
  });
