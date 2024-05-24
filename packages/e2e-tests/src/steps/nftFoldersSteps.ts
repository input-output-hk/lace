import { Given, Then, When } from '@wdio/cucumber-framework';
import NftsPage from '../elements/NFTs/nftsPage';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import NftSelectNftsAssert from '../assert/nftSelectNftsAssert';
import IndexedDB from '../fixture/indexedDB';
import { NFTFolder } from '../data/NFTFolder';
import NftFolderAssert from '../assert/NftFolderAssert';
import NftFolderContextMenu from '../elements/NFTs/NftFolderContextMenu';
import NftRenameFolderAsserts from '../assert/NftRenameFolderAsserts';
import NftRenameFolderPage from '../elements/NFTs/NftRenameFolderPage';
import { browser } from '@wdio/globals';
import DeleteFolderModal from '../elements/NFTs/DeleteFolderModal';
import NftsFolderPage from '../elements/NFTs/nftsFolderPage';
import NftAssert from '../assert/nftAssert';
import testContext from '../utils/testContext';
import MenuHeader from '../elements/menuHeader';
import ToastMessage from '../elements/toastMessage';
import NftDetails from '../elements/NFTs/nftDetails';

Given(/^all NFT folders are removed$/, async () => {
  await IndexedDB.clearNFTFolders();
});

Then(
  /^the NFT folder with name "([^"]*)" and ([12]) NFT was created$/,
  async (folderName: string, numberOfAssets: string) => {
    const assets: string[] = [
      '63f01fe6cd68ec6438c95a46cea4a6cd27efb791b5e8cc1fa92af3294c6163654e46542336' // LaceNFT assetId
    ];

    if (numberOfAssets === '2') {
      assets.push('63f01fe6cd68ec6438c95a46cea4a6cd27efb791b5e8cc1fa92af3294962696c65636f696e3439'); // Ibilecoin
    }

    const nftFolder = new NFTFolder(folderName, assets);
    await IndexedDB.insertNFTFolder(nftFolder);
    await browser.pause(500);
  }
);

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
    ? NftCreateFolderPage.clickNextButton()
    : NftSelectNftsPage.clickNextButton());
});

When(/^I click "Add selected NFTs" button on "Select NFTs" page$/, async () => {
  await NftSelectNftsPage.clickNextButton();
});

Then(/^"Select NFTs" page is showing all NFTs that I have$/, async () => {
  await nftCreateFolderAssert.verifySeeAllOwnedNfts();
});

Then(/^I can see the handles listed on the "Select NFT" screen$/, async () => {
  await nftCreateFolderAssert.verifySeeAllAdaHandles();
});

Then(/^the corresponding custom images are displayed$/, async () => {
  await nftCreateFolderAssert.verifySeeAllAdaImages();
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
  /^I (see|do not see) "Given name already exists" error on "(Name your folder|Rename your folder)" page$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (shouldSee: 'see' | 'do not see', _ignored: string) => {
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
  await NftCreateFolderPage.clickNextButton();
});

When(/^I enter "([^"]*)" into the search bar on "Select NFTs" drawer$/, async (searchPhrase: string) => {
  await NftSelectNftsPage.enterSearchPhrase(searchPhrase);
});

Then(/^I see no results for "Select NFTs" drawer$/, async () => {
  await nftCreateFolderAssert.assertNoResultsReturned();
});

Then(/^I click NFT with name "([^"]*)"$/, async (nftName: string) => {
  await NftSelectNftsPage.waitForNft(nftName);
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

When(/^I click "Add NFT" button within the NFT folder$/, async () => {
  const addNFTButton = NftsFolderPage.addNftButton;
  await addNFTButton.waitForClickable();
  await addNFTButton.click();
});

Then(/^I can see "Add NFT" button active$/, async () => {
  await NftFolderAssert.assertSeeAddNftButton();
});

When(
  /^I (left|right) click on the NFT folder with name "([^"]*)"$/,
  async (clickType: 'left' | 'right', folderName: string) => {
    await (await NftsPage.getFolder(folderName)).click({ button: clickType });
  }
);

When(
  /^I (left|right) click on the NFT with name "([^"]*)" on the NFT folder page$/,
  async (clickType: 'left' | 'right', nftName: string) => {
    await (await NftsFolderPage.getNft(nftName)).click({ button: clickType });
  }
);

When(/^I (left|right) click on the add NFT button on the NFT folder page$/, async (clickType: 'left' | 'right') => {
  await (await NftsFolderPage.addNftButton).click({ button: clickType });
});

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

Then(/^NFT context menu with "Remove" option (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await NftFolderAssert.assertSeeNftContextMenu(shouldBeDisplayed === 'is');
});

