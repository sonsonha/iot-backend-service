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
  const { userID, cabinetID, data, date, email } = job.data;

  if (typeof data !== 'string') {
    console.error('Invalid relay data (not string):', data);
    return;
  }

  try {
    // ví dụ data = "4-ON"
    const parts = data.split('-');
    if (parts.length < 2) {
      console.error('Invalid relay data format, expected "<id>-<ON|OFF>":', data);
      return;
    }

    const relay_id = Number(parts[0]);
    const rawState = String(parts.slice(1).join('-')).trim().toUpperCase(); // in case state chứa dấu '-'
    const state = rawState === 'ON';

    if (isNaN(relay_id)) {
      console.error('Invalid relay_id (not number):', parts[0]);
      return;
    }

    // TÌM theo userID + cabinetID + relay_id (không dùng email vì model không có field email)
    const query = { relay_id: relay_id, cabinetID: cabinetID };
    if (userID) query.userID = userID;

    const relay = await Relay.findOne(query);
    if (!relay) {
      console.error(`Relay with ID ${relay_id} not found for cabinet ${cabinetID} (user ${userID || email})`);
      return;
    }

    relay.state = state;
    await relay.save();

    const activity = `Relay ${relay_id} ${relay.state ? 'ON' : 'OFF'}`;
    logQueue.add({ userID, cabinetID, activity, date });

    console.log(`Relay ${relay_id} updated -> ${relay.state ? 'ON' : 'OFF'} (cabinet ${cabinetID})`);
  } catch (error) {
    console.error('relayQueue.process error:', error);
    throw error;
  }
});


module.exports = relayQueue;
