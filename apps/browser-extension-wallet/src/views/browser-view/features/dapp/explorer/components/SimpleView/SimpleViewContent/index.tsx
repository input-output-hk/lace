import React from 'react';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import { IogCardClassic } from '../../../components/Card';
import IogEmptyState from '../../../components/EmptyState';
import { EDrawerAction, useDrawer } from '../../../components/ProjectDetail/drawer';
import { useDAppFetcher } from '../../../services/api/d-app';
import { maybeGetCategoryName } from '../../../services/helpers/apis-formatter';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { Skeleton } from 'antd';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import type { ISimpleViewContent } from './types';
import './styles.scss';

// Defines pagination parameters for infinite scroll mechanism.
const MAX_ITEMS_PER_PAGE = 20;

const SimpleViewContent: React.FC<ISimpleViewContent> = ({ selectedCategory, search }) => {
  const { dispatch } = useDrawer<ISectionCardItem>();
  const {
    data: dapps,
    loading,
    fetchMore,
    hasNextPage
  } = useDAppFetcher({
    category: maybeGetCategoryName(selectedCategory),
    page: { offset: 0, limit: MAX_ITEMS_PER_PAGE },
    search
  });

  const handleOpenDrawer = (drawerData: ISectionCardItem) => {
    dispatch({ type: EDrawerAction.OPEN, data: drawerData });
  };

  const showEmptyState = !loading && dapps?.length === 0;

  const [infiniteScrollRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: fetchMore,
    rootMargin: '0px 0px 0px 0px'
  });

  const renderCards = (dappsToRender: ISectionCardItem[]) =>
    dappsToRender.map((dapp, index) => (
      <div key={`card-${dapp.subject}-${index}`} className="card-container">
        <IogCardClassic
          {...dapp}
          description={dapp.shortDescription}
          categories={[dapp.category, dapp.subcategory].filter(Boolean)}
          image={dapp.image}
          isCertified={dapp.isCertified}
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
      {(loading || hasNextPage) && (
        <Box mt={'$24'} ref={infiniteScrollRef}>
          <Skeleton />
        </Box>
      )}
    </div>
  );
};

export default SimpleViewContent;
