import React from 'react';
import styles from './MnemonicWordsWritedownRevamp.module.scss';
import { MnemonicWordContainerRevamp } from './MnemonicWordContainerRevamp';
import classnames from 'classnames';
import { simpleCipher } from '@ui/utils/simple-cipher';

export interface MnemonicWordsWritedownProps {
  words: string[];
  fourColumnView?: boolean;
  blurWords?: boolean;
}

export const stopContextMenuDisplays = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
  e.preventDefault();
};

export const MnemonicWordsWritedownRevamp = ({
  words,
  blurWords = false
}: MnemonicWordsWritedownProps): React.ReactElement => (
  <div className={styles.container}>
    {words.map((word, index) => (
      <MnemonicWordContainerRevamp
        disabled
        onContextMenu={stopContextMenuDisplays}
        number={index + 1}
        key={index}
        className={classnames(styles.wordContainer, { [styles.blur]: blurWords })}
      >
        <p data-testid="mnemonic-word-writedown" onContextMenu={stopContextMenuDisplays} className={styles.word}>
          {blurWords ? simpleCipher(word) : word}
        </p>
      </MnemonicWordContainerRevamp>
    ))}
  </div>
);
