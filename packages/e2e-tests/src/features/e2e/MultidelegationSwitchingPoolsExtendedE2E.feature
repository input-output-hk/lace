@Multidelegation-SwitchingPools-Extended-E2E @Testnet
Feature: Staking Page - Switching pools - Extended Browser View - E2E

  Background:
    Given Wallet is synced
    And I disable showing Multidelegation beta banner
    And I navigate to Staking extended page

  @LW-7819 @Testnet
  Scenario Outline: Extended View - Multidelegation - Delegate to multiple pools E2E
    When I click Overview tab
    And I wait until delegation info card shows staking to "<pools_before>" pool(s)
    And I click Browse pools tab
    And I pick "<pools_after>" pools for delegation from browse pools view: "<pools_names>"
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching staking success drawer is displayed
    When I click "Close" button on staking success drawer
    And I navigate to Transactions extended page
    Then I can see transaction 1 with type "<tx_type>"
    When I navigate to Staking extended page
    And I click Overview tab
    Then I wait until delegation info card shows staking to "<pools_after>" pool(s)
    Examples:
      | pools_before | pools_after | pools_names                                        | tx_type                   |
      | 1            | 2           | ADA Capital, 8BETA                                 | Delegation                |
      | 2            | 3           | ADA Capital, 8BETA, Boople Turtle Pool             | Delegation                |
      | 3            | 4           | ADA Capital, 8BETA, Boople Turtle Pool, ADV        | Delegation                |
      | 4            | 5           | ADA Capital, 8BETA, Boople Turtle Pool, ADV, BAZAR | Delegation                |
      | 5            | 1           | ADA Capital                                        | Stake Key De-Registration |

  @LW-8434 @Testnet
  Scenario: Extended View - Transactions details - Delegation Tx shows pool name and ticker - Stake pool with metadata
    And I save identifiers of stake pools currently in use
    And I click Browse pools tab
    And I input "OtherStakePool" into stake pool search bar
    And I click on the stake pool with name "OtherStakePool"
    Then I see stake pool details drawer for "OtherStakePool" stake pool
    When I save stake pool details
    And I click on "Stake all on this pool" button on stake pool details drawer
    Then I click "Fine by me" button on "Changing staking preferences?" modal
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching staking success drawer is displayed
    When I click "Close" button on staking success drawer
    And I click Overview tab
    And I wait until "OtherStakePool" pool is on "Your pools" list
    And I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    When I click on a transaction: 1
    Then the transaction details are displayed for staking with metadata

  @LW-8435 @Testnet
  Scenario: Extended View - Transactions details - Delegation Tx shows pool name and ticker - Stake pool without metadata
    And I save identifiers of stake pools currently in use
    And I click Browse pools tab
    And I input "OtherNoMetadataStakePool" into stake pool search bar
    And I click on the stake pool with name "-"
    Then I see stake pool details drawer for stake pool without metadata
    When I save stake pool details
    And I click on "Stake all on this pool" button on stake pool details drawer
    Then I click "Fine by me" button on "Changing staking preferences?" modal
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching staking success drawer is displayed
    When I click "Close" button on staking success drawer
    And I click Overview tab
    And I wait until "-" pool is on "Your pools" list
    And I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    When I click on a transaction: 1
#    Then the transaction details are displayed for staking without metadata # Bug LW-8672
