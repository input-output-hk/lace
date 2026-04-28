import { openUrl } from '@lace-lib/ui-toolkit';
import { createUICustomisation } from '@lace-lib/util-render';

import type { ActivitiesItemUICustomisation } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { BitcoinAddressData } from '@lace-contract/bitcoin-context';
import type { AppConfig } from '@lace-contract/module';

const getExplorerUrl = ({
  config,
  address,
  activityId,
}: {
  config?: AppConfig;
  address: AnyAddress<BitcoinAddressData>;
  activityId: string;
}): string => {
  if (!config || !address?.data) return '';

  const base = config.bitcoinExplorerUrls?.[address.data.network];
  return base ? `${base}/tx/${encodeURIComponent(activityId)}` : '';
};

const activitiesListUiCustomisation = () =>
  createUICustomisation<ActivitiesItemUICustomisation<BitcoinAddressData>>({
    key: 'bitcoin',
    uiCustomisationSelector: ({ blockchainName }) =>
      blockchainName === 'Bitcoin',
    getExplorerUrl,
    onActivityClick: params => {
      const url = getExplorerUrl(params);

      if (url === '') {
        return;
      }

      void openUrl({
        url,
        // TODO: Maybe this hook should be optional?
        onError: _ => {
          // The error is thrown in the util file, do nothing here
        },
      });
    },
  }) as ActivitiesItemUICustomisation;

export default activitiesListUiCustomisation;
