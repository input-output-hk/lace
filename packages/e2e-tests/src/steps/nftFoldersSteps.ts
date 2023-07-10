import { When } from '@wdio/cucumber-framework';
import { Given, Then } from '@cucumber/cucumber';
import NftsPage from '../elements/NFTs/nftsPage';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';

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

When(/^I click "Next" button on "Name your folder" page$/, async () => {
  await NftCreateFolderPage.nextButton.click();
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
