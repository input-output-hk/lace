/* eslint-disable unicorn/prefer-logical-operator-over-ternary */
/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';

import { WalletType } from '@cardano-sdk/web-extension';
import {
  Icon,
  Box,
  Text,
  Button,
  useDisclosure,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';
import { MdUsb } from 'react-icons/md';

import { ERROR } from '../../../config/config';

import type { PasswordObj as Password } from '@lace/core';
import { useCaptureEvent } from 'features/analytics/hooks';
import { Events } from 'features/analytics/events';

interface Props {
  ready?: boolean;
  onConfirm: (status: boolean, error?: string) => Promise<void> | void;
  sign: (password?: string) => Promise<void>;
  setPassword?: (pw: Readonly<Partial<Password>>) => void;
  onCloseBtn?: () => void;
  title?: React.ReactNode;
  info?: React.ReactNode;
  walletType: WalletType;
  openHWFlow?: (path: string) => void;
  getCbor?: () => Promise<string>;
  setCollateral?: boolean;
  isPopup?: boolean;
}

export interface ConfirmModalRef {
  openModal: () => void;
  closeModal: () => void;
}

const ConfirmModal = (
  {
    ready,
    onConfirm,
    sign,
    onCloseBtn,
    title,
    info,
    setPassword,
    walletType,
    openHWFlow,
    getCbor,
    setCollateral,
    isPopup,
  }: Readonly<Props>,
  ref,
) => {
  const {
    isOpen: isOpenNormal,
    onOpen: onOpenNormal,
    onClose: onCloseNormal,
  } = useDisclosure();
  const {
    isOpen: isOpenHW,
    onOpen: onOpenHW,
    onClose: onCloseHW,
  } = useDisclosure();
  const props = {
    ready,
    onConfirm,
    sign,
    onCloseBtn,
    title,
    info,
    walletType,
    setCollateral,
    isPopup,
  };
  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      if (
        walletType === WalletType.Ledger ||
        walletType === WalletType.Trezor
      ) {
        onOpenHW();
      } else {
        onOpenNormal();
      }
    },
    closeModal: () => {
      onCloseNormal();
      onCloseHW();
    },
  }));

  return (
    <>
      {typeof openHWFlow === 'function' && typeof getCbor === 'function' && (
        <ConfirmModalHw
          openHWFlow={openHWFlow}
          getCbor={getCbor}
          props={props}
          isOpen={isOpenHW}
          onClose={onCloseHW}
        />
      )}
      <ConfirmModalNormal
        props={props}
        isOpen={isOpenNormal}
        onClose={onCloseNormal}
        setPassword={setPassword}
      />
    </>
  );
};

interface ConfirmModalNormalProps {
  isOpen?: boolean;
  onClose: () => void;
  setPassword?: (pw: Readonly<Partial<Password>>) => void;
  props: Props;
}

