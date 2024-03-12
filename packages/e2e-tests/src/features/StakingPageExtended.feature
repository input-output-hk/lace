@Staking-NonDelegatedFunds-Extended @Pending
Feature: Staking Page - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-4024 @Pending @Testnet @Mainnet
  @issue=ADP-2344
  Scenario: Extended View - Stake pool list default sorting by ROS
    When I navigate to Staking extended page
    And I reveal all stake pools
    Then the results are in descending order according to "ros" column

  @LW-2706 @Pending @Testnet @Mainnet
  @issue=ADP-2344
  Scenario Outline: Extended View - Sort lists ascending - column: <column>
    When I navigate to Staking extended page
    And I click on the "<column>" column header
    And I reveal all stake pools
    Then the results are in ascending order according to "<column>" column
    Examples:
      | column     |
      | name       |
      | ros        |
      | cost       |
      | saturation |

  @LW-2706 @Pending @Testnet @Mainnet
  @issue=ADP-2344
  Scenario Outline: Extended View - Sort lists descending - column <column>
    When I navigate to Staking extended page
    And I click on the "<column>" column header
    And I click on the "<column>" column header
    And I reveal all stake pools
    Then the results are in descending order according to "<column>" column
    Examples:
      | column     |
      | name       |
      | ros        |
      | cost       |
      | saturation |
