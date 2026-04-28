import * as React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Column, Row, Text } from '../../atoms';
import { DropdownMenu } from '../../molecules';

export interface ClaimPayloadDropdownItem {
  id: string;
  text: string;
}

export interface ClaimPayloadProps {
  domain: string;
  description: string;
  cancelLabel: string;
  ctaLabel: string;
  isLoading: boolean;
  dropdownItems: ClaimPayloadDropdownItem[];
  selectedAccountId: string | undefined;
  selectedAccountName: string | undefined;
  onSelectAccount: (index: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const ClaimPayload = ({
  domain,
  description,
  cancelLabel,
  ctaLabel,
  isLoading,
  dropdownItems,
  selectedAccountId,
  selectedAccountName,
  onSelectAccount,
  onCancel,
  onSubmit,
}: ClaimPayloadProps) => (
  <Column
    justifyContent="space-between"
    style={styles.container}
    testID="claim-payload-screen">
    <DropdownMenu
      selectedItemId={selectedAccountId}
      items={dropdownItems}
      title={selectedAccountName}
      onSelectItem={onSelectAccount}
      testID="claim-payload-account-dropdown"
    />
    <Column justifyContent="center" alignItems="center" gap={spacing.M}>
      <Text.L align="center" testID="claim-payload-domain">
        {domain}
      </Text.L>
      <Text.M align="center">{description}</Text.M>
    </Column>
    <Row gap={spacing.S}>
      <Button.Secondary
        flex={1}
        label={cancelLabel}
        onPress={onCancel}
        testID="claim-payload-cancel-btn"
      />
      <Button.Primary
        label={ctaLabel}
        flex={1}
        onPress={onSubmit}
        disabled={isLoading}
        loading={isLoading}
        testID="claim-payload-submit-btn"
      />
    </Row>
  </Column>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.XXL,
  },
});
