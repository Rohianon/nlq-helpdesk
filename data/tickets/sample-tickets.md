# Sample Support Tickets

## Ticket #1001 - VPN Connection Failure
**Status**: Resolved
**Priority**: High
**Category**: Network
**Description**: User reports GlobalProtect VPN client shows "Gateway not reachable" error after OS update on MacOS Sonoma 14.2.
**Resolution**: The GlobalProtect system extension needed re-approval after the OS update. Guided user to System Settings > Privacy & Security > scroll down to allow the Palo Alto Networks extension. VPN connected successfully after reboot.

## Ticket #1002 - Outlook Not Syncing
**Status**: Resolved
**Priority**: Medium
**Category**: Email
**Description**: User's Outlook desktop client stopped syncing emails 2 days ago. Web version (outlook.office365.com) works fine. Other Office apps working normally.
**Resolution**: Cleared the Outlook local cache by deleting the OST file at %localappdata%\Microsoft\Outlook\. Restarted Outlook which recreated the file and began syncing. Full mailbox sync completed in approximately 30 minutes.

## Ticket #1003 - Software Installation Request
**Status**: In Progress
**Priority**: Low
**Category**: Software
**Description**: Developer requesting installation of Docker Desktop for containerized development. Not currently in the approved software catalog.
**Resolution**: Forwarded to security team for review. Docker Desktop requires elevated privileges. Pending security assessment and manager approval. Expected turnaround: 5-7 business days.

## Ticket #1004 - Printer Not Found
**Status**: Resolved
**Priority**: Low
**Category**: Hardware
**Description**: New employee on Floor 5 East wing cannot find any printers when searching in Windows settings.
**Resolution**: User was not on the Corp-Secure Wi-Fi network (was connected to Guest-WiFi). Reconnected to Corp-Secure and printers appeared. Added printer 5-EAST-COLOR successfully.

## Ticket #1005 - Account Lockout
**Status**: Resolved
**Priority**: High
**Category**: Access
**Description**: Executive locked out of account during board presentation. Unable to access email, Teams, or any corporate applications. Reports not entering wrong password.
**Resolution**: Investigation showed 5 failed login attempts from an unrecognized IP (likely a saved session on an old device). Reset password, unlocked account, revoked all active sessions. Recommended user check for old devices with saved credentials and enable number-matching in MFA app.

## Ticket #1006 - Slow Laptop Performance
**Status**: Resolved
**Priority**: Medium
**Category**: Hardware
**Description**: User reports laptop extremely slow, taking 5+ minutes to boot and applications hanging frequently. Laptop is 2.5 years old.
**Resolution**: Ran diagnostics: disk usage at 95%, only 4GB RAM with 12+ Chrome tabs typical usage. Cleared temp files (recovered 40GB), disabled unnecessary startup programs, upgraded RAM to 16GB. Boot time improved to under 60 seconds. Also submitted hardware refresh request as device approaches 3-year cycle.
