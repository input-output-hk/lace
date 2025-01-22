import * as React from 'react';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { IogText } from '../Typography';
import Empty from './images/Empty';
import './styles.scss';

const IogEmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="iog-empty-state" data-testid="empty-state">
      <div data-testid="empty-state-image">
        <Empty />
      </div>
      <Text.Body.Large weight={'$bold'} data-testid="empty-state-header">
        {t('dappdiscovery.empty_state.no_dapps_title')}
      </Text.Body.Large>
      <IogText as="div" small normal color="dark" center data-testid="empty-state-text">
        {t('dappdiscovery.empty_state.no_dapps_content1')}
      </IogText>
      <IogText as="div" small normal color="dark" center data-testid="empty-state-text-2">
        {t('dappdiscovery.empty_state.no_dapps_content2')}
      </IogText>
    </div>
  );
};

export default IogEmptyState;
