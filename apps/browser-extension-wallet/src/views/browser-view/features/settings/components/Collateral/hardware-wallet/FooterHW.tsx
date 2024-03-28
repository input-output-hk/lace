import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import styles from '@views/browser/features/send-transaction/components/SendTransactionDrawer/Footer.module.scss';
import { Sections } from '../types';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections, MessageTypes } from '@lib/scripts/types';
import { SectionConfig } from '@src/views/browser-view/stores';
import { useBuiltTxState } from '@src/views/browser-view/features/send-transaction';
import { TranslationKey } from '@lib/translations/types';

export const nextStepBtnLabels: Partial<Record<Sections, TranslationKey>> = {
  [Sections.SUCCESS_TX]: 'browserView.transaction.send.footer.viewTransaction',
  [Sections.FAIL_TX]: 'browserView.transaction.send.footer.fail'
};

interface FooterProps {
  setCurrentStep: (section?: SectionConfig<Sections>) => void;
  currentSection: Sections;
  hideDrawer: () => void;
}

export const FooterHW = ({ currentSection, setCurrentStep, hideDrawer }: FooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const reditectToTransactions = useRedirection(walletRoutePaths.activity);
  const backgroundServices = useBackgroundServiceAPIContext();
  const { clearBuiltTxData } = useBuiltTxState();
  const closeDrawer = useRedirection(walletRoutePaths.settings);

  const onConfirm = useCallback(() => {
    if (currentSection === Sections.SUCCESS_TX) {
      hideDrawer();
      clearBuiltTxData();
      setCurrentStep({ currentSection: Sections.RECLAIM });
      reditectToTransactions();
    } else {
      clearBuiltTxData();
      setCurrentStep({ currentSection: Sections.SEND });
    }
    // TODO: Remove this workaround for Hardware Wallets alongside send flow and staking.
    window.location.reload();
  }, [currentSection, hideDrawer, clearBuiltTxData, setCurrentStep, reditectToTransactions]);

  const onClose = useCallback(async () => {
    const backgroundStorage = await backgroundServices.getBackgroundStorage();

    if (!backgroundStorage) return;
    if (
      backgroundStorage.message?.type === MessageTypes.OPEN_COLLATERAL_SETTINGS &&
      backgroundStorage.message?.data.section === BrowserViewSections.COLLATERAL_SETTINGS
    ) {
      await backgroundServices.clearBackgroundStorage({ keys: ['message'] });
    }

    closeDrawer();
    // TODO: Remove this workaround for Hardware Wallets alongside send flow and staking.
    window.location.reload();
  }, [backgroundServices, closeDrawer]);

  return (
    <div className={styles.footer}>
      <Button size="large" block onClick={onConfirm} data-testid="collateral-tx-next-btn">
        {t(nextStepBtnLabels[currentSection])}
      </Button>
      <Button color="secondary" size="large" block onClick={onClose} data-testid="collateral-tx-cancel-btn">
        {currentSection === Sections.SUCCESS_TX
          ? t('browserView.transaction.send.footer.close')
          : t('browserView.transaction.send.footer.cancel')}
      </Button>
    </div>
  );
};
