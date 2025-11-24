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
import { NamiPassword } from './namiPassword';
import { logger } from "@lace/common";
import { Wallet as CardanoWallet } from "@lace/cardano";

interface Props {
  ready?: boolean;
  onConfirm: (status: boolean, error?: string) => Promise<void> | void;
  sign: () => Promise<void>;
  onCloseBtn?: () => void;
  title?: React.ReactNode;
  info?: React.ReactNode;
  walletType: WalletType;
  openHWFlow?: (path: string) => void;
  getCbor?: () => Promise<string>;
  setCollateral?: boolean;
  isPopup?: boolean;
  secretsUtil: {
    clearSecrets: () => void;
    password: Partial<Password>;
    setPassword: (pw: Readonly<Partial<Password>>) => void;
  };
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
    walletType,
    openHWFlow,
    getCbor,
    setCollateral,
    isPopup,
    secretsUtil,
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
        CardanoWallet.AVAILABLE_WALLETS.includes(
          walletType as CardanoWallet.HardwareWallets,
        )
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
      {typeof openHWFlow === 'function' &&
      [WalletType.Ledger, WalletType.Trezor].includes(walletType) ? (
        <ConfirmModalHw
          openHWFlow={openHWFlow}
          getCbor={getCbor}
          props={props}
          isOpen={isOpenHW}
          onClose={onCloseHW}
        />
      ) : (
        <ConfirmModalNormal
          props={props}
          isOpen={isOpenNormal}
          onClose={onCloseNormal}
          secretsUtil={secretsUtil}
        />
      )}
    </>
  );
};

interface ConfirmModalNormalProps {
  isOpen?: boolean;
  onClose: () => void;
  props: Omit<Props, 'secretsUtil'>;
  secretsUtil: {
    clearSecrets: () => void;
    password: Partial<Password>;
    setPassword: (pw: Readonly<Partial<Password>>) => void;
  };
}

const ConfirmModalNormal = ({
  props,
  isOpen,
  onClose,
  secretsUtil,
}: Readonly<ConfirmModalNormalProps>) => {
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [waitReady, setWaitReady] = React.useState(true);

  React.useEffect(() => {
    setErrorMessage(undefined);
  }, [isOpen]);

  const handleClose = (cb?: () => void) => {
    secretsUtil.clearSecrets();
    cb?.();
    setTimeout(onClose, 0);
  };

  const confirmHandler = async () => {
    if (!secretsUtil.password?.value || props.ready === false || !waitReady)
      return;
    try {
      setWaitReady(false);
      await props.sign();
      await props?.onConfirm(true);
      handleClose();
    } catch (error) {
      secretsUtil.clearSecrets();
      if (
        error === ERROR.wrongPassword ||
        (error instanceof Error && error.name === 'AuthenticationError')
      )
        setErrorMessage('Password is wrong');
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
        handleClose(() => props.onCloseBtn?.());
      }}
      isCentered
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent m={0}>
        <ModalHeader fontSize="md">
          {props.title ? props.title : 'Confirm with password'}
        </ModalHeader>
        <ModalBody>
          {props.info}
          <NamiPassword
            autoFocus // seems to work fine in nami-mode
            onChange={secretsUtil.setPassword}
            label="Enter password"
            errorMessage={errorMessage}
            onSubmit={async (event) => {
              event.preventDefault();
              await confirmHandler();
            }}
          />
        </ModalBody>

        <ModalFooter>
          <Button
            mr={3}
            variant="ghost"
            onClick={() => {
              handleClose(() => props.onCloseBtn?.());
            }}
          >
            Close
          </Button>
          <Button
            isDisabled={
              !secretsUtil.password.value || props.ready === false || !waitReady
            }
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
  getCbor?: () => Promise<string>;
  props: Omit<Props, 'secretsUtil'>;
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

  const confirmHandler = async () => {
    if (
      props.walletType === WalletType.Trezor &&
      props.isPopup &&
      typeof getCbor === 'function'
    ) {
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
      } catch (error_) {
        logger.error(error_);
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
