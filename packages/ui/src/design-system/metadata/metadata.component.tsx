import React from 'react';

import * as Typography from '../typography';

import { MetadataBase } from './metadata.base';
import * as cx from './metadata.css';

import type { Props as BaseProps } from './metadata.base';

type Props = BaseProps & {
  text: string;
};

export const Metadata = ({ text, ...props }: Readonly<Props>): JSX.Element => {
  return (
    <MetadataBase {...props}>
      <Typography.Address weight="$medium" className={cx.text}>
        {text}
      </Typography.Address>
    </MetadataBase>
  );
};
