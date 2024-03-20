import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';
import classNames from 'classnames';

import { Text } from '../text';

import * as cx from './user-profile.css';

interface Props {
  imageSrc: string;
  fallback: string;
  alt?: string;
  delayMs?: number;
  radius?: 'circle' | 'rounded';
}

export const UserProfile = ({
  imageSrc,
  fallback: letter,
  alt,
  delayMs = 600,
  radius = 'circle',
}: Readonly<Props>): JSX.Element => (
  <RadixUIAvatar.Root
    className={classNames(cx.root, {
      [cx.rounded]: radius === 'rounded',
      [cx.circle]: radius === 'circle',
    })}
  >
    <RadixUIAvatar.Image className={cx.image} src={imageSrc} alt={alt} />
    <RadixUIAvatar.Fallback delayMs={delayMs}>
      <Text.Body.Normal weight="$bold" className={cx.fallbackText}>
        {letter}
      </Text.Body.Normal>
    </RadixUIAvatar.Fallback>
  </RadixUIAvatar.Root>
);
