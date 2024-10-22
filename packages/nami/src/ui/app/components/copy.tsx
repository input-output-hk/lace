/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';

import { Box, Tooltip } from '@chakra-ui/react';

interface Props {
  label?: React.ReactNode;
  copy: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const Copy = ({ label, copy, onClick, ...props }: Readonly<Props>) => {
  const [copied, setCopied] = React.useState(false);
  return (
    <Tooltip isOpen={copied} label={label}>
      <Box
        cursor="pointer"
        onClick={() => {
          if (onClick) onClick();
          navigator.clipboard.writeText(copy);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 800);
        }}
      >
        {props.children}
      </Box>
    </Tooltip>
  );
};

export default Copy;
