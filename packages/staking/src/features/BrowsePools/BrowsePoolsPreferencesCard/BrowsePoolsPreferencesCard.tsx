import { PostHogAction } from '@lace/common';
import { ReactComponent as SortAlphabeticalAscIcon } from '@lace/icons/dist/SortAlphabeticalAscComponent';
import { ReactComponent as SortAlphabeticalDescIcon } from '@lace/icons/dist/SortAlphabeticalDescComponent';
import { ReactComponent as SortNumericalAscIcon } from '@lace/icons/dist/SortNumericalAscComponent';
import { ReactComponent as SortNumericalDescIcon } from '@lace/icons/dist/SortNumericalDescComponent';
import {
  Card,
  Flex,
  RadioButtonGroup,
  RadioButtonGroupOption,
  Select,
  Text,
  TextBox,
  ToggleButtonGroup,
} from '@lace/ui';
import cn from 'classnames';
import { SortField, StakePoolSortOptions } from 'features/BrowsePools';
import { useOutsideHandles } from 'features/outside-handles-provider';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { USE_MULTI_DELEGATION_STAKING_FILTERS, USE_ROS_STAKING_COLUMN } from '../../../featureFlags';
import { PoolsFilter, QueryStakePoolsFilters } from '../../store';
import { getDefaultSortOrderByField } from '../utils';
import * as styles from './BrowsePoolsPreferencesCard.css';
import { BrowsePoolsPreferencesCardLabel } from './BrowsePoolsPreferencesCardLabel';
import { FilterOption, SelectOption, SortAndFilterTab } from './types';

export interface SortAndFilterProps {
  activeTab: SortAndFilterTab;
  sort?: StakePoolSortOptions;
  filter: QueryStakePoolsFilters;
  onSortChange: (value: StakePoolSortOptions) => void;
  onFilterChange: (filters: QueryStakePoolsFilters) => void;
  onTabChange: (section: SortAndFilterTab) => void;
}

// TODO consider moving this kind of responsibility to the parent component
const ON_CHANGE_DEBOUNCE = 400;

const PostHogActionsMap: Record<SortField, PostHogAction> = {
  blocks: PostHogAction.StakingBrowsePoolsMoreOptionsSortingProducedBlocksClick,
  cost: PostHogAction.StakingBrowsePoolsMoreOptionsSortingCostClick,
  liveStake: PostHogAction.StakingBrowsePoolsMoreOptionsSortingLiveStakeClick,
  margin: PostHogAction.StakingBrowsePoolsMoreOptionsSortingMarginClick,
  pledge: PostHogAction.StakingBrowsePoolsMoreOptionsSortingPledgeClick,
  ros: PostHogAction.StakingBrowsePoolsMoreOptionsSortingROSClick,
  saturation: PostHogAction.StakingBrowsePoolsMoreOptionsSortingSaturationClick,
  ticker: PostHogAction.StakingBrowsePoolsMoreOptionsSortingTickerClick,
};

