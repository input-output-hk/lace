import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  spacing,
  Text,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { sanitiseSignTxError } from '../utils/sign-tx-error-details';

import type { SignTxErrorStage } from '../utils/sign-tx-error-details';

interface SignTxErrorProps {
  style?: StyleProp<ViewStyle>;
  error?: unknown;
  stage?: SignTxErrorStage;
}

export const SignTxError = ({
  style,
  error,
  stage = 'transaction inspection',
}: SignTxErrorProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Column
      alignItems="center"
      justifyContent="center"
      gap={spacing.L}
      style={style}
      testID="sign-tx-error">
      <Icon name="Sad" size={43} strokeWidth={2} />
      <Text.M>{t('dapp-connector.cardano.sign-tx.error-try-again')}</Text.M>
      <SignTxErrorBox error={error} stage={stage} />
    </Column>
  );
};

export const SignTxErrorBox = ({
  error,
  stage = 'signing',
}: Pick<SignTxErrorProps, 'error' | 'stage'>): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [copiedDetails, setCopiedDetails] = useState<string>();
  const details = JSON.stringify(sanitiseSignTxError(error, stage), null, 2);
  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      setCopiedDetails(details);
    },
  });
  const handleCopy = useCallback(() => {
    copyToClipboard(details);
  }, [copyToClipboard, details]);

  return (
    <Column
      gap={spacing.M}
      style={[
        styles.details,
        {
          backgroundColor: theme.background.secondary,
          borderColor: theme.border.middle,
        },
      ]}
      testID="sign-tx-error-details">
      <Text.S>{details}</Text.S>
      <TouchableOpacity
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={t('v2.generic.btn.copy')}
        testID="sign-tx-error-copy">
        <Text.S>
          {t(
            copiedDetails === details
              ? 'app.copied-to-clipboard'
              : 'v2.generic.btn.copy',
          )}
        </Text.S>
      </TouchableOpacity>
    </Column>
  );
};

const styles = StyleSheet.create({
  details: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.M,
  },
});
