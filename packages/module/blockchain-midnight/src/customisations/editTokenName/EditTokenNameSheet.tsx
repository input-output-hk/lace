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
import { EditTokenNameBottomSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes } from '@lace-lib/navigation';

export const EditTokenNameSheet = ({
  navigation,
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
      NavigationControls.closeSheet();
    },
    onClose: () => {
      NavigationControls.closeSheet();
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

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={t('tokens.detail-drawer.header')} />,
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: t('tokens.detail-drawer.cancel'),
            onPress: handleClose,
          }}
          primaryButton={{
            label: t('tokens.detail-drawer.save'),
            onPress: handleSave,
            disabled: isSaveDisabled,
          }}
        />
      ),
    });
  }, [navigation, t, handleClose, handleSave, isSaveDisabled]);

  return (
    <EditTokenNameBottomSheet
      labels={{
        nameLabel: t('tokens.detail-drawer.custom-name.input.full-name'),
        tickerLabel: t('tokens.detail-drawer.custom-name.input.short-name'),
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
      }}
    />
  );
};
