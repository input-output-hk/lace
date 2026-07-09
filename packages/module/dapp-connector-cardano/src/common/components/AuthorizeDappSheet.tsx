import { Sheet, spacing } from '@lace-lib/ui-toolkit';
import { footerHeight } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import { AuthorizeDappContent } from './AuthorizeDappContent';

import type { AuthorizeDappContentProps } from './AuthorizeDappContent';

export interface AuthorizeDappSheetProps extends AuthorizeDappContentProps {
  headerTitle: string;
  onAuthorize: () => void;
  onCancel: () => void;
}

export const AuthorizeDappSheet = (props: AuthorizeDappSheetProps) => {
  const styles = getStyles();

  return (
    <Sheet.Scroll contentContainerStyle={styles.content}>
      <AuthorizeDappContent {...props} />
    </Sheet.Scroll>
  );
};

const getStyles = () =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.M,
      paddingTop: spacing.S,
      paddingBottom: footerHeight.horizontal,
    },
  });
