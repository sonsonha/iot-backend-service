const mqtt = require('mqtt');
require('dotenv').config();
const modelUser = require('../models/Users');
const Cabinet = require('../models/Cabinet');

const sensorQueue = require('../queue/sensorQueue');    
const relayQueue = require('../queue/relayQueue');
const userQueue = require('../queue/userQueue');
const boardQueue = require('../queue/boardQueue');
const bcrypt = require('bcrypt');
const Transporter = require('../config/email');

const AIO_PORT = process.env.AIO_PORT;

let clients = {};

const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};

const saveData = async (email, deviceId, type, data, date, mode = undefined) => {
    if (typeof date === 'string') {
        const [time, datePart] = date.split(' ');
        const [day, month, year] = datePart.split('/');
        if (!day || !month || !year) {
            console.log('Invalid date format');
        } else {
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`;
            date = new Date(formattedDate);
        }
    }

    const user = await modelUser.findOne({ email: email });
    if (!user) {
        return;
    }

    const cabinet = await Cabinet.findOne({ userID: user._id, deviceId: deviceId });
    if (!cabinet) {
        console.warn(`No cabinet found for user ${user.email} with deviceId ${deviceId}`);
        return;
    }
    const cabinetID = cabinet._id;

    console.log(
      `\x1b[0m{ Date: \x1b[32m${formatDate(date)}\x1b[0m, Email: \x1b[32m${email}\x1b[0m, Device: \x1b[32m${deviceId}\x1b[0m, Type: \x1b[32m${type}\x1b[0m, Data: \x1b[32m${data}\x1b[0m }\x1b[0m`
    );

    // console.log(
    //     `\x1b[0m{ Date: \x1b[32m${formatDate(date)}\x1b[0m, Email: \x1b[32m${email}\x1b[0m, Type: \x1b[32m${type}\x1b[0m, Data: \x1b[32m${data}\x1b[0m }\x1b[0m`
    // );

    if (type === 'temp') {
        sensorQueue.add({ userID: user.id, cabinetID, sensor: 'temperature', data, date });
    }
    else if (type === 'humi') {
        sensorQueue.add({ userID: user.id, cabinetID, sensor: 'humidity', data, date });
    }
    else if (type === 'location') {
        sensorQueue.add({ userID: user.id, cabinetID, sensor: 'location', data, date });
    }
    else if (type === 'relay') {
        relayQueue.add({ userID: user.id, cabinetID, data, date, email });
    }
    else if (type === 'history') {
        if (!mode) {
            return;
        }
        if (mode === 'Temp_Humi') {
            const [temp, humi] = data.split('-');
            if (isNaN(temp) || isNaN(humi)) {
                console.error('Invalid temperature or humidity data');
                return;
            }

            if (parseFloat(temp) === 0 || parseFloat(humi) === 0) {
                console.error("Temperature or humidity data is zero");
                return;
            }
            sensorQueue.add({ userID: user.id, cabinetID, sensor: 'temperature', data: parseFloat(temp), date });
            sensorQueue.add({ userID: user.id, cabinetID, sensor: 'humidity', data: parseFloat(humi), date });
        }
        else if (mode === 'location') {
            sensorQueue.add({ userID: user.id, cabinetID, sensor: 'location', data, date });
        }
    }
    else if (type === 'ip') {
        userQueue.add({ userID: user.id, cabinetID, data, date });
    }
    else if (type === 'firmware') {
        boardQueue.add({ userID: user.id, cabinetID, board: data, version: mode, date });
    }
};

const connectAllUsers = async () => {
    const users = await modelUser.find();
    if (!users || users.length === 0) {
        console.log('No users found');
        return;
    }

    users.forEach(user => {
        const { AIO_USERNAME, AIO_KEY } = user;
        console.log(`Trying to connect for user: ${user.username}`);

        if (!AIO_USERNAME || !AIO_KEY) {
            console.error(`User ${user.username} does not have Adafruit IO credentials`);
            return;
        }

        const clientId = `client-${user._id}-${Math.random().toString(36).substring(7)}`;

        const client = mqtt.connect(
            `mqtts://${AIO_USERNAME}:${AIO_KEY}@io.adafruit.com`,
            {
                port: AIO_PORT,
                clientId: clientId,
            }
        );

        clients[user.username] = client;

        client.on('connect', () => {
            console.log(`Connected to MQTT for user: ${user.username}`);
            subscribeToFeeds(client, AIO_USERNAME);
        });

        client.on('error', (err) => {
            console.error(`Connection error for user ${user.username}:`, err);
            client.end();
        });
    });

    console.log('Finished attempting to connect to MQTT for all users');
};

const subscribeToFeeds = (client, AIO_USERNAME) => {
    const tempFeed = `${AIO_USERNAME}/feeds/temperature`;
    const humFeed = `${AIO_USERNAME}/feeds/humidity`;
    const locationFeed = `${AIO_USERNAME}/feeds/location`;
    const historyFeed = `${AIO_USERNAME}/feeds/history`;
    const relayFeed = `${AIO_USERNAME}/feeds/relay`;
    const ipFeed = `${AIO_USERNAME}/feeds/ip`;
    const firmwareFeed = `${AIO_USERNAME}/feeds/firmware`;

    [tempFeed, humFeed, historyFeed, locationFeed, relayFeed, ipFeed, firmwareFeed].forEach((feed) => {
        client.subscribe(feed, (err) => {
            if (err) {
                console.error('Subscription error:', err);
            } else {
                console.log(`Subscribed to feed: ${feed}`);
            }
        });
    });

    client.on('message', async (topic, message) => {
        const feed = topic;
        try {
            const jsonData = JSON.parse(message.toString());
            const { email, data, mode, time, deviceId } = jsonData;
            if (!email || data === undefined) {
                console.warn('No email provided. Skipping saveData call.');
                return;
            }
            if (!deviceId) {
                console.warn('No deviceId provided. Skipping saveData call.');
                return;
            }
            if (feed.includes('temperature')) {
                saveData(email, deviceId, 'temp', parseFloat(data), new Date());
            } else if (feed.includes('humidity')) {
                saveData(email, deviceId, 'humi', parseFloat(data), new Date());
            } else if (feed.includes('location')) {
                saveData(email, deviceId, 'location', data, new Date());
            }
            else if (feed.includes('relay')) {
                saveData(email, deviceId, 'relay', data, new Date());
            }
            else if (feed.includes('history')) {
                saveData(email, deviceId, 'history', data, time, mode);
            }
            else if (feed.includes('ip')) {
                saveData(email, deviceId, 'ip', data, new Date());
            }
            else if (feed.includes('firmware')) {
                saveData(email, deviceId, 'firmware', data, new Date(), mode);
            }
        } catch (error) {
            console.error('Error saving data to MongoDB:', error);
        }
    });
};

const disconnectMqtt = async (req, res, next) => {
    const userID = req.user.id;
    try {
        const { currentpassword } = req.body;
        if (!currentpassword) {
            return res.status(400).json({
                error: 'Current password  are required.',
            });
        }
        const user = await modelUser.findById(userID).exec();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isPasswordCorrect = await bcrypt.compare(currentpassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }
        const { AIO_USERNAME } = user;
        if (clients[user.username]) {
            clients[user.username].end(false, () => {
                console.log(`Disconnected from MQTT for user: ${AIO_USERNAME}`);
            });
            delete clients[user.username];
        } else {
            console.warn(`No active MQTT client found for user: ${AIO_USERNAME}`);
        }
        next();
    } catch (error) {
        console.error('Error disconnecting from MQTT:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const reconnectMqtt = async (req, res) => {
    const userID = req.user.id;
    try {
        const user = await modelUser.findById(userID);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { AIO_USERNAME, AIO_KEY } = user;
        if (!AIO_USERNAME || !AIO_KEY) {
            console.error(`User ${user.username} does not have Adafruit IO credentials`);
            return res.status(400).json({ message: `User ${user.username} does not have Adafruit IO credentials` });
        }

        if (clients[user.username]) {
            clients[user.username].end();
            delete clients[user.username];
        }

        const clientId = `client-${user._id}-${Math.random().toString(36).substring(7)}`;
        const client = mqtt.connect(
            `mqtts://${AIO_USERNAME}:${AIO_KEY}@io.adafruit.com`,
            {
                port: AIO_PORT,
                clientId: clientId,
            }
        );
        clients[user.username] = client;
        client.on('connect', async () => {
            console.log(`Reconnected to MQTT for user: ${user.username}`);
            subscribeToFeeds(client, AIO_USERNAME);
            try {
                if (req.case === 'edit_profile') {
                    await user.save();
                    const userProfile = user.toObject();
                    delete userProfile.password;
                    return res.status(200).json({
                        message: 'Profile updated successfully',
                        data: userProfile,
                    });
                }
                return res.status(200).json({ message: `Reconnected to MQTT for user: ${AIO_USERNAME}` });
            } catch (error) {
                console.error('Error saving user profile after MQTT connection:', error);
                return res.status(500).json({ message: 'Error saving user profile after successful MQTT connection' });
            }
        });

        client.on('error', (err) => {
            console.error(`Connection error for user ${user.username}:`, err);
            client.end();
            return res.status(500).json({ message: 'MQTT connection error , please change Adafruit account' });
        });
    } catch (error) {
        console.error('Error reconnecting to MQTT:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const newconnect = async (req, res) => {
    const { username, fullname, email, password, aioUser, aioKey, phone } = req.body;

    if (!aioUser || !aioKey) {
        console.error(`User ${username} does not have Adafruit IO credentials`);
        return res.status(400).json({ error: `User ${username} does not have Adafruit IO credentials` });
    }

    if (clients[username]) {
        return res.status(400).json({ error: `User ${username} already has Adafruit IO credentials` });
    }

    try {
        const clientId = `client-${Math.random().toString(36).substring(7)}`;
        const client = mqtt.connect(
            `mqtts://${aioUser}:${aioKey}@io.adafruit.com`,
            {
                port: process.env.AIO_PORT,
                clientId: clientId,
            }
        );

        clients[username] = client;

        client.on('connect', async () => {
            console.log(`New connect to MQTT for user: ${username}`);
            subscribeToFeeds(client, aioUser);

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                const newUser = new modelUser({
                    username,
                    fullname,
                    email,
                    password: hashedPassword,
                    role: 'user',
                    AIO_USERNAME: aioUser,
                    AIO_KEY: aioKey,
                    phone_number: phone,
                });

                const result = await newUser.save();
                if (result) {
                    const mailOptions = {
                        from: process.env.EMAIL,
                        to: email,
                        subject: 'Registration successful',
                        text: 'You have successfully registered to our platform',
                    };
                    await Transporter.sendMail(mailOptions);
                    return res.status(200).json({
                        message: 'User registered successfully',
                        data: result,
                    });
                }
            } catch (error) {
                console.error('Error saving user profile after MQTT connection:', error);
                return res.status(500).json({ error: 'Error saving user profile after successful MQTT connection' });
            }
        });

        client.on('error', (err) => {
            console.error(`Connection error for user ${username}:`, err);
            client.end();
            if (clients[username]) {
                delete clients[username];
            }
            return res.status(500).json({ message: 'MQTT connection error, please check Adafruit account details' });
        });
    } catch (error) {
        console.error('Error connecting to MQTT:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const publishdata = async (req, res, next) => {
    const userID = req.user.id;
    const username = req.username;
    if (!clients[username]) {
        return res.status(400).json({ error: 'MQTT not connected' });
    }
    // const { feed, relayid, scheduleid, state, mode, day, time, actions, AIO_USERNAME, email, deleteid } = req;
    const { feed, relayid, scheduleid, state, mode, day, time, actions, AIO_USERNAME, email, deleteid, deviceId } = req;
    let jsonData;
    if (mode === 'Schedule') {
        if (deleteid) {
            jsonData = JSON.stringify({
                email: email,
                deviceId,
                mode: mode,
                id: scheduleid,
                delete: 'true',
            });
        }
        else {
            jsonData = JSON.stringify({
                email: email,
                deviceId,
                mode: mode,
                id: scheduleid,
                state: state ? 'true' : 'false',
                days: day,
                time: time,
                actions: actions
            });
        }
    }
    else if (mode === 'Manual') {
        const status = state ? 'ON' : 'OFF';
        jsonData = JSON.stringify({
            email: email,
            deviceId,
            mode: mode,
            index: relayid,
            state: status
        });
    }
    const feedPath = `${AIO_USERNAME}/feeds/${feed}`;
    clients[username].publish(feedPath, jsonData, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to publish data' });
        } else {
            next();
        }
    });
};

module.exports = {
    connectAllUsers,
    disconnectMqtt,
    reconnectMqtt,
    newconnect,
    publishdata
};
