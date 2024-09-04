import React, { ReactNode, useMemo } from 'react';
import { Dropdown, MenuProps, Tooltip } from 'antd';
import { Box, ChevronDownComponent, Flex } from '@input-output-hk/lace-ui-toolkit';
import { ACTION_ICON_SIZE } from './const';
import styles from './AddressDisplayItem.module.scss';
import CopyToClipboard from 'react-copy-to-clipboard';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.svg';

const actionIconMap = {
  copy: <CopyIcon width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} />
};

type Props = {
  label: string | number;
  icon?: React.ReactNode;
  action?: 'copy';
  items?: MenuProps['items'];
  tooltipLabel?: string;
  dropdownRender?: (menus: ReactNode) => ReactNode;
  onCopy?: () => void;
};

export const AddressDisplayItem = ({
  label,
  icon,
  action,
  items,
  tooltipLabel,
  dropdownRender,
  onCopy
}: Props): JSX.Element => {
  const displayAsMenu = !!items;

  const actionToIcon = useMemo(() => {
    if (displayAsMenu) {
      return <ChevronDownComponent />;
    }

    if (action === 'copy') {
      <CopyToClipboard text={`${label}`}>{actionIconMap[action]}</CopyToClipboard>;
    }

    return actionIconMap[action];
  }, [action, displayAsMenu, label]);

  const content = (
    <Flex justifyContent="space-between" alignItems="center" gap="$8" className={styles.item}>
      {icon}
      {label}
      {tooltipLabel && !displayAsMenu ? (
        <Tooltip title={tooltipLabel}>
          <Box w="$20" h="$20" onClick={action === 'copy' && onCopy}>
            {actionToIcon}
          </Box>
        </Tooltip>
      ) : (
        actionToIcon
      )}
    </Flex>
  );

  return displayAsMenu ? (
    <Dropdown menu={{ items }} placement="top" autoAdjustOverflow dropdownRender={dropdownRender}>
      {content}
    </Dropdown>
  ) : (
    content
  );
};
