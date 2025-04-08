import React from 'react';
import styles from './MainHeader.module.scss';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';

export const SimpleHeader = ({ beta = false }: { beta?: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={styles.header} data-testid="header-container">
      <div className={styles.content}>
        <div className={styles.linkLogo}>
          <img className={styles.logo} src={laceLogoMark} alt="LACE" data-testid="header-logo" />
        </div>
        {beta && (
          <Flex h="$48" w="$64" alignItems="center" justifyContent="center" className={styles.betaPill}>
            <Text.Body.Normal weight="$semibold">{t('modals.beta.pill')}</Text.Body.Normal>
          </Flex>
        )}
      </div>
    </div>
  );
};
