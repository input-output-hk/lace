import React from 'react';
import cn from 'classnames';
import { Switch as AntSwitch, SwitchProps } from 'antd';
import styles from './Switch.module.scss';

export const Switch = ({
  checkedChildren,
  unCheckedChildren,
  checked,
  className,
  onChange
}: SwitchProps): React.ReactElement => (
  <AntSwitch
    checkedChildren={checkedChildren}
    unCheckedChildren={unCheckedChildren}
    checked={checked}
    className={cn(styles.switch, { [className]: className })}
    onChange={onChange}
  />
);
