const Cabinet = require('../models/Cabinet');
const Relay = require('../models/Relay');
const Schedule = require('../models/Schedule');
const TemperatureSensors = require('../models/TemperatureSensors');
const HumiditySensors = require('../models/HumiditySensors');
const Location = require('../models/Location');


const getCabinets = async (req, res) => {
  try {
    const userID = req.user.id;
    const cabinets = await Cabinet.find({ userID }).sort({ createdAt: 1 });
    return res.status(200).json({ data: cabinets });
  } catch (err) {
    console.error('getCabinets error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getCabinetById = async (req, res) => {
  try {
    const userID = req.user.id;
    const { id } = req.params;

    const cabinet = await Cabinet.findOne({ _id: id, userID });
    if (!cabinet) {
      return res.status(404).json({ message: 'Cabinet not found' });
    }
    return res.status(200).json({ data: cabinet });
  } catch (err) {
    console.error('getCabinetById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const createCabinet = async (req, res) => {
  try {
    const userID = req.user.id;
    const { name, description, board, device_id } = req.body;

    const newCabinet = new Cabinet({
      userID,
      name,
      description,
      board,
      device_id,
    });

    const result = await newCabinet.save();
    return res.status(201).json({ message: 'Cabinet created', data: result });
  } catch (err) {
    console.error('createCabinet error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Cabinet name or device_id already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateCabinet = async (req, res) => {
  try {
    const userID = req.user.id;
    const { id } = req.params;
    const { name, description, board, device_id } = req.body;

    const update = { updatedAt: new Date() };

    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (board !== undefined) update.board = board;
    if (device_id !== undefined) update.device_id = device_id;

    const cabinet = await Cabinet.findOneAndUpdate(
      { _id: id, userID },
      { $set: update },
      { new: true }
    );

    if (!cabinet) {
      return res.status(404).json({ message: 'Cabinet not found' });
    }
    return res.status(200).json({ message: 'Cabinet updated', data: cabinet });
  } catch (err) {
    console.error('updateCabinet error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


const deleteCabinet = async (req, res) => {
  try {
    const userID = req.user.id;
    const { id } = req.params;

    const cabinet = await Cabinet.findOneAndDelete({ _id: id, userID });
    if (!cabinet) {
      return res.status(404).json({ message: 'Cabinet not found' });
    }
    return res.status(200).json({ message: 'Cabinet deleted' });
  } catch (err) {
    console.error('deleteCabinet error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getCabinetOverview = async (req, res) => {
  try {
    const userID = req.user.id;
    const { id } = req.params; // cabinetId

    const cabinet = await Cabinet.findOne({ _id: id, userID }).lean();
    if (!cabinet) {
      return res.status(404).json({ message: 'Cabinet not found' });
    }

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = daysOfWeek[new Date().getDay()];

    const cabinetID = id;

    const [
      relays,
      relays_home,
      latestTemp,
      latestHumi,
      latestLocation,
      schedules,
      schedules_home,
    ] = await Promise.all([
      Relay.find({ userID, cabinetID }).lean(),
      Relay.find({ userID, cabinetID, relay_home: true }).lean(),
      TemperatureSensors.findOne({ userID, cabinetID }).sort({ Date: -1 }).select('data').lean(),
      HumiditySensors.findOne({ userID, cabinetID }).sort({ Date: -1 }).select('data').lean(),
      Location.findOne({ userID, cabinetID }).sort({ Date: -1 }).select('X Y').lean(),
      Schedule.find({ userID, cabinetID }).lean(),
      Schedule.find({ userID, cabinetID, day: { $in: [day] } }).lean(),
    ]);

    let location = "10.7736288-106.6602627"; // default
    if (latestLocation) {
      location = `${latestLocation.X}-${latestLocation.Y}`;
    }

    const temperature = latestTemp?.data || 0.0;
    const humidity = latestHumi?.data || 0.0;

    return res.status(200).json({
      cabinet,
      temperature,
      humidity,
      location,
      relays,
      relays_home,
      schedules,
      schedules_home,
    });
  } catch (err) {
    console.error('getCabinetOverview error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getCabinetLocations = async (req, res) => {
  try {
    const userID = req.user.id;

    const cabinets = await Cabinet.find({ userID }).lean();

    if (!cabinets.length) {
      return res.status(200).json({ data: [] });
    }

    const result = [];

    for (const cab of cabinets) {
      const latestLocation = await Location.findOne({
        userID,
        cabinetID: cab._id,
      })
        .sort({ Date: -1 })
        .select('X Y')
        .lean();

      let lat = null;
      let lng = null;

      if (latestLocation) {
        lat = parseFloat(latestLocation.X);
        lng = parseFloat(latestLocation.Y);
      }

      result.push({
        id: cab._id,
        name: cab.name,
        description: cab.description,
        board: cab.board,
        device_id: cab.device_id,
        createdAt: cab.createdAt,
        updatedAt: cab.updatedAt, 
        lat,
        lng,
      });
    }

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('getCabinetLocations error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCabinets,
  getCabinetById,
  createCabinet,
  updateCabinet,
  deleteCabinet,
  getCabinetOverview,
  getCabinetLocations,
};
