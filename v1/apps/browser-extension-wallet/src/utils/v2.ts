import { APP_MODE, STORAGE_KEY } from '@utils/lmp';
import { storage } from 'webextension-polyfill';

export const v2ApiBaseChannel = 'bundle-v2';

export const v2ModeStorage = {
  set: (mode: APP_MODE): Promise<void> => storage.local.set({ [STORAGE_KEY.APP_MODE]: mode })
};
