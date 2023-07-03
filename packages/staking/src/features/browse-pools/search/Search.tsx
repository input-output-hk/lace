import { Search as SearchBase, SearchProps as SearchBaseProps } from '@lace/common';
import { useTranslation } from 'react-i18next';
import * as styles from './Search.module.scss';

type SearchProps = Pick<SearchBaseProps, 'onChange' | 'loading'>;

export const Search = ({ onChange, loading }: SearchProps) => {
  const { t } = useTranslation();

  return (
    <SearchBase
      className={styles.search}
      withSearchIcon
      inputPlaceholder={t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')}
      onChange={onChange}
      data-testid="search-input"
      loading={loading}
    />
  );
};
