import type { HTMLAttributes } from 'react';

export type OmitClassName<T extends HTMLElement = HTMLDivElement> = Omit<
  HTMLAttributes<T>,
  'className'
>;
