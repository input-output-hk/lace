import { TokenSelectionPage } from '../../elements/newTransaction/tokenSelectionPage';
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
    const tokenSelectionPage = new TokenSelectionPage();
    if (assetType === 'Tokens') {
      await $(tokenSelectionPage.grayedOutTokenIcon(index).toJSLocator()).waitForDisplayed({
        reverse: !shouldBeSelected
      });
      await $(tokenSelectionPage.checkmarkInSelectedToken(index).toJSLocator()).waitForDisplayed({
        reverse: !shouldBeSelected
      });
    } else {
      await (
        await tokenSelectionPage.grayedOutNFT(index)
      ).waitForDisplayed({
        reverse: !shouldBeSelected
      });
      await (
        await tokenSelectionPage.checkmarkInSelectedNFT(index)
      ).waitForDisplayed({
        reverse: !shouldBeSelected
      });
    }
  }

  async assertSelectedAssetsCounter(isVisible: boolean, amount: number) {
    const tokenSelectionPage = new TokenSelectionPage();
    if (isVisible) {
      await webTester.seeWebElement(tokenSelectionPage.assetsCounter());
      const counterValue = Number(await webTester.getTextValueFromElement(tokenSelectionPage.assetsCounter()));
      await expect(Number(amount)).to.equal(Number(counterValue));
    } else {
      await webTester.dontSeeWebElement(tokenSelectionPage.assetsCounter());
    }
  }

  async assertSeeAllAssetsUsedMessage(shouldSee: boolean) {
    const tokenSelectionPage = new TokenSelectionPage();
    await tokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await tokenSelectionPage.neutralFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await expect(await tokenSelectionPage.emptyStateMessage.getText()).to.equal(
        await t('package.core.assetSelectorOverlay.usedAllAssets')
      );
    }
  }

  async assertSeeNoMatchingResultsMessage(shouldSee: boolean) {
    const tokenSelectionPage = new TokenSelectionPage();
    await tokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await tokenSelectionPage.sadFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await expect(await tokenSelectionPage.emptyStateMessage.getText()).to.equal(
        await t('package.core.assetSelectorOverlay.noMatchingResult')
      );
    }
  }

  async assertSeeNoAssetsAvailableMessage(assetType: 'tokens' | 'nfts', shouldSee: boolean) {
    const tokenSelectionPage = new TokenSelectionPage();
    await tokenSelectionPage.emptyStateMessage.waitForDisplayed({ reverse: !shouldSee });
    await tokenSelectionPage.sadFaceIcon.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      const messageForTokens = `${await t('package.core.assetSelectorOverlay.youDonthaveAnyTokens')}\n${await t(
        'package.core.assetSelectorOverlay.justAddSomeDigitalAssetsToGetStarted'
      )}`;
      const messageForNFTs = `${await t('package.core.assetSelectorOverlay.noNFTs')}\n${await t(
        'package.core.assetSelectorOverlay.addFundsToStartYourWeb3Journey.'
      )}`;
      const expectedMessage = assetType === 'tokens' ? messageForTokens : messageForNFTs;
      await expect(await tokenSelectionPage.emptyStateMessage.getText()).to.equal(expectedMessage);
    }
  }
}

export default new TransactionAssetSelectionAssert();
