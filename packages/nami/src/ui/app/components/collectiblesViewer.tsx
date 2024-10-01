import {
  Box,
  SimpleGrid,
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
  useDisclosure,
  Modal,
  ModalContent,
  ModalBody,
  Avatar,
  Image,
  useColorModeValue,
  Button,
} from '@chakra-ui/react';
import { SearchIcon, SmallCloseIcon } from '@chakra-ui/icons';
import React, { useRef } from 'react';
import { Planet } from 'react-kawaii';
import Collectible from './collectible';
import { LazyLoadComponent } from 'react-lazy-load-image-component';
import './styles.css';
import Copy from './copy';
import { useHistory } from 'react-router-dom';
import { BsArrowUpRight } from 'react-icons/bs';
import { useStoreActions, useStoreState } from '../../store';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { Events } from '../../../features/analytics/events';
import { Asset } from '../../../types/assets';
import { searchTokens } from '../../../adapters/assets';

interface Props {
  assets: Asset[];
  setAvatar: (image: string) => void;
}

const CollectiblesViewer = ({ assets, setAvatar }: Readonly<Props>) => {
  const [assetsArray, setAssetsArray] = React.useState<Asset[] | null>(null);
  const [search, setSearch] = React.useState('');
  const [total, setTotal] = React.useState(0);
  const ref = useRef();
  const capture = useCaptureEvent();

  const createArray = async () => {
    if (!assets) {
      setAssetsArray(null);
      setSearch('');
      return;
    }
    setAssetsArray(null);
    await new Promise((res, rej) => setTimeout(() => res(), 10));
    const filteredAssets = searchTokens(assets, search);
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

  const avatarHandler = async (avatar: string) => {
    setAvatar(avatar);
    await capture(Events.SettingsChangeAvatarClick);
  };

  return (
    <>
      <Box position="relative" zIndex="0" lineHeight={'5'}>
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
              No Collectibles
            </Text>
          </Box>
        ) : (
          <>
            <Box textAlign="center" fontSize="sm" opacity={0.4}>
              {total} {total == 1 ? 'Collectible' : 'Collectibles'}
            </Box>
            <Box h="5" />
            <AssetsGrid assets={assetsArray} ref={ref} />
          </>
        )}
      </Box>
      <Box position="absolute" left="6" top="0">
        <Search setSearch={setSearch} assets={assets} />
      </Box>
      <CollectibleModal ref={ref} onUpdateAvatar={avatarHandler} />
    </>
  );
};

export const CollectibleModal = React.forwardRef(({ onUpdateAvatar }, ref) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [asset, setAsset] = React.useState(null);
  const [fallback, setFallback] = React.useState(false); // remove short flickering where image is not instantly loaded
  const background = useColorModeValue('white', 'gray.800');
  const dividerColor = useColorModeValue('gray.200', 'gray.700');
  const [value, setValue] = [
    useStoreState(state => state.globalModel.sendStore.value),
    useStoreActions(actions => actions.globalModel.sendStore.setValue),
  ];
  const history = useHistory();
  const navigate = history.push;
  const timer = React.useRef();

  React.useImperativeHandle(ref, () => ({
    openModal(asset) {
      setAsset(asset);
      timer.current = setTimeout(() => setFallback(true));
      onOpen();
    },
    closeModal() {
      clearTimeout(timer.current);
      setFallback(false);
      onClose();
    },
  }));
  return (
    <Modal
      finalFocusRef={document.body}
      isOpen={isOpen}
      onClose={onClose}
      size="full"
    >
      {asset && (
        <ModalContent
          background={background}
          onClick={ref.current.closeModal}
          m={0}
          rounded="none"
        >
          <ModalBody
            display="flex"
            alignItems="center"
            flexDirection="column"
            mb={6}
            lineHeight={'5'}
          >
            <Box h={8} />
            {asset.image ? (
              <Image
                src={asset.image}
                height="260px"
                width="full"
                objectFit="contain"
                fallback={
                  fallback && (
                    <Avatar
                      rounded="lg"
                      width="full"
                      height="260px"
                      name={asset.name}
                    />
                  )
                }
              />
            ) : (
              <Avatar
                rounded="lg"
                width="full"
                height="260px"
                name={asset.name}
              />
            )}
            <Box h={6} />
            <Box
              textAlign="center"
              className="lineClamp"
              overflow="hidden"
              fontSize={14}
              fontWeight="bold"
              width="75%"
            >
              {asset.name}
            </Box>
            <Box w="90%" h="1px" background={dividerColor} mt={6} mb={4} />
            <Box position="relative" width="full" textAlign="center">
              <Button
                position="absolute"
                right="16px"
                top="22px"
                size="xs"
                onClick={async () => {
                  await onUpdateAvatar(asset.image);
                }}
              >
                As Avatar
              </Button>
              <Button
                colorScheme={'orange'}
                position="absolute"
                right="16px"
                top="-10px"
                size="xs"
                rightIcon={<BsArrowUpRight />}
                onClick={e => {
                  setValue({ ...value, assets: [asset] });
                  navigate('/send');
                }}
              >
                Send
              </Button>
              <Text fontWeight="medium" fontSize={14}>
                x {asset.quantity}
              </Text>
            </Box>
            <Box h={10} />
            <Box px={10} display="flex" width="full" wordBreak="break-all">
              <Box width="140px" fontWeight="bold" fontSize={14}>
                Policy
              </Box>

              <Box width="340px" onClick={e => e.stopPropagation()}>
                <Copy label="Copied policy" copy={asset.policy}>
                  {asset.policy}{' '}
                </Copy>
              </Box>
            </Box>
            <Box h={6} />
            <Box px={10} display="flex" width="full" wordBreak="break-all">
              <Box width="140px" fontWeight="bold" fontSize={14}>
                Asset
              </Box>

              <Box width="340px" onClick={e => e.stopPropagation()}>
                <Copy label="Copied asset" copy={asset.fingerprint}>
                  {asset.fingerprint}
                </Copy>
              </Box>
            </Box>
          </ModalBody>
        </ModalContent>
      )}
    </Modal>
  );
});

const AssetsGrid = React.forwardRef(({ assets }, ref) => {
  return (
    <Box
      width="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <SimpleGrid columns={2} spacing={4}>
        {assets.map((asset) => (
          <Box key={asset.name}>
            <LazyLoadComponent>
              <Collectible
                ref={ref}
                asset={asset}
                testId={`collectible-${asset.name}`}
              />
            </LazyLoadComponent>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
});

const Search = ({ setSearch, assets }) => {
  const [input, setInput] = React.useState('');
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
          aria-label="Search assets"
          rounded="md"
          variant="ghost"
          icon={<SearchIcon boxSize="4" />}
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
              focusBorderColor="teal.400"
              ref={ref}
              value={input}
              width={290}
              size="sm"
              // variant="filled"
              rounded="md"
              placeholder="Search policy, asset, name"
              fontSize="xs"
              onInput={e => {
                setInput(e.target.value);
              }}
              onKeyDown={e => {
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

export default CollectiblesViewer;
