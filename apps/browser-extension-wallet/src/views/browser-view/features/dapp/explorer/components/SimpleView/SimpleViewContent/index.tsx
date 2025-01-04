import React, { useEffect } from 'react';
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

const isScrollbarAtBottom = () => {
  const bodyHeight = document.body.scrollHeight;
  const windowHeight = window.innerHeight;

  // if difference between visible screen and scrollbar vertical position is less than 5px
  // eslint-disable-next-line no-magic-numbers
  return Math.round(bodyHeight - windowHeight) - Math.round(window.scrollY) < 5;
};

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchNext = (_renderedDapps: ISectionCardItem[]) => fetchMore();

  const loadMoreDapps = () => {
    if (isScrollbarAtBottom() && hasNextPage) {
      fetchNext(dapps);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', loadMoreDapps);

    return () => {
      window.removeEventListener('scroll', loadMoreDapps);
    };
  });

  const handleOpenDrawer = (drawerData: ISectionCardItem) => {
    dispatch({ type: EDrawerAction.OPEN, data: drawerData });
  };

  const showDApps = !loading && dapps?.length !== undefined && dapps.length > 0;
  const showEmptyState = !loading && dapps?.length === 0;

  const [infiniteScrollRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMoreDapps,
    rootMargin: '0px 0px 0px 0px'
  });

  const renderCards = (dappsToRender: ISectionCardItem[]) =>
    dappsToRender.map((dapp) => (
      <div key={`card-${dapp.subject}`} className="card-container">
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
    <div className="iog-simple-view-content-container" ref={infiniteScrollRef}>
      {showDApps && <div className="iog-section-card-grid">{renderCards(dapps)}</div>}
      {loading && <Skeleton />}
    </div>
  );
};

export default SimpleViewContent;
