import React from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  Image,
  Text,
  Box,
  Link,
} from '@chakra-ui/react';

import IOHKBlack from '../../../assets/img/iohk.svg';
import IOHKWhite from '../../../assets/img/iohkWhite.svg';
import LogoBlack from '../../../assets/img/logo.svg';
import LogoWhite from '../../../assets/img/logoWhite.svg';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider';

import PrivacyPolicy from './privacyPolicy';
import TermsOfUse from './termsOfUse';

import type { PrivacyPolicyRef } from './privacyPolicy';
import type { TermsOfUseRef } from './termsOfUse';

export interface AboutRef {
  openModal: () => void;
  closeModal: () => void;
}

const About = (_props, ref) => {
  const capture = useCaptureEvent();
  const { openExternalLink } = useOutsideHandles();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const Logo = useColorModeValue(LogoBlack, LogoWhite);
  const IOHK = useColorModeValue(IOHKWhite, IOHKBlack);

  const termsRef = React.useRef<TermsOfUseRef>(null);
  const privacyPolRef = React.useRef<PrivacyPolicyRef>(null);

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
    closeModal: () => {
      onClose();
    },
  }));
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
        <ModalContent>
          <ModalHeader fontSize="md">About</ModalHeader>
          <ModalCloseButton />
          <ModalBody
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <Image
              cursor="pointer"
              onClick={() => {
                openExternalLink('https://namiwallet.io');
              }}
              width="90px"
              src={Logo}
            />
            <Box height="4" />
            <Text fontSize="sm">Nami mode: {process.env.APP_VERSION}</Text>
            <Box height="6" />
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
            >
              <Text fontSize="xs">
                Maintained by{' '}
                <span
                  onClick={() => {
                    openExternalLink('https://iohk.io/');
                  }}
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                >
                  IOG
                </span>
              </Text>
              <Box height="4" />
              <Image
                cursor="pointer"
                onClick={() => {
                  openExternalLink('https://iohk.io/');
                }}
                src={IOHK}
                width="66px"
              />
            </Box>
            <Box height="4" />
            {/* Footer */}
            <Box>
              <Link
                onClick={() => {
                  capture(Events.SettingsTermsAndConditionsClick);
                  termsRef.current?.openModal();
                }}
                color="GrayText"
                _hover={{ color: 'GrayText', textDecoration: 'underline' }}
              >
                Terms of use
              </Link>
              <span> | </span>
              <Link
                onClick={() => privacyPolRef.current?.openModal()}
                color="GrayText"
                _hover={{ color: 'GrayText', textDecoration: 'underline' }}
              >
                Privacy Policy
              </Link>
            </Box>
            <Box height="2" />
          </ModalBody>
        </ModalContent>
      </Modal>
      <TermsOfUse ref={termsRef} />
      <PrivacyPolicy ref={privacyPolRef} />
    </>
  );
};

export default React.forwardRef(About);
