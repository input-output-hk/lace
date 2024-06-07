import { Box, TextBox } from '@lace/ui';
import { TFunction } from 'i18next';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CoSigner, CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './type';

export const maxCoSignerNameLength = 20;

interface Props {
  onChange: (coSigner: CoSigner) => void;
  value: CoSigner;
  error: CoSignerError;
}

type FieldName = 'keys' | 'name';

const parseError = (error: CoSignerError | undefined, t: TFunction): Partial<Record<FieldName, string>> => {
  if (!error) return {};

  let nameErrorMessage;
  if (error.name === CoSignerErrorName.Required) {
    nameErrorMessage = t('core.sharedWallet.addCosigners.nameInputError.required');
  }
  if (error.name === CoSignerErrorName.Duplicated) {
    nameErrorMessage = t('core.sharedWallet.addCosigners.nameInputError.duplicated');
  }
  if (error.name === CoSignerErrorName.TooLong) {
    nameErrorMessage = t('core.sharedWallet.addCosigners.nameInputError.tooLong', {
      amount: maxCoSignerNameLength
    });
  }

  let keysErrorMessage;
  if (error.keys === CoSignerErrorKeys.Required) {
    keysErrorMessage = t('core.sharedWallet.addCosigners.keysInputError.required');
  }
  if (error.keys === CoSignerErrorKeys.Invalid) {
    keysErrorMessage = t('core.sharedWallet.addCosigners.keysInputError.invalid');
  }

  return {
    keys: keysErrorMessage,
    name: nameErrorMessage
  };
};

export const AddCoSignerInput = ({ onChange, value, error }: Props): JSX.Element => {
  const { t } = useTranslation();
  const [dirty, setDirty] = useState<Record<FieldName, boolean>>({
    keys: false,
    name: false
  });
  const errorMessage = parseError(error, t);

  const makeChangeHandler = (fieldName: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDirty({ ...dirty, [fieldName]: true });
    onChange({ ...value, [fieldName]: event.target.value });
  };

  return (
    <>
      <Box mb="$8">
        <TextBox
          label={t('core.sharedWallet.addCosigners.nameInputLabel')}
          value={value.name}
          errorMessage={dirty.name && errorMessage.name}
          onChange={makeChangeHandler('name')}
          w="$fill"
        />
      </Box>
      <Box>
        <TextBox
          label={t('core.sharedWallet.addCosigners.keysInputLabel')}
          value={value.keys}
          errorMessage={dirty.keys && errorMessage.keys}
          onChange={makeChangeHandler('keys')}
          w="$fill"
        />
      </Box>
    </>
  );
};
