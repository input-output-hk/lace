import type { ViewProps, ViewStyle } from 'react-native';

import React from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { spacing } from '../../../design-tokens';
import { Row, Column, Box, GraphicPortal, Text } from '../../atoms';

interface OnboardingTemplateProps extends ViewProps {
  headings?: {
    heading: string;
    description: string;
  };
  topBtns?: React.ReactElement;
  footer?: React.ReactElement | React.ReactElement[];
  withPortalAnimation?: boolean;
  scrollEnabled?: boolean;
  contentStyle?: ViewStyle;
  footerStyle?: ViewStyle;
}

export const DeprecatedOnboardingTemplate = ({
  headings,
  topBtns,
  children,
  withPortalAnimation = false,
  footer,
  scrollEnabled = false,
  contentStyle,
  footerStyle,
}: OnboardingTemplateProps) => {
  const { height, width } = useWindowDimensions();

  return (
    <Box
      style={{
        ...styles.box,
        ...(!withPortalAnimation && { paddingBottom: spacing.M }),
      }}>
      {!!withPortalAnimation && (
        <ImageBackground
          source={{ uri: GraphicPortal.Onboarding }}
          height={height}
          width={width}
          resizeMode="cover"
          style={[styles.imgBackground, { height: height, width: width }]}
        />
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 70}>
        <ScrollView
          contentContainerStyle={!scrollEnabled && styles.centeredContent}
          scrollEnabled={scrollEnabled}
          stickyHeaderIndices={topBtns ? [0] : undefined}>
          {!!topBtns && (
            <Row style={styles.row} justifyContent="space-between">
              {topBtns}
            </Row>
          )}
          <Box style={[styles.center, contentStyle]}>
            <Column justifyContent="center" style={styles.columnContent}>
              {headings && (
                <Column>
                  <Text.L testID="onboarding-step-heading">
                    {headings.heading}
                  </Text.L>
                  <Text.M testID="onboarding-step-description">
                    {headings.description}
                  </Text.M>
                </Column>
              )}
              {children}
            </Column>
          </Box>
        </ScrollView>
        <Row
          justifyContent="center"
          style={[styles.row, styles.footer, footerStyle]}>
          {footer}
        </Row>
      </KeyboardAvoidingView>
    </Box>
  );
};

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  flex: { flex: 1 },
  box: { padding: spacing.M },
  row: {
    height: 72,
  },
  footer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing.M,
  },
  centeredContent: {
    justifyContent: 'center',
    flex: 1,
    zIndex: 100,
    alignContent: 'center',
  },
  imgBackground: { flex: 1, position: 'absolute', top: -72, left: 0 },
  columnContent: { gap: spacing.L },
});
