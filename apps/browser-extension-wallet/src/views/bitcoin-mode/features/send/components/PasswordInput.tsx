
import React, {useState} from "react";
import cn from "classnames";
import styles from "./PasswordInput.module.scss";
import {Password} from "@lace/core";
import {Button} from "@lace/common";

interface PasswordInputProps {
  onSubmit: (password: string) => void;
  onBack: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ onSubmit, onBack }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onSubmit(password);
  };

  return (
    <div>
      <div className={cn(styles.container)}>
        <div className={styles.password}>
          <Password
            onChange={(password) => setPassword(password.value)}
            errorMessage='Invalid Password'
            label='Enter your password'
          />
        </div>
      </div>


      <div
        style={{
          position: 'absolute',
          top: 325,
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '1rem',
          borderTop: '1px solid #E0E0E0',
        }}
      >
        <Button
          color="primary"
          block
          size="medium"
          onClick={handleConfirm}
          data-testid="continue-button"
        >
          Confirm
        </Button>
        <Button
          color="secondary"
          block
          size="medium"
          onClick={onBack}
          data-testid="back-button"
        >
          Back
        </Button>
      </div>
    </div>
  );
};
