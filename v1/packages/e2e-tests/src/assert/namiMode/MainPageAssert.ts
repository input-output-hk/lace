import { expect } from 'chai';
import MainPage from '../../elements/namiMode/MainPage';

class MainPageAssert {
  async assertSeeNamiModeContainer() {
    expect(await browser.getUrl()).to.equal('chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/popup.html');
    expect(await browser.getTitle()).to.equal('Lace');
    await MainPage.container.waitForDisplayed();
  }
}

export default new MainPageAssert();
