/* eslint-disable unicorn/no-useless-undefined */
import React, { useState } from 'react';
import { Input, TextBoxItem } from '@lace/common';
import classnames from 'classnames';
import styles from './OpReturnMessageInput.module.scss';
import { useTranslation, Trans } from 'react-i18next';

const MAX_LENGTH = 80;

interface OpReturnInputProps {
  onOpReturnMessageChange: (value: string) => void;
  opReturnMessage: string;
  disabled?: boolean;
}

export const OpReturnMessageInput: React.FC<OpReturnInputProps> = ({
  onOpReturnMessageChange,
  opReturnMessage,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [value, setOpReturnMessageMsg] = useState(opReturnMessage);
  const [focused, setFocused] = useState(false);
  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setOpReturnMessageMsg(target.value);
    onOpReturnMessageChange(target.value);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    setOpReturnMessageMsg(undefined);
    onOpReturnMessageChange('');
  };

  const handleFocusedState = () => setFocused((prev) => !prev);

  const hasReachedCharLimit = value?.length > MAX_LENGTH;
  const displayCounter = !!value || focused;
  return (
    <div
      data-testid="opReturn-message-input-container"
      className={classnames(styles.opReturnMessageInput, { [styles.visibleCounter]: displayCounter })}
    >
      <Input
        onFocus={handleFocusedState}
        onBlur={handleFocusedState}
        data-testid="opReturn-message-input"
        value={value}
        onChange={handleChange}
        suffix={
          <div
            data-testid="opReturn-message-input-suffix"
            className={classnames(styles.suffixContent, { [styles.focus]: focused || value?.length > 0 })}
          >
            <TextBoxItem iconClassName={styles.iconSize} onClick={handleClick} disabled={!value} />
          </div>
        }
        label={t('browserView.transaction.send.metadata.addAOpReturnNote')}
        focus={focused}
        disabled={disabled}
      />

      {displayCounter && (
        <p
          data-testid="opReturn-message-counter"
          className={classnames(styles.characterCounter, {
            [styles.error]: hasReachedCharLimit
          })}
        >
          <Trans
            values={{ count: `${value?.length || 0}/${MAX_LENGTH}` }}
            i18nKey="browserView.transaction.send.metadata.count"
          />
        </p>
      )}
    </div>
  );
};
