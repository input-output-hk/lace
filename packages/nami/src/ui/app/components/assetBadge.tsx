/* eslint-disable @typescript-eslint/naming-convention */
import React, { useCallback } from 'react';

import { SmallCloseIcon } from '@chakra-ui/icons';
import {
  Avatar,
  Box,
  Button,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  SkeletonCircle,
} from '@chakra-ui/react';
import { NumericFormat } from 'react-number-format';

import { toUnit } from '../../../api/extension';

import AssetPopover from './assetPopover';

import type { AssetInput } from '../../../types/assets';

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
};

const AssetBadge = ({
  asset,
  onRemove,
  onInput,
}: Readonly<{
  asset: AssetInput;
  onRemove: (asset: Readonly<AssetInput>) => void;
  onInput: (asset: Readonly<AssetInput>, input: number | string) => void;
}>) => {
  const [width, setWidth] = React.useState(
    BigInt(asset.quantity) <= 1 ? 60 : 200,
  );
  const [isPopoveVisible, setIsPopoverVisible] = React.useState(false);
  const [value, setValue] = React.useState('');

  const onPopoverClose = useCallback(() => {
    setIsPopoverVisible(false);
  }, [setIsPopoverVisible]);

  React.useEffect(() => {
    const initialWidth = BigInt(asset.quantity) <= 1 ? 60 : 200;
    setWidth(initialWidth);
    if (BigInt(asset.quantity) == BigInt(1)) {
      setValue('1');
      onInput(asset, 1);
    } else {
      setValue(asset.input);
      onInput(asset, asset.input);
    }
  }, [asset]);
  return (
    <Box m="0.5">
      <InputGroup size="sm">
        <InputLeftElement rounded="lg">
          <Box
            userSelect="none"
            width="6"
            height="6"
            rounded="full"
            overflow="hidden"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <AssetPopover
              isOpen={isPopoveVisible}
              onClose={onPopoverClose}
              asset={asset}
            >
              <Button
                style={{
                  all: 'revert',
                  margin: 0,
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => {
                  setIsPopoverVisible(!isPopoveVisible);
                }}
              >
                <Image
                  width="full"
                  rounded="sm"
                  src={asset.image}
                  fallback={
                    asset.image ? (
                      <Fallback name={asset.name} />
                    ) : (
                      <Avatar size="xs" name={asset.name} />
                    )
                  }
                />
              </Button>
            </AssetPopover>
          </Box>
        </InputLeftElement>
        <NumericFormat
          allowNegative={false}
          px="8"
          thousandsGroupStyle="thousand"
          decimalSeparator="."
          displayType="input"
          type="text"
          thousandSeparator={true}
          decimalScale={asset.decimals}
          width={`${width}px`}
          maxWidth="152px"
          isReadOnly={BigInt(asset.quantity) <= 1}
          value={value}
          rounded="xl"
          variant="filled"
          fontSize="xs"
          placeholder="Set quantity"
          onValueChange={({ formattedValue }) => {
            setValue(formattedValue);
            onInput(asset, formattedValue);
          }}
          isInvalid={
            asset.input &&
            (BigInt(toUnit(asset.input, asset.decimals)) >
              BigInt(asset.quantity) ||
              BigInt(toUnit(asset.input, asset.decimals)) <= 0)
          }
          customInput={Input}
        />
        <InputRightElement rounded="lg">
          <SmallCloseIcon
            cursor="pointer"
            onClick={() => {
              onRemove(asset);
            }}
          />
        </InputRightElement>
      </InputGroup>
    </Box>
  );
};

const Fallback = ({ name }: Readonly<{ name?: string }>) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const isMounted = useIsMounted();
  React.useEffect(() => {
    setTimeout(() => {
      isMounted.current && setTimedOut(true);
    }, 30_000);
  }, []);
  if (timedOut) return <Avatar size="xs" name={name} />;
  return <SkeletonCircle size="5" />;
};

export default AssetBadge;
