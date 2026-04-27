import { SheetRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback } from 'react';

import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { QrScannerSheetProps } from '@lace-lib/ui-toolkit';

export const useQrScanner = (
  _props: SheetScreenProps<SheetRoutes.QrScanner>,
) => {
  const { theme } = useTheme();
  const { navigate } = useSendFlowNavigation();

  const handleScan = useCallback(
    (data: string) => {
      // Navigate back to send flow with the scanned address
      navigate(SheetRoutes.Send, {
        recipientAddress: data,
      });
    },
    [navigate],
  );

  const handleClose = useCallback(() => {
    // Navigate back to send flow without updating the address
    navigate(SheetRoutes.Send);
  }, [navigate]);

  const validateScan = useCallback((data: string): boolean => {
    // Basic validation: check if the data is a non-empty string
    return Boolean(data && data.trim().length > 0);
  }, []);

  const qrScannerProps: QrScannerSheetProps = {
    onScan: handleScan,
    onClose: handleClose,
    validateScan,
    theme,
  };

  return { qrScannerProps };
};
