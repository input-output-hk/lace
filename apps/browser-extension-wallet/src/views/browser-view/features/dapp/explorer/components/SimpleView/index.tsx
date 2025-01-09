import * as React from 'react';
import { SearchBox } from '@input-output-hk/lace-ui-toolkit';

import SimpleViewContent from './SimpleViewContent';
import SimpleViewFilters from './SimpleViewFilters';

import styles from './index.styles.module.scss';
import { DappListTitle } from '../../../ui/components/list/DappListTitle.component';

const { useState } = React;
const dappsCategoryToTitle = (category: string) => (category === 'all' ? 'All DApps' : category);

const SimpleView: React.FC = () => {
  const [selectedCategory, setCategory] = useState<string>('all');
  const [searchValue, setSearchValue] = useState('');

  return (
    <>
      <div className={styles.header}>
        <DappListTitle title={dappsCategoryToTitle(selectedCategory)} />
        <div className={styles.searchInput}>
          <SearchBox
            placeholder={'Search'}
            value={searchValue}
            onChange={setSearchValue}
            onClear={() => setSearchValue('')}
            data-testid="dapp-explorer-search-input"
          />
        </div>
      </div>
      <SimpleViewFilters onChangeCategory={setCategory} />
      <SimpleViewContent selectedCategory={selectedCategory} search={searchValue} />
    </>
  );
};

export default SimpleView;
