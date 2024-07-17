import { Box, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { TFunction } from 'i18next';
import React, { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CoSigner, CoSignerDirty, CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './type';

export const maxCoSignerNameLength = 20;
type FieldName = 'sharedWalletKey' | 'name';

interface AddCoSignerInputProps {
  dirty?: CoSignerDirty;
  error?: CoSignerError;
  keyFieldDisabled: boolean;
  labels: Record<FieldName, string>;
  onChange: (coSigner: CoSigner) => void;
  value: CoSigner;
}

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

  let keyErrorMessage;
  if (error.sharedWalletKey === CoSignerErrorKeys.Required) {
    keyErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.keyInputError.required');
  }
  if (error.sharedWalletKey === CoSignerErrorKeys.Invalid) {
    keyErrorMessage = t('sharedWallets.addSharedWallet.addCosigners.keyInputError.invalid');
  }

  return {
    name: nameErrorMessage,
    sharedWalletKey: keyErrorMessage,
  };
};

export const AddCoSignerInput = ({
  dirty,
  onChange,
  keyFieldDisabled,
  labels,
  value,
  error,
}: AddCoSignerInputProps): JSX.Element => {
  const { t } = useTranslation();
  const errorMessage = parseError(error, t);

  const makeChangeHandler = (fieldName: FieldName) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [fieldName]: event.target.value });
  };

  return (
    <>
      <Box mb="$8">
        <TextBox
          label={labels.name}
          value={value.name}
          errorMessage={(dirty?.name && errorMessage.name) || undefined}
          onChange={makeChangeHandler('name')}
          w="$fill"
        />
      </Box>
      <Box>
        <TextBox
          label={labels.sharedWalletKey}
          value={value.sharedWalletKey}
          errorMessage={(dirty?.sharedWalletKey && errorMessage.sharedWalletKey) || undefined}
          onChange={makeChangeHandler('sharedWalletKey')}
          w="$fill"
          disabled={keyFieldDisabled}
        />
      </Box>
    </>
  );
};