export const BrowsePoolsPreferencesCard = ({
  activeTab,
  filter,
  sort,
  onFilterChange,
  onTabChange,
  onSortChange,
}: SortAndFilterProps) => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();
  const [localFilters, setLocalFilters] = useState<QueryStakePoolsFilters>(filter);
  const { field: sortBy, order: direction } = sort || {};

  const debouncedFilterChange = useMemo(() => debounce(onFilterChange, ON_CHANGE_DEBOUNCE), [onFilterChange]);
  const handleFilterChange = useCallback(
    (key: PoolsFilter, optIndex: number, value: string) => {
      const newFilters = {
        ...localFilters,
      };
      newFilters[key][optIndex] = value;
      setLocalFilters(newFilters);
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange, localFilters]
  );

  const handleIconClick = useCallback(
    (_sortBy) => {
      const newSort: StakePoolSortOptions = {
        field: _sortBy,
        order: direction === 'desc' ? 'asc' : 'desc',
      };
      onSortChange(newSort);
    },
    [direction, onSortChange]
  );

  const handleSortChange = useCallback(
    (field: string) => {
      const sortField = field as unknown as SortField;
      analytics.sendEventToPostHog(PostHogActionsMap[sortField]);

      onSortChange({
        field: sortField,
        order: getDefaultSortOrderByField(sortField),
      });
    },
    [analytics, onSortChange]
  );

  const getFilters = (filterOption: FilterOption) => {
    if (filterOption.type === 'input') {
      return (
        <Flex>
          {(filterOption.opts as string[]).map((opt, idx) => (
            <TextBox
              key={opt}
              containerClassName={cn(
                filterOption.opts.length > 1 && {
                  [styles.textBoxLeft]: idx === 0,
                  [styles.textBoxRight]: idx === filterOption.opts.length - 1,
                }
              )}
              label={opt}
              value={localFilters[filterOption.key][idx]}
              onChange={(e) => handleFilterChange(filterOption.key, idx, e.target.value)}
              data-testid={`filter-${filterOption.key}-${opt.toLowerCase()}`}
            />
          ))}
        </Flex>
      );
    }

    const selectedValue =
      (filterOption.opts as SelectOption[]).find((opt) => opt.value === localFilters[filterOption.key][0])?.value ?? '';

    return (
      <Select.Root
        variant="grey"
        onChange={(value) => handleFilterChange(filterOption.key, 0, value)}
        showArrow
        placeholder={t('browsePools.preferencesCard.filter.input.select')}
        value={selectedValue}
      >
        {(filterOption.opts as SelectOption[]).map((opt) => (
          <Select.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Select.Root>
    );
  };

  const sortingOptions: RadioButtonGroupOption[] = useMemo(() => {
    const iconAlphabetical =
      direction === 'asc' ? (
        <SortAlphabeticalAscIcon data-testid="sort-asc" />
      ) : (
        <SortAlphabeticalDescIcon data-testid="sort-desc" />
      );
    const iconNumerical =
      direction === 'asc' ? (
        <SortNumericalAscIcon data-testid="sort-asc" />
      ) : (
        <SortNumericalDescIcon data-testid="sort-desc" />
      );

    const values: SortField[] = [
      'ticker',
      'saturation',
      USE_ROS_STAKING_COLUMN && 'ros',
      'cost',
      'margin',
      'blocks',
      'pledge',
      'liveStake',
    ].filter((v): v is SortField => !!v);

    return values.map((value) => ({
      icon: value === 'ticker' ? iconAlphabetical : iconNumerical,
      label: (
        <BrowsePoolsPreferencesCardLabel
          tooltip={t(`browsePools.tooltips.${value}`)}
          text={t(`browsePools.preferencesCard.sort.${value}`)}
        />
      ),
      onIconClick: () => handleIconClick(value),
      value,
    })) as RadioButtonGroupOption[];
  }, [direction, handleIconClick, t]);

  const filterOptions: FilterOption[] = useMemo(() => {
    const fromLabel = t('browsePools.preferencesCard.filter.input.from');
    const toLabel = t('browsePools.preferencesCard.filter.input.to');

    return [
      {
        key: PoolsFilter.Saturation,
        opts: [fromLabel, toLabel],
        title: t('browsePools.preferencesCard.filter.saturation'),
        type: 'input',
      },
      {
        key: PoolsFilter.ProfitMargin,
        opts: [fromLabel, toLabel],
        title: t('browsePools.preferencesCard.filter.profitMargin'),
        type: 'input',
      },
      {
        key: PoolsFilter.Performance,
        opts: [fromLabel, toLabel],
        title: t('browsePools.preferencesCard.filter.performance'),
        type: 'input',
      },
      {
        key: PoolsFilter.Ros,
        opts: [
          {
            label: t('browsePools.preferencesCard.filter.ros.lastEpoch'),
            selected: localFilters[PoolsFilter.Ros][0] === 'lastepoch',
            value: 'lastepoch',
          },
          {
            label: t('browsePools.preferencesCard.filter.ros.other'),
            selected: localFilters[PoolsFilter.Ros][0] === 'lastepoch',
            value: 'other',
          },
        ],
        title: t('browsePools.preferencesCard.filter.ros.title'),
        type: 'select',
      },
    ];
  }, [localFilters, t]);

  return (
    <Card.Outlined>
      <Flex flexDirection="column" justifyContent="flex-start" alignItems="stretch" my="$32" mx="$32" gap="$20">
        <Text.SubHeading weight="$bold" data-testid="stake-pools-more-options-label">
          {t('browsePools.preferencesCard.headers.moreOptions')}
        </Text.SubHeading>
        {USE_MULTI_DELEGATION_STAKING_FILTERS && (
          <ToggleButtonGroup.Root value={activeTab} onValueChange={(value) => onTabChange(value as SortAndFilterTab)}>
            <ToggleButtonGroup.Item value={SortAndFilterTab.sort} data-testid="stake-pools-sorting-toggle">
              {t('browsePools.preferencesCard.headers.sorting')}
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value={SortAndFilterTab.filter} data-testid="stake-pools-filters-toggle">
              {t('browsePools.preferencesCard.headers.filters')}
            </ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        )}
        {activeTab === SortAndFilterTab.sort ? (
          <RadioButtonGroup
            className={styles.radioGroup}
            options={sortingOptions}
            selectedValue={sortBy}
            onValueChange={handleSortChange}
          />
        ) : (
          <Flex flexDirection="column" justifyContent="stretch" alignItems="stretch">
            {filterOptions.map((filterOption) => (
              <Flex
                flexDirection="column"
                m="$4"
                key={filterOption.title}
                alignItems="stretch"
                data-testid={`filter-${filterOption.key}-section`}
              >
                <Text.Body.Small weight="$medium" data-testid={`filter-${filterOption.key}-label`}>
                  {filterOption.title}
                </Text.Body.Small>
                {getFilters(filterOption)}
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
