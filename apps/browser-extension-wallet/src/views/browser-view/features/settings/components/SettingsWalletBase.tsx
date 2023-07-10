/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { DappList as DappListDrawer } from '@views/browser/features/dapp';
import { SettingsCard, SettingsLink, GeneralSettingsDrawer, Collateral } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { NetworkChoiceDrawer } from './NetworkChoiceDrawer';
import { useWalletStore } from '@src/stores';
import { AboutDrawer } from './AboutDrawer';
import { config } from '@src/config';
import { COLLATERAL_AMOUNT_LOVELACES, useRedirection } from '@hooks';
import { BrowserViewSections, MessageTypes } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext } from '@providers';
import { useSearchParams, useObservable } from '@lace/common';
import { walletRoutePaths } from '@routes/wallet-paths';

const { Title } = Typography;

export enum SettingsDrawer {
  about = 'about',
  collateral = 'collateral',
  dappList = 'dappList',
  general = 'general',
  networkChoice = 'networkChoice'
}

export type SettingsSearchParams<AdditionalDrawers extends string> = {
  activeDrawer?: SettingsDrawer | AdditionalDrawers;
};

interface RenderLocalNodeSlotParams<AdditionalDrawers extends string> {
  activeDrawer: string;
  closeDrawer: () => void;
  openDrawer: (drawer: SettingsDrawer | AdditionalDrawers) => void;
}

export interface SettingsWalletProps<AdditionalDrawers extends string = never> {
  renderLocalNodeSlot?: (params: RenderLocalNodeSlotParams<AdditionalDrawers>) => ReactNode;
  popupView?: boolean;
}

// eslint-disable-next-line complexity
export const SettingsWalletBase = <AdditionalDrawers extends string>({
  renderLocalNodeSlot,
  popupView = false
}: SettingsWalletProps<AdditionalDrawers>): React.ReactElement => {
  const { activeDrawer } = useSearchParams<keyof SettingsSearchParams<AdditionalDrawers>>(['activeDrawer']);
  const redirectToSettings = useRedirection<{ search: SettingsSearchParams<AdditionalDrawers> }>(
    walletRoutePaths.settings
  );
  const openDrawer = useCallback(
    (drawer: SettingsDrawer | AdditionalDrawers) => redirectToSettings({ search: { activeDrawer: drawer } }),
    [redirectToSettings]
  );
  const closeDrawer = useRedirection(walletRoutePaths.settings);

  const { t } = useTranslation();
  const { environmentName, inMemoryWallet } = useWalletStore();
  const { AVAILABLE_CHAINS } = config();
  const unspendable = useObservable(inMemoryWallet.balance.utxo.unspendable$);

  const hasCollateral = useMemo(() => unspendable?.coins >= COLLATERAL_AMOUNT_LOVELACES, [unspendable?.coins]);
  const backgroundServices = useBackgroundServiceAPIContext();

  const isNetworkChoiceEnabled = AVAILABLE_CHAINS.length > 1;
  const authorizedAppsEnabled = process.env.USE_DAPP_CONNECTOR === 'true';

  useEffect(() => {
    const openCollateralDrawer = async () => {
      const backgroundStorage = await backgroundServices.getBackgroundStorage();
      if (!backgroundStorage) return;
      if (
        backgroundStorage.message?.type === MessageTypes.OPEN_COLLATERAL_SETTINGS &&
        backgroundStorage.message?.data.section === BrowserViewSections.COLLATERAL_SETTINGS
      ) {
        await backgroundServices.clearBackgroundStorage(['message']);
        openDrawer(SettingsDrawer.collateral);
      }
    };
    openCollateralDrawer();
  }, [backgroundServices, openDrawer]);

  return (
    <>
      <GeneralSettingsDrawer
        visible={activeDrawer === SettingsDrawer.general}
        onClose={closeDrawer}
        popupView={popupView}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="wallet-settings-heading">
          {t('browserView.settings.wallet.title')}
        </Title>
        {popupView && (
          <>
            <AboutDrawer visible={activeDrawer === SettingsDrawer.about} onClose={closeDrawer} popupView={popupView} />
            <SettingsLink
              onClick={() => openDrawer(SettingsDrawer.about)}
              description={t('browserView.settings.wallet.about.description')}
              data-testid="settings-wallet-about-link"
            >
              {t('browserView.settings.wallet.about.title')}
            </SettingsLink>
          </>
        )}
        {isNetworkChoiceEnabled && (
          <>
            <NetworkChoiceDrawer
              visible={activeDrawer === SettingsDrawer.networkChoice}
              onClose={closeDrawer}
              popupView={popupView}
            />
            <SettingsLink
              onClick={() => openDrawer(SettingsDrawer.networkChoice)}
              description={t('browserView.settings.wallet.network.description')}
              addon={environmentName}
              data-testid="settings-wallet-network-link"
            >
              {t('browserView.settings.wallet.network.title')}
            </SettingsLink>
          </>
        )}
        {authorizedAppsEnabled && (
          <>
            <DappListDrawer
              visible={activeDrawer === SettingsDrawer.dappList}
              onCancelClick={closeDrawer}
              popupView={popupView}
            />
            <SettingsLink
              onClick={() => openDrawer(SettingsDrawer.dappList)}
              description={t('browserView.settings.wallet.authorizedDApps.description')}
              data-testid="settings-wallet-authorized-dapps-link"
            >
              {t('browserView.settings.wallet.authorizedDApps.title')}
            </SettingsLink>
          </>
        )}
        <SettingsLink
          onClick={() => openDrawer(SettingsDrawer.general)}
          description={t('browserView.settings.wallet.general.description')}
          data-testid="settings-wallet-general-link"
        >
          {t('browserView.settings.wallet.general.title')}
        </SettingsLink>
        {renderLocalNodeSlot && renderLocalNodeSlot({ activeDrawer, closeDrawer, openDrawer })}
        <SettingsLink
          onClick={() => openDrawer(SettingsDrawer.collateral)}
          description={t('browserView.settings.wallet.collateral.description')}
          data-testid="settings-wallet-collateral-link"
          addon={
            hasCollateral
              ? t('browserView.settings.wallet.collateral.active')
              : t('browserView.settings.wallet.collateral.inactive')
          }
        >
          {t('browserView.settings.wallet.collateral.title')}
        </SettingsLink>
        <Collateral.CollateralDrawer
          visible={activeDrawer === SettingsDrawer.collateral}
          onClose={closeDrawer}
          hasCollateral={hasCollateral}
          unspendableLoaded={unspendable?.coins !== undefined}
        />
      </SettingsCard>
    </>
  );
};
