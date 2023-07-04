import React from 'react';

import { NavigationSkeletonButton } from './icon-skeleton-button.component';

import type { API } from './icon-buttons.data';

type Props = API;

export const Primary = ({ icon, ...props }: Readonly<Props>): JSX.Element => (
  <NavigationSkeletonButton {...props}>{icon}</NavigationSkeletonButton>
);
