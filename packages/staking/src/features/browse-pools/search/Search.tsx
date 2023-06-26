import { Search as SearchBase } from '@lace/common';
import * as styles from './Search.module.scss';

export const Search = () => (
  <SearchBase
    className={styles.search}
    withSearchIcon
    inputPlaceholder={'Search by type, token name or ID'}
    onChange={() => console.log('on change')}
    data-testid="search-input"
    loading={false}
  />
);
