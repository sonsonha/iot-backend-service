const HumiditySensors = require('../models/HumiditySensors');
const TemperatureSensors = require('../models/TemperatureSensors');
const Location = require('../models/Location');
const sensorQueue = require('../queue/sensorQueue');
const Cabinet = require('../models/Cabinet');

const setTemp = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const { data } = req.body;
        let { date } = req.body;
        if (date === undefined) {
            date = new Date();
        }
        sensorQueue.add({ userID, cabinetID: cabinetId, sensor: 'temperature', data, date });
        return res.status(200).json({
            data: data,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const setHumi = async (req, res) => {
    try {
        const userID = req.user.id;
        const { data } = req.body;
        let { date } = req.body;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        if (date === undefined) {
            date = new Date();
        }
        sensorQueue.add({ userID, cabinetID: cabinetId, sensor: 'humidity', data, date });
        return res.status(200).json({
            data: data,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const setLocation = async (req, res) => {
    try {
        const userID = req.user.id;
        const { data } = req.body;
        let { date } = req.body;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        if (date === undefined) {
            date = new Date();
        }
        if (!data.includes("-")) {
            return res.status(400).json({
                error: 'Wrong format. Expected "X-Y" format.',
            });
        }
        sensorQueue.add({ userID, cabinetID: cabinetId, sensor: 'location', data, date });
        return res.status(200).json({
            data: data,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const getTemp = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const latestData = await TemperatureSensors.findOne({ userID: userID, cabinetID: cabinetId })
            .sort({ Date: -1 })
            .exec();

        if (latestData) {
            return res.status(200).json({
                data: latestData.data,
            });
        } else {
            return res.status(404).json({
                error: 'No temperature data found for this cabinet.',
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const getHumi = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const latestData = await HumiditySensors.findOne({ userID: userID, cabinetID: cabinetId })
            .sort({ Date: -1 })
            .exec();

        if (latestData) {
            return res.status(200).json({
                data: latestData.data,
            });
        } else {
            return res.status(404).json({
                error: 'No humidity data found for this cabinet.',
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const getLocation = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const location = await Location.findOne({ userID: userID, cabinetID: cabinetId })
            .sort({ Date: -1 })
            .exec();

        if (location) {
            return res.status(200).json({
                X: location.X,
                Y: location.Y,
            });
        } else {
            return res.status(404).json({
                error: 'No location data found for this user.',
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

// const getLocations = async (req, res) => {
//     try {
//         const userID = req.user.id;
//         const { cabinetId } = req.params;
//         const cabinet = await Cabinet.find({ userID });
//         if (cabinet.length() === 0) return res.status(404).json({ message: 'No cabinets found' });
//         const locations = await Location.find({ userID: userID })
//             .sort({ Date: -1 })
//             .exec();

//         if (locations.length() > 0) {
//             return res.status(200).json({
//                 X: location.X,
//                 Y: location.Y,
//             });
//         } else {
//             return res.status(404).json({
//                 error: 'No location data found for this user.',
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             error: 'Server error',
//         });
//     }
// }

module.exports = { setTemp, setHumi, setLocation, getTemp, getHumi, getLocation };
