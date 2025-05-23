@Collateral-extended @Testnet
Feature: Collateral - extended view

  Background:
    Given Wallet is synced
    And I reclaim collateral (if active) in extended mode

  @LW-5520 @memory-snapshot
  Scenario: Extended View - Settings - Add/Reclaim Collateral
    And I am on Settings extended page
    Then I see collateral as: "Inactive" in settings
    When I click on "Collateral" setting
    Then all elements of Inactive collateral drawer are displayed
    When I fill correct password and confirm collateral
    Then I see collateral as: "Active" in settings
    And valid password is not in snapshot
    When I navigate to Activity extended page
    And I can see transaction 1 with type "Self Transaction"
    When I navigate to Settings extended page
    When I click on "Collateral" setting
    Then all elements of Active collateral drawer are displayed
    When I click "Reclaim collateral" button on collateral drawer
    Then I see collateral as: "Inactive" in settings

  @LW-5526
  Scenario: Extended View - Settings -  Collateral - state of collateral is separated and saved during network switching
    And I am on Settings extended page
    When I click on "Collateral" setting
    And I fill correct password and confirm collateral
    Then I see collateral as: "Active" in settings
    And I navigate to Activity extended page
    And I can see transaction 1 with type "Self Transaction"
    When I switch network to: "Preview" in extended mode
    And Wallet is synced
    Then I see collateral as: "Inactive" in settings
    When I click on "Collateral" setting
    Then all elements of Inactive collateral drawer are displayed
    And I close the drawer by clicking close button
    When I switch network to: "Preprod" in extended mode
    And Wallet is synced
    Then I see collateral as: "Active" in settings
    When I click on "Collateral" setting
    Then all elements of Active collateral drawer are displayed
