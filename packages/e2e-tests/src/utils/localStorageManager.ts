/* eslint-disable @typescript-eslint/no-shadow */

export class LocalStorageManager {
  getItem = async (key: string): Promise<any> => browser.execute((key: string) => localStorage.getItem(key), key);
  setItem = async (key: string, value: string): Promise<any> =>
    await browser.execute((key: string, value: string) => localStorage.setItem(key, value), key, value);
  cleanLocalStorage = async (): Promise<any> => await browser.execute(() => localStorage.clear());
}

export default new LocalStorageManager();
