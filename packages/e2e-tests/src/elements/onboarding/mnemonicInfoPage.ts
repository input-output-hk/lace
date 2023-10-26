import CommonOnboardingElements from './commonOnboardingElements';

class MnemonicInfoPage extends CommonOnboardingElements {
  private HERE_LINK = '[data-testid="faq-secret-passphrase-url"]';
  private MNEMONIC_VIDEO_FRAME = '[data-testid="mnemonic-intro-yt-video-frame"]';

  get hereLink() {
    return $(this.HERE_LINK);
  }

  get mnemonicVideoFrame() {
    return $(this.MNEMONIC_VIDEO_FRAME);
  }
}

export default new MnemonicInfoPage();
