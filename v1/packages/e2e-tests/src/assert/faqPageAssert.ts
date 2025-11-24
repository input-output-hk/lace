import { faqArticles } from '../data/EducationalArticles';
import { browser } from '@wdio/globals';
import { expect } from 'chai';
import FaqPage from '../elements/faqPage';
import commonAssert from './commonAssert';

class FaqPageAssert {
  async assertSeeFaqPage() {
    await commonAssert.assertSeeTabWithUrl('www.lace.io/faq');
    await FaqPage.pageTitle.waitForDisplayed();
    expect(await FaqPage.pageTitle.getText()).to.equal('FAQ');
  }

  async assertSeeFaqArticle(title: string) {
    const faqArticle = faqArticles[title];
    const expectedPath = `faq?question=${faqArticle.question}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    await FaqPage.activeArticle.waitForDisplayed();
    expect(await FaqPage.activeArticleTitle.getText()).to.equal(faqArticle.title);
  }
}

export default new FaqPageAssert();
