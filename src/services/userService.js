const User = require("../models/User");

const findUserByTelegramId = async (telegramUserId) => {
    const user = await User.findOne({
        telegramUserId: telegramUserId
    });

    return user;
};

module.exports = {
    findUserByTelegramId
};