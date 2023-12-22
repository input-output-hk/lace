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
    Then I see the stake pool search control with appropriate content

  @LW-8448 @Testnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I input "<stake_pool_search_term>" into stake pool search bar
    Then there are <number_of_results> stake pools returned for "<stake_pool_search_term>" search term
    And (if applicable) first stake pool search result has "<stake_pool_name>" name and "<stake_pool_ticker>" ticker
    Examples:
      | stake_pool_search_term | number_of_results | stake_pool_name                  | stake_pool_ticker |
      | a Ocean                | 1                 | ADA Ocean                        | OCEAN             |
      | a ocean                | 1                 | ADA Ocean                        | OCEAN             |
      | NED#                   | 0                 |                                  |                   |
      | PAN                    | 1                 | PANL Stake Pool (Pre-Production) | PANL              |
      | 123456                 | 0                 |                                  |                   |
      | AZ                     | 2                 | AzureADA                         | AZUR              |
      | £££                    | 0                 |                                  |                   |
      | Amso                   | 0                 |                                  |                   |

  @LW-8448 @Mainnet
  Scenario Outline: Extended View - Stake pool search for "<stake_pool_search_term>" returns the expected number of results <number_of_results> with appropriate content
    When I navigate to Staking extended page
    And I open Browse pools tab
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

  @LW-8499 @Testnet @Mainnet
  Scenario Outline: Extended View - Staking - Show tooltip for column names in browse pools section
    When I navigate to Staking extended page
    And I open Browse pools tab
    When I hover over "<column_name>" column name in stake pool list
    Then tooltip for "<column_name>" column is displayed
    Examples:
      | column_name |
      | ROS         |
      | Saturation  |

  @LW-8637 @Testnet @Mainnet
  Scenario: Extended View - Staking password screen details
    When I navigate to Staking extended page
    And I open Overview tab
    And I open Browse pools tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with name "ADA Ocean"
    And I click on "Stake all on this pool" button on stake pool details drawer
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    Then staking password drawer is displayed

  @LW-8445 @Testnet
  Scenario: Extended View - Selecting stakepool from list opens drawer with appropriate details
    And I am on Staking extended page
    And I open Browse pools tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with name "ADA Ocean"
    Then I see stake pool details drawer for "ADA Ocean" stake pool

  @LW-8438 @Testnet
  Scenario: Extended View - Staking - Stakepool details drawer - Close drawer
    And I am on Staking extended page
    And I open Browse pools tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with name "ADA Ocean"
    And Stake pool details drawer is opened
    When I close the drawer by clicking close button
    Then Stake pool details drawer is not opened

  @LW-8463 @Testnet @Mainnet
  Scenario: Extended View - Stake pool list item
    And I am on Staking extended page
    And I open Browse pools tab
    And I wait for stake pool list to be populated
    Then Each stake pool list item contains: logo, name, ticker, ROS and saturation
