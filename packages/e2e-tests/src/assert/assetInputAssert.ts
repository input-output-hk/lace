import webTester from '../actor/webTester';
import { AssetInput } from '../elements/newTransaction/assetInput';

class AssetInputAssert {
  async assertSeeAssetInput() {
    const assetInput = new AssetInput();
    await webTester.seeWebElement(assetInput.container());
    await webTester.seeWebElement(assetInput.assetAddButton());
  }
}

export default new AssetInputAssert();
