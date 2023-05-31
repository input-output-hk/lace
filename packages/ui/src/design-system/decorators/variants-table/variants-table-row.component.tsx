import type { ReactNode } from 'react';
import React from 'react';

interface Props {
  children?: ReactNode | undefined;
}

export const Row = ({ children }: Readonly<Props>): JSX.Element => {
  return <tr>{children}</tr>;
};
