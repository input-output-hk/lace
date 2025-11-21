import React, { ReactElement, useEffect, useState } from 'react';
import { Drawer, DrawerHeader, DrawerNavigation, logger, PostHogAction, toast } from '@lace/common';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { Button, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { useCustomSubmitApi, useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { isValidURL } from '@utils/is-valid-url';
import { useAnalyticsContext } from '@providers';
import SwitchIcon from '@assets/icons/switch.component.svg';
import ErrorIcon from '@assets/icons/address-error-icon.component.svg';
import PlayIcon from '@assets/icons/play-icon.component.svg';
import PauseIcon from '@assets/icons/pause-icon.component.svg';
import { config } from '@src/config';

const { Text } = Typography;

interface CustomSubmitApiDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

const LEARN_SUBMIT_API_URL = 'https://github.com/IntersectMBO/cardano-node/tree/master/cardano-submit-api';
const { DEFAULT_SUBMIT_API } = config();

export const CustomSubmitApiDrawer = ({
  visible,
  onClose,
  popupView = false
}: CustomSubmitApiDrawerProps): ReactElement => {
  const { t } = useTranslation();
  const { enableCustomNode } = useWalletManager();
  const { environmentName } = useWalletStore();
  const analytics = useAnalyticsContext();

  const [customSubmitTxUrl, setCustomSubmitTxUrl] = useState<string>(DEFAULT_SUBMIT_API);
  const [isValidationError, setIsValidationError] = useState<boolean>(false);
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

  const isCustomApiEnabledForCurrentNetwork = getCustomSubmitApiForNetwork(environmentName).status;

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => {
        setCustomSubmitTxUrl(storage.customSubmitTxUrl || DEFAULT_SUBMIT_API);
      })
      .catch(logger.error);
  }, []);

  const handleCustomTxSubmitEndpoint = async (enable: boolean) => {
    if (enable && !isValidURL(customSubmitTxUrl)) {
      setIsValidationError(true);
      return;
    }

    setIsValidationError(false);
    const value = enable ? customSubmitTxUrl : undefined;
    try {
      await enableCustomNode(environmentName, value);
      toast.notify({
        text: value
          ? t('browserView.settings.wallet.customSubmitApi.usingCustomTxSubmitEndpoint')
          : t('browserView.settings.wallet.customSubmitApi.usingStandardTxSubmitEndpoint'),
        withProgressBar: true,
        icon: SwitchIcon
      });
      if (enable) {
        void analytics.sendEventToPostHog(PostHogAction.SettingsCustomSubmitApiEnableClick);
      }
    } catch (error) {
      logger.error('Error switching TxSubmit endpoint', error);
      toast.notify({ text: t('general.errors.somethingWentWrong'), icon: ErrorIcon });
    }
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.wallet.customSubmitApi.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div className={popupView ? styles.popupContainer : undefined}>
        <Text className={styles.drawerDescription} data-testid="custom-submit-api-description">
          {t('browserView.settings.wallet.customSubmitApi.description')}{' '}
          <a
            href={LEARN_SUBMIT_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="custom-submit-api-learn-more-url"
          >
            {t('browserView.settings.wallet.customSubmitApi.descriptionLink')}
          </a>
        </Text>
        <Text className={styles.drawerText} data-testid="custom-submit-api-default-address">
          {t('browserView.settings.wallet.customSubmitApi.defaultAddress', { url: DEFAULT_SUBMIT_API })}
        </Text>
        <div className={styles.customApiContainer}>
          <TextBox
            label={t('browserView.settings.wallet.customSubmitApi.inputLabel')}
            w="$fill"
            value={customSubmitTxUrl}
            onChange={(event) => setCustomSubmitTxUrl(event.target.value)}
            disabled={isCustomApiEnabledForCurrentNetwork}
            data-testid="custom-submit-api-url"
          />
          <Button.Primary
            label={
              isCustomApiEnabledForCurrentNetwork
                ? t('browserView.settings.wallet.customSubmitApi.disable')
                : t('browserView.settings.wallet.customSubmitApi.enable')
            }
            icon={isCustomApiEnabledForCurrentNetwork ? <PauseIcon /> : <PlayIcon />}
            onClick={() => handleCustomTxSubmitEndpoint(!isCustomApiEnabledForCurrentNetwork)}
            data-testid={`custom-submit-button-${isCustomApiEnabledForCurrentNetwork ? 'disable' : 'enable'}`}
          />
        </div>
        {isValidationError && (
          <Text className={styles.validationError} data-testid="custom-submit-api-validation-error">
            {t('browserView.settings.wallet.customSubmitApi.validationError')}
          </Text>
        )}
      </div>
    </Drawer>
  );
};
