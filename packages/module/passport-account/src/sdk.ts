import './augmentations';

export { createPassportAccountModule } from './create-passport-account-module';
export type { CreatePassportAccountModuleProps } from './create-passport-account-module';
export { createPasskeyAuthoriser } from './ceremony/passkey';
export type {
  CreatePasskeyAuthoriserProps,
  PasskeyAuthoriser,
} from './ceremony/passkey';
export { createDevSponsor } from './infra/dev-sponsor';
export type { DevSponsor, DevSponsorConfig } from './infra/dev-sponsor';
export { createHttpProver } from './infra/http-prover';
export type { HttpProverOptions } from './infra/http-prover';
