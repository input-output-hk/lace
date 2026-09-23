import { of } from 'rxjs';

import type { SetupAppLock } from '@lace-contract/app-lock';

// Guest create/import run host-side ceremonies (ADR 36); there is no guest lock
// to set up, so setup reports success without storing anything.
const loadSetupAppLock = (): SetupAppLock => () => of(true);

export default loadSetupAppLock;
