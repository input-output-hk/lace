import { createObservableHook } from '@lace-lib/util-store';
import { firstValueFrom } from 'rxjs';

import type { MakeFunctionObservable } from '@lace-lib/util';
import type { RequestHWConnection } from '@lace-lib/util-hw';

export const requestHWConnectionHook =
  createObservableHook<MakeFunctionObservable<RequestHWConnection>>();

const loadRequestHWConnectionMobile =
  (): RequestHWConnection => async options =>
    firstValueFrom(requestHWConnectionHook.trigger(options));

export default loadRequestHWConnectionMobile;
