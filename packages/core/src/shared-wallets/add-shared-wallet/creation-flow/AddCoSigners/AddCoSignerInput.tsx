import { Box, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { TFunction } from 'i18next';
import React, { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CoSigner, CoSignerDirty, CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './type';

export const maxCoSignerNameLength = 20;

interface Props {
  dirty?: CoSignerDirty;
  error?: CoSignerError;
  onChange: (coSigner: CoSigner) => void;
  value: CoSigner;
}

type FieldName = 'keys' | 'name';

const parseError = (error: CoSignerError | undefined, t: TFunction): Partial<Record<FieldName, string>> => {
  if (!error) return {};

  let nameErrorMessage;
  if (error.name === CoSignerErrorName.Required) {
    nameErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.nameInputError.required');
  }
  if (error.name === CoSignerErrorName.Duplicated) {
    nameErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.nameInputError.duplicated');
  }
  if (error.name === CoSignerErrorName.TooLong) {
    nameErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.nameInputError.tooLong', {
      amount: maxCoSignerNameLength,
    });
  }

  let keysErrorMessage;
  if (error.keys === CoSignerErrorKeys.Required) {
    keysErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.keysInputError.required');
  }
  if (error.keys === CoSignerErrorKeys.Invalid) {
    keysErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.keysInputError.invalid');
  }

  return {
    keys: keysErrorMessage,
    name: nameErrorMessage,
  };
};

export const AddCoSignerInput = ({ dirty, onChange, value, error }: Props): JSX.Element => {
  const { t } = useTranslation();
  const errorMessage = parseError(error, t);

  const makeChangeHandler = (fieldName: FieldName) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [fieldName]: event.target.value });
  };

  return (
    <>
      <Box mb="$8">
        <TextBox
          label={t('sharedWallets.addSharedWallet.addCosigners.nameInputLabel')}
          value={value.name}
          errorMessage={(dirty?.name && errorMessage.name) || undefined}
          onChange={makeChangeHandler('name')}
          w="$fill"
        />
      </Box>
      <Box>
        <TextBox
          label={t('sharedWallets.addSharedWallet.addCosigners.keysInputLabel')}
          value={value.keys}
          errorMessage={(dirty?.keys && errorMessage.keys) || undefined}
          onChange={makeChangeHandler('keys')}
          w="$fill"
        />
      </Box>
    </>
  );
};
