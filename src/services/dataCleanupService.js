const Transaction = require("../models/Transaction");
const UndoRequest = require("../models/UndoRequest");
const PaymentRequest = require("../models/PaymentRequest");


// ==========================================
// Delete All Ledger Data
// ==========================================
//
// Deletes:
// - All Transactions
// - All Undo Requests
// - All Payment Requests
//
// Does NOT delete:
// - Users
// - Customers
//
// Returns detailed deletion counts.
//
// ==========================================

const deleteAllLedgerData = async () => {

    // ==========================================
    // 1. Delete Transactions
    // ==========================================

    const transactionResult =
        await Transaction.deleteMany({});


    // ==========================================
    // 2. Delete Undo Requests
    // ==========================================

    const undoRequestResult =
        await UndoRequest.deleteMany({});


    // ==========================================
    // 3. Delete Payment Requests
    // ==========================================

    const paymentRequestResult =
        await PaymentRequest.deleteMany({});


    // ==========================================
    // Return result
    // ==========================================

    return {

        transactionsDeleted:
            transactionResult.deletedCount || 0,

        undoRequestsDeleted:
            undoRequestResult.deletedCount || 0,

        paymentRequestsDeleted:
            paymentRequestResult.deletedCount || 0
    };
};


// ==========================================
// Export
// ==========================================

module.exports = {

    deleteAllLedgerData

};