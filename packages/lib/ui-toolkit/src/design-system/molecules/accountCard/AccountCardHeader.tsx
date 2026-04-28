import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Icon, Avatar, Text, Row, Column } from '../../atoms';

import type { BlockchainName } from '@lace-lib/util-store';

export type AccountCardHeaderProps = {
  avatarImage?: { uri: string };
  accountName: string;
  accountType: string;
  blockchain: BlockchainName;
  isShielded?: boolean;
  showAvatar?: boolean;
  trailing?: React.ReactNode;
};

export const AccountCardHeader: React.FC<AccountCardHeaderProps> = ({
  avatarImage,
  accountName,
  accountType,
  blockchain,
  isShielded,
  showAvatar = true,
  trailing,
}) => (
  <Row alignItems="center" justifyContent="space-between" gap={spacing.M}>
    <Row alignItems="center" gap={spacing.S} style={styles.fillSpace}>
      {showAvatar && (
        <Avatar
          size={38}
          shape="rounded"
          content={{ img: avatarImage, fallback: accountName }}
        />
      )}
      <Column style={styles.fillSpace}>
        <Row alignItems="center" gap={spacing.S}>
          <Icon name={blockchain} width={15} height={15} />
          <Text.S numberOfLines={2} testID="account-card-account-name">
            {accountName}
          </Text.S>
        </Row>
        <Row alignItems="center" gap={spacing.S}>
          {isShielded && <Icon name="Shield" size={12} />}
          <Text.XS numberOfLines={1} testID="account-card-account-type">
            {accountType}
          </Text.XS>
        </Row>
      </Column>
    </Row>
    {trailing}
  </Row>
);

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
});
