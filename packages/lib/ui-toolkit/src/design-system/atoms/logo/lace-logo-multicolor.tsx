import { Image } from 'expo-image';
import React from 'react';

import { assets } from '../../assets';

interface LaceLogoMulticolorProps {
  size?: number;
}

export const LaceLogoMulticolor = ({ size = 32 }: LaceLogoMulticolorProps) => (
  <Image
    source={assets.laceLogoMulticolor}
    style={{ width: size, height: size }}
    contentFit="contain"
  />
);
