import { After } from '@wdio/cucumber-framework';
import { switchToWindowWithLace } from '../utils/window';
import extendedView from '../page/extendedView';
import { browser } from '@wdio/globals';

After(
  { tags: '@DAppConnector or @DAppConnector-Extended or @DAppConnector-Popup' },
  async () => await switchToWindowWithLace()
);

After({ tags: '@LW-7125 or @LW-9335' }, async () => {
  await browser.reloadSession();
  await extendedView.visit();
});
