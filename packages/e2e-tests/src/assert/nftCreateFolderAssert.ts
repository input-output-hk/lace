import NftsPage from '../elements/NFTs/nftsPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import NftFolderNameInput from '../elements/NFTs/nftFolderNameInput';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import { Asset } from '../data/Asset';
import testContext from '../utils/testContext';
import NftItem from '../elements/NFTs/nftItem';

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
      await NftCreateFolderPage.drawerBody.waitForDisplayed();
      await NftCreateFolderPage.drawerNavigationTitle.waitForDisplayed();
      await NftCreateFolderPage.drawerNavigationTitle.scrollIntoView();
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

      const ibileCoin = await NftSelectNftsPage.getNftByName(Asset.IBILECOIN.name);
      await ibileCoin.waitForDisplayed();
      const bisonCoin = await NftSelectNftsPage.getNftByName(Asset.BISON_COIN.name);
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
    const displayedNfts = await NftSelectNftsPage.getContainers();

    const displayedNftNames: string[] = [];
    for (const cont of displayedNfts) {
      displayedNftNames.push(await cont.getText());
    }

    expect(ownedNftNames).to.have.ordered.members(displayedNftNames);
  }

  async verifyNoneNftIsSelected() {
    await NftItem.selectedCheckmark.waitForDisplayed({ reverse: true });
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
}

export default new NftCreateFolderAssert();
