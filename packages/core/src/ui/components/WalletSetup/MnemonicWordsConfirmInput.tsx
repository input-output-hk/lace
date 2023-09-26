import React from 'react';
import styles from './MnemonicWordsConfirmInput.module.scss';
import { MnemonicWordsAutoComplete } from '../MnemonicWordsAutoComplete';

export interface MnemonicWordsConfirmInputProps {
  firstWordNumber: number;
  words: string[];
  onChange: (words: string[]) => void;
  onDropdownVisibleChange?: (open: boolean) => void;
  suggestionList?: Array<string>;
  focus?: boolean;
}

export const MnemonicWordsConfirmInput = ({
  firstWordNumber,
  words,
  onChange,
  onDropdownVisibleChange,
  suggestionList
}: MnemonicWordsConfirmInputProps): React.ReactElement => (
  <div className={styles.mnemonicWordsConfirm}>
    {words.map((word, index) => (
      <MnemonicWordsAutoComplete
        value={word}
        onChange={(value) => {
          const newWords = [...words];
          newWords[index] = value;
          onChange(newWords);
        }}
        onDropdownVisibleChange={onDropdownVisibleChange}
        idx={index + firstWordNumber}
        key={index}
        wordList={suggestionList}
        focus={index + firstWordNumber === firstWordNumber}
      />
    ))}
  </div>
);
