import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';

import { SignTxContent } from './SignTxContent';
import { SignTxError } from './SignTxError';
import { SignTxLoadingContent } from './SignTxLoadingContent';
import { SignTxView } from './SignTxView';

import type { SignTxContentProps } from './SignTxContent';

export interface SignTxLayoutProps {
  /** When non-null, only this is shown (result screen). */
  resultView: React.ReactNode | null;
  /** Show error state (error title + error content). */
  hasError: boolean;
  /** Show loading spinner instead of content. */
  showLoading: boolean;
  /** When present and not loading/error, show SignTxContent with these props. */
  contentProps: SignTxContentProps | null;
  onConfirm: () => void;
  onReject: () => void;
  confirmDisabled?: boolean;
  /** Optional style for loading content container. */
  loadingStyle?: StyleProp<ViewStyle>;
  /** Optional style for error content container. */
  errorStyle?: StyleProp<ViewStyle>;
}

/**
 * Shared layout for Sign Tx flow: composes result view, title, scroll content
 * (error / loading / transaction content), and action buttons.
 * Used by both browser and mobile Sign Tx screens.
 */
export const SignTxLayout = ({
  resultView,
  hasError,
  showLoading,
  contentProps,
  onConfirm,
  onReject,
  confirmDisabled = false,
  loadingStyle,
  errorStyle,
}: SignTxLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const title = hasError
    ? t('dapp-connector.cardano.sign-tx.error-title')
    : t('dapp-connector.cardano.sign-tx.title');

  let scrollContent: React.ReactNode;
  if (hasError) {
    scrollContent = <SignTxError style={errorStyle} />;
  } else if (showLoading || !contentProps) {
    scrollContent = <SignTxLoadingContent style={loadingStyle} />;
  } else {
    scrollContent = <SignTxContent {...contentProps} />;
  }

  const isConfirmButtonDisabled =
    confirmDisabled || showLoading || !contentProps;

  return (
    <SignTxView
      resultView={resultView}
      title={title}
      scrollContent={scrollContent}
      primaryButton={
        hasError
          ? undefined
          : {
              label: t('dapp-connector.cardano.sign-tx.confirm'),
              onPress: onConfirm,
              iconColor: theme.brand.white,
              disabled: isConfirmButtonDisabled,
            }
      }
      secondaryButton={{
        label: t('dapp-connector.cardano.sign-tx.cancel'),
        onPress: onReject,
      }}
    />
  );
};