const ConfirmModalNormal = ({
  props,
  isOpen,
  onClose,
  setPassword,
}: Readonly<ConfirmModalNormalProps>) => {
  const [state, setState] = React.useState({
    wrongPassword: false,
    password: '',
    show: false,
    name: '',
  });
  const [waitReady, setWaitReady] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setState({
      wrongPassword: false,
      password: '',
      show: false,
      name: '',
    });
  }, [isOpen]);

  const confirmHandler = async () => {
    if (!state.password || props.ready === false || !waitReady) return;
    try {
      setWaitReady(false);
      await props.sign(state.password);
      await props?.onConfirm(true);
      onClose?.();
    } catch (error) {
      if (
        error === ERROR.wrongPassword ||
        (error instanceof Error && error.name === 'AuthenticationError')
      )
        setState(s => ({ ...s, wrongPassword: true }));
      else
        await props.onConfirm(
          false,
          error instanceof Error ? error.name : (error || '').toString(),
        );
    }
    setWaitReady(true);
  };

  return (
    <Modal
      size="xs"
      isOpen={!!isOpen}
      onClose={() => {
        if (props.onCloseBtn) {
          props.onCloseBtn();
        }
        onClose();
      }}
      isCentered
      initialFocusRef={inputRef}
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent m={0}>
        <ModalHeader fontSize="md">
          {props.title ? props.title : 'Confirm with password'}
        </ModalHeader>
        <ModalBody>
          {props.info}
          <InputGroup size="md">
            <Input
              ref={inputRef}
              focusBorderColor="teal.400"
              variant="filled"
              isInvalid={state.wrongPassword}
              pr="4.5rem"
              type={state.show ? 'text' : 'password'}
              onChange={e => {
                setPassword?.(e.target);
                setState(s => ({ ...s, password: e.target.value }));
              }}
              onKeyDown={e => {
                if (e.key == 'Enter') confirmHandler();
              }}
              placeholder="Enter password"
            />
            <InputRightElement width="4.5rem">
              <Button
                h="1.75rem"
                size="sm"
                onClick={() => {
                  setState(s => ({ ...s, show: !s.show }));
                }}
              >
                {state.show ? 'Hide' : 'Show'}
              </Button>
            </InputRightElement>
          </InputGroup>
          {state.wrongPassword && (
            <Text color="red.300">Password is wrong</Text>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            mr={3}
            variant="ghost"
            onClick={() => {
              if (props.onCloseBtn) {
                props.onCloseBtn();
              }
              onClose();
            }}
          >
            Close
          </Button>
          <Button
            isDisabled={!state.password || props.ready === false || !waitReady}
            isLoading={!waitReady}
            colorScheme="teal"
            onClick={confirmHandler}
          >
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface ConfirmModalHwProps {
  isOpen?: boolean;
  onClose: () => void;
  openHWFlow: (path: string) => void;
  getCbor: () => Promise<string>;
  props: Props;
}

const ConfirmModalHw = ({
  props,
  isOpen,
  getCbor,
  openHWFlow,
  onClose,
}: Readonly<ConfirmModalHwProps>) => {
  const [waitReady, setWaitReady] = React.useState(true);
  const [error, setError] = React.useState('');
  const capture = useCaptureEvent();

  const confirmHandler = async () => {
    if (props.walletType === WalletType.Trezor && props.isPopup) {
      const cbor = await getCbor();

      if (cbor === '') {
        setError('An error occurred');
        return;
      }

      if (props.setCollateral) {
        openHWFlow(`/hwTab/trezorTx/${cbor}/${props.setCollateral}`);
      } else {
        openHWFlow(`/hwTab/trezorTx/${cbor}`);
      }
    } else {
      if (props.ready === false || !waitReady) return;
      setWaitReady(false);
      try {
        await props.sign();
        await props.onConfirm(true);
        capture(Events.SendTransactionConfirmed);
      } catch (error_) {
        console.error(error_);
        if (error_ === ERROR.submit) props.onConfirm(false, error_);
        else setError('An error occured');
      }
      setWaitReady(true);
    }
  };

  React.useEffect(() => {
    setError('');
  }, [isOpen]);

  return (
    <>
      <Modal
        size="xs"
        isOpen={!!isOpen}
        onClose={onClose}
        isCentered
        blockScrollOnMount={false}
      >
        <ModalOverlay />
        <ModalContent m={0}>
          <ModalHeader fontSize="md">
            {props.title ? props.title : `Confirm with device`}
          </ModalHeader>
          <ModalBody>
            {props.info}
            <Box
              width="full"
              display="flex"
              justifyContent="center"
              alignItems="center"
              flexDirection="column"
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                background={
                  props.walletType === WalletType.Ledger
                    ? 'blue.400'
                    : 'green.400'
                }
                rounded="xl"
                py={2}
                width="70%"
                color="white"
              >
                <Icon as={MdUsb} boxSize={5} mr={2} />
                <Box fontSize="sm">
                  {waitReady
                    ? `Connect ${props.walletType}`
                    : `Waiting for ${props.walletType}`}
                </Box>
              </Box>
              {error && (
                <Text mt={2} color="red.300">
                  {error}
                </Text>
              )}
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button
              mr={3}
              variant="ghost"
              onClick={() => {
                if (props.onCloseBtn) {
                  props.onCloseBtn();
                }
                onClose();
              }}
            >
              Close
            </Button>
            <Button
              isDisabled={props.ready === false || !waitReady}
              isLoading={!waitReady}
              colorScheme="teal"
              onClick={confirmHandler}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default React.forwardRef(ConfirmModal);
