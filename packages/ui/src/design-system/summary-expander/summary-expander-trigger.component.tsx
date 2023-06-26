import type { PropsWithChildren } from 'react';
import React from 'react';

import { ReactComponent as ChevronDown } from '../../assets/icons/chevron-down.component.svg';
import { ReactComponent as ChevronUp } from '../../assets/icons/chevron-up.component.svg';
import { Flex } from '../flex';

import * as cx from './summary-expander-trigger.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'button'> &
  PropsWithChildren<{
    disabled?: boolean;
    open?: boolean;
  }>;

export const Trigger = ({
  id,
  disabled,
  open = false,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button {...props} id={id} disabled={disabled} className={cx.container}>
      <Flex w="$24" h="$24" alignItems="center" justifyContent="center">
        {open ? <ChevronUp /> : <ChevronDown />}
      </Flex>
    </button>
  );
};
