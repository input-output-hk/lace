import type { ReactNode } from 'react';

import { Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DappConnectorLayoutV2 } from './DappConnectorLayoutV2';

type ButtonProps = {
  action: () => void;
  label: string;
  disabled?: boolean;
};

interface LayoutProps {
  children: ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
  title: string;
}

export const DappConnectorLayout = ({
  children,
  title,
  primaryButton,
  secondaryButton,
}: LayoutProps) => {
  return (
    <DappConnectorLayoutV2
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}>
      <Text.M testID="dapp-connector-title">{title}</Text.M>
      <View style={styles.content}>{children}</View>
    </DappConnectorLayoutV2>
  );
};

const styles = StyleSheet.create({
  content: {
    marginTop: 16,
  },
});
