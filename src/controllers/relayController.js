const Relay = require('../models/Relay');
const modelUser = require('../models/Users');

const add_relay = async (req, res, next) => {
    try {
        const userID = req.user.id;
        let { relay_id, relay_name } = req.body;
        if (!userID) {
            return res.status(400).json({ error: 'User id is required.' });
        }
        if (!relay_id) {
            return res.status(400).json({ error: 'Relay id is required.' });
        }
        if (!relay_name) {
            relay_name = `Relay ${relay_id}`;
        }
        const existingRelay = await Relay.findOne({ userID, relay_id });
        if (existingRelay) {
            return res.status(400).json({ error: 'Relay with this ID already exists for this user.' });
        }
        const relayCount = await Relay.countDocuments({ userID });
        if (relayCount > 6 && req.role == 'user') {
            return res.status(400).json({ error: 'You can only request up to 6 relays of data. Please upgrade your account for more.' });
        }
        const relay = new Relay({ userID, relay_id, relay_name, state: false, relay_home: false });
        await relay.save();
        req.activity = `Relay ${relay_id} added`;
        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const get_relay = async (req, res) => {
    try {
        const userID = req.user.id;
        const relays = await Relay.find({ userID: userID });
        if (relays.length === 0) {
            return res.status(200).json({ message: 'Could not find any relays for this user.' });
        }
        return res.status(200).json(relays);
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};


const set_relay = async (req, res, next) => {
    try {
        const userID = req.user.id;
        let { relay_id, relay_name, new_relay_id } = req.body;
        if (!relay_id) {
            return res.status(400).json({ error: 'Relay id is required.' });
        }
        const relay = await Relay.findOne({ relay_id: relay_id, userID: userID });
        if (!relay) {
            return res.status(404).json({ error: 'Relay not found.' });
        }
        if (new_relay_id != relay_id) {
            const existingRelay = await Relay.findOne({ relay_id: new_relay_id, userID: userID });
            if (existingRelay) {
                return res.status(400).json({ error: 'New relay id already exists.' });
            }
        }
        if (!new_relay_id && relay_name) {
            relay.relay_name = relay_name;
            req.activity = `Relay ${relay_id} name changed to ${relay_name}`;
        }
        else if (new_relay_id && !relay_name) {
            relay.relay_id = new_relay_id;
            req.activity = `Relay ${relay_id} changed to ${new_relay_id}`;
        }
        else if (new_relay_id && relay_name) {
            relay.relay_id = new_relay_id;
            relay.relay_name = relay_name;
            req.activity = `Relay ${relay_id} changed to ${new_relay_id} and name changed to ${relay_name}`;
        }
        await relay.save();
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}


const delete_relay = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { relayId } = req.body;
        if (!relayId) {
            return res.status(400).json({ error: 'Relay id is required.' });
        }
        const relay = await Relay.findOne({ relay_id: relayId, userID: userID });
        if (!relay) {
            return res.status(404).json({ error: 'Relay not found.' });
        }
        await relay.deleteOne();
        req.activity = `Relay ${relayId} deleted .`;
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const set_status = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { relayId, state } = req.body;
        if (!relayId) {
            return res.status(400).json({ error: 'Relay id is required.' });
        }
        if (state === undefined) {
            return res.status(400).json({ error: 'State is required.' });
        }
        const relay = await Relay.findOne({ relay_id: relayId, userID: userID });
        if (!relay) {
            return res.status(404).json({ error: 'Relay not found.' });
        }
        const user = await modelUser.findById(userID);
        relay.state = state;
        await relay.save();
        req.mode = 'Manual';
        req.relayid = relayId;
        req.state = state;
        req.feed = 'relay';
        req.activity = `Relay ${relayId} ${state ? 'ON' : 'OFF'}`;
        req.AIO_USERNAME = user.AIO_USERNAME;
        req.username = user.username;
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}


const set_relay_home = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { relay_id, relay_home } = req.body;
        if (!relay_id) {
            return res.status(400).json({ error: 'Relay id is required.' });
        }
        const relay = await Relay.findOne({ relay_id: relay_id, userID: userID });
        if (!relay) {
            return res.status(404).json({ error: 'Relay not found.' });
        }
        if (relay_home) {
            const relayHomeCount = await Relay.countDocuments({ userID: userID, relay_home: true });
            if (relayHomeCount > 6) {
                return res.status(400).json({ error: 'Maximum of 6 relays on HomePage' });
            }
        }
        relay.relay_home = relay_home;
        await relay.save();

        req.activity = `Relay ${relay_id} ${relay_home ? 'is' : 'is not'} shown on HomePage`;
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const get_relay_home = async (req, res) => {
    try {
        const userID = req.user.id;
        const relays = await Relay.find({ userID: userID, relay_home: true });
        const relaysArray = [...relays];
        return res.status(200).json(relaysArray);
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

module.exports = {
    add_relay,
    get_relay,
    set_relay,
    delete_relay,
    set_status,
    set_relay_home,
    get_relay_home
};