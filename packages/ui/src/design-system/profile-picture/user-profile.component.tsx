import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';
import classNames from 'classnames';

import * as Text from '../typography';

import * as cx from './user-profile.css';

interface Props {
  imageSrc: string;
  fallback: string;
  alt?: string;
  delayMs?: number;
  radius?: 'circle' | 'rounded';
  background?: 'none';
}

export const UserProfile = ({
  imageSrc,
  fallback: letter,
  alt,
  delayMs = 600,
  radius = 'circle',
  background,
}: Readonly<Props>): JSX.Element => (
  <RadixUIAvatar.Root
    className={classNames(cx.root, {
      [cx.rounded]: radius === 'rounded',
      [cx.circle]: radius === 'circle',
      [cx.noBackground]: background === 'none',
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
