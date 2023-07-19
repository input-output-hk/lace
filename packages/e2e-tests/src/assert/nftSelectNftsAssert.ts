import { expect } from 'chai';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import { t } from '../utils/translationService';

class NftSelectNftsAssert {
  async assertSeeClearButton(shouldSee: boolean) {
    await NftSelectNftsPage.clearButton.waitForClickable({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await NftSelectNftsPage.clearButton.getText()).to.equal(await t('multipleSelection.clear'));
    }
  }

  async assertSeeCounter(shouldSee: boolean) {
    await NftSelectNftsPage.counter.waitForDisplayed({ reverse: !shouldSee });
  }

  async assertCounterNumber(counter: number) {
    await NftSelectNftsPage.counter.waitForDisplayed();
    expect(await NftSelectNftsPage.counter.getText()).to.equal(String(counter));
  }
}

export default new NftSelectNftsAssert();
