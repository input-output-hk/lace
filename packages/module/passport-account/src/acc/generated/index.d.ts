import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type GrantScope = { op_withdraw_unshielded: boolean;
                           op_withdraw_shielded: boolean;
                           op_withdraw_shielded_to_contract: boolean;
                           read: boolean;
                           object_commit: Uint8Array;
                           per_call_cap: bigint;
                           cap: bigint;
                           expires_at: bigint;
                           rp_commit: Uint8Array;
                           read_pk_hash: Uint8Array;
                           window_len: bigint;
                           window_cap: bigint;
                           caller_commit: Uint8Array
                         };

export type GrantRecord = { epoch: bigint;
                            gen: bigint;
                            issued_at: bigint;
                            nonce: bigint;
                            spent_commit: Uint8Array;
                            window_start: bigint;
                            window_spent: bigint;
                            active: boolean;
                            scope: GrantScope
                          };

export type WebAuthnPolicy = { rp_id_hash: Uint8Array; origin: Uint8Array };

export type Witnesses<PS> = {
  held_coin(context: __compactRuntime.WitnessContext<Ledger, PS>,
            color_0: Uint8Array): [PS, { nonce: Uint8Array,
                                         color: Uint8Array,
                                         value: bigint,
                                         mt_index: bigint
                                       }];
}

