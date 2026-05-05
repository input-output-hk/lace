import {
  Sheet,
  SheetFooter,
  SheetHeader,
  spacing,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface SignTxViewPrimaryButton {
  label: string;
  onPress: () => void;
  iconColor: string;
  disabled?: boolean;
}

export interface SignTxViewSecondaryButton {
  label: string;
  onPress: () => void;
}

export interface SignTxViewProps {
  /** When set, only this is rendered (result screen). Otherwise header + scroll + footer. */
  resultView: React.ReactNode | null;
  /** Sheet header title when not showing result */
  title: string;
  /** Scroll body content when not showing result */
  scrollContent: React.ReactNode;
  /** Confirm button; undefined when e.g. error state */
  primaryButton: SignTxViewPrimaryButton | undefined;
  /** Cancel / secondary button */
  secondaryButton: SignTxViewSecondaryButton;
  /** Optional content container style for Sheet.Scroll */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Test ID for the scroll container */
  testID?: string;
}

const defaultStyles = StyleSheet.create({
  contentContainerFlex: {
    flexGrow: 1,
    width: '100%',
  },
  contentPaddingHorizontal: {
    paddingHorizontal: spacing.S,
  },
});

/**
 * Presentational SignTx shell: result screen OR sheet (header + scroll + footer).
 * Same layout as mobile SignTx; used by both mobile and browser.
 */
export const SignTxView = ({
  resultView,
  title,
  scrollContent,
  primaryButton,
  secondaryButton,
  contentContainerStyle,
  testID = 'sign-tx-sheet-scroll',
}: SignTxViewProps): React.ReactElement => {
  const footerHeight = useFooterHeight();
  const contentPaddingStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  if (resultView != null) {
    return <>{resultView}</>;
  }

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        testID={testID}
        contentContainerStyle={[
          defaultStyles.contentContainerFlex,
          defaultStyles.contentPaddingHorizontal,
          contentContainerStyle,
          contentPaddingStyle,
        ]}>
        {scrollContent}
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={
          primaryButton
            ? {
                label: primaryButton.label,
                onPress: primaryButton.onPress,
                iconColor: primaryButton.iconColor,
                disabled: primaryButton.disabled,
              }
            : undefined
        }
        secondaryButton={{
          label: secondaryButton.label,
          onPress: secondaryButton.onPress,
        }}
        showDivider={true}
      />
    </>
  );
};
