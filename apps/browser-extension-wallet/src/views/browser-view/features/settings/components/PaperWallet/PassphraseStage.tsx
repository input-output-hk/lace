/* eslint-disable unicorn/no-null */
import React from 'react';
import { Banner } from '@lace/common';
import { i18n } from '@lace/translation';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import styles from '../SettingsLayout.module.scss';
import { Password, PasswordObj } from '@lace/core';

export const PassphraseStage = ({
  setPassword,
  isPasswordValid
}: {
  setPassword: (pw: Partial<PasswordObj>) => void;
  isPasswordValid: boolean;
}): JSX.Element => (
  <Flex mt="$8" flexDirection="column" gap="$8">
    <Flex gap="$32" flexDirection="column" alignItems="center">
      <div className={styles.warningBanner}>
        <Banner withIcon message={i18n.t('browserView.settings.security.showPassphraseDrawer.warning')} />
      </div>
      <div className={styles.passwordContainer}>
        <div className={styles.password}>
          <Password
            className={styles.passwordInput}
            onChange={setPassword}
            error={!isPasswordValid}
            errorMessage={i18n.t('browserView.transaction.send.error.invalidPassword')}
            label={i18n.t('browserView.transaction.send.password.placeholder')}
            autoFocus
            onSubmit={null}
          />
        </div>
      </div>
    </Flex>
  </Flex>
);
