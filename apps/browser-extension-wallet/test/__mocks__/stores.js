jest.mock('../../src/stores/StoreProvider', () => ({
  ...jest.requireActual('../../src/stores/StoreProvider'),
}));
