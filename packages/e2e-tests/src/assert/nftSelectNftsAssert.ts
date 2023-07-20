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

  async assertSeeNFTsWithSearchPhrase(searchPhrase: string) {
    const displayedNfts = await NftSelectNftsPage.nfts;
    const displayedNftNames: string[] = [];
    const displayedNftNamesMatched: string[] = [];

    for (const nft of displayedNfts) {
      displayedNftNames.push(await nft.getText());
      if ((await nft.getText()).toLowerCase().includes(searchPhrase.toLowerCase())) {
        displayedNftNamesMatched.push(await nft.getText());
      }
    }
    expect(displayedNftNamesMatched).to.have.ordered.members(displayedNftNames);
  }
}

export default new NftSelectNftsAssert();
