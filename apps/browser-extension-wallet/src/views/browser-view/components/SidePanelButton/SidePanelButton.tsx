import React from 'react';
import classnames from 'classnames';
import { Button } from '@lace/common';
import ArrowRight from '@src/assets/icons/arrow-right.component.svg';
import ArrowLeft from '@src/assets/icons/arrow-left.component.svg';
import styles from './SidePanelButton.module.scss';

export const SidePanelButton = ({
  active,
  onClick
}: {
  active: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}): React.ReactElement => (
  <Button
    className={styles.roundBtn}
    variant="outlined"
    color="secondary"
    data-testid="side-panel-handler"
    onClick={onClick}
  >
    <div className={classnames(styles.square, { [styles.squareActive]: active })}>
      {active ? <ArrowRight className={styles.icon} /> : <ArrowLeft className={styles.icon} />}
      <div className={classnames(styles.switch, { [styles.active]: active })} />
    </div>
  </Button>
);
