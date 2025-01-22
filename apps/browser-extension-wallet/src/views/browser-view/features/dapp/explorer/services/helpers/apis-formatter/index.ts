import { IFiltersBadge } from './types';

export const formatFiltersResponse = (categories: string[]): IFiltersBadge[] | [] =>
  categories?.map((category) => ({
    label: category,
    value: category,
    'data-testid': `classic-filter-${category.toLowerCase()}`
  })) || [];

export const maybeGetCategoryName = (value: string): string | undefined => (value === 'all' ? undefined : value);
