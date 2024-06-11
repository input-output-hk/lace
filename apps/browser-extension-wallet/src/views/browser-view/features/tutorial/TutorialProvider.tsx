import { Tour, TourProps } from "antd";
import { noop } from "lodash";
import React, { createContext, useRef, useState } from "react";
import styles from './Tutorial.module.scss';

export const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }: { children: React.ReactNode}) => {
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const ref6 = useRef(null);
  const ref7 = useRef(null);

  const [open, setOpen] = useState<boolean>(true);
  
  const refs = [
    ref1,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7
  ];

  const steps: TourProps['steps'] = [
    {
      title: 'Tokens',
      description: 'This is where you can see a list of all your tokens.',
      target: () => ref1.current
    },
    {
      title: 'NFTs',
      description: 'You can see your NFTs in this section.',
      target: () => ref2.current
    },
    {
      title: 'Activity',
      description: 'All your transaction history can be found here.',
      target: () => ref3.current
    },
    {
      title: 'Staking',
      description: 'Contribute to the network by staking your ADA.',
      target: () => ref4.current
    },
    {
      title: 'Send',
      description: 'Send ADA to an address.',
      target: () => ref5.current
    },
    {
      title: 'Receive',
      description: 'Receive ADA from an address.',
      target: () => ref6.current
    },
    {
      title: 'Profile',
      description: 'Take user actions such as adding or sharing wallets.',
      target: () => ref7.current
    }
  ];
  
  return (
    <TutorialContext.Provider value={{ refs }}>
      {children}
      <Tour
        open={open}
        onClose={() => setOpen(false)}
        steps={steps}
        onPopupAlign={noop}
        placement="right"
        rootClassName={styles.tour}
      />
    </TutorialContext.Provider>
  );
};
