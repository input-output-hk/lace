import TokenSelectionPage from '../../elements/newTransaction/tokenSelectionPage';
import webTester from '../../actor/webTester';
import { TokenSearchResult } from '../../elements/newTransaction/tokenSearchResult';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class TransactionAssetSelectionAssert {
  async assertAssetIsPresentInTokenList(assetName: string, shouldBeVisible: boolean) {
    await (shouldBeVisible
      ? webTester.waitUntilSeeElement(new TokenSearchResult(assetName).container())
      : webTester.dontSeeWebElement(new TokenSearchResult(assetName).container()));
  }

  async assertAssetsAreSelected(shouldBeSelected: boolean, amount: number, assetType: string) {
    for (let i = 1; i <= amount; i++) {
      await this.assertSpecificAssetSelected(shouldBeSelected, assetType, i);
    }
  }

  async assertSpecificAssetSelected(shouldBeSelected: boolean, assetType: string, index: number) {
    if (assetType === 'Tokens') {
      await TokenSelectionPage.grayedOutTokenIcon(index).waitForDisplayed({
        reverse: !shouldBeSelected
      });
      await TokenSelectionPage.checkmarkInSelectedToken(index).waitForDisplayed({
        reverse: !shouldBeSelected
      });
    } else {
      await TokenSelectionPage.grayedOutNFT(index).waitForDisplayed({
        reverse: !shouldBeSelected
      });
      await TokenSelectionPage.checkmarkInSelectedNFT(index).waitForDisplayed({
        reverse: !shouldBeSelected
      });
    }
  }

  async assertSelectedAssetsCounter(shouldBeDisplayed: boolean, amount: number) {
    await TokenSelectionPage.assetsCounter.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      const counterValue = Number(await TokenSelectionPage.assetsCounter.getText());
      expect(Number(amount)).to.equal(Number(counterValue));
    }
  }

  async assertSeeAllAssetsUsedMessage(shouldSee: boolean) {
    await TokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await TokenSelectionPage.neutralFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await TokenSelectionPage.emptyStateMessage.getText()).to.equal(
        await t('core.assetSelectorOverlay.usedAllAssets')
      );
    }
  }

  async assertSeeNoMatchingResultsMessage(shouldSee: boolean) {
    await TokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await TokenSelectionPage.sadFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await TokenSelectionPage.emptyStateMessage.getText()).to.equal(
        await t('core.assetSelectorOverlay.noMatchingResult')
      );
    }
  }

  async assertSeeNoAssetsAvailableMessage(assetType: 'tokens' | 'nfts', shouldSee: boolean) {
    await TokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await TokenSelectionPage.sadFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      const messageForTokens = `${await t('core.assetSelectorOverlay.youDonthaveAnyTokens')}\n${await t(
        'core.assetSelectorOverlay.justAddSomeDigitalAssetsToGetStarted'
      )}`;
      const messageForNFTs = `${await t('core.assetSelectorOverlay.noNFTs')}\n${await t(
        'core.assetSelectorOverlay.addFundsToStartYourWeb3Journey.'
      )}`;
      const expectedMessage = assetType === 'tokens' ? messageForTokens : messageForNFTs;
      expect(await TokenSelectionPage.emptyStateMessage.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeTokenSelectionPageButtons() {
    await TokenSelectionPage.tokensButton.waitForDisplayed();
    await TokenSelectionPage.nftsButton.waitForDisplayed();
    await TokenSelectionPage.selectMultipleButton.waitForDisplayed();

    expect(await TokenSelectionPage.tokensButton.getText()).to.equal(await t('browserView.sideMenu.links.tokens'));
    expect(await TokenSelectionPage.nftsButton.getText()).to.equal(await t('browserView.sideMenu.links.nfts'));
    expect(await TokenSelectionPage.selectMultipleButton.getText()).to.equal(
      await t('multipleSelection.selectMultiple')
    );
  }
}

export default new TransactionAssetSelectionAssert();
