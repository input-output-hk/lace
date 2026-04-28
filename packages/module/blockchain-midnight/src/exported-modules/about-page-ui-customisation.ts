import { createUICustomisation } from '@lace-lib/util-render';

import type { AboutPageUICustomisation } from '@lace-contract/app';

const aboutPageUICustomisation = () =>
  createUICustomisation<AboutPageUICustomisation>({
    options: [
      {
        id: 'midnight-foundation-terms-and-conditions',
        titleKey: 'v2.about.midnight-foundation-terms-and-conditions',
        icon: 'Midnight',
        configKey: 'midnightFoundationTermsAndConditionsUrl',
      },
    ],
    key: 'midnight',
  });

export default aboutPageUICustomisation;
