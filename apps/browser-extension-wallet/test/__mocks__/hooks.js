// Can be overridden in tests files with the same approach
jest.mock('../../src/hooks', () => ({
  ...jest.requireActual('../../src/hooks'),
  useFetchAdaPrice: jest.fn().mockReturnValue({
    isFetchingPrice: false,
    priceResult: {
      status: 'fetched',
      error: undefined,
      data: {
        cardano: {
          usd: 21.5,
          // eslint-disable-next-line camelcase
          last_updated_at: 1645821479732
        }
      }
    }
  })
}));
