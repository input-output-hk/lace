import { useTranslation } from '@lace-contract/i18n';
import {
  isForbiddenTokenName,
  isTakenTokenName,
  useEditTokenName,
} from '@lace-contract/midnight-context';
import {
  NavigationControls,
  type SheetScreenProps,
} from '@lace-lib/navigation';
import { EditTokenNameBottomSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes } from '@lace-lib/navigation';

export const EditTokenNameSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.EditTokenName>) => {
  const { token, takenTokenNames } = route.params;
  const { t } = useTranslation();
  const upsertTokenMetadata = useDispatchLaceAction(
    'tokens.upsertTokenMetadata',
  );

  const {
    tokenFullName,
    tokenShortName,
    setTokenFullName,
    setTokenShortName,
    tokenFullNameError,
    tokenShortNameError,
    isSaveDisabled,
    handleSave,
    handleClose,
  } = useEditTokenName({
    token,
    takenTokenNames,
    onSave: metadata => {
      upsertTokenMetadata(metadata);
      NavigationControls.sheets.close();
    },
    onClose: () => {
      NavigationControls.sheets.close();
    },
    getErrorMessage: (name, excludedNames) => {
      if (isTakenTokenName(name, excludedNames)) {
        return t('tokens.detail-drawer.custom-name.input.error.name-taken');
      }
      if (isForbiddenTokenName(name)) {
        return t('tokens.detail-drawer.custom-name.input.error.forbidden-name');
      }
      return undefined;
    },
  });

  return (
    <EditTokenNameBottomSheet
      labels={{
        title: t('tokens.detail-drawer.header'),
        nameLabel: t('tokens.detail-drawer.custom-name.input.full-name'),
        tickerLabel: t('tokens.detail-drawer.custom-name.input.short-name'),
        confirmLabel: t('tokens.detail-drawer.save'),
        cancelLabel: t('tokens.detail-drawer.cancel'),
      }}
      values={{
        tokenFullName,
        tokenShortName,
        tokenFullNameError,
        tokenShortNameError,
      }}
      actions={{
        onTokenFullNameChange: setTokenFullName,
        onTokenShortNameChange: setTokenShortName,
        onConfirm: handleSave,
        onCancel: handleClose,
      }}
      utils={{ isConfirmDisabled: isSaveDisabled }}
    />
  );
};
