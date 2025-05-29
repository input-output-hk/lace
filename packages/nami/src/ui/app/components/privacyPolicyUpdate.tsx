import React from 'react';

import {
  Box,
  Text,
  Modal,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Link,
} from '@chakra-ui/react';

export interface PrivacyPolicyRef {
  openModal: () => void;
  closeModal: () => void;
}

const PrivacyPolicyUpdate = React.forwardRef((_props, ref) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
    closeModal: () => {
      onClose();
    },
  }));

  return (
    <Modal
      size="xs"
      isOpen={isOpen}
      onClose={() => {
        localStorage.setItem('hasUserAcknowledgedPrivacyPolicyUpdate', 'true');
        onClose();
      }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader fontSize="md">Privacy Policy Update</ModalHeader>

        <ModalBody pb="4">
          <Box>
            <Text>
              Our Privacy Policy has been updated. You can review the latest
              version{' '}
              <Link
                color="dodgerblue"
                _hover={{ color: 'dodgerblue', textDecoration: 'underline' }}
                href={process.env.PRIVACY_POLICY_URL}
              >
                {' '}
                here
              </Link>
              .
            </Text>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});

PrivacyPolicyUpdate.displayName = 'PrivacyPolicyUpdate';

export default PrivacyPolicyUpdate;
