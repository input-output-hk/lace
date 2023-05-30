import type { HTMLAttributes, PropsWithChildren } from 'react';
import React from 'react';

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

type Props<T extends FontWeights = FontWeights> =
  HTMLAttributes<HTMLSpanElement> &
    PropsWithChildren<{
      weight?: T;
      as?: TextNodes;
    }>;

interface CreateTextArguments {
  type: TextTypes;
  as: TextNodes;
  weight: FontWeights;
}

// this type annotation is required for
// https://github.com/styleguidist/react-docgen-typescript
export type Text<T extends FontWeights> = (
  props: Readonly<PropsWithChildren<{ weight?: T; className?: string }>>,
) => JSX.Element;

export const createText = <T extends FontWeights>({
  type,
  as: defaultTag,
  weight: defaultWeight,
}: Readonly<CreateTextArguments>): Text<T> => {
  const Text = ({
    as = defaultTag,
    weight = defaultWeight as T,
    className,
    ...props
  }: Readonly<Props<T>>): JSX.Element => {
    const Tag = as;
    return (
      <Tag
        {...props}
        className={classNames(typography({ type }), className, {
          [regular]: weight === '$regular',
          [medium]: weight === '$medium',
          [semibold]: weight === '$semibold',
          [bold]: weight === '$bold',
        })}
      />
    );
  };

  return Text;
};
