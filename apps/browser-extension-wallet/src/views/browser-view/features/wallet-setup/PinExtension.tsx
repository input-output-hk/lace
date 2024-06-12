import React from 'react';
import styles from './PinExtension.module.scss';
import LaceLogoMark from '@assets/branding/lace-logo-mark.component.svg';
import ExtensionIcon from '@assets/icons/extension.component.svg';
import { useTranslation, Trans } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';

export const PinExtension = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  return (
    <div
      className={styles.pinExtension}
      onClick={() => analytics.sendEventToPostHog(postHogOnboardingActions.onboarding.PIN_EXTENSION_CLICK)}
    >
      <LaceLogoMark className={styles.logo} />
      <div className={styles.content}>
        <h5>{t('browserView.pinExtension.title')}</h5>
        <p>
          <Trans
            i18nKey="browserView.pinExtension.prompt"
            components={{
              icon: <ExtensionIcon />
            }}
          />
        </p>
      </div>
    </div>
  );
};
