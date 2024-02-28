import Icon from '@ant-design/icons';
import { Button } from '@lace/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import ExpandIcon from './expand-gradient.component.svg';
import styles from './ExpandViewBanner.module.scss';

export const ExpandViewBanner = (): React.ReactElement => {
  const { t } = useTranslation();
  const { expandStakingView = () => void 0 } = useOutsideHandles();

  return (
    <div className={styles.wrapper}>
      <div className={styles.container} data-testid="expanded-view-banner-container">
        <div className={styles.title} data-testid="expanded-view-banner-title">
          {t('popup.expandBanner.title')}
        </div>
        <div className={styles.description} data-testid="expanded-view-banner-description">
          {t('popup.expandBanner.description')}
        </div>
        <Button
          onClick={() => expandStakingView()}
          className={styles.button}
          size="large"
          color="gradient"
          data-testid="expanded-view-banner-button"
        >
          <Icon component={ExpandIcon} className={styles.icon} />
          {t('popup.expandBanner.button')}
        </Button>
      </div>
    </div>
  );
};
