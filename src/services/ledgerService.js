const Transaction = require("../models/Transaction");


// ==========================================
// Create Transaction
// ==========================================

const createTransaction = async ({
    customerId,
    shopId = null,
    type,
    amount,
    telegramMessageId = null,
    telegramUpdateId = null
}) => {

    const transaction = await Transaction.create({
        customerId,
        shopId,
        type,
        amount,
        telegramMessageId,
        telegramUpdateId
    });

    return transaction;
};



// ==========================================
// Get Customer Total
// ==========================================

const getCustomerTotal = async (customerId) => {

    const transactions = await Transaction.find({
        customerId: customerId
    });

    let totalPurchase = 0;
    let totalPayment = 0;

    for (const transaction of transactions) {

        if (transaction.type === "PURCHASE") {

            totalPurchase += transaction.amount;

        }

        if (transaction.type === "PAYMENT") {

            totalPayment += transaction.amount;

        }
    }

    const outstanding = totalPurchase - totalPayment;

    return {
        totalPurchase,
        totalPayment,
        outstanding
    };
};



// ==========================================
// Get Customer History
// ==========================================

const getCustomerHistory = async (
    customerId,
    limit = 10
) => {

    const transactions = await Transaction.find({
        customerId: customerId
    })
        .sort({ createdAt: -1 })
        .limit(limit);

    return transactions;
};


// ==========================================
// Undo Last Purchase
// ==========================================

const undoLastTransaction = async (customerId) => {

    // Find the customer's latest transaction
    const last = await Transaction.findOne({
        customerId
    })
        .sort({
            createdAt: -1
        });

    // No transaction exists
    if (!last) {
        return {
            success: false,
            reason: "NO_TRANSACTION"
        };
    }

    // IMPORTANT:
    // Never delete a PAYMENT using /undo
    if (last.type !== "PURCHASE") {

        return {
            success: false,
            reason: "LATEST_IS_PAYMENT",
            transaction: last
        };
    }

    // Delete latest PURCHASE
    await Transaction.deleteOne({
        _id: last._id
    });

    return {
        success: true,
        transaction: last
    };
};

// ==========================================
// Delete Transaction By ID
// ==========================================

const deleteTransactionById = async (transactionId) => {

    const transaction =
        await Transaction.findByIdAndDelete(
            transactionId
        );

    return transaction;
};


// ==========================================
// Export
// ==========================================

module.exports = {
    createTransaction,
    getCustomerTotal,
    getCustomerHistory,
    deleteTransactionById,
    undoLastTransaction
};