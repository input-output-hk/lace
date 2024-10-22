import React from 'react';

import { useColorModeValue } from '@chakra-ui/react';
import QRCodeStyling from 'qr-code-styling';

import Ada from '../../../assets/img/ada.png';

const qrCode = new QRCodeStyling({
  width: 150,
  height: 150,
  image: Ada,
  dotsOptions: {
    color: '#319795',
    type: 'dots',
  },
  cornersSquareOptions: { type: 'extra-rounded', color: '#DD6B20' },
  imageOptions: {
    crossOrigin: 'anonymous',
    margin: 8,
  },
});

const QrCode = ({ value }: Readonly<{ value?: string }>) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const bgColor = useColorModeValue('white', '#2D3748');
  const contentColor = useColorModeValue(
    { corner: '#DD6B20', dots: '#319795' },
    { corner: '#FBD38D', dots: '#81E6D9' },
  );

  React.useEffect(() => {
    ref.current && qrCode.append(ref.current);
  }, []);

  React.useEffect(() => {
    qrCode.update({
      data: value,
      backgroundOptions: {
        color: bgColor,
      },
      dotsOptions: {
        color: contentColor.dots,
      },
      cornersSquareOptions: { color: contentColor.corner },
    });
  }, [value, bgColor]);

  return <div ref={ref} />;
};

export default QrCode;
