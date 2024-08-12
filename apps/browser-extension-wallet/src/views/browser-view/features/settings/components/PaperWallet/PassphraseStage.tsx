import React from 'react';
import { Banner } from '@lace/common';
import { Password } from '@lace/core';
import type { PasswordObj } from '@lace/core';
import { i18n } from '@lace/translation';
import { Flex, OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';
import { Typography } from 'antd';
import styles from '../SettingsLayout.module.scss';

const { Text: AntdText } = Typography;

export const PassphraseStage = ({
  setPassword,
  isPasswordValid
}: {
  setPassword: (pw: Partial<PasswordObj>) => void;
  isPasswordValid: boolean;
}): JSX.Element => {
  const handleChange: OnPasswordChange = (target) => {
    setPassword(target);
  };
  return (
    <Flex mt="$8" flexDirection="column" gap="$8">
      <AntdText className={styles.drawerDescription} data-testid="passphrase-drawer-description">
        {i18n.t('browserView.settings.security.showPassphraseDrawer.description')}
      </AntdText>
      <Flex gap="$32" flexDirection="column">
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
              onSubmit={undefined}
            />
          </div>
        </div>
      </Flex>
    </Flex>
  );
};
