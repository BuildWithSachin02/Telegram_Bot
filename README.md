# SR Khata Ledger Bot

> A Telegram-based digital khata and payment-verification system for shops and small businesses.

SR Khata Ledger Bot uses two Telegram bots to manage customer purchases, payment verification, purchase corrections, owner reporting, and ledger cleanup while keeping customer accounts separate from transactional history.

---

## Table of Contents

- [Overview](#overview)
- [Core Workflow](#core-workflow)
- [Customer Bot](#customer-bot)
- [Owner Bot](#owner-bot)
- [Request Lifecycle](#request-lifecycle)
- [Ledger Rules](#ledger-rules)
- [Safety and Validation](#safety-and-validation)
- [Owner Reports](#owner-reports)
- [Ledger Cleanup](#ledger-cleanup)
- [Project Architecture](#project-architecture)
- [Database Models](#database-models)
- [Services](#services)
- [Notifications](#notifications)
- [Environment Configuration](#environment-configuration)
- [Installation](#installation)
- [Running the Bots](#running-the-bots)
- [Testing](#testing)
- [Security](#security)
- [Production Hardening](#production-hardening)
- [Development Guidelines](#development-guidelines)
- [Future Improvements](#future-improvements)
- [License](#license)
- [Author](#author)

---

## Overview

The system is split into two Telegram bots:

| Component | Responsibility |
|---|---|
| **Customer Bot** | Records purchases, submits payment claims, requests undo operations, and lets customers view their khata |
| **Owner Bot** | Reviews payment/undo requests, approves or rejects them, receives notifications, generates reports, and manages ledger cleanup |

The architecture separates:

- actual ledger transactions
- pending payment verification requests
- pending undo requests
- customer identity/account data
- owner reporting
- destructive ledger cleanup

This separation keeps customer records available even when historical ledger data is intentionally cleared.

---

# Core Workflow

## Purchase

```text
Customer
   │
   │  "20 cig"
   ▼
Customer Bot
   │
   ▼
PURCHASE Transaction
   │
   ▼
Customer Ledger Updated
   │
   ▼
Owner Notified
```

## Payment Verification

Customer-submitted payment messages do **not** directly alter the ledger.

```text
Customer
   │
   │  "-20 cash diya"
   ▼
PaymentRequest
   │
   ▼
PENDING
   │
   ▼
Owner Verification
   │
   ├───────────────┐
   │               │
 APPROVE          REJECT
   │               │
   ▼               ▼
PAYMENT         No PAYMENT
created         transaction
   │
   ▼
Ledger Updated
   │
   ▼
Customer Notified
```

## Undo

```text
Customer
   │
   │  /undo
   ▼
UndoRequest
   │
   ▼
PENDING
   │
   ▼
Owner Verification
   │
   ├───────────────┐
   │               │
 APPROVE          REJECT
   │               │
   ▼               ▼
Remove           Purchase
purchase         remains
   │
   ▼
Customer Notified
```

---

# Customer Bot

## Purchase Entry

A customer can send a normal purchase message such as:

```text
20 cig
```

The bot parses the amount and creates a:

```text
PURCHASE
```

transaction.

The purchase immediately affects the customer's khata.

---

## Payment Request

A customer can submit a payment claim such as:

```text
-20 cash diya
```

The bot creates a:

```text
PaymentRequest
status = PENDING
```

The ledger remains unchanged until the owner verifies the request.

### Approved payment

```text
PENDING
   ↓
APPROVED
   ↓
PAYMENT transaction
```

### Rejected payment

```text
PENDING
   ↓
REJECTED
```

No `PAYMENT` transaction is created when a request is rejected.

---

## Undo Request

The customer can request an undo using:

```text
/undo
```

The system creates an `UndoRequest` for the customer's latest purchase.

The owner then decides whether to approve or reject it.

---

## Customer Commands

```text
/total
/history
/undo
```

### `/total`

Shows the current khata totals.

The balance calculation is:

```text
Outstanding = Total Purchase - Total Payment
```

### `/history`

Shows recent transactions.

### `/undo`

Requests removal of the latest eligible purchase.

---

# Owner Bot

The Owner Bot is restricted to the configured owner Telegram ID.

## General Commands

```text
/start
/help
```

## Request Management

```text
/undo
/payments
```

### `/undo`

Displays pending purchase undo requests.

The owner receives:

```text
[✅ Approve Undo] [❌ Reject Undo]
```

### `/payments`

Displays pending payment verification requests.

The owner receives:

```text
[✅ Approve Payment]
[❌ Reject Payment]
```

---

# Owner Reports

Reporting logic is implemented in:

```text
src/services/ownerReportService.js
```

## `/report`

Shows customers who currently owe money.

```text
🔴 UNPAID CUSTOMERS

1. Sachin — ₹500
2. Rahul — ₹250

────────────────
👥 Unpaid: 2
💰 Total Due: ₹750
```

Rule:

```text
Outstanding > 0
```

---

## `/paid`

Shows customers whose current outstanding balance is exactly zero.

```text
🟢 PAID CUSTOMERS

1. Priya
2. Raj

────────────────
👥 Paid: 2
```

Rule:

```text
Outstanding = 0
```

---

## `/credit`

Shows customers whose payment is greater than their purchases.

```text
🔵 CUSTOMER CREDIT

1. Neha — ₹20

────────────────
👥 Credit: 1
💰 Total Credit: ₹20
```

Rule:

```text
Outstanding < 0
```

---

## `/summary`

Shows the overall shop state.

```text
📊 SHOP SUMMARY

👥 Customers: 5

🔴 Unpaid: 2
🟢 Paid: 2
🔵 Credit: 1

🛒 Sales: ₹1,000
💵 Payments: ₹930

💰 Outstanding: ₹70
```

---

## `/customer <name>`

Example:

```text
/customer Sachin
```

Example response:

```text
👤 CUSTOMER REPORT

Name: Sachin
Telegram ID: 1999014485

🛒 Purchase: ₹300
💵 Payment: ₹250

🔴 Due: ₹50
```

---

# Request Lifecycle

## PaymentRequest

```text
PENDING
   │
   ├── APPROVED
   │      └── PAYMENT transaction created
   │
   └── REJECTED
          └── No PAYMENT transaction
```

## UndoRequest

```text
PENDING
   │
   ├── APPROVED
   │      └── Associated purchase removed
   │
   └── REJECTED
          └── Purchase remains
```

A request that is no longer `PENDING` must not be processed again.

---

# Ledger Rules

Transactions currently support:

```text
PURCHASE
PAYMENT
REVERSAL
```

The active khata calculation is:

```text
Outstanding = Total Purchase - Total Payment
```

## Account States

### Unpaid

```text
Outstanding > 0
```

The customer owes money.

### Paid

```text
Outstanding = 0
```

The customer is fully settled.

### Credit

```text
Outstanding < 0
```

The customer has paid more than their recorded purchases.

Example:

```text
Purchase = ₹100
Payment  = ₹120
Outstanding = -₹20
```

This represents:

```text
Customer Credit = ₹20
```

not additional debt.

---

# Safety and Validation

## Duplicate Payment Protection

A customer cannot create multiple pending payment requests at the same time.

Error/reason:

```text
PENDING_PAYMENT_EXISTS
```

## Duplicate Undo Protection

A customer cannot create multiple pending undo requests at the same time.

Error/reason:

```text
PENDING_UNDO_EXISTS
```

## Payment / Undo Conflict Protection

A pending payment request blocks a new undo request.

A pending undo request blocks a new payment request.

This prevents conflicting pending operations for the same customer.

---

## Payment Approval Validation

Before an owner-approved payment is added to the ledger:

- the payment amount must be positive
- the payment amount must be finite
- the customer must exist
- the customer must have an outstanding balance
- the payment must not exceed the current outstanding amount

Example:

```text
Outstanding = ₹50
Requested Payment = ₹60
```

Result:

```text
❌ Approval blocked
❌ No PAYMENT transaction
❌ Khata unchanged
```

The customer is notified that the requested amount could not be approved.

---

## Duplicate Approval Protection

Payment and undo requests use state transitions so that an already processed request cannot simply be approved a second time.

The expected behavior is:

```text
First approval  → ✅ allowed
Second approval → ❌ blocked
```

This has been independently tested at the service layer for both payment and undo requests.

---

# Notifications

## Customer → Owner

The Owner Bot receives notifications when a customer:

```text
records a purchase
submits a payment request
submits an undo request
```

## Owner → Customer

The Customer Bot can notify customers when the owner:

```text
✅ approves a payment
❌ rejects a payment
✅ approves an undo
❌ rejects an undo
⚠️ blocks an invalid payment approval
```

The notification layer is intentionally separate from the Customer Bot's main message-processing flow.

---

# Ledger Cleanup

Cleanup logic is implemented in:

```text
src/services/dataCleanupService.js
```

The service exposes:

```text
deleteAllLedgerData()
```

## Data removed

```text
Transactions       ✅
UndoRequests       ✅
PaymentRequests    ✅
```

## Data preserved

```text
Users / Customers  ✅
```

The cleanup service has been tested to confirm that transactional data is removed while customer accounts remain.

---

## Owner Cleanup Command

The intended owner command is:

```text
/delete-data
```

Expected flow:

```text
/delete-data
        ↓
⚠️ Confirmation
        ↓
[✅ YES, DELETE ALL]
[❌ NO, CANCEL]
```

After confirmation:

```text
Transactions       → deleted
UndoRequests       → deleted
PaymentRequests    → deleted
Users / Customers  → preserved
```

The cancellation path must leave all data unchanged.

Because this is destructive, historical data should be archived or backed up before deletion when record retention is important.

---

# Project Architecture

```text
                    ┌─────────────────┐
                    │  Customer Bot   │
                    │    app.js       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Services     │
                    ├─────────────────┤
                    │ Ledger          │
                    │ PaymentRequest  │
                    │ UndoRequest     │
                    │ Owner Reports   │
                    │ Data Cleanup    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    MongoDB      │
                    ├─────────────────┤
                    │ Users           │
                    │ Transactions    │
                    │ PaymentRequests │
                    │ UndoRequests    │
                    └────────▲────────┘
                             │
                    ┌────────┴────────┐
                    │   Owner Bot     │
                    │  ownerBot.js    │
                    └─────────────────┘
```

---

# Project Structure

```text
sr-khata-ledger-bot/
│
├── src/
│   │
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
├── .gitignore
└── README.md
```

> The exact set of helper/test files may evolve during development.

---

# Database Models

## User

Customer and owner identity data:

```text
telegramUserId
name
username
role
shopId
```

Roles:

```text
OWNER
CUSTOMER
```

Customer records are intentionally preserved during ledger cleanup.

---

## Transaction

Actual ledger activity.

```text
shopId
customerId
type
amount
telegramMessageId
telegramUpdateId
createdAt
updatedAt
```

Transaction types:

```text
PURCHASE
PAYMENT
REVERSAL
```

---

## PaymentRequest

Represents a customer claim that a payment was made.

Important concept:

```text
PaymentRequest != PAYMENT transaction
```

A payment request remains outside the ledger until the owner approves it.

---

## UndoRequest

References a specific transaction that the customer wants removed.

A stale request must never cause an unrelated transaction to be deleted.

---

# Services

## `ledgerService.js`

Responsible for ledger operations such as:

```text
createTransaction()
getCustomerTotal()
getCustomerHistory()
deleteTransactionById()
undoLastTransaction()
```

## `paymentRequestService.js`

Handles payment request lifecycle:

```text
createPaymentRequest()
findPendingPaymentRequest()
getPaymentRequestById()
getPendingPaymentRequests()
approvePaymentRequest()
rejectPaymentRequest()
```

Includes duplicate pending-request protection.

## `undoRequestService.js`

Handles undo request lifecycle:

```text
createUndoRequest()
findPendingUndoRequest()
getUndoRequestById()
getPendingUndoRequests()
approveUndoRequest()
rejectUndoRequest()
```

Includes duplicate and cross-request conflict protection.

## `ownerReportService.js`

Provides:

```text
getCustomerFinancialReports()
getUnpaidCustomers()
getPaidCustomers()
getCreditCustomers()
getShopSummary()
getCustomerReportByName()
```

Reporting uses MongoDB aggregation for customer-level calculations.

## `dataCleanupService.js`

Provides:

```text
deleteAllLedgerData()
```

Deletes ledger/request collections while preserving users.

---

# Environment Configuration

Create a local `.env` file.

Example:

```env
OWNER_BOT_TOKEN=your_owner_bot_token
CUSTOMER_BOT_TOKEN=your_customer_bot_token
OWNER_TELEGRAM_ID=your_owner_telegram_id
MONGODB_URI=your_mongodb_connection_string
```

Never commit real credentials.

Recommended `.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

You can maintain an `.env.example` containing placeholders.

---

# Installation

## 1. Clone

```bash
git clone <your-repository-url>
cd sr-khata-ledger-bot
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment

Create `.env` and provide:

```env
OWNER_BOT_TOKEN=
CUSTOMER_BOT_TOKEN=
OWNER_TELEGRAM_ID=
MONGODB_URI=
```

---

# Running the Bots

## Customer Bot

```bash
node src/app.js
```

Expected:

```text
Customer Bot is running...
MongoDB Connected Successfully ✅
```

## Owner Bot

```bash
node src/ownerBot.js
```

Expected:

```text
MongoDB Connected Successfully ✅
Owner Bot is running...
```

Run the bots as separate processes.

---

# Testing

The project follows a service-first testing approach: business logic is verified independently before relying on Telegram integration.

## Customer totals

```bash
node src/testTotal.js
```

## Payment request creation

```bash
node src/testPaymentRequest.js
```

## Pending payments

```bash
node src/testPendingPayment.js
```

## Duplicate payment protection

```bash
node src/testDuplicatePaymentRequest.js
```

## Duplicate undo protection

```bash
node src/testDuplicateUndoRequest.js
```

## Request conflict protection

```bash
node src/testRequestConflict.js
```

## Payment approval state protection

```bash
node src/testPaymentApprovalRace.js
```

## Undo approval state protection

```bash
node src/testUndoApprovalRace.js
```

## Owner reports

```bash
node src/testOwnerReports.js
```

## Owner report categories

```bash
node src/testOwnerReportCategories.js
```

## Ledger cleanup

```bash
node src/testDataCleanupService.js
```

---

# Syntax Validation

Before starting a modified bot:

```bash
node --check src/app.js
```

```bash
node --check src/ownerBot.js
```

A successful `node --check` normally prints nothing.

That means Node found no JavaScript syntax error.

---

# Security

## Owner authorization

Owner-only functionality must remain protected by the configured owner Telegram ID.

## Secrets

Never publish:

```text
OWNER_BOT_TOKEN
CUSTOMER_BOT_TOKEN
MONGODB_URI
```

## Destructive operations

Ledger cleanup should require explicit confirmation.

## Source control

Do not commit:

```text
.env
private tokens
database credentials
```

---

# Production Hardening

The service layer has been tested for:

```text
✅ duplicate payment protection
✅ duplicate undo protection
✅ payment/undo request conflicts
✅ payment approval state protection
✅ undo approval state protection
✅ payment-over-outstanding validation
```

Before calling the system fully production-ready, the complete Owner Bot approval operations should also be reviewed for transaction-level consistency under concurrent callbacks, especially:

```text
Payment Approval
Undo Approval
```

The goal is to ensure that request state changes and ledger mutations cannot become inconsistent if multiple owner callbacks are processed nearly simultaneously.

---

# Development Guidelines

- Keep business logic in service modules.
- Keep Telegram interaction logic in the bot modules.
- Test service logic independently before integration.
- Avoid changing working customer workflows unnecessarily.
- Run `node --check` before starting modified bots.
- Use dedicated test data for destructive tests.
- Never test destructive cleanup against production data.
- Keep secrets outside source control.
- Prefer clear request states such as `PENDING`, `APPROVED`, and `REJECTED`.
- Preserve customer identity data separately from disposable ledger history.

---

# Operational Workflow

## Normal transaction

```text
Customer purchase
        ↓
PURCHASE transaction
        ↓
Customer checks /total
        ↓
Customer makes payment
        ↓
Payment verification request
        ↓
Owner reviews payment
        ↓
Approve / Reject
        ↓
Customer notified
```

## Incorrect purchase

```text
Customer notices mistake
        ↓
/undo
        ↓
UndoRequest PENDING
        ↓
Owner reviews
        ↓
Approve / Reject
        ↓
Customer notified
```

## Ledger reset

```text
Customers settle balances
        ↓
Owner checks /report
        ↓
Owner checks /summary
        ↓
Archive important history
        ↓
/delete-data
        ↓
Explicit confirmation
        ↓
Ledger/request collections cleared
        ↓
Customer accounts preserved
```

---

# Current Status

The implemented workflow has been tested for:

```text
✅ Purchase recording
✅ Customer totals
✅ Customer history
✅ Payment request creation
✅ Payment approval flow
✅ Payment rejection flow
✅ Undo request creation
✅ Undo approval flow
✅ Undo rejection flow
✅ Owner notifications
✅ Customer notifications
✅ Duplicate payment protection
✅ Duplicate undo protection
✅ Request conflict protection
✅ Payment amount validation
✅ Payment approval state protection
✅ Undo approval state protection
✅ Owner reports
✅ Unpaid customer reporting
✅ Paid customer reporting
✅ Credit customer reporting
✅ Shop summary
✅ Individual customer reporting
✅ Ledger cleanup
✅ Customer preservation during cleanup
```

---

# Future Improvements

Potential enhancements include:

```text
- Multi-shop support
- Staff roles and permissions
- Customer search by Telegram ID
- Customer management from Owner Bot
- Pagination for large reports
- Daily reports
- Weekly reports
- Monthly reports
- Date-range reporting
- CSV / Excel export
- Automated database backups
- Audit logs
- Transaction reversal records
- Rate limiting
- Structured logging
- Production deployment
- Process manager integration
```

---

# License

Choose the license appropriate for the project.

Example:

```text
MIT License
```

Replace this section with the project's actual license if different.

---

# Author

**Sachin**

**SR Khata Ledger Bot**
