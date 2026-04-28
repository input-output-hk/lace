import { firstStateOfStatus } from '@lace-lib/util-store';
import { switchMap, withLatestFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { FolderId } from '../value-objects';

import type { SideEffect } from '../contract';
import type { Folder } from './types';

export const handleFolderCreation: SideEffect = (
  _,
  { createTokenFolderFlow: { selectState$ } },
  { logger, actions: actionCreators },
) =>
  firstStateOfStatus(selectState$, 'CreatingFolder').pipe(
    switchMap(state => {
      const folderName = state.folderName.trim();

      if (!folderName) {
        logger.error('Folder name cannot be empty');
        return [];
      }

      const folder: Folder = {
        id: FolderId(uuidv4()),
        name: folderName,
        accountId: state.accountId,
      };

      const actions = [];

      actions.push(actionCreators.tokenFolders.createFolder(folder));
      actions.push(actionCreators.createTokenFolderFlow.finalize());

      if (state.selectedTokens.length > 0) {
        actions.push(
          actionCreators.tokenFolders.addTokensToFolder({
            tokenIds: state.selectedTokens,
            folderId: folder.id,
          }),
        );
      }

      return actions;
    }),
  );

export const handleFolderEditPreparing: SideEffect = (
  _,
  {
    editTokenFolderFlow: { selectState$ },
    tokenFolders: { selectAllFolders$, selectTokenIdsByFolderId$ },
  },
  { actions: actionCreators, logger },
) =>
  firstStateOfStatus(selectState$, 'Preparing').pipe(
    withLatestFrom(selectAllFolders$),
    withLatestFrom(selectTokenIdsByFolderId$),
    switchMap(([[state, folders], tokenIdsByFolderId]) => {
      const folder = folders.find(folder => folder.id === state.folderId);

      if (!folder) {
        logger.error(`Cannot find folder with id: ${state.folderId}`);
        return [];
      }

      const folderTokenIds = tokenIdsByFolderId[state.folderId] ?? [];

      return [
        actionCreators.editTokenFolderFlow.proceedToEditing({
          folderName: folder.name,
          selectedTokens: [],
          currentTokensInFolder: folderTokenIds,
        }),
      ];
    }),
  );

export const handleFolderDeleting: SideEffect = (
  _,
  { editTokenFolderFlow: { selectState$ } },
  { actions: actionCreators },
) =>
  firstStateOfStatus(selectState$, 'Deleting').pipe(
    switchMap(state => [
      actionCreators.tokenFolders.deleteFolder(state.folderId),
      actionCreators.editTokenFolderFlow.finalize(),
    ]),
  );

export const handleFolderNameChange: SideEffect = (
  _,
  { editTokenFolderFlow: { selectState$ } },
  { logger, actions: actionCreators },
) =>
  firstStateOfStatus(selectState$, 'ConfirmingNameChange').pipe(
    switchMap(state => {
      const folderName = state.folderName.trim();
      if (!folderName) {
        logger.error('Folder name cannot be empty');
        return [];
      }

      return [
        actionCreators.tokenFolders.updateFolder({
          id: state.folderId,
          name: folderName,
        }),
        actionCreators.editTokenFolderFlow.finalize(),
      ];
    }),
  );

export const handleTokensUpdating: SideEffect = (
  _,
  { editTokenFolderFlow: { selectState$ } },
  { actions: actionCreators },
) =>
  firstStateOfStatus(selectState$, 'UpdatingTokens').pipe(
    switchMap(state => {
      const currentTokensInFolderSet = new Set(state.currentTokensInFolder);
      const selectedTokensSet = new Set(state.selectedTokens);

      const toAdd = state.selectedTokens.filter(
        tokenId => !currentTokensInFolderSet.has(tokenId),
      );
      const toRemove = state.currentTokensInFolder.filter(
        tokenId => !selectedTokensSet.has(tokenId),
      );

      const actionsToExecute = [];

      if (toAdd.length > 0) {
        actionsToExecute.push(
          actionCreators.tokenFolders.addTokensToFolder({
            tokenIds: toAdd,
            folderId: state.folderId,
          }),
        );
      }

      if (toRemove.length > 0) {
        actionsToExecute.push(
          actionCreators.tokenFolders.removeTokensFromFolder({
            tokenIds: toRemove,
            folderId: state.folderId,
          }),
        );
      }

      actionsToExecute.push(actionCreators.editTokenFolderFlow.finalize());

      return actionsToExecute;
    }),
  );

export const initializeSideEffects = () => [
  handleFolderCreation,
  handleFolderDeleting,
  handleFolderEditPreparing,
  handleFolderNameChange,
  handleTokensUpdating,
];
