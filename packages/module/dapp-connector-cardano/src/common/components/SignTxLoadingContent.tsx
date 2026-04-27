import type { StyleProp, ViewStyle } from 'react-native';

import { Column, Loader, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';

export const SignTxLoadingContent = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}): React.ReactElement => {
  const { theme } = useTheme();
  return (
    <Column alignItems="center" justifyContent="center" style={style}>
      <Loader size={36} color={theme.text.primary} />
    </Column>
  );
};
