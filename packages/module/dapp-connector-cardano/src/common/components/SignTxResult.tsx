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

/**
 * Result state types for the SignTx flow.
 */
export type SignTxResultState = 'failure' | 'rejected' | 'signing' | 'success';

/**
 * Error details for failure state.
 */
export interface SignTxErrorDetails {
  /** Error message describing what went wrong */
  message?: string;
  /** Error code from the dApp or wallet API */
  code?: string;
}

/**
 * Props for the SignTxResult component.
 */
export interface SignTxResultProps {
  /** Current result state */
  state: SignTxResultState;
  /** Handler called when user clicks the close button */
  onClose: () => void;
  /** DApp name for contextual messaging; falls back to dappOrigin when absent */
  dappName?: string;
  /** DApp origin URL used as fallback when dappName is unavailable */
  dappOrigin?: string;
  /** Override the default title translation key (e.g. for HW-specific errors). */
  titleKey?: TranslationKey;
  /** Override the default description translation key. */
  descriptionKey?: TranslationKey;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Configuration for each result state's visual presentation.
 */
interface ResultStateConfig {
  icon: IconName;
  iconVariant: 'solid' | 'stroke';
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  getIconColor: (theme: ReturnType<typeof useTheme>['theme']) => string;
}

const FAILURE_DRAWER_TITLE_KEY =
  'dapp-connector.cardano.sign-tx.result.failure.drawer-title';
const FAILURE_BODY_KEY = 'dapp-connector.cardano.sign-tx.result.failure.body';

const RESULT_STATE_CONFIGS: Record<SignTxResultState, ResultStateConfig> = {
  success: {
    icon: 'RelievedFace',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-tx.result.success.title',
    descriptionKey: 'dapp-connector.cardano.sign-tx.result.success.description',
    getIconColor: theme => theme.text.primary,
  },
  failure: {
    icon: 'Sad',
    iconVariant: 'stroke',
    titleKey: FAILURE_DRAWER_TITLE_KEY,
    descriptionKey: FAILURE_BODY_KEY,
    getIconColor: theme => theme.text.primary,
  },
  rejected: {
    icon: 'Sad',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-tx.result.rejected.title',
    descriptionKey:
      'dapp-connector.cardano.sign-tx.result.rejected.description',
    getIconColor: theme => theme.text.primary,
  },
  signing: {
    icon: 'Clock',
    iconVariant: 'stroke',
    titleKey: 'dapp-connector.cardano.sign-tx.result.signing.title',
    descriptionKey: 'dapp-connector.cardano.sign-tx.result.signing.description',
    getIconColor: theme => theme.text.primary,
  },
};

/**
 * Result screen component for the SignTx flow.
 * Displays success, failure, or rejection states after the user completes
 * or cancels a transaction signing request.
 */
export const SignTxResult = ({
  state,
  onClose,
  dappName,
  dappOrigin,
  titleKey,
  descriptionKey,
  testID,
}: SignTxResultProps): React.ReactElement => {
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

  const headerTitle = t(resolvedTitleKey);

  const resolvedDappName =
    dappName ??
    dappOrigin ??
    t('dapp-connector.cardano.sign-tx.result.dapp-name-fallback', {
      defaultValue: 'the dApp',
    });
  const descriptionInterpolation =
    state === 'failure' ? undefined : { dappName: resolvedDappName };

  return (
    <>
      <SheetHeader title={headerTitle} showDivider={true} />
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
              {t(resolvedDescriptionKey, descriptionInterpolation)}
            </Text.M>
          </Column>
        </Column>
      </Sheet.Scroll>

      <SheetFooter
        secondaryButton={
          state === 'signing'
            ? undefined
            : {
                label: t('dapp-connector.cardano.sign-tx.result.close'),
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
