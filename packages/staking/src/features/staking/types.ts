import { Language } from '@lace/common';

export type StakingProps = {
  language?: Language;
  theme: 'light' | 'dark';
};

export enum StakingPage {
  activity = 'activity',
  overview = 'overview',
  browsePools = 'browsePools',
}
