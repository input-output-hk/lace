import React from 'react';
import styles from './WalletSetupLayout.module.scss';
import laceLogo from '@src/assets/branding/lace-logo.svg';
import laceLogoDarkMode from '@src/assets/branding/lace-logo-dark-mode.svg';
import QuestionMark from '@src/assets/icons/browser-view/question-mark.svg';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { useTheme } from '@providers/ThemeProvider/context';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';

export interface WalletSetupLayoutProps {
  children: React.ReactNode;
  prompt?: React.ReactNode;
}

export const WalletSetupLayout = ({ children, prompt }: WalletSetupLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const openExternalLink = useExternalLinkOpener();

  return (
    <div className={styles.walletSetupLayout}>
      <div className={styles.header}>
        <img
          src={theme.name === 'light' ? laceLogo : laceLogoDarkMode}
          alt="LACE"
          width={120}
          data-testid="lace-logo"
        />
        {prompt || (
          <Button
            color="gradient"
            onClick={() => openExternalLink(process.env.HELP_URL)}
            data-testid="help-and-support-button"
          >
            <img src={QuestionMark} alt="question mark" />
            {t('general.lock.helpAndSupport')}
          </Button>
        )}
      </div>

      <div className={styles.container}>
        <div className={styles.content}>{children}</div>
      </div>
      <div className={styles.legalButtonsContainer}>
        <a
          className={styles.legalButton}
          onClick={() => openExternalLink(process.env.COOKIE_POLICY_URL)}
          data-testid="cookie-policy-link"
        >
          {t('settings.legals.cookiePolicy')}
        </a>
        <a
          className={styles.legalButton}
          onClick={() => openExternalLink(process.env.PRIVACY_POLICY_URL)}
          data-testid="privacy-policy-link"
        >
          {t('settings.legals.privacyPolicy')}
        </a>
        <a
          className={styles.legalButton}
          onClick={() => openExternalLink(process.env.TERMS_OF_USE_URL)}
          data-testid="terms-of-service-link"
        >
          {t('settings.legals.termsOfService')}
        </a>
      </div>
    </div>
  );
};
