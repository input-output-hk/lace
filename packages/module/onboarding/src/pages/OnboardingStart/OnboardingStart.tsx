import type { TextStyle } from 'react-native';

import { useUICustomisation } from '@lace-contract/app';
import { Trans, useTranslation } from '@lace-contract/i18n';
import {
  Modal,
  OnboardingStart as OnboardingStartTemplate,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useOnboardingStart } from './useOnboardingStart';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const OnboardingStart = (
  props: StackScreenProps<StackRoutes.OnboardingStart>,
) => {
  const { t } = useTranslation();
  const {
    theme,
    actions,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
    handleCookiePolicy,
    isBiometricRequiredModalVisible,
  } = useOnboardingStart(props);
  const [resetSignal, setResetSignal] = useState(0);

  const walletDropdownCustomisations = useUICustomisation(
    'addons.loadOnboardingStartWalletDropdownUICustomisations',
  );

  const WalletDropdownComponent =
    walletDropdownCustomisations[0]?.WalletDropdown;
  const walletOptionsDropdown = WalletDropdownComponent ? (
    <WalletDropdownComponent />
  ) : null;

  const linkStyle = useMemo<TextStyle>(
    () => ({
      textDecorationLine: 'underline',
    }),
    [],
  );

  const legalText = useMemo(
    () => (
      <Text.M align="center">
        <Trans
          i18nKey="onboarding.start.legal"
          components={{
            termsLink: (
              <Text.M
                key="termsLink"
                style={linkStyle}
                onPress={handleOpenTerms}
                testID="terms-of-service-link"
              />
            ),
            policyLink: (
              <Text.M
                key="policyLink"
                style={linkStyle}
                onPress={handleOpenPrivacyPolicy}
                testID="privacy-policy-link"
              />
            ),
            cookiePolicyLink: (
              <Text.M
                key="cookiePolicyLink"
                style={linkStyle}
                onPress={handleCookiePolicy}
                testID="cookie-policy-link"
              />
            ),
          }}
        />
      </Text.M>
    ),
    [linkStyle, handleOpenTerms, handleOpenPrivacyPolicy, handleCookiePolicy],
  );

  const handleGoToSettings = () => {
    if (Platform.OS === 'android') {
      void Linking.sendIntent('android.settings.SETTINGS');
    } else {
      void Linking.openSettings();
    }
  };

  useEffect(() => {
    return props.navigation.addListener('focus', () => {
      setResetSignal(value => value + 1);
    });
  }, [props.navigation]);

  return (
    <>
      <OnboardingStartTemplate
        actions={actions}
        legalText={legalText}
        theme={theme}
        resetSignal={resetSignal}
        {...(walletDropdownCustomisations.length > 0 && {
          walletOptionsDropdown,
        })}
      />

      <Modal
        visible={isBiometricRequiredModalVisible}
        heading={t('authentication-prompt.biometric-required.title')}
        description={t('authentication-prompt.biometric-required.description')}
        confirmText={t(
          'authentication-prompt.biometric-required.go-to-settings',
        )}
        onConfirm={handleGoToSettings}
      />
    </>
  );
};
