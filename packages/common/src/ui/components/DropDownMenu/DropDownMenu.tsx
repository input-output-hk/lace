import React from 'react';
import { Menu } from 'antd';
import Icon from '@ant-design/icons';
import styles from './DropDownMenu.module.scss';

type actionProp = {
  text: string;
  action: (props: unknown) => unknown;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
};

export type DropDownMenuProps = {
  actions: actionProp[];
};

export const DropDownMenu = ({ actions }: DropDownMenuProps): React.ReactElement => (
  <Menu data-testid="address-dropdown-menu" selectable={false} className={styles.menu}>
    {actions.map(({ text, icon, action }) => (
      <Menu.Item data-testid="address-dropdown-menu-item" key={text} className={styles.menuItem} onClick={action}>
        {icon && (
          <Icon
            className={styles.menuIcon}
            data-testid="address-dropdown-menu-icon"
            component={icon}
            style={{ color: '#ABB2B7' }}
          />
        )}
        <span>{text}</span>
      </Menu.Item>
    ))}
  </Menu>
);
