import React from 'react';
import styles from './MnemonicWordsConfirmInputRevamp.module.scss';
import { MnemonicWordsAutoComplete } from '../../MnemonicWordsAutoComplete';

export interface MnemonicWordsConfirmInputProps {
  words: string[];
  onChange: (words: string[]) => void;
  onDropdownVisibleChange?: (open: boolean) => void;
  suggestionList?: Array<string>;
  focus?: boolean;
  handlePaste?: (index: number) => void;
}

const TWENTY_FOUR_WORD_LENGTH = 24;

export const MnemonicWordsConfirmInputRevamp = ({
  words,
  onChange,
  onDropdownVisibleChange,
  suggestionList,
  handlePaste
}: MnemonicWordsConfirmInputProps): React.ReactElement => (
  <div className={styles.container}>
    {words.map((word, index) => (
      <MnemonicWordsAutoComplete
        handlePaste={() => handlePaste(index)}
        value={word}
        onChange={(value) => {
          const newWords = [...words];
          newWords[index] = value;
          onChange(newWords);
        }}
        onDropdownVisibleChange={onDropdownVisibleChange}
        idx={index + 1}
        key={index}
        wordList={suggestionList}
        className={
          words.length === TWENTY_FOUR_WORD_LENGTH ? styles.fourColumnWordContainer : styles.threeColumnWordContainer
        }
      />
    ))}
  </div>
);
