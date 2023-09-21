import extensionUtils from '../utils/utils';

export class Asset {
  static assets: Asset[] = [];
  public static readonly CARDANO = new Asset('Cardano', extensionUtils.isMainnet() ? 'ADA' : 'tADA');
  public static readonly IBILECOIN = new Asset('Ibilecoin', 'BLC');
  public static readonly BISON_COIN = new Asset('Bison Coin', '');
  public static readonly LACE_COIN = new Asset('LaceCoin', 'LaceCoin1');
  public static readonly LACE_COIN_2 = new Asset('LaceCoin2', 'LaceCoin2');
  public static readonly THOSKY = new Asset('tHOSKY', 'tHOSKY');
  public static readonly HAPPY_COIN = new Asset('HappyCoin', 'HAPP');
  public static readonly SUNDAE = new Asset('SUNDAE', 'SUNDAE');
  public static readonly HOSKY_TOKEN = new Asset('HOSKY Token', 'HOSKY');
  public static readonly ADA_HANDLE_1 = new Asset('$cde', '$cde');
  public static readonly ADA_HANDLE_2 = new Asset('$t_h_1', '$t_h_1');
  public static readonly ADA_HANDLE_3 = new Asset('$test_handle_1', '$test_handle_1');
  public static readonly ADA_HANDLE_4 = new Asset('$test_handle_2', '$test_handle_2');
  public static readonly ADA_HANDLE_5 = new Asset('$test_handle_3', '$test_handle_3');

  // eslint-disable-next-line no-unused-vars
  private constructor(public readonly name: string, public readonly ticker: string) {
    Asset.assets.push(this);
  }

  public static getByName(assetName: string): Asset | undefined {
    return Asset.assets.find((element) => element.name === assetName);
  }
}
