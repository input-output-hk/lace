export interface Page {
  visit(): void;
}

export abstract class LaceView {
  async waitForPreloaderToDisappear(): Promise<void> {
    await browser.waitUntil(async () => {
      const preloaderExists = await $('#preloader').isExisting();
      return !preloaderExists;
    });
  }
}
