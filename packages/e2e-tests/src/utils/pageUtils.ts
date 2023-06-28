import ExtendedView from '../page/extendedView';
import PopupView from '../page/popupView';

const visitPageInExtendedMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address book'
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
    case 'Address book':
      await ExtendedView.visitAddressBook();
  }
};

const visitPageInPopupMode = async (page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address book') => {
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
  }
};

export const visit = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address book',
  mode: 'extended' | 'popup'
): Promise<void> => {
  await (mode === 'extended' ? visitPageInExtendedMode(page) : visitPageInPopupMode(page));
};
