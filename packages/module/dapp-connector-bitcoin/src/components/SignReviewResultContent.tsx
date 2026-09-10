import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  Sheet,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@lace-lib/ui-toolkit';

/**
 * Outcome states the sign review result screen can show.
 */
export type SignReviewResultState = 'failure' | 'success';

/**
 * Props for the SignReviewResultContent component.
 */
export interface SignReviewResultContentProps {
  /** Which outcome to show */
  state: SignReviewResultState;
  /** Flow-specific description translation key for the shown outcome */
  descriptionKey: TranslationKey;
  /** Handler called when the user presses the Close button */
  onClose: () => void;
  /** Test identifier prefix */
  testID?: string;
}

const STATE_CONFIGS: Record<
  SignReviewResultState,
  { icon: IconName; titleKey: TranslationKey }
> = {
  success: {
    icon: 'RelievedFace',
    titleKey: 'dapp-connector.bitcoin.result.success.title',
  },
  failure: {
    icon: 'Sad',
    titleKey: 'dapp-connector.bitcoin.result.failure.title',
  },
};

/**
 * Result screen shown in the sign review sheets after signing finishes.
 * Sets the sheet header and a footer with a single Close button via
 * navigation options, mirroring the Cardano dApp connector's result screen.
 */
export const SignReviewResultContent = ({
  state,
  descriptionKey,
  onClose,
  testID,
}: SignReviewResultContentProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const config = STATE_CONFIGS[state];
  const headerTitle = t(config.titleKey);

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={headerTitle} showDivider={true} />,
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: t('dapp-connector.bitcoin.result.close'),
            onPress: onClose,
            testID: testID ? `${testID}-close-button` : undefined,
          }}
          showDivider={true}
        />
      ),
    });
  }, [navigation, headerTitle, t, onClose, testID]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.contentWrapper}>
      <Column>
        <Column
          gap={spacing.M}
          alignItems="center"
          style={styles.content}
          justifyContent="center"
          testID={testID ? `${testID}-content` : undefined}>
          <View
            style={styles.iconContainer}
            testID={testID ? `${testID}-icon` : undefined}>
            <Icon
              name={config.icon}
              size={64}
              variant="stroke"
              color={theme.text.primary}
            />
          </View>

          <Text.M
            variant="secondary"
            align="center"
            testID={testID ? `${testID}-description` : undefined}>
            {t(descriptionKey)}
          </Text.M>
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    paddingHorizontal: spacing.L,
  },
  content: {
    paddingVertical: spacing.XXXXL,
  },
  iconContainer: {
    marginBottom: spacing.M,
  },
});
