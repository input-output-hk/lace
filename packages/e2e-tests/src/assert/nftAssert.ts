/* eslint-disable no-undef */
import { TestnetPatterns } from '../support/patterns';
import NftsPage from '../elements/NFTs/nftsPage';
import NftDetails from '../elements/NFTs/nftDetails';
import { t } from '../utils/translationService';
import { expect, use } from 'chai';
import { browser } from '@wdio/globals';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import chaiSorted from 'chai-sorted';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import adaHandleAssert from './adaHandleAssert';
import NftsCommon from '../elements/NFTs/nftsCommon';
import { scrollToTheTop } from '../utils/scrollUtils';
import { getExtensionUUID } from '../utils/firefoxUtils';

use(chaiSorted);

class NftAssert {
  async assertSeeTitleWithCounter() {
    await NftsPage.title.waitForDisplayed();
    await NftsPage.counter.waitForDisplayed();
    expect(await NftsPage.title.getText()).to.equal(await t('browserView.nfts.pageTitle'));
    expect(await NftsPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  }

  async assertCounterNumberMatchesWalletNFTs() {
    const nftsNumber = (
      await NftsCommon.getAllNftNamesWithScroll(`${NftsPage.LIST_CONTAINER} ${NftsPage.NFT_CONTAINER}`)
    ).length;
    const tokensCounterValue = Number((await NftsPage.counter.getText()).slice(1, -1));
    expect(nftsNumber).to.equal(tokensCounterValue);
  }

  async assertSeeNftList(minimumNumberOfNfts: number) {
    await NftsPage.listContainer.waitForDisplayed();

    await browser.waitUntil(async () => (await NftsPage.nftContainers.length) >= minimumNumberOfNfts, {
      timeout: 60_000,
      interval: 3000,
      timeoutMsg: `failed while waiting for nfts number >= ${minimumNumberOfNfts}`
    });
  }

  async assertNftFallbackImage(nftName: string, contains: boolean) {
    const noImageSrc =
      // eslint-disable-next-line max-len
      'data:image/png;base64,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UE4cP56OHDC6A2gTgQMgJPfgAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAISeAACEngAAhJ4AAIaCBwAAQ0HI/gBgkAQhl8mA4NP/wwAUAkwzyCGxjAARBMTtshM5QAxDNwDw6AgAbDYhWlyAEQxSB99JjA0EITAGIYbjdtK3AGcAAEMdiO2q4pSpUDIIDtnO3sZOJxAQC6bnfKdgLngW8Aum6468cf7UVpCAdAlw1v7NhNmy0PEwB0040NuylwRnEAdFAevd2UsFuPyzGIA6BrBrfG69bA5Qi6HwdAR+xXrD0PPB3mcwZMVwLQAftNPO5/orftuwBovf3vq+0fuNE0palKANpqPNl4m9nG/QOXiqlKAGiX3KeDxmCHEgB0zCQzjCUCZ7oSgO4oETgrKwHojpJTlO7JAdAN7sEB0G7jBY/lB1jTB84KSwBqNl7NP5juUO7pAzf+hCIHQE3GjwJMv/ZjxinKQfE1AEAlhsWU5IybjVRyD27raxiVdmiVJQBT2h4tDaackrxZhYtMBmmYjysYCh0AJQy32pEq3h7yjlS10Rc43L43V8PXC0AU40ik2kJR62MCO1/z0MgOoN8Gty73r2gqcj/Vj+D2sl264e4/2HDrHzsrZMQPIIbt07WHN+yANf8pvfkEbi+DrX/sJG9gKSZALM0OXOxkAkBI/w9c+t1EE/6Y8gAAAABJRU5ErkJggg==';
    const nftImage = await NftsPage.getNftImage(nftName);
    await nftImage.waitForDisplayed({ timeout: 15_000 });
    const srcValue = await nftImage.getAttribute('src');
    contains ? expect(srcValue).to.equal(noImageSrc) : expect(srcValue).to.not.equal(noImageSrc);
  }

  async assertSeeNftItem(index: number) {
    const nft = (await NftsPage.nftContainers[index]) as WebdriverIO.Element;
    await nft.waitForDisplayed();
    await nft.$(NftsPage.NFT_IMAGE).waitForDisplayed();
    await nft.$(NftsPage.NFT_NAME).waitForDisplayed();
  }

  async assertSeeEachNftItemOnNftsPage() {
    const itemsCount = await NftsPage.nftContainers.length;
    expect(itemsCount).to.be.greaterThan(0);
    for (let i = 0; i < itemsCount; i++) {
      await this.assertSeeNftItem(i);
    }
  }

  async assertSeeNFTDetailsHeader(mode: 'extended' | 'popup', nftName: string) {
    await NftDetails.drawerBody.waitForClickable();
    await NftDetails.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      await NftDetails.drawerHeaderTitle.scrollIntoView();
      expect(await NftDetails.drawerNavigationTitle.getText()).to.equal(await t('core.nftDetail.title'));
      await NftDetails.drawerHeaderTitle.waitForDisplayed();
      expect(await NftDetails.drawerHeaderTitle.getText()).to.equal(nftName);
    } else {
      await NftDetails.nftTitleOnPopup.waitForDisplayed();
      expect(await NftDetails.nftTitleOnPopup.getText()).to.equal(nftName);
    }
    await NftDetails.drawerHeaderBackButton.waitForDisplayed({ reverse: mode === 'extended' });
    await NftDetails.drawerHeaderCloseButton.waitForDisplayed({ reverse: mode === 'popup' });
  }

