SR Khata Ledger Bot

A Telegram-based customer and owner ledger system for recording purchases, verifying customer payments, handling undo requests, and providing owner-side reports.

Overview

The project uses two Telegram bots:

Customer Bot — customers record purchases, request payment verification, check totals/history, and request an undo.

Owner Bot — the shop owner reviews payment and undo requests, approves or rejects them, receives notifications, views reports, and can clear ledger data when intentionally required.

Customer Bot

Purchase

Customers can send a message such as:

20 cig

The bot parses the amount and creates a PURCHASE transaction.

Payment Verification

A customer can send:

-20 cash diya

This creates a PaymentRequest with:

status = PENDING

The ledger is not changed until the owner approves the request.

On approval:

PaymentRequest
    PENDING
       ↓
    APPROVED
       ↓
PAYMENT transaction
       ↓
Ledger updated

On rejection:

PaymentRequest
    PENDING
       ↓
    REJECTED

No payment transaction is created.

Undo

The customer can request an undo with:

/undo

The system creates an UndoRequest for the customer's latest purchase.

The owner can then approve or reject the request.

Customer Totals

/total

The current calculation is:

Outstanding = Total Purchase - Total Payment

Customer History

/history

Shows recent ledger transactions.

Customer Notifications

Customers can receive Telegram notifications when the owner:

approves a payment

rejects a payment

approves an undo

rejects an undo

blocks an invalid payment approval

Owner Bot

The Owner Bot is restricted to the configured owner Telegram ID.

Basic commands

/start
/help

Request commands

/undo
/payments

/undo shows pending purchase undo requests.

/payments shows pending payment verification requests.

Requests provide approve/reject buttons.

Reporting commands

/report
/paid
/credit
/summary
/customer <name>

/report

Shows customers whose outstanding balance is greater than zero.

Example:

🔴 UNPAID CUSTOMERS

1. Sachin — ₹500
2. Rahul — ₹250

────────────────
👥 Unpaid: 2
💰 Total Due: ₹750

/paid

Shows customers with an outstanding balance of exactly zero.

Example:

🟢 PAID CUSTOMERS

1. Priya
2. Raj

────────────────
👥 Paid: 2

/credit

Shows customers whose payment is greater than their purchases.

Example:

🔵 CUSTOMER CREDIT

1. Neha — ₹20

────────────────
👥 Credit: 1
💰 Total Credit: ₹20

/summary

Shows an overall shop summary.

Example:

📊 SHOP SUMMARY

👥 Customers: 5

🔴 Unpaid: 2
🟢 Paid: 2
🔵 Credit: 1

🛒 Sales: ₹1,000
💵 Payments: ₹930

💰 Outstanding: ₹70

/customer <name>

Example:

/customer Sachin

Output:

👤 CUSTOMER REPORT

Name: Sachin
Telegram ID: 1999014485

🛒 Purchase: ₹300
💵 Payment: ₹250

🔴 Due: ₹50

Request Safety

The project protects against duplicate and conflicting requests.

Duplicate payment request

If a customer already has a pending payment request:

PENDING_PAYMENT_EXISTS

The second pending payment request is blocked.

Duplicate undo request

If a customer already has a pending undo request:

PENDING_UNDO_EXISTS

The second pending undo request is blocked.

Payment / Undo conflict

A pending payment request blocks a new undo request.

A pending undo request blocks a new payment request.

This prevents two simultaneous pending request types from conflicting with each other.

Payment Safety

The Owner Bot validates payment requests before creating an actual payment transaction.

Rules include:

Payment amount must be positive
Payment amount must be finite
Customer must exist
Customer must have outstanding balance
Payment must not exceed outstanding

Example:

Outstanding = ₹50
Requested Payment = ₹60

Result:

❌ Approval blocked
❌ No PAYMENT transaction
❌ Khata unchanged

The customer is notified that the claimed payment amount could not be approved.

Transaction Model

Transactions currently support:

PURCHASE
PAYMENT
REVERSAL

Important fields include:

customerId
type
amount
telegramMessageId
telegramUpdateId
shopId

The active ledger calculation uses:

PURCHASE
PAYMENT

as:

Outstanding = Total Purchase - Total Payment

User Model

The User model contains:

telegramUserId
name
username
role
shopId

Roles:

OWNER
CUSTOMER

Customer accounts are intentionally preserved when ledger data is cleared.

PaymentRequest

A PaymentRequest represents a customer claim that a payment has been made.

Typical lifecycle:

PENDING
   ↓
APPROVED

or:

PENDING
   ↓
REJECTED

