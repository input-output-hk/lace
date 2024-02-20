import { expect } from 'chai';
import { t } from '../../utils/translationService';
import StartStakingPage from '../../elements/multidelegation/StartStakingPage';
import extensionUtils from '../../utils/utils';
import MultidelegationPageAssert from './MultidelegationPageAssert';

const maxPools = '10';

class StartStakingPageAssert {
  assertSeeStartStakingBanner = async (expectedAdaBalance: string) => {
    await StartStakingPage.bannerContainer.waitForDisplayed();

    await StartStakingPage.bannerTitle.waitForDisplayed();
    expect(await StartStakingPage.bannerTitle.getText()).to.equal(await t('overview.noStaking.title', 'staking'));
    await StartStakingPage.bannerDescription.waitForDisplayed();
    expect(await StartStakingPage.bannerDescription.getText()).to.equal(
      (await t('overview.noStaking.description', 'staking')).replace('{{maxPools}}', maxPools)
    );
    await StartStakingPage.bannerBalanceTitle.waitForDisplayed();
    expect(await StartStakingPage.bannerBalanceTitle.getText()).to.equal(
      await t('overview.noStaking.balanceTitle', 'staking')
    );

    await StartStakingPage.bannerBalanceValue.waitForDisplayed();
    expect(await StartStakingPage.bannerBalanceValue.getText()).to.equal(expectedAdaBalance);

    await StartStakingPage.bannerBalanceSymbol.waitForDisplayed();
    expect(await StartStakingPage.bannerBalanceSymbol.getText()).to.equal(extensionUtils.isMainnet() ? 'ADA' : 'tADA');
  };

  assertSeeStartStakingSteps = async () => {
    await StartStakingPage.getStartedTitle.waitForDisplayed();
    expect(await StartStakingPage.getStartedTitle.getText()).to.equal(
      await t('overview.noStaking.getStarted', 'staking')
    );
    await StartStakingPage.getStartedDescription.waitForDisplayed();
    expect(await StartStakingPage.getStartedDescription.getText()).to.equal(
      await t('overview.noStaking.followSteps', 'staking')
    );

    await StartStakingPage.getStartedStep1Title.waitForDisplayed();
    expect(await StartStakingPage.getStartedStep1Title.getText()).to.equal(
      await t('overview.noStaking.searchForPoolTitle', 'staking')
    );
    await StartStakingPage.getStartedStep1Description.waitForDisplayed();
    expect(await StartStakingPage.getStartedStep1Description.getText()).to.equal(
      (await t('overview.noStaking.searchForPoolDescription', 'staking')).replace('<Link>', '').replace('</Link>', '')
    );

    await StartStakingPage.getStartedStep2Title.waitForDisplayed();
    expect(await StartStakingPage.getStartedStep2Title.getText()).to.equal(
      await t('overview.noStaking.selectPoolsTitle', 'staking')
    );
    await StartStakingPage.getStartedStep2Description.waitForDisplayed();
    expect(await StartStakingPage.getStartedStep2Description.getText()).to.equal(
      (await t('overview.noStaking.selectPoolsDescription', 'staking'))
        .replace('<Link>', '')
        .replace('</Link>', '')
        .replace('{{maxPools}}', maxPools)
    );
  };

  assertDoNotSeeStartStakingSteps = async () => {
    await StartStakingPage.getStartedTitle.waitForDisplayed({ reverse: true });
    await StartStakingPage.getStartedDescription.waitForDisplayed({ reverse: true });
    await StartStakingPage.getStartedStep1Title.waitForDisplayed({ reverse: true });
    await StartStakingPage.getStartedStep1Description.waitForDisplayed({ reverse: true });
    await StartStakingPage.getStartedStep2Title.waitForDisplayed({ reverse: true });
    await StartStakingPage.getStartedStep2Description.waitForDisplayed({ reverse: true });
  };

  assertSeeExpandedViewBanner = async () => {
    await StartStakingPage.expandedViewBannerContainer.waitForDisplayed({ timeout: 10_000 });
    await StartStakingPage.expandedViewBannerTitle.waitForDisplayed();
    expect(await StartStakingPage.expandedViewBannerTitle.getText()).to.equal(
      await t('popup.expandBanner.title', 'staking')
    );
    await StartStakingPage.expandedViewBannerDescription.waitForDisplayed();
    expect(await StartStakingPage.expandedViewBannerDescription.getText()).to.equal(
      await t('popup.expandBanner.description', 'staking')
    );
    await StartStakingPage.expandedViewBannerButton.waitForDisplayed();
    expect(await StartStakingPage.expandedViewBannerButton.getText()).to.equal(
      await t('popup.expandBanner.button', 'staking')
    );
  };

  assertDoNotSeeExpandedViewBanner = async () => {
    await StartStakingPage.expandedViewBannerContainer.waitForDisplayed({ reverse: true });
    await StartStakingPage.expandedViewBannerTitle.waitForDisplayed({ reverse: true });
    await StartStakingPage.expandedViewBannerDescription.waitForDisplayed({ reverse: true });
    await StartStakingPage.expandedViewBannerButton.waitForDisplayed({ reverse: true });
  };

  assertSeeStartStakingPage = async (expectedAdaBalance: string, mode: 'extended' | 'popup') => {
    await MultidelegationPageAssert.assertSeeTitle();
    await this.assertSeeStartStakingBanner(expectedAdaBalance);
    if (mode === 'extended') {
      await MultidelegationPageAssert.assertSeeTabs();
      await this.assertSeeStartStakingSteps();
      await this.assertDoNotSeeExpandedViewBanner();
    } else {
      await this.assertDoNotSeeStartStakingSteps();
      await this.assertSeeExpandedViewBanner();
    }
  };
}

export default new StartStakingPageAssert();
