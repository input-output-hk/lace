import React from 'react';
import styles from './MnemonicWordsWritedown.module.scss';
import { MnemonicWordContainer } from './MnemonicWordContainer';
import classnames from 'classnames';
import { simpleCipher } from '@src/ui/utils/simple-cipher';

export interface MnemonicWordsWritedownProps {
  words: string[];
  fourColumnView?: boolean;
  blurWords?: boolean;
}

export const stopContextMenuDisplays = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
  e.preventDefault();
};

export const MnemonicWordsWritedown = ({
  words,
  fourColumnView = false,
  blurWords = false
}: MnemonicWordsWritedownProps): React.ReactElement => (
  <div className={fourColumnView ? styles.fourColumnViewContainer : styles.mnemonicWordsWritedown}>
    {words.map((word, index) => (
      <MnemonicWordContainer
        disabled
        onContextMenu={stopContextMenuDisplays}
        number={index + 1}
        key={index}
        className={classnames({ [styles.blur]: blurWords, [styles.fourColumnWordContainer]: fourColumnView })}
      >
        <p
          data-testid="mnemonic-word-writedown"
          onContextMenu={stopContextMenuDisplays}
          className={fourColumnView ? styles.fourColumnWord : styles.word}
        >
          {blurWords ? simpleCipher(word) : word}
        </p>
      </MnemonicWordContainer>
    ))}
  </div>
);