  async assertSeeNFTDetailsTokenInformationSection() {
    await NftDetails.tokenInfoSectionTitle.waitForDisplayed();
    expect(await NftDetails.tokenInfoSectionTitle.getText()).to.equal(await t('core.nftDetail.tokenInformation'));

    await NftDetails.policyIdLabel.waitForDisplayed();
    expect(await NftDetails.policyIdLabel.getText()).to.equal(await t('core.nftDetail.policyId'));
    await NftDetails.policyIdValue.waitForDisplayed();
    await NftDetails.assetIdLabel.waitForDisplayed();
    expect(await NftDetails.assetIdLabel.getText()).to.equal(await t('core.nftDetail.assetId'));
    await NftDetails.assetIdValue.waitForDisplayed();
    await NftDetails.mediaUrlLabel.waitForDisplayed();
    expect(await NftDetails.mediaUrlLabel.getText()).to.equal(await t('core.nftDetail.mediaUrl'));
    await NftDetails.mediaUrlValue.waitForDisplayed();
  }

  async assertSeeNFTDetailsAttributesSection() {
    await NftDetails.attributesSectionTitle.waitForDisplayed();
    expect(await NftDetails.attributesSectionTitle.getText()).to.equal(await t('core.nftDetail.attributes'));
    await NftDetails.attributesSection.waitForDisplayed();
    // TODO: NFT attributes section content varies between NFTs hence it should be compared with values returned by back-end
  }

  async assertSeeNftDetails(nftName: string, mode: 'extended' | 'popup') {
    await this.assertSeeNFTDetailsHeader(mode, nftName);
    await NftDetails.image.waitForDisplayed();
    await this.assertSeeNFTDetailsTokenInformationSection();
    await this.assertSeeNFTDetailsAttributesSection();
    await this.assertSeeSendNFTButton(true);
  }

  async assertNftDisplayed(shouldBeDisplayed: boolean, nftItem: WebdriverIO.Element) {
    if (shouldBeDisplayed) {
      await nftItem.waitForDisplayed({ timeout: 20_000 });
    } else {
      expect(nftItem).to.be.undefined;
    }
  }

  async assertNftDisplayedOnNftsPage(nftName: string, shouldBeDisplayed: boolean) {
    try {
      await NftsPage.waitForNft(nftName);
    } catch {
      if (!shouldBeDisplayed) {
        await scrollToTheTop();
      }
    }
    const nftItem = await NftsPage.getNftContainer(nftName);
    await this.assertNftDisplayed(shouldBeDisplayed, nftItem);
  }

  async assertNftDisplayedInCoinSelector(nftName: string, shouldBeDisplayed: boolean) {
    const nftItem = await TokenSelectionPage.getNftContainer(nftName);
    await this.assertNftDisplayed(shouldBeDisplayed, nftItem);
  }

