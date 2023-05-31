import EducationalList from '../elements/educationalList';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import { faqArticles, glossaryArticles, videoArticles } from '../data/EducationalArticles';
import LearnVideoPage from '../elements/LearnVideoPage';
import FaqPage from '../elements/faqPage';
import GlossaryPage from '../elements/glossaryPage';
import { browser } from '@wdio/globals';

class EducationalListAssert {
  glossaryTranslationPath = 'educationalBanners.title.glossary';
  faqTranslationPath = 'educationalBanners.title.faq';
  videoTranslationPath = 'educationalBanners.title.video';

  async assertSeeWidget(title: string, itemTitles: string[], itemSubtitles: string[]) {
    const rowCount = (await EducationalList.listRows).length;
    await expect(await EducationalList.getListTitle()).to.equal(title);
    await expect((await EducationalList.listRowImages).length).to.equal(rowCount);
    await expect(JSON.stringify(await EducationalList.getListRowTitles())).to.deep.equal(JSON.stringify(itemTitles));
    await expect(JSON.stringify(await EducationalList.getListRowSubtitles())).to.deep.equal(
      JSON.stringify(itemSubtitles)
    );
  }

  async assertSeeAddressBookWidget() {
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const expectedTitle = await t('browserView.sidePanel.aboutYourWallet');
    const expectedTitles = [glossaryTranslation, glossaryTranslation];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.whatIsLaceAddressBook'),
      await t('educationalBanners.subtitle.whatIsSavedAddress')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeTokensWidget() {
    const faqTranslation = await t(this.faqTranslationPath);
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const videoTranslation = await t(this.videoTranslationPath);
    const expectedTitle = await t('browserView.sidePanel.aboutYourWallet');
    const expectedTitles = [glossaryTranslation, faqTranslation, videoTranslation, videoTranslation];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.whatIsADigitalAsset'),
      await t('educationalBanners.subtitle.howToSendReceiveFunds'),
      await t('educationalBanners.subtitle.secureSelfCustody'),
      await t('educationalBanners.subtitle.connectingDApps')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeNftsWidget() {
    const faqTranslation = await t(this.faqTranslationPath);
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const videoTranslation = await t(this.videoTranslationPath);
    const expectedTitle = await t('browserView.nfts.educationalList.title');
    const expectedTitles = [glossaryTranslation, faqTranslation, videoTranslation];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.collections'),
      await t('educationalBanners.subtitle.buyAnNft'),
      await t('educationalBanners.subtitle.enterNFTGallery')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeTransactionsWidget() {
    const faqTranslation = await t(this.faqTranslationPath);
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const videoTranslation = await t(this.videoTranslationPath);
    const expectedTitle = await t('browserView.activity.learnAbout.title');
    const expectedTitles = [glossaryTranslation, glossaryTranslation, faqTranslation, videoTranslation];
    const expectedSubtitles = [
      await t('browserView.activity.learnAbout.whatAreActivityDetails'),
      await t('browserView.activity.learnAbout.whatIsAnUnconfirmedTransaction'),
      await t('browserView.activity.learnAbout.doesLaceHaveFees'),
      await t('browserView.activity.learnAbout.transactionBundles')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeStakingWidget() {
    const faqTranslation = await t(this.faqTranslationPath);
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const videoTranslation = await t(this.videoTranslationPath);
    const expectedTitle = await t('browserView.sidePanel.aboutStaking');
    const expectedTitles = [faqTranslation, faqTranslation, glossaryTranslation, videoTranslation];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.stakingAndDelegation'),
      await t('educationalBanners.subtitle.choosingAStakePool'),
      await t('educationalBanners.subtitle.activeStake'),
      await t('educationalBanners.subtitle.stakingMadeEasy')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeFaqArticle(title: string) {
    const faqArticle = faqArticles[title];
    const expectedPath = `faq?question=${faqArticle.question}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    await FaqPage.activeArticle.waitForDisplayed();
    expect(await FaqPage.getActiveArticleTitleText()).to.equal(faqArticle.title);
  }

  async assertSeeGlossaryArticle(title: string) {
    const glossaryArticle = glossaryArticles[title];
    const expectedPath = `glossary?term=${glossaryArticle.term}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    await GlossaryPage.activeArticle.waitForDisplayed();
    expect(await GlossaryPage.getActiveArticleTitleText()).to.equal(glossaryArticle.title);
  }

  async assertSeeVideoArticle(title: string) {
    const videoArticle = videoArticles[title];
    const expectedPath = `learn?video=${videoArticle.video}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    const video = await LearnVideoPage.getVideoByTitle(videoArticle.title);
    await video.waitForDisplayed();
  }
}

export default new EducationalListAssert();
