
import React, {useState} from "react";

interface PasswordInputProps {
  onSubmit: (password: string) => void;
  onBack: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ onSubmit, onBack }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    // Submit password to parent
    onSubmit(password);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Enter Password</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Step 4: Confirm your transaction
      </p>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        style={{ width: '100%', padding: '0.5rem', margin: '1rem 0' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
