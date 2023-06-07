import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';

import * as Text from '../typography';

import * as cx from './user-profile.css';

interface Props {
  imageSrc: string;
  fallback: string;
  alt?: string;
  delayMs?: number;
}

export const UserProfile = ({
  imageSrc,
  fallback: letter,
  alt,
  delayMs = 600,
}: Readonly<Props>): JSX.Element => (
  <RadixUIAvatar.Root className={cx.root}>
    <RadixUIAvatar.Image className={cx.image} src={imageSrc} alt={alt} />
    <RadixUIAvatar.Fallback delayMs={delayMs}>
      <Text.Body.Normal weight="$bold" className={cx.fallbackText}>
        {letter}
      </Text.Body.Normal>
    </RadixUIAvatar.Fallback>
  </RadixUIAvatar.Root>
);
