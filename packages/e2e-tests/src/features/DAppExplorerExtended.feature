@DAppExplorer-Extended @Testnet

Feature: DApp Explorer - extended view

  Background:
    Given Wallet is synced

  @LW-12105 @Pending
  @issue=LW-12569
  Scenario: Extended View - DApp Explorer - open
    When I navigate to DApps extended page
    Then I see DApp Explorer page
    And I see the list of categories on DApp Explorer page
    And I see cards with DApps on DApp Explorer page
    When I hover over info icon on DApp Explorer page
    Then I see a tooltip with information about DApp Explorer

  @LW-12108 @Pending
  @issue=LW-12569
  Scenario Outline: Extended View - DApp Explorer - filter by category
    When I navigate to DApps extended page
    And I click on "<category>" DApp category
    Then DApps page label matches selected "<category>" category
    Then only DApps matching "<category>" are displayed
    Examples:
      | category     |
      | Games        |
      | Defi         |
      | Collectibles |
      | Marketplaces |
      | Exchanges    |
      | Social       |
      | Other        |
      | Show All     |

  @LW-12109 @LW-12110 @Pending
  @issue=LW-12569
  Scenario Outline: Extended View - DApp Explorer - open DApp details
    When I navigate to DApps extended page
    And I click on "<dapp_name>" DApp card
    Then "<dapp_name>" DApp details drawer is displayed
    When I click on DApp URL button
    Then New tab with url containing "<dapp_url>" is opened
    Examples:
      | dapp_name | dapp_url                  |
      | DexHunter | https://app.dexhunter.io/ |

  @LW-12320
  Scenario: Extended View - "No DApps available" when no connection with DApp Radar
    When I am in the offline network mode
    And I navigate to DApps extended page
    Then "No DApps available" message is displayed
