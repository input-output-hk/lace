import { CategoryMenu } from '../filters/categories/CategoryMenu.component';
import { CategoryData } from '../filters/categories/CategoryMenuItem.component';
import { DappList } from '../list/DappList.component';
import { DappListItemData } from '../list/DappListItem.component';
import { DappListTitle } from '../list/DappListTitle.component';
import React, { useState } from 'react';
import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import { Search } from '../filters/search/Search.component';
import * as styles from './DappCollection.css';

const isSearchResult = (name: string, searchTerm: string) => name.toLowerCase().includes(searchTerm.toLowerCase());

const isInCategory = (dapp: DappListItemData, category: CategoryData) =>
  dapp.categories?.includes(category.name) ?? false;

export const DappCollection = ({
  title,
  dapps,
  categories
}: {
  title: string;
  dapps: DappListItemData[];
  categories: CategoryData[];
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | undefined>();

  const dappsFiltered = dapps.filter(
    (dapp) =>
      isSearchResult(dapp.projectName, searchValue) && (!selectedCategory || isInCategory(dapp, selectedCategory))
  );
  return (
    <>
      <Flex alignItems="center" justifyContent="space-between">
        <Box className={styles.title}>
          <DappListTitle title={title} count={dapps.length} />
        </Box>
        <Search onChange={setSearchValue} />
      </Flex>
      <CategoryMenu
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryClicked={setSelectedCategory}
      />
      <DappList items={dappsFiltered} />
    </>
  );
};
