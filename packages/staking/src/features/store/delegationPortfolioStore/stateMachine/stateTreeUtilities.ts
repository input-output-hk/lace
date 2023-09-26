import { Command } from './commands';
import { Handler, State } from './types';

export const cases =
  <D extends string>(definition: Record<D, Handler>, discriminator: D, parentName: string): Handler =>
  (params) => {
    const handler = definition[discriminator];
    if (!handler) {
      console.error(`Invalid discriminator ${discriminator} in ${parentName} handlers`);
      return params.state;
    }
    return handler(params);
  };

export const handler =
  <C extends Command, CurrentState extends State, TargetState extends State>(
    handlerBody: Handler<C, CurrentState, TargetState>
  ): Handler<C, CurrentState, TargetState> =>
  (params) =>
    handlerBody(params);
