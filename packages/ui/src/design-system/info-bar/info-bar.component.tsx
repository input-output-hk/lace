import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { CallToAction } from '../buttons';
import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './info-bar.css';

export interface Props {
  message: string;
  icon: ReactNode;
  callToAction?: {
    label?: string;
    onClick?: () => void;
  };
}

export const InfoBar = ({
  message,
  icon,
  callToAction,
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex className={cx.container}>
      <Box className={cx.icon}>{icon}</Box>
      <Box>
        <Typography.Button weight="$semibold" className={cx.message}>
          {message}
        </Typography.Button>
      </Box>

      {callToAction && (
        <Box ml="$24">
          <CallToAction
            onClick={callToAction.onClick}
            label={callToAction.label}
          />
        </Box>
      )}
    </Flex>
  );
};
