import {
  Button,
  Column,
  CustomTextInput,
  Row,
  spacing,
  Text,
  TokenItem,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Token } from '@lace-contract/tokens';
import type { FeeEntry } from '@lace-lib/ui-toolkit';

interface DustDesignationFormProps {
  dustAddress: string;
  addressLabel: string;
  addressError: string | null;
  insufficientDustError: string | null;
  nightToken: Token | null;
  nightTokenTicker: string;
  dustTokenTicker: string;
  formattedNightBalance: string;
  estimatedFee: FeeEntry[];
  isFormValid: boolean;
  copies: {
    formDescription: string;
    dustStartsLabel: string;
    dustStartsValue: string;
    estimatedFeeLabel: string;
    designateButtonLabel: string;
  };
  onAddressChange: (value: string) => void;
  onDesignate: () => void;
}

export const DustDesignationForm = ({
  dustAddress,
  addressLabel,
  addressError,
  insufficientDustError,
  nightToken,
  nightTokenTicker,
  dustTokenTicker,
  formattedNightBalance,
  estimatedFee,
  isFormValid,
  copies,
  onAddressChange,
  onDesignate,
}: DustDesignationFormProps) => {
  const styles = useStyles();

  const feeDisplay =
    estimatedFee.length > 0
      ? `${estimatedFee[0].amount} ${estimatedFee[0].token.displayShortName}`
      : `0.00 ${dustTokenTicker}`;

  return (
    <Column style={styles.container} gap={spacing.L}>
      <Text.S style={styles.description}>{copies.formDescription}</Text.S>

      <CustomTextInput
        isWithinBottomSheet
        value={dustAddress}
        label={addressLabel}
        animatedLabel
        onChangeText={onAddressChange}
        inputError={addressError ?? undefined}
        testID="dust-address-input"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TokenItem
        logo={nightToken?.metadata?.image}
        name={nightTokenTicker}
        balance={formattedNightBalance}
        currency=""
        variant="secondary"
        testID="dust-designation-token"
      />

      <Column gap={spacing.M}>
        <Row style={styles.infoRow}>
          <Text.S style={styles.label}>{copies.dustStartsLabel}</Text.S>
          <Text.S>{copies.dustStartsValue}</Text.S>
        </Row>

        <Row style={styles.infoRow}>
          <Text.S style={styles.label}>{copies.estimatedFeeLabel}</Text.S>
          <Text.S>{feeDisplay}</Text.S>
        </Row>

        {insufficientDustError && (
          <Text.S style={styles.errorText}>{insufficientDustError}</Text.S>
        )}
      </Column>

      <View style={styles.buttonContainer}>
        <Button.Primary
          label={copies.designateButtonLabel}
          onPress={onDesignate}
          disabled={!isFormValid}
          testID="designate-button"
        />
      </View>
    </Column>
  );
};

const useStyles = () => {
  const { theme } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: spacing.XL,
    },
    description: {
      color: theme.text.secondary,
    },
    label: {
      color: theme.text.secondary,
    },
    errorText: {
      color: theme.data.negative,
    },
    buttonContainer: {
      marginTop: 'auto',
      paddingTop: spacing.L,
    },
    infoRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
};
