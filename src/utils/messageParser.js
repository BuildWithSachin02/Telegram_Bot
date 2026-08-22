const parseMessage = (message) => {
    // Find all numbers in the message
    const numbers = message.match(/-?\d+(?:\.\d+)?/g);

    // No number found
    if (!numbers) {
        return {
            success: false,
            error: "No financial amount found."
        };
    }

    // More than one number
    if (numbers.length > 1) {
        return {
            success: false,
            error: "Message unclear. Please send one financial amount per message."
        };
    }

    const amount = Number(numbers[0]);

    // Zero is not allowed
    if (amount === 0) {
        return {
            success: false,
            error: "Amount must be greater than zero."
        };
    }

    return {
        success: true,
        amount: Math.abs(amount),
        isPayment: amount < 0
    };
};

module.exports = {
    parseMessage
};