import React from 'react';

import { ReactComponent as ChevronRight } from '@lace/icons/dist/ChevronRightComponent';

import { Text } from '../text';

import * as cx from './ticker-button.css';

interface Props {
  name: string;
  id: string;
  onClick?: () => void;
}

export const TickerButton = ({
  name,
  id,
  onClick,
}: Readonly<Props>): JSX.Element => (
  <button
    className={cx.button}
    onClick={onClick}
    data-testid={`asset-input-ticker-button-${id}`}
  >
    <Text.SubHeading weight="$bold">
      {name}
      <ChevronRight className={cx.chevronIcon} />
    </Text.SubHeading>
  </button>
);
