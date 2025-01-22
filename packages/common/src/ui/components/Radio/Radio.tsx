import React from 'react';
import { Radio as AntRadio, RadioProps } from 'antd';
import cn from 'classnames';
import styles from './Radio.module.scss';

export const Radio = ({ value, children, className, ...rest }: RadioProps): React.ReactElement => (
  <AntRadio value={value} className={cn(styles.radio, className && { [className]: className })} {...rest}>
    {children}
  </AntRadio>
);
