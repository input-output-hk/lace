import React, { useEffect, useState } from 'react';
import { Button } from '@lace/common';
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
import { UserPromptService } from '@lib/scripts/background/services/dappService';
import { of } from 'rxjs';
import ShieldExclamation from '@assets/icons/shield-exclamation.svg';
import { Banner } from '@components/Banner';
import { DappDataService } from '@lib/scripts/types';
import { Wallet } from '@lace/cardano';

const DAPP_TOAST_DURATION = 50;

const closeWindow = () => window.close();

const authorize = (authorization: 'deny' | 'just-once' | 'allow', url: string) => {
  const api$ = of({
    allowOrigin(origin: cip30.Origin): Promise<'deny' | 'just-once' | 'allow'> {
      /* eslint-disable-next-line promise/avoid-new */
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
  const { t } = useTranslation();
  const [isModalVisible, setModalVisible] = useState(false);
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();

  useEffect(() => {
    dappDataApi
      .getDappInfo()
      .then(({ logo, name, url }) => {
        setDappInfo({ logo, name, url });
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <Layout
      pageClassname={styles.spaceBetween}
      title={t(sectionTitle[DAPP_VIEWS.CONNECT])}
      data-testid="connect-layout"
    >
      <div className={styles.container}>
        <AuthorizeDapp
          dappInfo={dappInfo}
          warningBanner={
            <Banner
              className={styles.banner}
              customIcon={ShieldExclamation}
              withIcon
              message={t('core.authorizeDapp.warning')}
            />
          }
        />
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.footerBtn}
          data-testid="connect-authorize-button"
          onClick={() => setModalVisible(true)}
        >
          {t('dapp.connect.btn.accept')}
        </Button>
        <Button
          className={styles.footerBtn}
          data-testid="connect-cancel-button"
          color="secondary"
          onClick={() => authorize('deny', dappInfo.url)}
        >
          {t('dapp.connect.btn.cancel')}
        </Button>
      </div>
      <Modal
        centered
        closable={false}
        visible={isModalVisible}
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
            <Button block data-testid="connect-modal-accept-always" onClick={() => authorize('allow', dappInfo.url)}>
              {t('dapp.connect.modal.allowAlways')}
            </Button>
            <Button
              block
              data-testid="connect-modal-accept-once"
              onClick={() => authorize('just-once', dappInfo.url)}
              color="secondary"
            >
              {t('dapp.connect.modal.allowOnce')}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
