import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Row, Text } from '../../atoms';
import { getAssetImageUrl } from '../../util';

/**
 * Props for the DappInfoCard component.
 */
interface DappInfoCardProps {
  /**
   * URL of the dApp's icon/logo image.
   * Falls back to the first letter of the name when absent, unloadable, or
   * refused by the toolkit's image rules.
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

const LOGO_SIZE = 36;
const LOGO_CONTAINER_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.M,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
  },
  logoContainer: {
    width: LOGO_CONTAINER_SIZE,
    height: LOGO_CONTAINER_SIZE,
    borderRadius: LOGO_CONTAINER_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
  },
});

/**
 * DappInfo component styled to match Lace's ConfirmData view.
 * Shows dApp icon, name, and URL with theme-aware styling.
 *
 * @param props - Component props
 * @returns React element containing the dApp info card
 */
export const DappInfoCard = ({ imageUrl, name, url }: DappInfoCardProps) => {
  const { theme } = useTheme();
  const [hasImgError, setImgError] = useState(false);
  // A dApp's favicon is whatever its own `<link rel=icon>` declares, so it is
  // attacker-chosen. The shared rules (ADR 42) proxy remote bytes and refuse an
  // svg `data:` payload (M-301) that a raw Image source would happily load.
  const logoUri = useMemo(() => getAssetImageUrl(imageUrl), [imageUrl]);

  const logoContainerStyle = useMemo(
    () => [
      styles.logoContainer,
      {
        backgroundColor: theme.background.secondary,
        borderColor: theme.border.middle,
      },
    ],
    [theme],
  );

  return (
    <Row alignItems="center" gap={spacing.S} style={styles.container}>
      <View style={logoContainerStyle} testID="dapp-info-logo-container">
        {logoUri && !hasImgError ? (
          <Image
            source={{ uri: logoUri }}
            style={styles.logo}
            resizeMode="cover"
            testID="dapp-info-logo"
            onError={() => {
              setImgError(true);
            }}
          />
        ) : (
          <Text.S testID="dapp-info-logo-fallback">
            {name.charAt(0).toUpperCase()}
          </Text.S>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text.S testID="dapp-info-name">{name}</Text.S>
        <Text.XS variant="secondary" testID="dapp-info-url">
          {url}
        </Text.XS>
      </View>
    </Row>
  );
};
