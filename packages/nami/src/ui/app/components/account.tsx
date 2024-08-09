import React from 'react';

import Logo from '../../../assets/img/logoWhite.svg';
import { Box, Text, Image, useColorModeValue } from '@chakra-ui/react';
import AvatarLoader from './avatarLoader';

const Account = ({ name, avatar }: { name: string; avatar?: string }) => {
  const avatarBg = useColorModeValue('white', 'gray.700');
  const panelBg = useColorModeValue('#349EA3', 'gray.800');

  return (
    <Box
      height="16"
      roundedBottom="3xl"
      background={panelBg}
      shadow="md"
      width="full"
      position="relative"
    >
      <Box
        zIndex="2"
        position="absolute"
        top="13px"
        left="6"
        width="10"
        height="10"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Image draggable={false} src={Logo} width="24px" />
      </Box>
      <Box
        zIndex="2"
        position="absolute"
        top="13px"
        right="6"
        rounded="full"
        background={avatarBg}
        width="10"
        height="10"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <AvatarLoader avatar={avatar} width="10" smallRobot />
      </Box>
      <Box
        zIndex="1"
        position="absolute"
        width="full"
        top="20px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontSize="lg" isTruncated={true} maxWidth="210px">
          {name}
        </Text>
      </Box>
    </Box>
  );
};

export default Account;
