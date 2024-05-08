import React from 'react';

import { Text } from '../text';

import { MetadataBase } from './metadata.base';
import * as cx from './metadata.css';

import type { Props as BaseProps } from './metadata.base';

type Props = BaseProps & {
  text: string;
};

export const Metadata = ({ text, ...props }: Readonly<Props>): JSX.Element => {
  return (
    <MetadataBase {...props}>
      <Text.Address weight="$medium" className={cx.text}>
        {text}
      </Text.Address>
    </MetadataBase>
  );
};
