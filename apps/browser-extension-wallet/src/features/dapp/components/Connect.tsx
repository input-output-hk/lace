/* eslint-disable react/no-multi-comp */
import React, { useEffect, useState } from 'react';
import { Banner, Button } from '@lace/common';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Layout } from './Layout';
import { AuthorizeDapp } from '@lace/core';
import { sectionTitle, DAPP_VIEWS } from '../config';
import styles from './Connect.module.scss';
import Modal from 'antd/lib/modal/Modal';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { runtime } from 'webextension-polyfill';
import { DAPP_CHANNELS } from '@src/utils/constants';
import * as cip30 from '@cardano-sdk/dapp-connector';
import type { UserPromptService } from '@lib/scripts/background/services/dappService';
import { of } from 'rxjs';
import InfoIcon from '../../../assets/icons/info.component.svg';
import ShieldExclamation from '../../../assets/icons/shield-exclamation.component.svg';
import { DappDataService } from '@lib/scripts/types';
import { Wallet } from '@lace/cardano';

import { Tooltip } from 'antd';
import { useWalletStore } from '@src/stores';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const DAPP_TOAST_DURATION = 50;

const closeWindow = () => window.close();

const WarningBanner = () => {
  const { t } = useTranslation();
  return (
    <Banner
      className={styles.banner}
      customIcon={<ShieldExclamation className={styles.bannerIcon} />}
      withIcon
      message={t('core.authorizeDapp.warning')}
      popupView
    />
  );
};

const NonSSLBanner = () => {
  const { t } = useTranslation();
  return (
    <Banner
      className={cn(styles.banner, styles.nonssl)}
      descriptionClassName={styles.bannerDescription}
      customIcon={<ShieldExclamation className={cn(styles.bannerIcon, styles.nonsslIcon)} />}
      withIcon
      message={
        <div className={styles.nonsslContent}>
          <span>{t('core.authorizeDapp.nonssl')}</span>
          <Tooltip
            placement="topRight"
            title={<div className={styles.nonsslTooltip}>{t('core.authorizeDapp.nonsslTooltip')}</div>}
          >
            <InfoIcon className={styles.infoIcon} />
          </Tooltip>
        </div>
      }
    />
  );
};

const authorize = (authorization: 'deny' | 'just-once' | 'allow', url: string) => {
  const api$ = of({
    allowOrigin(origin: cip30.Origin): Promise<'deny' | 'just-once' | 'allow'> {
      if (!url.startsWith(origin)) {
        return Promise.reject();
      }
      return Promise.resolve(authorization);
    }
  });

  const userPromptService = exposeApi<Pick<UserPromptService, 'allowOrigin'>>(
    {
      api$,
      baseChannel: DAPP_CHANNELS.userPrompt,
      properties: { allowOrigin: RemoteApiPropertyType.MethodReturningPromise }
    },
    { logger: console, runtime }
  );

  setTimeout(() => {
    userPromptService.shutdown();
    closeWindow();
  }, DAPP_TOAST_DURATION);
};

const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getDappInfo'>>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getDappInfo: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

export const Connect = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const [isModalVisible, setModalVisible] = useState(false);
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const [isSSLEncrypted, setIsSSLEncrypted] = useState(true);
  const { environmentName } = useWalletStore();
  useEffect(() => {
    dappDataApi
      .getDappInfo()
      .then(({ logo, name, url }) => {
        setDappInfo({ logo, name, url });
        if (!url.startsWith('https:')) {
          setIsSSLEncrypted(false);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const handleAuthorizeClick = () => {
    setModalVisible(true);
    analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappAuthorizeClick);
  };

  const handleCancelClick = async () => {
    await analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappCancelClick);
    authorize('deny', dappInfo.url);
  };

  const handleAllowAlwaysClick = async () => {
    await analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappConnectionAlwaysClick);
    authorize('allow', dappInfo.url);
  };

  const handleAllowOnceClick = async () => {
    await analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappConnectionOnlyOnceClick);
    authorize('just-once', dappInfo.url);
  };

  const showNonSSLBanner = !isSSLEncrypted && environmentName === 'Mainnet';
  return (
    <Layout
      pageClassname={styles.spaceBetween}
      title={t(sectionTitle[DAPP_VIEWS.CONNECT])}
      data-testid="connect-layout"
    >
      <div className={styles.container}>
        <AuthorizeDapp dappInfo={dappInfo} warningBanner={showNonSSLBanner ? <NonSSLBanner /> : <WarningBanner />} />
      </div>
      <div className={styles.footer}>
        <Button className={styles.footerBtn} data-testid="connect-authorize-button" onClick={handleAuthorizeClick}>
          {t('dapp.connect.btn.accept')}
        </Button>
        <Button
          className={styles.footerBtn}
          data-testid="connect-cancel-button"
          color="secondary"
          onClick={handleCancelClick}
        >
          {t('dapp.connect.btn.cancel')}
        </Button>
      </div>
      <Modal
        centered
        closable={false}
        open={isModalVisible}
        width={312}
        className={styles.dappConnection}
        zIndex={1001}
        // eslint-disable-next-line unicorn/no-null
        footer={null}
      >
        <div className={styles.modalContent} data-testid="connect-modal-container">
          <div className={styles.modalSubheading} data-testid="connect-modal-title">
            {t('dapp.connect.modal.header')}
          </div>
          <div className={styles.modalDescription} data-testid="connect-modal-description">
            {t('dapp.connect.modal.description')}
          </div>
          <div className={styles.modalActions}>
            <Button block data-testid="connect-modal-accept-always" onClick={handleAllowAlwaysClick}>
              {t('dapp.connect.modal.allowAlways')}
            </Button>
            <Button block data-testid="connect-modal-accept-once" onClick={handleAllowOnceClick} color="secondary">
              {t('dapp.connect.modal.allowOnce')}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
