/* eslint-disable no-undef */
import NftsPage from '../elements/NFTs/nftsPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import NftFolderNameInput from '../elements/NFTs/nftFolderNameInput';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import { Asset } from '../data/Asset';
import testContext from '../utils/testContext';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';
import NftsFolderPage from '../elements/NFTs/nftsFolderPage';
import adaHandleAssert from './adaHandleAssert';
import { browser } from '@wdio/globals';

class NftCreateFolderAssert {
  async assertSeeCreateFolderButton(shouldSee: boolean, mode: 'extended' | 'popup') {
    await NftsPage.createFolderButton.waitForDisplayed({ reverse: !shouldSee });
    if (mode === 'extended' && shouldSee) {
      expect(await NftsPage.createFolderButton.getText()).to.equal(await t('browserView.nfts.createFolder'));
    }
  }

  async assertSeeDrawerNavigation(mode: 'extended' | 'popup', drawerTitleTranslationKey: string) {
    if (mode === 'popup') {
      await NftCreateFolderPage.drawerHeaderBackButton.waitForClickable();
    } else {
      await NftCreateFolderPage.drawerBody.waitForClickable();
      await NftCreateFolderPage.drawerNavigationTitle.waitForDisplayed();
      expect(await NftCreateFolderPage.drawerNavigationTitle.getText()).to.equal(await t(drawerTitleTranslationKey));
      await NftCreateFolderPage.drawerHeaderCloseButton.waitForDisplayed();
    }
  }

