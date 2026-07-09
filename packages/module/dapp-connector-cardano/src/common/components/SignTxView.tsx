import { Sheet, footerHeight, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface SignTxViewProps {
  /** When set, only this is rendered (result screen). Otherwise scroll content. */
  resultView: React.ReactNode | null;
  /** Scroll body content when not showing result */
  scrollContent: React.ReactNode;
  /** Optional content container style for Sheet.Scroll */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Test ID for the scroll container */
  testID?: string;
}

const defaultStyles = StyleSheet.create({
  contentContainerFlex: {
    flexGrow: 1,
    width: '100%',
  },
  contentPadding: {
    paddingHorizontal: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
});

/**
 * Presentational SignTx shell: result screen OR scroll content.
 * Header and footer are set by the parent layout via navigation.setOptions.
 */
export const SignTxView = ({
  resultView,
  scrollContent,
  contentContainerStyle,
  testID = 'sign-tx-sheet-scroll',
}: SignTxViewProps): React.ReactElement => {
  if (resultView != null) {
    return <>{resultView}</>;
  }

  return (
    <Sheet.Scroll
      showsVerticalScrollIndicator={false}
      testID={testID}
      contentContainerStyle={[
        defaultStyles.contentContainerFlex,
        defaultStyles.contentPadding,
        contentContainerStyle,
      ]}>
      {scrollContent}
    </Sheet.Scroll>
  );
};
