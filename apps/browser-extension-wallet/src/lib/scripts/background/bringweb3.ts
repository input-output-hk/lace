import { bringInitBackground } from '@bringweb3/chrome-extension-kit';

const PLATFORM_IDENTIFIER = 'wb9lt1LcEK4ajWMgTrO1HaDUBZ0Pj0dzaLxF8hnu';

bringInitBackground({
  identifier: PLATFORM_IDENTIFIER, // The identifier key you obtained from Bringweb3
  apiEndpoint: 'sandbox', // 'sandbox' || 'prod'
  cashbackPagePath: '/cashback', // The relative path to your Cashback Dashboard if you have one inside your extension (should be using routes config)
  isEnabledByDefault: true
});