A pending payment request does not itself modify the ledger.

Only an approved payment creates the actual PAYMENT transaction.

UndoRequest

An UndoRequest references a specific transaction.

Typical lifecycle:

PENDING
   ↓
APPROVED

or:

PENDING
   ↓
REJECTED

An approved undo removes the associated purchase transaction.

If the referenced transaction no longer exists, the request is treated as stale and must not remove another transaction.

Owner Reports

Reporting logic is kept in:

src/services/ownerReportService.js

Available service functions include:

getCustomerFinancialReports()
getUnpaidCustomers()
getPaidCustomers()
getCreditCustomers()
getShopSummary()
getCustomerReportByName()

The reports use MongoDB aggregation to calculate customer totals efficiently.

Data Cleanup

Ledger cleanup logic is kept in:

src/services/dataCleanupService.js

The cleanup function:

deleteAllLedgerData()

deletes:

Transactions       ✅
UndoRequests       ✅
PaymentRequests    ✅

and preserves:

Users / Customers  ✅

The cleanup service was tested independently and verified that customer records remain after ledger data is cleared.

Owner cleanup command

The Owner Bot can expose:

/delete-data

The intended flow is:

/delete-data
       ↓
⚠️ Warning
       ↓
[✅ YES, DELETE ALL]
[❌ NO, CANCEL]

Only an explicitly confirmed destructive operation should clear the ledger.

After deletion:

Transactions       → deleted
UndoRequests       → deleted
PaymentRequests    → deleted
Users / Customers  → preserved

The cancellation path must not change the database.

Project Structure

Typical project structure:

sr-khata-ledger-bot/
│
├── src/
│   ├── app.js
│   ├── ownerBot.js
│   ├── ownerCleanupCommands.js
│   │
│   ├── testTotal.js
│   ├── testPaymentRequest.js
│   ├── testPendingPayment.js
│   ├── testDuplicatePaymentRequest.js
│   ├── testDuplicateUndoRequest.js
│   ├── testRequestConflict.js
│   ├── testPaymentApprovalRace.js
│   ├── testUndoApprovalRace.js
│   ├── testOwnerReports.js
│   ├── testOwnerReportCategories.js
│   └── testDataCleanupService.js
│
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── PaymentRequest.js
│   │   └── UndoRequest.js
│   │
│   ├── services/
│   │   ├── ledgerService.js
│   │   ├── paymentRequestService.js
│   │   ├── undoRequestService.js
│   │   ├── ownerReportService.js
│   │   └── dataCleanupService.js
│   │
│   └── config/
│       └── db.js
│
├── package.json
├── package-lock.json
├── .env
└── README.md

The exact set of test/helper files can evolve as the project grows.

Environment Variables

Create a local .env file.

Typical variables are:

OWNER_BOT_TOKEN=your_owner_bot_token
CUSTOMER_BOT_TOKEN=your_customer_bot_token
OWNER_TELEGRAM_ID=your_owner_telegram_id
MONGODB_URI=your_mongodb_connection_string

Never commit real secrets to Git.

Recommended .gitignore:

.env
.env.*
!.env.example

An .env.example file can contain placeholder values.

Installation

Clone

git clone <your-repository-url>
cd sr-khata-ledger-bot

Install dependencies

npm install

Configure environment

Create .env:

OWNER_BOT_TOKEN=
CUSTOMER_BOT_TOKEN=
OWNER_TELEGRAM_ID=
MONGODB_URI=

Fill in the real values locally.

Running

Customer Bot

node src/app.js

Expected startup:

Customer Bot is running...
MongoDB Connected Successfully ✅

Owner Bot

node src/ownerBot.js

Expected startup:

MongoDB Connected Successfully ✅
Owner Bot is running...

Treat the two bots as separate processes.

Testing

Service logic is tested independently before Telegram integration.

Customer totals

node src/testTotal.js

Payment request

node src/testPaymentRequest.js

Pending payment requests

node src/testPendingPayment.js

Duplicate payment protection

node src/testDuplicatePaymentRequest.js

Duplicate undo protection

node src/testDuplicateUndoRequest.js

Payment / Undo conflict protection

node src/testRequestConflict.js

Payment approval state protection

node src/testPaymentApprovalRace.js

Undo approval state protection

node src/testUndoApprovalRace.js

Owner report calculation

node src/testOwnerReports.js

Owner report categories

node src/testOwnerReportCategories.js

Data cleanup

node src/testDataCleanupService.js

Syntax Checks

Before starting a bot, check JavaScript syntax.

Customer Bot:

