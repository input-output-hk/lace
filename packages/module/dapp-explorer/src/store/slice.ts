import { createSlice } from '@reduxjs/toolkit';

import type { DAppRadarItem, DappCategory } from '../types';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

type DataFetchStatus = 'error' | 'idle' | 'loading' | 'success'; // very generic, potentially move to a contract, maybe useful if we want to defer anything in mobile, but not for the others

type SearchParams = {
  category: DappCategory;
  chain: BlockchainName | undefined;
  searchValue: string;
};

export type DappExplorerState = {
  selectedDapp: DAppRadarItem | null;
  search: SearchParams;
  categories: DappCategory[] | null;
  dappList: DAppRadarItem[];
  status: DataFetchStatus;
};

const initialState: DappExplorerState = {
  selectedDapp: null,
  search: {
    category: 'show all',
    chain: undefined,
    searchValue: '',
  },
  categories: [],
  dappList: [],
  status: 'loading',
};

const slice = createSlice({
  name: 'dappExplorer',
  initialState,
  reducers: {
    setExplorerList: (state, { payload }: PayloadAction<DAppRadarItem[]>) => {
      state.dappList = payload;
      state.status = 'success';
    },
    setAvailableCategories: (
      state,
      { payload }: PayloadAction<DappCategory[]>,
    ) => {
      state.categories = payload;
    },
    setSearchParams: (
      state,
      { payload }: PayloadAction<Partial<SearchParams>>,
    ) => {
      state.search = {
        ...state.search,
        ...payload,
      };
    },
    setSearchChain: (state, { payload }: PayloadAction<BlockchainName>) => {
      state.search.chain = payload;
    },
    setFetchStatus: (state, { payload }: PayloadAction<DataFetchStatus>) => {
      {
        state.status = payload;
      }
    },
    resetSearchParams: state => {
      state.search = initialState.search;
    },
  },
  selectors: {
    getAvailableDappCategories: (state: Readonly<DappExplorerState>) =>
      state.categories,
    getDappById: (state: Readonly<DappExplorerState>, dappItem: number) =>
      state.dappList.find(dapp => dapp.dappId === dappItem),
    getSearchParams: (state: Readonly<DappExplorerState>) => state.search,
    getSelectedDapp: (state: Readonly<DappExplorerState>) => state.selectedDapp,
    getFetchStatus: (state: Readonly<DappExplorerState>) => state.status,
    getDappList: (state: Readonly<DappExplorerState>) => state.dappList,
  },
});

export const dappCenterReducers = {
  [slice.name]: slice.reducer,
};

export const dappExplorerActions = {
  dappExplorer: {
    ...slice.actions,
  },
};

export const dappExplorerSelectors = { dappExplorer: slice.selectors };

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof dappCenterReducers> {}
}
