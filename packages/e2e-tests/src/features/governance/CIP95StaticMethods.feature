@Staking-NonDelegatedFunds-Extended @Testnet
Feature: CIP-95 Static methods

  @LW-10611
  Scenario: [CIP-95] Static methods - user hasn't staked yet
    Given I open wallet: "TAWalletNonDelegated" in: extended mode
    When I open CIP-95 test DApp
    And I see CIP-95 test DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization window
    And I switch to window with CIP-95 test DApp
    And I wait for CIP-95 test DApp to be populated with data
    Then .getPubDRepKey() returned "6f7494abbbbfac938214b26b66626c442065818312f9fddaa3c4e057162479f9"
    And .getRegisteredPubStakeKeys() did not return anything
    And .getUnregisteredPubStakeKeys() returned:
      | index | key                                                              |
      | 0     | c91a05851d3172ad03da72aa94322411eaf3fac1a99da7c3f571e36e8699be59 |

  @LW-10612
  Scenario: CIP-95 - Static methods - user has staked funds on one stake pool
    Given I open wallet: "MultidelegationDelegatedSingle" in: extended mode
    When I open CIP-95 test DApp
    And I see CIP-95 test DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization window
    And I switch to window with CIP-95 test DApp
    And I wait for CIP-95 test DApp to be populated with data
    Then .getPubDRepKey() returned "0260bdbdb0bf572c524672709849c6fe6a778b73bc2a65776e6a9a850dd690e9"
    And .getRegisteredPubStakeKeys() returned:
      | index | key                                                              |
      | 0     | 9832a01bc835d16e380db33476d5cf10bd777b7aa4eb8aec017fdb7bbbfceb28 |

  @LW-10613
  Scenario: CIP-95 - Static methods - user has staked funds on multiple stake pools
    Given I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    When I open CIP-95 test DApp
    And I see CIP-95 test DApp authorization window
    And I click "Authorize" button in DApp authorization window
    And I click "Only once" button in DApp authorization window
    And I switch to window with CIP-95 test DApp
    And I wait for CIP-95 test DApp to be populated with data
    Then .getPubDRepKey() returned "27462175f60d64881a71475b4e929f137032b91fd0ec4c1edfdcc610fec16c36"
    And .getRegisteredPubStakeKeys() returned:
      | index | key                                                              |
      | 0     | 19aa588402d786c3d18d02ed66d2f50837907a069691416c3dbc2fcc26eb872d |
      | 1     | 9f35713828f43570e36aa0bf42cbaaf05b003e3a7929aef92af4afeb54ca3f5b |
      | 2     | b566a862416a4758f276519a0870e6be9be8b3021958f95dd549bd5736e1e54d |
      | 3     | d064997cc781c9a34aec4a365e3bc631af02578abdb4cd9842852e4cdf933f7f |
      | 4     | 067bf8ddafd066913333b40daae902f8058b2a4fb247c0988d362788981fb89f |
      | 5     | 2f77548a45f89d241beaae70dc69dbb57cb0af51422ea4ca73a915ae110176df |
      | 6     | 796fd2286948a32bfbdcf3bd88e31ab85ccbef249667c2dce256459bbaf38603 |
      | 7     | ad1ff0f8192773a3be5bbfefecf0429ac8a70acd1de2823fba392d49af024309 |
      | 8     | 827d18483f03e8a29110173a1de088a1fbee2b6c4d45f0815e57f96339041bf9 |
      | 9     | e4afdcd52dbc02ae73a383771c6ef4c795911d33fcc34bf1167f87379a8bfa26 |
    And .getUnregisteredPubStakeKeys() did not return anything
