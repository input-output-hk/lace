import React from 'react';

import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import { useCommonOutsideHandles } from '../../../features/common-outside-handles-provider';
import { abs } from '../../utils';

import Asset from './asset';
import { Scrollbars } from './scrollbar';

import type { Asset as NamiAsset } from '../../../types/assets';

export interface AssetsModalRef {
  openModal: (data: Readonly<AssetsModalData>) => void;
}

interface AssetsModalData {
  title: React.ReactNode;
  assets: NamiAsset[];
  background?: string;
  color?: string;
  userInput?: boolean;
}

const AssetsModal = (_props, ref) => {
  const { cardanoCoin } = useCommonOutsideHandles();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [data, setData] = React.useState<AssetsModalData>({
    title: '',
    assets: [],
    background: '',
    color: 'inherit',
  });
  const background = useColorModeValue('white', 'gray.800');

  React.useImperativeHandle(ref, () => ({
    openModal: (data: Readonly<AssetsModalData>) => {
      const transformedAssets = data?.assets.map((a: Readonly<NamiAsset>) => ({
        ...a,
        quantity: abs(a.quantity).toString(),
      }));
      setData({ ...data, assets: transformedAssets });
      onOpen();
    },
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      blockScrollOnMount={false}
    >
      <ModalContent
        m={0}
        rounded="none"
        overflow={'hidden'}
        background={background}
      >
        <ModalBody p={0}>
          <Scrollbars style={{ width: '100%', height: '88vh' }} autoHide>
            <Box
              width={'full'}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              flexDirection={'column'}
            >
              <Box h={8} />
              <Box
                fontSize={'xl'}
                fontWeight={'bold'}
                maxWidth={'240px'}
                textAlign={'center'}
              >
                {data.title}
              </Box>
              <Box h={6} />
              {data.assets.map((asset, index) => (
                <Box key={index} width="full" px={4} my={2}>
                  <LazyLoadComponent>
                    <Box
                      width={'full'}
                      display={'flex'}
                      alignItems={'center'}
                      justifyContent={'center'}
                      key={index}
                    >
                      <Asset
                        cardanoCoin={cardanoCoin}
                        asset={asset}
                        background={data.background}
                        color={data.color}
                      />
                    </Box>
                  </LazyLoadComponent>
                </Box>
              ))}
              <Box
                position={'fixed'}
                bottom={0}
                width={'full'}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}
              >
                <Box
                  width={'full'}
                  height={'12vh'}
                  background={background}
                  display={'flex'}
                  alignItems={'center'}
                  justifyContent={'center'}
                >
                  <Button onClick={onClose} width={'180px'}>
                    Back
                  </Button>
                </Box>
              </Box>
            </Box>
          </Scrollbars>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default React.forwardRef(AssetsModal);
