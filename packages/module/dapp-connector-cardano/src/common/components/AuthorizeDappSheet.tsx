import { useTranslation } from '@lace-contract/i18n';
import {
  Sheet,
  SheetFooter,
  SheetHeader,
  spacing,
  useFooterHeight,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { AuthorizeDappContent } from './AuthorizeDappContent';

import type { AuthorizeDappContentProps } from './AuthorizeDappContent';

export interface AuthorizeDappSheetProps extends AuthorizeDappContentProps {
  headerTitle: string;
  onAuthorize: () => void;
  onCancel: () => void;
}

export const AuthorizeDappSheet = (props: AuthorizeDappSheetProps) => {
  const { headerTitle, onAuthorize, onCancel, selectedAccount } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={headerTitle} />
      <Sheet.Scroll contentContainerStyle={styles.content}>
        <AuthorizeDappContent {...props} />
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          disabled: !selectedAccount,
          label: t('dapp-connector.cardano.authorize.button'),
          onPress: onAuthorize,
          iconColor: theme.brand.white,
        }}
        secondaryButton={{
          label: t('dapp-connector.cardano.authorize.cancel'),
          onPress: onCancel,
        }}
        showDivider={true}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.S,
      paddingBottom: footerHeight,
      paddingTop: spacing.S,
    },
  });
