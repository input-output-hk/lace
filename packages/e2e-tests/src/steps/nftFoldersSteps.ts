import { Given, Then, When } from '@wdio/cucumber-framework';
import NftsPage from '../elements/NFTs/nftsPage';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import ToastMessageAssert from '../assert/toastMessageAssert';
import { t } from '../utils/translationService';
import NftSelectNftsAssert from '../assert/nftSelectNftsAssert';
import IndexedDB from '../fixture/indexedDB';
import { NFTFolder } from '../data/NFTFolder';
import NftFolderAssert from '../assert/NftFolderAssert';
import NftFolderContextMenu from '../elements/NFTs/NftFolderContextMenu';
import NftRenameFolderAsserts from '../assert/NftRenameFolderAsserts';
import NftRenameFolderPage from '../elements/NFTs/NftRenameFolderPage';
import { browser } from '@wdio/globals';
import DeleteFolderModal from '../elements/NFTs/DeleteFolderModal';

Given(/^all NFT folders are removed$/, async () => {
  await IndexedDB.clearNFTFolders();
});

Then(/^the NFT folder with name "([^"]*)" and 1 NFT was created$/, async (folderName: string) => {
  const nftFolder = new NFTFolder(folderName, [
    '1065b4d177376927ca03922b2037bf382a6588c97c0eb6a3e358bab5426f726564415045' // Bored Ape NFT
  ]);
  await IndexedDB.insertNFTFolder(nftFolder);
  await browser.pause(500);
});

Given(
  /^I (see|do not see) "Create folder" button on NFTs page in (popup|extended) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderButton(shouldSee === 'see', mode);
  }
);

When(/^I click "Create folder" button on NFTs page$/, async () => {
  await NftsPage.createFolderButton.click();
});

Then(
  /^I (see|do not see) "Create NFT folder" page in (popup|extended) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderPage(shouldSee === 'see', mode);
  }
);

Then(
  /^I (see|do not see) "Select NFTs" page in (popup|extended) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeSelectNFTsPage(shouldSee === 'see', mode);
  }
);

Then(/^"Folder name" input is empty on "Name your folder" page$/, async () => {
  await nftCreateFolderAssert.assertSeeEmptyNameInput();
});

Then(
  /^"Next" button is (enabled|disabled) on "Name your folder" page$/,
  async (isButtonEnabled: 'enabled' | 'disabled') => {
    await nftCreateFolderAssert.assertSeeNextButtonEnabledOnCreateFolderPage(isButtonEnabled === 'enabled');
  }
);

Then(
  /^"Next" button is (enabled|disabled) on "Create folder" page$/,
  async (isButtonEnabled: 'enabled' | 'disabled') => {
    await nftCreateFolderAssert.assertSeeNextButtonEnabledOnSelectNftsPage(isButtonEnabled === 'enabled');
  }
);

When(/^I click "Next" button on "(Name your folder|Select NFTs)" page$/, async (targetPage: string) => {
  await (targetPage === 'Name your folder'
    ? NftCreateFolderPage.nextButton.click()
    : NftSelectNftsPage.nextButton.click());
});

Then(/^"Select NFTs" page is showing all NFTs that I have$/, async () => {
  await nftCreateFolderAssert.verifySeeAllOwnedNfts();
});

Then(/^No NFT is selected$/, async () => {
  await nftCreateFolderAssert.verifyNoneNftIsSelected();
});

When(/^I enter a folder name "([^"]*)" into "Folder name" input$/, async (folderName: string) => {
  await NftCreateFolderPage.setFolderNameInput(folderName);
});

When(/^I clear "Folder name" input$/, async () => {
  await NftCreateFolderPage.clearFolderNameInput();
});

Then(/^I (see|don't see) "Folder name" input max length (\d+) error$/, async (shouldSee: string, maxLength: number) => {
  await nftCreateFolderAssert.assertSeeInputMaxLengthError(shouldSee === 'see', maxLength);
});

