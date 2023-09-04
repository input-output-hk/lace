import { StakePool } from '../data/expectedStakePoolsData';
import StakePoolDetails from '../elements/staking/stakePoolDetails';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import { TestnetPatterns } from '../support/patterns';
import { isPopupMode } from '../utils/pageUtils';
import { StakePoolListItem } from '../elements/staking/StakePoolListItem';
import webTester from '../actor/webTester';

class MultidelegationStakePoolDetailsAssert {
  async assertSeeMultiDelegationStakePoolDetailsPage(
    expectedStakedPool: StakePool,
    staked: boolean,
    noMetaDataPool = false
  ) {
    (await isPopupMode())
      ? await StakePoolDetails.drawerHeaderBackButton.waitForClickable()
      : await StakePoolDetails.drawerHeaderCloseButton.waitForClickable();

    await this.assertMultiDelegationSeeStakePoolDetailsCommonElements();

    await expect(await StakePoolDetails.poolName.getText()).to.equal(expectedStakedPool.name);

    if (noMetaDataPool) {
      await expect(await StakePoolDetails.poolTicker.getText()).to.contain(expectedStakedPool.poolId.slice(0, 6));
    } else {
      await expect(await StakePoolDetails.poolTicker.getText()).to.equal(expectedStakedPool.ticker);

      await expect(await StakePoolDetails.informationDescription.getText()).to.equal(expectedStakedPool.information);
      await expect(await StakePoolDetails.socialLinksTitle.getText()).to.equal(
        await t('browserView.staking.details.social.title')
      );
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed();
    }

    await expect(await StakePoolDetails.informationTitle.getText()).to.equal(
      await t('browserView.staking.details.information.title')
    );
    await expect(await StakePoolDetails.poolIdsTitle.getText()).to.equal(
      await t('browserView.staking.details.poolIds.title')
    );
    await expect(await StakePoolDetails.poolId.getText()).to.equal(expectedStakedPool.poolId);

    console.log(`button text is ${await StakePoolDetails.ownersTitle.getText()}`);
    await expect(await StakePoolDetails.ownersTitle.getText()).to.equal('Owners (1)');

    for (const owner of await StakePoolDetails.owners) {
      const slicedString = (await owner.getText()).slice(0, 21);
      await expect(expectedStakedPool.owners.some((x) => x.includes(slicedString))).to.be.true;
    }
  }

  assertSeeMDStakePoolRow = async (index?: number) => {
    const stakePoolListItem = new StakePoolListItem(index);
    await webTester.seeWebElement(stakePoolListItem.logo());
    await expect((await stakePoolListItem.getName()) as string).to.not.be.empty;
    await expect((await stakePoolListItem.getTicker()) as string).to.not.be.empty;
    await expect((await stakePoolListItem.getRos()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    await expect((await stakePoolListItem.getSaturation()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  };

  assertMultiDelegationSeeStakePoolRows = async () => {
    const stakePoolListItem = new StakePoolListItem();
    await webTester.waitUntilSeeElement(stakePoolListItem.container(), 6000);
    const rowsNumber = (await stakePoolListItem.getRows()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      await this.assertSeeMDStakePoolRow(i);
    }
  };

  async assertMultiDelegationSeeStakePoolDetailsCommonElements() {
    await StakePoolDetails.poolName.waitForClickable();
    await StakePoolDetails.poolLogo.waitForDisplayed();

    await expect(await StakePoolDetails.stakeButton.getText()).to.equal('Stake all on this pool');

    await expect(await StakePoolDetails.stakeButton.waitForClickable());

    await expect(await StakePoolDetails.statisticsTitle.getText()).to.equal(
      await t('browserView.staking.details.statistics.title')
    );
    await expect(await StakePoolDetails.activeStakeTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.activeStake')
    );

    await expect(((await StakePoolDetails.activeStakeValue.getText()) as string).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
    await expect(await StakePoolDetails.saturationTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.saturation')
    );
    await expect((await StakePoolDetails.saturationValue.getText()) as string).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
    await expect(await StakePoolDetails.delegatorsTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.delegators')
    );
    await expect((await StakePoolDetails.delegatorsValue.getText()) as string).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
  }
}

export default new MultidelegationStakePoolDetailsAssert();
