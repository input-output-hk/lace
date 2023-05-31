import React from 'react';

import { ReactComponent as ChevronRight } from '../../assets/icons/chevron-right.component.svg';
import * as Text from '../typography';

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
    <Text.SubHeading weight="$bold" className={cx.ticker}>
      {name}
      <ChevronRight className={cx.chevronIcon} />
    </Text.SubHeading>
  </button>
);
