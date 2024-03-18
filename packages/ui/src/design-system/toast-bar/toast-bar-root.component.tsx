import React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';
import * as Toast from '@radix-ui/react-toast';
import classNames from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import * as IconButton from '../icon-buttons';
import * as Typography from '../typography';

import { Progress } from './toast-bar-progress.component';
import * as cx from './toast-bar-root.css';

export type Props = Omit<ComponentProps<typeof Toast.Root>, 'children'> & {
  icon: ReactNode;
  title: string;
  onClose: () => void;
  closeAltText?: string;
  progress?: number;
  animate?: boolean;
};

export const Root = ({
  icon,
  title,
  onClose,
  closeAltText = '',
  progress,
  animate,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Toast.Root
      {...props}
      className={classNames(cx.root, {
        [cx.animation]: animate,
      })}
    >
      <Flex className={cx.container}>
        <Flex className={classNames(cx.icon, cx.box)}>{icon}</Flex>
        <Flex className={cx.box}>
          <Toast.Title className="ToastTitle">
            <Typography.Body.Small weight="$semibold">
              {title}
            </Typography.Body.Small>
          </Toast.Title>
        </Flex>
        <Toast.Action className="ToastAction" asChild altText={closeAltText}>
          <IconButton.Primary
            icon={<CloseIcon />}
            onClick={onClose}
            data-testid={`${title}-toast-close-button`}
          />
        </Toast.Action>
        {progress === undefined ? undefined : (
          <Box className={cx.progress}>
            <Progress progress={progress} />
          </Box>
        )}
      </Flex>
    </Toast.Root>
  );
};
