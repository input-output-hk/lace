import type { ForwardRefExoticComponent, PropsWithChildren } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import { bold, medium, regular, semibold, typography } from './typography.css';

import type { TypographyVariants } from './typography.css';
import type { Theme } from '../../design-tokens';

type FontWeights = keyof Theme['fontWeights'];

type TextTypes = TypographyVariants['type'];

export type TextNodes =
  | 'address'
  | 'caption'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span';

interface CreateTextArguments<T extends TextNodes, W extends FontWeights> {
  type: TextTypes;
  as: T;
  weight: W;
}

type TextProps<W extends FontWeights> = PropsWithChildren<{
  weight?: W;
  className?: string;
}>;

export const createText = <
  W extends FontWeights,
  T extends TextNodes = TextNodes,
>({
  type,
  as: Tag,
  weight: defaultWeight,
}: Readonly<CreateTextArguments<T, W>>): ForwardRefExoticComponent<
  TextProps<W>
> =>
  // eslint-disable-next-line react/display-name
  forwardRef<typeof Tag, TextProps<W>>(
    ({ weight = defaultWeight, className, ...props }, ref) => (
      // @ts-expect-error TODO research the topic https://github.com/DefinitelyTyped/DefinitelyTyped/issues/33116
      <Tag
        {...props}
        ref={ref}
        className={classNames(typography({ type }), className, {
          [regular]: weight === '$regular',
          [medium]: weight === '$medium',
          [semibold]: weight === '$semibold',
          [bold]: weight === '$bold',
        })}
      />
    ),
  );
