// scripts/seedFakeSensors.js
require('dotenv').config();
const mongoose = require('mongoose');

const Users = require('../src/models/Users');
const Cabinet = require('../src/models/Cabinet');
const TemperatureSensor = require('../src/models/TemperatureSensors');
const HumiditySensor = require('../src/models/HumiditySensors');

// sửa MONGO_URI cho đúng .env của anh
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://DO_AN_KTMT:Doanktmt123.@cluster0.wsm9t.mongodb.net/myDB';

// ====== CONFIG THỜI GIAN GIẢ ======
const START_DATE = new Date('2025-08-01T00:00:00.000Z'); // 01/08/2025
const END_DATE   = new Date('2025-12-01T23:59:59.999Z'); // 01/12/2025

// mỗi ngày 24 sample (mỗi giờ 1 điểm)
const SAMPLES_PER_DAY = 24;

// helper random [min, max], làm tròn 1 số lẻ
function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

// clamp để chắc chắn trong range
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Nhiệt độ: 22–31°C, pattern theo giờ nhưng không vượt range
function genTemperature(hour) {
  let baseMin, baseMax;

  // đêm khuya: mát nhất
  if (hour >= 0 && hour <= 5) {
    baseMin = 22;
    baseMax = 24;
  }
  // sáng: tăng dần
  else if (hour >= 6 && hour <= 10) {
    baseMin = 23;
    baseMax = 26;
  }
  // trưa: nóng nhất
  else if (hour >= 11 && hour <= 15) {
    baseMin = 27;
    baseMax = 31;
  }
  // chiều tối: hạ dần
  else if (hour >= 16 && hour <= 20) {
    baseMin = 24;
    baseMax = 28;
  }
  // đêm: mát lại
  else {
    baseMin = 22;
    baseMax = 25;
  }

  let v = rand(baseMin, baseMax);
  return clamp(v, 22, 31);
}

// Độ ẩm: 45–73%, pattern theo giờ
function genHumidity(hour) {
  let baseMin, baseMax;

  // đêm khuya: ẩm hơn
  if (hour >= 0 && hour <= 5) {
    baseMin = 60;
    baseMax = 73;
  }
  // sáng: còn khá ẩm
  else if (hour >= 6 && hour <= 10) {
    baseMin = 55;
    baseMax = 70;
  }
  // trưa: khô hơn
  else if (hour >= 11 && hour <= 15) {
    baseMin = 45;
    baseMax = 60;
  }
  // chiều tối
  else if (hour >= 16 && hour <= 20) {
    baseMin = 50;
    baseMax = 68;
  }
  // đêm
  else {
    baseMin = 58;
    baseMax = 72;
  }

  let v = rand(baseMin, baseMax);
  return clamp(v, 45, 73);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const users = await Users.find();
  console.log(`👤 Found ${users.length} users`);

  for (const user of users) {
    console.log('---------------------------------');
    console.log(`Processing user: ${user.email}`);

    const cabinets = await Cabinet.find({ userID: user._id });
    if (!cabinets.length) {
      console.log('  ⚠️  No cabinets for this user, skip');
      continue;
    }

    console.log(`  🧱 Found ${cabinets.length} cabinets`);

    for (const cab of cabinets) {
      console.log(`  ➤ Seeding cabinet: ${cab._id} (${cab.name})`);

      // 👇 GHI ĐÈ: xoá dữ liệu cũ trong khoảng thời gian này
      const deleteFilter = {
        userID: user._id,
        cabinetID: cab._id,
        Date: { $gte: START_DATE, $lte: END_DATE },
      };

      const delTemp = await TemperatureSensor.deleteMany(deleteFilter);
      const delHumi = await HumiditySensor.deleteMany(deleteFilter);

      console.log(
        `    🧹 Deleted old docs -> Temp: ${delTemp.deletedCount}, Humi: ${delHumi.deletedCount}`
      );

      const tempDocs = [];
      const humiDocs = [];

      let current = new Date(START_DATE);

      while (current <= END_DATE) {
        for (let i = 0; i < SAMPLES_PER_DAY; i++) {
          const sampleDate = new Date(
            current.getFullYear(),
            current.getMonth(),
            current.getDate(),
            i, // hour
            0,
            0,
            0
          );

          const hour = sampleDate.getHours();

          let temp = genTemperature(hour);
          let humi = genHumidity(hour);

          // thêm nhiễu nhẹ theo cabinet cho đỡ phẳng
          temp = clamp(temp + rand(-0.5, 0.5), 22, 31);
          humi = clamp(humi + rand(-1.5, 1.5), 45, 73);

          tempDocs.push({
            userID: user._id,
            cabinetID: cab._id,
            data: temp,
            Date: sampleDate,
          });

          humiDocs.push({
            userID: user._id,
            cabinetID: cab._id,
            data: humi,
            Date: sampleDate,
          });
        }

        current.setDate(current.getDate() + 1);
      }

      console.log(
        `    📦 Prepared ${tempDocs.length} temp & ${humiDocs.length} humi docs`
      );

      if (tempDocs.length) {
        await TemperatureSensor.insertMany(tempDocs);
      }
      if (humiDocs.length) {
        await HumiditySensor.insertMany(humiDocs);
      }

      console.log('    ✅ Inserted fake sensor data for this cabinet');
    }
  }

  await mongoose.disconnect();
  console.log('🎉 Seeding fake sensors done!');
}

run().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
