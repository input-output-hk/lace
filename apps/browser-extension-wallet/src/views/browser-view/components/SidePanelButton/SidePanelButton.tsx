import React from 'react';
import classnames from 'classnames';
import { Button } from '@lace/common';
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
    <div className={styles.square}>
      <div className={classnames(styles.switch, { [styles.active]: active })} />
    </div>
  </Button>
);
