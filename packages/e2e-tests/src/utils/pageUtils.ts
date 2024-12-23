import ExtendedView from '../page/extendedView';
import PopupView from '../page/popupView';
import { browser } from '@wdio/globals';

const visitPageInExtendedMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book'
) => {
  switch (page) {
    case 'Tokens':
      await ExtendedView.visitTokensPage();
      break;
    case 'NFTs':
      await ExtendedView.visitNFTsPage();
      break;
    case 'Activity':
      await ExtendedView.visitActivityPage();
      break;
    case 'Staking':
      await ExtendedView.visitStakingPage();
      break;
    case 'Settings':
      await ExtendedView.visitSettings();
      break;
    case 'Address Book':
      await ExtendedView.visitAddressBook();
      break;
    default:
      throw new Error(`Unknown page: ${page}`);
  }
};

const visitPageInPopupMode = async (page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book') => {
  switch (page) {
    case 'Tokens':
      await PopupView.visitTokensPage();
      break;
    case 'NFTs':
      await PopupView.visitNFTsPage();
      break;
    case 'Activity':
      await PopupView.visitActivityPage();
      break;
    case 'Staking':
      await PopupView.visitStakingPage();
      break;
    case 'Settings':
      await PopupView.visitSettings();
      break;
    case 'Address Book':
      await PopupView.visitAddressBook();
      break;
    default:
      throw new Error(`Unknown page: ${page}`);
  }
};

export const visit = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book',
  mode: 'extended' | 'popup'
): Promise<void> => {
  await (mode === 'extended' ? visitPageInExtendedMode(page) : visitPageInPopupMode(page));
};

export const isPopupMode = async (): Promise<boolean> => (await browser.getUrl()).includes('popup.html');
