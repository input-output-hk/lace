import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import styles from './Fallback.module.scss';

export const Fallback = (): React.ReactElement => (
  <div className={styles.fallback}>
    <Spin size="large" indicator={<LoadingOutlined />} spinning />
  </div>
);
