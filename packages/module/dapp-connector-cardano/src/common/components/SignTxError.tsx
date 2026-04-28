import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Column, Icon, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

export const SignTxError = ({
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
      style={style}>
      <Icon name="Sad" size={43} variant="solid" />
      <Text.M>{t('dapp-connector.cardano.sign-tx.error-try-again')}</Text.M>
    </Column>
  );
};
