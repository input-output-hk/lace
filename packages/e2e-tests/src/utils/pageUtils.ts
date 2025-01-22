import ExtendedView from '../page/extendedView';
import PopupView from '../page/popupView';
import { browser } from '@wdio/globals';
import MenuMainExtended from '../elements/menuMainExtended';
import MenuHeader from '../elements/menuHeader';
import MenuMainPopup from '../elements/menuMainPopup';

// eslint-disable-next-line complexity
const visitPageInExtendedMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApp Explorer',
  viaURL = false
) => {
  switch (page) {
    case 'Tokens':
      viaURL ? await ExtendedView.visitTokensPage() : await MenuMainExtended.clickOnTokensButton();
      break;
    case 'NFTs':
      viaURL ? await ExtendedView.visitNFTsPage() : await MenuMainExtended.clickOnNFTsButton();
      break;
    case 'Activity':
      viaURL ? await ExtendedView.visitActivityPage() : await MenuMainExtended.clickOnActivityButton();
      break;
    case 'Staking':
      viaURL ? await ExtendedView.visitStakingPage() : await MenuMainExtended.clickOnStakingButton();
      break;
    case 'Settings':
      viaURL ? await ExtendedView.visitSettings() : await MenuHeader.openSettings();
      break;
    case 'Address Book':
      viaURL ? await ExtendedView.visitAddressBook() : await MenuHeader.openAddressBook();
      break;
    case 'DApp Explorer':
      viaURL ? await ExtendedView.visitDAppExplorer() : await MenuMainExtended.clickOnDAppExplorerButton();
      break;
    default:
      throw new Error(`Unsupported targetPage: ${page}`);
  }
};

// eslint-disable-next-line complexity
const visitPageInPopupMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApp Explorer',
  viaURL = false
) => {
  switch (page) {
    case 'Tokens':
      viaURL ? await PopupView.visitTokensPage() : await MenuMainPopup.clickOnTokensButton();
      break;
    case 'NFTs':
      viaURL ? await PopupView.visitNFTsPage() : await MenuMainPopup.clickOnNFTsButton();
      break;
    case 'Activity':
      viaURL ? await PopupView.visitActivityPage() : await MenuMainPopup.clickOnActivityButton();
      break;
    case 'Staking':
      viaURL ? await PopupView.visitStakingPage() : await MenuMainPopup.clickOnStakingButton();
      break;
    case 'Settings':
      viaURL ? await PopupView.visitSettings() : await MenuHeader.openSettings();
      break;
    case 'Address Book':
      viaURL ? await PopupView.visitAddressBook() : await MenuHeader.openAddressBook();
      break;
    case 'DApp Explorer':
      viaURL ? await PopupView.visitDAppExplorer() : await MenuMainPopup.clickOnDAppExplorerButton();
      break;
    default:
      throw new Error(`Unsupported targetPage: ${page}`);
  }
};

export const visit = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApp Explorer',
  mode: 'extended' | 'popup',
  viaURL = false
): Promise<void> => {
  await (mode === 'extended' ? visitPageInExtendedMode(page, viaURL) : visitPageInPopupMode(page, viaURL));
};

export const isPopupMode = async (): Promise<boolean> => (await browser.getUrl()).includes('popup.html');
