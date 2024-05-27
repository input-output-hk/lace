# Unblock when USE_FOOR_TOPUP=true
@Banxa-Extended @Testnet @Pending
Feature: Fiat On Ramp & Off Ramp - Banxa

  Background:
    Given Lace is ready for test

  @LW-10589
  Scenario: Fiat On & Off Ramp - Banxa widget is only available on Mainnet
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    Then Banxa's widget is displayed
    When I switch network to: "Preview" in extended mode
    And I navigate to Tokens extended page
    Then Banxa's widget is not displayed
    When I switch network to: "Preprod" in extended mode
    And I navigate to Tokens extended page
    Then Banxa's widget is not displayed

  @LW-10590
  Scenario: Fiat On & Off Ramp - Banxa - "Buy ADA" button - click
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    And I click on "Buy ADA" button on Banxa's widget
    Then "You're leaving Lace for Banxa" dialog is displayed

  @LW-10591
  Scenario: Fiat On & Off Ramp - Banxa - "You’re leaving Lace for Banxa" dialog - Go Back
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    And I click on "Buy ADA" button on Banxa's widget
    And I click on "Go Back" button on "You're leaving Lace for Banxa" dialog
    Then "You're leaving Lace for Banxa" dialog is not displayed

  @LW-10592
  Scenario: Fiat On & Off Ramp - Banxa - "You’re leaving Lace for Banxa" dialog - Continue
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    And I click on "Buy ADA" button on Banxa's widget
    And I click on "Continue" button on "You're leaving Lace for Banxa" dialog
    Then Banxa's transaction page is opened in a new tab

  @LW-10598
  Scenario: Fiat On & Off Ramp - Banxa - widget - screen width <= 1280px
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    And I resize the window to a width of: 1281 and a height of: 1080
    Then Banxa's widget is displayed
    When I resize the window to a width of: 1280 and a height of: 1080
    Then Banxa's widget is not displayed
    And Banxa's small component is displayed over tokens
    When I click on "Buy ADA" button on small Banxa's widget
    Then "You're leaving Lace for Banxa" dialog is displayed

  @LW-10625
  Scenario: Fiat On & Off Ramp - Banxa - Banxa's website link - click
    Given I switch network to: "Mainnet" in extended mode
    When I navigate to Tokens extended page
    And I click on "Buy ADA" button on Banxa's widget
    And I click on "Banxa's website" link on Banxa's widget
    Then Banxa's website is displayed
