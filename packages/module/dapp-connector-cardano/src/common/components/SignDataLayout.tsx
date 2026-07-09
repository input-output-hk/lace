import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Sheet, useTheme } from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';

import { SignDataContent } from './sign-data/SignDataContent';
import { SignTxLoadingContent } from './SignTxLoadingContent';
import { SignTxView } from './SignTxView';

import type { SignDataContentProps } from './sign-data/SignDataContent';

export interface SignDataLayoutProps {
  resultView: React.ReactNode | null;
  showLoading: boolean;
  contentProps: SignDataContentProps | null;
  onConfirm: () => void;
  onReject: () => void;
  confirmDisabled?: boolean;
  loadingStyle?: StyleProp<ViewStyle>;
}

/**
 * Shared shell for Sign Data (CIP-8): sheet header, scroll body, confirm/deny footer.
 * Used by mobile sheet and browser popup.
 */
export const SignDataLayout = ({
  resultView,
  showLoading,
  contentProps,
  onConfirm,
  onReject,
  confirmDisabled = false,
  loadingStyle,
}: SignDataLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const title = t('dapp-connector.cardano.sign-data.title');

  const isConfirmDisabled = confirmDisabled || showLoading || !contentProps;

  useEffect(() => {
    if (resultView != null) return;

    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('dapp-connector.cardano.sign-data.confirm'),
            onPress: onConfirm,
            iconColor: theme.brand.white,
            disabled: isConfirmDisabled,
          }}
          secondaryButton={{
            label: t('dapp-connector.cardano.sign-data.deny'),
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
    isConfirmDisabled,
    onConfirm,
    onReject,
    theme.brand.white,
    t,
  ]);

  const scrollContent =
    showLoading || !contentProps ? (
      <SignTxLoadingContent style={loadingStyle} />
    ) : (
      <SignDataContent {...contentProps} />
    );

  return <SignTxView resultView={resultView} scrollContent={scrollContent} />;
};
