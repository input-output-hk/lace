/* eslint-disable unicorn/prefer-math-trunc */
/* eslint-disable unicorn/prefer-code-point */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';

import { StarIcon } from '@chakra-ui/icons';
import { Box, Stack, Text, MenuItem } from '@chakra-ui/react';

import AvatarLoader from '../components/avatarLoader';
import UnitDisplay from '../components/unitDisplay';

import type { CommonOutsideHandlesContextValue } from '../../../features/common-outside-handles-provider';

type Props = Pick<CommonOutsideHandlesContextValue, 'cardanoCoin'> & {
  onClick?: () => void;
  avatar?: string;
  name: string;
  index: string;
  balance?: string;
  isActive?: boolean;
  isHW?: boolean;
};

const hashCode = (s: string): number => {
  let h;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};

const UserInfo = ({
  onClick,
  avatar,
  name,
  balance,
  isActive,
  isHW,
  cardanoCoin,
  index,
}: Readonly<Props>) => {
  return (
    <MenuItem index={index || 22} position="relative" onClick={onClick}>
      <Stack direction="row" alignItems="center" width="full">
        <Box
          width={'30px'}
          height={'30px'}
          mr="12px"
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
        >
          <AvatarLoader
            avatar={avatar || hashCode(index).toString()}
            width={'30px'}
          />
        </Box>

        <Box display="flex" alignItems="center" width="full">
          <Box display="flex" flexDirection="column">
            <Box height="1.5" />
            <Text
              mb="-1"
              fontWeight="bold"
              fontSize="14px"
              isTruncated={true}
              maxWidth="210px"
            >
              {name}
            </Text>
            {balance ? (
              <UnitDisplay
                quantity={balance}
                decimals={6}
                symbol={cardanoCoin.symbol}
              />
            ) : (
              <Text>Select to load...</Text>
            )}
          </Box>
          {isActive && (
            <>
              <Box width="4" />
              <StarIcon />
              <Box width="4" />
            </>
          )}
          {isHW && (
            <Box ml="auto" mr="2">
              HW
            </Box>
          )}
        </Box>
      </Stack>
    </MenuItem>
  );
};

export default UserInfo;
