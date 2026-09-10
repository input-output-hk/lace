import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Column,
  KEYBOARD_VERTICAL_OFFSET,
  keyboardBehavior,
  ProgressBar,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassNavButton } from './GlassNavButton';
import { wizardText } from './wizard-styles';

/** Width of the reading column. Text past this stops being comfortable to read. */
const CONTENT_MAX_WIDTH = 480;
const GUTTER = 24;

/** Header corners. Icon-only: the labels name them for assistive tech. */
const NAV_ICON = { back: 'CaretLeft', secondary: 'Cancel' } as const;

export interface WizardFrameProps {
  /** e.g. "Step 3 of 6" — omitted on intro/done/failed screens. */
  stepLabel?: string;
  /** 0-100. Draws the progress rail; omit on screens outside the sequence. */
  stepProgress?: number;
  /** "New wallet" / "Old wallet" tag, so the user knows which seed a step concerns. */
  walletTag?: string;
  title: string;
  children: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  /**
   * Returns to the previous step, as the header's top-left control. The label
   * is not drawn — the button is an icon — but it names the control for
   * assistive tech, so it still has to read as an action.
   */
  backLabel?: string;
  onBack?: () => void;
  /** Leaves the wizard, as the header's top-right control. Icon-only, as above. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /**
   * Freezes both exits while an irreversible dispatch is in flight, so a step
   * cannot be rewound between the tap and the transition acknowledging it.
   */
  navigationDisabled?: boolean;
  /** Makes back ask first, where returning discards work the step generated. */
  confirmBack?: boolean;
  /** Makes the secondary ask first, where leaving discards typed or saved work. */
  confirmSecondary?: boolean;
  /**
   * Makes the primary ask first. Needed where the primary is itself an exit
   * rather than an advance: guarding only the secondary leaves the dominant
   * button as the unguarded route to the same discard, and teaches that the
   * quieter one is the costly path.
   */
  confirmPrimary?: boolean;
  testID: string;
}

/**
 * Shared chrome for every wizard step.
 *
 * Editorial rather than dialog: content is top-justified in a single reading
 * column with no card around it, since the wizard owns the whole screen for the
 * length of a migration. Navigation is a page-level header pinned above that
 * column, owning orientation and reversibility so no step can ship without
 * them: numbered label, progress rail, and Back distinct from Cancel.
 */
