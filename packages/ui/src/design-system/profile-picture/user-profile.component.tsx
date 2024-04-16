import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';
import classNames from 'classnames';

import * as Text from '../typography';

import * as cx from './user-profile.css';

interface Props {
  imageSrc: string;
  alt?: string;
  delayMs?: number;
  radius?: 'circle' | 'rounded';
  background?: 'none';
}

interface FallbackText {
  fallbackText: string;
}

interface FallbackImage {
  fallbackImage: string;
}

export const UserProfile = ({
  imageSrc,
  alt,
  delayMs = 600,
  radius = 'circle',
  background,
  ...rest
}: Readonly<Props & (FallbackImage | FallbackText)>): JSX.Element => (
  <RadixUIAvatar.Root
    className={classNames(cx.root, {
      [cx.rounded]: radius === 'rounded',
      [cx.circle]: radius === 'circle',
      [cx.noBackground]: background === 'none',
    })}
  >
    <RadixUIAvatar.Image className={cx.image} src={imageSrc} alt={alt} />
    <RadixUIAvatar.Fallback asChild delayMs={delayMs}>
      {'fallbackImage' in rest ? (
        <img className={cx.image} src={rest.fallbackImage} alt={alt} />
      ) : (
        <Text.Body.Normal weight="$bold" className={cx.fallbackText}>
          {rest.fallbackText}
        </Text.Body.Normal>
      )}
    </RadixUIAvatar.Fallback>
  </RadixUIAvatar.Root>
);
