@Staking-NonDelegatedFunds-Extended
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-8931 @Testnet
  Scenario: Extended View - Start Staking component
    Given I save token: "Cardano" balance
    When I navigate to Staking extended page
    Then I see Start Staking page in extended mode

  @LW-8932 @Testnet
  Scenario Outline: Extended View - Start staking - step link <link_number> click
    Given I am on Start Staking page in extended mode
    When I click "Get Started" step <link_number> link
    Then <expected_step>
    Examples:
      | link_number | expected_step                                                                                |
      | 1           | I see the stake pool search control with appropriate content                                 |
      | 2           | New tab with url containing "lace.io/faq?question=what-are-staking-and-delegation" is opened |

  @LW-8449 @Testnet @Mainnet
  Scenario: Extended View - Staking search control is displayed with appropriate content
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    Then I see the stake pool search control with appropriate content

  @LW-8448 @Testnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "<stake_pool_search_term>" into stake pool search bar
    Then there are <number_of_results> stake pools returned
    And (if applicable) first stake pool search result has "<stake_pool_ticker>" ticker
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_ticker |
      | a Ocean                | 3                 | OCEAN             |
      | a ocean                | 3                 | OCEAN             |
      | ABC#                   | 0                 |                   |
      | HUA                    | 1                 | HUADA             |
      | 123456                 | 0                 |                   |
      | ZZZ                    | 3                 | ZZZZX             |
      | £££                    | 0                 |                   |
      | Abcde                  | 0                 |                   |

  @LW-8448 @Mainnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "<stake_pool_search_term>" into stake pool search bar
    Then there are <number_of_results> stake pools returned
    And (if applicable) first stake pool search result has "<stake_pool_ticker>" ticker
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_ticker |
      | a Capital              | 1                 | ADACT             |
      | a capital              | 1                 | ADACT             |
      | NED#                   | 0                 |                   |
      | PANL                   | 1                 | PANL              |
      | 123456                 | 0                 |                   |
      | DPo                    | 3                 | OMWCP             |
      | £££                    | 0                 |                   |
      | Amso                   | 0                 |                   |

  @LW-8466 @Testnet @Mainnet
  Scenario: Extended View - "About staking" widget
    Given I am on Staking extended page
    Then I see "About staking" widget with all relevant items

  @LW-8465 @Testnet @Mainnet
  Scenario Outline: Extended View - "About staking" widget item click - <subtitle>
    And I am on Staking extended page
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type | subtitle                                                                                           |
      | FAQ  | What are staking & delegation?                                                                     |
      | FAQ  | How many stake pools can I delegate stake to, using the multi-staking or multi-delegation feature? |
      | FAQ  | Do Ledger hardware wallets support multi-staking?                                                  |
      | FAQ  | Does stake distribution remain the same?                                                           |

  @LW-8469 @Testnet @Mainnet
  Scenario: Extended View - Network info component is present with expected content
    When I navigate to Staking extended page
    Then I see the Network Info component with the expected content
