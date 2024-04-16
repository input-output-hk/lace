import React, { ReactElement } from 'react';
import Empty from '@assets/icons/empty.svg';
import { Image } from 'antd';
import styles from './EmptySearch.module.scss';

export const EmptySearch = ({ text }: { text: string }): ReactElement => (
  <div className={styles.container}>
    <Image preview={false} src={Empty} />
    <div className={styles.text}>{text}</div>
  </div>
);
