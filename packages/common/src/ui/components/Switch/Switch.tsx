import React from 'react';
import cn from 'classnames';
import { Switch as AntSwitch, SwitchProps } from 'antd';
import styles from './Switch.module.scss';

export const Switch = ({
  checkedChildren,
  unCheckedChildren,
  checked,
  className,
  testId = 'switch',
  onChange
}: SwitchProps & { testId?: string }): React.ReactElement => (
  <AntSwitch
    data-testid={testId}
    checkedChildren={checkedChildren}
    unCheckedChildren={unCheckedChildren}
    checked={checked}
    className={cn(styles.switch, className && { [className]: className })}
    onChange={onChange}
  />
);