  async assertSeeSendNFTButton(shouldBeDisplayed: boolean) {
    await NftDetails.sendNFTButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await NftDetails.sendNFTButton.getText()).to.equal(await t('core.nftDetail.sendNFT'));
    }
  }

  async assertSeeFoldersInAlphabeticalOrder() {
    const folderNames = await NftsPage.folderContainers.map((folder) => folder.getText());
    expect(folderNames).to.be.ascending;
  }

  async assertNumberOfExpectedThumbnails(folderName: string, numberOfExpectedThumbnails: number) {
    const numberOfNFTsInFolder = Number(testContext.load('numberOfNftsInFolder'));
    const folderContainer = await NftsPage.getFolder(folderName);
    const totalDisplayedThumbnails = await folderContainer.$$(NftsPage.NFT_ITEM_IMG_CONTAINER).length;

    switch (true) {
      case numberOfNFTsInFolder < 4:
      case numberOfNFTsInFolder > 0:
        expect(totalDisplayedThumbnails).to.equal(numberOfExpectedThumbnails);
        break;
      case numberOfNFTsInFolder >= 4:
        expect(totalDisplayedThumbnails).to.equal(3);
        break;
      case numberOfNFTsInFolder === 0:
        expect(totalDisplayedThumbnails).to.equal(0);
        break;
      default:
        throw new Error(
          `Displayed thumbnails: ${totalDisplayedThumbnails} does not match expected thumbnails: ${numberOfExpectedThumbnails}`
        );
    }
  }

  async assertRemainingNumberOfNFTs(expectedRemainingNumberOfNFTs: number, folderName: string) {
    const numberOfNFTsInFolder = Number(testContext.load('numberOfNftsInFolder'));
    const folderContainer = await NftsPage.getFolder(folderName);

    if (numberOfNFTsInFolder > 4) {
      const numberOfDisplayedRemainingNFTs = Number(
        (await folderContainer.$(NftsPage.REST_OF_NFTS).getText()).slice(1)
      );

      expect(numberOfDisplayedRemainingNFTs).to.equal(expectedRemainingNumberOfNFTs);
    } else {
      await folderContainer.$(NftsPage.REST_OF_NFTS).waitForDisplayed({ reverse: true });
    }
  }

  async assertSeeCustomAdaHandleNft() {
    const nftItem = await NftsPage.getNftContainer(Asset.ADA_HANDLE_3.name);
    await this.assertNftDisplayed(true, nftItem);
    await adaHandleAssert.assertSeeCustomImage(await nftItem.$(NftsPage.NFT_IMAGE));
  }

  async assertSeeCustomAdaHandleNftDetails(mode: 'extended' | 'popup') {
    await this.assertSeeNftDetails(Asset.ADA_HANDLE_3.name, mode);
    await adaHandleAssert.assertSeeCustomImage(await NftDetails.image);
  }

  async assertSeeCustomAdaHandleThumbnail(folderName: string) {
    const folderContainer = await NftsPage.getFolder(folderName);
    const thumbnails = await folderContainer.$$(NftsPage.NFT_ITEM_IMG_CONTAINER);
    const srcValues: string[] = [];
    for (const thumbnail of thumbnails) {
      srcValues.push(await thumbnail.$('img').getAttribute('src'));
    }

    if (browser.isFirefox) {
      adaHandleAssert.customHandleSrcValues.push(`blob:moz-extension://${await getExtensionUUID()}/`);
    }

    expect(
      srcValues.some((testItem) =>
        adaHandleAssert.customHandleSrcValues.some((customItem) => testItem.includes(customItem))
      )
    ).to.be.true;
  }

  async assertSeeCustomAdaHandleInCoinSelector() {
    const nftItem = await TokenSelectionPage.getNftContainer(Asset.ADA_HANDLE_3.name);
    await adaHandleAssert.assertSeeCustomImage(await nftItem.$(TokenSelectionPage.NFT_IMAGE));
  }

  async assertSeeNFTDetailsFolderPath(folderPath: string) {
    const actualFolderPath = await NftDetails.getFolderPath();
    expect(actualFolderPath).to.equal(folderPath);
  }
}

export default new NftAssert();
