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
import React from 'react';
import { toUnit } from '../../../api/extension';

import AssetPopover from './assetPopover';
import { NumericFormat } from 'react-number-format';
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
}: {
  asset: AssetInput;
  onRemove;
  onInput;
}) => {
  const [width, setWidth] = React.useState(
    BigInt(asset.quantity) <= 1 ? 60 : 200,
  );
  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    const initialWidth = BigInt(asset.quantity) <= 1 ? 60 : 200;
    setWidth(initialWidth);
    if (BigInt(asset.quantity) == BigInt(1)) {
      setValue('1');
      onInput(1);
    } else {
      setValue(asset.input);
      onInput(asset.input);
    }
  }, [asset]);
  return (
    <Box m="0.5">
      <InputGroup size="sm">
        <InputLeftElement
          rounded="lg"
          children={
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
              <AssetPopover asset={asset}>
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
                >
                  <Image
                    width="full"
                    rounded="sm"
                    src={asset.image}
                    fallback={
                      !asset.image ? (
                        <Avatar size="xs" name={asset.name} />
                      ) : (
                        <Fallback name={asset.name} />
                      )
                    }
                  />
                </Button>
              </AssetPopover>
            </Box>
          }
        />
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
            onInput(formattedValue);
          }}
          isInvalid={
            asset.input &&
            (BigInt(toUnit(asset.input, asset.decimals)) >
              BigInt(asset.quantity) ||
              BigInt(toUnit(asset.input, asset.decimals)) <= 0)
          }
          customInput={Input}
        />
        <InputRightElement
          rounded="lg"
          children={
            <SmallCloseIcon cursor="pointer" onClick={() => onRemove()} />
          }
        />
      </InputGroup>
    </Box>
  );
};

const Fallback = ({ name }) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const isMounted = useIsMounted();
  React.useEffect(() => {
    setTimeout(() => isMounted.current && setTimedOut(true), 30000);
  }, []);
  if (timedOut) return <Avatar size="xs" name={name} />;
  return <SkeletonCircle size="5" />;
};

export default AssetBadge;
