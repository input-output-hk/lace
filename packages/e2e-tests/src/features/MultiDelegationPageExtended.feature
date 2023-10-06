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

  @LW-8469 @Testnet @Mainnet
  Scenario: Extended View - Network info component is present with expected content
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    Then I see the Network Info component with the expected content
