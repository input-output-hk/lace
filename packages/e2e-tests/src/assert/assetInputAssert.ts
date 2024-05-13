import { AssetInput } from '../elements/newTransaction/assetInput';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class AssetInputAssert {
  async assertSeeAssetInput(index = 1) {
    const assetInput = new AssetInput(index);
    await assetInput.container.waitForDisplayed();
    await assetInput.assetAddButton.waitForStable();
    expect(await assetInput.assetAddButton.getText()).to.equal(await t('browserView.transaction.send.advanced.asset'));
  }
}

export default new AssetInputAssert();
