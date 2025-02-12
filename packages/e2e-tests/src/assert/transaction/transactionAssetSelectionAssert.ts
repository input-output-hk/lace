/* global WebdriverIO */
import TokenSelectionPage from '../../elements/newTransaction/tokenSelectionPage';
import { TokenSearchResult } from '../../elements/newTransaction/tokenSearchResult';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { scanVirtualizedList } from '../../utils/virtualizedListUtils';

class TransactionAssetSelectionAssert {
  async assertAssetIsPresentInTokenList(assetName: string, shouldBeDisplayed: boolean) {
    await new TokenSearchResult(assetName).container.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }

  async assertAssetsAreSelected(shouldBeSelected: boolean, expectedAmount: number, assetType: 'Tokens' | 'NFTs') {
    await (assetType === 'Tokens'
      ? this.assertTokensSelected(shouldBeSelected, expectedAmount)
      : this.assertNFTsSelected(shouldBeSelected, expectedAmount));
  }

  async assertTokensSelected(shouldBeSelected: boolean, expectedAmount: number) {
    for (let i = 1; i <= expectedAmount; i++) {
      await this.assertTokenSelectedAtIndex(shouldBeSelected, i);
    }
  }

  async assertTokenSelectedAtIndex(shouldBeSelected: boolean, index: number) {
    await TokenSelectionPage.tokenItem(index).grayedOutTokenIcon.waitForDisplayed({
      reverse: !shouldBeSelected
    });
    await TokenSelectionPage.tokenItem(index).checkmarkInSelectedToken.waitForDisplayed({
      reverse: !shouldBeSelected
    });
  }

  assertNFTsSelected(shouldBeSelected: boolean, expectedAmount: number) {
    return scanVirtualizedList(
      expectedAmount,
      () => TokenSelectionPage.nftContainers,
      (nft) => TokenSelectionPage.getNftName(nft),
      (nextNFT) => this.assertNFTSelected(shouldBeSelected, nextNFT)
    );
  }

  async assertNFTSelected(shouldBeSelected: boolean, nft: WebdriverIO.Element) {
    await TokenSelectionPage.grayedOutNFT(nft).waitForDisplayed({
      reverse: !shouldBeSelected
    });
    await TokenSelectionPage.checkmarkInSelectedNFT(nft).waitForDisplayed({
      reverse: !shouldBeSelected
    });
  }

  async assertNFTSelectedAtIndex(shouldBeSelected: boolean, index: number) {
    const nft = await TokenSelectionPage.getNftAtIndex(index);
    if (!nft) return Promise.reject(new Error(`NFT at index ${index} not found`));
    return await this.assertNFTSelected(shouldBeSelected, nft);
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
