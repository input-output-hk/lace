import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import {
  Text,
  Divider,
  IconButton,
  Icon,
  Row,
  Column,
  Avatar,
} from '../../atoms';
import { getAssetImageUrl } from '../../util';

import type { IconName } from '../../atoms';

const SHEET_HEADER_HEIGHT = 60;
const AVATAR_SIZE = 20;

type HeaderAvatar = {
  metadata: {
    image?: string;
    fallback?: string;
  };
};

interface SheetHeaderProps {
  title: string;
  leftIcon?: IconName;
  leftIconOnPress?: () => void;
  subtitle?: string;
  testID?: string;
  headerIcon?: IconName;
  headerAvatar?: HeaderAvatar;
  showDivider?: boolean;
  height?: number;
}

export const SheetHeader = ({
  title,
  leftIcon = 'CaretLeft',
  leftIconOnPress,
  subtitle,
  headerIcon,
  headerAvatar,
  showDivider = true,
  height = SHEET_HEADER_HEIGHT,
  testID = 'sheet-header',
}: SheetHeaderProps) => {
  const avatarContent = useMemo(() => {
    const imageUrl = getAssetImageUrl(headerAvatar?.metadata?.image);
    return {
      fallback: headerAvatar?.metadata?.fallback,
      ...(imageUrl && { img: { uri: imageUrl } }),
    };
  }, [headerAvatar]);
  return (
    <Column testID={testID} style={{ height }}>
      <Row alignItems="center" justifyContent="center" style={styles.headerRow}>
        {leftIconOnPress && (
          <IconButton.Static
            icon={<Icon name={leftIcon} size={24} />}
            onPress={leftIconOnPress}
            containerStyle={styles.leftIcon}
            testID={`${testID}-left-icon`}
          />
        )}
        <Row
          alignItems="center"
          justifyContent="center"
          style={styles.titleContainer}
          gap={spacing.S}>
          {!!headerIcon && <Icon name={headerIcon} />}
          {!!headerAvatar && (
            <Avatar
              size={AVATAR_SIZE}
              shape="rounded"
              content={avatarContent}
            />
          )}
          <Text.S
            numberOfLines={1}
            style={styles.title}
            testID={`${testID}-title`}>
            {title}
          </Text.S>
        </Row>
      </Row>
      {showDivider && (
        <View style={styles.divider}>
          <Divider />
        </View>
      )}

      {subtitle && (
        <>
          <Text.S style={styles.subtitle} testID={`${testID}-subtitle`}>
            {subtitle}
          </Text.S>
        </>
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    position: 'relative',
  },
  leftIcon: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  titleContainer: { flex: 1 },
  title: {
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.M,
  },
  subtitle: {
    textAlign: 'center',
  },
});
