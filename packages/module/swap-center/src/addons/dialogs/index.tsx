import { TabRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { SwapDisclaimer } from './SwapDisclaimer';
import { SwapDisclaimerUkFca } from './SwapDisclaimerUkFca';

import type { Dialogs } from '@lace-contract/app';

// A single module can only register one Dialogs UICustomisation default
// export, so we compose the swap disclaimers into one component. Each
// internal modal early-returns null based on its own gating, meaning at
// most one is visible at a time. Ordering: on mobile the UK/FCA risk
// warning renders first (to satisfy FCA crypto-asset promotion rules);
// the product disclaimer is gated behind FCA acknowledgement so the user
// sees them in sequence rather than stacked.
const SwapDisclaimers: React.ComponentType = () => (
  <>
    <SwapDisclaimerUkFca />
    <SwapDisclaimer />
  </>
);

const dialogs = () =>
  createUICustomisation<Dialogs>({
    key: 'swaps-disclaimer-uk-fca',
    Dialog: SwapDisclaimers,
    location: new RegExp(`^${TabRoutes.Swaps}$`),
  });

export default dialogs;
