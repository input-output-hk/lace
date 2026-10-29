import { midnightWalletsForRuntime } from '@lace-contract/midnight-context';

import type { MidnightWalletsByAccountId } from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { Observable } from 'rxjs';

const initMidnightEngine = ({
  runtime,
}: Pick<ModuleInitProps, 'runtime'>): Observable<MidnightWalletsByAccountId> =>
  midnightWalletsForRuntime(runtime);

export default initMidnightEngine;
