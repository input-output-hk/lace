@Multidelegation-DelegatedFunds-Extended @Testnet
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-8436 @LW-8439 @LW-8440 @LW-8598
  Scenario Outline: Extended View - Staking - Close drawer by button
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Browse pools tab
    And I pick "1" pools for delegation from browse pools view: "ADA Capital"
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    And I'm on a delegation flow "<delegationStep>"
    When I close the drawer by clicking close button
    Then Stake pool details drawer is not opened
    Examples:
      | delegationStep |
      | manage         |
      | confirmation   |
      | password       |
      | success        |
