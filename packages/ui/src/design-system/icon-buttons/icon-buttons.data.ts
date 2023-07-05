import type { ReactNode } from 'react';

import type { OmitClassName } from '../../types';

export type API = Omit<OmitClassName<'button'>, 'children'> & {
  icon: ReactNode;
};
