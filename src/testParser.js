const { parseMessage } = require("./utils/messageParser");

const testMessages = [
    "500 cig",
    "cig 500",
    "cig liya 500 cash",
    "-120 cash diya",
    "hello",
    "500 paid 200",
    "0 cig",
    "₹750 grocery"
];

testMessages.forEach((message) => {
    const result = parseMessage(message);

    console.log("--------------------------------");
    console.log("Message:", message);
    console.log("Result:", result);
});