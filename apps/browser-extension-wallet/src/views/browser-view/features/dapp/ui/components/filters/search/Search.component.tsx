import { SearchBox } from '@input-output-hk/lace-ui-toolkit';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type SearchProps = {
  onChange?: (value: string) => void;
  initialValue?: string;
};

export const Search: React.FC<SearchProps> = ({ onChange, initialValue = '' }) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const { t } = useTranslation();
  useEffect(() => onChange?.(searchValue), [onChange, searchValue]);
  return (
    <SearchBox
      placeholder={t('asset.searchPlaceholder')}
      value={searchValue}
      onChange={setSearchValue}
      onClear={() => setSearchValue('')}
    />
  );
};
