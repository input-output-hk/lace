import { StakePool } from '../data/expectedStakePoolsData';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import extensionUtils from '../utils/utils';
import StakingConfirmationDrawer from '../elements/staking/stakingConfirmationDrawer';

class StakePoolConfirmationScreenAssert {
  async assertSeeStakePoolConfirmationScreen(mode: string, expectedStakedPool: StakePool, adaBalance: string) {
    expect(await StakingConfirmationDrawer.title.getText()).to.equal(
      await t('browserView.staking.details.confirmation.title')
    );
    expect(await StakingConfirmationDrawer.subTitle.getText()).to.equal(
      await t('browserView.staking.details.confirmation.subTitle')
    );

    await StakingConfirmationDrawer.cardanoLogo.waitForDisplayed();
    expect(await StakingConfirmationDrawer.cardanoName.getText()).to.equal(
      await t('browserView.staking.details.confirmation.cardanoName')
    );

    const currentTicker = extensionUtils.isMainnet() ? 'ADA' : 'tADA';
    expect(await StakingConfirmationDrawer.cardanoTicker.getText()).to.equal(currentTicker);

    expect(Number(await StakingConfirmationDrawer.cardanoBalanceAda.getText())).to.equal(Number(adaBalance));
    await StakingConfirmationDrawer.cardanoBalanceFiat.waitForDisplayed();

    await StakingConfirmationDrawer.poolLogo.waitForDisplayed();
    expect(await StakingConfirmationDrawer.poolName.getText()).to.equal(expectedStakedPool.name);
    expect(String(await (await StakingConfirmationDrawer.poolTicker(mode)).getText())).to.equal(
      expectedStakedPool.ticker
    );

    const currentPoolHasMetadata: boolean = (await StakingConfirmationDrawer.getAmountOfPoolIds()).length === 1;
    expect(
      expectedStakedPool.poolId.startsWith(
        (await (await StakingConfirmationDrawer.poolId(currentPoolHasMetadata)).getText()).slice(0, 6)
      )
    ).to.be.true;
    expect(
      expectedStakedPool.poolId.endsWith(
        (await (await StakingConfirmationDrawer.poolId(currentPoolHasMetadata)).getText()).slice(-8)
      )
    ).to.be.true;

    await StakingConfirmationDrawer.feeAda.waitForDisplayed();
    await StakingConfirmationDrawer.feeFiat.waitForDisplayed();
    await StakingConfirmationDrawer.nextButton.waitForDisplayed();
    await StakingConfirmationDrawer.txFeeLabel.waitForDisplayed();
  }
}

export default new StakePoolConfirmationScreenAssert();
