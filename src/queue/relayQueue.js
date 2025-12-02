const Queue = require('bull');
const Relay = require('../models/Relay');
const logQueue = require('./logQueue');

const relayQueue = new Queue('relayQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
    },
});

relayQueue.process(async (job) => {
    const { userID, cabinetID, data, date } = job.data;
    try {
        const [relay_id, state] = data.split('-');
        const relay = await Relay.findOne({ relay_id: relay_id, userID: userID, cabinetID: cabinetID });
        if (!relay) {
            const { email } = job.data;
            console.error(`Relay with ID ${relay_id} not found for user ${email}`);
            return;
        }
        relay.state = state === 'ON' ? true : false;
        await relay.save();
        const activity = `Relay ${relay_id} ${relay.state ? 'ON' : 'OFF'}`;
        logQueue.add({ userID, cabinetID, activity, date });
    }
    catch (error) {
        throw new Error(error);
    }
});

module.exports = relayQueue;
