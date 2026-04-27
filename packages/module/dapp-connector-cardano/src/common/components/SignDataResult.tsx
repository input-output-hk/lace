import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  Sheet,
  SheetFooter,
  SheetHeader,
  spacing,
  Text,
  useFooterHeight,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@lace-lib/ui-toolkit';

export type SignDataResultState =
  | 'failure'
  | 'rejected'
  | 'signing'
  | 'success';

export interface SignDataResultProps {
  state: SignDataResultState;
  onClose: () => void;
  /** Override the default title translation key (e.g. for HW-specific errors). */
  titleKey?: TranslationKey;
  /** Override the default description translation key. */
  descriptionKey?: TranslationKey;
  testID?: string;
}

interface ResultStateConfig {
  icon: IconName;
  iconVariant: 'solid' | 'stroke';
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  getIconColor: (theme: ReturnType<typeof useTheme>['theme']) => string;
}

const RESULT_STATE_CONFIGS: Record<SignDataResultState, ResultStateConfig> = {
  success: {
    icon: 'RelievedFace',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-data.result.success.title',
    descriptionKey:
      'dapp-connector.cardano.sign-data.result.success.description',
    getIconColor: theme => theme.text.primary,
  },
  failure: {
    icon: 'Sad',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-data.result.failure.drawer-title',
    descriptionKey: 'dapp-connector.cardano.sign-data.result.failure.body',
    getIconColor: theme => theme.text.primary,
  },
  rejected: {
    icon: 'Sad',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-data.result.rejected.title',
    descriptionKey:
      'dapp-connector.cardano.sign-data.result.rejected.description',
    getIconColor: theme => theme.text.primary,
  },
  signing: {
    icon: 'Clock',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-data.result.signing.title',
    descriptionKey:
      'dapp-connector.cardano.sign-data.result.signing.description',
    getIconColor: theme => theme.text.primary,
  },
};

export const SignDataResult = ({
  state,
  onClose,
  titleKey,
  descriptionKey,
  testID,
}: SignDataResultProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, footerHeight),
    [theme, footerHeight],
  );

  const config = RESULT_STATE_CONFIGS[state];
  const iconColor = config.getIconColor(theme);
  const resolvedTitleKey = titleKey ?? config.titleKey;
  const resolvedDescriptionKey = descriptionKey ?? config.descriptionKey;

  return (
    <>
      <SheetHeader title={t(resolvedTitleKey)} showDivider={true} />
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
                variant={config.iconVariant}
                color={iconColor}
              />
            </View>

            <Text.M
              variant="secondary"
              align="center"
              testID={testID ? `${testID}-description` : undefined}>
              {t(resolvedDescriptionKey)}
            </Text.M>
          </Column>
        </Column>
      </Sheet.Scroll>

      <SheetFooter
        secondaryButton={
          state === 'signing'
            ? undefined
            : {
                label: t('dapp-connector.cardano.sign-data.result.close'),
                onPress: onClose,
                testID: testID ? `${testID}-close-button` : undefined,
              }
        }
        showDivider={true}
      />
    </>
  );
};

const getStyles = (
  _theme: ReturnType<typeof useTheme>['theme'],
  footerHeight: number,
) =>
  StyleSheet.create({
    contentWrapper: {
      paddingBottom: footerHeight,
      paddingHorizontal: spacing.L,
    },
    content: {
      paddingVertical: spacing.XXXXL,
    },
    iconContainer: {
      marginBottom: spacing.M,
    },
  });
