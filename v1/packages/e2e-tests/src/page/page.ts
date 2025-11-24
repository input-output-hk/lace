export interface Page {
  visit(): void;
}

export abstract class LaceView {
  async waitForPreloaderToDisappear(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const preloaderExists = await $('#preloader').isExisting();
        return !preloaderExists;
      },
      { timeout: 5 * 60 * 1000, interval: 1000 }
    );
  }
}
