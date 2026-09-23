import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Sheet, useTheme } from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';

import { SignTxContent } from './SignTxContent';
import { SignTxError } from './SignTxError';
import { SignTxLoadingContent } from './SignTxLoadingContent';
import { SignTxRefused } from './SignTxRefused';
import { SignTxView } from './SignTxView';
import { signTxCopy } from './useSignTxRefusal';

import type { SignTxRefusalDetails } from './sign-tx-refused-keys';
import type { SignTxContentProps } from './SignTxContent';

export interface SignTxLayoutProps {
  /** When non-null, only this is shown (result screen). */
  resultView: React.ReactNode | null;
  /** Show error state (error title + error content). */
  hasError: boolean;
  /**
   * When set, the collateral-ownership guard blocked this request, so the
   * sheet shows the REFUSED state -- refusal copy, the requesting origin, no
   * transaction detail, and NO confirm button (the `primaryButton` prop is
   * omitted entirely, the same idiom `hasError` already uses). Case and
   * origin travel together so neither can be rendered without the other.
   *
   * Distinct from `hasError` on purpose: a technical failure must keep
   * rendering the generic `error-title`/`error-try-again` copy, never the
   * `refused.*` copy.
   */
  refusal?: SignTxRefusalDetails | null;
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
  refusal = null,
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
  const navigation = useNavigation();

  const { titleKey, dismissLabelKey, shouldSuppressPrimary } = signTxCopy(
    refusal,
    hasError,
  );
  const title = t(titleKey);

  const isConfirmButtonDisabled =
    confirmDisabled || showLoading || !contentProps;

  useEffect(() => {
    if (resultView != null) return;

    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          primaryButton={
            shouldSuppressPrimary
              ? undefined
              : {
                  label: t('dapp-connector.cardano.sign-tx.confirm'),
                  testID: 'dapp-sign-tx-confirm-button',
                  onPress: onConfirm,
                  iconColor: theme.brand.white,
                  disabled: isConfirmButtonDisabled,
                }
          }
          secondaryButton={{
            label: t(dismissLabelKey),
            testID: 'dapp-sign-tx-reject-button',
            onPress: onReject,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    navigation,
    resultView,
    title,
    hasError,
    shouldSuppressPrimary,
    dismissLabelKey,
    isConfirmButtonDisabled,
    onConfirm,
    onReject,
    theme.brand.white,
    t,
  ]);

  let scrollContent: React.ReactNode;
  if (refusal) {
    // Precedence over `hasError`: a blocked transaction is refused, not
    // broken, and the two states never co-render.
    scrollContent = <SignTxRefused refusal={refusal} style={errorStyle} />;
  } else if (hasError) {
    scrollContent = <SignTxError style={errorStyle} />;
  } else if (showLoading || !contentProps) {
    scrollContent = <SignTxLoadingContent style={loadingStyle} />;
  } else {
    scrollContent = <SignTxContent {...contentProps} />;
  }

  return <SignTxView resultView={resultView} scrollContent={scrollContent} />;
};
