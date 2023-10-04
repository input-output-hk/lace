@Staking-NonDelegatedFunds-Extended @Testnet @Mainnet
Feature: Staking Page - Extended View

  @LW-8466 @Testnet @Mainnet
  Scenario: Extended View - "About staking" widget
    Given I am on Staking extended page
    And I close Multi-delegation beta modal
    Then I see "About staking" widget with all relevant items

  @LW-8465 @Testnet @Mainnet
  Scenario Outline: Extended View - "About staking" widget item click - <subtitle>
    Given I disable showing Multidelegation beta banner
    And I am on Staking extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                          |
      | FAQ      | What are staking & delegation?    |
      | FAQ      | Which stake pool should I choose? |
      | Glossary | What is an active stake?          |
      | Video    | Staking made easy with Lace       |

  @LW-8445 @Testnet
  Scenario: Extended View - Selecting stakepool from list opens drawer with appropriate details
    Given I disable showing Multidelegation beta banner
    And I am on Staking extended page
    And I click Browse pools tab
    And I input "ADA Capital" into stake pool search bar
    And I click on the stake pool with name "ADA Capital"
    Then I see drawer with "ADA Capital" stake pool details and a button available for staking
