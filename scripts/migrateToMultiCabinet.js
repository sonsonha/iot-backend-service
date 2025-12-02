// scripts/migrateToMultiCabinet.js
require('dotenv').config();
const mongoose = require('mongoose');

const Users = require('../src/models/Users');
const Cabinet = require('../src/models/Cabinet');
const Relay = require('../src/models/Relay');
const Schedule = require('../src/models/Schedule');
const Log = require('../src/models/Log');
const TemperatureSensor = require('../src/models/TemperatureSensors');
const HumiditySensor = require('../src/models/HumiditySensors');
const Location = require('../src/models/Location');
const Board = require('../src/models/Board');
const Firmware = require('../src/models/Firmware');

// sửa MONGO_URI cho đúng .env của anh
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/<ten_db_cua_anh>';
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://DO_AN_KTMT:Doanktmt123.@cluster0.wsm9t.mongodb.net/myDB";


async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const users = await Users.find();
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    console.log('---------------------------------');
    console.log(`Processing user: ${user.email}`);

    // 1. Tạo / lấy Cabinet mặc định
    let cabinet = await Cabinet.findOne({
      userID: user._id,
      name: 'Default Cabinet',
    });

    if (!cabinet) {
      cabinet = new Cabinet({
        userID: user._id,
        name: 'Default Cabinet',
        description: 'Migrated from single-cabinet version',
        board: 'Relay 6ch', // nếu tủ cũ của anh là Relay 6ch
        device_id: user.webServerIp || undefined, // tạm, sau OTA anh update lại cho đúng
      });
      await cabinet.save();
      console.log(`  ➕ Created cabinet ${cabinet._id} for user ${user.email}`);
    } else {
      console.log(`  ✅ Cabinet already exists: ${cabinet._id}`);
    }

    const cabinetID = cabinet._id;

    // 2. Filter: chỉ update những doc CHƯA có cabinetID
    const filterWithoutCabinet = {
      userID: user._id,
      $or: [{ cabinetID: { $exists: false } }, { cabinetID: null }],
    };

    // 3. Update từng collection
    const relayResult = await Relay.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Relay updated:      ${relayResult.modifiedCount}`);

    const scheduleResult = await Schedule.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Schedule updated:   ${scheduleResult.modifiedCount}`);

    const logResult = await Log.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Log updated:        ${logResult.modifiedCount}`);

    const tempResult = await TemperatureSensor.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Temp updated:       ${tempResult.modifiedCount}`);

    const humiResult = await HumiditySensor.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Humi updated:       ${humiResult.modifiedCount}`);

    const locationResult = await Location.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Location updated:   ${locationResult.modifiedCount}`);

    const boardResult = await Board.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Board updated:      ${boardResult.modifiedCount}`);

    const firmwareResult = await Firmware.updateMany(filterWithoutCabinet, { $set: { cabinetID } });
    console.log(`  Firmware updated:   ${firmwareResult.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('🎉 Migration done!');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
