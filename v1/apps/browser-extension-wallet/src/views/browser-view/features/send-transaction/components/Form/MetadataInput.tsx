/* eslint-disable unicorn/no-useless-undefined */
import React, { useState } from 'react';
import { Input, TextBoxItem } from '@lace/common';
import classnames from 'classnames';
import styles from './MetadataInput.module.scss';
import { useMetadata } from '../../store';
import { useTranslation, Trans } from 'react-i18next';
import { METADATA_MAX_LENGTH } from '../../constants';

export const MetadataInput = (): React.ReactElement => {
  const { t } = useTranslation();
  const [value, setMetadataMsg] = useMetadata();
  const [focused, setFocused] = useState(false);
  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => setMetadataMsg(target.value);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    setMetadataMsg(undefined);
  };

  const handleFocusedState = () => setFocused((prev) => !prev);

  const hasReachedCharLimit = value?.length > METADATA_MAX_LENGTH;
  const displayCounter = !!value || focused;
  return (
    <div
      data-testid="metadata-input-container"
      className={classnames(styles.metadataInput, { [styles.visibleCounter]: displayCounter })}
    >
      <Input
        onFocus={handleFocusedState}
        onBlur={handleFocusedState}
        data-testid="metadata-input"
        value={value}
        onChange={handleChange}
        suffix={
          <div
            data-testid="metadata-input-suffix"
            className={classnames(styles.suffixContent, { [styles.focus]: focused || value?.length > 0 })}
          >
            <TextBoxItem iconClassName={styles.iconSize} onClick={handleClick} disabled={!value} />
          </div>
        }
        label={t('browserView.transaction.send.metadata.addANote')}
        focus={focused}
      />

      {displayCounter && (
        <p
          data-testid="metadata-counter"
          className={classnames(styles.characterCounter, {
            [styles.error]: hasReachedCharLimit
          })}
        >
          <Trans
            values={{ count: `${value?.length || 0}/${METADATA_MAX_LENGTH}` }}
            i18nKey="browserView.transaction.send.metadata.count"
          />
        </p>
      )}
    </div>
  );
};
