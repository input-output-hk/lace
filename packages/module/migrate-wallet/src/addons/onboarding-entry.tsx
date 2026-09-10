import { useTranslation } from '@lace-contract/i18n';
import { Text } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';
import { StyleSheet } from 'react-native';

import { wizardText } from '../components/wizard-styles';
import { openWizardRef } from '../open-wizard-ref';

import type { WizardOpenOrigin } from '../store/slice';
import type { OnboardingEntryUICustomisation } from '@lace-contract/onboarding-v2';

// Shared by every entry point here and by the settings option, which already
// opens the wizard this way — the overlay owns the ref and clears it on
// unmount, so there is no second way in to keep in sync.
//
// Takes the origin directly so the entry card can be handed straight to both
// option lists: `OnboardingEntrySurface` is a subset of `WizardOpenOrigin`, so
// whichever list pressed it names itself, and the funnel keeps the doors apart.
const openWizard = (origin: WizardOpenOrigin) => {
  openWizardRef.current?.(origin);
};

/**
 * The migration alternative offered on the Restore screen, as one quiet
 * tertiary line whose action is an inline underlined link, matching the
 * onboarding legal links. Deliberately not a Button: it sits next to the
 * mnemonic field and a second full-width button there competes with the
 * screen's own primary action.
 *
 * Always on screen, never dismissible: this is a safety interception, not a
 * promotion. A user who restores a phrase they no longer trust ends up with the
 * same drainable funds inside Lace, having achieved nothing, so the alternative
 * has to stay visible for as long as they are looking at that field.
 */
const RestoreCallout = () => {
  const { t } = useTranslation();
  return (
    <Text.S
      variant="tertiary"
      style={wizardText.smallLine}
      testID="migrate-wallet-restore-callout">
      {`${t('migrate-wallet.entry.restore-message')} `}
      <Text.S
        variant="tertiary"
        style={styles.link}
        onPress={() => {
          openWizard('restore');
        }}
        testID="migrate-wallet-restore-callout-action">
        {t('migrate-wallet.entry.restore-action')}
      </Text.S>
    </Text.S>
  );
};

const onboardingEntryUICustomisation = () =>
  createUICustomisation<OnboardingEntryUICustomisation>({
    key: 'migrate-wallet',
    EntryOptions: [
      {
        id: 'migrate-wallet',
        icon: 'ArrowTurnForward',
        titleKey: 'migrate-wallet.entry.card-title',
        descriptionKey: 'migrate-wallet.entry.card-description',
        onPress: openWizard,
      },
    ],
    RestoreCallout,
  });

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});

export default onboardingEntryUICustomisation;
