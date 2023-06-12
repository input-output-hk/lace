import type { ComponentPropsWithoutRef, ElementType } from 'react';

export type OmitClassName<T extends ElementType> = Omit<
  ComponentPropsWithoutRef<T>,
  'className'
>;
