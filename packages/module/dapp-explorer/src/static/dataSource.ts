import midnightDapps from './midnight-dapps.json';

import type { CardanoCubeProject } from '../types';

export const getMidnightDapps = (): CardanoCubeProject[] =>
  midnightDapps as CardanoCubeProject[];
