import React, { useEffect, useRef, useMemo } from 'react';
import QRCodeStyling, { Options } from 'qr-code-styling';

export interface QRCodeProps {
  /** Data to display as QR code */
  data: string;
  /** Styling options. Merged with default options */
  options?: Options;
}

const defaultOptions: Options = {
  margin: 0,
  width: 164,
  height: 164,
  cornersDotOptions: {
    type: 'dot'
  },
  cornersSquareOptions: {
    type: 'extra-rounded'
  },
  dotsOptions: {
    color: '#3d3b39',
    type: 'dots'
  }
};

export const QRCode = ({ data, options }: QRCodeProps): React.ReactElement => {
  const qrCode = useMemo(() => new QRCodeStyling(defaultOptions), []);
  const ref = useRef(null);
  useEffect(() => {
    qrCode.append(ref.current ?? undefined);
  }, [qrCode]);

  useEffect(() => {
    qrCode.update({ ...defaultOptions, ...options, data });
  }, [data, options, qrCode]);

  return <div data-testid="qr-code" style={{ borderRadius: 12, overflow: 'hidden', display: 'flex' }} ref={ref} />;
};
