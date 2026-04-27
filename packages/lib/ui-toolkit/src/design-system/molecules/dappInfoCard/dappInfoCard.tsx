import type { CSSProperties } from 'react';
import type { ImageStyle, ViewStyle } from 'react-native';

import { Flex, Text, useTheme } from '@input-output-hk/lace-ui-toolkit';
import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Props for the DappInfoCard component.
 */
interface DappInfoCardProps {
  /**
   * URL of the dApp's icon/logo image.
   * If not provided, displays the first letter of the name as fallback.
   */
  imageUrl?: string;
  /**
   * Display name of the dApp.
   */
  name: string;
  /**
   * Origin URL of the dApp (e.g., "https://example.com").
   */
  url: string;
}

const logoStyle: ImageStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
};

const textContainerStyle: ViewStyle = {
  flex: 1,
  marginLeft: 8,
};

const styles = StyleSheet.create({
  logo: logoStyle,
  textContainer: textContainerStyle,
});

/**
 * DappInfo component styled to match Lace's ConfirmData view.
 * Shows dApp icon, name, and URL with theme-aware styling.
 *
 * @param props - Component props
 * @returns React element containing the dApp info card
 */
export const DappInfoCard = ({ imageUrl, name, url }: DappInfoCardProps) => {
  const { vars } = useTheme();

  const logoContainerStyle: CSSProperties = useMemo(
    () => ({
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: vars.colors.$card_elevated_backgroundColor,
      border: `1px solid ${vars.colors.$card_outlined_borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }),
    [vars],
  );

  const fallbackTextStyle: CSSProperties = useMemo(
    () => ({
      fontSize: 16,
      fontWeight: 600,
      color: vars.colors.$text_primary,
    }),
    [vars],
  );

  return (
    <Flex alignItems="center" gap="$8" mb="$16">
      <div style={logoContainerStyle} data-testid="dapp-info-logo-container">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.logo}
            resizeMode="cover"
            testID="dapp-info-logo"
          />
        ) : (
          <span style={fallbackTextStyle} data-testid="dapp-info-logo-fallback">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <View style={styles.textContainer}>
        <Text.Body.Normal weight="$semibold" data-testid="dapp-info-name">
          {name}
        </Text.Body.Normal>
        <Text.Body.Small data-testid="dapp-info-url">{url}</Text.Body.Small>
      </View>
    </Flex>
  );
};
