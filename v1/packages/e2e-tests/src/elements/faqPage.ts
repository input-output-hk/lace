/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class FaqPage {
  private PAGE_TITLE = 'h1';
  private ACTIVE_ARTICLE = 'div[data-active="true"]';
  private ACTIVE_ARTICLE_TITLE = `${this.ACTIVE_ARTICLE} button`;

  get pageTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAGE_TITLE);
  }
  get activeArticle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_ARTICLE);
  }

  get activeArticleTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_ARTICLE_TITLE);
  }
}

export default new FaqPage();
