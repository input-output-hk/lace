import React from 'react';
import { Banner, inputProps, Password } from '@lace/common';
import { i18n } from '@lace/translation';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { Typography } from 'antd';
import styles from '../SettingsLayout.module.scss';

const { Text: AntdText } = Typography;

export const PassphraseStage = ({
  setPassword,
  password,
  isPasswordValid
}: {
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  isPasswordValid: boolean;
}): JSX.Element => {
  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);

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
              value={password}
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
