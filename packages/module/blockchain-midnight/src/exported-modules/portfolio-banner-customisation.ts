import { createUICustomisation } from '@lace-lib/util-render';

import { PortfolioBanner } from '../components/PortfolioBanner';

import type { PortfolioBannerUICustomisation } from '@lace-contract/app';

const MIDNIGHT_BLOCKCHAIN_NAME = 'Midnight';

const portfolioBannerCustomisation =
  createUICustomisation<PortfolioBannerUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: (blockchainName?: string) =>
      blockchainName === MIDNIGHT_BLOCKCHAIN_NAME,
    PortfolioBanner,
  });

const loadPortfolioBannerCustomisation = () => portfolioBannerCustomisation;

export default loadPortfolioBannerCustomisation;
