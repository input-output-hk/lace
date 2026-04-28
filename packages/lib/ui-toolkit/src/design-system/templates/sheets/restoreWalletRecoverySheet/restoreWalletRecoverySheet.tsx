import React, { useCallback, useEffect } from 'react';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Row, Text } from '../../../atoms';
import { SheetHeader } from '../../../molecules';
import { Sheet } from '../../../organisms';
import {
  mnemonicFormOptions,
  useAppForm,
} from '../../../organisms/mnemonicTextInput';

export type RestoreWalletRecoverySheetTemplateProps = {
  title: string;
  instructionText: string;
  placeholderText: string;
  pasteButtonLabel: string;
  nextButtonLabel: string;
  validator: (value: string) => string | undefined;
  onNext: (passphrase: string) => void;
  initialPassphrase?: string;
  testID?: string;
  inputTestID?: string;
};

export const RestoreWalletRecoverySheetTemplate = ({
  title,
  instructionText,
  placeholderText,
  pasteButtonLabel,
  nextButtonLabel,
  validator,
  onNext,
  initialPassphrase = '',
  testID = 'restore-wallet-recovery-sheet',
  inputTestID = 'restore-wallet-recovery-input',
}: RestoreWalletRecoverySheetTemplateProps) => {
  const form = useAppForm({
    ...mnemonicFormOptions,
    defaultValues: {
      ...mnemonicFormOptions.defaultValues,
      passphrase: initialPassphrase,
    },
  });

  useEffect(() => {
    if (form.store.state.values.passphrase !== initialPassphrase) {
      form.setFieldValue('passphrase', initialPassphrase);
    }
  }, [initialPassphrase]);

  const normalize = useCallback((value: string) => {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }, []);

  const handleNext = useCallback(
    (value: string) => {
      const normalized = normalize(value);
      const updateFieldValue = () => {
        if (value !== normalized) {
          form.setFieldValue('passphrase', normalized);
        }
      };

      const error = validator(normalized);
      if (!error) {
        updateFieldValue();
        onNext(normalized);
        return;
      }

      updateFieldValue();
      void form.validateField('passphrase', 'blur');
    },
    [normalize, onNext, validator],
  );

  const handleBlur = useCallback(
    ({ value }: { value: string }) => {
      const normalized = normalize(value);
      if (value !== normalized) {
        form.setFieldValue('passphrase', normalized);
      }
      return validator(normalized);
    },
    [normalize, validator],
  );

  const handleOutsideTap = useCallback(() => {
    if (form.store.state.values.isTextInputFocused) {
      form.setFieldValue('isTextInputFocused', false);
    }
    Keyboard.dismiss();
  }, []);

  return (
    <Sheet.Scroll
      testID={testID}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <SheetHeader title={title} testID={`${testID}-header`} />

      <TouchableWithoutFeedback
        accessible={false}
        onPress={handleOutsideTap}
        testID={`${testID}-touchable`}>
        <View style={styles.form}>
          <form.AppField
            name="passphrase"
            validators={{
              onBlur: handleBlur,
            }}>
            {field => (
              <>
                <View style={styles.body}>
                  <Text.XS
                    variant="primary"
                    style={styles.instructionText}
                    testID={`${testID}-instructions`}>
                    {instructionText}
                  </Text.XS>
                  <View style={styles.inputContainer}>
                    <field.MnemonicTextInput
                      isWithinBottomSheet
                      placeholderText={placeholderText}
                      testID={inputTestID}
                    />
                  </View>
                </View>
                <View style={styles.footer}>
                  <Row gap={spacing.S} justifyContent="center">
                    <field.MnemonicPasteButton
                      pasteButtonLabel={pasteButtonLabel}
                    />
                    <field.MnemonicNextButton
                      nextButtonLabel={nextButtonLabel}
                      onPress={() => {
                        handleNext(form.store.state.values.passphrase);
                      }}
                    />
                  </Row>
                </View>
              </>
            )}
          </form.AppField>
        </View>
      </TouchableWithoutFeedback>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.L,
    paddingBottom: spacing.XXL,
    gap: spacing.XL,
  },
  form: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.XL,
  },
  instructionText: {
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  footer: {
    marginTop: spacing.XL,
  },
});

export default RestoreWalletRecoverySheetTemplate;
