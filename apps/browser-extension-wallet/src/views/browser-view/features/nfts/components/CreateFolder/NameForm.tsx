import React, { ChangeEvent, ReactElement, useEffect, useState } from 'react';
import { Input } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './NameForm.module.scss';
import type { TranslationKey } from '@lace/translation';

interface GeneralSettingsDrawerProps {
  usedFolderNames: Array<string>;
  name: string;
  onSetName: (name?: string) => void;
  onSetIsFormValid: (isValid?: boolean) => void;
}

const MAX_CHARS = 20;
const validateName = (name: string, usedFolderNames: Array<string> = []): TranslationKey | '' => {
  if (usedFolderNames.includes(name)) return 'browserView.nfts.folderDrawer.nameForm.givenNameAlreadyExist';
  if (name.length > MAX_CHARS) return 'browserView.nfts.folderDrawer.nameForm.inputError';
  return '';
};

export enum Sections {
  FORM = 'form',
  ASSET_PICKER = 'asset_picker'
}

export const NameForm = ({
  usedFolderNames,
  name: folderName,
  onSetName,
  onSetIsFormValid
}: GeneralSettingsDrawerProps): ReactElement => {
  const { t } = useTranslation();
  const [isDirty, setIsDirty] = useState(false);
  const [name, setName] = useState(folderName || '');
  const nameValidationError = validateName(name, usedFolderNames);

  const isNameEmpty = name.length === 0;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setIsDirty(true);
    setName(newName);
    onSetName(newName);
  };

  useEffect(() => {
    onSetIsFormValid(!nameValidationError && !isNameEmpty);
  }, [nameValidationError, isNameEmpty, name, onSetIsFormValid]);

  useEffect(() => {
    setName(folderName);
  }, [folderName]);

  return (
    <div className={styles.inputContainer}>
      <Input
        focus
        label={t('browserView.nfts.folderDrawer.nameForm.inputPlaceholder')}
        value={name}
        onChange={handleNameChange}
        dataTestId="folder-name-input"
      />
      {isDirty && nameValidationError && !isNameEmpty && (
        <p className={styles.formError} data-testid="folder-name-input-error">
          {t(nameValidationError, { length: MAX_CHARS })}
        </p>
      )}
    </div>
  );
};
