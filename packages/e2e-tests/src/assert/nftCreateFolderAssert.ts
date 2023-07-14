import NftsPage from '../elements/NFTs/nftsPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import NftFolderNameInput from '../elements/NFTs/nftFolderNameInput';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import { Asset } from '../data/Asset';
import testContext from '../utils/testContext';
import { TokenSelectionPage } from '../elements/newTransaction/tokenSelectionPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';

class NftCreateFolderAssert {
  async assertSeeCreateFolderButton(shouldSee: boolean, mode: 'extended' | 'popup') {
    await NftsPage.createFolderButton.waitForDisplayed({ reverse: !shouldSee });
    if (mode === 'extended' && shouldSee === true) {
      await expect(await NftsPage.createFolderButton.getText()).to.equal(await t('browserView.nfts.createFolder'));
    }
  }

  async assertSeeDrawerNavigation(mode: 'extended' | 'popup') {
    if (mode === 'popup') {
      await NftCreateFolderPage.drawerHeaderBackButton.waitForClickable();
    } else {
      await NftCreateFolderPage.drawerBody.waitForClickable();
      await NftCreateFolderPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await NftCreateFolderPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.header')
      );
      await NftCreateFolderPage.drawerHeaderCloseButton.waitForDisplayed();
    }
  }

  async assertSeeCreateFolderPage(shouldSee: boolean, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await this.assertSeeDrawerNavigation(mode);
      await NftCreateFolderPage.drawerHeaderTitle.waitForClickable();
      await expect(await NftCreateFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.title')
      );

      await NftCreateFolderPage.folderNameInput.input.waitForDisplayed();

      await NftCreateFolderPage.folderNameInput.inputLabel.waitForDisplayed();
      await expect(await NftCreateFolderPage.folderNameInput.inputLabel.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.nameForm.inputPlaceholder')
      );

      await NftCreateFolderPage.nextButton.waitForDisplayed();
      await expect(await NftCreateFolderPage.nextButton.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.cta.create')
      );
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed({ reverse: true });
    }
  }

  async assertSeeEmptyNameInput() {
    await expect(await NftFolderNameInput.input.getValue()).to.be.empty;
  }

  async assertSeeNextButtonEnabledOnCreateFolderPage(isEnabled: boolean) {
    await NftCreateFolderPage.nextButton.waitForEnabled({ reverse: !isEnabled });
  }

  async assertSeeNextButtonEnabledOnSelectNftsPage(isEnabled: boolean) {
    await NftSelectNftsPage.nextButton.waitForEnabled({ reverse: !isEnabled });
  }

  async assertSeeSelectNFTsPage(shouldSee: boolean, mode: 'extended' | 'popup') {
    if (shouldSee) {
      await this.assertSeeDrawerNavigation(mode);
      await NftCreateFolderPage.drawerHeaderTitle.waitForDisplayed();
      await expect(await NftCreateFolderPage.drawerHeaderTitle.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.assetPicker.title')
      );
      await NftSelectNftsPage.searchInput.container.waitForDisplayed();
      await expect(await NftSelectNftsPage.searchInput.input.getAttribute('placeholder')).to.equal(
        await t('cardano.stakePoolSearch.searchPlaceholder')
      );
      await NftSelectNftsPage.assetSelectorContainer.waitForDisplayed();
      const tokenSelectionPage = new TokenSelectionPage();

      const ibileCoin = await tokenSelectionPage.getNftContainer(Asset.IBILECOIN.name);
      await ibileCoin.waitForDisplayed();
      const bisonCoin = await tokenSelectionPage.getNftContainer(Asset.BISON_COIN.name);
      await bisonCoin.waitForDisplayed();

      await NftSelectNftsPage.nextButton.waitForDisplayed();
      await expect(await NftSelectNftsPage.nextButton.getText()).to.equal(
        await t('browserView.nfts.folderDrawer.cta.create')
      );
    } else {
      await NftCreateFolderPage.drawerBody.waitForDisplayed({ reverse: true });
    }
  }

  async verifySeeAllOwnedNfts() {
    const ownedNftNames = testContext.load('ownedNfts');
    const displayedNfts = await new TokenSelectionPage().nftContainers;

    const displayedNftNames: string[] = [];
    for (const nftContainer of displayedNfts) {
      displayedNftNames.push(await nftContainer.getText());
    }

    expect(ownedNftNames).to.have.ordered.members(displayedNftNames);
  }

  async verifyNoneNftIsSelected() {
    await new TokenSelectionPage().nftItemSelectedCheckmark.waitForDisplayed({ reverse: true });
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

  async assertSeeYoullHaveToStartAgainModal(shouldBeDisplayed: boolean) {
    await YoullHaveToStartAgainModal.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await YoullHaveToStartAgainModal.title.waitForDisplayed();
      await expect(await YoullHaveToStartAgainModal.title.getText()).to.equal(
        await t('browserView.nfts.exitModal.header')
      );

      await YoullHaveToStartAgainModal.description.waitForDisplayed();
      await expect(await YoullHaveToStartAgainModal.description.getText()).to.equal(
        await t('browserView.nfts.exitModal.description')
      );

      await YoullHaveToStartAgainModal.cancelButton.waitForDisplayed();
      await expect(await YoullHaveToStartAgainModal.cancelButton.getText()).to.equal(
        await t('browserView.nfts.exitModal.cancel')
      );

      await YoullHaveToStartAgainModal.agreeButton.waitForDisplayed();
      await expect(await YoullHaveToStartAgainModal.agreeButton.getText()).to.equal(
        await t('browserView.nfts.exitModal.confirm')
      );
    }
  }

  async assertNoResultsReturned() {
    await NftSelectNftsPage.sadFaceIcon.waitForDisplayed();
    await NftSelectNftsPage.noResultsMessage.waitForDisplayed();
    expect(await NftSelectNftsPage.noResultsMessage.getText()).to.equal(
      await t('package.core.assetSelectorOverlay.noMatchingResult')
    );
  }
}

export default new NftCreateFolderAssert();
