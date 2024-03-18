import React from 'react';

import * as Typography from '../typography';

import * as cx from './tooltip-content.css';

export interface TooltipContentProps {
  label: string;
}

export const TooltipContent = ({
  label,
}: Readonly<TooltipContentProps>): JSX.Element => {
  return (
    <div className={cx.tooltipContent}>
      <Typography.Body.Normal color="secondary" weight="$semibold">
        {label}
      </Typography.Body.Normal>
    </div>
  );
};
