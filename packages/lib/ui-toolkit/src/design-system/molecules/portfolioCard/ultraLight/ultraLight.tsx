import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { AccountInfo } from '../../accountInfo/accountInfo';

interface UltraLightCardProps {
  portfolioTitle: string;
  data?: {
    wallets: {
      icon: React.ReactElement | { uri: string };
    }[];
    accounts: {
      name: string;
      icon: React.ReactElement | { uri: string };
    }[];
  };
  price?: string;
  currency?: string;
  renderActions: () => React.JSX.Element;
}

export const UltraLightCard = ({
  portfolioTitle,
  data,
  price,
  currency,
  renderActions,
}: UltraLightCardProps) => {
  const styles = getStyles();

  return (
    <Column style={styles.content}>
      <Text.L>{portfolioTitle}</Text.L>
      <AccountInfo
        wallets={data?.wallets || []}
        accounts={data?.accounts || []}
      />
      {price && (
        <Column style={styles.container}>
          <Text.XL style={styles.price}>{price}</Text.XL>
          <Text.S variant="secondary" style={styles.currency}>
            {currency}
          </Text.S>
        </Column>
      )}

      {renderActions()}
    </Column>
  );
};

const getStyles = () =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      padding: spacing.S,
      gap: spacing.S,
    },
    container: {
      alignItems: 'center',
      marginVertical: spacing.M,
    },
    price: {
      textAlign: 'center',
      marginBottom: spacing.XS,
    },
    currency: {
      textAlign: 'center',
    },
  });
