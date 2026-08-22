const UndoRequest = require("../models/UndoRequest");


// ==========================================
// Create Undo Request
// ==========================================

const createUndoRequest = async ({
    customerId,
    transactionId
}) => {

    const undoRequest = await UndoRequest.create({

        customerId,

        transactionId,

        status: "PENDING"

    });

    return undoRequest;
};


// ==========================================
// Find Pending Undo Request
// ==========================================

const findPendingUndoRequest = async ({
    customerId,
    transactionId
}) => {

    const undoRequest = await UndoRequest.findOne({

        customerId,

        transactionId,

        status: "PENDING"

    });

    return undoRequest;
};


// ==========================================
// Get Undo Request By ID
// ==========================================

const getUndoRequestById = async (
    undoRequestId
) => {

    const undoRequest =
        await UndoRequest.findById(
            undoRequestId
        );

    return undoRequest;
};

// ==========================================
// Get Pending Undo Requests
// ==========================================

const getPendingUndoRequests = async () => {

    const requests = await UndoRequest.find({
        status: "PENDING"
    })
        .sort({ createdAt: -1 });

    return requests;
};

// ==========================================
// Approve Undo Request
// ==========================================

const approveUndoRequest = async (
    undoRequestId
) => {

    const undoRequest =
        await UndoRequest.findByIdAndUpdate(

            undoRequestId,

            {
                status: "APPROVED",
                processedAt: new Date()
            },

            {
                new: true
            }
        );

    return undoRequest;
};


// ==========================================
// Reject Undo Request
// ==========================================

const rejectUndoRequest = async (
    undoRequestId
) => {

    const undoRequest =
        await UndoRequest.findByIdAndUpdate(

            undoRequestId,

            {
                status: "REJECTED",
                processedAt: new Date()
            },

            {
                new: true
            }
        );

    return undoRequest;
};


// ==========================================
// Export
// ==========================================

module.exports = {

    createUndoRequest,

    findPendingUndoRequest,

    getUndoRequestById,

    approveUndoRequest,

    rejectUndoRequest,
    
    getPendingUndoRequests

};