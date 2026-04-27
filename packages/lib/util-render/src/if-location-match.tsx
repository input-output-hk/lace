import type React from 'react';

import { useMemo } from 'react';

import type { View } from '@lace-contract/views';

export type IfLocationMatchProps = {
  children: React.ReactNode;
  pathnamePattern: RegExp;
  view: View;
  forbidden?: boolean;
  fallback?: React.ReactNode;
};

export const IfLocationMatch: React.ComponentType<IfLocationMatchProps> = ({
  view,
  pathnamePattern,
  children,
  forbidden = false,
  fallback = null,
}: IfLocationMatchProps): React.ReactNode => {
  const shouldRender = useMemo(
    () => pathnamePattern.test(view.location),
    [view, pathnamePattern],
  );

  if (!shouldRender) return null;

  return forbidden ? fallback : children;
};
