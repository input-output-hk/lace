import React from 'react';

import { ReactComponent as HappyEmoji } from '@lace/icons/dist/HappyEmojiComponent';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './message.css';

export enum MessageType {
  DEFAULT = 'default',
  SIDE_DRAWER = 'side-drawer',
}

export interface MessageProps {
  title?: string;
  description: string;
  type?: MessageType;
}

export const Message = ({
  title = '',
  description,
  type = MessageType.DEFAULT,
}: Readonly<MessageProps>): JSX.Element => {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      gap="$8"
      className={
        type === MessageType.SIDE_DRAWER
          ? cx.sideDrawerContainer
          : cx.defaultContainer
      }
    >
      <HappyEmoji className={cx.icon} />
      {title && (
        <Box className={cx.title}>
          {type === MessageType.SIDE_DRAWER ? (
            <Text.Heading weight="$bold">{title}</Text.Heading>
          ) : (
            <Text.Body.Large weight="$bold">{title}</Text.Body.Large>
          )}
        </Box>
      )}
      <Box className={cx.description}>
        {type === MessageType.SIDE_DRAWER ? (
          <Text.Body.Normal weight="$semibold">{description}</Text.Body.Normal>
        ) : (
          <Text.Body.Small>{description}</Text.Body.Small>
        )}
      </Box>
    </Flex>
  );
};