When(/^I click outside the NFT folder context menu$/, async () => {
  await ((await NftFolderContextMenu.overlay.isDisplayed())
    ? NftFolderContextMenu.overlay.click()
    : NftsPage.title.click());
});

When(/^I click "(Delete|Rename)" option in NFT folder context menu$/, async (option: 'Delete' | 'Rename') => {
  switch (option) {
    case 'Delete':
      await NftFolderContextMenu.clickDeleteFolderOption();
      break;
    case 'Rename':
      await NftFolderContextMenu.clickRenameFolderOption();
      break;
    default:
      throw new Error(`Unsupported option name: ${option}`);
  }
});

When(/^I click "Remove from folder" option in NFT context menu$/, async () => {
  await NftFolderContextMenu.clickRemoveNFTOption();
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

When(/^I create folder with name: "([^"]*)" and first available NFT$/, async (folderName: string) => {
  await NftsPage.createFolderButton.click();
  await NftCreateFolderPage.setFolderNameInput(folderName);
  await NftCreateFolderPage.clickNextButton();
  await NftSelectNftsPage.selectNFTs(1);
  await NftSelectNftsPage.clickNextButton();
  await NftsPage.createFolderButton.waitForClickable();
  await nftCreateFolderAssert.assertSeeFolderOnNftsList(folderName, true);
});

When(
  /^I create folder with name: "([^"]*)" that contains (\d+) NFTs$/,
  async (folderName: string, numberOfNftsInFolder: number) => {
    await NftsPage.createFolderButton.click();
    await NftCreateFolderPage.setFolderNameInput(folderName);
    await NftCreateFolderPage.clickNextButton();
    await NftSelectNftsPage.selectNFTs(numberOfNftsInFolder);
    await NftSelectNftsPage.clickNextButton();
    await MenuHeader.menuButton.waitForClickable();
    await nftCreateFolderAssert.assertSeeFolderOnNftsList(folderName, true);
    testContext.save('numberOfNftsInFolder', numberOfNftsInFolder);
  }
);

When(/^I select (\d+) available NFTs$/, async (numberOfNftsWanted: number) => {
  await NftSelectNftsPage.selectNFTs(numberOfNftsWanted);
  await NftSelectNftsPage.clickNextButton();
});

When(
  /^I (add|remove) (\d+) NFT to or from the folder$/,
  async (action: 'add' | 'remove', numberOfNftsWanted: number) => {
    const numberOfNftsInFolder = Number(testContext.load('numberOfNftsInFolder'));
    switch (action) {
      case 'add':
        testContext.saveWithOverride('numberOfNftsInFolder', numberOfNftsInFolder + numberOfNftsWanted);
        await NftsFolderPage.clickAddNftButton();
        await NftSelectNftsPage.selectNFTs(numberOfNftsWanted);
        await ToastMessage.clickCloseButton();
        await NftSelectNftsPage.clickNextButton();
        break;
      case 'remove':
        testContext.saveWithOverride('numberOfNftsInFolder', numberOfNftsInFolder - numberOfNftsWanted);
        for (let i = 0; i < numberOfNftsWanted; i++) {
          await NftSelectNftsPage.nfts[0].waitForClickable();
          await NftSelectNftsPage.nfts[0].click({ button: 'right' });
          await NftFolderContextMenu.clickRemoveNFTOption();
        }
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
);

Then(
  /^Folder "([^"]*)" displays (\d+) NFT thumbnails$/,
  async (folderName: string, numberOfExpectedThumbnails: number) => {
    await NftAssert.assertNumberOfExpectedThumbnails(folderName, numberOfExpectedThumbnails);
  }
);

Then(
  /^There is a NFTs counter showing (\d+) of remaining NFTs in folder "([^"]*)"$/,
  async (expectedRemainingNumberOfNFTs: number, folderName: string) => {
    await NftAssert.assertRemainingNumberOfNFTs(expectedRemainingNumberOfNFTs, folderName);
  }
);

Then(/^I see folders on the NFTs page in the alphabetical order$/, async () => {
  await NftAssert.assertSeeFoldersInAlphabeticalOrder();
});

Then(
  /^I see a thumbnail of ADA handle with custom image on the NFT folder with name: "([^"]*)"$/,
  async (folderName: string) => {
    await NftAssert.assertSeeCustomAdaHandleThumbnail(folderName);
  }
);

Then(/^I see NFTs Folder value: "([^"]*)"$/, async (folderPath: string) => {
  const actualFolderPath = await NftDetails.getFolderValue();
  expect(actualFolderPath).toEqual(folderPath);
});
