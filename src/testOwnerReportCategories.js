require("dotenv").config();

const connectDB = require("./config/db");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const {
    getUnpaidCustomers,
    getPaidCustomers,
    getCreditCustomers,
    getShopSummary
} = require("./services/ownerReportService");


const TEST_TELEGRAM_PREFIX = 9990000000;


const createTestCustomer = async (
    name,
    index
) => {

    return await User.create({

        telegramUserId:
            TEST_TELEGRAM_PREFIX + index,

        name,

        username:
            `report_test_${index}`,

        role: "CUSTOMER",

        shopId: null

    });
};


const createTestTransaction = async ({
    customerId,
    type,
    amount,
    updateId
}) => {

    return await Transaction.create({

        customerId,

        type,

        amount,

        telegramMessageId:
            updateId,

        telegramUpdateId:
            updateId

    });
};


const testOwnerReportCategories = async () => {

    try {

        await connectDB();

        console.log("--------------------------------");
        console.log("OWNER REPORT CATEGORY TEST");
        console.log("--------------------------------");


        // ==========================================
        // 1. Clean old test data
        // ==========================================

        const testUsers =
            await User.find({

                username: {
                    $regex: /^report_test_/
                }

            });


        const testUserIds =
            testUsers.map(
                user => user._id
            );


        if (testUserIds.length > 0) {

            await Transaction.deleteMany({

                customerId: {
                    $in: testUserIds
                }

            });

            await User.deleteMany({

                _id: {
                    $in: testUserIds
                }

            });
        }


        console.log(
            "Old category test data cleared."
        );


        // ==========================================
        // 2. Create test customers
        // ==========================================

        const unpaid =
            await createTestCustomer(
                "Report Unpaid",
                1
            );


        const paid =
            await createTestCustomer(
                "Report Paid",
                2
            );


        const credit =
            await createTestCustomer(
                "Report Credit",
                3
            );


        console.log(
            "Test customers created ✅"
        );


        // ==========================================
        // 3. UNPAID
        //
        // Purchase 100
        // Payment 40
        // Outstanding 60
        // ==========================================

        await createTestTransaction({

            customerId:
                unpaid._id,

            type:
                "PURCHASE",

            amount:
                100,

            updateId:
                990001
        });


        await createTestTransaction({

            customerId:
                unpaid._id,

            type:
                "PAYMENT",

            amount:
                40,

            updateId:
                990002
        });


        // ==========================================
        // 4. PAID
        //
        // Purchase 100
        // Payment 100
        // Outstanding 0
        // ==========================================

        await createTestTransaction({

            customerId:
                paid._id,

            type:
                "PURCHASE",

            amount:
                100,

            updateId:
                990003
        });


        await createTestTransaction({

            customerId:
                paid._id,

            type:
                "PAYMENT",

            amount:
                100,

            updateId:
                990004
        });


        // ==========================================
        // 5. CREDIT
        //
        // Purchase 100
        // Payment 120
        // Outstanding -20
        // ==========================================

        await createTestTransaction({

            customerId:
                credit._id,

            type:
                "PURCHASE",

            amount:
                100,

            updateId:
                990005
        });


        await createTestTransaction({

            customerId:
                credit._id,

            type:
                "PAYMENT",

            amount:
                120,

            updateId:
                990006
        });


        console.log(
            "Test transactions created ✅"
        );


        // ==========================================
        // 6. Get categories
        // ==========================================

        const unpaidCustomers =
            await getUnpaidCustomers();


        const paidCustomers =
            await getPaidCustomers();


        const creditCustomers =
            await getCreditCustomers();


        const summary =
            await getShopSummary();


        // ==========================================
        // 7. Display result
        // ==========================================

        console.log("--------------------------------");
        console.log("UNPAID CUSTOMERS");
        console.log("--------------------------------");


        for (
            const customer of
            unpaidCustomers
        ) {

            if (
                customer.username?.startsWith(
                    "report_test_"
                )
            ) {

                console.log(
                    `${customer.name}: ₹${customer.outstanding}`
                );
            }
        }


        console.log("--------------------------------");
        console.log("PAID CUSTOMERS");
        console.log("--------------------------------");


        for (
            const customer of
            paidCustomers
        ) {

            if (
                customer.username?.startsWith(
                    "report_test_"
                )
            ) {

                console.log(
                    `${customer.name}: ₹${customer.outstanding}`
                );
            }
        }


        console.log("--------------------------------");
        console.log("CREDIT CUSTOMERS");
        console.log("--------------------------------");


        for (
            const customer of
            creditCustomers
        ) {

            if (
                customer.username?.startsWith(
                    "report_test_"
                )
            ) {

                console.log(
                    `${customer.name}: ₹${Math.abs(
                        customer.outstanding
                    )} credit`
                );
            }
        }


        // ==========================================
        // 8. Validation
        // ==========================================

        console.log("--------------------------------");
        console.log("VALIDATION");
        console.log("--------------------------------");


        const unpaidTest =
            unpaidCustomers.find(
                customer =>
                    customer.customerId.toString() ===
                    unpaid._id.toString()
            );


        const paidTest =
            paidCustomers.find(
                customer =>
                    customer.customerId.toString() ===
                    paid._id.toString()
            );


        const creditTest =
            creditCustomers.find(
                customer =>
                    customer.customerId.toString() ===
                    credit._id.toString()
            );


        if (
            unpaidTest &&
            unpaidTest.outstanding === 60
        ) {

            console.log(
                "UNPAID ₹60 validation: PASSED ✅"
            );

        } else {

            throw new Error(
                "UNPAID category validation failed."
            );
        }


        if (
            paidTest &&
            paidTest.outstanding === 0
        ) {

            console.log(
                "PAID ₹0 validation: PASSED ✅"
            );

        } else {

            throw new Error(
                "PAID category validation failed."
            );
        }


        if (
            creditTest &&
            creditTest.outstanding === -20
        ) {

            console.log(
                "CREDIT -₹20 validation: PASSED ✅"
            );

        } else {

            throw new Error(
                "CREDIT category validation failed."
            );
        }


        // ==========================================
        // Summary validation
        // ==========================================

        if (
            summary.totalPurchase >= 300 &&
            summary.totalPayment >= 260
        ) {

            console.log(
                "Summary totals validation: PASSED ✅"
            );

        } else {

            throw new Error(
                "Summary totals validation failed."
            );
        }


        // ==========================================
        // Success
        // ==========================================

        console.log("--------------------------------");
        console.log(
            "OWNER REPORT CATEGORY TEST PASSED ✅"
        );
        console.log("--------------------------------");


        // ==========================================
        // Cleanup
        // ==========================================

        await Transaction.deleteMany({

            customerId: {
                $in: [
                    unpaid._id,
                    paid._id,
                    credit._id
                ]
            }

        });


        await User.deleteMany({

            _id: {
                $in: [
                    unpaid._id,
                    paid._id,
                    credit._id
                ]
            }

        });


        console.log(
            "Category test data cleaned successfully ✅"
        );

        console.log("--------------------------------");


        process.exit(0);

    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "OWNER REPORT CATEGORY TEST FAILED ❌"
        );

        console.error("--------------------------------");

        console.error(error);

        process.exit(1);
    }
};


testOwnerReportCategories();