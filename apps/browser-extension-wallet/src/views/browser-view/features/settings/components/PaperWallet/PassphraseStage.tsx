import React from 'react';
import { Banner } from '@lace/common';
import { i18n } from '@lace/translation';
import { Flex, OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';
import { Password, PasswordObj } from '@lace/core';
import styles from '../SettingsLayout.module.scss';

export const PassphraseStage = ({
  setPassword,
  isPasswordValid
}: {
  setPassword: (pw: Partial<PasswordObj>) => void;
  isPasswordValid: boolean;
}): JSX.Element => {
  const handleChange: OnPasswordChange = (e) => setPassword(e);

  return (
    <Flex mt="$8" flexDirection="column" gap="$8">
      <Flex gap="$32" flexDirection="column" alignItems="center">
        <div className={styles.warningBanner}>
          <Banner withIcon message={i18n.t('browserView.settings.security.showPassphraseDrawer.warning')} />
        </div>
        <div className={styles.passwordContainer}>
          <div className={styles.password}>
            <Password
              className={styles.passwordInput}
              onChange={handleChange}
              error={!isPasswordValid}
              errorMessage={i18n.t('browserView.transaction.send.error.invalidPassword')}
              label={i18n.t('browserView.transaction.send.password.placeholder')}
              autoFocus
            />
          </div>
        </div>
      </Flex>
    </Flex>
  );
};
