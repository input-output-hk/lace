/* eslint-disable unicorn/no-null */
import React from 'react';
import { Button } from 'antd';
import styles from './Footer.module.scss';
import { useSections, useSelectedTokenList } from '../../store';
import { useTranslation } from 'react-i18next';

export const AssetPickerFooter = (): React.ReactElement => {
  const { t } = useTranslation();
  const { selectedTokenList, addTokensToOutput } = useSelectedTokenList();
  const { setPrevSection } = useSections();

  const handleClick = () => {
    addTokensToOutput();
    setPrevSection();
  };

  return (
    <div className={styles.footer}>
      <Button
        size="large"
        block
        className={styles.nextStep}
        disabled={selectedTokenList.length === 0}
        onClick={handleClick}
        data-testid={'add-to-transaction-button'}
      >
        {t('multipleSelection.addToTransaction')}
      </Button>
    </div>
  );
};
