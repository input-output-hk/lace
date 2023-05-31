import CommonOnboardingElements from './commonOnboardingElements';

class RecoveryPhraseLengthPage extends CommonOnboardingElements {
  private RADIO_BUTTON_12_WORDS = '//input[@data-testid="12-word-passphrase-radio-button"]';
  private RADIO_BUTTON_15_WORDS = '//input[@data-testid="15-word-passphrase-radio-button"]';
  private RADIO_BUTTON_24_WORDS = '//input[@data-testid="24-word-passphrase-radio-button"]';
  private RADIO_BUTTON_12_WORDS_LABEL = '//input[@data-testid="12-word-passphrase-radio-button"]/../..';
  private RADIO_BUTTON_15_WORDS_LABEL = '//input[@data-testid="15-word-passphrase-radio-button"]/../..';
  private RADIO_BUTTON_24_WORDS_LABEL = '//input[@data-testid="24-word-passphrase-radio-button"]/../..';

  get radioButton12wordsButton() {
    return $(this.RADIO_BUTTON_12_WORDS);
  }
  get radioButton15wordsButton() {
    return $(this.RADIO_BUTTON_15_WORDS);
  }
  get radioButton24wordsButton() {
    return $(this.RADIO_BUTTON_24_WORDS);
  }
  get radioButton12wordsButtonLabel() {
    return $(this.RADIO_BUTTON_12_WORDS_LABEL);
  }
  get radioButton15wordsButtonLabel() {
    return $(this.RADIO_BUTTON_15_WORDS_LABEL);
  }
  get radioButton24wordsButtonLabel() {
    return $(this.RADIO_BUTTON_24_WORDS_LABEL);
  }
}

export default new RecoveryPhraseLengthPage();
