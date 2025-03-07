import React, {useState} from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { useWalletStore } from '@src/stores';
import styles from '../DropdownMenuOverlay.module.scss';
import {useBackgroundServiceAPIContext} from "@providers";

type NetworkChoiseProps = {
  onClick: () => void;
};

export const NetworkChoise = ({ onClick }: NetworkChoiseProps): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();

  const [blockchain, setBlockchain] = useState<string>('cardano');
  const backgroundService = useBackgroundServiceAPIContext();

  backgroundService.getBackgroundStorage().then((storage) => {
    const { activeBlockchain } = storage;
    setBlockchain(activeBlockchain);
  });

  return (
    <div
      data-testid="header-menu-network-choice-container"
      className={cn(styles.menuItem, styles.cta)}
      onClick={() => onClick()}
    >
      <div className={styles.networkChoise}>
        <span data-testid="header-menu-network-choice-label">{t('browserView.topNavigationBar.links.network')}</span>
        <span data-testid="header-menu-network-choice-value" className={styles.value}>
          {blockchain === 'cardano' ? environmentName : (environmentName === 'Mainnet' ? environmentName : 'Testnet4')}
        </span>
      </div>
    </div>
  );
};