export type ImpureCircuits<PS> = {
  activate_initial_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256r1Point,
                                    salt_0: Uint8Array,
                                    policy_0: WebAuthnPolicy): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                          use_counter: bigint,
                                          policy: WebAuthnPolicy,
                                          authenticator_data: Uint8Array,
                                          sig: { r: bigint, s: bigint }
                                        }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                        value: { nonce: Uint8Array,
                                                                                                 color: Uint8Array,
                                                                                                 value: bigint
                                                                                               }
                                                                                      }>>;
  withdraw_shielded_to_contract_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                    use_counter: bigint,
                                                    policy: WebAuthnPolicy,
                                                    authenticator_data: Uint8Array,
                                                    sig: { r: bigint, s: bigint
                                                         }
                                                  }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   },
                                                                                                   { is_some: boolean,
                                                                                                     value: { nonce: Uint8Array,
                                                                                                              color: Uint8Array,
                                                                                                              value: bigint
                                                                                                            }
                                                                                                   }]>>;
  append_inbox_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           key_0: Uint8Array,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                       entry_0: Uint8Array,
                       auth_0: { pk: __compactRuntime.Secp256r1Point,
                                 use_counter: bigint,
                                 policy: WebAuthnPolicy,
                                 authenticator_data: Uint8Array,
                                 sig: { r: bigint, s: bigint }
                               }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                    use_counter: bigint,
                                    policy: WebAuthnPolicy,
                                    authenticator_data: Uint8Array,
                                    sig: { r: bigint, s: bigint }
                                  }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        auth_0: { pk: __compactRuntime.Secp256r1Point,
                                  use_counter: bigint,
                                  policy: WebAuthnPolicy,
                                  authenticator_data: Uint8Array,
                                  sig: { r: bigint, s: bigint }
                                }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     auth_0: { pk: __compactRuntime.Secp256r1Point,
                                               use_counter: bigint,
                                               policy: WebAuthnPolicy,
                                               authenticator_data: Uint8Array,
                                               sig: { r: bigint, s: bigint }
                                             }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                policy: WebAuthnPolicy,
                                                authenticator_data: Uint8Array,
                                                sig: { r: bigint, s: bigint }
                                              }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    auth_0: { pk: __compactRuntime.Secp256r1Point,
                                              policy: WebAuthnPolicy,
                                              authenticator_data: Uint8Array,
                                              sig: { r: bigint, s: bigint }
                                            }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                              value: { nonce: Uint8Array,
                                                                                                       color: Uint8Array,
                                                                                                       value: bigint
                                                                                                     }
                                                                                            }>>;
  withdraw_shielded_to_contract_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
                                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                          policy: WebAuthnPolicy,
                                                          authenticator_data: Uint8Array,
                                                          sig: { r: bigint,
                                                                 s: bigint
                                                               }
                                                        }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                           color: Uint8Array,
                                                                                                           value: bigint
                                                                                                         },
                                                                                                         { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         }]>>;
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array,
                                    envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                                sig_0: { r: bigint, s: bigint },
                                envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
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
                                          sig_0: { r: bigint, s: bigint },
                                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
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
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                       sig_0: { r: bigint, s: bigint },
                       envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                          sig_0: { r: bigint, s: bigint },
                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      pk_0: __compactRuntime.Secp256k1Point,
                                      envelope_0: bigint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    envelope_0: bigint,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                    value: { nonce: Uint8Array,
                                                                                                                             color: Uint8Array,
                                                                                                                             value: bigint
                                                                                                                           }
                                                                                                                  }>>;
  withdraw_shielded_to_contract_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                pk_0: __compactRuntime.Secp256k1Point,
                                                envelope_0: bigint,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
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
  withdraw_unshielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        recipient_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.JubjubPoint,
                                        origin_hash_0: Uint8Array,
                                        slot_0: bigint,
                                        scope_salt_0: Uint8Array,
                                        recipient_kind_0: bigint,
                                        pinned_recipient_0: Uint8Array,
                                        max_coin_value_0: bigint,
                                        spent_prev_0: bigint,
                                        sig_r_0: __compactRuntime.JubjubPoint,
                                        sig_s_0: bigint,
                                        grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      recipient_0: { bytes: Uint8Array },
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      change_entry_0: Uint8Array,
                                      enc_pk_0: Uint8Array,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_r_0: __compactRuntime.JubjubPoint,
                                      sig_s_0: bigint,
                                      grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                            value: { nonce: Uint8Array,
                                                                                                                     color: Uint8Array,
                                                                                                                     value: bigint
                                                                                                                   }
                                                                                                          }>>;
  withdraw_shielded_to_contract_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                  recipient_0: { bytes: Uint8Array
                                                               },
                                                  color_0: Uint8Array,
                                                  amount_0: bigint,
                                                  change_entry_0: Uint8Array,
                                                  enc_pk_0: Uint8Array,
                                                  pk_0: __compactRuntime.JubjubPoint,
                                                  origin_hash_0: Uint8Array,
                                                  slot_0: bigint,
                                                  scope_salt_0: Uint8Array,
                                                  recipient_kind_0: bigint,
                                                  pinned_recipient_0: Uint8Array,
                                                  max_coin_value_0: bigint,
                                                  spent_prev_0: bigint,
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
  issue_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        pk_0: __compactRuntime.Secp256k1Point,
                        use_counter_0: bigint,
                        sig_0: { r: bigint, s: bigint },
                        envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                          grant_id_0: Uint8Array,
                          op_withdraw_unshielded_0: boolean,
                          op_withdraw_shielded_0: boolean,
                          op_withdraw_shielded_to_contract_0: boolean,
                          read_0: boolean,
                          color_0: Uint8Array,
                          recipient_kind_0: bigint,
                          recipient_0: Uint8Array,
                          max_coin_value_0: bigint,
                          per_call_cap_0: bigint,
                          cap_0: bigint,
                          expires_at_0: bigint,
                          rp_id_hash_0: Uint8Array,
                          read_pk_hash_0: Uint8Array,
                          window_len_0: bigint,
                          window_cap_0: bigint,
                          caller_0: { is_some: boolean,
                                      value: { bytes: Uint8Array }
                                    },
                          scope_salt_0: Uint8Array,
                          pk_0: __compactRuntime.JubjubPoint,
                          use_counter_0: bigint,
                          sig_r_0: __compactRuntime.JubjubPoint,
                          sig_s_0: bigint,
                          grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           grant_id_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                       new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                       session_nonce_0: Uint8Array,
                                       phi_1_0: bigint,
                                       phi_2_0: bigint,
                                       phi_3_0: bigint,
                                       phi_4_0: bigint,
                                       phi_len_0: bigint,
                                       wrap_0: Uint8Array,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       use_counter_0: bigint,
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       sig_s_0: bigint,
                                       grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     use_counter_0: bigint,
                                     sig_0: { r: bigint, s: bigint },
                                     envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_submit(context: __compactRuntime.CircuitContext<PS>,
                 successor_pk_0: __compactRuntime.JubjubPoint,
                 successor_recovery_pk_0: __compactRuntime.JubjubPoint,
                 expected_epoch_0: bigint,
                 expected_nonce_0: bigint,
                 now_upper_0: bigint,
                 sig_r_recovery_0: __compactRuntime.JubjubPoint,
                 sig_s_recovery_0: bigint,
                 sig_r_successor_0: __compactRuntime.JubjubPoint,
                 sig_s_successor_0: bigint,
                 grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_finalise(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  activate_initial_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256r1Point,
                                    salt_0: Uint8Array,
                                    policy_0: WebAuthnPolicy): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                          use_counter: bigint,
                                          policy: WebAuthnPolicy,
                                          authenticator_data: Uint8Array,
                                          sig: { r: bigint, s: bigint }
                                        }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                        value: { nonce: Uint8Array,
                                                                                                 color: Uint8Array,
                                                                                                 value: bigint
                                                                                               }
                                                                                      }>>;
  withdraw_shielded_to_contract_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                    use_counter: bigint,
                                                    policy: WebAuthnPolicy,
                                                    authenticator_data: Uint8Array,
                                                    sig: { r: bigint, s: bigint
                                                         }
                                                  }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   },
                                                                                                   { is_some: boolean,
                                                                                                     value: { nonce: Uint8Array,
                                                                                                              color: Uint8Array,
                                                                                                              value: bigint
                                                                                                            }
                                                                                                   }]>>;
  append_inbox_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           key_0: Uint8Array,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                       entry_0: Uint8Array,
                       auth_0: { pk: __compactRuntime.Secp256r1Point,
                                 use_counter: bigint,
                                 policy: WebAuthnPolicy,
                                 authenticator_data: Uint8Array,
                                 sig: { r: bigint, s: bigint }
                               }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                    use_counter: bigint,
                                    policy: WebAuthnPolicy,
                                    authenticator_data: Uint8Array,
                                    sig: { r: bigint, s: bigint }
                                  }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        auth_0: { pk: __compactRuntime.Secp256r1Point,
                                  use_counter: bigint,
                                  policy: WebAuthnPolicy,
                                  authenticator_data: Uint8Array,
                                  sig: { r: bigint, s: bigint }
                                }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     auth_0: { pk: __compactRuntime.Secp256r1Point,
                                               use_counter: bigint,
                                               policy: WebAuthnPolicy,
                                               authenticator_data: Uint8Array,
                                               sig: { r: bigint, s: bigint }
                                             }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                policy: WebAuthnPolicy,
                                                authenticator_data: Uint8Array,
                                                sig: { r: bigint, s: bigint }
                                              }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    auth_0: { pk: __compactRuntime.Secp256r1Point,
                                              policy: WebAuthnPolicy,
                                              authenticator_data: Uint8Array,
                                              sig: { r: bigint, s: bigint }
                                            }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                              value: { nonce: Uint8Array,
                                                                                                       color: Uint8Array,
                                                                                                       value: bigint
                                                                                                     }
                                                                                            }>>;
  withdraw_shielded_to_contract_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
                                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                          policy: WebAuthnPolicy,
                                                          authenticator_data: Uint8Array,
                                                          sig: { r: bigint,
                                                                 s: bigint
                                                               }
                                                        }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                           color: Uint8Array,
                                                                                                           value: bigint
                                                                                                         },
                                                                                                         { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         }]>>;
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array,
                                    envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                                sig_0: { r: bigint, s: bigint },
                                envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
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
                                          sig_0: { r: bigint, s: bigint },
                                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
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
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                       sig_0: { r: bigint, s: bigint },
                       envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                          sig_0: { r: bigint, s: bigint },
                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_unshielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      pk_0: __compactRuntime.Secp256k1Point,
                                      envelope_0: bigint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    envelope_0: bigint,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                    value: { nonce: Uint8Array,
                                                                                                                             color: Uint8Array,
                                                                                                                             value: bigint
                                                                                                                           }
                                                                                                                  }>>;
  withdraw_shielded_to_contract_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                pk_0: __compactRuntime.Secp256k1Point,
                                                envelope_0: bigint,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
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
  withdraw_unshielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        recipient_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.JubjubPoint,
                                        origin_hash_0: Uint8Array,
                                        slot_0: bigint,
                                        scope_salt_0: Uint8Array,
                                        recipient_kind_0: bigint,
                                        pinned_recipient_0: Uint8Array,
                                        max_coin_value_0: bigint,
                                        spent_prev_0: bigint,
                                        sig_r_0: __compactRuntime.JubjubPoint,
                                        sig_s_0: bigint,
                                        grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      recipient_0: { bytes: Uint8Array },
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      change_entry_0: Uint8Array,
                                      enc_pk_0: Uint8Array,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_r_0: __compactRuntime.JubjubPoint,
                                      sig_s_0: bigint,
                                      grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                            value: { nonce: Uint8Array,
                                                                                                                     color: Uint8Array,
                                                                                                                     value: bigint
                                                                                                                   }
                                                                                                          }>>;
  withdraw_shielded_to_contract_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                  recipient_0: { bytes: Uint8Array
                                                               },
                                                  color_0: Uint8Array,
                                                  amount_0: bigint,
                                                  change_entry_0: Uint8Array,
                                                  enc_pk_0: Uint8Array,
                                                  pk_0: __compactRuntime.JubjubPoint,
                                                  origin_hash_0: Uint8Array,
                                                  slot_0: bigint,
                                                  scope_salt_0: Uint8Array,
                                                  recipient_kind_0: bigint,
                                                  pinned_recipient_0: Uint8Array,
                                                  max_coin_value_0: bigint,
                                                  spent_prev_0: bigint,
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
  issue_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        pk_0: __compactRuntime.Secp256k1Point,
                        use_counter_0: bigint,
                        sig_0: { r: bigint, s: bigint },
                        envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                          grant_id_0: Uint8Array,
                          op_withdraw_unshielded_0: boolean,
                          op_withdraw_shielded_0: boolean,
                          op_withdraw_shielded_to_contract_0: boolean,
                          read_0: boolean,
                          color_0: Uint8Array,
                          recipient_kind_0: bigint,
                          recipient_0: Uint8Array,
                          max_coin_value_0: bigint,
                          per_call_cap_0: bigint,
                          cap_0: bigint,
                          expires_at_0: bigint,
                          rp_id_hash_0: Uint8Array,
                          read_pk_hash_0: Uint8Array,
                          window_len_0: bigint,
                          window_cap_0: bigint,
                          caller_0: { is_some: boolean,
                                      value: { bytes: Uint8Array }
                                    },
                          scope_salt_0: Uint8Array,
                          pk_0: __compactRuntime.JubjubPoint,
                          use_counter_0: bigint,
                          sig_r_0: __compactRuntime.JubjubPoint,
                          sig_s_0: bigint,
                          grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           grant_id_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                       new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                       session_nonce_0: Uint8Array,
                                       phi_1_0: bigint,
                                       phi_2_0: bigint,
                                       phi_3_0: bigint,
                                       phi_4_0: bigint,
                                       phi_len_0: bigint,
                                       wrap_0: Uint8Array,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       use_counter_0: bigint,
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       sig_s_0: bigint,
                                       grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     use_counter_0: bigint,
                                     sig_0: { r: bigint, s: bigint },
                                     envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_submit(context: __compactRuntime.CircuitContext<PS>,
                 successor_pk_0: __compactRuntime.JubjubPoint,
                 successor_recovery_pk_0: __compactRuntime.JubjubPoint,
                 expected_epoch_0: bigint,
                 expected_nonce_0: bigint,
                 now_upper_0: bigint,
                 sig_r_recovery_0: __compactRuntime.JubjubPoint,
                 sig_s_recovery_0: bigint,
                 sig_r_successor_0: __compactRuntime.JubjubPoint,
                 sig_s_successor_0: bigint,
                 grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_finalise(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
  webauthn_challenge_base64(challenge_0: Uint8Array): Uint8Array;
  webauthn_client_data_hash(challenge_0: Uint8Array, origin_0: Uint8Array): Uint8Array;
  compute_public_point_with_p256(scalar_0: bigint): __compactRuntime.Secp256r1Point;
  derive_boot_commitment_with_p256(salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   policy_0: WebAuthnPolicy): Uint8Array;
  derive_device_entry_with_p256(self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256r1Point,
                                policy_0: WebAuthnPolicy,
                                epoch_0: bigint,
                                counter_0: bigint): Uint8Array;
  challenge_withdraw_unshielded_with_p256(self_addr_0: { bytes: Uint8Array },
                                          pk_0: __compactRuntime.Secp256r1Point,
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          recipient_0: { bytes: Uint8Array },
                                          nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_p256(self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256r1Point,
                                        recipient_0: { bytes: Uint8Array },
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        coin_0: { nonce: Uint8Array,
                                                  color: Uint8Array,
                                                  value: bigint,
                                                  mt_index: bigint
                                                },
                                        nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_p256(self_addr_0: { bytes: Uint8Array
                                                                 },
                                                    pk_0: __compactRuntime.Secp256r1Point,
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
  challenge_append_inbox_with_p256(self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   entry_0: Uint8Array,
                                   nonce_value_0: bigint): Uint8Array;
  challenge_rotate_enc_key_with_p256(self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256r1Point,
                                     key_0: Uint8Array,
                                     nonce_value_0: bigint): Uint8Array;
  challenge_add_device_with_p256(self_addr_0: { bytes: Uint8Array },
                                 pk_0: __compactRuntime.Secp256r1Point,
                                 entry_0: Uint8Array,
                                 nonce_value_0: bigint): Uint8Array;
  challenge_remove_device_with_p256(self_addr_0: { bytes: Uint8Array },
                                    pk_0: __compactRuntime.Secp256r1Point,
                                    entry_0: Uint8Array,
                                    nonce_value_0: bigint): Uint8Array;
  challenge_issue_grant_with_p256(self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.Secp256r1Point,
                                  id_0: Uint8Array,
                                  digest_0: Uint8Array,
                                  nonce_value_0: bigint): Uint8Array;
  challenge_revoke_grant_with_p256(self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   id_0: Uint8Array,
                                   nonce_value_0: bigint): Uint8Array;
  challenge_revoke_all_grants_with_p256(self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256r1Point,
                                        nonce_value_0: bigint): Uint8Array;
  challenge_publish_recovery_session_with_p256(self_addr_0: { bytes: Uint8Array
                                                            },
                                               pk_0: __compactRuntime.Secp256r1Point,
                                               new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                               session_nonce_0: Uint8Array,
                                               phi_1_0: bigint,
                                               phi_2_0: bigint,
                                               phi_3_0: bigint,
                                               phi_4_0: bigint,
                                               phi_len_0: bigint,
                                               wrap_0: Uint8Array,
                                               nonce_value_0: bigint): Uint8Array;
  challenge_recover_cancel_with_p256(self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256r1Point,
                                     nonce_value_0: bigint): Uint8Array;
  derive_grant_id_with_p256(self_addr_0: { bytes: Uint8Array },
                            pk_0: __compactRuntime.Secp256r1Point,
                            origin_hash_0: Uint8Array,
                            slot_0: bigint): Uint8Array;
  challenge_withdraw_unshielded_with_grant_p256(self_addr_0: { bytes: Uint8Array
                                                             },
                                                pk_0: __compactRuntime.Secp256r1Point,
                                                id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_grant_p256(self_addr_0: { bytes: Uint8Array },
                                              pk_0: __compactRuntime.Secp256r1Point,
                                              id_0: Uint8Array,
                                              issued_at_0: bigint,
                                              recipient_0: { bytes: Uint8Array },
                                              color_0: Uint8Array,
                                              amount_0: bigint,
                                              change_entry_0: Uint8Array,
                                              enc_pk_0: Uint8Array,
                                              coin_0: { nonce: Uint8Array,
                                                        color: Uint8Array,
                                                        value: bigint,
                                                        mt_index: bigint
                                                      },
                                              nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_grant_p256(self_addr_0: { bytes: Uint8Array
                                                                       },
                                                          pk_0: __compactRuntime.Secp256r1Point,
                                                          id_0: Uint8Array,
                                                          issued_at_0: bigint,
                                                          recipient_0: { bytes: Uint8Array
                                                                       },
                                                          color_0: Uint8Array,
                                                          amount_0: bigint,
                                                          change_entry_0: Uint8Array,
                                                          enc_pk_0: Uint8Array,
                                                          coin_0: { nonce: Uint8Array,
                                                                    color: Uint8Array,
                                                                    value: bigint,
                                                                    mt_index: bigint
                                                                  },
                                                          nonce_value_0: bigint): Uint8Array;
  derive_boot_commitment_with_jubjub(salt_0: Uint8Array,
                                     pk_0: __compactRuntime.JubjubPoint): Uint8Array;
  derive_boot_commitment_with_k256(salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   envelope_0: bigint): Uint8Array;
  derive_device_entry_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  epoch_0: bigint,
                                  counter_0: bigint): Uint8Array;
  derive_device_entry_with_k256(self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                envelope_0: bigint,
                                epoch_0: bigint,
                                counter_0: bigint): Uint8Array;
  envelope_digest(envelope_0: bigint, challenge_0: Uint8Array): Uint8Array;
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
  derive_grant_id_with_k256(self_addr_0: { bytes: Uint8Array },
                            pk_0: __compactRuntime.Secp256k1Point,
                            envelope_0: bigint,
                            origin_hash_0: Uint8Array,
                            slot_0: bigint): Uint8Array;
  derive_grant_id_with_jubjub(self_addr_0: { bytes: Uint8Array },
                              pk_0: __compactRuntime.JubjubPoint,
                              origin_hash_0: Uint8Array,
                              slot_0: bigint): Uint8Array;
  derive_grant_object_commit(scope_salt_0: Uint8Array,
                             color_0: Uint8Array,
                             recipient_kind_0: bigint,
                             recipient_0: Uint8Array,
                             max_coin_value_0: bigint): Uint8Array;
  derive_grant_spent_commit(scope_salt_0: Uint8Array, spent_0: bigint): Uint8Array;
  derive_grant_rp_commit(scope_salt_0: Uint8Array, rp_id_hash_0: Uint8Array): Uint8Array;
  derive_grant_caller_commit(scope_salt_0: Uint8Array,
                             caller_0: { is_some: boolean,
                                         value: { bytes: Uint8Array }
                                       }): Uint8Array;
  derive_grant_scope_digest(scope_salt_0: Uint8Array,
                            op_withdraw_unshielded_0: boolean,
                            op_withdraw_shielded_0: boolean,
                            op_withdraw_shielded_to_contract_0: boolean,
                            read_0: boolean,
                            color_0: Uint8Array,
                            recipient_kind_0: bigint,
                            recipient_0: Uint8Array,
                            max_coin_value_0: bigint,
                            per_call_cap_0: bigint,
                            cap_0: bigint,
                            expires_at_0: bigint,
                            rp_id_hash_0: Uint8Array,
                            read_pk_hash_0: Uint8Array,
                            window_len_0: bigint,
                            window_cap_0: bigint,
                            caller_0: { is_some: boolean,
                                        value: { bytes: Uint8Array }
                                      }): Uint8Array;
  challenge_withdraw_unshielded_with_grant_k256(self_addr_0: { bytes: Uint8Array
                                                             },
                                                pk_0: __compactRuntime.Secp256k1Point,
                                                grant_id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_grant_k256(self_addr_0: { bytes: Uint8Array },
                                              pk_0: __compactRuntime.Secp256k1Point,
                                              grant_id_0: Uint8Array,
                                              issued_at_0: bigint,
                                              recipient_0: { bytes: Uint8Array },
                                              color_0: Uint8Array,
                                              amount_0: bigint,
                                              change_entry_0: Uint8Array,
                                              enc_pk_0: Uint8Array,
                                              coin_0: { nonce: Uint8Array,
                                                        color: Uint8Array,
                                                        value: bigint,
                                                        mt_index: bigint
                                                      },
                                              nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_grant_k256(self_addr_0: { bytes: Uint8Array
                                                                       },
                                                          pk_0: __compactRuntime.Secp256k1Point,
                                                          grant_id_0: Uint8Array,
                                                          issued_at_0: bigint,
                                                          recipient_0: { bytes: Uint8Array
                                                                       },
                                                          color_0: Uint8Array,
                                                          amount_0: bigint,
                                                          change_entry_0: Uint8Array,
                                                          enc_pk_0: Uint8Array,
                                                          coin_0: { nonce: Uint8Array,
                                                                    color: Uint8Array,
                                                                    value: bigint,
                                                                    mt_index: bigint
                                                                  },
                                                          nonce_value_0: bigint): Uint8Array;
  challenge_withdraw_unshielded_with_grant_jubjub(self_addr_0: { bytes: Uint8Array
                                                               },
                                                  sig_r_0: __compactRuntime.JubjubPoint,
                                                  pk_0: __compactRuntime.JubjubPoint,
                                                  grant_id_0: Uint8Array,
                                                  issued_at_0: bigint,
                                                  color_0: Uint8Array,
                                                  amount_0: bigint,
                                                  recipient_0: { bytes: Uint8Array
                                                               },
                                                  nonce_value_0: bigint,
                                                  grind_nonce_0: bigint): Uint8Array;
  challenge_withdraw_shielded_with_grant_jubjub(self_addr_0: { bytes: Uint8Array
                                                             },
                                                sig_r_0: __compactRuntime.JubjubPoint,
                                                pk_0: __compactRuntime.JubjubPoint,
                                                grant_id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                coin_0: { nonce: Uint8Array,
                                                          color: Uint8Array,
                                                          value: bigint,
                                                          mt_index: bigint
                                                        },
                                                nonce_value_0: bigint,
                                                grind_nonce_0: bigint): Uint8Array;
  challenge_withdraw_shielded_to_contract_with_grant_jubjub(self_addr_0: { bytes: Uint8Array
                                                                         },
                                                            sig_r_0: __compactRuntime.JubjubPoint,
                                                            pk_0: __compactRuntime.JubjubPoint,
                                                            grant_id_0: Uint8Array,
                                                            issued_at_0: bigint,
                                                            recipient_0: { bytes: Uint8Array
                                                                         },
                                                            color_0: Uint8Array,
                                                            amount_0: bigint,
                                                            change_entry_0: Uint8Array,
                                                            enc_pk_0: Uint8Array,
                                                            coin_0: { nonce: Uint8Array,
                                                                      color: Uint8Array,
                                                                      value: bigint,
                                                                      mt_index: bigint
                                                                    },
                                                            nonce_value_0: bigint,
                                                            grind_nonce_0: bigint): Uint8Array;
  challenge_issue_grant_with_k256(self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.Secp256k1Point,
                                  grant_id_0: Uint8Array,
                                  scope_digest_0: Uint8Array,
                                  nonce_value_0: bigint): Uint8Array;
  challenge_revoke_grant_with_k256(self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   grant_id_0: Uint8Array,
                                   nonce_value_0: bigint): Uint8Array;
  challenge_revoke_all_grants_with_k256(self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256k1Point,
                                        nonce_value_0: bigint): Uint8Array;
  challenge_issue_grant_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                    sig_r_0: __compactRuntime.JubjubPoint,
                                    pk_0: __compactRuntime.JubjubPoint,
                                    grant_id_0: Uint8Array,
                                    scope_digest_0: Uint8Array,
                                    nonce_value_0: bigint,
                                    grind_nonce_0: bigint): Uint8Array;
  challenge_revoke_grant_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                     sig_r_0: __compactRuntime.JubjubPoint,
                                     pk_0: __compactRuntime.JubjubPoint,
                                     grant_id_0: Uint8Array,
                                     nonce_value_0: bigint,
                                     grind_nonce_0: bigint): Uint8Array;
  challenge_revoke_all_grants_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                          sig_r_0: __compactRuntime.JubjubPoint,
                                          pk_0: __compactRuntime.JubjubPoint,
                                          nonce_value_0: bigint,
                                          grind_nonce_0: bigint): Uint8Array;
  challenge_recover_submit(self_addr_0: { bytes: Uint8Array },
                           recovery_key_0: __compactRuntime.JubjubPoint,
                           sig_r_recovery_0: __compactRuntime.JubjubPoint,
                           successor_pk_0: __compactRuntime.JubjubPoint,
                           sig_r_successor_0: __compactRuntime.JubjubPoint,
                           successor_recovery_pk_0: __compactRuntime.JubjubPoint,
                           post_epoch_0: bigint,
                           nonce_value_0: bigint,
                           now_upper_0: bigint,
                           grind_nonce_0: bigint): Uint8Array;
  challenge_publish_recovery_session_with_jubjub(self_addr_0: { bytes: Uint8Array
                                                              },
                                                 sig_r_0: __compactRuntime.JubjubPoint,
                                                 pk_0: __compactRuntime.JubjubPoint,
                                                 new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                                 session_nonce_0: Uint8Array,
                                                 phi_1_0: bigint,
                                                 phi_2_0: bigint,
                                                 phi_3_0: bigint,
                                                 phi_4_0: bigint,
                                                 phi_len_0: bigint,
                                                 wrap_0: Uint8Array,
                                                 nonce_value_0: bigint,
                                                 grind_nonce_0: bigint): Uint8Array;
  challenge_publish_recovery_session_with_k256(self_addr_0: { bytes: Uint8Array
                                                            },
                                               pk_0: __compactRuntime.Secp256k1Point,
                                               new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                               session_nonce_0: Uint8Array,
                                               phi_1_0: bigint,
                                               phi_2_0: bigint,
                                               phi_3_0: bigint,
                                               phi_4_0: bigint,
                                               phi_len_0: bigint,
                                               wrap_0: Uint8Array,
                                               nonce_value_0: bigint): Uint8Array;
  challenge_recover_cancel_with_jubjub(self_addr_0: { bytes: Uint8Array },
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       nonce_value_0: bigint,
                                       grind_nonce_0: bigint): Uint8Array;
  challenge_recover_cancel_with_k256(self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     nonce_value_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  webauthn_challenge_base64(context: __compactRuntime.CircuitContext<PS>,
                            challenge_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  webauthn_client_data_hash(context: __compactRuntime.CircuitContext<PS>,
                            challenge_0: Uint8Array,
                            origin_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  compute_public_point_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                 scalar_0: bigint): Promise<__compactRuntime.CircuitResults<PS, __compactRuntime.Secp256r1Point>>;
  derive_boot_commitment_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                   salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   policy_0: WebAuthnPolicy): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_device_entry_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256r1Point,
                                policy_0: WebAuthnPolicy,
                                epoch_0: bigint,
                                counter_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  activate_initial_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256r1Point,
                                    salt_0: Uint8Array,
                                    policy_0: WebAuthnPolicy): Promise<__compactRuntime.CircuitResults<PS, []>>;
  challenge_withdraw_unshielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                          self_addr_0: { bytes: Uint8Array },
                                          pk_0: __compactRuntime.Secp256r1Point,
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          recipient_0: { bytes: Uint8Array },
                                          nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                        self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256r1Point,
                                        recipient_0: { bytes: Uint8Array },
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        coin_0: { nonce: Uint8Array,
                                                  color: Uint8Array,
                                                  value: bigint,
                                                  mt_index: bigint
                                                },
                                        nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                                    self_addr_0: { bytes: Uint8Array
                                                                 },
                                                    pk_0: __compactRuntime.Secp256r1Point,
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
  challenge_append_inbox_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                   self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   entry_0: Uint8Array,
                                   nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_rotate_enc_key_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256r1Point,
                                     key_0: Uint8Array,
                                     nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_add_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                 self_addr_0: { bytes: Uint8Array },
                                 pk_0: __compactRuntime.Secp256r1Point,
                                 entry_0: Uint8Array,
                                 nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_remove_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                    self_addr_0: { bytes: Uint8Array },
                                    pk_0: __compactRuntime.Secp256r1Point,
                                    entry_0: Uint8Array,
                                    nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_issue_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                  self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.Secp256r1Point,
                                  id_0: Uint8Array,
                                  digest_0: Uint8Array,
                                  nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                   self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256r1Point,
                                   id_0: Uint8Array,
                                   nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_all_grants_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                        self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256r1Point,
                                        nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_publish_recovery_session_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                               self_addr_0: { bytes: Uint8Array
                                                            },
                                               pk_0: __compactRuntime.Secp256r1Point,
                                               new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                               session_nonce_0: Uint8Array,
                                               phi_1_0: bigint,
                                               phi_2_0: bigint,
                                               phi_3_0: bigint,
                                               phi_4_0: bigint,
                                               phi_len_0: bigint,
                                               wrap_0: Uint8Array,
                                               nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_recover_cancel_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256r1Point,
                                     nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  withdraw_unshielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                color_0: Uint8Array,
                                amount_0: bigint,
                                recipient_0: { bytes: Uint8Array },
                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                          use_counter: bigint,
                                          policy: WebAuthnPolicy,
                                          authenticator_data: Uint8Array,
                                          sig: { r: bigint, s: bigint }
                                        }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              recipient_0: { bytes: Uint8Array },
                              color_0: Uint8Array,
                              amount_0: bigint,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                        value: { nonce: Uint8Array,
                                                                                                 color: Uint8Array,
                                                                                                 value: bigint
                                                                                               }
                                                                                      }>>;
  withdraw_shielded_to_contract_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                          recipient_0: { bytes: Uint8Array },
                                          color_0: Uint8Array,
                                          amount_0: bigint,
                                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                    use_counter: bigint,
                                                    policy: WebAuthnPolicy,
                                                    authenticator_data: Uint8Array,
                                                    sig: { r: bigint, s: bigint
                                                         }
                                                  }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   },
                                                                                                   { is_some: boolean,
                                                                                                     value: { nonce: Uint8Array,
                                                                                                              color: Uint8Array,
                                                                                                              value: bigint
                                                                                                            }
                                                                                                   }]>>;
  append_inbox_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         entry_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  rotate_enc_key_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           key_0: Uint8Array,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  add_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                       entry_0: Uint8Array,
                       auth_0: { pk: __compactRuntime.Secp256r1Point,
                                 use_counter: bigint,
                                 policy: WebAuthnPolicy,
                                 authenticator_data: Uint8Array,
                                 sig: { r: bigint, s: bigint }
                               }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  remove_device_with_p256(context: __compactRuntime.CircuitContext<PS>,
                          entry_0: Uint8Array,
                          auth_0: { pk: __compactRuntime.Secp256r1Point,
                                    use_counter: bigint,
                                    policy: WebAuthnPolicy,
                                    authenticator_data: Uint8Array,
                                    sig: { r: bigint, s: bigint }
                                  }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        auth_0: { pk: __compactRuntime.Secp256r1Point,
                                  use_counter: bigint,
                                  policy: WebAuthnPolicy,
                                  authenticator_data: Uint8Array,
                                  sig: { r: bigint, s: bigint }
                                }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_p256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         auth_0: { pk: __compactRuntime.Secp256r1Point,
                                   use_counter: bigint,
                                   policy: WebAuthnPolicy,
                                   authenticator_data: Uint8Array,
                                   sig: { r: bigint, s: bigint }
                                 }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_p256(context: __compactRuntime.CircuitContext<PS>,
                              auth_0: { pk: __compactRuntime.Secp256r1Point,
                                        use_counter: bigint,
                                        policy: WebAuthnPolicy,
                                        authenticator_data: Uint8Array,
                                        sig: { r: bigint, s: bigint }
                                      }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_p256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     auth_0: { pk: __compactRuntime.Secp256r1Point,
                                               use_counter: bigint,
                                               policy: WebAuthnPolicy,
                                               authenticator_data: Uint8Array,
                                               sig: { r: bigint, s: bigint }
                                             }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_p256(context: __compactRuntime.CircuitContext<PS>,
                           auth_0: { pk: __compactRuntime.Secp256r1Point,
                                     use_counter: bigint,
                                     policy: WebAuthnPolicy,
                                     authenticator_data: Uint8Array,
                                     sig: { r: bigint, s: bigint }
                                   }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  derive_grant_id_with_p256(context: __compactRuntime.CircuitContext<PS>,
                            self_addr_0: { bytes: Uint8Array },
                            pk_0: __compactRuntime.Secp256r1Point,
                            origin_hash_0: Uint8Array,
                            slot_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_unshielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                                self_addr_0: { bytes: Uint8Array
                                                             },
                                                pk_0: __compactRuntime.Secp256r1Point,
                                                id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                              self_addr_0: { bytes: Uint8Array },
                                              pk_0: __compactRuntime.Secp256r1Point,
                                              id_0: Uint8Array,
                                              issued_at_0: bigint,
                                              recipient_0: { bytes: Uint8Array },
                                              color_0: Uint8Array,
                                              amount_0: bigint,
                                              change_entry_0: Uint8Array,
                                              enc_pk_0: Uint8Array,
                                              coin_0: { nonce: Uint8Array,
                                                        color: Uint8Array,
                                                        value: bigint,
                                                        mt_index: bigint
                                                      },
                                              nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                                          self_addr_0: { bytes: Uint8Array
                                                                       },
                                                          pk_0: __compactRuntime.Secp256r1Point,
                                                          id_0: Uint8Array,
                                                          issued_at_0: bigint,
                                                          recipient_0: { bytes: Uint8Array
                                                                       },
                                                          color_0: Uint8Array,
                                                          amount_0: bigint,
                                                          change_entry_0: Uint8Array,
                                                          enc_pk_0: Uint8Array,
                                                          coin_0: { nonce: Uint8Array,
                                                                    color: Uint8Array,
                                                                    value: bigint,
                                                                    mt_index: bigint
                                                                  },
                                                          nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  withdraw_unshielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                policy: WebAuthnPolicy,
                                                authenticator_data: Uint8Array,
                                                sig: { r: bigint, s: bigint }
                                              }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    auth_0: { pk: __compactRuntime.Secp256r1Point,
                                              policy: WebAuthnPolicy,
                                              authenticator_data: Uint8Array,
                                              sig: { r: bigint, s: bigint }
                                            }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                              value: { nonce: Uint8Array,
                                                                                                       color: Uint8Array,
                                                                                                       value: bigint
                                                                                                     }
                                                                                            }>>;
  withdraw_shielded_to_contract_with_grant_p256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
                                                auth_0: { pk: __compactRuntime.Secp256r1Point,
                                                          policy: WebAuthnPolicy,
                                                          authenticator_data: Uint8Array,
                                                          sig: { r: bigint,
                                                                 s: bigint
                                                               }
                                                        }): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                                           color: Uint8Array,
                                                                                                           value: bigint
                                                                                                         },
                                                                                                         { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         }]>>;
  activate_initial_device_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  activate_initial_device_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    salt_0: Uint8Array,
                                    envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  derive_boot_commitment_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                     salt_0: Uint8Array,
                                     pk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_boot_commitment_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                   salt_0: Uint8Array,
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_device_entry_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                  self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.JubjubPoint,
                                  epoch_0: bigint,
                                  counter_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_device_entry_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                self_addr_0: { bytes: Uint8Array },
                                pk_0: __compactRuntime.Secp256k1Point,
                                envelope_0: bigint,
                                epoch_0: bigint,
                                counter_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  envelope_digest(context: __compactRuntime.CircuitContext<PS>,
                  envelope_0: bigint,
                  challenge_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
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
                                sig_0: { r: bigint, s: bigint },
                                envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
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
                                          sig_0: { r: bigint, s: bigint },
                                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
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
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                       sig_0: { r: bigint, s: bigint },
                       envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
                          sig_0: { r: bigint, s: bigint },
                          envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  derive_grant_id_with_k256(context: __compactRuntime.CircuitContext<PS>,
                            self_addr_0: { bytes: Uint8Array },
                            pk_0: __compactRuntime.Secp256k1Point,
                            envelope_0: bigint,
                            origin_hash_0: Uint8Array,
                            slot_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_id_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                              self_addr_0: { bytes: Uint8Array },
                              pk_0: __compactRuntime.JubjubPoint,
                              origin_hash_0: Uint8Array,
                              slot_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_object_commit(context: __compactRuntime.CircuitContext<PS>,
                             scope_salt_0: Uint8Array,
                             color_0: Uint8Array,
                             recipient_kind_0: bigint,
                             recipient_0: Uint8Array,
                             max_coin_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_spent_commit(context: __compactRuntime.CircuitContext<PS>,
                            scope_salt_0: Uint8Array,
                            spent_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_rp_commit(context: __compactRuntime.CircuitContext<PS>,
                         scope_salt_0: Uint8Array,
                         rp_id_hash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_caller_commit(context: __compactRuntime.CircuitContext<PS>,
                             scope_salt_0: Uint8Array,
                             caller_0: { is_some: boolean,
                                         value: { bytes: Uint8Array }
                                       }): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  derive_grant_scope_digest(context: __compactRuntime.CircuitContext<PS>,
                            scope_salt_0: Uint8Array,
                            op_withdraw_unshielded_0: boolean,
                            op_withdraw_shielded_0: boolean,
                            op_withdraw_shielded_to_contract_0: boolean,
                            read_0: boolean,
                            color_0: Uint8Array,
                            recipient_kind_0: bigint,
                            recipient_0: Uint8Array,
                            max_coin_value_0: bigint,
                            per_call_cap_0: bigint,
                            cap_0: bigint,
                            expires_at_0: bigint,
                            rp_id_hash_0: Uint8Array,
                            read_pk_hash_0: Uint8Array,
                            window_len_0: bigint,
                            window_cap_0: bigint,
                            caller_0: { is_some: boolean,
                                        value: { bytes: Uint8Array }
                                      }): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_unshielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                                self_addr_0: { bytes: Uint8Array
                                                             },
                                                pk_0: __compactRuntime.Secp256k1Point,
                                                grant_id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                              self_addr_0: { bytes: Uint8Array },
                                              pk_0: __compactRuntime.Secp256k1Point,
                                              grant_id_0: Uint8Array,
                                              issued_at_0: bigint,
                                              recipient_0: { bytes: Uint8Array },
                                              color_0: Uint8Array,
                                              amount_0: bigint,
                                              change_entry_0: Uint8Array,
                                              enc_pk_0: Uint8Array,
                                              coin_0: { nonce: Uint8Array,
                                                        color: Uint8Array,
                                                        value: bigint,
                                                        mt_index: bigint
                                                      },
                                              nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                                          self_addr_0: { bytes: Uint8Array
                                                                       },
                                                          pk_0: __compactRuntime.Secp256k1Point,
                                                          grant_id_0: Uint8Array,
                                                          issued_at_0: bigint,
                                                          recipient_0: { bytes: Uint8Array
                                                                       },
                                                          color_0: Uint8Array,
                                                          amount_0: bigint,
                                                          change_entry_0: Uint8Array,
                                                          enc_pk_0: Uint8Array,
                                                          coin_0: { nonce: Uint8Array,
                                                                    color: Uint8Array,
                                                                    value: bigint,
                                                                    mt_index: bigint
                                                                  },
                                                          nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_unshielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                  self_addr_0: { bytes: Uint8Array
                                                               },
                                                  sig_r_0: __compactRuntime.JubjubPoint,
                                                  pk_0: __compactRuntime.JubjubPoint,
                                                  grant_id_0: Uint8Array,
                                                  issued_at_0: bigint,
                                                  color_0: Uint8Array,
                                                  amount_0: bigint,
                                                  recipient_0: { bytes: Uint8Array
                                                               },
                                                  nonce_value_0: bigint,
                                                  grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                self_addr_0: { bytes: Uint8Array
                                                             },
                                                sig_r_0: __compactRuntime.JubjubPoint,
                                                pk_0: __compactRuntime.JubjubPoint,
                                                grant_id_0: Uint8Array,
                                                issued_at_0: bigint,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                coin_0: { nonce: Uint8Array,
                                                          color: Uint8Array,
                                                          value: bigint,
                                                          mt_index: bigint
                                                        },
                                                nonce_value_0: bigint,
                                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_withdraw_shielded_to_contract_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                            self_addr_0: { bytes: Uint8Array
                                                                         },
                                                            sig_r_0: __compactRuntime.JubjubPoint,
                                                            pk_0: __compactRuntime.JubjubPoint,
                                                            grant_id_0: Uint8Array,
                                                            issued_at_0: bigint,
                                                            recipient_0: { bytes: Uint8Array
                                                                         },
                                                            color_0: Uint8Array,
                                                            amount_0: bigint,
                                                            change_entry_0: Uint8Array,
                                                            enc_pk_0: Uint8Array,
                                                            coin_0: { nonce: Uint8Array,
                                                                      color: Uint8Array,
                                                                      value: bigint,
                                                                      mt_index: bigint
                                                                    },
                                                            nonce_value_0: bigint,
                                                            grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_issue_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                  self_addr_0: { bytes: Uint8Array },
                                  pk_0: __compactRuntime.Secp256k1Point,
                                  grant_id_0: Uint8Array,
                                  scope_digest_0: Uint8Array,
                                  nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                   self_addr_0: { bytes: Uint8Array },
                                   pk_0: __compactRuntime.Secp256k1Point,
                                   grant_id_0: Uint8Array,
                                   nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_all_grants_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                        self_addr_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.Secp256k1Point,
                                        nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_issue_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                    self_addr_0: { bytes: Uint8Array },
                                    sig_r_0: __compactRuntime.JubjubPoint,
                                    pk_0: __compactRuntime.JubjubPoint,
                                    grant_id_0: Uint8Array,
                                    scope_digest_0: Uint8Array,
                                    nonce_value_0: bigint,
                                    grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     sig_r_0: __compactRuntime.JubjubPoint,
                                     pk_0: __compactRuntime.JubjubPoint,
                                     grant_id_0: Uint8Array,
                                     nonce_value_0: bigint,
                                     grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_revoke_all_grants_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                          self_addr_0: { bytes: Uint8Array },
                                          sig_r_0: __compactRuntime.JubjubPoint,
                                          pk_0: __compactRuntime.JubjubPoint,
                                          nonce_value_0: bigint,
                                          grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  withdraw_unshielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      recipient_0: { bytes: Uint8Array },
                                      pk_0: __compactRuntime.Secp256k1Point,
                                      envelope_0: bigint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                    recipient_0: { bytes: Uint8Array },
                                    color_0: Uint8Array,
                                    amount_0: bigint,
                                    change_entry_0: Uint8Array,
                                    enc_pk_0: Uint8Array,
                                    pk_0: __compactRuntime.Secp256k1Point,
                                    envelope_0: bigint,
                                    origin_hash_0: Uint8Array,
                                    slot_0: bigint,
                                    scope_salt_0: Uint8Array,
                                    recipient_kind_0: bigint,
                                    pinned_recipient_0: Uint8Array,
                                    max_coin_value_0: bigint,
                                    spent_prev_0: bigint,
                                    sig_0: { r: bigint, s: bigint }): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                    value: { nonce: Uint8Array,
                                                                                                                             color: Uint8Array,
                                                                                                                             value: bigint
                                                                                                                           }
                                                                                                                  }>>;
  withdraw_shielded_to_contract_with_grant_k256(context: __compactRuntime.CircuitContext<PS>,
                                                recipient_0: { bytes: Uint8Array
                                                             },
                                                color_0: Uint8Array,
                                                amount_0: bigint,
                                                change_entry_0: Uint8Array,
                                                enc_pk_0: Uint8Array,
                                                pk_0: __compactRuntime.Secp256k1Point,
                                                envelope_0: bigint,
                                                origin_hash_0: Uint8Array,
                                                slot_0: bigint,
                                                scope_salt_0: Uint8Array,
                                                recipient_kind_0: bigint,
                                                pinned_recipient_0: Uint8Array,
                                                max_coin_value_0: bigint,
                                                spent_prev_0: bigint,
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
  withdraw_unshielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                        color_0: Uint8Array,
                                        amount_0: bigint,
                                        recipient_0: { bytes: Uint8Array },
                                        pk_0: __compactRuntime.JubjubPoint,
                                        origin_hash_0: Uint8Array,
                                        slot_0: bigint,
                                        scope_salt_0: Uint8Array,
                                        recipient_kind_0: bigint,
                                        pinned_recipient_0: Uint8Array,
                                        max_coin_value_0: bigint,
                                        spent_prev_0: bigint,
                                        sig_r_0: __compactRuntime.JubjubPoint,
                                        sig_s_0: bigint,
                                        grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw_shielded_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                      recipient_0: { bytes: Uint8Array },
                                      color_0: Uint8Array,
                                      amount_0: bigint,
                                      change_entry_0: Uint8Array,
                                      enc_pk_0: Uint8Array,
                                      pk_0: __compactRuntime.JubjubPoint,
                                      origin_hash_0: Uint8Array,
                                      slot_0: bigint,
                                      scope_salt_0: Uint8Array,
                                      recipient_kind_0: bigint,
                                      pinned_recipient_0: Uint8Array,
                                      max_coin_value_0: bigint,
                                      spent_prev_0: bigint,
                                      sig_r_0: __compactRuntime.JubjubPoint,
                                      sig_s_0: bigint,
                                      grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                            value: { nonce: Uint8Array,
                                                                                                                     color: Uint8Array,
                                                                                                                     value: bigint
                                                                                                                   }
                                                                                                          }>>;
  withdraw_shielded_to_contract_with_grant_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                  recipient_0: { bytes: Uint8Array
                                                               },
                                                  color_0: Uint8Array,
                                                  amount_0: bigint,
                                                  change_entry_0: Uint8Array,
                                                  enc_pk_0: Uint8Array,
                                                  pk_0: __compactRuntime.JubjubPoint,
                                                  origin_hash_0: Uint8Array,
                                                  slot_0: bigint,
                                                  scope_salt_0: Uint8Array,
                                                  recipient_kind_0: bigint,
                                                  pinned_recipient_0: Uint8Array,
                                                  max_coin_value_0: bigint,
                                                  spent_prev_0: bigint,
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
  issue_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                        grant_id_0: Uint8Array,
                        op_withdraw_unshielded_0: boolean,
                        op_withdraw_shielded_0: boolean,
                        op_withdraw_shielded_to_contract_0: boolean,
                        read_0: boolean,
                        color_0: Uint8Array,
                        recipient_kind_0: bigint,
                        recipient_0: Uint8Array,
                        max_coin_value_0: bigint,
                        per_call_cap_0: bigint,
                        cap_0: bigint,
                        expires_at_0: bigint,
                        rp_id_hash_0: Uint8Array,
                        read_pk_hash_0: Uint8Array,
                        window_len_0: bigint,
                        window_cap_0: bigint,
                        caller_0: { is_some: boolean,
                                    value: { bytes: Uint8Array }
                                  },
                        scope_salt_0: Uint8Array,
                        pk_0: __compactRuntime.Secp256k1Point,
                        use_counter_0: bigint,
                        sig_0: { r: bigint, s: bigint },
                        envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_k256(context: __compactRuntime.CircuitContext<PS>,
                         grant_id_0: Uint8Array,
                         pk_0: __compactRuntime.Secp256k1Point,
                         use_counter_0: bigint,
                         sig_0: { r: bigint, s: bigint },
                         envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_k256(context: __compactRuntime.CircuitContext<PS>,
                              pk_0: __compactRuntime.Secp256k1Point,
                              use_counter_0: bigint,
                              sig_0: { r: bigint, s: bigint },
                              envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                          grant_id_0: Uint8Array,
                          op_withdraw_unshielded_0: boolean,
                          op_withdraw_shielded_0: boolean,
                          op_withdraw_shielded_to_contract_0: boolean,
                          read_0: boolean,
                          color_0: Uint8Array,
                          recipient_kind_0: bigint,
                          recipient_0: Uint8Array,
                          max_coin_value_0: bigint,
                          per_call_cap_0: bigint,
                          cap_0: bigint,
                          expires_at_0: bigint,
                          rp_id_hash_0: Uint8Array,
                          read_pk_hash_0: Uint8Array,
                          window_len_0: bigint,
                          window_cap_0: bigint,
                          caller_0: { is_some: boolean,
                                      value: { bytes: Uint8Array }
                                    },
                          scope_salt_0: Uint8Array,
                          pk_0: __compactRuntime.JubjubPoint,
                          use_counter_0: bigint,
                          sig_r_0: __compactRuntime.JubjubPoint,
                          sig_s_0: bigint,
                          grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_grant_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                           grant_id_0: Uint8Array,
                           pk_0: __compactRuntime.JubjubPoint,
                           use_counter_0: bigint,
                           sig_r_0: __compactRuntime.JubjubPoint,
                           sig_s_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_all_grants_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                pk_0: __compactRuntime.JubjubPoint,
                                use_counter_0: bigint,
                                sig_r_0: __compactRuntime.JubjubPoint,
                                sig_s_0: bigint,
                                grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  challenge_recover_submit(context: __compactRuntime.CircuitContext<PS>,
                           self_addr_0: { bytes: Uint8Array },
                           recovery_key_0: __compactRuntime.JubjubPoint,
                           sig_r_recovery_0: __compactRuntime.JubjubPoint,
                           successor_pk_0: __compactRuntime.JubjubPoint,
                           sig_r_successor_0: __compactRuntime.JubjubPoint,
                           successor_recovery_pk_0: __compactRuntime.JubjubPoint,
                           post_epoch_0: bigint,
                           nonce_value_0: bigint,
                           now_upper_0: bigint,
                           grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_publish_recovery_session_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                                 self_addr_0: { bytes: Uint8Array
                                                              },
                                                 sig_r_0: __compactRuntime.JubjubPoint,
                                                 pk_0: __compactRuntime.JubjubPoint,
                                                 new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                                 session_nonce_0: Uint8Array,
                                                 phi_1_0: bigint,
                                                 phi_2_0: bigint,
                                                 phi_3_0: bigint,
                                                 phi_4_0: bigint,
                                                 phi_len_0: bigint,
                                                 wrap_0: Uint8Array,
                                                 nonce_value_0: bigint,
                                                 grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_publish_recovery_session_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                               self_addr_0: { bytes: Uint8Array
                                                            },
                                               pk_0: __compactRuntime.Secp256k1Point,
                                               new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                               session_nonce_0: Uint8Array,
                                               phi_1_0: bigint,
                                               phi_2_0: bigint,
                                               phi_3_0: bigint,
                                               phi_4_0: bigint,
                                               phi_len_0: bigint,
                                               wrap_0: Uint8Array,
                                               nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_recover_cancel_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                       self_addr_0: { bytes: Uint8Array },
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       nonce_value_0: bigint,
                                       grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  challenge_recover_cancel_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                     self_addr_0: { bytes: Uint8Array },
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     nonce_value_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  publish_recovery_session_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                                       new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                       session_nonce_0: Uint8Array,
                                       phi_1_0: bigint,
                                       phi_2_0: bigint,
                                       phi_3_0: bigint,
                                       phi_4_0: bigint,
                                       phi_len_0: bigint,
                                       wrap_0: Uint8Array,
                                       pk_0: __compactRuntime.JubjubPoint,
                                       use_counter_0: bigint,
                                       sig_r_0: __compactRuntime.JubjubPoint,
                                       sig_s_0: bigint,
                                       grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publish_recovery_session_with_k256(context: __compactRuntime.CircuitContext<PS>,
                                     new_recovery_pk_0: __compactRuntime.JubjubPoint,
                                     session_nonce_0: Uint8Array,
                                     phi_1_0: bigint,
                                     phi_2_0: bigint,
                                     phi_3_0: bigint,
                                     phi_4_0: bigint,
                                     phi_len_0: bigint,
                                     wrap_0: Uint8Array,
                                     pk_0: __compactRuntime.Secp256k1Point,
                                     use_counter_0: bigint,
                                     sig_0: { r: bigint, s: bigint },
                                     envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_submit(context: __compactRuntime.CircuitContext<PS>,
                 successor_pk_0: __compactRuntime.JubjubPoint,
                 successor_recovery_pk_0: __compactRuntime.JubjubPoint,
                 expected_epoch_0: bigint,
                 expected_nonce_0: bigint,
                 now_upper_0: bigint,
                 sig_r_recovery_0: __compactRuntime.JubjubPoint,
                 sig_s_recovery_0: bigint,
                 sig_r_successor_0: __compactRuntime.JubjubPoint,
                 sig_s_successor_0: bigint,
                 grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_jubjub(context: __compactRuntime.CircuitContext<PS>,
                             pk_0: __compactRuntime.JubjubPoint,
                             use_counter_0: bigint,
                             sig_r_0: __compactRuntime.JubjubPoint,
                             sig_s_0: bigint,
                             grind_nonce_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_cancel_with_k256(context: __compactRuntime.CircuitContext<PS>,
                           pk_0: __compactRuntime.Secp256k1Point,
                           use_counter_0: bigint,
                           sig_0: { r: bigint, s: bigint },
                           envelope_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  recover_finalise(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
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
  grants: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): GrantRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, GrantRecord]>
  };
  readonly grant_generation: bigint;
  readonly recovery_pk: __compactRuntime.JubjubPoint;
  recovery_phi: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  readonly recovery_phi_len: bigint;
  readonly recovery_session: Uint8Array;
  readonly recovery_wrap: Uint8Array;
  readonly recovery_version: bigint;
  readonly pending_recovery: boolean;
  readonly pending_entry: Uint8Array;
  readonly pending_recovery_pk: __compactRuntime.JubjubPoint;
  readonly pending_not_before: bigint;
  readonly veto_window: bigint;
}

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initial_device_boot_0: Uint8Array,
               encryption_key_0: Uint8Array,
               initial_recovery_pk_0: __compactRuntime.JubjubPoint,
               initial_recovery_wrap_0: Uint8Array,
               veto_window_seconds_0: bigint): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
export declare const circuitSignatures: __compactRuntime.CircuitSignatures;
export declare const declaredInterfaces: __compactRuntime.DeclaredInterfaces;
