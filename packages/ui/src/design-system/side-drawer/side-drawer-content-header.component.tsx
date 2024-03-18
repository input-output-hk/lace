import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import * as NavigationButtons from '../navigation-buttons';
import * as Typography from '../typography';

import { Close } from './side-drawer-close.component';
import * as cx from './side-drawer-content-header.css';
import { Separator } from './side-drawer-separator.component';

interface Props {
  text: string;
  onBackClick?: () => void;
  onCloseClick: () => void;
}

export const Header = ({
  text,
  onBackClick,
  onCloseClick,
}: Readonly<Props>): JSX.Element => (
  <Box className={cx.gridArea}>
    <Flex
      className={cx.container}
      alignItems="center"
      justifyContent="space-between"
    >
      {onBackClick !== undefined && (
        <Flex w="$40">
          <NavigationButtons.Back onClick={onBackClick} />
        </Flex>
      )}
      <Flex justifyContent="center" w="$fill">
        <Typography.Body.Large weight="$bold">{text}</Typography.Body.Large>
      </Flex>
      <Flex w="$40">
        <Close>
          <NavigationButtons.Close onClick={onCloseClick} />
        </Close>
      </Flex>
    </Flex>
    <Box mb="$32">
      <Separator />
    </Box>
  </Box>
);
