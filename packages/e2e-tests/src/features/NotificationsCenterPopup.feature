@NotificationCenter-Popup @Testnet

Feature: Notification Center - popup view

  Background:
    Given Wallet is synced
    And I inject the notification center script into browser
    And I initialize notification center with test topics and notifications

  @LW-tbd1
  Scenario: Popup View - Notification Center - Notifications button in user menu is displayed with unread counter
    And "Notifications" button indicates 2 unread notifications
    When I add a new notification dynamically
    Then "Notifications" button indicates 3 unread notifications

  @LW-tbd2
  Scenario: Popup View - Notification Center - Notifications list in user menu is displayed and contains test notifications
    And I add a new notification dynamically
    When I click "Notifications" button on page header
    Then the dynamically added notification is displayed in the "Notifications menu" with unread marker
    And "Notifications menu" is displayed with some unread messages
    And "Notifications menu" contains 3 unread notifications with all details

  @LW-tbd3
  Scenario: Popup View - Notification Center - is displayed and contains test notifications - "View all" button click
    When I add a new notification dynamically
    And I click "Notifications" button on page header
    When I click on "View all" button in the "Notifications menu"
    Then "Notification center" is displayed in popup mode
    And "Notifications center" contains 3 unread notifications with all details
    And the dynamically added notification is displayed in the "Notifications center" with unread marker

  @LW-tbd4
  Scenario Outline: Popup View - Notification Center - open single notification from <location>
    And I add a new notification dynamically
    And <navigation_step>
    When I click on notification number 1 in the "Notifications <location>"
    Then the dynamically added notification details are displayed in popup mode
    When I click on "View all" button in the Notification details view
    Then the dynamically added notification is displayed in the "Notifications center" with read marker
    When I click "Notifications" button on page header
    Then the dynamically added notification is displayed in the "Notifications menu" with read marker
    Examples:
      | location | navigation_step                               |
      | menu     | I click "Notifications" button on page header |
      | center   | I visit Notifications page in popup mode      |

  @LW-tbd5
  Scenario: Popup View - Notification Center - remove notification from the list
    And I add a new notification dynamically
    And I visit Notifications page in popup mode
    Then the dynamically added notification is displayed in the "Notifications center" with unread marker
    When I click on remove button for notification number 1 in the "Notifications center"
    Then Remove notification modal is displayed
    When I click "Remove" button in the remove notification modal
    Then the dynamically added notification is not displayed in the "Notifications center" with unread marker

  @LW-tbd6
  Scenario: Popup View - Notification Center - remove notification from details view
    And I add a new notification dynamically
    And I visit Notifications page in popup mode
    Then the dynamically added notification is displayed in the "Notifications center" with unread marker
    When I click on notification number 1 in the "Notifications center"
    And I click on remove button in the Notification details view
    Then Remove notification modal is displayed
    When I click "Remove" button in the remove notification modal
    Then the dynamically added notification is not displayed in the "Notifications center" with unread marker

  @LW-tbd7
  Scenario: Popup View - Notification Center - cancel notification removal
    And I add a new notification dynamically
    And I visit Notifications page in popup mode
    Then the dynamically added notification is displayed in the "Notifications center" with unread marker
    When I click on remove button for notification number 1 in the "Notifications center"
    Then Remove notification modal is displayed
    When I click "Cancel" button in the remove notification modal
    Then the dynamically added notification is displayed in the "Notifications center" with unread marker

  @LW-tbd8
  Scenario: Popup View - Notification Center - remove all notifications and verify empty state
    And I visit Notifications page in popup mode
    And "Notifications center" contains 2 unread notifications with all details
    And I click on remove button for notification number 1 in the "Notifications center"
    And I click "Remove" button in the remove notification modal
    And I click on remove button for notification number 1 in the "Notifications center"
    When I click "Remove" button in the remove notification modal
    Then Notifications empty state is displayed in the "Notifications center"
    When I click "Notifications" button on page header
    Then Notifications empty state is displayed in the "Notifications menu"

  @LW-tbd9
  Scenario: Popup View - Notification Center - mark all notifications as read from menu
    And I add a new notification dynamically
    And "Notifications" button indicates 3 unread notifications
    And I click "Notifications" button on page header
    And "Notifications menu" contains 3 unread notifications with all details
    When I click on "Mark all as read" button in the "Notifications menu"
    And I do not see "Mark all as read" button in "Notifications menu"
    Then "Notifications menu" contains 3 read notifications with all details
    And "Notifications" button indicates 0 unread notifications

  @LW-tbd10
  Scenario: Popup View - Notification Center - manage topic subscriptions and verify notification filtering
    And I visit Notifications page in popup mode
    And "Notifications center" contains 2 unread notifications with all details
    When I click on "Subscriptions" button in the "Notifications center"
    Then Subscriptions dropdown is displayed
    And topic "topic-1" is enabled in subscriptions dropdown
    And topic "topic-2" is enabled in subscriptions dropdown
    When I disable topic "topic-2" in subscriptions dropdown
    Then topic "topic-2" is disabled in subscriptions dropdown
    And I click on "Subscriptions" button in the "Notifications center"
    When I add a new notification dynamically
    Then the dynamically added notification is not displayed in the "Notifications center" with unread marker
    And I click on "Subscriptions" button in the "Notifications center"
    When I enable topic "topic-2" in subscriptions dropdown
    And topic "topic-2" is enabled in subscriptions dropdown
    And I click on "Subscriptions" button in the "Notifications center"
    And I add a new notification dynamically
    Then the dynamically added notification is displayed in the "Notifications center" with unread marker
