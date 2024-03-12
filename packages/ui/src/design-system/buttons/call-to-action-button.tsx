import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './call-to-action-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

type Props = Omit<ButtonProps, 'className'>;

export const CallToAction = forwardRef<HTMLButtonElement, Props>(
  (props, forwardReference): JSX.Element => {
    return (
      <SkeletonButton
        {...props}
        ref={forwardReference}
        className={{
          container: classNames(cx.container, cx.button),
          label: cx.label,
        }}
      />
    );
  },
);
// eslint-disable-next-line functional/immutable-data
CallToAction.displayName = 'CallToAction';
