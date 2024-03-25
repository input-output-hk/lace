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
  SelectGroup,
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
import * as styles from './BrowsePoolsPreferencesCard.css';
import { BrowsePoolsPreferencesCardLabel } from './BrowsePoolsPreferencesCardLabel';
import { FilterOption, SelectOption, SortAndFilterTab } from './types';

export interface SortAndFilterProps {
  activeTab: SortAndFilterTab;
  sort: StakePoolSortOptions;
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
  const { field: sortBy, order: direction } = sort;

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

  const handleIconClick = useCallback(() => {
    const newSort: StakePoolSortOptions = {
      field: sortBy,
      order: direction === 'desc' ? 'asc' : 'desc',
    };
    onSortChange(newSort);
  }, [direction, onSortChange, sortBy]);

  const handleSortChange = useCallback(
    (field: string) => {
      const sortField = field as unknown as SortField;
      analytics.sendEventToPostHog(PostHogActionsMap[sortField]);

      onSortChange({
        field: sortField,
        order: 'asc',
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
            />
          ))}
        </Flex>
      );
    }

    const selectedValue =
      (filterOption.opts as SelectOption[]).find((opt) => opt.value === localFilters[filterOption.key][0])?.value ?? '';

    return (
      <SelectGroup
        onValueChange={(value) => handleFilterChange(filterOption.key, 0, value)}
        showArrow
        withOutline
        className={styles.selectGroup}
        placeholder={t('browsePools.preferencesCard.filter.input.select')}
        options={filterOption.opts as SelectOption[]}
        selectedValue={selectedValue}
      />
    );
  };

  const sortingOptions: RadioButtonGroupOption[] = useMemo(() => {
    const iconAlphabetical = direction === 'asc' ? SortAlphabeticalAscIcon : SortAlphabeticalDescIcon;
    const iconNumerical = direction === 'asc' ? SortNumericalAscIcon : SortNumericalDescIcon;
    return [
      {
        icon: iconAlphabetical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.ticker')}
            text={t('browsePools.preferencesCard.sort.ticker')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'ticker',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.saturation')}
            text={t('browsePools.preferencesCard.sort.saturation')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'saturation',
      },
      USE_ROS_STAKING_COLUMN && {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.ros')}
            text={t('browsePools.preferencesCard.sort.ros')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'ros',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.cost')}
            text={t('browsePools.preferencesCard.sort.cost')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'cost',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.margin')}
            text={t('browsePools.preferencesCard.sort.margin')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'margin',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.blocks')}
            text={t('browsePools.preferencesCard.sort.blocks')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'blocks',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.pledge')}
            text={t('browsePools.preferencesCard.sort.pledge')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'pledge',
      },
      {
        icon: iconNumerical,
        label: (
          <BrowsePoolsPreferencesCardLabel
            tooltip={t('browsePools.tooltips.liveStake')}
            text={t('browsePools.preferencesCard.sort.liveStake')}
          />
        ),
        onIconClick: handleIconClick,
        value: 'liveStake',
      },
    ].filter(Boolean) as RadioButtonGroupOption[];
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
        <Text.SubHeading weight="$bold">{t('browsePools.preferencesCard.headers.moreOptions')}</Text.SubHeading>
        {USE_MULTI_DELEGATION_STAKING_FILTERS && (
          <ToggleButtonGroup.Root value={activeTab} onValueChange={(value) => onTabChange(value as SortAndFilterTab)}>
            <ToggleButtonGroup.Item value={SortAndFilterTab.sort}>
              {t('browsePools.preferencesCard.headers.sorting')}
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value={SortAndFilterTab.filter}>
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
              <Flex flexDirection="column" m="$4" key={filterOption.title} alignItems="stretch">
                <Text.Body.Small weight="$medium">{filterOption.title}</Text.Body.Small>
                {getFilters(filterOption)}
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
