import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Collapsible from '@radix-ui/react-collapsible';
import classNames from 'classnames';

import { Flex } from '../flex';
import * as Typography from '../typography';

import { Trigger } from './summary-expander-trigger.component';
import * as cx from './summary-expander.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<'button'> &
  PropsWithChildren<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    disabled?: boolean;
  }>;

export const SummaryExpander = ({
  open,
  onOpenChange,
  title,
  disabled,
  children,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Collapsible.Root
      className={cx.root}
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        className={classNames(cx.header, {
          [cx.expanded]: open,
        })}
      >
        <Typography.Body.Large className={cx.title} weight="$bold">
          {title}
        </Typography.Body.Large>

        <Collapsible.Trigger asChild>
          <Trigger open={open} disabled={disabled} {...props} />
        </Collapsible.Trigger>
      </Flex>

      <Collapsible.Content>{children}</Collapsible.Content>
    </Collapsible.Root>
  );
};
