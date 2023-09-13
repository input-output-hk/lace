import React from 'react';

import * as Typography from '../typography';

import * as cx from './tooltip-content-inner.css';

export interface ContentInnerProps {
  label: string;
}

export const ContentInner = ({
  label,
}: Readonly<ContentInnerProps>): JSX.Element => {
  return (
    <Typography.Body.Normal weight="$semibold" className={cx.label}>
      {label}
    </Typography.Body.Normal>
  );
};
