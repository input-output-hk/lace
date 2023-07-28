@Staking-SwitchingPools-Extended-E2E @Testnet
Feature: Staking Page - Switching pools - Extended Browser View - E2E

  Background:
    Given Wallet is synced
    And I navigate to Staking extended page

  @LW-temp @Testnet @Pending
  Scenario Outline: Extended View - Multidelegation - Delegate to multiple pools E2E
    Given I click Overview tab
    Then I wait until delegation info card shows staking to "<pools_before>" pool(s)
    And I click Browse pools tab
    Then I pick "<pools_after>" pools for delegation from browse pools view: "<pools_names>"
    And I click Next button on staking portfolio bar
    And I click "Fine by me" button on "Switching pool?" modal
    And I click Next button on staking manage staking
    And I click Next button on staking confirmation
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in extended mode
    When I click "Close" button on staking success drawer
    Then I wait until delegation info card shows staking to "<pools_after>" pool(s)
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    Examples:
      | pools_before | pools_after | pools_names                              |
      | 1            | 2           | 'ADA Capital, 8BETA'                     |
      | 2            | 3           | 'ADA Capital, 8BETA, Boople'             |
      | 3            | 4           | 'ADA Capital, 8BETA, Boople, ADV'        |
      | 4            | 5           | 'ADA Capital, 8BETA, Boople, ADV, BAZAR' |
      | 5            | 1           | 'ADA Capital'                            |
