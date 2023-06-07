import type { ReactNode } from 'react';
import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';
import classNames from 'classnames';

import * as cx from './image.css';

interface Props {
  imageSrc: string;
  fallback?: ReactNode;
  alt?: string;
  delayMs?: number;
  selected?: boolean;
}

export const Image = ({
  imageSrc,
  fallback,
  alt,
  delayMs = 600,
  selected,
}: Readonly<Props>): JSX.Element => (
  <RadixUIAvatar.Root
    className={classNames(cx.root, cx.container, {
      [cx.selected]: selected,
    })}
  >
    <RadixUIAvatar.Image className={cx.image} src={imageSrc} alt={alt} />
    <RadixUIAvatar.Fallback delayMs={delayMs}>
      {fallback}
    </RadixUIAvatar.Fallback>
  </RadixUIAvatar.Root>
);
