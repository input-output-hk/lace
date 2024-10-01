import {
  Box,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon, SmallCloseIcon } from '@chakra-ui/icons';
import React from 'react';
import Asset from './asset';
import { Planet } from 'react-kawaii';
import { LazyLoadComponent } from 'react-lazy-load-image-component';
import { useOutsideHandles } from '../../../features/outside-handles-provider';
import { searchTokens } from '../../../adapters/assets';
import { Asset as NamiAsset } from '../../../types/assets';

const AssetsViewer = ({ assets }) => {
  const totalColor = useColorModeValue(
    'rgb(26, 32, 44)',
    'rgba(255, 255, 255, 0.92)',
  );
  const [assetsArray, setAssetsArray] = React.useState<NamiAsset[] | null>(null);
  const [search, setSearch] = React.useState('');
  const [total, setTotal] = React.useState(0);
  const createArray = async () => {
    if (!assets) {
      setAssetsArray(null);
      setSearch('');
      return;
    }
    setAssetsArray(null);
    await new Promise((res, rej) => setTimeout(() => res(), 10));
    const filteredAssets = search ? searchTokens(assets, search) : assets;
    setTotal(filteredAssets.length);
    setAssetsArray(filteredAssets);
  };
  React.useEffect(() => {
    createArray();
  }, [assets, search]);

  React.useEffect(() => {
    return () => {
      setSearch('');
      setAssetsArray(null);
    };
  }, []);

  return (
    <>
      <Box position="relative" zIndex="0">
        {!(assets && assetsArray) ? (
          <Box
            mt="28"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="teal" speed="0.5s" />
          </Box>
        ) : assetsArray.length <= 0 ? (
          <Box
            mt="16"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            opacity="0.5"
          >
            <Planet size={80} mood="ko" color="#61DDBC" />
            <Box height="2" />
            <Text fontWeight="bold" color="GrayText">
              No Assets
            </Text>
          </Box>
        ) : (
          <>
            <Box
              color={totalColor}
              textAlign="center"
              fontSize="sm"
              opacity={0.4}
            >
              {total} {total == 1 ? 'Asset' : 'Assets'}
            </Box>
            <Box h="5" />

            <AssetsGrid assets={assetsArray} />
          </>
        )}
      </Box>
      <Box position="absolute" left="6" top="0">
        <Search setSearch={setSearch} assets={assets} />
      </Box>
    </>
  );
};

const AssetsGrid = ({ assets }) => {
  const { cardanoCoin } = useOutsideHandles();
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      {assets.map((asset, index) => (
        <Box key={index} width="full">
          <LazyLoadComponent>
            <Box
              width="full"
              mt={index > 0 && 4}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Asset cardanoCoin={cardanoCoin} asset={asset} enableSend />
            </Box>
          </LazyLoadComponent>
        </Box>
      ))}
    </Box>
  );
};

const Search = ({ setSearch, assets }) => {
  const [input, setInput] = React.useState('');
  const iconColor = useColorModeValue('gray.800', 'rgba(255, 255, 255, 0.92)');
  const ref = React.useRef();
  React.useEffect(() => {
    if (!assets) {
      setInput('');
    }
    if (input == '') setSearch('');
  }, [input, assets]);
  return (
    <Popover
      returnFocusOnClose={false}
      placement="bottom-start"
      onOpen={() => setTimeout(() => ref.current.focus())}
    >
      <PopoverTrigger>
        <IconButton
          data-testid="searchIcon"
          aria-label="Search assets"
          rounded="md"
          variant="ghost"
          icon={<SearchIcon color={iconColor} boxSize="4" />}
        />
      </PopoverTrigger>
      <PopoverContent w="100%">
        <PopoverArrow />
        <PopoverBody
          p="2"
          alignItems="center"
          justifyContent="center"
          display="flex"
          textAlign="center"
        >
          <InputGroup size="sm">
            <Input
              data-testid="searchInput"
              autoFocus
              focusBorderColor="teal.400"
              ref={ref}
              value={input}
              width={290}
              size="sm"
              // variant="filled"
              rounded="md"
              placeholder="Search policy, asset, name"
              fontSize="xs"
              onInput={(e) => {
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input) setSearch(input);
              }}
            />
            <InputRightElement
              children={
                <SmallCloseIcon cursor="pointer" onClick={() => setInput('')} />
              }
            />
          </InputGroup>
          <Box w="2" />
          <IconButton
            aria-label="Search assets"
            size="sm"
            rounded="md"
            color="teal.400"
            onClick={() => input && setSearch(input)}
            icon={<SearchIcon />}
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default AssetsViewer;
