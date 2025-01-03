import { ICategory } from './types';

const mockedData = JSON.parse(
  '[{"__typename":"Category","id":"9e27cecd-e528-4590-8583-4782ef3784dd","name":"Games"},{"__typename":"Category","id":"8512b21a-85c2-47e2-bd10-a46d3e4c48dd","name":"Other"},{"__typename":"Category","id":"2d6174d4-eb4f-4b72-97c4-fb6ed7dbac6e","name":"DeFi"},{"__typename":"Category","id":"00152bab-214b-4541-be38-86ef4ed924fc","name":"NFT"},{"__typename":"Category","id":"b2f9ed3c-1e8a-4752-9e99-a68d13efa07a","name":"Security"},{"__typename":"Category","id":"c656303a-53f5-4c95-811a-b096cbeb8110","name":"Development"},{"__typename":"Category","id":"5d605de2-8317-448d-8ddc-b631640d4b89","name":"Identity"},{"__typename":"Category","id":"c995d000-2feb-481e-bd17-5c47918689c3","name":"Education"},{"__typename":"Category","id":"7fc14de4-ac75-45e4-86bc-df6210952ffb","name":"Marketplace"}]'
) as ICategory[];

type FetchCategoriesState = {
  loading: boolean;
  error?: Error;
  data: ICategory[];
};

export const useCategoriesFetcher = (): FetchCategoriesState => {
  const { loading, error, data } = {
    loading: false,
    error: undefined as Error,
    data: mockedData
  };

  return { loading, data, error };
};
