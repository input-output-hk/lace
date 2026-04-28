import {
  createStateMachine,
  createStateMachineSlice,
} from '@lace-lib/util-store';

import type { TokenId } from '../../value-objects';
import type { StateObject } from '@lace-lib/util-store';

export type CreateTokenFolderFlowStateIdle = StateObject<'Idle'>;
export type CreateTokenFolderFlowStateOpen = StateObject<
  'CreatingFolder' | 'NamingFolder' | 'SelectingTokens'
> & {
  accountId: string;
  folderName: string;
  selectedTokens: TokenId[];
};

export type CreateTokenFolderFlowState =
  | CreateTokenFolderFlowStateIdle
  | CreateTokenFolderFlowStateOpen;

const initialState = {
  status: 'Idle',
} as CreateTokenFolderFlowState;

const createTokenFolderFlowSlice = createStateMachineSlice(
  createStateMachine('createTokenFolderFlow', initialState, {
    _crossState: {
      cancel: () => initialState,
    },
    Idle: {
      startCreation: (
        _previousState: CreateTokenFolderFlowStateIdle,
        accountId: string,
      ) => ({
        status: 'NamingFolder',
        accountId,
        folderName: '',
        selectedTokens: [],
      }),
    },
    NamingFolder: {
      namingFolderNext: (previousState, folderName: string) => ({
        ...previousState,
        status: 'SelectingTokens',
        folderName,
      }),
    },
    SelectingTokens: {
      addToken: (previousState, tokenId: TokenId) => ({
        ...previousState,
        selectedTokens: [...previousState.selectedTokens, tokenId],
      }),
      removeToken: (previousState, tokenId: TokenId) => ({
        ...previousState,
        selectedTokens: previousState.selectedTokens.filter(
          id => id !== tokenId,
        ),
      }),
      selectingTokensBack: previousState => ({
        ...previousState,
        status: 'NamingFolder',
      }),
      selectingTokensNext: previousState => ({
        ...previousState,
        status: 'CreatingFolder',
      }),
    },
    CreatingFolder: {
      finalize: () => initialState,
    },
  }),
  {
    selectors: {
      selectState: (state: CreateTokenFolderFlowState) => state,
    },
  },
);

export const createTokenFolderFlowReducers = {
  [createTokenFolderFlowSlice.name]: createTokenFolderFlowSlice.reducer,
};

export const createTokenFolderFlowActions = {
  ...createTokenFolderFlowSlice.actions,
};

export const createTokenFolderFlowSelectors = {
  ...createTokenFolderFlowSlice.selectors,
};