  async assertSeeCreateFolderPage(shouldSee: boolean, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await this.assertSeeDrawerNavigation(mode, 'browserView.nfts.folderDrawer.header');
      await NftCreateFolderPage.drawerHeaderTitle.waitForClickable();
      expect(await NftCreateFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.title')
      );

      await NftCreateFolderPage.folderNameInput.input.waitForDisplayed();

      await NftCreateFolderPage.folderNameInput.inputLabel.waitForDisplayed();
      expect(await NftCreateFolderPage.folderNameInput.inputLabel.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.inputPlaceholder')
      );

      await NftCreateFolderPage.nextButton.waitForDisplayed();
      expect(await NftCreateFolderPage.nextButton.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.cta.create')
      );
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed({ reverse: true });
    }
  }

  async assertSeeEmptyNameInput() {
    expect(await NftFolderNameInput.input.getValue()).to.be.empty;
  }

  async assertSeeNextButtonEnabledOnCreateFolderPage(isEnabled: boolean) {
    await NftCreateFolderPage.nextButton.waitForEnabled({ reverse: !isEnabled });
  }

  async assertSeeNextButtonEnabledOnSelectNftsPage(isEnabled: boolean) {
    await NftSelectNftsPage.nextButton.waitForEnabled({ reverse: !isEnabled });
  }

  async assertSeeSelectNFTsPage(shouldSee: boolean, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await this.assertSeeDrawerNavigation(mode, 'browserView.nfts.folderDrawer.header');
      await NftCreateFolderPage.drawerHeaderTitle.waitForDisplayed();
      expect(await NftCreateFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.assetPicker.title')
      );
      await NftSelectNftsPage.searchInput.container.waitForDisplayed();
      expect(await NftSelectNftsPage.searchInput.input.getAttribute('placeholder')).to.equal(
        await t('cardano.stakePoolSearch.searchPlaceholder')
      );
      await NftSelectNftsPage.assetSelectorContainer.waitForDisplayed();

      const ibileCoin = await TokenSelectionPage.getNftContainer(Asset.IBILECOIN.name);
      await ibileCoin.waitForDisplayed();
      const bisonCoin = await TokenSelectionPage.getNftContainer(Asset.BISON_COIN.name);
      await bisonCoin.waitForDisplayed();

      await NftSelectNftsPage.nextButton.waitForDisplayed();
      expect(await NftSelectNftsPage.nextButton.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.cta.create')
      );
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed({ reverse: true });
    }
  }

  async verifySeeAllOwnedNfts() {
    const ownedNftNames = testContext.load('ownedNfts');
    const displayedNfts = await TokenSelectionPage.nftContainers;

    const displayedNftNames: string[] = [];
    for (const nftContainer of displayedNfts) {
      displayedNftNames.push(await nftContainer.getText());
    }

    expect(ownedNftNames).to.have.ordered.members(displayedNftNames);
  }

  async verifySeeAllAdaHandles() {
    const ownedAdaHandleNames: string[] = testContext.load('displayedAdaHandleNames');
    let displayedNfts = await TokenSelectionPage.nftContainers;

    const displayedAdaHandleNames: string[] = [];
    let previousContainerCount = 0;

    do {
      previousContainerCount = displayedNfts.length;

      for (const nftContainer of displayedNfts) {
        await nftContainer.scrollIntoView();
        await browser.pause(300);

        const nftName = await nftContainer.getText();
        if (!displayedAdaHandleNames.includes(nftName)) {
          displayedAdaHandleNames.push(nftName);
        }
      }

      await browser.pause(300);

      displayedNfts = await TokenSelectionPage.nftContainers;
    } while (displayedNfts.length > previousContainerCount);

    expect(ownedAdaHandleNames).to.have.all.members(displayedAdaHandleNames);
  }

  async verifySeeAllAdaImages() {
    const adaHandleImages: string[] = testContext.load('displayedAdaHandleImages');
    const displayedAdaHandleImages = await TokenSelectionPage.nftImages;
    const displayedAdaHandleImagesSrc: string[] = [];

    for (const displayedAdaHandleImage of displayedAdaHandleImages) {
      await displayedAdaHandleImage.waitForDisplayed();
      displayedAdaHandleImagesSrc.push(await displayedAdaHandleImage.getAttribute('src'));
    }

    expect(displayedAdaHandleImagesSrc.length).to.equal(adaHandleImages.length);
  }

  async verifyNoneNftIsSelected() {
    await TokenSelectionPage.nftItemSelectedCheckmark.waitForDisplayed({ reverse: true });
  }

  async assertSeeInputMaxLengthError(shouldBeDisplayed: boolean, maxLength: number) {
    await NftCreateFolderPage.folderNameInput.inputError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      const expectedErrorMessage = (await t('browserView.nfts.folderDrawer.nameForm.inputError')).replace(
        '{{length}}',
        maxLength.toString()
      );
      expect(await NftCreateFolderPage.folderNameInput.inputError.getText()).to.equal(expectedErrorMessage);
    }
  }

  async assertSeeGivenNameAlreadyExistsError(shouldBeDisplayed: boolean) {
    await NftCreateFolderPage.folderNameInput.inputError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await NftCreateFolderPage.folderNameInput.inputError.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.givenNameAlreadyExist')
      );
    }
  }

  async assertSeeYoullHaveToStartAgainModal(shouldBeDisplayed: boolean) {
    await YoullHaveToStartAgainModal.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await YoullHaveToStartAgainModal.title.waitForDisplayed();
      expect(await YoullHaveToStartAgainModal.title.getText()).to.equal(await t('browserView.nfts.exitModal.header'));

      await YoullHaveToStartAgainModal.description.waitForDisplayed();
      expect(await YoullHaveToStartAgainModal.description.getText()).to.equal(
        await t('browserView.nfts.exitModal.description')
      );

      await YoullHaveToStartAgainModal.cancelButton.waitForDisplayed();
      expect(await YoullHaveToStartAgainModal.cancelButton.getText()).to.equal(
        await t('browserView.nfts.exitModal.cancel')
      );

      await YoullHaveToStartAgainModal.agreeButton.waitForDisplayed();
      expect(await YoullHaveToStartAgainModal.agreeButton.getText()).to.equal(
        await t('browserView.nfts.exitModal.confirm')
      );
    }
  }

  async assertNoResultsReturned() {
    await NftSelectNftsPage.sadFaceIcon.waitForDisplayed();
    await NftSelectNftsPage.noResultsMessage.waitForDisplayed();
    expect(await NftSelectNftsPage.noResultsMessage.getText()).to.equal(
      await t('core.assetSelectorOverlay.noMatchingResult')
    );
  }

  async assertIsNFTSelected(nftName: string, shouldBeSelected: boolean) {
    const nft = await NftSelectNftsPage.getNftByName(nftName);
    const nftWithCheckmark = await nft.$(NftSelectNftsPage.NFT_ITEM_SELECTED_CHECKMARK);
    await nftWithCheckmark.waitForDisplayed({ reverse: !shouldBeSelected });
  }

  async assertSeeFolderOnNftsList(folderName: string, shouldSee: boolean) {
    const nftFolder = await NftsPage.getFolder(folderName);
    if (shouldSee) {
      await nftFolder.waitForDisplayed();
    } else {
      expect(nftFolder).to.be.undefined;
    }
  }

  async waitUntilNftCounterOnFolderPageMatchesNumberOfNfts() {
    await browser.waitUntil(
      async () => (await NftsFolderPage.nftCounter.getText()).slice(1, -1) === String(await NftsFolderPage.nfts.length),
      {
        timeout: 3000,
        timeoutMsg: 'failed while waiting for NFT counter value matching NFTs count'
      }
    );
  }

  async verifyNftItemOnFolderPage(nftItem: WebdriverIO.Element) {
    await nftItem.waitForDisplayed();
    await nftItem.$(NftsFolderPage.NFT_IMAGE).waitForDisplayed();
    await nftItem.$(NftsFolderPage.NFT_NAME).waitForDisplayed();
  }

  async assertSeeNftItemOnFolderPage(nftName: string, shouldSee: boolean) {
    const nft = await NftsFolderPage.getNft(nftName);
    if (shouldSee) {
      await this.verifyNftItemOnFolderPage(nft);
    } else {
      expect(nft).to.be.undefined;
    }
  }

  async assertSeeNftItemWithCustomImg() {
    const nft = await NftsFolderPage.getNft(Asset.ADA_HANDLE_3.name);
    await this.verifyNftItemOnFolderPage(nft);
    await adaHandleAssert.assertSeeCustomImage(await nft.$(NftsFolderPage.NFT_IMAGE));
  }

  async assertSeeFolderPage(folderName: string, mode: 'extended' | 'popup') {
    await this.assertSeeDrawerNavigation(mode, 'browserView.nfts.folderDrawer.existingFolderHeader');

    await NftsFolderPage.title.waitForDisplayed();
    await NftsFolderPage.title.waitForStable();
    expect(await NftsFolderPage.title.getText()).to.equal(folderName);

    await NftsFolderPage.nftCounter.waitForDisplayed();
    await this.waitUntilNftCounterOnFolderPageMatchesNumberOfNfts();

    await NftsFolderPage.addNftButton.waitForDisplayed();
    expect(await NftsFolderPage.nfts.length).to.be.greaterThanOrEqual(1);

    for (const nftItem of await NftsFolderPage.nfts) {
      await this.verifyNftItemOnFolderPage(nftItem);
    }
  }
}

export default new NftCreateFolderAssert();
