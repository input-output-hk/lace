/* eslint-disable unicorn/no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-magic-numbers */
import React, { useRef, useState } from 'react';
import cn from 'classnames';
import { Select, Tooltip } from 'antd';
import Icon from '@ant-design/icons';
import { Ellipsis, TextBoxItem } from '@lace/common';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.component.svg';
import styles from './StakePoolSearch.module.scss';
import { ReactComponent as Warning } from '../../assets/icons/warning.component.svg';
import { ReactComponent as BadgeCheckIcon } from '../../assets/icons/badge-check.component.svg';
import { ReactComponent as Loader } from '../../assets/icons/loader.component.svg';
import { TranslationsFor } from '@wallet/util/types';

const SELECT_DROPDOWN_OFFSET_X = 0;
const SELECT_DROPDOWN_OFFSET_Y = 1;

export interface StakePoolItemProps {
  /**
   * Stake pool ID as a bech32 string
   */
  id: string;
  /**
   * Stake pool's container theme
   */
  theme?: string;
  /**
   * Stake pool's name
   */
  name?: string;
  /**
   * Stake pool's ticker
   */
  ticker?: string;
  /**
   * Stake pool's logo
   */
  logo?: string;
  /**
   * Has the stake pool meet their pledge?
   */
  pledgeMet?: boolean;
  /**
   * Has the stake pool retired?
   */
  retired?: boolean; // TODO: replace (LW-168, LW-169)
  /**
   * Stakepool saturation in percentage
   * use to display icon when depending on the amount of saturation
   */
  saturation?: number | string;
  isStakingPool?: boolean;
  /**
   * Action to be executed when clicking on the item
   */
  onClick?: () => unknown;
}

export interface StakePoolSearchListProps {
  /**
   * Array of stake pools to be listed
   */
  pools: StakePoolItemProps[];
  /**
   * Display a spinner when the search results are being fetched
   */
  isSearching?: boolean;
}

type RenderIconTip = 'gettingSaturated' | 'saturated' | 'overSaturation' | 'staking';

const { Option } = Select;
export interface StakePoolSearchProps {
  /**
   * Array of stake pools as search result
   */
  pools: StakePoolSearchListProps['pools'];
  /**
   * Action to be executed when modifying the search bar input
   */
  onChange: (val: string) => unknown;
  /**
   * Search value
   */
  value?: string | null;
  /**
   * Display a spinner when the search results are being fetched
   */
  isSearching?: boolean;
  onStakePoolClick?: (poolid: string) => void;
  translations: TranslationsFor<RenderIconTip | 'searchPlaceholder'>;
  withSuggestions?: boolean;
}

// const tooltipContent = {
//   gettingSaturated: 'This pool starts to be saturated',
//   saturated: 'This pool is saturated',
//   overSaturation: 'This pool is over-saturated'
// };

const renderIcon = (
  tooltipContent: Record<RenderIconTip, string>,
  saturation?: string | number,
  isStakingPool?: boolean
) => {
  const notSaturated = saturation < 90;
  const gettingSaturated = saturation >= 90 && saturation <= 100;
  const saturated = saturation >= 100 && saturation <= 110;

  const iconColor = gettingSaturated ? '#FDC300' : saturated ? '#FF8E3C' : '#FF5470';
  const saturationTooltip = gettingSaturated
    ? tooltipContent.gettingSaturated
    : saturated
    ? tooltipContent.saturated
    : tooltipContent.overSaturation;
  // eslint-disable-next-line unicorn/no-null
  const saturationIcon = notSaturated ? null : (
    <Tooltip title={saturationTooltip}>
      <Warning style={{ color: iconColor, fontSize: '16px' }} />
    </Tooltip>
  );

  return (
    <div className={styles.iconsContainer}>
      {isStakingPool && (
        <Tooltip title={tooltipContent.staking}>
          <BadgeCheckIcon style={{ color: '#2CB67D', fontSize: '16px' }} />
        </Tooltip>
      )}
      {!!saturation && saturationIcon}
    </div>
  );
};

export const StakePoolSearch = ({
  pools,
  onChange,
  // eslint-disable-next-line unicorn/no-null
  value = null,
  isSearching,
  onStakePoolClick,
  translations,
  withSuggestions
}: StakePoolSearchProps): React.ReactElement => {
  const [showRemove, setShowRemove] = useState(false);
  const ref = useRef();

  const renderIconTranslations = {
    gettingSaturated: translations.gettingSaturated,
    saturated: translations.saturated,
    overSaturation: translations.overSaturation,
    staking: translations.staking
  };

  const onOptionSelect = (val: string) => {
    if (ref && ref.current) {
      (ref.current as HTMLElement).blur();
    }
    onStakePoolClick(val);
  };

  const hideRemove = () => {
    setShowRemove(false);
    onChange('');
  };

  return (
    <div
      data-testid="stakepool-search-bar"
      className={cn(styles.search, {
        [styles.withSearchResults]: pools.length > 0,
        [styles.withDropdown]: withSuggestions
      })}
      id="stakepool-search-bar"
    >
      <Icon
        className={styles.searchIcon}
        component={SearchIcon}
        alt="searchIcon"
        style={{ marginRight: '20px' }}
        data-testid="search-icon"
      />
      <Select
        ref={ref}
        showSearch
        // eslint-disable-next-line unicorn/no-null
        value={value}
        data-testid="search-input"
        placeholder={translations.searchPlaceholder}
        defaultActiveFirstOption={false}
        showArrow={false}
        filterOption={false}
        onSearch={(val: string) => onChange(val)}
        onSelect={(val: string) => onOptionSelect(val)}
        onFocus={() => setShowRemove(true)}
        onBlur={() => setShowRemove(false)}
        // eslint-disable-next-line unicorn/no-null
        notFoundContent={null}
        popupClassName={styles.dropdown}
        dropdownAlign={{ offset: [SELECT_DROPDOWN_OFFSET_X, SELECT_DROPDOWN_OFFSET_Y] }}
        getPopupContainer={() => document.querySelector('#stakepool-search-bar')}
        placement="bottomLeft"
      >
        {pools?.map(({ id, name, ticker, logo, saturation, isStakingPool }) => {
          let title = name;
          let subTitle: string | React.ReactElement = ticker || '-';
          if (!name) {
            title = ticker || '-';
            subTitle = (
              <Ellipsis withTooltip={false} className={styles.id} text={id} beforeEllipsis={6} afterEllipsis={8} />
            );
          }
          return (
            <Option value={id} key={id}>
              <div className={styles.container}>
                <div className={styles.name}>
                  <img data-testid="stake-pool-list-logo" src={logo} alt="" className={styles.image} />
                  <div>
                    <h6 data-testid="stake-pool-list-name">{title}</h6>
                    <p data-testid="stake-pool-list-ticker">{subTitle}</p>
                  </div>
                </div>
                {renderIcon(renderIconTranslations, saturation, isStakingPool)}
              </div>
            </Option>
          );
        })}
      </Select>
      {isSearching && (
        <span className={styles.loaderContainer}>
          <Icon className={styles.loader} component={Loader} data-testid="search-results-loader" />
        </span>
      )}
      {showRemove && (
        <div className={styles.reset}>
          <TextBoxItem onClick={hideRemove} icon="cross" />
        </div>
      )}
    </div>
  );
};
