import { Sheet, footerHeight, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

export interface SignSheetScrollProps {
  /** Test ID for the scroll container, following the sheet's own naming */
  testID: string;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
});

/**
 * Scroll chrome shared by the Bitcoin dApp sign review sheets. Mirrors the
 * Cardano dApp connector's SignTxView so both blockchains' side panels share
 * the same margins and leave room for the sheet footer.
 */
export const SignSheetScroll = ({ testID, children }: SignSheetScrollProps) => (
  <Sheet.Scroll
    showsVerticalScrollIndicator={false}
    testID={testID}
    contentContainerStyle={styles.content}>
    {children}
  </Sheet.Scroll>
);
