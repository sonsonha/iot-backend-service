const Queue = require('bull');
const modelBoard = require('../models/Board');

const boardQueue = new Queue('boardQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
    },
});

boardQueue.process(async (job) => {
    const { userID, cabinetID, board, version, date = new Date() } = job.data;

    if (!userID || !cabinetID || !board || !version) {
      throw new Error('Missing required board queue data');
    }

    const boards = await modelBoard.findOne({ userID: userID, cabinetID: cabinetID, board: board });

    if (boards) {
        boards.version = version;
        boards.Date = date;
        try {
            await boards.save();
        } catch (error) {
            console.error('Error saving updated board:', error);
            throw new Error('Board update failed');
        }
    } else {
        const newBoard = new modelBoard({
            userID: userID,
            cabinetID: cabinetID,
            board: board,
            version: version,
            Date: date
        });
        try {
            await newBoard.save(); // Save new document
        } catch (error) {
            throw new Error(error);
        }
    }
});

module.exports = boardQueue;
