import { TabRoutes } from '@lace-lib/navigation';
import { createUICustomisation } from '@lace-lib/util-render';

import { DappExplorerDisclaimerUkFca } from './DappExplorerDisclaimerUkFca';

import type { Dialogs } from '@lace-contract/app';

const dialogs = () =>
  createUICustomisation<Dialogs>({
    key: 'dapp-explorer-disclaimer-uk-fca',
    Dialog: DappExplorerDisclaimerUkFca,
    location: new RegExp(`^${TabRoutes.DApps}$`),
  });

export default dialogs;