export const WizardFrame = ({
  stepLabel,
  stepProgress,
  walletTag,
  title,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  backLabel,
  onBack,
  secondaryLabel,
  onSecondary,
  navigationDisabled = false,
  confirmBack = false,
  confirmPrimary = false,
  confirmSecondary = false,
  testID,
}: WizardFrameProps) => {
  const { theme, layoutSize } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Which exit raised the confirmation, so the prompt can name the consequence
  // of that exit rather than of leaving in general.
  const [pendingExit, setPendingExit] = useState<
    'back' | 'primary' | 'secondary'
  >();

  // A phone gets a reading order: header, then straight into the content. On a
  // desktop window the same column top-justified strands it against the top
  // edge with the rest of the screen empty, so there it centres instead.
  const isCompact = layoutSize === 'compact';

  // A step change swaps the content under a confirmation raised for the
  // previous one. Drop it so the new step never renders mid-prompt.
  useEffect(() => {
    setPendingExit(undefined);
  }, [testID]);

  // Strip the press event before invoking the handler. Button.onPress passes a
  // synthetic press event as its first argument; if the handler is a raw action
  // dispatcher (e.g. a `useDispatchLaceAction(...)` result), that circular
  // event becomes the action payload and stack-overflows the UI→SW
  // toSerializableObject path.
  const handlePrimary = useCallback(() => {
    if (confirmPrimary) {
      setPendingExit('primary');
      return;
    }
    onPrimary?.();
  }, [confirmPrimary, onPrimary]);

  const handleBack = useCallback(() => {
    if (confirmBack) {
      setPendingExit('back');
      return;
    }
    onBack?.();
  }, [confirmBack, onBack]);

  const handleSecondary = useCallback(() => {
    if (confirmSecondary) {
      setPendingExit('secondary');
      return;
    }
    onSecondary?.();
  }, [confirmSecondary, onSecondary]);

  const handleConfirmExit = useCallback(() => {
    setPendingExit(undefined);
    if (pendingExit === 'back') onBack?.();
    else if (pendingExit === 'primary') onPrimary?.();
    else onSecondary?.();
  }, [onBack, onPrimary, onSecondary, pendingExit]);

  const handleDismissExit = useCallback(() => {
    setPendingExit(undefined);
  }, []);

  const hasHeader = Boolean(
    (backLabel && onBack) || (secondaryLabel && onSecondary) || stepLabel,
  );
  const hasHeaderBlock = hasHeader || stepProgress !== undefined;

  // An absent corner still renders its slot, so the step label stays optically
  // centred against the one opposite it.
  const navButton = (
    slot: keyof typeof NAV_ICON,
    label?: string,
    onPress?: () => void,
  ) =>
    label && onPress ? (
      <GlassNavButton
        iconName={NAV_ICON[slot]}
        accessibilityLabel={label}
        disabled={navigationDisabled || pendingExit !== undefined}
        onPress={onPress}
        testID={`${testID}-${slot}`}
      />
    ) : (
      <View style={styles.navSlot} />
    );

  // Rendered in one of two places depending on layout, so it is built once here
  // rather than duplicated into both branches.
  const headerContent = (
    <>
      {hasHeader && (
        <Row style={styles.navRow}>
          {navButton('back', backLabel, onBack && handleBack)}
          {stepLabel ? (
            <Text.XS variant="tertiary">{stepLabel}</Text.XS>
          ) : (
            <View />
          )}
          {navButton(
            'secondary',
            secondaryLabel,
            onSecondary && handleSecondary,
          )}
        </Row>
      )}
      {stepProgress !== undefined && (
        <View style={styles.rail}>
          <ProgressBar progress={stepProgress} color="primary" />
        </View>
      )}
      {/* Sits directly under the control that raised it. At the bottom of
          the page it would be off-screen on the review step, which is the
          longest scroll and the one where leaving costs the most. */}
      {pendingExit && (
        <Column
          gap={spacing.S}
          // The prompt replaces nothing and traps nothing — it appears in the
          // header while the step stays on screen — so without an announcement
          // the sentence stating the consequence never reaches a screen reader.
          // What separates the two buttons that follow it is colour, which that
          // user does not have either.
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[styles.confirmBox, { borderColor: theme.data.negative }]}>
          <Text.S
            style={wizardText.smallLine}
            testID={`${testID}-exit-confirm`}>
            {t(
              pendingExit === 'back'
                ? 'migrate-wallet.nav.back-confirm'
                : 'migrate-wallet.nav.cancel-confirm',
            )}
          </Text.S>
          <Row gap={spacing.S}>
            <Button.Secondary
              label={t('migrate-wallet.nav.cancel-keep-going')}
              onPress={handleDismissExit}
              size="small"
              flex={1}
              testID={`${testID}-exit-dismiss`}
            />
            <Button.Critical
              label={t(
                pendingExit === 'back'
                  ? 'migrate-wallet.nav.back-confirm-action'
                  : 'migrate-wallet.nav.cancel-confirm-action',
              )}
              onPress={handleConfirmExit}
              size="small"
              flex={1}
              testID={`${testID}-exit-accept`}
            />
          </Row>
        </Column>
      )}
    </>
  );

  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.background.page }]}
      // The overlay covers the app but sits outside the navigator, so without
      // this a screen reader walks straight past it into the wallet behind.
      accessibilityViewIsModal
      testID={testID}>
      {/* Compact only. Pinned above the scroll as a page-level header, and a
          direct child of the absolutely-positioned overlay so it has a definite
          width to centre the reading column inside — as a sticky child of the
          scroll it shrink-fit its content on web instead.

          On a desktop window the content column centres itself vertically and a
          pinned header would strand itself against the top edge, so there it
          travels inside the column and the step reads as one centred block. */}
      {hasHeaderBlock && isCompact && (
        <View
          style={[
            styles.header,
            {
              // Floored: the extension reports no safe-area inset, and
              // without a minimum the controls sit flush against the edge.
              paddingTop: Math.max(insets.top, spacing.M) + spacing.S,
              backgroundColor: theme.background.page,
            },
          ]}>
          <View style={styles.headerColumn}>{headerContent}</View>
        </View>
      )}
      {/* The seed, password and verification steps all put a field above the
          primary button, and the on-screen keyboard would otherwise cover both
          it and the field's own controls with no way to reach them. */}
      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}>
        <ScrollView
          style={styles.scrollView}
          // Without this the first tap on the primary button (or Paste) is spent
          // dismissing the keyboard instead of pressing the control.
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.XL },
          ]}>
          <View style={[styles.content, !isCompact && styles.contentCentred]}>
            <View style={[styles.column, !isCompact && styles.columnCentred]}>
              {hasHeaderBlock && !isCompact && (
                <View style={styles.headerInline}>{headerContent}</View>
              )}
              {/* Tag and title are one unit: which of the two seeds this step
              concerns only means anything read against the title. */}
              <Column gap={spacing.S} style={styles.titleBlock}>
                {walletTag && (
                  <View style={styles.tagRow}>
                    <View
                      style={[styles.tag, { borderColor: theme.border.top }]}
                      testID={`${testID}-tag`}>
                      <Text.XS variant="tertiary">{walletTag}</Text.XS>
                    </View>
                  </View>
                )}
                <Text.XL>{title}</Text.XL>
              </Column>

              {children}

              {/* On a phone the action settles at the foot of a short step and
              still follows the content on a long one. Centred layouts skip the
              auto margin — it would absorb the free space the centring needs. */}
              {primaryLabel && onPrimary && (
                <View
                  style={[styles.actions, isCompact && styles.actionsFooted]}>
                  <Button.Primary
                    label={primaryLabel}
                    onPress={handlePrimary}
                    // Frozen behind the confirmation. The prompt is not a
                    // modal, so the step's own commit control stays reachable
                    // under it — on the backup step that is "I've saved my
                    // recovery phrase", live beneath a prompt asking whether to
                    // discard the phrase.
                    disabled={primaryDisabled || pendingExit !== undefined}
                    fullWidth
                    testID={`${testID}-primary`}
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // A direct child of the overlay, so `width: 100%` resolves against the
  // window. It centres the same reading column the content uses, which is what
  // lines the nav buttons up with the text edges instead of the screen edges.
  header: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.S,
  },
  // Same reading column as the content, but content-height: the header must
  // not grow into the space the scroll needs.
  headerColumn: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  // The centred variant. Already inside the reading column, so it needs no
  // width of its own — only the gap that separates it from the title.
  headerInline: {
    marginBottom: spacing.L,
  },
  // Bounds the scroll to the space left under the header; without it the web
  // ScrollView grows to its content and the page scrolls the header away.
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: spacing.L,
  },
  contentCentred: {
    justifyContent: 'center',
  },
  // One reading column, shared by the header and the content so the nav
  // buttons line up with the text edges rather than the screen edges.
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    flexGrow: 1,
  },
  // Centred layouts size the column to its content so it can sit in the middle
  // of the window rather than being stretched down it.
  columnCentred: {
    flexGrow: 0,
  },
  navRow: {
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  /** Matches the nav button's diameter, so an empty corner still balances. */
  navSlot: {
    width: 40,
    height: 40,
  },
  rail: {
    marginTop: spacing.S,
  },
  confirmBox: {
    marginTop: spacing.S,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.M,
  },
  // Small: the XL title's line box already carries generous internal leading,
  // so a full spacing.L on top of it reads as a gap between two sections rather
  // than between a heading and the copy that belongs to it.
  titleBlock: {
    marginBottom: spacing.S,
  },
  tagRow: {
    flexDirection: 'row',
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  // Pushed to the foot of a short step, but still after the content on a long
  // one — and never the thing the eye lands on straight after body copy.
  actions: {
    paddingTop: spacing.XL,
  },
  actionsFooted: {
    marginTop: 'auto',
  },
});
