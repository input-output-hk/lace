import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.component.svg';
import styles from './InlineInfoList.module.scss';
import classNames from 'classnames';

interface InlineInfo {
  name: string;
  value: React.ReactNode;
  showCopyIcon?: boolean;
  onClick?: () => void;
}

export interface InlineInfoListProps {
  items: InlineInfo[];
}

export const InlineInfoList = ({ items }: InlineInfoListProps): React.ReactElement => (
  <div data-testid="info-list" className={styles.inlineInfoList}>
    {items.map(({ name, value, showCopyIcon, onClick }, index) => (
      <div data-testid="info-list-item" key={index} className={styles.inlineInfo}>
        <p data-testid="info-list-item-key" className={styles.name}>
          {`${name.slice(0, 1).toUpperCase()}${name.slice(1)}`}
        </p>
        <div className={styles.valueContainer}>
          <h5
            data-testid="info-list-item-value"
            id={showCopyIcon && `$copy-${value}`}
            className={classNames(styles.value, { [styles.link]: !!onClick })}
            onClick={onClick}
          >
            {value}
          </h5>
          {showCopyIcon && (
            <CopyToClipboard text={document.querySelector(`#copy-${value}`).textContent}>
              <CopyIcon className={styles.copyButton} data-testid="info-list-item-copy-btn" />
            </CopyToClipboard>
          )}
        </div>
      </div>
    ))}
  </div>
);
