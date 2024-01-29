import React from 'react';

import { ReactComponent as Search } from '@lace/icons/dist/SearchComponent';

import { Flex } from '../flex';

import * as cx from './search-box-icon.css';

export const SearchIcon = (): JSX.Element => (
  <Flex alignItems="center" justifyContent="center" className={cx.container}>
    <Search />
  </Flex>
);
