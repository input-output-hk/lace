import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './BetaPill.module.scss';

export const BetaPill = (): JSX.Element => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnLinkClick = async () => {
    await analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappDappConnectorBetaClick);
    window.open(process.env.FAQ_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <a
      onClick={handleOnLinkClick}
      className={styles.betaPill}
      data-testid="beta-pill"
      target="_blank"
      rel="noreferrer noopener"
    >
      {t('core.dapp.beta')}
    </a>
  );
};
