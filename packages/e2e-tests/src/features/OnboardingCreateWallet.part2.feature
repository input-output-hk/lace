@OnboardingCreateWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Create wallet

  @LW-2443
  Scenario: Create Wallet - Mnemonic verification - fill all fields - happy path
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    Then "Next" button is enabled during onboarding process

  @LW-3212
  Scenario: Create Wallet - Mnemonic verification - all empty fields - next disabled
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and not fill values
    Then "Next" button is disabled during onboarding process

  @LW-3213
  Scenario: Create Wallet - Mnemonic verification - clear one of fields - next disabled
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    Then "Next" button is enabled during onboarding process
    And I clear one random field
    Then "Next" button is disabled during onboarding process

  @LW-2444
  Scenario: Create Wallet - Mnemonic verification - fill all fields - wrong mnemonic
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    When I add characters "qwe" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2445 @LW-10208 @Smoke @memory-snapshot
  Scenario: Create Wallet - All done page - happy path
    Given I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    And "Pin the wallet extension" notification is displayed
    And "Pin the wallet extension" notification disappears after 5 seconds
    And "N_8J@bne87A" password is not in snapshot

  @LW-2627
  Scenario: Create Wallet - autofill words
    When I click "Create" button on wallet setup page
    And I click "Next" button during wallet setup
    And "Mnemonic writedown" page is displayed with 24 words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    When I fill mnemonic input with "s"
    Then I see following autocomplete options:
      | sad     |
      | saddle  |
      | sadness |
    And I click header to lose focus
    Then I do not see autocomplete options list
    And I click on mnemonic input
    Then I see following autocomplete options:
      | sad     |
      | saddle  |
      | sadness |
    When I fill mnemonic input with "se"
    Then I see following autocomplete options:
      | sea    |
      | search |
      | season |
    When I fill mnemonic input with "sef"
    Then I do not see autocomplete options list
    When I fill mnemonic input with "SE"
    Then I see following autocomplete options:
      | sea    |
      | search |
      | season |
    When I fill mnemonic input with "ą"
    Then I do not see autocomplete options list

  @LW-4543 @LW-4548
  Scenario Outline: Create wallet - Limit the wallet name input - Realtime error when inputs name with size of <value> character
    When I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow
    Then "Wallet setup" page is displayed
    When I enter wallet name with size of: <value> characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" <is_displayed> displayed
    And "Next" button is <is_disabled> during onboarding process
    Examples:
      | value | is_displayed | is_disabled |
#      | 20    | is not       | enabled     | TODO: uncomment when LW-10695 is resolved
      | 21    | is           | disabled    |

  @LW-5844 @pending @issue=LW-13195
  Scenario Outline: "Get started" page - Legal links in footer - click on <legal_link> link
    When "Get started" page is displayed
    And I click on "<legal_link>" legal link
    Then "<legal_link>" is displayed in new tab
    Examples:
      | legal_link       |
      | Cookie policy    |
      | Privacy policy   |
      | Terms of service |

  @LW-4993
  Scenario Outline: Create Wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    And I click "Create" button on wallet setup page
    Then I see current onboarding page in <mode> mode
    When I click "Next" button during wallet setup
    Then I see current onboarding page in <mode> mode
    When "Mnemonic writedown" page is displayed with 24 words
    Then I see current onboarding page in <mode> mode
    And I save mnemonic words
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    Then I see current onboarding page in <mode> mode
    And I enter saved mnemonic words
    And I click "Next" button during wallet setup
    When "Wallet setup" page is displayed
    Then I see current onboarding page in <mode> mode
    And I enter wallet name: "someWallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Enter wallet" button is enabled
    And I see current onboarding page in <mode> mode
    And I clear saved words
    Examples:
      | mode  |
      | dark  |
      | light |

  @LW-8500
  Scenario: Create Wallet - Mnemonic verification - incorrect word
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I change one random field
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I restore previously changed mnemonic word
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process

  @LW-8501
  Scenario: Create Wallet - Mnemonic verification - incorrect word order
    Given I click "Create" button on wallet setup page
    And I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with 24 words
    And I save mnemonic words
    And I click "Next" button during wallet setup
    When I fill passphrase fields using saved 24 words mnemonic in incorrect order
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I enter saved mnemonic words
    Then "Next" button is enabled during onboarding process

  @LW-10452
  Scenario: Create wallet - Copy and Paste from clipboard has a tooltip
    Given I click "Create" button on wallet setup page
    And I click "Next" button during wallet setup
    And "Mnemonic writedown" page is displayed with 24 words
    And I hover over "Copy to clipboard" button
    Then I see clipboard tooltip with information about copying and pasting words
    And I click on "clipboard tooltip link"
    Then I see a "FAQ" article with title "Best practices for using the “copy to clipboard” and “paste from clipboard” recovery phrase features"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And I hover over "Paste from clipboard" button
    Then I see clipboard tooltip with information about copying and pasting words
    And I click on "clipboard tooltip link"
    Then I see a "FAQ" article with title "Best practices for using the “copy to clipboard” and “paste from clipboard” recovery phrase features"
