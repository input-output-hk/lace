import { createUICustomisation } from '@lace-lib/util-render';

import { MidnightDisclaimer } from './midnight-disclaimer';

import type { Dialogs } from '@lace-contract/app';

const dialogs = () =>
  createUICustomisation<Dialogs>({
    key: 'midnight',
    Dialog: MidnightDisclaimer,
  });

export default dialogs;
