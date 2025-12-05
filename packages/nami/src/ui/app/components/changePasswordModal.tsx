/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-unescaped-entities */
import React, { useState } from 'react';

import {
  Button,
  Box,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { NamiPassword } from './namiPassword';
import { useOutsideHandles } from '../../../features/outside-handles-provider';
import { noop } from 'lodash';

interface Props {
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

export interface ChangePasswordModalComponentRef {
  openModal: () => void;
}

const ChangePasswordModalComponent = ({ changePassword }: Props, ref) => {
  const capture = useCaptureEvent();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const { secretsUtil } = useOutsideHandles();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
  }));

  const destroySecrets = () => {
    secretsUtil.clearSecrets();
  };

  const handleClose = () => {
    destroySecrets();
    setTimeout(onClose, 0);
  };

  const confirmHandler = async () => {
    if (
      !secretsUtil.password?.value ||
      !secretsUtil.passwordConfirmation?.value ||
      !secretsUtil.repeatedPassword?.value ||
      secretsUtil.passwordConfirmation.value !==
        secretsUtil.repeatedPassword.value
    )
      return;

    setIsLoading(true);

    try {
      await changePassword(
        secretsUtil.password.value,
        secretsUtil.passwordConfirmation.value,
      );

      toast({
        title: 'Password updated',
        status: 'success',
        duration: 5000,
      });

      capture(Events.SettingsChangePasswordConfirm);
      handleClose();
    } catch (error) {
      destroySecrets();
      toast({
        title:
          error instanceof Error ? error.message : 'Password update failed!',
        status: 'error',
        duration: 5000,
      });
    }

    setIsLoading(false);
  };

  return (
    <Modal size="xs" isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent m={0}>
        <ModalHeader fontSize="md">Change Password</ModalHeader>
        <ModalBody>
          <Box mb="6" fontSize="sm" width="full">
            Type your current password and new password below, if you want to
            continue.
          </Box>
          <NamiPassword
            autoFocus
            label="Enter current password"
            onChange={secretsUtil.setPassword}
            onSubmit={noop}
          />
          <Box height="4" />
          <Box>
            <NamiPassword
              label="Enter new password"
              onChange={secretsUtil.setPasswordConfirmation}
              onSubmit={noop}
            />
            {!!secretsUtil.password?.value &&
              secretsUtil.password.value.length < 8 && (
                <Text color="red.300">
                  Password must be at least 8 characters long
                </Text>
              )}
          </Box>
          <Box height="4" />
          <Box>
            <NamiPassword
              label="Repeat new password"
              onChange={secretsUtil.setPasswordConfirmationRepeat}
              onSubmit={confirmHandler}
            />

            {!!secretsUtil.passwordConfirmation?.value &&
              !!secretsUtil.repeatedPassword?.value &&
              secretsUtil.passwordConfirmation.value !==
                secretsUtil.repeatedPassword?.value && (
                <Text color="red.300">Password doesn't match</Text>
              )}
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button mr={3} variant="ghost" onClick={handleClose} ref={cancelRef}>
            Cancel
          </Button>

          <Button
            isDisabled={
              !secretsUtil.password?.value ||
              !secretsUtil.passwordConfirmation?.value ||
              !secretsUtil.repeatedPassword?.value ||
              secretsUtil.passwordConfirmation.value !==
                secretsUtil.repeatedPassword.value ||
              secretsUtil.passwordConfirmation?.value.length < 8
            }
            isLoading={isLoading}
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

export const ChangePasswordModal = React.forwardRef(
  ChangePasswordModalComponent,
);
