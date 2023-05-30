import { StakePool } from '../data/expectedStakePoolsData';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import StakingConfirmationScreen from '../elements/staking/stakingConfirmationDrawer';
import extensionUtils from '../utils/utils';

class StakePoolConfirmationScreenAssert {
  async assertSeeStakePoolConfirmationScreen(mode: string, expectedStakedPool: StakePool, adaBalance: string) {
    await expect(await StakingConfirmationScreen.title.getText()).to.equal(
      await t('browserView.staking.details.confirmation.title')
    );
    await expect(await StakingConfirmationScreen.subTitle.getText()).to.equal(
      await t('browserView.staking.details.confirmation.subTitle')
    );

    await StakingConfirmationScreen.cardanoLogo.waitForDisplayed();
    await expect(await StakingConfirmationScreen.cardanoName.getText()).to.equal(
      await t('browserView.staking.details.confirmation.cardanoName')
    );

    const currentTicker = extensionUtils.isMainnet() ? 'ADA' : 'tADA';
    await expect(await StakingConfirmationScreen.cardanoTicker.getText()).to.equal(currentTicker);

    await expect(Number(await StakingConfirmationScreen.cardanoBalanceAda.getText())).to.equal(Number(adaBalance));
    await StakingConfirmationScreen.cardanoBalanceFiat.waitForDisplayed();

    await StakingConfirmationScreen.poolLogo.waitForDisplayed();
    await expect(await StakingConfirmationScreen.poolName.getText()).to.equal(expectedStakedPool.name);
    await expect(String(await (await StakingConfirmationScreen.poolTicker(mode)).getText())).to.equal(
      expectedStakedPool.ticker
    );

    const currentPoolHasMetadata: boolean = (await StakingConfirmationScreen.getAmountOfPoolIds()).length === 1;
    expect(
      expectedStakedPool.poolId.startsWith(
        (await (await StakingConfirmationScreen.poolId(currentPoolHasMetadata)).getText()).slice(0, 6)
      )
    ).to.be.true;
    expect(
      expectedStakedPool.poolId.endsWith(
        (await (await StakingConfirmationScreen.poolId(currentPoolHasMetadata)).getText()).slice(-8)
      )
    ).to.be.true;

    await StakingConfirmationScreen.feeAda.waitForDisplayed();
    await StakingConfirmationScreen.feeFiat.waitForDisplayed();
    await StakingConfirmationScreen.nextButton.waitForDisplayed();
    await StakingConfirmationScreen.txFeeLabel.waitForDisplayed();
  }
}

export default new StakePoolConfirmationScreenAssert();
