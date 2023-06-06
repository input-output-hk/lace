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
  onCloseClick?: () => void;
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
        <NavigationButtons.Back onClick={onBackClick} />
      )}
      <Typography.Body.Large weight="$bold" className={cx.text}>
        {text}
      </Typography.Body.Large>
      <Close>
        <NavigationButtons.Close onClick={onCloseClick} />
      </Close>
    </Flex>
    <Box mb="$32">
      <Separator />
    </Box>
  </Box>
);
