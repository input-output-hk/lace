import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Column, Icon, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

export const SignDataError = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Column
      alignItems="center"
      justifyContent="center"
      gap={spacing.L}
      style={style}
      testID="sign-data-error">
      <Icon name="Sad" size={43} variant="solid" />
      <Text.M>{t('dapp-connector.cardano.sign-data.error-try-again')}</Text.M>
    </Column>
  );
};
