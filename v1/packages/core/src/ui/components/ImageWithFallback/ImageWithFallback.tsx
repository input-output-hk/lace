import React, { useState } from 'react';

export interface ImageWithFallbackProps
  extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  fallbackSrc: string;
}

export const ImageWithFallback = ({
  fallbackSrc,
  src: initialSrc,
  ...rest
}: ImageWithFallbackProps): React.ReactElement => {
  const [src, setSrc] = useState(initialSrc);

  return (
    <img
      src={src}
      {...rest}
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
};
