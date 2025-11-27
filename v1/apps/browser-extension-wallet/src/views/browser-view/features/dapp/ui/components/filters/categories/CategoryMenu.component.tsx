import { CategoryData, CategoryMenuItem } from '../categories/CategoryMenuItem.component';
import React from 'react';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
// import allDappsIcon from '../../../components/filters/categories/assets/all-dapps-category-icon.png';

type CategoryMenuProps = {
  categories: CategoryData[];
  selectedCategory?: CategoryData;
  onCategoryClicked?: (category?: CategoryData) => void;
};

export const CategoryMenu: React.FC<CategoryMenuProps> = ({ categories, selectedCategory, onCategoryClicked }) => (
  <>
    <Flex alignItems="center" gap="$16">
      {/* <CategoryMenuItem*/}
      {/*  icon={allDappsIcon.src}*/}
      {/*  name="Show all"*/}
      {/*  isSelected={selectedCategory === undefined}*/}
      {/*  onClick={() => onCategoryClicked?.()}*/}
      {/* />*/}
      {categories.map((category, index) => (
        <CategoryMenuItem
          key={index}
          icon={category.icon}
          name={category.name}
          isSelected={selectedCategory === category}
          onClick={() => onCategoryClicked?.(category)}
        />
      ))}
    </Flex>
  </>
);
