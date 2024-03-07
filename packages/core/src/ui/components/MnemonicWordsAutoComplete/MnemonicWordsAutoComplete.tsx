/* eslint-disable unicorn/no-useless-undefined */
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AutoComplete, Input, InputRef } from 'antd';
import classnames from 'classnames';
import { wordListSearch } from '../../utils/word-list-search';
import styles from './MnemonicWordsAutoComplete.module.scss';
import { MnemonicWordContainerRevamp } from '../WalletSetupRevamp/WalletSetupMnemonicStepRevamp';

const AUTO_COMPLETE_DROPDOWN_OFFSET_X = -43;
const AUTO_COMPLETE_DROPDOWN_OFFSET_Y = 16;
const DEFAULT_INPUT_MAX_LENGTH = 10;

export interface MnemonicWordsAutoCompleteProps {
  idx?: number;
  value: string;
  onChange: (words: string) => void;
  onDropdownVisibleChange?: (open: boolean) => void;
  wordList?: Array<string>;
  max?: number;
  focus?: boolean;
  className?: string;
  handlePaste?: () => void;
}

export const MnemonicWordsAutoComplete = ({
  idx = 1,
  value,
  wordList = [],
  onChange,
  onDropdownVisibleChange,
  max = DEFAULT_INPUT_MAX_LENGTH,
  focus = false,
  className,
  handlePaste
}: MnemonicWordsAutoCompleteProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isMaskVisible, setIsMaskVisible] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | undefined>();

  useEffect(() => {
    if (focus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focus, idx]);

  const handleSearch = useCallback(
    (word: string) => {
      const filteredList = wordListSearch(word, wordList);
      const parsedList = filteredList.map((item) => ({ value: item, label: item }));
      setOptions(parsedList);
    },
    [wordList]
  );

  const handleSelect = (select: string) => {
    onChange(select);
    setPickedOption(select);
    setIsMaskVisible(false);
  };

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => onChange(target.value);

  const handleKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) => {
    if (key === 'Tab') {
      const word = pickedOption || options[0]?.label || '';
      onChange(word);
    } else if (key === 'Backspace' || key === 'Delete') {
      setIsMaskVisible(true);
      setPickedOption(undefined);
    }
  };

  const resetState = () => {
    setOptions([]);
    setPickedOption(undefined);
  };

  const getOptions = () => handleSearch(value);

  const maskValues = useMemo(() => {
    const typedWord = value || '';

    if (typedWord === '') return { typedWord: '', autofillSuggestion: '' };

    const word = options[0]?.label || '';
    const start = typedWord.length;
    const end = word.length;

    const autofillSuggestion = word.slice(start, end);

    if (typedWord.length > max) {
      const maxCharWord = typedWord.slice(0, max);

      return { typedWord: maxCharWord, autofillSuggestion };
    }

    return { typedWord, autofillSuggestion };
  }, [options, value, max]);

  return (
    <MnemonicWordContainerRevamp ref={containerRef} number={idx} className={className}>
      <AutoComplete
        popupClassName={styles.dropdown}
        className={styles.autoComplete}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        backfill
        defaultActiveFirstOption
        bordered={false}
        dropdownAlign={{
          offset: [AUTO_COMPLETE_DROPDOWN_OFFSET_X, AUTO_COMPLETE_DROPDOWN_OFFSET_Y]
        }}
        dropdownMatchSelectWidth={containerRef?.current?.offsetWidth}
        onBlur={resetState}
        onFocus={getOptions}
        autoFocus={idx === 1}
        onDropdownVisibleChange={onDropdownVisibleChange}
      >
        <div className={styles.autocompleteContent} data-testid={`mnemonic-word-input-${idx}`}>
          <Input
            data-testid="mnemonic-word-input"
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={classnames(styles.input, { [styles.focus]: isMaskVisible })}
            value={value?.slice(0, max)}
            onChange={handleChange}
            bordered={false}
            onBlur={() => setIsMaskVisible(false)}
            onFocus={() => setIsMaskVisible(true)}
            id={`mnemonic-word-${idx}`}
            ref={inputRef}
            autoComplete="off"
          />
          {isMaskVisible && (
            <div className={styles.inputMask}>
              <p className={styles.typed}>{maskValues.typedWord}</p>
              <p className={styles.suggested}>{maskValues.autofillSuggestion}</p>
            </div>
          )}
        </div>
      </AutoComplete>
    </MnemonicWordContainerRevamp>
  );
};
