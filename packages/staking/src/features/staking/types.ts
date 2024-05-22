import { Language } from '@lace/translation';

export type StakingProps = {
  language?: Language;
  theme: 'light' | 'dark';
};

export enum StakingPage {
  activity = 'activity',
  overview = 'overview',
  browsePools = 'browsePools',
}
