/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class WatchVideoModal {
  private CONTAINER = '//div[@data-testid="watch-video-container"]';
  private TITLE = '//h1[@data-testid="watch-video-title"]';
  private DESCRIPTION = '//p[@data-testid="watch-video-description"]';
  private VIDEO = '//iframe[@data-testid="mnemonic-intro-yt-video-frame"]';
  private GOT_IT_BUTTON = '//button[@data-testid="watch-video-got-it-button"]';
  private READ_MORE_LINK = '//a[@data-testid="faq-secret-passphrase-url"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get video(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIDEO);
  }

  get gotItButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GOT_IT_BUTTON);
  }

  get readMoreLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.READ_MORE_LINK}`);
  }
}

export default new WatchVideoModal();
