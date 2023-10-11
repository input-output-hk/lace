@Staking-NonDelegatedFunds-Extended @Testnet @Mainnet
Feature: Staking Page - Extended View

  @LW-8449 @Testnet @Mainnet
  Scenario: Extended View - Staking search control is displayed with appropriate content
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Browse pools tab
    Then I see the stake pool search control with appropriate content

  @LW-8448 @Testnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Browse pools tab
    And I input "<stake_pool_search_term>" into stake pool search bar
    Then there are <number_of_results> stake pools returned for "<stake_pool_search_term>" search term
    And (if applicable) first stake pool search result has "<stake_pool_name>" name and "<stake_pool_ticker>" ticker
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_name                  | stake_pool_ticker |
      | a Capital              | 1                 | ADA Capital                      | ADACT             |
      | a capital              | 1                 | ADA Capital                      | ADACT             |
      | NED#                   | 0                 |                                  |                   |
      | PAN                    | 1                 | PANL Stake Pool (Pre-Production) | PANL              |
      | 123456                 | 0                 |                                  |                   |
      | AZ                     | 2                 | AzureADA                         | AZUR              |
      | £££                    | 0                 |                                  |                   |
      | Amso                   | 0                 |                                  |                   |

  @LW-8448 @Mainnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Browse pools tab
    And I input "<stake_pool_search_term>" into stake pool search bar
    Then there are <number_of_results> stake pools returned for "<stake_pool_search_term>" search term
    And (if applicable) first stake pool search result has "<stake_pool_name>" name and "<stake_pool_ticker>" ticker
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_name | stake_pool_ticker |
      | a Capital              | 1                 | ADA Capital     | ADACT             |
      | a capital              | 1                 | ADA Capital     | ADACT             |
      | NED#                   | 0                 |                 |                   |
      | PANL                   | 1                 | PANL Stake Pool | PANL              |
      | 123456                 | 0                 |                 |                   |
      | DPo                    | 3                 | HKZDPool        | HKZD              |
      | £££                    | 0                 |                 |                   |
      | Amso                   | 0                 |                 |                   |

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

  @LW-8637 @Testnet @Mainnet
  Scenario: Extended View - Staking password screen details
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Overview tab
    And I click Browse pools tab
    And I input "ADA Capital" into stake pool search bar
    And I click on the stake pool with name "ADA Capital"
    And I click on "Stake all on this pool" button on stake pool details drawer
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    Then staking password drawer is displayed
