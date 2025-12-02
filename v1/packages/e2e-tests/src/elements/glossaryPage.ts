/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class GlossaryPage {
  private ACTIVE_ARTICLE = 'div[data-active="true"]';
  private ACTIVE_ARTICLE_TITLE = `${this.ACTIVE_ARTICLE} button`;

  get activeArticle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_ARTICLE);
  }

  get activeArticleTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_ARTICLE_TITLE);
  }
}

export default new GlossaryPage();
