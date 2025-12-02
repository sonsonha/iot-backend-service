const Queue = require('bull');
const HumiditySensors = require('../models/HumiditySensors');
const TemperatureSensors = require('../models/TemperatureSensors');
const Location = require('../models/Location');

const sensorQueue = new Queue('sensorQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
    },
});

sensorQueue.process(async (job) => {
    const { userID, cabinetID, sensor, data, date } = job.data;
    try {
        switch (sensor) {
            case 'temperature':
                if (parseFloat(data) === 0) { console.error("Temperature no data"); break; }
                const tempData = new TemperatureSensors({
                    userID: userID,
                    cabinetID: cabinetID,
                    data: data,
                    Date: date,
                });
                await tempData.save();
                break;

            case 'humidity':
                if (parseFloat(data) === 0) { console.error("Humidity no data"); break; }
                const humidityData = new HumiditySensors({
                    userID: userID,
                    cabinetID: cabinetID,
                    data: data,
                    Date: date,
                });
                await humidityData.save();
                break;
            case 'location':
                const [X, Y] = data.split('-');
                if (parseFloat(X) === 0 || parseFloat(Y) === 0) { console.error("Location no data"); break; }
                const locationData = new Location({
                    userID: userID,
                    cabinetID: cabinetID,
                    X: X,
                    Y: Y,
                    Date: date,
                });
                await locationData.save();
                break;
            default: break;
        }
    }
    catch (error) {
        throw new Error(error);
    }
});

module.exports = sensorQueue;
