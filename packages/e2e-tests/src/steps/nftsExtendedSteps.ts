import { Given, Then, When } from '@cucumber/cucumber';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import nftAssert from '../assert/nftAssert';
import NftDetails from '../elements/NFTs/nftDetails';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import nftSelectNftsAssert from '../assert/nftSelectNftsAssert';
import { progressWithSendUntilPasswordPage } from '../helpers/NFTPageHelper';

Then(
  /^NFT with name: "([^"]*)" (is displayed|is not displayed) in coin selector$/,
  async (nftName: string, state: string) => {
    await nftAssert.assertNftDisplayedInCoinSelector(nftName, state === 'is displayed');
  }
);

Given(
  /^I am on a NFT details on the (extended|popup) view for NFT with name: "([^"]*)"$/,
  async (mode: 'extended' | 'popup', nftName: string) => {
    await nftAssert.assertSeeNftDetails(nftName, mode);
  }
);

When(
  /^I click "(Send NFT|Set as your wallet avatar)" button on NFT details drawer$/,
  async (button: 'Send NFT' | 'Set as your wallet avatar') => {
    if (button === 'Send NFT') {
      await NftDetails.sendNFTButton.waitForStable();
      await NftDetails.sendNFTButton.click();
    } else if (button === 'Set as your wallet avatar') {
      await NftDetails.setAsAvatarButton.waitForStable();
      await NftDetails.setAsAvatarButton.click();
    }
  }
);

Then(/^"Send NFT" button (is|is not) displayed on NFT details drawer$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await nftAssert.assertSeeSendNFTButton(shouldBeDisplayed === 'is');
});

Given(
  /^I'm sending the NFT with name: "([^"]*)" in (popup|extended) mode$/,
  async (nftName: string, mode: 'extended' | 'popup') => {
    await progressWithSendUntilPasswordPage(nftName, mode);
  }
);

Given(
  /^I'm sending the ADA handle with name: "([^"]*)" in (popup|extended) mode$/,
  async (nftName: string, mode: 'extended' | 'popup') => {
    await progressWithSendUntilPasswordPage(nftName, mode, false, true);
  }
);

Given(
  /^I'm sending the NFT with name: "([^"]*)" with HD wallet in (popup|extended) mode$/,
  async (nftName: string, mode: 'extended' | 'popup') => {
    await progressWithSendUntilPasswordPage(nftName, mode, true);
  }
);

Given(/^the NFT is pre-loaded as token to be sent with name: "([^"]*)"$/, async (nftName: string) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTitle(nftName);
});

Given(/^the amount in token input "([\d+])"$/, async (expectedCount: number) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTokenInputValue(expectedCount);
});

Given(
  /^I see ADA handle NFT with custom image on the (NFTs|NFT folder|Select NFT|Coin selector) page$/,
  async (page: string) => {
    switch (page) {
      case 'NFTs':
        await nftAssert.assertSeeCustomAdaHandleNft();
        break;
      case 'NFT folder':
        await nftCreateFolderAssert.assertSeeNftItemWithCustomImg();
        break;
      case 'Select NFT':
        await nftSelectNftsAssert.assertSeeNftItemWithCustomImg();
        break;
      case 'Coin selector':
        await nftAssert.assertSeeCustomAdaHandleInCoinSelector();
        break;
      default:
        throw new Error(`Unsupported page: ${page}`);
    }
  }
);

Then(
  /^I see ADA handle NFT details page with custom image in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await nftAssert.assertSeeCustomAdaHandleNftDetails(mode);
  }
);