node --check src/app.js

Owner Bot:

node --check src/ownerBot.js

A successful node --check normally produces no output.

No output means Node did not find a syntax error.

Notifications

Customer → Owner

Purchase:

20 cig

creates a purchase transaction and sends an owner notification.

Payment claim:

-20 cash diya

creates a pending payment request and sends an owner notification.

Undo:

/undo

creates a pending undo request and sends an owner notification.

Owner → Customer

Owner actions can notify the customer through the Customer Bot:

✅ Payment Approved
❌ Payment Request Rejected
✅ Undo Request Approved
❌ Undo Request Rejected

Accounting States

The current business meaning of the balance is:

Outstanding > 0
    → Customer owes money

Outstanding = 0
    → Customer is fully settled

Outstanding < 0
    → Customer has credit / overpayment

Example:

Purchase = ₹100
Payment  = ₹120

Outstanding = -₹20

This should be treated as:

Customer Credit = ₹20

not as a debt.

Recommended Operational Workflow

A normal customer transaction:

Customer purchase
       ↓
PURCHASE transaction
       ↓
Customer checks /total
       ↓
Customer pays shop
       ↓
Payment verification request
       ↓
Owner verifies payment
       ↓
Approve / Reject
       ↓
Customer notified

For an incorrect purchase:

Customer notices mistake
       ↓
/undo
       ↓
UndoRequest PENDING
       ↓
Owner reviews request
       ↓
Approve / Reject
       ↓
Customer notified

Ledger Reset Workflow

When the owner intentionally wants to reset historical ledger data:

All customers settle balances
       ↓
Owner checks /report
       ↓
Owner checks /summary
       ↓
Archive/export important history
       ↓
/delete-data
       ↓
Confirm
       ↓
Ledger/request collections cleared
       ↓
Customers remain registered

Because deletion removes historical transactions, important records should be archived or backed up before destructive cleanup.

Security

Owner authorization

Owner Bot operations must remain protected by the configured owner Telegram ID.

Bot tokens

Never publish:

OWNER_BOT_TOKEN
CUSTOMER_BOT_TOKEN

MongoDB credentials

Never publish:

MONGODB_URI

Destructive operations

Ledger deletion should require explicit owner confirmation.

Source control

Do not commit .env, database credentials, or private tokens.

Development Guidelines

Keep business logic in service modules.

Keep Telegram handlers in the bot modules.

Test service logic independently before Telegram integration.

Avoid changing working customer workflows when adding owner features.

Run node --check before starting a modified bot.

Use test data for destructive cleanup tests.

Never test destructive commands against production data.

Keep secrets out of source control.

Current Status

The current project has been tested for:

✅ Purchase recording
✅ Customer totals
✅ Customer history
✅ Payment request creation
✅ Payment verification flow
✅ Payment rejection flow
✅ Undo request creation
✅ Undo approval flow
✅ Undo rejection flow
✅ Customer notifications
✅ Owner notifications
✅ Duplicate payment protection
✅ Duplicate undo protection
✅ Request conflict protection
✅ Payment amount validation
✅ Payment approval state protection
✅ Undo approval state protection
✅ Owner reports
✅ Unpaid customer report
✅ Paid customer report
✅ Credit customer report
✅ Shop summary
✅ Individual customer report
✅ Ledger cleanup service
✅ Customer preservation during cleanup

Production Hardening Notes

The service-level request state transitions have been tested.

Before declaring the application fully production-ready, database consistency around complete approval operations should also be hardened and reviewed under concurrent processing, especially for:

Payment Approval
Undo Approval

The goal is to ensure request state changes and ledger mutations cannot become inconsistent if multiple callbacks are processed at nearly the same time.

Future Improvements

Possible future enhancements:

- Multi-shop support
- Staff roles and permissions
- Customer search by Telegram ID
- Customer management from Owner Bot
- Pagination for large reports
- Daily reports
- Weekly reports
- Monthly reports
- Date-range reports
- CSV / Excel export
- Automatic database backups
- Audit logs
- Transaction reversal records
- Rate limiting
- Structured logging
- Production deployment
- Process manager integration

Useful Commands

Syntax:

node --check src/app.js
node --check src/ownerBot.js

Run Customer Bot:

node src/app.js

Run Owner Bot:

node src/ownerBot.js

Run owner reports test:

node src/testOwnerReports.js

Run cleanup service test:

node src/testDataCleanupService.js

License

Choose the license appropriate for the project.

For example:

MIT License

Replace this section with the project's actual license if different.

Author

Sachin

SR Khata Ledger Bot
