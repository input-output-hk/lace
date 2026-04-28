import * as React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Column, Icon, Row, Text } from '../../atoms';

export interface ClaimErrorProps {
  title: string;
  errorMessage: string;
  errorLabel: string;
  errorCode?: number;
  iconSize: number;
  dismissLabel: string;
  onDismiss: () => void;
}

export const ClaimError = ({
  title,
  errorMessage,
  errorLabel,
  errorCode,
  iconSize,
  dismissLabel,
  onDismiss,
}: ClaimErrorProps) => (
  <Column
    justifyContent="space-between"
    style={styles.container}
    testID="claim-error-screen">
    <Text.L align="center" testID="claim-error-title">
      {title}
    </Text.L>
    <Column gap={spacing.L} justifyContent="center" alignItems="center">
      <Icon name="Sad" size={iconSize} />
      <Column gap={spacing.XS} justifyContent="center" alignItems="center">
        <Text.M align="center" variant="secondary" testID="claim-error-message">
          {errorMessage}
        </Text.M>
        {errorCode !== undefined && (
          <Row gap={spacing.S}>
            <Text.M align="center" variant="secondary">
              {errorLabel}
            </Text.M>
            <Text.M align="center" testID="claim-error-code">
              {errorCode}
            </Text.M>
          </Row>
        )}
      </Column>
    </Column>
    <Row>
      <Button.Primary
        fullWidth
        label={dismissLabel}
        onPress={onDismiss}
        testID="claim-error-dismiss-btn"
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
