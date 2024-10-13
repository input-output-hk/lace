import React from 'react';

import { Button, Text } from '@chakra-ui/react';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
}

const LaceSecondaryButton = ({ children, onClick }: Readonly<Props>) => {
  return (
    <Button
      backgroundColor="gray.100"
      _hover={{ backgroundColor: 'gray.200' }}
      paddingY="8px"
      paddingX="24px"
      height="48px"
      borderRadius="16px"
      onClick={onClick}
    >
      <Text color="gray.600" fontWeight="medium">
        {children}
      </Text>
    </Button>
  );
};

export default LaceSecondaryButton;
