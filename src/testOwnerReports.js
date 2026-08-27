require("dotenv").config();

const connectDB = require("./config/db");

const Transaction = require("./models/Transaction");

const {
    getCustomerFinancialReports,
    getUnpaidCustomers,
    getPaidCustomers,
    getCreditCustomers,
    getShopSummary
} = require("./services/ownerReportService");


// ==========================================
// Test Owner Reports
// ==========================================

const testOwnerReports = async () => {

    try {

        await connectDB();


        console.log("--------------------------------");
        console.log("OWNER REPORT TEST");
        console.log("--------------------------------");


        // ==========================================
        // Get reports
        // ==========================================

        const reports =
            await getCustomerFinancialReports();


        const unpaidCustomers =
            await getUnpaidCustomers();


        const paidCustomers =
            await getPaidCustomers();


        const creditCustomers =
            await getCreditCustomers();


        const summary =
            await getShopSummary();


        // ==========================================
        // Summary
        // ==========================================

        console.log("--------------------------------");
        console.log("SHOP SUMMARY");
        console.log("--------------------------------");

        console.log(
            "Total Customers:",
            summary.totalCustomers
        );

        console.log(
            "Unpaid Customers:",
            summary.unpaidCustomers
        );

        console.log(
            "Paid Customers:",
            summary.paidCustomers
        );

        console.log(
            "Credit Customers:",
            summary.creditCustomers
        );

        console.log(
            "Total Purchase:",
            summary.totalPurchase
        );

        console.log(
            "Total Payment:",
            summary.totalPayment
        );

        console.log(
            "Total Outstanding:",
            summary.totalOutstanding
        );


        // ==========================================
        // Unpaid customers
        // ==========================================

        console.log("--------------------------------");
        console.log("UNPAID CUSTOMERS");
        console.log("--------------------------------");


        if (unpaidCustomers.length === 0) {

            console.log(
                "No unpaid customers."
            );

        } else {

            unpaidCustomers.forEach(
                (customer, index) => {

                    console.log(
                        `${index + 1}. ${customer.name} | ₹${customer.outstanding}`
                    );

                    console.log(
                        `   Telegram ID: ${customer.telegramUserId}`
                    );
                }
            );
        }


        // ==========================================
        // Paid customers
        // ==========================================

        console.log("--------------------------------");
        console.log("PAID CUSTOMERS");
        console.log("--------------------------------");


        if (paidCustomers.length === 0) {

            console.log(
                "No fully paid customers."
            );

        } else {

            paidCustomers.forEach(
                (customer, index) => {

                    console.log(
                        `${index + 1}. ${customer.name} | ₹0`
                    );

                    console.log(
                        `   Telegram ID: ${customer.telegramUserId}`
                    );
                }
            );
        }


        // ==========================================
        // Credit customers
        // ==========================================

        console.log("--------------------------------");
        console.log("CREDIT CUSTOMERS");
        console.log("--------------------------------");


        if (creditCustomers.length === 0) {

            console.log(
                "No credit customers."
            );

        } else {

            creditCustomers.forEach(
                (customer, index) => {

                    console.log(
                        `${index + 1}. ${customer.name} | Credit ₹${Math.abs(customer.outstanding)}`
                    );

                    console.log(
                        `   Telegram ID: ${customer.telegramUserId}`
                    );
                }
            );
        }


        // ==========================================
        // Verify calculations
        // ==========================================

        console.log("--------------------------------");
        console.log("VALIDATION");
        console.log("--------------------------------");


        const calculatedOutstanding =
            summary.totalPurchase -
            summary.totalPayment;


        if (
            calculatedOutstanding ===
            summary.totalOutstanding
        ) {

            console.log(
                "Outstanding calculation: PASSED ✅"
            );

        } else {

            console.log(
                "Outstanding calculation: FAILED ❌"
            );

            console.log(
                "Expected:",
                calculatedOutstanding
            );

            console.log(
                "Actual:",
                summary.totalOutstanding
            );

            process.exit(1);
        }


        // ==========================================
        // Verify customer categories
        // ==========================================

        const categoryCount =
            unpaidCustomers.length +
            paidCustomers.length +
            creditCustomers.length;


        if (
            categoryCount ===
            reports.length
        ) {

            console.log(
                "Customer categorization: PASSED ✅"
            );

        } else {

            console.log(
                "Customer categorization: FAILED ❌"
            );

            console.log(
                "Reports:",
                reports.length
            );

            console.log(
                "Categories:",
                categoryCount
            );

            process.exit(1);
        }


        // ==========================================
        // Final result
        // ==========================================

        console.log("--------------------------------");
        console.log(
            "OWNER REPORT TEST PASSED ✅"
        );
        console.log("--------------------------------");


        process.exit(0);


    } catch (error) {

        console.error("--------------------------------");

        console.error(
            "OWNER REPORT TEST FAILED ❌"
        );

        console.error("--------------------------------");

        console.error(error);

        process.exit(1);
    }
};


testOwnerReports();