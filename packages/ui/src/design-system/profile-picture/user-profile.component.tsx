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

interface Fallback {
  fallback: string;
}

interface FallbackLogo {
  fallbackLogo: string;
}

export const UserProfile = ({
  imageSrc,
  alt,
  delayMs = 600,
  radius = 'circle',
  background,
  ...rest
}: Readonly<Props & (Fallback | FallbackLogo)>): JSX.Element => (
  <RadixUIAvatar.Root
    className={classNames(cx.root, {
      [cx.rounded]: radius === 'rounded',
      [cx.circle]: radius === 'circle',
      [cx.noBackground]: background === 'none',
    })}
  >
    <RadixUIAvatar.Image className={cx.image} src={imageSrc} alt={alt} />
    <RadixUIAvatar.Fallback asChild delayMs={delayMs}>
      {'fallbackLogo' in rest ? (
        <img className={cx.image} src={rest.fallbackLogo} alt={alt} />
      ) : (
        <Text.Body.Normal weight="$bold" className={cx.fallbackText}>
          {rest.fallback}
        </Text.Body.Normal>
      )}
    </RadixUIAvatar.Fallback>
  </RadixUIAvatar.Root>
);
