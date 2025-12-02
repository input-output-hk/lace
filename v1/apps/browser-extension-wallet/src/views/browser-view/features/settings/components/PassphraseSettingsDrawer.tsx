/* eslint-disable promise/catch-or-return */
/* eslint-disable no-magic-numbers */
import React from 'react';
import { Radio, Typography, RadioChangeEvent } from 'antd';
import { Drawer, DrawerHeader, DrawerNavigation, toast } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { useAppSettingsContext } from '@providers';
import { DRAWER_PADDING, DRAWER_WIDTH, PHRASE_FREQUENCY_OPTIONS } from '@src/utils/constants';
import EditIcon from '@src/assets/icons/edit.component.svg';

const { Text } = Typography;

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const PassphraseSettingsDrawer = ({
  visible,
  onClose,
  popupView = false
}: GeneralSettingsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const [settings, setAppSettings] = useAppSettingsContext();
  const { mnemonicVerificationFrequency } = settings;

  const onPassphrasePeriodChange = (e: RadioChangeEvent) => {
    setAppSettings({ ...settings, mnemonicVerificationFrequency: e.target.value as string });
    toast
      .notify({
        text: t('browserView.settings.security.periodicVerification.success'),
        withProgressBar: true,
        ...(!popupView && {
          style: {
            textAlign: 'right',
            paddingRight: `${DRAWER_WIDTH / 2 + DRAWER_PADDING}px`
          },
          className: styles.networkToast
        }),
        icon: EditIcon
      })
      .then(() => {
        onClose();
      });
    return e;
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={
        <DrawerHeader popupView={popupView} title={t('browserView.settings.security.periodicVerification.title')} />
      }
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
      destroyOnClose
      keyboard={false}
    >
      <div className={popupView ? styles.popupContainer : undefined}>
        <Text className={styles.drawerDescription}>
          {t('browserView.settings.security.periodicVerification.description')}
        </Text>
        <div className={styles.radios}>
          <Radio.Group
            className={styles.radioGroup}
            onChange={onPassphrasePeriodChange}
            value={mnemonicVerificationFrequency}
          >
            {PHRASE_FREQUENCY_OPTIONS.map(({ value, label }) => (
              <a key={value} className={styles.radio}>
                <Radio key={value} value={value} className={styles.radioLabel}>
                  {label}
                </Radio>
              </a>
            ))}
          </Radio.Group>
        </div>
      </div>
    </Drawer>
  );
};