Then(
  /^I (see|do not see) "Given name already exists" error on "Name your folder" page$/,
  async (shouldSee: 'see' | 'do not see') => {
    await nftCreateFolderAssert.assertSeeGivenNameAlreadyExistsError(shouldSee === 'see');
  }
);

Then(/^I (see|don't see) "You'll have to start again" modal$/, async (shouldSee: string) => {
  await nftCreateFolderAssert.assertSeeYoullHaveToStartAgainModal(shouldSee === 'see');
});

Then(
  /^I (see|don't see) "Create NFT folder" drawer in (popup|extended) mode$/,
  async (shouldSee: string, mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderPage(shouldSee === 'see', mode);
  }
);

Then(
  /^I click "(Agree|Cancel)" button on "You'll have to start again" modal for create NFTs folder$/,
  async (button: 'Agree' | 'Cancel') => {
    switch (button) {
      case 'Agree':
        await YoullHaveToStartAgainModal.agreeButton.waitForClickable();
        await YoullHaveToStartAgainModal.agreeButton.click();
        break;
      case 'Cancel':
        await YoullHaveToStartAgainModal.cancelButton.waitForClickable();
        await YoullHaveToStartAgainModal.cancelButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(/^I navigate to "Select NFTs" page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await mainMenuPageObject.navigateToSection('NFTs', mode);
  await NftsPage.createFolderButton.waitForClickable();
  await NftsPage.createFolderButton.click();
  await NftCreateFolderPage.setFolderNameInput('Sample NFT folder');
  await NftCreateFolderPage.nextButton.waitForClickable();
  await NftCreateFolderPage.nextButton.click();
});

When(/^I enter "([^"]*)" into the search bar on "Select NFTs" drawer$/, async (searchPhrase: string) => {
  await NftSelectNftsPage.enterSearchPhrase(searchPhrase);
});

Then(/^I see no results for "Select NFTs" drawer$/, async () => {
  await nftCreateFolderAssert.assertNoResultsReturned();
});

Then(/^I click NFT with name "([^"]*)"$/, async (nftName: string) => {
  const nft = await NftSelectNftsPage.getNftByName(nftName);
  await nft.waitForClickable();
  await nft.click();
});

Then(/^NFT with name "([^"]*)" (is|is not) selected$/, async (nftName: string, shouldBeSelected: 'is' | 'is not') => {
  await nftCreateFolderAssert.assertIsNFTSelected(nftName, shouldBeSelected === 'is');
});

Then(
  /^I (see|do not see) folder with name "([^"]*)" on the NFTs page$/,
  async (shouldSee: 'see' | 'do not see', folderName: string) => {
    await nftCreateFolderAssert.assertSeeFolderOnNftsList(folderName, shouldSee === 'see');
  }
);

When(
  /^I (left|right) click on the NFT folder with name "([^"]*)"$/,
  async (clickType: 'left' | 'right', folderName: string) => {
    await (await NftsPage.getFolder(folderName)).click({ button: clickType });
  }
);

When(
  /^I see "([^"]*)" NFT folder page in (extended|popup) mode$/,
  async (folderName: string, mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeFolderPage(folderName, mode);
  }
);

Then(
  /^I (see|do not see) NFT with name "([^"]*)" on the NFT folder page$/,
  async (shouldSee: 'see' | 'do not see', nftName: string) => {
    await nftCreateFolderAssert.assertSeeNftItemOnFolderPage(nftName, shouldSee === 'see');
  }
);

Then(
  /^I see a toast with text: "Folder (created|renamed|deleted) successfully"$/,
  async (action: 'created' | 'deleted' | 'renamed') => {
    let translationKey;
    switch (action) {
      case 'created':
        translationKey = 'browserView.nfts.folderDrawer.toast.create';
        break;
      case 'deleted':
        translationKey = 'browserView.nfts.deleteFolderSuccess';
        break;
      case 'renamed':
        translationKey = 'browserView.nfts.renameFolderSuccess';
        break;
      default:
        throw new Error(`Unsupported action name: ${action}`);
    }

    await ToastMessageAssert.assertSeeToastMessage(await t(translationKey), true);
  }
);

