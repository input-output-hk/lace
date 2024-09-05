import React from 'react';
import { IogCardClassic } from '../../../components/Card';
import IogEmptyState from '../../../components/EmptyState';
import { EDrawerAction, useDrawer } from '../../../components/ProjectDetail/drawer';
import { useDAppFetcher } from '../../../services/api/d-app';
import { maybeGetCategoryName } from '../../../services/helpers/apis-formatter';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { Skeleton } from 'antd';
import type { ISimpleViewContent } from './types';
import './styles.scss';

// Defines pagination parameters for infinite scroll mechanism.
const MAX_ITEMS_PER_PAGE = 20;

const SimpleViewContent: React.FC<ISimpleViewContent> = ({ selectedCategory, search }) => {
  const { dispatch } = useDrawer<ISectionCardItem>();
  const { data: dapps, loading } = useDAppFetcher({
    category: maybeGetCategoryName(selectedCategory),
    page: { offset: 0, limit: MAX_ITEMS_PER_PAGE },
    search
  });

  const handleOpenDrawer = (drawerData: ISectionCardItem) => {
    dispatch({ type: EDrawerAction.OPEN, data: drawerData });
  };

  const showDApps = !loading && dapps?.length !== undefined && dapps.length > 0;
  const showEmptyState = !loading && dapps?.length === 0;

  const renderCards = (dappsToRender: ISectionCardItem[]) =>
    dappsToRender.map((dapp) => (
      <div key={`card-${dapp.subject}`} className="card-container">
        <IogCardClassic
          {...dapp}
          description={dapp.shortDescription}
          categories={[dapp.category, dapp.subcategory].filter(Boolean)}
          image={dapp.image}
          isCertified={dapp.isCertified}
          onClick={handleOpenDrawer}
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
      {showDApps && <div className="iog-section-card-grid">{renderCards(dapps)}</div>}
      {loading && <Skeleton />}
    </div>
  );
};

export default SimpleViewContent;
