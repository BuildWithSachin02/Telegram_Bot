const {
    deleteAllLedgerData
} = require("./services/dataCleanupService");


// ==========================================
// OWNER CLEANUP COMMANDS
// ==========================================

const registerOwnerCleanupCommands = (
    ownerBot,
    ownerTelegramId
) => {

    // ==========================================
    // Pending confirmation storage
    // ==========================================

    const pendingConfirmations =
        new Map();


    // ==========================================
    // Confirmation expiration
    // ==========================================

    const CONFIRMATION_TIMEOUT =
        60 * 1000;


    // ==========================================
    // /DELETE-DATA
    // ==========================================

    ownerBot.command(
        "delete-data",
        async (ctx) => {

            try {

                const telegramUserId =
                    Number(ctx.from?.id);


                // ==========================================
                // Extra owner safety check
                // ==========================================

                if (
                    !telegramUserId ||
                    telegramUserId !==
                        Number(ownerTelegramId)
                ) {

                    await ctx.reply(
                        "⛔ You are not authorized to use this command."
                    );

                    return;
                }


                // ==========================================
                // Create confirmation token
                // ==========================================

                const token =
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 12)}`;


                pendingConfirmations.set(
                    telegramUserId,
                    {
                        token,
                        createdAt: Date.now()
                    }
                );


                // ==========================================
                // Auto-expire confirmation
                // ==========================================

                setTimeout(
                    () => {

                        const current =
                            pendingConfirmations.get(
                                telegramUserId
                            );


                        if (
                            current &&
                            current.token === token
                        ) {

                            pendingConfirmations.delete(
                                telegramUserId
                            );

                        }

                    },
                    CONFIRMATION_TIMEOUT
                );


                // ==========================================
                // Warning message
                // ==========================================

                await ctx.reply(

                    "⚠️ *DELETE ENTIRE LEDGER DATA*\n\n" +

                    "This action will permanently delete:\n\n" +

                    "🗑 All Transactions\n" +
                    "🗑 All Undo Requests\n" +
                    "🗑 All Payment Requests\n\n" +

                    "👥 *Customers will NOT be deleted.*\n" +
                    "👥 *Customer accounts will remain.*\n\n" +

                    "⚠️ This action cannot be undone.\n\n" +

                    "Are you sure you want to continue?",

                    {
                        parse_mode: "Markdown",

                        reply_markup: {

                            inline_keyboard: [

                                [

                                    {
                                        text:
                                            "✅ YES, DELETE ALL",

                                        callback_data:
                                            `cleanup_yes:${token}`
                                    }

                                ],

                                [

                                    {
                                        text:
                                            "❌ NO, CANCEL",

                                        callback_data:
                                            `cleanup_no:${token}`
                                    }

                                ]

                            ]

                        }

                    }

                );


                console.log("--------------------------------");

                console.log(
                    "Owner requested full ledger deletion confirmation."
                );

                console.log(
                    "Confirmation expires in 60 seconds."
                );

                console.log("--------------------------------");


            } catch (error) {

                console.error(
                    "Delete-data command failed ❌"
                );

                console.error(error);


                await ctx.reply(
                    "❌ Unable to start the deletion confirmation."
                );

            }

        }
    );


    // ==========================================
    // YES — DELETE EVERYTHING
    // ==========================================

    ownerBot.action(
        /^cleanup_yes:(.+)$/,
        async (ctx) => {

            try {

                const telegramUserId =
                    Number(ctx.from?.id);


                // ==========================================
                // Owner check
                // ==========================================

                if (
                    !telegramUserId ||
                    telegramUserId !==
                        Number(ownerTelegramId)
                ) {

                    await ctx.answerCbQuery(
                        "⛔ Unauthorized.",
                        {
                            show_alert: true
                        }
                    );

                    return;
                }


                const token =
                    ctx.match[1];


                const confirmation =
                    pendingConfirmations.get(
                        telegramUserId
                    );


                // ==========================================
                // Validate confirmation
                // ==========================================

                if (
                    !confirmation ||
                    confirmation.token !== token
                ) {

                    await ctx.answerCbQuery(
                        "⚠️ Confirmation expired or invalid.",
                        {
                            show_alert: true
                        }
                    );

                    return;
                }


                // ==========================================
                // Remove token BEFORE deletion
                //
                // Prevents the same confirmation
                // from being reused.
                // ==========================================

                pendingConfirmations.delete(
                    telegramUserId
                );


                // ==========================================
                // Remove buttons immediately
                // ==========================================

                try {

                    await ctx.editMessageReplyMarkup({
                        inline_keyboard: []
                    });

                } catch (buttonError) {

                    console.log(
                        "Could not remove cleanup buttons:",
                        buttonError.message
                    );

                }


                await ctx.answerCbQuery(
                    "Deleting ledger data..."
                );


                console.log("--------------------------------");

                console.log(
                    "FULL LEDGER DELETION CONFIRMED BY OWNER"
                );

                console.log(
                    "Owner Telegram ID:",
                    telegramUserId
                );

                console.log("--------------------------------");


                // ==========================================
                // DELETE LEDGER DATA
                // ==========================================

                const result =
                    await deleteAllLedgerData();


                // ==========================================
                // Success message
                // ==========================================

                await ctx.reply(

                    "✅ *LEDGER DATA CLEARED*\n\n" +

                    `🗑 Transactions deleted: ${result.transactionsDeleted}\n` +

                    `🗑 Undo Requests deleted: ${result.undoRequestsDeleted}\n` +

                    `🗑 Payment Requests deleted: ${result.paymentRequestsDeleted}\n\n` +

                    "👥 *Customers were NOT deleted.*\n" +

                    "👥 *Customer accounts remain available.*\n\n" +

                    "✅ Ledger is now clean.",

                    {
                        parse_mode: "Markdown"
                    }

                );


                console.log("--------------------------------");

                console.log(
                    "Full ledger deletion completed successfully ✅"
                );

                console.log(
                    "Transactions deleted:",
                    result.transactionsDeleted
                );

                console.log(
                    "Undo requests deleted:",
                    result.undoRequestsDeleted
                );

                console.log(
                    "Payment requests deleted:",
                    result.paymentRequestsDeleted
                );

                console.log(
                    "Customers preserved ✅"
                );

                console.log("--------------------------------");


            } catch (error) {

                console.error(
                    "Full ledger deletion failed ❌"
                );

                console.error(error);


                try {

                    await ctx.answerCbQuery(
                        "Deletion failed.",
                        {
                            show_alert: true
                        }
                    );

                } catch (_) {}


                await ctx.reply(

                    "❌ *Ledger deletion failed.*\n\n" +

                    "No success confirmation was recorded.\n\n" +

                    "Please check the server logs.",

                    {
                        parse_mode: "Markdown"
                    }

                );

            }

        }
    );


    // ==========================================
    // NO — CANCEL
    // ==========================================

    ownerBot.action(
        /^cleanup_no:(.+)$/,
        async (ctx) => {

            try {

                const telegramUserId =
                    Number(ctx.from?.id);


                // ==========================================
                // Owner check
                // ==========================================

                if (
                    !telegramUserId ||
                    telegramUserId !==
                        Number(ownerTelegramId)
                ) {

                    await ctx.answerCbQuery(
                        "⛔ Unauthorized.",
                        {
                            show_alert: true
                        }
                    );

                    return;
                }


                const token =
                    ctx.match[1];


                const confirmation =
                    pendingConfirmations.get(
                        telegramUserId
                    );


                // ==========================================
                // Check valid confirmation
                // ==========================================

                if (
                    !confirmation ||
                    confirmation.token !== token
                ) {

                    await ctx.answerCbQuery(
                        "⚠️ This confirmation has expired.",
                        {
                            show_alert: true
                        }
                    );

                    return;
                }


                // ==========================================
                // Delete pending confirmation
                // ==========================================

                pendingConfirmations.delete(
                    telegramUserId
                );


                // ==========================================
                // Remove buttons
                // ==========================================

                try {

                    await ctx.editMessageReplyMarkup({
                        inline_keyboard: []
                    });

                } catch (buttonError) {

                    console.log(
                        "Could not remove cleanup buttons:",
                        buttonError.message
                    );

                }


                await ctx.answerCbQuery(
                    "Deletion cancelled."
                );


                await ctx.reply(

                    "❌ *Deletion Cancelled*\n\n" +

                    "No ledger data was deleted.\n\n" +

                    "✅ Transactions remain safe.\n" +

                    "✅ Undo requests remain safe.\n" +

                    "✅ Payment requests remain safe.\n" +

                    "✅ Customers remain safe.",

                    {
                        parse_mode: "Markdown"
                    }

                );


                console.log("--------------------------------");

                console.log(
                    "Full ledger deletion cancelled by owner."
                );

                console.log("--------------------------------");


            } catch (error) {

                console.error(
                    "Cleanup cancellation failed ❌"
                );

                console.error(error);


                await ctx.reply(
                    "❌ Unable to cancel the deletion request."
                );

            }

        }
    );

};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    registerOwnerCleanupCommands
};