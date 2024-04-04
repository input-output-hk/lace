import MoreOptionsComponent from '../../elements/multidelegation/MoreOptionsComponent';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class MoreOptionsComponentAssert {
  assertSeeMoreOptionsComponent = async (tab: 'sorting' | 'filtering') => {
    await MoreOptionsComponent.moreOptionsLabel.waitForDisplayed();
    expect(await MoreOptionsComponent.moreOptionsLabel.getText()).to.equal(
      await t('browsePools.preferencesCard.headers.moreOptions', 'staking')
    );

    // TODO: uncomment when USE_MULTI_DELEGATION_STAKING_FILTERS=true
    // await MoreOptionsComponent.sortingToggle.waitForDisplayed();
    // expect(await MoreOptionsComponent.sortingToggle.getText()).to.equal(
    //   await t('browsePools.preferencesCard.headers.sorting', 'staking')
    // );
    // await MoreOptionsComponent.filtersToggle.waitForDisplayed();
    // expect(await MoreOptionsComponent.filtersToggle.getText()).to.equal(
    //   await t('browsePools.preferencesCard.headers.filters', 'staking')
    // );

    if (tab === 'sorting') {
      // TODO: uncomment when USE_MULTI_DELEGATION_STAKING_FILTERS=true
      // expect(await MoreOptionsComponent.sortingToggle.getAttribute('aria-checked')).to.equal('true');
      await this.assertSeeSortingTab();
    } else {
      expect(await MoreOptionsComponent.filtersToggle.getAttribute('aria-checked')).to.equal('true');
      await this.assertSeeFiltersTab();
    }
  };

  assertSeeSortingTab = async () => {
    await MoreOptionsComponent.tickerOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.tickerOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.tickerOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.ticker', 'staking')
    );
    await MoreOptionsComponent.saturationOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.saturationOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.saturationOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.saturation', 'staking')
    );
    // TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
    // await MoreOptionsComponent.rosOption.radioButton.waitForDisplayed();
    // await MoreOptionsComponent.rosOption.label.waitForDisplayed();
    // expect(await MoreOptionsComponent.rosOption.label.getText()).to.equal(
    //   await t('browsePools.preferencesCard.sort.ros', 'staking')
    // );
    await MoreOptionsComponent.costOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.costOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.costOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.cost', 'staking')
    );
    await MoreOptionsComponent.marginOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.marginOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.marginOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.margin', 'staking')
    );
    await MoreOptionsComponent.blocksOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.blocksOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.blocksOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.blocks', 'staking')
    );
    await MoreOptionsComponent.pledgeOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.pledgeOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.pledgeOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.pledge', 'staking')
    );
    await MoreOptionsComponent.liveStakeOption.radioButton.waitForDisplayed();
    await MoreOptionsComponent.liveStakeOption.label.waitForDisplayed();
    expect(await MoreOptionsComponent.liveStakeOption.label.getText()).to.equal(
      await t('browsePools.preferencesCard.sort.liveStake', 'staking')
    );
  };

  assertSeeFiltersTab = async () => {
    await MoreOptionsComponent.saturationFilterLabel.waitForDisplayed();
    expect(await MoreOptionsComponent.saturationFilterLabel.getText()).to.equal(
      await t('browsePools.preferencesCard.filter.saturation', 'staking')
    );
    await MoreOptionsComponent.profitMarginFilterLabel.waitForDisplayed();
    expect(await MoreOptionsComponent.profitMarginFilterLabel.getText()).to.equal(
      await t('browsePools.preferencesCard.filter.profitMargin', 'staking')
    );
    await MoreOptionsComponent.performanceFilterLabel.waitForDisplayed();
    expect(await MoreOptionsComponent.performanceFilterLabel.getText()).to.equal(
      await t('browsePools.preferencesCard.filter.performance', 'staking')
    );
    await MoreOptionsComponent.rosFilterLabel.waitForDisplayed();
    expect(await MoreOptionsComponent.rosFilterLabel.getText()).to.equal(
      await t('browsePools.preferencesCard.filter.ros.title', 'staking')
    );
    // TODO: add assertions for input fields when USE_MULTI_DELEGATION_STAKING_FILTERS=true
  };
}

export default new MoreOptionsComponentAssert();
