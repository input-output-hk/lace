import '@testing-library/jest-dom';
import { getQRCodeOptions, qrCodeSize } from '../qrCodeHelpers';
import { ThemeInstance } from '@providers';

describe('Testing getQRCodeOptions', () => {
  test('should return proper config', async () => {
    const theme = {
      colors: {
        bg: { container: 'container' },
        text: { primary: 'primary' }
      }
    } as unknown as ThemeInstance;
    const size = 22;
    expect(getQRCodeOptions(theme)).toEqual({
      margin: 0,
      width: qrCodeSize,
      height: qrCodeSize,
      backgroundOptions: { color: theme.colors.bg.container },
      dotsOptions: { type: 'dots', color: theme.colors.text.primary },
      qrOptions: {
        errorCorrectionLevel: 'L'
      }
    });
    expect(getQRCodeOptions(theme, size)).toEqual({
      margin: 0,
      width: size,
      height: size,
      backgroundOptions: { color: theme.colors.bg.container },
      dotsOptions: { type: 'dots', color: theme.colors.text.primary },
      qrOptions: {
        errorCorrectionLevel: 'L'
      }
    });
  });
});
