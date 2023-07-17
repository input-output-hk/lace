import { expect } from 'chai';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import { t } from '../utils/translationService';

class NftSelectNftsAssert {
  async assertSeeClearButton() {
    await NftSelectNftsPage.clearButton.waitForDisplayed();
    expect(await NftSelectNftsPage.clearButton.getText()).to.equal(await t('multipleSelection.clear'));
  }

  async assertCounterNumber(counter: number) {
    await NftSelectNftsPage.counter.waitForDisplayed();
    expect(await NftSelectNftsPage.counterNumber.getText()).to.equal(counter.toString());
  }
}

export default new NftSelectNftsAssert();
