import type { PasswordObj as Password } from '@lace/core';

import React from 'react';

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
import { WalletType } from '@cardano-sdk/web-extension';
import { Events } from "../../../features/analytics/events";
import type { Wallet } from '@lace/cardano';

interface Props {
  ready: boolean;
  onConfirm: (status: boolean, tx: string) => void;
  sign: (password: string, hw: object) => Promise<void>;
  setPassword: (pw: Readonly<Partial<Password>>) => void;
  onCloseBtn: () => void;
  title: React.ReactNode;
  info: React.ReactNode;
  walletType: WalletType;
  connectHW: (device: USBDevice) => Promise<Wallet.HardwareWalletConnection>;
}

const ConfirmModal = React.forwardRef<unknown, Props>(
  ({ ready, onConfirm, sign, onCloseBtn, title, info, setPassword, walletType, connectHW }, ref) => {

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
      connectHW
    };
    React.useImperativeHandle(ref, () => ({
      openModal() {
        if (walletType === WalletType.Ledger || walletType === WalletType.Trezor) {
          onOpenHW();
        } else {
          onOpenNormal();
        }
      },
      closeModal() {
        onCloseNormal();
        onCloseHW();
      },
    }));

    return (
      <>
        <ConfirmModalHw
          props={props}
          isOpen={isOpenHW}
          onClose={onCloseHW}
        />
        <ConfirmModalNormal
          props={props}
          isOpen={isOpenNormal}
          onClose={onCloseNormal}
          setPassword={setPassword}
        />
      </>
    );
  }
);

const ConfirmModalNormal = ({ props, isOpen, onClose, setPassword }) => {
  const [state, setState] = React.useState({
    wrongPassword: false,
    password: '',
    show: false,
    name: '',
  });
  const [waitReady, setWaitReady] = React.useState(true);
  const inputRef = React.useRef();

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
      const signedMessage = await props.sign(state.password);
      await props.onConfirm(true, signedMessage);
      onClose?.();
    } catch (e) {
      if (e === ERROR.wrongPassword || e.name === 'AuthenticationError')
        setState((s) => ({ ...s, wrongPassword: true }));
      else await props.onConfirm(false, e);
    }
    setWaitReady(true);
  };

  return (
    <Modal
      size="xs"
      isOpen={isOpen}
      onClose={() => {
        if (props.onCloseBtn) {
          props.onCloseBtn();
        }
        onClose()
      }}
      isCentered
      initialFocusRef={inputRef}
      blockScrollOnMount={false}
      // styleConfig={{maxWidth: '100%'}}
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
              isInvalid={state.wrongPassword === true}
              pr="4.5rem"
              type={state.show ? 'text' : 'password'}
              onChange={(e) => {
                setPassword?.(e.target);
                setState((s) => ({ ...s, password: e.target.value }));
              }}
              onKeyDown={(e) => {
                if (e.key == 'Enter') confirmHandler();
              }}
              placeholder="Enter password"
            />
            <InputRightElement width="4.5rem">
              <Button
                h="1.75rem"
                size="sm"
                onClick={() => setState((s) => ({ ...s, show: !s.show }))}
              >
                {state.show ? 'Hide' : 'Show'}
              </Button>
            </InputRightElement>
          </InputGroup>
          {state.wrongPassword === true && (
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

const ConfirmModalHw = ({ props, isOpen, onClose }) => {
  const [waitReady, setWaitReady] = React.useState(true);
  const [error, setError] = React.useState('');

  const confirmHandler = async () => {
    if (props.ready === false || !waitReady) return;
    setWaitReady(false);
    try {
      const signedMessage = await props.sign(null);
      await props.onConfirm(true, signedMessage);
    } catch (e) {
      console.error(e);
      if (e === ERROR.submit) props.onConfirm(false, e);
      else setError('An error occured');
    }
    setWaitReady(true);
  };

  React.useEffect(() => {
    setError('');
  }, [isOpen]);

  return (
    <>
      <Modal
        size="xs"
        isOpen={isOpen}
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
                background={props.walletType === WalletType.Ledger ? 'blue.400' : 'green.400'}
                rounded="xl"
                py={2}
                width="70%"
                color="white"
              >
                <Icon as={MdUsb} boxSize={5} mr={2} />
                <Box fontSize="sm">
                  {waitReady
                    ? `Connect ${props.walletType}`
                    : `Waiting for ${
                      props.walletType
                      }`}
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

export default ConfirmModal;
