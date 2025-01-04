import { SearchBox } from '@input-output-hk/lace-ui-toolkit';
import React, { useEffect, useState } from 'react';

type SearchProps = {
  onChange?: (value: string) => void;
  initialValue?: string;
};

export const Search: React.FC<SearchProps> = ({ onChange, initialValue = '' }) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  useEffect(() => onChange?.(searchValue), [onChange, searchValue]);
  return (
    <SearchBox
      placeholder="Search by ID or name"
      value={searchValue}
      onChange={setSearchValue}
      onClear={() => setSearchValue('')}
    />
  );
};
