const PaymentRequest = require("../models/PaymentRequest");
const UndoRequest = require("../models/UndoRequest");


// ==========================================
// Create Payment Request
// ==========================================

const createPaymentRequest = async ({
    customerId,
    amount,
    message,
    telegramMessageId = null,
    telegramUpdateId = null
}) => {

    // ==========================================
    // Validate amount
    // ==========================================

    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        return {
            success: false,
            reason: "INVALID_PAYMENT_AMOUNT"
        };
    }


    // ==========================================
    // Prevent pending Undo conflict
    // ==========================================

    const existingUndoRequest =
        await UndoRequest.findOne({
            customerId,
            status: "PENDING"
        });

    if (existingUndoRequest) {

        return {
            success: false,
            reason: "PENDING_UNDO_EXISTS",
            request: existingUndoRequest
        };
    }


    // ==========================================
    // Prevent duplicate pending Payment request
    // ==========================================

    const existingPaymentRequest =
        await PaymentRequest.findOne({
            customerId,
            status: "PENDING"
        });

    if (existingPaymentRequest) {

        return {
            success: false,
            reason: "PENDING_PAYMENT_EXISTS",
            request: existingPaymentRequest
        };
    }


    // ==========================================
    // Create Payment Request
    // ==========================================

    const paymentRequest =
        await PaymentRequest.create({

            customerId,

            amount,

            message,

            telegramMessageId,

            telegramUpdateId,

            status: "PENDING"
        });


    return {

        success: true,

        request: paymentRequest
    };
};


// ==========================================
// Find Pending Payment Request
// ==========================================

const findPendingPaymentRequest = async ({
    customerId,
    amount = null
}) => {

    const query = {

        customerId,

        status: "PENDING"
    };


    if (amount !== null) {

        query.amount = amount;
    }


    const request =
        await PaymentRequest
            .findOne(query)
            .sort({
                createdAt: -1
            });


    return request;
};


// ==========================================
// Get Payment Request By ID
// ==========================================

const getPaymentRequestById = async (
    paymentRequestId
) => {

    const request =
        await PaymentRequest.findById(
            paymentRequestId
        );


    return request;
};


// ==========================================
// Get Pending Payment Requests
// ==========================================

const getPendingPaymentRequests = async () => {

    const requests =
        await PaymentRequest
            .find({
                status: "PENDING"
            })
            .sort({
                createdAt: -1
            });


    return requests;
};


// ==========================================
// Approve Payment Request
// ==========================================
//
// IMPORTANT:
//
// This function performs an ATOMIC state transition:
//
// PENDING → APPROVED
//
// Because the query includes:
//
// status: "PENDING"
//
// only one approval can succeed.
//
// If the owner clicks Approve again,
// this function returns null.
//
// ==========================================

const approvePaymentRequest = async (
    paymentRequestId
) => {

    const request =
        await PaymentRequest.findOneAndUpdate(

            {
                _id: paymentRequestId,

                status: "PENDING"
            },

            {
                $set: {

                    status: "APPROVED",

                    processedAt: new Date()
                }
            },

            {
                returnDocument: "after"
            }
        );


    return request;
};


// ==========================================
// Reject Payment Request
// ==========================================
//
// Same atomic protection:
//
// PENDING → REJECTED
//
// A second Reject/Approve click will
// return null because the request is
// no longer PENDING.
//
// ==========================================

const rejectPaymentRequest = async (
    paymentRequestId
) => {

    const request =
        await PaymentRequest.findOneAndUpdate(

            {
                _id: paymentRequestId,

                status: "PENDING"
            },

            {
                $set: {

                    status: "REJECTED",

                    processedAt: new Date()
                }
            },

            {
                returnDocument: "after"
            }
        );


    return request;
};


// ==========================================
// Export
// ==========================================

module.exports = {

    createPaymentRequest,

    findPendingPaymentRequest,

    getPaymentRequestById,

    getPendingPaymentRequests,

    approvePaymentRequest,

    rejectPaymentRequest

};