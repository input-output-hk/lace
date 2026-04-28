import React from 'react';
import { StyleSheet } from 'react-native';

import { radius, spacing, useTheme, type Theme } from '../../../design-tokens';
import {
  Avatar,
  BlurView,
  Column,
  Icon,
  IconButton,
  Row,
  Text,
  type BlockchainIconName,
} from '../../atoms';

const CARD_HEIGHT = 80;
const AVATAR_SIZE = 42;

export type DAppCardProps = {
  name: string;
  description: string;
  avatarImage: string;
  blockchain?: BlockchainIconName;
  hasBlockchainLabel?: boolean;
  onDelete?: () => void;
};

export const DAppCard = ({
  name,
  description,
  avatarImage,
  blockchain,
  hasBlockchainLabel,
  onDelete,
}: DAppCardProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const renderActions = () => {
    const hasBlockchain = Boolean(blockchain);
    const hasDelete = Boolean(onDelete);

    if (!hasBlockchain && !hasDelete) return null;

    return (
      <Row alignItems="center" gap={spacing.S}>
        {blockchain ? (
          <>
            <Icon
              name={blockchain}
              size={16}
              variant="solid"
              testID="dapp-card-blockchain-icon"
            />
            {hasBlockchainLabel && (
              <Text.XS testID="dapp-card-blockchain-label">
                {blockchain}
              </Text.XS>
            )}
          </>
        ) : null}
        {onDelete ? (
          <IconButton.Static
            icon={
              <Icon
                name="Delete04"
                variant="stroke"
                size={16}
                strokeWidth={2}
              />
            }
            onPress={onDelete}
            containerStyle={styles.squaredButton}
            testID="dapp-card-delete-button"
          />
        ) : null}
      </Row>
    );
  };

  return (
    <BlurView style={styles.blurView}>
      <Row alignItems="center" gap={spacing.S} style={styles.cardRow}>
        <Avatar
          size={AVATAR_SIZE}
          shape="squared"
          content={{ fallback: name, img: { uri: avatarImage } }}
          testID="dapp-card-avatar"
        />
        <Column justifyContent="center" style={styles.content}>
          <Text.XS testID="dapp-card-name">{name}</Text.XS>
          <Text.XS variant="secondary" testID="dapp-card-description">
            {description}
          </Text.XS>
        </Column>
        {renderActions()}
      </Row>
    </BlurView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    blurView: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      height: CARD_HEIGHT,
      width: '100%',
      alignSelf: 'stretch',
      /** 16px — `spacing.M`, 4px grid */
      paddingHorizontal: spacing.M,
      overflow: 'hidden',
    },
    cardRow: {
      flex: 1,
      width: '100%',
      minHeight: 0,
    },
    content: {
      flex: 1,
      minHeight: 0,
    },
    squaredButton: {
      borderRadius: radius.XS,
    },
  });
