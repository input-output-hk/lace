import { QueryResult, useQuery } from '@apollo/client';
import { GET_CATEGORIES } from './categories.gql';
import { ICategory } from './types';

export const useCategoriesFetcher = (): Partial<QueryResult<ICategory[]>> => {
  const { loading, error, data } = useQuery(GET_CATEGORIES);

  const categories = data?.categories || [];

  return { loading, data: categories, error };
};
