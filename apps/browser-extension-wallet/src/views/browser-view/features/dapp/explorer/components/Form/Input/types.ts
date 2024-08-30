import { UseFormRegister, RegisterOptions, Control, UseFormSetError, FieldValues } from 'react-hook-form';
import { ERoutes } from '../../../routes/enum';
import { TIogBoxSizes } from '../types';

interface IInputLink {
  url: ERoutes;
  label: string;
  e2eId: string;
}

interface IInputStyles {
  size?: TIogBoxSizes;
  spacer?: number;
  position?: any;
  secondary?: boolean;
}

interface IInputHookFromProperties<T extends FieldValues> {
  registerOptions?: RegisterOptions<T>;
  control?: Control<T>;
  register?: UseFormRegister<T>;
  fieldsName?: any;
  required?: boolean;
  setError?: UseFormSetError<T>;
}

interface IInputTheme {
  light?: boolean;
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & React.HTMLAttributes<HTMLInputElement>;
export interface IInputProps<T extends FieldValues = FieldValues>
  extends InputProps,
    IInputStyles,
    IInputHookFromProperties<T>,
    IInputTheme {
  name: string;
  label?: string;
  requireMessage?: string;
  inputLink?: IInputLink;
  ref?: any;
  e2ePrefix?: string;
  checkProfanity?: boolean;
  onClearField?: () => void;
}
