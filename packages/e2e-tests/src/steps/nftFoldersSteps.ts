import { When } from '@wdio/cucumber-framework';
import { Given, Then } from '@cucumber/cucumber';
import NftsPage from '../elements/NFTs/nftsPage';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import NftSelectNftsPage from '../elements/NFTs/nftSelectNftsPage';
import ToastMessageAssert from '../assert/toastMessageAssert';
import { t } from '../utils/translationService';

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
  /^I (see|do not see) folder with name "([^"]*)" on the nfts list$/,
  async (shouldSee: 'see' | 'do not see', folderName: string) => {
    await nftCreateFolderAssert.assertSeeFolderOnNftsList(folderName, shouldSee === 'see');
  }
);

When(/^I click the NFT folder with name "([^"]*)"$/, async (folderName: string) => {
  await (await NftsPage.getFolder(folderName)).click();
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

Then(/^I see a toast with text: "Folder created successfully"$/, async () => {
  await ToastMessageAssert.assertSeeToastMessage(await t('browserView.nfts.folderDrawer.toast.create'), true);
});
