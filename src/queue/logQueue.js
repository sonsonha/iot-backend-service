const Queue = require('bull');
const modelLog = require('../models/Log');

const logQueue = new Queue('logQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
    },
});

logQueue.process(async (job) => {
    const { userID, cabinetID, activity, date } = job.data;
    const validDate = date && date.trim() !== "" ? new Date(date) : new Date();
    const newLog = new modelLog({
        userID: userID,
        cabinetID: cabinetID,
        activity,
        Date: validDate
    });
    try {
        await newLog.save();
    } catch (error) {
        throw new Error(error);
    }
});

module.exports = logQueue;
