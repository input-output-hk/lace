@ForgotPassword @Mainnet @Testnet @Pending
Feature: Forgot password

  @LW-2758
  Scenario: Unlock page - "Forgot password?" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    Then I see "Forgot password?" modal

  @LW-2762
  Scenario: "Forgot password?" modal - "Cancel" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Cancel" button on "Forgot password?" modal
    Then I see unlock wallet screen

  @LW-2458
  Scenario: "Forgot password?" modal - "Proceed" button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in forgot password flow
    And following keys are not present in Local Storage:
      | lock         |
      | keyAgentData |
      | lastStaking  |

  @LW-1592
  Scenario Outline: "Forgot password?" - password page - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in forgot password flow
    When I enter password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                 | complex_bar_lvl | passw_conf_err                               |
      | a           | empty         | core.password.feedback.1  | 1               | empty                                        |
      | aa          | empty         | core.password.feedback.5  | 1               | empty                                        |
      | Ta          | a             | core.password.feedback.10 | 1               | core.walletSetupRegisterStep.noMatchPassword |
      | P@ss        | empty         | core.password.feedback.13 | 1               | empty                                        |
      | N_8J@bne    | empty         | core.password.feedback.1  | 2               | empty                                        |
      | N_8J@bne87  | empty         | empty                     | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                     | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-2354
  Scenario: "Forgot password?" - mnemonic verification - wrong mnemonic
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in forgot password flow
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I click "Next" button during wallet setup
    Then I am on "Mnemonic verification" last page from "Forgot password" and filled all words
    When I add characters "asd" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2446
  Scenario: "Forgot password?" - mnemonic verification - back button click
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    Then "Wallet password" page is displayed in forgot password flow
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed with words 8 of 24
    When I fill passphrase fields using 24 words mnemonic on 8/24 page
    And I click "Next" button during wallet setup
    And I fill passphrase fields using 24 words mnemonic on 16/24 page
    And I click "Next" button during wallet setup
    And I fill passphrase fields using 24 words mnemonic on 24/24 page
    And I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed with words 16 of 24
    When I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed with words 8 of 24
    When I click "Back" button during wallet setup
    Then "Recovery phrase length page" is displayed and 24 words checkbox is checked

  @LW-2489
  Scenario Outline: "Forgot password?" - cancel restoration flow - <expected_page> page
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    And I am on <expected_page> page of restoration flow
    And I leave "Forgot password" flow
    Then "Get started" page is displayed
    And all wallet related data is removed
    Examples:
      | expected_page               |
      | password                    |
      | mnemonic verification 8/24  |
      | mnemonic verification 16/24 |
      | mnemonic verification 24/24 |

    # this test should be executed as the last one in this suite
    # opening onboarding page & closing other tabs breaks webdriver session
  @LW-2786 @LW-2440 @Smoke
  Scenario: "Forgot password?" - happy path
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    When I click on "Forgot password?" button on unlock screen
    And I click on "Proceed" button on "Forgot password?" modal
    And I switch to tab with restore wallet process
    And I close all remaining tabs except current one
    Then "Wallet password" page is displayed in forgot password flow
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I click "Next" button during wallet setup
    And I am on "Mnemonic verification" last page from "Forgot password" and filled all words
    And I click "Next" button during wallet setup
    Then I see LW homepage
    When I click "Got it" button on "DApp connector is now in Beta" modal
    And I click the menu button
    Then header menu displays "TestAutomationWallet" as a wallet name
    When I close header menu
    And I navigate to Settings extended page
    Then Analytics toggle is enabled: false
