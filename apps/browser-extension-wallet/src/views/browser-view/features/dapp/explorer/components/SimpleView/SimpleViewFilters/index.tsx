import * as React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import IogSlider from '../../Slider';
import { IogRow } from '../../Grid';
import { ISimpleViewFilters, ITag } from './types';
import CategoryChip from './CategoryChip';
import './styles.scss';
import { useCategoriesFetcher } from '../../../services/api/categories';
import { formatFiltersResponse } from '../../../services/helpers/apis-formatter';
import { PostHogAction } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { DefaultCategory } from '@views/browser/features/dapp/explorer/components/SimpleView/SimpleViewFilters/CategoryChip/categories.enum';

const { useState, useEffect } = React;

const SimpleViewFilters: React.FC<ISimpleViewFilters> = ({ onChangeCategory }) => {
  const history = useHistory();
  const location = useLocation();
  const [active, setActive] = useState<string>('all');
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const ALL_CATEGORIES_FILTER = [
    {
      label: t('dappdiscovery.show_all'),
      value: DefaultCategory.All,
      'data-testid': 'classic-filter-all'
    }
  ];

  const { data: categories } = useCategoriesFetcher();
  const formattedCategories = [...ALL_CATEGORIES_FILTER, ...formatFiltersResponse(categories)];

  useEffect(() => {
    if (onChangeCategory) onChangeCategory(active);
  }, [active, onChangeCategory]);

  const handleChangeCategory = (category: string) => {
    setActive(category);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const swiper = document.querySelector<Element & { swiper: any }>('.iog-classic-view-filters-slider')?.swiper;
    const position = formattedCategories.findIndex(({ value }) => value === category?.toLowerCase());
    swiper?.slideTo(position);
  };

  useEffect(() => {
    if (!location.search) return;
    const query = new URLSearchParams(location.search.slice(1));

    if (query.has('category')) handleChangeCategory(query.get('category'));
    // TODO: refactor the dependency on handleChangeCategory which is re-created on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, categories]);

  const handleSetActive = (value: string) => {
    const nextCategory = value.toLowerCase();
    setActive(nextCategory);
    if (onChangeCategory) onChangeCategory(nextCategory);
    void analytics.sendEventToPostHog(PostHogAction.DappExplorerCategoryClick, {
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_category_name: value
    });

    history.push({
      search: value !== 'all' ? `category=${nextCategory}` : ''
    });
  };

  return (
    <IogRow className="iog-simple-view-filters">
      <div className="iog-simple-view-filters-container">
        <IogSlider
          className="iog-simple-view-filters-slider"
          data={formattedCategories || []}
          horizontal
          threshold={100}
          buttonSolid
          slidesPerView="auto"
          spaceBetween={16}
          edgeSwipeThreshold={20}
          slidesPerGroup={3}
          speed={650}
          mousewheel
          navigation={{
            prevEl: '.swiper-filters-prev',
            nextEl: '.swiper-filters-next'
          }}
          itemProps={({ label, value }: ITag) => ({
            key: `${label}`,
            className: classNames({
              'iog-tag': true,
              'iog-tag--active': value.toLocaleLowerCase() === active.toLowerCase()
            }),
            onClick: () => handleSetActive(value),
            children: (
              <CategoryChip active={value.toLocaleLowerCase() === active.toLowerCase()} value={value} label={label} />
            )
          })}
          data-testid="grid-category-slider"
        >
          <div />
        </IogSlider>
      </div>
    </IogRow>
  );
};

export default SimpleViewFilters;
