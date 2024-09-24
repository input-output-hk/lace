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
  testId?: 'AddressDisplayItem';
};

export const AddressDisplayItem = ({
  label,
  icon,
  action,
  items,
  tooltipLabel,
  dropdownRender,
  onCopy,
  testId
}: Props): JSX.Element => {
  const displayAsMenu = !!items;

  const actionToIcon = useMemo(() => {
    if (displayAsMenu) {
      return <ChevronDownComponent data-testid={`${testId}-chevron`} />;
    }

    if (action === 'copy') {
      return (
        <CopyToClipboard text={`${label}`} data-testid={`${testId}-copy-button`}>
          {actionIconMap[action]}
        </CopyToClipboard>
      );
    }

    return actionIconMap[action];
  }, [action, displayAsMenu, label, testId]);

  const content = (
    <Flex justifyContent="space-between" alignItems="center" gap="$8" className={styles.item} testId={testId}>
      {icon}
      <span data-testid={`${testId}-label`}>{label}</span>
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
