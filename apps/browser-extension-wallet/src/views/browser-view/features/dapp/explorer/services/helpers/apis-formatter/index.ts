import { ICategory } from '../../../services/api/categories/types';
import { IFiltersBadge } from './types';

export const formatFiltersResponse = (categories: ICategory[] | undefined): IFiltersBadge[] | [] =>
  categories?.map((category) => ({
    label: category.name,
    value: category.name,
    'data-testid': `classic-filter-${category.name.toLowerCase()}`
  })) || [];

export const maybeGetCategoryName = (value: string): string | undefined => (value === 'all' ? undefined : value);
