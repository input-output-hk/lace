import { After } from '@wdio/cucumber-framework';
import { switchToWindowWithLace } from '../utils/window';

After(
  { tags: '@DAppConnector or @DAppConnector-Extended or @DAppConnector-Popup' },
  async () => await switchToWindowWithLace()
);
