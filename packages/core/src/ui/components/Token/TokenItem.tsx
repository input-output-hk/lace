import React, { useState } from 'react';
import { Image } from 'antd';
import DefaultActivityImage from '../../assets/images/token-default-logo.png';
import { ReactComponent as SelectedIcon } from '../../assets/icons/check-token-icon.svg';

import styles from './TokenItem.module.scss';
import { useTranslate } from '@src/ui/hooks';

export interface TokenItemProps {
  amount: string;
  fiat: string;
  name: string;
  description: string;
  logo?: string;
  onClick?: () => void;
  selected?: boolean;
}

export const TokenItem = ({
  onClick,
  amount,
  fiat,
  name,
  description,
  selected,
  logo = DefaultActivityImage
}: TokenItemProps): React.ReactElement => {
  const { t } = useTranslate();
  const [isDeselectVisible, setDeselectVisibility] = useState(false);

  const handleMouseIn = () => setDeselectVisibility(true);
  const handleMouseOut = () => setDeselectVisibility(false);

  // add hover action only when token is selected
  const amountContainerMouseHandlers = selected ? { onMouseEnter: handleMouseIn, onMouseLeave: handleMouseOut } : {};
  return (
    <div
      {...amountContainerMouseHandlers}
      data-testid="coin-search-row"
      onClick={onClick}
      className={styles.tokenContainer}
    >
      <div className={styles.leftSide}>
        <div data-testid="coin-search-row-icon" className={styles.iconWrapper}>
          {selected && <div className={styles.overlay} />}
          {selected && SelectedIcon && <SelectedIcon className={styles.selectedIcon} />}
          <Image src={logo} className={styles.icon} preview={false} alt="asset image" />
        </div>
        <div data-testid="coin-search-row-info" className={styles.info}>
          <h6>{name}</h6>
          <p>{description}</p>
        </div>
      </div>
      <div data-testid="coin-search-row-amount" className={styles.rightSide}>
        {isDeselectVisible && selected ? (
          <span className={styles.deselect}>{t('multipleSelection.deselect', 'Deselect')}</span>
        ) : (
          <>
            <h6>{amount}</h6>
            <p>{fiat}</p>
          </>
        )}
      </div>
    </div>
  );
};
