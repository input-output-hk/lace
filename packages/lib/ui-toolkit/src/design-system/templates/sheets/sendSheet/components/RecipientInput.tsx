import React from 'react';
import { StyleSheet } from 'react-native';

import { radius, type Theme } from '../../../../../design-tokens';
import { CustomTextInput, Icon } from '../../../../atoms';
import { useSheetSubmit } from '../../../../organisms';
import { isWeb } from '../../../../util';

import type { SendSheetProps } from '../sendSheet';

interface RecipientInputProps {
  copies: Pick<SendSheetProps['copies'], 'recipientLabel'>;
  values: Pick<
    SendSheetProps['values'],
    'addressSelected' | 'selectedAccountId'
  >;
  utils: Pick<SendSheetProps['utils'], 'recipientErrorMessage' | 'theme'>;
  actions: Pick<
    SendSheetProps['actions'],
    'onContactsPress' | 'onQrCodePress' | 'onRecipientAddressChange'
  >;
  testIdPrefix: string;
}

export const RecipientInput = ({
  copies,
  utils,
  actions,
  values,
  testIdPrefix,
}: RecipientInputProps) => {
  const { recipientLabel } = copies;
  const { addressSelected } = values;
  const { recipientErrorMessage, theme } = utils;
  const { onQrCodePress, onContactsPress, onRecipientAddressChange } = actions;
  const submitProps = useSheetSubmit();

  const styles = getStyles(theme);

  const ctaButtons = [
    // QR code button - only on mobile
    ...(!isWeb
      ? [
          {
            icon: <Icon name="QrCode" />,
            onPress: onQrCodePress,
            style: styles.ctaButton,
            testID: `${testIdPrefix}-qr-code-button`,
          },
        ]
      : []),
    // Contacts button - on all platforms, only for chains with contact support
    ...(onContactsPress
      ? [
          {
            icon: <Icon name="User" />,
            onPress: onContactsPress,
            style: styles.ctaButton,
            isDisabled: !values.selectedAccountId,
            testID: `${testIdPrefix}-address-book-button`,
          },
        ]
      : []),
  ];

  return (
    <CustomTextInput
      value={addressSelected}
      label={recipientLabel}
      animatedLabel
      onChangeText={onRecipientAddressChange}
      testID={`${testIdPrefix}-recipient-address`}
      ctaButtons={ctaButtons}
      inputError={recipientErrorMessage}
      {...submitProps}
    />
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    ctaButton: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.rounded,
    },
  });
