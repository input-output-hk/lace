import { State } from '../../migrator/nami-storage.data';

export const createMockNamiStore = (mockedState: Partial<State> = {}): { set: jest.Mock; get: jest.Mock } => {
  const store = {
    set: jest.fn(),
    get: jest.fn()
  };
  store.get.mockResolvedValue(mockedState);
  return store;
};
