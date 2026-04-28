import {
  createStateMachine,
  createStateMachineSlice,
} from '@lace-lib/util-store';

import type { FolderId, TokenId } from '../../value-objects';
import type { StateObject } from '@lace-lib/util-store';

export type EditTokenFolderStateIdle = StateObject<'Idle'>;
export type EditTokenFolderStatePreparing = StateObject<'Preparing'> & {
  folderId: FolderId;
};
export type EditTokenFolderStateOpen = StateObject<
  | 'ConfirmingNameChange'
  | 'Deleting'
  | 'Editing'
  | 'SelectingTokens'
  | 'UpdatingTokens'
> & {
  folderId: FolderId;
  selectedTokens: TokenId[];
  folderName: string;
  currentTokensInFolder: TokenId[];
};

export type EditTokenFolderState =
  | EditTokenFolderStateIdle
  | EditTokenFolderStateOpen
  | EditTokenFolderStatePreparing;

const initialState = {
  status: 'Idle',
} as EditTokenFolderState;

const editTokenFolderFlowSlice = createStateMachineSlice(
  createStateMachine('editTokenFolderFlow', initialState, {
    _crossState: {
      cancel: () => initialState,
    },
    Idle: {
      startEditing: (_, folderId: FolderId) => ({
        status: 'Preparing',
        folderId,
      }),
    },
    Preparing: {
      proceedToEditing: (
        previousState,
        payload: {
          selectedTokens: TokenId[];
          folderName: string;
          currentTokensInFolder: TokenId[];
        },
      ) => ({
        ...previousState,
        status: 'Editing',
        ...payload,
      }),
    },
    Editing: {
      confirmNameChange: (previousState, folderName: string) => ({
        ...previousState,
        folderName,
        status: 'ConfirmingNameChange',
      }),
      delete: previousState => ({
        ...previousState,
        status: 'Deleting',
      }),
      selectTokens: previousState => ({
        ...previousState,
        status: 'SelectingTokens',
      }),
    },
    SelectingTokens: {
      setTokens: (previousState, tokens: TokenId[]) => ({
        ...previousState,
        selectedTokens: tokens,
      }),
      selectingTokensBack: previousState => ({
        ...previousState,
        status: 'Editing',
      }),
      selectingTokensComplete: previousState => ({
        ...previousState,
        status: 'UpdatingTokens',
      }),
    },
    ConfirmingNameChange: {
      finalize: () => initialState,
    },
    Deleting: {
      finalize: () => initialState,
    },
    UpdatingTokens: {
      finalize: () => initialState,
    },
  }),
  {
    selectors: {
      selectState: (state: EditTokenFolderState) => state,
      selectFolderName: (state: EditTokenFolderState) =>
        state.status !== 'Idle' && state.status !== 'Preparing'
          ? state.folderName
          : '',
    },
  },
);

export const editTokenFolderFlowReducers = {
  [editTokenFolderFlowSlice.name]: editTokenFolderFlowSlice.reducer,
};

export const editTokenFolderFlowActions = {
  ...editTokenFolderFlowSlice.actions,
};

export const editTokenFolderFlowSelectors = {
  ...editTokenFolderFlowSlice.selectors,
};
