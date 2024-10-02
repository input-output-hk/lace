import React from 'react';
import { Scrollbars } from '../components/scrollbar';
import {
  Avatar,
  Box,
  Stack,
  Button,
  Portal,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FixedSizeList as List } from 'react-window';
import Copy from './copy';

import MiddleEllipsis from 'react-middle-ellipsis';
import UnitDisplay from './unitDisplay';

const abs = big => {
  return big < 0 ? big * (-1) : big;
};

const CustomScrollbars = ({ onScroll, forwardedRef, style, children }) => {
  const refSetter = React.useCallback(scrollbarsRef => {
    if (scrollbarsRef) {
      forwardedRef(scrollbarsRef.view);
    }
  }, []);

  return (
    <Scrollbars
      ref={refSetter}
      style={{ ...style, overflow: 'hidden', marginRight: 4 }}
      onScroll={onScroll}
    >
      {children}
    </Scrollbars>
  );
};

const CustomScrollbarsVirtualList = React.forwardRef((props, ref) => (
  <CustomScrollbars {...props} forwardedRef={ref} />
));

const AssetsPopover = ({ assets, isDifference }) => {
  return (
    <Popover placement="top-start">
      <PopoverTrigger>
        <Button
          data-testid="asset-popover-trigger"
          size="xs"
          onClick={e => e.stopPropagation()}
          style={{
            all: 'revert',
            background: 'none',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: 'bold',
            display: 'inline-block',
            padding: '2px 4px',
          }}
          _hover={{ all: 'revert' }}
        >
          {assets.length} Asset
          {assets.length > 1 ? 's' : ''} <ChevronDownIcon cursor="pointer" />
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent onClick={e => e.stopPropagation()} w="98%">
          <PopoverArrow ml="4px" />
          <PopoverCloseButton />
          <PopoverHeader fontWeight="bold">Assets</PopoverHeader>
          <PopoverBody p="-2">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              my="1"
            >
              {assets && (
                <List
                  outerElementType={CustomScrollbarsVirtualList}
                  height={200}
                  itemCount={assets.length}
                  itemSize={45}
                  width={385}
                  layout="vertical"
                >
                  {({ index, style }) => {
                    const asset = assets[index];
                    return (
                      <Box
                        key={index}
                        style={style}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Asset asset={asset} isDifference={isDifference} />
                      </Box>
                    );
                  }}
                </List>
              )}
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

const Asset = ({ asset, isDifference }) => {
  return (
    <Box
      width="100%"
      ml="3"
      display="flex"
      alignItems="center"
      justifyContent="start"
    >
      {asset && (
        <Stack
          width="100%"
          fontSize="xs"
          direction="row"
          alignItems="center"
          justifyContent="start"
        >
          <Avatar userSelect="none" size="xs" name={asset.name} />

          <Box
            textAlign="left"
            width="180px"
            whiteSpace="nowrap"
            fontWeight="normal"
          >
            <Copy label="Copied asset" copy={asset.fingerprint}>
              <Box mb="-0.5">
                <MiddleEllipsis>
                  <span>{asset.name}</span>
                </MiddleEllipsis>
              </Box>
              <Box whiteSpace="nowrap" fontSize="xx-small" fontWeight="light">
                <MiddleEllipsis>
                  <span>Policy: {asset.policy}</span>
                </MiddleEllipsis>
              </Box>
            </Copy>
          </Box>
          <Box>
            <Box
              fontWeight="bold"
              color={
                isDifference
                  ? asset.quantity <= 0
                    ? 'red.300'
                    : 'teal.500'
                  : 'inherit'
              }
            >
              <Box display="flex" alignItems="center">
                <Box mr="0.5">
                  {isDifference ? (asset.quantity <= 0 ? '-' : '+') : '+'}{' '}
                </Box>
                <UnitDisplay
                  quantity={abs(asset.quantity).toString()}
                  decimals={asset.decimals}
                />
              </Box>
            </Box>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default AssetsPopover;
