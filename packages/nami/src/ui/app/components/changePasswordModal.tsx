/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-unescaped-entities */
import React from 'react';

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

interface Props {
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

export interface ChangePasswordModalComponentRef {
  openModal: () => void;
}

interface State {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
  matchingPassword: boolean;
  passwordLen: boolean | null;
  show: boolean;
}

const ChangePasswordModalComponent = ({ changePassword }: Props, ref) => {
  const capture = useCaptureEvent();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);
  const [state, setState] = React.useState<State>({
    currentPassword: '',
    newPassword: '',
    repeatPassword: '',
    matchingPassword: false,
    passwordLen: null,
    show: false,
  });

  React.useEffect(() => {
    setState({
      currentPassword: '',
      newPassword: '',
      repeatPassword: '',
      matchingPassword: false,
      passwordLen: null,
      show: false,
    });
  }, [isOpen]);

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
  }));

  const confirmHandler = async () => {
    if (
      !state.currentPassword ||
      !state.newPassword ||
      !state.repeatPassword ||
      state.newPassword !== state.repeatPassword
    )
      return;

    setIsLoading(true);

    try {
      await changePassword(state.currentPassword, state.newPassword);
      toast({
        title: 'Password updated',
        status: 'success',
        duration: 5000,
      });

      capture(Events.SettingsChangePasswordConfirm);

      onClose();
    } catch (error) {
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
    <Modal
      size="xs"
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      initialFocusRef={inputRef}
    >
      <ModalOverlay />
      <ModalContent m={0}>
        <ModalHeader fontSize="md">Change Password</ModalHeader>
        <ModalBody>
          <Box mb="6" fontSize="sm" width="full">
            Type your current password and new password below, if you want to
            continue.
          </Box>

          <Box>
            <InputGroup size="md">
              <Input
                ref={inputRef}
                focusBorderColor="teal.400"
                variant="filled"
                pr="4.5rem"
                type={state.show ? 'text' : 'password'}
                onChange={e => {
                  setState(s => ({ ...s, currentPassword: e.target.value }));
                }}
                placeholder="Enter current password"
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
          </Box>

          <Box height="4" />

          <Box>
            <InputGroup size="md">
              <Input
                focusBorderColor="teal.400"
                variant="filled"
                pr="4.5rem"
                isInvalid={state.passwordLen === false}
                type={state.show ? 'text' : 'password'}
                onChange={e => {
                  setState(s => ({ ...s, newPassword: e.target.value }));
                }}
                onBlur={e => {
                  setState(s => ({
                    ...s,
                    passwordLen: e.target.value
                      ? e.target.value.length >= 8
                      : false,
                  }));
                }}
                placeholder="Enter new password"
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
          </Box>

          {state.passwordLen === false && (
            <Text color="red.300">
              Password must be at least 8 characters long
            </Text>
          )}

          <Box height="4" />

          <Box>
            <InputGroup size="md">
              <Input
                focusBorderColor="teal.400"
                variant="filled"
                isInvalid={
                  !!state.repeatPassword &&
                  state.newPassword !== state.repeatPassword
                }
                pr="4.5rem"
                type={state.show ? 'text' : 'password'}
                onChange={e => {
                  setState(s => ({ ...s, repeatPassword: e.target.value }));
                }}
                placeholder="Repeat new password"
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

            {state.repeatPassword &&
              state.repeatPassword !== state.newPassword && (
                <Text color="red.300">Password doesn't match</Text>
              )}
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button mr={3} variant="ghost" onClick={onClose} ref={cancelRef}>
            Cancel
          </Button>

          <Button
            isDisabled={
              !state.currentPassword ||
              !state.newPassword ||
              !state.repeatPassword ||
              state.newPassword !== state.repeatPassword ||
              state.passwordLen === false
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
