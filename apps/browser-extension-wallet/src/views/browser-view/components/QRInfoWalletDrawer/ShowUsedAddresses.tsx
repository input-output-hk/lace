import React from 'react';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '../Drawer';
import { useDrawer } from '../../stores';
import styles from './ShowUsedAddresses.module.scss';

export const ShowUsedAddresses = (): React.ReactElement => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();

  return (
    <div className={styles.block}>
      <Button
        className={styles.showUsedAddresses}
        color="secondary"
        data-testid="show-used-addresses-btn"
        onClick={() => setDrawerConfig({ content: DrawerContent.SHOW_USED_ADDRESSES })}
      >
        {t('core.receive.showUsedAddresses')}
      </Button>
    </div>
  );
};
