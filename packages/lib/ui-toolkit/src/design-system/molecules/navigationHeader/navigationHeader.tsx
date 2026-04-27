import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Text, Row, Button } from '../../atoms';

export interface NavigationHeaderProps {
  title?: string;
  onBackPress?: () => void;
  testID?: string;
}

export const NavigationHeader = ({
  title,
  onBackPress,
  testID = 'navigation-header',
}: NavigationHeaderProps) => {
  const styles = getStyles();

  return (
    <View testID={testID}>
      <Row
        alignItems="center"
        justifyContent="space-between"
        style={styles.content}>
        {onBackPress ? (
          <Button.Secondary
            preIconName="CaretLeft"
            size="small"
            onPress={onBackPress}
            testID={`${testID}-back-button`}
          />
        ) : (
          <View style={styles.spacer} />
        )}

        {!!title && (
          <Text.L
            variant="primary"
            align="center"
            style={styles.title}
            testID={`${testID}-title`}>
            {title}
          </Text.L>
        )}

        <View style={styles.spacer} />
      </Row>
    </View>
  );
};

const getStyles = () =>
  StyleSheet.create({
    content: {
      padding: spacing.M,
    },
    title: {
      flex: 1,
      textAlign: 'center',
    },
    spacer: {
      width: spacing.XXL, // Approximate button width
    },
  });
