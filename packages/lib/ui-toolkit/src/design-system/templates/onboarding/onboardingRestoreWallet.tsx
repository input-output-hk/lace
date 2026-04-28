import { useTranslation } from '@lace-contract/i18n';
import * as React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { spacing } from '../../../design-tokens';
import { Text, Box, Row } from '../../atoms';
import { NavigationHeader } from '../../molecules';
import {
  useAppForm,
  mnemonicFormOptions as defaultMnemonicFormOptions,
} from '../../organisms/mnemonicTextInput';
import { normalizePassphraseInput } from '../../templates/onboarding/utils';
import { KEYBOARD_VERTICAL_OFFSET, keyboardBehavior } from '../../util';

import { OnboardingLayout } from './OnboardingLayout';

const keyboardVerticalOffset = Number(KEYBOARD_VERTICAL_OFFSET);

interface OnboardingRestoreWalletProps {
  onBackPress: () => void;
  onNext: (passphrase: string) => void;
  validateMnemonic: (value: string) => boolean;
  instructionText: string;
  mnemonicFormOptions?: typeof defaultMnemonicFormOptions;
  nextButtonLabel: string;
  pasteButtonLabel: string;
  placeholderText: string;
  title: string;
  verificationErrorText: string;
}

export const OnboardingRestoreWallet = ({
  onBackPress,
  onNext,
  validateMnemonic,
  instructionText,
  mnemonicFormOptions = defaultMnemonicFormOptions,
  nextButtonLabel,
  pasteButtonLabel,
  placeholderText,
  title,
  verificationErrorText,
}: OnboardingRestoreWalletProps) => {
  const styles = createStyles();

  const form = useAppForm({
    ...mnemonicFormOptions,
  });

  const { t } = useTranslation();

  const verificationError =
    verificationErrorText ?? t('v2.recovery-phrase.verification.error');

  const handleNextPress = (passphrase: string) => {
    const normalizedInput = normalizePassphraseInput(passphrase);
    if (passphrase !== normalizedInput) {
      form.setFieldValue('passphrase', normalizedInput);
    }

    const isValid = validateMnemonic(normalizedInput);
    // Failsafe check to prevent user moving to next screen with invalid mnemonic
    if (isValid) {
      onNext(normalizedInput);
      return;
    }
    // Trigger TanStack Form error message
    void form.validateField('passphrase', 'blur');
  };

  const handleFieldValidationOnBlur = ({ value }: { value: string }) => {
    const normalizedInput = normalizePassphraseInput(value);
    if (value !== normalizedInput) {
      form.setFieldValue('passphrase', normalizedInput);
    }

    return validateMnemonic(normalizedInput) ? undefined : verificationError;
  };

  // This forces iOS to trigger onBlur event in the Mnemonic's TextInput
  const handleOutsideTap = () => {
    if (form.store.state.values.isTextInputFocused) {
      form.setFieldValue('isTextInputFocused', false);
    }
    Keyboard.dismiss();
  };

  return (
    <OnboardingLayout>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <TouchableWithoutFeedback
          accessible={false}
          onPress={handleOutsideTap}
          testID="mnemonic-outside-tap">
          <View style={styles.container}>
            <NavigationHeader title={title} onBackPress={onBackPress} />
            <Box style={styles.content}>
              <form.AppField
                name="passphrase"
                validators={{
                  onBlur: handleFieldValidationOnBlur,
                }}
                children={field => {
                  return (
                    <>
                      <Text.XS
                        variant="primary"
                        style={styles.instructionText}
                        align="center"
                        testID="onboarding-restore-wallet-subtitle">
                        {instructionText}
                      </Text.XS>

                      <Box style={styles.inputContainer}>
                        <field.MnemonicTextInput
                          testID="restore-passphrase-input"
                          placeholderText={placeholderText}
                        />
                      </Box>

                      <Row
                        gap={spacing.S}
                        justifyContent={'center'}
                        alignItems={'center'}>
                        <field.MnemonicPasteButton
                          pasteButtonLabel={pasteButtonLabel}
                        />

                        <field.MnemonicNextButton
                          nextButtonLabel={nextButtonLabel}
                          onPress={() => {
                            // Read passphrase from the store directly (not form.state which is a stale snapshot)
                            const currentPassphrase =
                              form.store.state.values.passphrase;
                            handleNextPress(currentPassphrase);
                          }}
                        />
                      </Row>
                    </>
                  );
                }}
              />
            </Box>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.L,
      paddingTop: spacing.XXL,
      paddingBottom: spacing.XXL,
      justifyContent: 'space-between',
    },
    instructionText: {
      marginBottom: spacing.XXL,
      paddingHorizontal: spacing.M,
    },
    inputContainer: {
      flex: 1,
      justifyContent: 'center',
    },
  });
