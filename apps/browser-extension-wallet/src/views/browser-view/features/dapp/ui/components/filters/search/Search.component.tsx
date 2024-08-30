import { SearchBox } from '@input-output-hk/lace-ui-toolkit';
import React, { useEffect, useState } from 'react';

export const Search = ({
  onChange,
  initialValue = ''
}: {
  onChange?: (value: string) => void;
  initialValue?: string;
}) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  useEffect(() => onChange?.(searchValue), [searchValue]);
  return (
    <SearchBox
      placeholder="Search by ID or name"
      value={searchValue}
      onChange={setSearchValue}
      onClear={() => setSearchValue('')}
    />
  );
};
