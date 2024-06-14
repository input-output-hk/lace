@Runner3 @Collateral-popup @Testnet
Feature: Collateral - popup view

  Background:
    Given Wallet is synced
    And I reclaim collateral (if active) in popup mode

  @LW-5523
  Scenario: Popup View - Settings -  Add/Reclaim Collateral
    And I am on Settings popup page
    Then I see collateral as: "Inactive" in settings
    When I click on "Collateral" setting
    Then all elements of Inactive collateral drawer are displayed
    When I fill correct password and confirm collateral
    Then I see collateral as: "Active" in settings
    When I navigate to Transactions popup page
    And I can see transaction 1 with type "Self Transaction"
    When I navigate to Settings popup page
    When I click on "Collateral" setting
    Then all elements of Active collateral drawer are displayed
    When I click "Reclaim collateral" button on collateral drawer
    Then I see collateral as: "Inactive" in settings

  @LW-5528
  Scenario: Popup View - Settings -  Collateral - state of collateral is separated and saved during network switching
    And I am on Settings popup page
    When I click on "Collateral" setting
    And I fill correct password and confirm collateral
    Then I see collateral as: "Active" in settings
    And I see a toast with text: "Collateral added"
    And I close a toast message
    And I navigate to Transactions popup page
    And I can see transaction 1 with type "Self Transaction"
    When I switch network to: "Preview" in popup mode
    And Wallet is synced
    When I am on Settings popup page
    Then I see collateral as: "Inactive" in settings
    When I click on "Collateral" setting
    Then all elements of Inactive collateral drawer are displayed
    And I close the drawer by clicking back button
    When I switch network to: "Preprod" in popup mode
    And Wallet is synced
    Then I see collateral as: "Active" in settings
    When I click on "Collateral" setting
    Then all elements of Active collateral drawer are displayed
