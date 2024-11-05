import { Radio, RadioProps } from 'antd';
import React from 'react';
import cn from 'classnames';
import styles from './Radio.module.scss';

export const RadioGroup = ({ children, className, ...rest }: RadioProps): React.ReactElement => (
  <Radio.Group className={cn(styles.radioGroup, className && { [className]: className })} {...rest}>
    {children}
  </Radio.Group>
);
