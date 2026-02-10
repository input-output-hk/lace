import { Flex, ProfileDropdown } from '@input-output-hk/lace-ui-toolkit';
import React, { ReactElement, useState } from 'react';
import { Dropdown } from 'antd';
import { Separator } from '@components/MainMenu/DropdownMenuOverlay/components';
import ArrowRight from '@src/assets/icons/arrow-right.component.svg';
import styles from './WalletSelectorDropdown.module.scss';
import { useV2 } from '@hooks';

const WalletSelectorDropdownContent = () => {
  const { switchToV2 } = useV2();

  return (
    <div className={styles.menuOverlay}>
      <Flex flexDirection="column" gap="$8">
        <div>
          <ProfileDropdown.WalletOption
            style={{ textAlign: 'left' }}
            key="default-option"
            title="Default (Cardano / Bitcoin)"
            id="default-option"
            type="hot"
          />
          <Separator />
        </div>
        <Flex alignItems="center" justifyContent="space-between" w="$fill" className={styles.walletOptionWithArrow}>
          <ProfileDropdown.WalletOption
            style={{ textAlign: 'left', flex: 1 }}
            key="midnight-option"
            title="Midnight"
            id="midnight-option"
            type="hot"
            profile={{
              customProfileComponent: (
                <span className={styles.walletOptionMidnight}>
                  <ProfileDropdown.WalletIcon type="hot" testId="midnight-wallet-option-icon" />
                </span>
              )
            }}
            onClick={switchToV2}
          />
          <ArrowRight className={styles.arrowIcon} />
        </Flex>
      </Flex>
    </div>
  );
};

// eslint-disable-next-line react/no-multi-comp
export const WalletSelectorDropdown = (): ReactElement => {
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);

  return (
    <Dropdown
      overlayClassName={styles.overlay}
      onOpenChange={setIsDropdownMenuOpen}
      overlay={<WalletSelectorDropdownContent />}
      placement="bottomRight"
      trigger={['click']}
    >
      <ProfileDropdown.Trigger
        style={{ textAlign: 'left' }}
        title="Network"
        subtitle="Cardano"
        active={isDropdownMenuOpen}
        type="hot"
        id="menu"
      />
    </Dropdown>
  );
};
