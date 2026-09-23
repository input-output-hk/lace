import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  held_coin(context: __compactRuntime.WitnessContext<Ledger, PS>,
            color_0: Uint8Array): [PS, { nonce: Uint8Array,
                                         color: Uint8Array,
                                         value: bigint,
                                         mt_index: bigint
                                       }];
}

export type ImpureCircuits<PS> = {
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  deposit_unshielded(context: __compactRuntime.CircuitContext<PS>,
                     color_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                  color_0: Uint8Array,
                                  amount_0: bigint,
                                  recipient_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  use_counter_0: bigint,
                                  sig_r_0: __compactRuntime.JubjubPoint,
                                  sig_s_0: bigint,
                                  grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                use_counter_0: bigint,
                                sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  deposit_shielded(context: __compactRuntime.CircuitContext<PS>,
                   coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                           },
                   entry_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           entry_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                recipient_0: { bytes: Uint8Array },
                                color_0: Uint8Array,
                                amount_0: bigint,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                      value: { nonce: Uint8Array,
                                                                                                               color: Uint8Array,
                                                                                                               value: bigint
                                                                                                             }
                                                                                                    }>>;
  withdraw_shielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                              value: { nonce: Uint8Array,
                                                                                                                       color: Uint8Array,
                                                                                                                       value: bigint
                                                                                                                     }
                                                                                                            }>>;
  withdraw_shielded_to_contract_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                            recipient_0: { bytes: Uint8Array },
                                            color_0: Uint8Array,
                                            amount_0: bigint,
                                            pk_0: __compactRuntime.JubjubPoint,
                                            use_counter_0: bigint,
                                            sig_r_0: __compactRuntime.JubjubPoint,
                                            sig_s_0: bigint,
                                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                   color: Uint8Array,
                                                                                                                   value: bigint
                                                                                                                 },
                                                                                                                 { is_some: boolean,
                                                                                                                   value: { nonce: Uint8Array,
                                                                                                                            color: Uint8Array,
                                                                                                                            value: bigint
                                                                                                                          }
                                                                                                                 }]>>;
  withdraw_shielded_to_contract_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          pk_0: __compactRuntime.Secp256k1Point,
                                          use_counter_0: bigint,
                                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                           color: Uint8Array,
                                                                                                                           value: bigint
                                                                                                                         },
                                                                                                                         { is_some: boolean,
                                                                                                                           value: { nonce: Uint8Array,
                                                                                                                                    color: Uint8Array,
                                                                                                                                    value: bigint
                                                                                                                                  }
                                                                                                                         }]>>;
  rotate_enc_key_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             new_key_0: Uint8Array,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           new_key_0: Uint8Array,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                         new_entry_0: Uint8Array,
                         pk_0: __compactRuntime.JubjubPoint,
                         use_counter_0: bigint,
                         sig_r_0: __compactRuntime.JubjubPoint,
                         sig_s_0: bigint,
                         grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                       new_entry_0: Uint8Array,
                       pk_0: __compactRuntime.Secp256k1Point,
                       use_counter_0: bigint,
                       sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                            entry_0: Uint8Array,
                            pk_0: __compactRuntime.JubjubPoint,
                            use_counter_0: bigint,
                            sig_r_0: __compactRuntime.JubjubPoint,
                            sig_s_0: bigint,
                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          pk_0: __compactRuntime.Secp256k1Point,
                          use_counter_0: bigint,
                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  deposit_unshielded(context: __compactRuntime.CircuitContext<PS>,
                     color_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                  color_0: Uint8Array,
                                  amount_0: bigint,
                                  recipient_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  use_counter_0: bigint,
                                  sig_r_0: __compactRuntime.JubjubPoint,
                                  sig_s_0: bigint,
                                  grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                use_counter_0: bigint,
                                sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  deposit_shielded(context: __compactRuntime.CircuitContext<PS>,
                   coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                           },
                   entry_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           entry_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                recipient_0: { bytes: Uint8Array },
                                color_0: Uint8Array,
                                amount_0: bigint,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                      value: { nonce: Uint8Array,
                                                                                                               color: Uint8Array,
                                                                                                               value: bigint
                                                                                                             }
                                                                                                    }>>;
  withdraw_shielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                              value: { nonce: Uint8Array,
                                                                                                                       color: Uint8Array,
                                                                                                                       value: bigint
                                                                                                                     }
                                                                                                            }>>;
  withdraw_shielded_to_contract_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                            recipient_0: { bytes: Uint8Array },
                                            color_0: Uint8Array,
                                            amount_0: bigint,
                                            pk_0: __compactRuntime.JubjubPoint,
                                            use_counter_0: bigint,
                                            sig_r_0: __compactRuntime.JubjubPoint,
                                            sig_s_0: bigint,
                                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                   color: Uint8Array,
                                                                                                                   value: bigint
                                                                                                                 },
                                                                                                                 { is_some: boolean,
                                                                                                                   value: { nonce: Uint8Array,
                                                                                                                            color: Uint8Array,
                                                                                                                            value: bigint
                                                                                                                          }
                                                                                                                 }]>>;
  withdraw_shielded_to_contract_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          pk_0: __compactRuntime.Secp256k1Point,
                                          use_counter_0: bigint,
                                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                           color: Uint8Array,
                                                                                                                           value: bigint
                                                                                                                         },
                                                                                                                         { is_some: boolean,
                                                                                                                           value: { nonce: Uint8Array,
                                                                                                                                    color: Uint8Array,
                                                                                                                                    value: bigint
                                                                                                                                  }
                                                                                                                         }]>>;
  rotate_enc_key_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             new_key_0: Uint8Array,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           new_key_0: Uint8Array,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                         new_entry_0: Uint8Array,
                         pk_0: __compactRuntime.JubjubPoint,
                         use_counter_0: bigint,
                         sig_r_0: __compactRuntime.JubjubPoint,
                         sig_s_0: bigint,
                         grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                       new_entry_0: Uint8Array,
                       pk_0: __compactRuntime.Secp256k1Point,
                       use_counter_0: bigint,
                       sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                            entry_0: Uint8Array,
                            pk_0: __compactRuntime.JubjubPoint,
                            use_counter_0: bigint,
                            sig_r_0: __compactRuntime.JubjubPoint,
                            sig_s_0: bigint,
                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          pk_0: __compactRuntime.Secp256k1Point,
                          use_counter_0: bigint,
                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
  derive_boot_commitment_with_jubjub(salt_0: Uint8Array,
                                     pk_0: __compactRuntime.JubjubPoint): Uint8Array;
  derive_boot_commitment_with_k256(salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256k1Point): Uint8Array;
  derive_device_entry_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  epoch_0: bigint,
                                  counter_0: bigint): Uint8Array;
  derive_device_entry_with_k256(self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                epoch_0: bigint,
                                counter_0: bigint): Uint8Array;
  compute_public_point_with_jubjub(scalar_0: bigint): __compactRuntime.JubjubPoint;
  compute_public_point_with_k256(scalar_0: bigint): __compactRuntime.Secp256k1Point;
  challenge_withdraw_unshielded_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                            sig_r_0: __compactRuntime.JubjubPoint,
                                            pk_0: __compactRuntime.JubjubPoint,
                                            color_0: Uint8Array,
                                            amount_0: bigint,
                                            recipient_0: { bytes: Uint8Array },
                                            nonce_value_0: bigint,
                                            grind_nonce_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                          sig_r_0: __compactRuntime.JubjubPoint,
                                          pk_0: __compactRuntime.JubjubPoint,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          coin_0: { nonce: Uint8Array,
                                                    color: Uint8Array,
                                                    value: bigint,
                                                    mt_index: bigint
                                                  },
                                          nonce_value_0: bigint,
                                          grind_nonce_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_jubjub(self_addr_0: { bytes: Uint8Array
                                                                   },
                                                      sig_r_0: __compactRuntime.JubjubPoint,
                                                      pk_0: __compactRuntime.JubjubPoint,
                                                      recipient_0: { bytes: Uint8Array
                                                                   },
                                                      color_0: Uint8Array,
                                                      amount_0: bigint,
                                                      coin_0: { nonce: Uint8Array,
                                                                color: Uint8Array,
                                                                value: bigint,
                                                                mt_index: bigint
                                                              },
                                                      nonce_value_0: bigint,
                                                      grind_nonce_0: bigint): Uint8Array;
  challenge_append_inbox_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                     sig_r_0: __compactRuntime.JubjubPoint,
                                     pk_0: __compactRuntime.JubjubPoint,
                                     entry_0: Uint8Array,
                                     nonce_value_0: bigint,
                                     grind_nonce_0: bigint): Uint8Array;
  challenge_rotate_enc_key_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       new_key_0: Uint8Array,
                                       nonce_value_0: bigint,
                                       grind_nonce_0: bigint): Uint8Array;
  challenge_add_device_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                   sig_r_0: __compactRuntime.JubjubPoint,
                                   pk_0: __compactRuntime.JubjubPoint,
                                   new_entry_0: Uint8Array,
                                   nonce_value_0: bigint,
                                   grind_nonce_0: bigint): Uint8Array;
  challenge_remove_device_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                      sig_r_0: __compactRuntime.JubjubPoint,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      entry_0: Uint8Array,
                                      nonce_value_0: bigint,
                                      grind_nonce_0: bigint): Uint8Array;
  challenge_withdraw_unshielded_with_k256(self_addr_0: { bytes: Uint8Array },
                                          pk_0: __compactRuntime.Secp256k1Point,
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          recipient_0: { bytes: Uint8Array },
                                          nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_k256(self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256k1Point,
                                        recipient_0: { bytes: Uint8Array },
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        coin_0: { nonce: Uint8Array,
                                                  color: Uint8Array,
                                                  value: bigint,
                                                  mt_index: bigint
                                                },
                                        nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_k256(self_addr_0: { bytes: Uint8Array
                                                                 },
                                                    pk_0: __compactRuntime.Secp256k1Point,
                                                    recipient_0: { bytes: Uint8Array
                                                                 },
                                                    color_0: Uint8Array,
                                                    amount_0: bigint,
                                                    coin_0: { nonce: Uint8Array,
                                                              color: Uint8Array,
                                                              value: bigint,
                                                              mt_index: bigint
                                                            },
                                                    nonce_value_0: bigint): Uint8Array;
  challenge_append_inbox_with_k256(self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   entry_0: Uint8Array,
                                   nonce_value_0: bigint): Uint8Array;
  challenge_rotate_enc_key_with_k256(self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     new_key_0: Uint8Array,
                                     nonce_value_0: bigint): Uint8Array;
  challenge_add_device_with_k256(self_addr_0: { bytes: Uint8Array },
                                 pk_0: __compactRuntime.Secp256k1Point,
                                 new_entry_0: Uint8Array,
                                 nonce_value_0: bigint): Uint8Array;
  challenge_remove_device_with_k256(self_addr_0: { bytes: Uint8Array },
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    entry_0: Uint8Array,
                                    nonce_value_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  derive_boot_commitment_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                     salt_0: Uint8Array,
                                     pk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_boot_commitment_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                   salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256k1Point): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_device_entry_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                  self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  epoch_0: bigint,
                                  counter_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_device_entry_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                epoch_0: bigint,
                                counter_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  compute_public_point_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                   scalar_0: bigint): Promise<__compactRuntime.CircuitResults<PS, __compactRuntime.JubjubPoint>>;
  compute_public_point_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                 scalar_0: bigint): Promise<__compactRuntime.CircuitResults<PS, __compactRuntime.Secp256k1Point>>;
  challenge_withdraw_unshielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                            self_addr_0: { bytes: Uint8Array },
                                            sig_r_0: __compactRuntime.JubjubPoint,
                                            pk_0: __compactRuntime.JubjubPoint,
                                            color_0: Uint8Array,
                                            amount_0: bigint,
                                            recipient_0: { bytes: Uint8Array },
                                            nonce_value_0: bigint,
                                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                          self_addr_0: { bytes: Uint8Array },
                                          sig_r_0: __compactRuntime.JubjubPoint,
                                          pk_0: __compactRuntime.JubjubPoint,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          coin_0: { nonce: Uint8Array,
                                                    color: Uint8Array,
                                                    value: bigint,
                                                    mt_index: bigint
                                                  },
                                          nonce_value_0: bigint,
                                          grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                      self_addr_0: { bytes: Uint8Array
                                                                   },
                                                      sig_r_0: __compactRuntime.JubjubPoint,
                                                      pk_0: __compactRuntime.JubjubPoint,
                                                      recipient_0: { bytes: Uint8Array
                                                                   },
                                                      color_0: Uint8Array,
                                                      amount_0: bigint,
                                                      coin_0: { nonce: Uint8Array,
                                                                color: Uint8Array,
                                                                value: bigint,
                                                                mt_index: bigint
                                                              },
                                                      nonce_value_0: bigint,
                                                      grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_append_inbox_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     sig_r_0: __compactRuntime.JubjubPoint,
                                     pk_0: __compactRuntime.JubjubPoint,
                                     entry_0: Uint8Array,
                                     nonce_value_0: bigint,
                                     grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_rotate_enc_key_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                       self_addr_0: { bytes: Uint8Array },
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       new_key_0: Uint8Array,
                                       nonce_value_0: bigint,
                                       grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_add_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                   self_addr_0: { bytes: Uint8Array },
                                   sig_r_0: __compactRuntime.JubjubPoint,
                                   pk_0: __compactRuntime.JubjubPoint,
                                   new_entry_0: Uint8Array,
                                   nonce_value_0: bigint,
                                   grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_remove_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      self_addr_0: { bytes: Uint8Array },
                                      sig_r_0: __compactRuntime.JubjubPoint,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      entry_0: Uint8Array,
                                      nonce_value_0: bigint,
                                      grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_unshielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                          self_addr_0: { bytes: Uint8Array },
                                          pk_0: __compactRuntime.Secp256k1Point,
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          recipient_0: { bytes: Uint8Array },
                                          nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                        self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256k1Point,
                                        recipient_0: { bytes: Uint8Array },
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        coin_0: { nonce: Uint8Array,
                                                  color: Uint8Array,
                                                  value: bigint,
                                                  mt_index: bigint
                                                },
                                        nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                                    self_addr_0: { bytes: Uint8Array
                                                                 },
                                                    pk_0: __compactRuntime.Secp256k1Point,
                                                    recipient_0: { bytes: Uint8Array
                                                                 },
                                                    color_0: Uint8Array,
                                                    amount_0: bigint,
                                                    coin_0: { nonce: Uint8Array,
                                                              color: Uint8Array,
                                                              value: bigint,
                                                              mt_index: bigint
                                                            },
                                                    nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_append_inbox_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                   self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   entry_0: Uint8Array,
                                   nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_rotate_enc_key_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     new_key_0: Uint8Array,
                                     nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_add_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                 self_addr_0: { bytes: Uint8Array },
                                 pk_0: __compactRuntime.Secp256k1Point,
                                 new_entry_0: Uint8Array,
                                 nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_remove_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    self_addr_0: { bytes: Uint8Array },
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    entry_0: Uint8Array,
                                    nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  deposit_unshielded(context: __compactRuntime.CircuitContext<PS>,
                     color_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                  color_0: Uint8Array,
                                  amount_0: bigint,
                                  recipient_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  use_counter_0: bigint,
                                  sig_r_0: __compactRuntime.JubjubPoint,
                                  sig_s_0: bigint,
                                  grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                use_counter_0: bigint,
                                sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  deposit_shielded(context: __compactRuntime.CircuitContext<PS>,
                   coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                           },
                   entry_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           entry_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  append_inbox_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                recipient_0: { bytes: Uint8Array },
                                color_0: Uint8Array,
                                amount_0: bigint,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                      value: { nonce: Uint8Array,
                                                                                                               color: Uint8Array,
                                                                                                               value: bigint
                                                                                                             }
                                                                                                    }>>;
  withdraw_shielded_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                              value: { nonce: Uint8Array,
                                                                                                                       color: Uint8Array,
                                                                                                                       value: bigint
                                                                                                                     }
                                                                                                            }>>;
  withdraw_shielded_to_contract_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                            recipient_0: { bytes: Uint8Array },
                                            color_0: Uint8Array,
                                            amount_0: bigint,
                                            pk_0: __compactRuntime.JubjubPoint,
                                            use_counter_0: bigint,
                                            sig_r_0: __compactRuntime.JubjubPoint,
                                            sig_s_0: bigint,
                                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                   color: Uint8Array,
                                                                                                                   value: bigint
                                                                                                                 },
                                                                                                                 { is_some: boolean,
                                                                                                                   value: { nonce: Uint8Array,
                                                                                                                            color: Uint8Array,
                                                                                                                            value: bigint
                                                                                                                          }
                                                                                                                 }]>>;
  withdraw_shielded_to_contract_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          pk_0: __compactRuntime.Secp256k1Point,
                                          use_counter_0: bigint,
                                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                                           color: Uint8Array,
                                                                                                                           value: bigint
                                                                                                                         },
                                                                                                                         { is_some: boolean,
                                                                                                                           value: { nonce: Uint8Array,
                                                                                                                                    color: Uint8Array,
                                                                                                                                    value: bigint
                                                                                                                                  }
                                                                                                                         }]>>;
  rotate_enc_key_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             new_key_0: Uint8Array,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           new_key_0: Uint8Array,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                         new_entry_0: Uint8Array,
                         pk_0: __compactRuntime.JubjubPoint,
                         use_counter_0: bigint,
                         sig_r_0: __compactRuntime.JubjubPoint,
                         sig_s_0: bigint,
                         grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                       new_entry_0: Uint8Array,
                       pk_0: __compactRuntime.Secp256k1Point,
                       use_counter_0: bigint,
                       sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                            entry_0: Uint8Array,
                            pk_0: __compactRuntime.JubjubPoint,
                            use_counter_0: bigint,
                            sig_r_0: __compactRuntime.JubjubPoint,
                            sig_s_0: bigint,
                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          pk_0: __compactRuntime.Secp256k1Point,
                          use_counter_0: bigint,
                          sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly round: bigint;
  readonly enc_key: Uint8Array;
  inbox: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly inbox_count: bigint;
  unshielded_balances: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly spec_version: bigint;
  devices: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly device_epoch: bigint;
  readonly device_count: bigint;
  readonly auth_nonce: bigint;
  readonly boot: Uint8Array;
  readonly booted: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initial_device_boot_0: Uint8Array,
               encryption_key_0: Uint8Array): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
