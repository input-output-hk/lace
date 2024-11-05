/* eslint-disable react/no-multi-comp */
import { ReactComponent as Arrow } from '../../assets/icons/arrow.component.svg';
import { ReactComponent as Cross } from '../../assets/icons/cross.component.svg';
import { Button } from 'antd';
import React from 'react';
import cn from 'classnames';

import styles from './NavigationButton.module.scss';

type IconsTypes = 'arrow' | 'cross';

export interface NavigationButtonProps {
  iconClassName?: string;
  icon?: IconsTypes;
  customIcon?: React.ReactNode;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}

const Icon = ({ icon, iconClassName }: { icon: IconsTypes; iconClassName?: string }) => {
  if (icon === 'arrow')
    return <Arrow className={cn(styles.backArrow, iconClassName && { [iconClassName]: iconClassName })} />;
  return <Cross className={styles.crossArrow} />;
};

export const NavigationButton = ({
  icon = 'cross',
  customIcon,
  iconClassName,
  ...rest
}: NavigationButtonProps): React.ReactElement => (
  <Button
    className={styles.navigationButton}
    data-testid={`navigation-button-${icon}`}
    shape="circle"
    icon={customIcon || <Icon iconClassName={iconClassName} icon={icon} />}
    {...rest}
  />
);
