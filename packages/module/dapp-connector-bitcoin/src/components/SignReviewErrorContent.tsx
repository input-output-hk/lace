import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Column, Icon, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

export interface SignReviewErrorContentProps {
  style?: StyleProp<ViewStyle>;
  /** Test identifier, defaults to `sign-review-error` */
  testID?: string;
}

/**
 * Centered error state shown when a sign review request cannot be
 * processed, e.g. the dApp submitted a PSBT that fails to decode.
 */
export const SignReviewErrorContent = ({
  style,
  testID = 'sign-review-error',
}: SignReviewErrorContentProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Column
      alignItems="center"
      justifyContent="center"
      gap={spacing.L}
      style={style}
      testID={testID}>
      <Icon name="Sad" size={43} variant="solid" />
      <Text.M>{t('dapp-connector.bitcoin.error-try-again')}</Text.M>
    </Column>
  );
};
