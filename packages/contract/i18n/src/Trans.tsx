import React from 'react';
import { Trans as GenericTrans } from 'react-i18next';

import type { TranslationKey } from './types';
import type { TransProps } from 'react-i18next';

type ExtendedTransProps = TransProps<TranslationKey> & {
  testId?: string;
};

export const Trans = (props: ExtendedTransProps): React.ReactElement => (
  <GenericTrans {...props} />
);