Then(/^I select (\d+) NFTs$/, async (numberOfNFTs: number) => {
  await NftSelectNftsPage.selectNFTs(numberOfNFTs);
});

Then(/^I see NFTs counter showing (\d+) selected NFTs$/, async (counter: number) => {
  await NftSelectNftsAssert.assertCounterNumber(counter);
});

Then(/^I (see|do not see) "Clear" button next to NFTs counter$/, async (shouldSee: string) => {
  await NftSelectNftsAssert.assertSeeClearButton(shouldSee === 'see');
});

Then(/^I (see|do not see) NFTs counter$/, async (shouldSee: string) => {
  await NftSelectNftsAssert.assertSeeCounter(shouldSee === 'see');
});

When(/^I click "Clear" button next to NFTs counter$/, async () => {
  await NftSelectNftsPage.clearButton.waitForClickable();
  await NftSelectNftsPage.clearButton.click();
});

When(/^I enter "([^"]*)" into the search bar$/, async (searchPhrase: string) => {
  await NftSelectNftsPage.enterSearchPhrase(searchPhrase);
});

Then(/^I see NFTs containing "([^"]*)" on the "Select NFTs" page$/, async (searchPhrase: string) => {
  await NftSelectNftsAssert.assertSeeNFTsWithSearchPhrase(searchPhrase);
});

Then(/^I press "Clear" button in search bar$/, async () => {
  await NftSelectNftsPage.clearSearchBarInput();
});

Then(
  /^NFT folder context menu with "Rename" & "Delete" options (is|is not) displayed$/,
  async (shouldBeDisplayed: 'is' | 'is not') => {
    await NftFolderAssert.assertSeeNftFolderContextMenu(shouldBeDisplayed === 'is');
  }
);

When(/^I click outside the NFT folder context menu$/, async () => {
  await NftsPage.title.click();
});

When(/^I click "(Delete|Rename)" option in NFT folder context menu$/, async (option: 'Delete' | 'Rename') => {
  switch (option) {
    case 'Delete':
      await NftFolderContextMenu.clickDeleteOption();
      break;
    case 'Rename':
      await NftFolderContextMenu.clickRenameOption();
      break;
    default:
      throw new Error(`Unsupported option name: ${option}`);
  }
});

Then(
  /^I (see|do not see) "Rename your folder" drawer in (extended|popup) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await NftRenameFolderAsserts.assertSeeRenameFolderDrawer(shouldSee === 'see', mode);
  }
);

Then(
  /^"Confirm" button is (enabled|disabled) on "Rename your folder" drawer$/,
  async (state: 'enabled' | 'disabled') => {
    await NftRenameFolderAsserts.assertSeeConfirmButtonEnabled(state === 'enabled');
  }
);

Then(/^"Folder name" input is filled with "([^"]*)"$/, async (folderName: string) => {
  await NftRenameFolderAsserts.assertSeeNameInputValue(folderName);
});

When(/^I click "(Cancel|Confirm)" button in "Rename your folder" drawer$/, async (button: 'Confirm' | 'Cancel') => {
  switch (button) {
    case 'Cancel':
      await NftRenameFolderPage.clickCancelButton();
      break;
    case 'Confirm':
      await NftRenameFolderPage.clickConfirmButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^I (see|do not see) delete folder modal$/, async (shouldSee: 'see' | 'do not see') => {
  await NftFolderAssert.assertSeeDeleteFolderModal(shouldSee === 'see');
});

When(/^I click "(Cancel|Confirm)" button in delete folder modal$/, async (button: 'Confirm' | 'Cancel') => {
  switch (button) {
    case 'Cancel':
      await DeleteFolderModal.clickCancelButton();
      break;
    case 'Confirm':
      await DeleteFolderModal.clickConfirmButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});
