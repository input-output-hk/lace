import React from 'react';
import { Button } from '@lace/common';
import { AssetsCounter } from './AssetCounter';
import styles from './SelectTokensButton.module.scss';

interface SelectTokenButtonProps {
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  count?: number;
  btnStyle?: React.CSSProperties;
}

export const SelectTokenButton = ({
  label,
  onClick,
  count = 0,
  btnStyle
}: SelectTokenButtonProps): React.ReactElement => (
  <div className={styles.container}>
    {count > 0 && <AssetsCounter count={count} />}
    <Button
      style={btnStyle}
      onClick={onClick}
      color="secondary"
      variant="outlined"
      className={styles.selectMultipleBtn}
    >
      {label}
    </Button>
  </div>
);
