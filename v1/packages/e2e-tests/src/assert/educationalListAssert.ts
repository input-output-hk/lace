import EducationalList from '../elements/educationalList';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import AboutLaceWidget from '../elements/settings/extendedView/AboutLaceWidget';
import { glossaryArticles, videoArticles } from '../data/EducationalArticles';
import { browser } from '@wdio/globals';
import GlossaryPage from '../elements/glossaryPage';
import LearnVideoPage from '../elements/LearnVideoPage';

class EducationalListAssert {
  glossaryTranslationPath = 'educationalBanners.title.glossary';
  faqTranslationPath = 'educationalBanners.title.faq';
  videoTranslationPath = 'educationalBanners.title.video';

  async assertSeeWidget(title: string, itemTitles: string[], itemSubtitles: string[]) {
    const rowCount = (await EducationalList.listRows).length;
    expect(await EducationalList.getListTitle()).to.equal(title);
    expect((await EducationalList.listRowImages).length).to.equal(rowCount);
    expect(JSON.stringify(await EducationalList.getListRowTitles())).to.deep.equal(JSON.stringify(itemTitles));
    expect(JSON.stringify(await EducationalList.getListRowSubtitles())).to.deep.equal(JSON.stringify(itemSubtitles));
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
    const expectedTitles = [
      glossaryTranslation,
      faqTranslation,
      videoTranslation,
      videoTranslation,
      faqTranslation,
      faqTranslation,
      faqTranslation
    ];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.whatIsADigitalAsset'),
      await t('educationalBanners.subtitle.howToSendReceiveFunds'),
      await t('educationalBanners.subtitle.secureSelfCustody'),
      await t('educationalBanners.subtitle.connectingDApps'),
      await t('educationalBanners.subtitle.conwayEra'),
      await t('educationalBanners.subtitle.governanceFeatures'),
      await t('educationalBanners.subtitle.governanceActions')
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
    const expectedTitle = await t('browserView.sidePanel.aboutStaking');
    const expectedTitles = [faqTranslation, faqTranslation, faqTranslation, faqTranslation];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.stakingAndDelegation'),
      await t('educationalBanners.subtitle.howManyPools'),
      await t('educationalBanners.subtitle.ledgerSupport'),
      await t('educationalBanners.subtitle.stakeDistribution')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeVotingWidget() {
    const faqTranslation = await t(this.faqTranslationPath);
    const glossaryTranslation = await t(this.glossaryTranslationPath);
    const videoTranslation = await t(this.videoTranslationPath);
    const expectedTitle = await t('browserView.sidePanel.learnAbout');
    const expectedTitles = [
      glossaryTranslation,
      faqTranslation,
      videoTranslation,
      videoTranslation,
      faqTranslation,
      faqTranslation,
      faqTranslation
    ];
    const expectedSubtitles = [
      await t('educationalBanners.subtitle.whatIsADigitalAsset'),
      await t('educationalBanners.subtitle.howToSendReceiveFunds'),
      await t('educationalBanners.subtitle.secureSelfCustody'),
      await t('educationalBanners.subtitle.connectingDApps'),
      await t('educationalBanners.subtitle.conwayEra'),
      await t('educationalBanners.subtitle.governanceFeatures'),
      await t('educationalBanners.subtitle.governanceActions')
    ];
    await this.assertSeeWidget(expectedTitle, expectedTitles, expectedSubtitles);
  }

  async assertSeeGlossaryArticle(title: string) {
    const glossaryArticle = glossaryArticles[title];
    const expectedPath = `glossary?term=${glossaryArticle.term}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    await GlossaryPage.activeArticle.waitForDisplayed();
    expect(await GlossaryPage.activeArticleTitle.getText()).to.equal(glossaryArticle.title);
  }

  async assertSeeVideoArticle(title: string) {
    const videoArticle = videoArticles[title];
    const expectedPath = `learn?video=${videoArticle.video}`;
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedPath);
    const video = await LearnVideoPage.getVideoByTitle(videoArticle.title);
    await video.waitForDisplayed();
  }

  async assertSeeRightSidePanel(shouldBeVisible: boolean, section: string) {
    await (section === 'Settings'
      ? AboutLaceWidget.container.waitForDisplayed({ reverse: !shouldBeVisible })
      : EducationalList.container.waitForDisplayed({ reverse: !shouldBeVisible }));
  }
}

export default new EducationalListAssert();
