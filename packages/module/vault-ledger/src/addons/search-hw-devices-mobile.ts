import { scanLedgerBleDevices } from '@lace-lib/util-hw/mobile';

import type { SearchHWDevices } from '@lace-lib/util-hw';

const loadSearchHwDevicesMobile = (): SearchHWDevices => () =>
  scanLedgerBleDevices();

export default loadSearchHwDevicesMobile;
