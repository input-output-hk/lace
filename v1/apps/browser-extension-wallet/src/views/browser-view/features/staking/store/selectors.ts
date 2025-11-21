/* eslint-disable no-magic-numbers */
/* eslint-disable consistent-return */
import { StateSelector } from 'zustand';
import { StakePoolDetails } from '../types';

export const stakePoolDetailsVisibilitySelector: StateSelector<StakePoolDetails, boolean> = ({
  isDrawerVisible
}: StakePoolDetails) => !!isDrawerVisible;
