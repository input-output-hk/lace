import React from 'react';
import laceLogo from '@src/assets/branding/lace-logo.svg';
import laceLogoDarkMode from '@src/assets/branding/lace-logo-dark-mode.svg';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import QuestionMark from '@src/assets/icons/browser-view/question-mark.svg';
import styles from './Lock.module.scss';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';
import { useTheme } from '@providers/ThemeProvider/context';

const { Text } = Typography;

type Props = {
  message?: string;
  description?: string;
  icon?: string;
};

export const Lock = ({ message, description, icon }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const openExternalLink = useExternalLinkOpener();

  return (
    <div className={styles.lockContainer} data-testid="lock-screen">
      <div className={styles.header} data-testid="lock-screen-logo">
        <img src={theme.name === 'light' ? laceLogo : laceLogoDarkMode} alt="LACE" width={120} />
        <Button
          className={styles.helpSupport}
          onClick={() => openExternalLink(process.env.HELP_URL)}
          data-testid="lock-screen-help-button"
        >
          <img src={QuestionMark} alt="question mark" />
          {t('general.lock.helpAndSupport')}
        </Button>
      </div>

      <div className={styles.centerContent}>
        <div className={styles.content}>
          <div className={styles.lockMessage}>
            <img className={styles.mark} src={icon ?? laceLogoMark} alt="LACE" data-testid="lock-screen-img" />
            <Text className={styles.title} data-testid="lock-screen-text1">
              {message ?? t('general.lock.yourWalletIsLocked')}
            </Text>
            <Text className={styles.description} data-testid="lock-screen-text2">
              {description ?? t('general.lock.toUnlockOpenPopUp')}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};
