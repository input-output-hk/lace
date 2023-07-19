import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { CollateralStepSend, CollateralStepReclaim, CollateralFooterReclaim } from './';
import { useCollateral, useSyncingTheFirstTime } from '@hooks';
import { useWalletStore } from '@src/stores';
import styles from './Collateral.module.scss';
import { Sections } from './types';
import { useSections } from './store';
import { MainLoader } from '@components/MainLoader';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { CollateralFooterSend } from './send/CollateralFooterSend';
import { TransactionSuccess } from '@src/views/browser-view/features/send-transaction/components/TransactionSuccess';
import { TransactionFail } from '@src/views/browser-view/features/send-transaction/components/TransactionFail';
import { useBuiltTxState } from '@src/views/browser-view/features/send-transaction';
import { FooterHW } from './hardware-wallet/FooterHW';

interface CollateralDrawerProps {
  visible: boolean;
  onClose: () => void;
  hasCollateral?: boolean;
  unspendableLoaded: boolean;
}

export const CollateralDrawer = ({
  visible,
  onClose,
  hasCollateral,
  unspendableLoaded
}: CollateralDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { currentSection: section, setSection } = useSections();
  const {
    getKeyAgentType,
    walletUI: { appMode }
  } = useWalletStore();
  const popupView = appMode === APP_MODE_POPUP;
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);
  const [password, setPassword] = useState<string>();
  const clearPassword = () => setPassword('');
  const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
  const isWalletSyncingForTheFirstTime = useSyncingTheFirstTime();
  const { initializeCollateralTx, submitCollateralTx, isInitializing, isSubmitting, hasEnoughAda, txFee } =
    useCollateral();
  const { builtTxData, clearBuiltTxData } = useBuiltTxState();
  const readyToOperate = !isWalletSyncingForTheFirstTime && unspendableLoaded;

  const handleClose = useCallback(async () => {
    // TODO: Remove this workaround for Hardware Wallets alongside send flow and staking.
    if ([Sections.FAIL_TX, Sections.SUCCESS_TX].includes(section.currentSection) && !isInMemory)
      window.location.reload();
    else onClose();
  }, [isInMemory, onClose, section.currentSection]);

  useEffect(() => {
    if (!visible) return;
    clearBuiltTxData();
    initializeCollateralTx();
  }, [initializeCollateralTx, visible, clearBuiltTxData]);

  useEffect(() => {
    setSection({
      currentSection: Sections.RECLAIM
    });
  }, [setSection]);

  // handle drawer states for inMemory(non-hardware) wallets
  useEffect(() => {
    if (!isInMemory || !readyToOperate) return;
    setSection({ currentSection: hasCollateral ? Sections.RECLAIM : Sections.SEND });
  }, [hasCollateral, isInMemory, setSection, readyToOperate]);

  // handle drawer states for hw
  useEffect(() => {
    if (isInMemory || !readyToOperate) return;
    if (!hasCollateral && section.currentSection === Sections.RECLAIM) {
      setSection({
        currentSection: Sections.SEND
      });
    }
  }, [hasCollateral, isInMemory, section.currentSection, setSection, readyToOperate]);

  // show tx success screen for hw flow
  useEffect(() => {
    if (isInMemory || !builtTxData?.uiTx?.hash) return;
    setSection({ currentSection: Sections.SUCCESS_TX });
  }, [builtTxData?.uiTx?.hash, isInMemory, setSection]);

  const sectionMap: Record<Sections, React.ReactElement> = {
    [Sections.RECLAIM]: <CollateralStepReclaim popupView={popupView} />,
    [Sections.SEND]: (
      <CollateralStepSend
        popupView={popupView}
        password={password}
        setPassword={setPassword}
        isInMemory={isInMemory}
        isPasswordValid={isPasswordValid}
        setIsPasswordValid={setIsPasswordValid}
        txFee={txFee}
        hasEnoughAda={hasEnoughAda}
      />
    ),
    [Sections.SUCCESS_TX]: <TransactionSuccess />,
    [Sections.FAIL_TX]: <TransactionFail />
  };

  const footerMap: Record<Sections, React.ReactElement> = {
    [Sections.RECLAIM]: (
      <CollateralFooterReclaim
        setCurrentStep={setSection}
        onClose={onClose}
        onClaim={clearPassword}
        isInitializing={isInitializing}
        isSubmitting={isSubmitting}
      />
    ),
    [Sections.SEND]: (
      <CollateralFooterSend
        setCurrentStep={setSection}
        onClose={onClose}
        onClaim={clearPassword}
        isInMemory={isInMemory}
        setIsPasswordValid={setIsPasswordValid}
        popupView={popupView}
        password={password}
        submitCollateralTx={submitCollateralTx}
        hasEnoughAda={hasEnoughAda}
        isInitializing={isInitializing}
        isSubmitting={isSubmitting}
      />
    ),
    [Sections.SUCCESS_TX]: (
      <FooterHW hideDrawer={onClose} currentSection={section.currentSection} setCurrentStep={setSection} />
    ),
    [Sections.FAIL_TX]: (
      <FooterHW hideDrawer={onClose} currentSection={section.currentSection} setCurrentStep={setSection} />
    )
  };

  return (
    <Drawer
      visible={visible}
      onClose={handleClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.wallet.collateral.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? handleClose : undefined}
          onArrowIconClick={popupView ? handleClose : undefined}
        />
      }
      popupView={popupView}
      className={styles.collateralDrawer}
      footer={footerMap[section.currentSection]}
    >
      {/* If the wallet is starting the sync process the first time, show the loader as we don't have the necessary values to display the correct state */}
      {!readyToOperate ? <MainLoader /> : sectionMap[section.currentSection]}
    </Drawer>
  );
};
