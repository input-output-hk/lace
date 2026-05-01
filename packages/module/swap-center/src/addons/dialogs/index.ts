import { TabRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import { SwapDisclaimer } from './SwapDisclaimer';

import type { Dialogs } from '@lace-contract/app';

const dialogs = () =>
  createUICustomisation<Dialogs>({
    key: 'swaps-disclaimer',
    Dialog: SwapDisclaimer,
    location: new RegExp(`^${TabRoutes.Swaps}$`),
  });

export default dialogs;
