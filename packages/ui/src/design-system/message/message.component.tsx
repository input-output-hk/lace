import React from 'react';

import { ReactComponent as HappyEmoji } from '../../assets/icons/happy-emoji.component.svg';
import { Box } from '../box';
import { Flex } from '../flex';
import * as Typography from '../typography';

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
            <Typography.Heading weight="$bold">{title}</Typography.Heading>
          ) : (
            <Typography.Body.Large weight="$bold">
              {title}
            </Typography.Body.Large>
          )}
        </Box>
      )}
      <Box className={cx.description}>
        {type === MessageType.SIDE_DRAWER ? (
          <Typography.Body.Normal weight="$semibold">
            {description}
          </Typography.Body.Normal>
        ) : (
          <Typography.Body.Small>{description}</Typography.Body.Small>
        )}
      </Box>
    </Flex>
  );
};
