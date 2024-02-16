import { expect } from 'chai';
import { t } from '../../utils/translationService';
import PortfolioBar from '../../elements/multidelegation/PortfolioBar';

class PortfolioBarAssert {
  assertSeePortfolioBar = async (selectedPools: string) => {
    await PortfolioBar.container.waitForDisplayed();
    await PortfolioBar.selectedPoolsCounter.waitForDisplayed();
    expect(await PortfolioBar.selectedPoolsCounter.getText()).to.startWith(
      (await t('portfolioBar.selectedPools', 'staking')).replace('{{selectedPoolsCount}}', selectedPools)
    );
    await PortfolioBar.maxPoolsCounter.waitForDisplayed();
    expect(await PortfolioBar.maxPoolsCounter.getText()).to.equal(
      (await t('portfolioBar.maxPools', 'staking')).replace('{{maxPoolsCount}}', '10')
    );
    await PortfolioBar.nextButton.waitForClickable();
    expect(await PortfolioBar.nextButton.getText()).to.equal(await t('portfolioBar.next', 'staking'));
    await PortfolioBar.clearButton.waitForClickable();
    expect(await PortfolioBar.clearButton.getText()).to.equal(await t('portfolioBar.clear', 'staking'));
  };
}

export default new PortfolioBarAssert();
