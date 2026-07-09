import { createSlice } from '@reduxjs/toolkit';

import type { DappCategory, DappItem } from '../types';
import type { BlockchainName } from '@lace-lib/util-store';
import type { PayloadAction } from '@reduxjs/toolkit';

type DataFetchStatus = 'error' | 'idle' | 'loading' | 'success';

type SearchParams = {
  category: DappCategory;
  chain: BlockchainName | undefined;
  searchValue: string;
};

export type DappExplorerState = {
  selectedDapp: DappItem | null;
  search: SearchParams;
  categories: DappCategory[] | null;
  dappList: DappItem[];
  status: DataFetchStatus;
  ukFcaDisclaimerAcknowledged: boolean;
  lastFetchedAt: number | null;
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
  ukFcaDisclaimerAcknowledged: false,
  lastFetchedAt: null,
};

const slice = createSlice({
  name: 'dappExplorer',
  initialState,
  reducers: {
    setExplorerList: (state, { payload }: PayloadAction<DappItem[]>) => {
      state.dappList = payload;
    },
    appendToExplorerList: (state, { payload }: PayloadAction<DappItem[]>) => {
      const existing = new Set(state.dappList.map(d => d.slug));
      for (const dapp of payload) {
        if (!existing.has(dapp.slug)) state.dappList.push(dapp);
      }
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
      state.search = { ...state.search, ...payload };
    },
    setSearchChain: (state, { payload }: PayloadAction<BlockchainName>) => {
      state.search.chain = payload;
    },
    setFetchStatus: (state, { payload }: PayloadAction<DataFetchStatus>) => {
      state.status = payload;
    },
    resetSearchParams: state => {
      state.search = initialState.search;
    },
    acknowledgeUkFcaDisclaimer: state => {
      state.ukFcaDisclaimerAcknowledged = true;
    },
    setLastFetchedAt: (state, { payload }: PayloadAction<number>) => {
      state.lastFetchedAt = payload;
    },
    loadDappsRequested: () => {},
  },
  selectors: {
    getAvailableDappCategories: (state: Readonly<DappExplorerState>) =>
      state.categories,
    getDappById: (state: Readonly<DappExplorerState>, slug: string) =>
      state.dappList.find(dapp => dapp.slug === slug),
    getSearchParams: (state: Readonly<DappExplorerState>) => state.search,
    getSelectedDapp: (state: Readonly<DappExplorerState>) => state.selectedDapp,
    getFetchStatus: (state: Readonly<DappExplorerState>) => state.status,
    getDappList: (state: Readonly<DappExplorerState>) => state.dappList,
    getLastFetchedAt: (state: Readonly<DappExplorerState>) =>
      state.lastFetchedAt,
    selectUkFcaDisclaimerAcknowledged: (state: Readonly<DappExplorerState>) =>
      state.ukFcaDisclaimerAcknowledged,
  },
});

export const dappCenterReducers = { [slice.name]: slice.reducer };

export const dappExplorerActions = {
  dappExplorer: { ...slice.actions },
};

export const dappExplorerSelectors = { dappExplorer: slice.selectors };
