import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { CollateralFooter, CollateralStepSend, CollateralStepReclaim } from './';
import { useCollateral, useSyncingTheFirstTime, useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import styles from './Collateral.module.scss';
import { useCurrencyStore } from '@providers';

interface CollateralDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
  hasCollateral?: boolean;
}

export type CollateralStep = 'send' | 'reclaim';

export const CollateralDrawer = ({
  visible,
  onClose,
  popupView,
  hasCollateral
}: CollateralDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { getKeyAgentType } = useWalletStore();
  const { executeWithPassword } = useWalletManager();
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);
  const [password, setPassword] = useState<string>();
  const clearPassword = () => setPassword('');
  const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<CollateralStep>('send');
  const isWalletSyncingForTheFirstTime = useSyncingTheFirstTime();
  const { tx, initializeCollateralTx, submitCollateralTx, isInitializing, isSubmitting, hasEnoughAda } =
    useCollateral();
  const { fiatCurrency } = useCurrencyStore();

  useEffect(() => {
    if (!visible) return;
    initializeCollateralTx();
  }, [initializeCollateralTx, visible]);

  useEffect(() => {
    setCurrentStep(hasCollateral ? 'reclaim' : 'send');
  }, [hasCollateral, visible]);

  const submitTx = async () => {
    if (isInMemory) {
      await executeWithPassword(password, submitCollateralTx);
    } else {
      submitCollateralTx();
    }
  };

  const renderStep = () => {
    if (currentStep === 'reclaim') {
      return <CollateralStepReclaim popupView={popupView} />;
    }
    return (
      <CollateralStepSend
        tx={tx}
        hasEnoughAda={hasEnoughAda}
        popupView={popupView}
        password={password}
        setPassword={setPassword}
        isInMemory={isInMemory}
        isPasswordValid={isPasswordValid}
        setIsPasswordValid={setIsPasswordValid}
        isWalletSyncingForTheFirstTime={isWalletSyncingForTheFirstTime}
        fiatCurrency={fiatCurrency}
      />
    );
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.wallet.collateral.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
      className={styles.collateralDrawer}
      footer={
        <CollateralFooter
          setCurrentStep={setCurrentStep}
          isInitializing={isInitializing}
          isSubmitting={isSubmitting}
          submitCollateralTx={submitTx}
          hasCollateral={hasCollateral}
          hasEnoughAda={hasEnoughAda}
          onClose={onClose}
          onClaim={clearPassword}
          isInMemory={isInMemory}
          setIsPasswordValid={setIsPasswordValid}
          popupView={popupView}
          isButtonDisabled={currentStep !== 'reclaim' && hasEnoughAda && !password}
        />
      }
    >
      {renderStep()}
    </Drawer>
  );
};
