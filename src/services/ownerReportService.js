const Transaction = require("../models/Transaction");
const User = require("../models/User");


// ==========================================
// Get All Customer Financial Reports
// ==========================================

const getCustomerFinancialReports = async () => {

    const reports = await Transaction.aggregate([

        // ==========================================
        // 1. Group transactions by customer
        // ==========================================

        {
            $group: {

                _id: "$customerId",

                totalPurchase: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$type",
                                    "PURCHASE"
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },

                totalPayment: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$type",
                                    "PAYMENT"
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },


        // ==========================================
        // 2. Calculate outstanding
        // ==========================================

        {
            $addFields: {

                outstanding: {
                    $subtract: [
                        "$totalPurchase",
                        "$totalPayment"
                    ]
                }
            }
        },


        // ==========================================
        // 3. Get customer information
        // ==========================================

        {
            $lookup: {

                from: User.collection.name,

                localField: "_id",

                foreignField: "_id",

                as: "customer"
            }
        },


        // ==========================================
        // 4. Convert customer array to object
        // ==========================================

        {
            $unwind: {

                path: "$customer",

                preserveNullAndEmptyArrays: false
            }
        },


        // ==========================================
        // 5. Only CUSTOMER accounts
        // ==========================================

        {
            $match: {

                "customer.role": "CUSTOMER"
            }
        },


        // ==========================================
        // 6. Return clean report
        // ==========================================

        {
            $project: {

                _id: 0,

                customerId: "$_id",

                name: "$customer.name",

                username: "$customer.username",

                telegramUserId:
                    "$customer.telegramUserId",

                totalPurchase: 1,

                totalPayment: 1,

                outstanding: 1
            }
        },


        // ==========================================
        // 7. Highest outstanding first
        // ==========================================

        {
            $sort: {

                outstanding: -1,

                name: 1
            }
        }

    ]);


    return reports;
};


// ==========================================
// Get Unpaid Customers
// ==========================================

const getUnpaidCustomers = async () => {

    const reports =
        await getCustomerFinancialReports();


    return reports.filter(
        customer =>
            customer.outstanding > 0
    );
};


// ==========================================
// Get Paid Customers
// ==========================================

const getPaidCustomers = async () => {

    const reports =
        await getCustomerFinancialReports();


    return reports.filter(
        customer =>
            customer.outstanding === 0
    );
};


// ==========================================
// Get Customers With Credit
// ==========================================

const getCreditCustomers = async () => {

    const reports =
        await getCustomerFinancialReports();


    return reports.filter(
        customer =>
            customer.outstanding < 0
    );
};


// ==========================================
// Get Shop Summary
// ==========================================

const getShopSummary = async () => {

    const reports =
        await getCustomerFinancialReports();


    let totalPurchase = 0;

    let totalPayment = 0;

    let totalOutstanding = 0;

    let unpaidCustomers = 0;

    let paidCustomers = 0;

    let creditCustomers = 0;


    for (const customer of reports) {

        totalPurchase +=
            customer.totalPurchase;

        totalPayment +=
            customer.totalPayment;


        if (customer.outstanding > 0) {

            unpaidCustomers++;

        } else if (customer.outstanding === 0) {

            paidCustomers++;

        } else {

            creditCustomers++;
        }
    }


    totalOutstanding =
        totalPurchase -
        totalPayment;


    return {

        totalCustomers:
            reports.length,

        unpaidCustomers,

        paidCustomers,

        creditCustomers,

        totalPurchase,

        totalPayment,

        totalOutstanding
    };
};


// ==========================================
// Get Customer Report By Name
// ==========================================

const getCustomerReportByName = async (
    name
) => {

    if (!name || !name.trim()) {

        return null;
    }


    const customer =
        await User.findOne({

            role: "CUSTOMER",

            name: {
                $regex:
                    `^${name.trim()}$`,

                $options: "i"
            }
        });


    if (!customer) {

        return null;
    }


    const result =
        await Transaction.aggregate([

            {
                $match: {

                    customerId:
                        customer._id
                }
            },


            {
                $group: {

                    _id: null,

                    totalPurchase: {

                        $sum: {

                            $cond: [

                                {
                                    $eq: [
                                        "$type",
                                        "PURCHASE"
                                    ]
                                },

                                "$amount",

                                0
                            ]
                        }
                    },


                    totalPayment: {

                        $sum: {

                            $cond: [

                                {
                                    $eq: [
                                        "$type",
                                        "PAYMENT"
                                    ]
                                },

                                "$amount",

                                0
                            ]
                        }
                    }
                }
            }

        ]);


    const totals =
        result[0] || {

            totalPurchase: 0,

            totalPayment: 0
        };


    return {

        customerId:
            customer._id,

        name:
            customer.name,

        username:
            customer.username,

        telegramUserId:
            customer.telegramUserId,

        totalPurchase:
            totals.totalPurchase,

        totalPayment:
            totals.totalPayment,

        outstanding:
            totals.totalPurchase -
            totals.totalPayment
    };
};


// ==========================================
// Export
// ==========================================

module.exports = {

    getCustomerFinancialReports,

    getUnpaidCustomers,

    getPaidCustomers,

    getCreditCustomers,

    getShopSummary,

    getCustomerReportByName
};