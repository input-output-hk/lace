import React, { useContext } from 'react';
import { Menu, MenuProps } from 'antd';
import classnames from 'classnames';
import { MenuItemList } from '@utils/constants';
import { SideMenuItemConfig } from '@types';
import { useTranslation } from 'react-i18next';
import { SideMenuLabel } from './SideMenuLabel';
import { SideMenuItem } from '@views/browser/components/SideMenu/SideMenuItem';
import styles from './SideMenuContent.module.scss';
import { TutorialContext } from '../../features/tutorial';

export interface SideMenuContentProps {
  menuItems: SideMenuItemConfig[];
  activeItemId: string;
  hoveredItemId: string;
  onClick: MenuProps['onClick'];
  onMouseEnter: (item: MenuItemList) => void;
  onMouseLeave: () => void;
  // required for desktop-specific styling
  menuItemClassName?: string;
}

const getIcon = (item: SideMenuItemConfig, activeItemId: string, hoveredItemId: string) => {
  if (activeItemId === item.path) {
    return item.activeIcon;
  }

  if (hoveredItemId === item.id) {
    return item.hoverIcon;
  }

  return item.regularIcon;
};

export const SideMenuContent = ({
  menuItems,
  activeItemId,
  hoveredItemId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  menuItemClassName
}: SideMenuContentProps): React.ReactElement => {
  const { t } = useTranslation();

  const { refs } = useContext(TutorialContext);
  // const ref1 = useRef(null);
  // const ref2 = useRef(null);
  // const ref3 = useRef(null);
  // const ref4 = useRef(null);
  // const [open, setOpen] = useState<boolean>(true);

  // const refs = [ref1, ref2, ref3, ref4];

  // const steps: TourProps['steps'] = [
  //   {
  //     title: 'Tokens',
  //     description: 'This is where you can see a list of all your tokens.',
  //     target: () => ref1.current
  //   },
  //   {
  //     title: 'NFTs',
  //     description: 'You can see your NFTs in this section.',
  //     target: () => ref2.current
  //   },
  //   {
  //     title: 'Activity',
  //     description: 'All your transaction history can be found here.',
  //     target: () => ref3.current
  //   },
  //   {
  //     title: 'Staking',
  //     description: 'Contribute to the network by staking your ADA.',
  //     target: () => ref4.current
  //   }
  // ];

  return (
    <>
      <Menu
        className={styles.menuContainer}
        data-testid="side-menu"
        selectedKeys={[activeItemId]}
        onClick={onClick}
        mode="inline"
      >
        {menuItems.map((menuItem, i) => (
          <SideMenuItem
            onMouseEnter={() => onMouseEnter(menuItem.id)}
            onMouseLeave={onMouseLeave}
            data-testid={menuItem.testId}
            key={menuItem.path}
            className={classnames(styles.menuItem, menuItemClassName)}
          >
            {React.createElement(getIcon(menuItem, activeItemId, hoveredItemId), {
              className: classnames(styles.icon, menuItem.iconClassName)
            })}
            <SideMenuLabel ref={refs[i]} className={styles.concealableMenuLabel}>
              {t(menuItem.label)}
            </SideMenuLabel>
          </SideMenuItem>
        ))}
      </Menu>
      {/* <Tour
        open={open}
        onClose={() => setOpen(false)}
        steps={steps}
        onPopupAlign={noop}
        placement="right"
        rootClassName={styles.tour}
      /> */}
    </>
  );
};
