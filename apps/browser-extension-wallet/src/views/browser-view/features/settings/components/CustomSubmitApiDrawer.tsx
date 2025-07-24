/* eslint-disable complexity */
import React, { ReactElement, useEffect, useState } from 'react';
import { Drawer, DrawerHeader, DrawerNavigation, logger, PostHogAction, toast } from '@lace/common';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { Button, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { useCustomBackendApi, useCustomSubmitApi, useWalletManager } from '@hooks';
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
const { DEFAULT_SUBMIT_API, DEFAULT_BLOCKFROST_API } = config();

export const CustomSubmitApiDrawer = ({
  visible,
  onClose,
  popupView = false
}: CustomSubmitApiDrawerProps): ReactElement => {
  const { t } = useTranslation();
  const { enableCustomNode, reloadWallet } = useWalletManager();
  const { environmentName } = useWalletStore();
  const analytics = useAnalyticsContext();

  const [customSubmitTxUrl, setCustomSubmitTxUrl] = useState<string>(DEFAULT_SUBMIT_API);
  const [customBlockfrostUrl, setCustomBlockfrostUrl] = useState<string>(DEFAULT_BLOCKFROST_API);
  const [isValidationError, setIsValidationError] = useState<boolean>(false);
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();
  const { getCustomBackendApiForNetwork, updateCustomBackendApi } = useCustomBackendApi();
  const isCustomApiEnabledForCurrentNetwork = getCustomSubmitApiForNetwork(environmentName).status;
  const isCustomBackendApiEnabledForCurrentNetwork = getCustomBackendApiForNetwork(environmentName).status || false;

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => {
        setCustomSubmitTxUrl(storage.customSubmitTxUrl || DEFAULT_SUBMIT_API);
        setCustomBlockfrostUrl(storage.customBlockfrostUrl || DEFAULT_BLOCKFROST_API);
      })
      .catch(logger.error);
  }, []);

  const handleCustomBlockfrostApiEndpoint = async (enable: boolean) => {
    // TODO: abstract
    if (enable && !isValidURL(customBlockfrostUrl)) {
      setIsValidationError(true);
    }

    setIsValidationError(false);
    const value = enable ? customBlockfrostUrl : undefined;

    if (value)
      updateCustomBackendApi(environmentName, {
        status: !!value,
        url: value
      });
    await setBackgroundStorage({ customBlockfrostUrl: value });
    await reloadWallet();
  };

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
        <div className={styles.drawerDescription}>
          <Text>Custom Submit API</Text>
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
        </div>
        <div className={styles.drawerDescription}>
          <Text>Blockfrost API</Text>
          <div className={styles.customApiContainer}>
            <TextBox
              label={t('browserView.settings.wallet.customSubmitApi.inputLabel')}
              w="$fill"
              value={customBlockfrostUrl}
              onChange={(event) => setCustomBlockfrostUrl(event.target.value)}
              disabled={isCustomBackendApiEnabledForCurrentNetwork}
              data-testid="custom-blockfrost-api-url"
            />
            <Button.Primary
              label={
                isCustomBackendApiEnabledForCurrentNetwork
                  ? t('browserView.settings.wallet.customSubmitApi.disable')
                  : t('browserView.settings.wallet.customSubmitApi.enable')
              }
              icon={isCustomBackendApiEnabledForCurrentNetwork ? <PauseIcon /> : <PlayIcon />}
              onClick={() => handleCustomBlockfrostApiEndpoint(!isCustomBackendApiEnabledForCurrentNetwork)}
              data-testid={`custom-submit-button-${isCustomBackendApiEnabledForCurrentNetwork ? 'disable' : 'enable'}`}
            />
          </div>
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
