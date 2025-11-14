import React from 'react';
import { IogCardClassic } from '../../../components/Card';
import IogEmptyState from '../../../components/EmptyState';
import { EDrawerAction, useDrawer } from '../../../components/ProjectDetail/drawer';
import { useDAppFetcher } from '../../../services/api/d-app';
import { maybeGetCategoryName } from '../../../services/helpers/apis-formatter';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import type { ISimpleViewContent } from './types';
import './styles.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

const SimpleViewContent: React.FC<ISimpleViewContent> = ({ selectedCategory, search }) => {
  const { dispatch } = useDrawer<ISectionCardItem>();
  const { data: dapps, loading } = useDAppFetcher({
    category: maybeGetCategoryName(selectedCategory),
    search
  });
  const analytics = useAnalyticsContext();

  const handleOpenDrawer = (drawerData: ISectionCardItem) => {
    dispatch({ type: EDrawerAction.OPEN, data: drawerData });
    void analytics.sendEventToPostHog(PostHogAction.DappExplorerDappTileClick, {
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_category_name: selectedCategory,
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_dapp_name: drawerData?.title,
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_dapp_url: drawerData?.link
    });
  };

  const showEmptyState = !loading && dapps?.length === 0;

  const renderCards = (dappsToRender: ISectionCardItem[]) =>
    dappsToRender.map((dapp, index) => (
      <div key={`card-${dapp.id}-${index}`} className="card-container">
        <IogCardClassic
          {...dapp}
          categories={dapp.categories}
          image={dapp.image}
          onClick={() => handleOpenDrawer(dapp)}
          title={dapp.title}
        />
      </div>
    ));

  if (showEmptyState) {
    return (
      <div className="iog-empty-state-container">
        <IogEmptyState />
      </div>
    );
  }

  return (
    <div className="iog-simple-view-content-container">
      <div className="iog-section-card-grid">{renderCards(dapps)}</div>
    </div>
  );
};

export default SimpleViewContent;
