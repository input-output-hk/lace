import { QRCode } from '@lace/common';
import { ThemeInstance } from '@providers/ThemeProvider';

export const qrCodeSize = 164;
export const getQRCodeOptions = (
  theme: ThemeInstance,
  size?: number
): React.ComponentProps<typeof QRCode>['options'] => ({
  margin: 0,
  width: size || qrCodeSize,
  height: size || qrCodeSize,
  backgroundOptions: { color: theme.colors.bg.container },
  dotsOptions: { type: 'dots', color: theme.colors.text.primary },
  qrOptions: {
    errorCorrectionLevel: 'L' // this make more precise the qr size (docs https://www.npmjs.com/package/qr-code-styling)
  }
});
