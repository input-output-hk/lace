import React from 'react';

import { TextLink } from '../text-link';

import { MetadataBase } from './metadata.base';

import type { Props as BaseProps } from './metadata.base';

type Props = BaseProps & {
  text: string;
  url: string;
};

export const MetadataLink = ({
  url,
  text,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <MetadataBase {...props}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        <TextLink label={text} />
      </a>
    </MetadataBase>
  );
};
