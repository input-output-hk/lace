@AddressBook-extended @Mainnet @Testnet
Feature: Address book - extended view

  Background:
    Given Lace is ready for test

  @LW-4554
  Scenario Outline: Extended-view - Address Book - Add empty name/address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "<wallet_name>" name and "<address>" address
    And I fill address form with "<wallet_name2>" name and "<address2>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer

    Examples:
      | wallet_name | wallet_name2 | address                                                               | address2                                                              | name_error             | address_error             |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Name field is required | empty                     |
      | name_ok     | name_ok      | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | empty                  | Address field is required |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | Name field is required | Address field is required |

  @LW-4466
  Scenario: Extended-view - Address Book - Remove address
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode with details of "Byron" address
    And I click "Delete" button on address details page
    Then I see delete address modal
    When I click "Delete address" button on delete address modal
    Then I don't see address row with name "Byron" and address "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" on the list in extended mode

  @LW-4467
  Scenario: Extended-view - Address Book - Remove address and cancel
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode with details of "Byron" address
    And I click "Delete" button on address details page
    And I click "Cancel" button on delete address modal
    Then I see address detail page in extended mode with details of "Byron" address

  @LW-4468 @Smoke
  Scenario Outline: Extended-view - Address Book - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click "Add address" button on address book page
    When I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with text: "<toast_message>"

    Examples:
      | wallet_name | wallet_address | toast_message                |
      | Byron       | Byron          | Given name already exists    |
      | SomeWallet  | Byron          | Given address already exists |

  @LW-4469
  Scenario: Extended-view - Address Book - Copy address button
    Given I close wallet synced toast
    And I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I click "Copy" button on address details page
    Then I see a toast with text: "Copied to clipboard"
    And address is saved to clipboard

  @LW-4470
  Scenario Outline: Extended-view - Address Book - Edit address: <edited_address>
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "<edited_address>"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and "<address>" address
    And I click "Done" button on "Edit address" drawer
    Then I see a toast with text: "Edited successfully"
    And I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode

    Examples:
      | edited_address | wallet_name    | address                                                                                                            |
      | Shelley        | Shelley_edited | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | Byron          | Byron_edited   | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |

  @LW-4471
  Scenario: Extended-view - Address Book - Edit address and cancel
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I click "Cancel" button on "Edit address" drawer
    Then I see address detail page in extended mode with details of "Shelley" address

  @LW-4567
  Scenario Outline: Extended-view - Address Book - Edit address book entry - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Done" button on "Edit address" drawer
    Then I see a toast with text: "<toast_message>"

    Examples:
      | wallet_name | wallet_address | toast_message                |
      | Byron       | Byron          | Given name already exists    |
      | SomeWallet  | Byron          | Given address already exists |

  @LW-4535
  Scenario: Extended-view - Address Book - Edit address and click exit button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking close button
    Then address list is displayed and each row consists of avatar, name and address

  @LW-4536
  Scenario: Extended-view - Address Book - Edit address and click back button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking back button
    Then I see address detail page in extended mode with details of "Shelley" address

  @LW-4484
  Scenario: Extended-view - Address Book - "About your wallet" widget
    Given I don't have any addresses added to my address book in extended mode
    Then I see Address Book "About your wallet" widget with all relevant items
