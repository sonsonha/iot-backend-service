const Schedule = require('../models/Schedule');
const Cabinet = require('../models/Cabinet');
const modelUser = require('../models/Users');

const generateUniqueScheduleId = async (userID, cabinetID) => {
    let scheduleId;
    let isUnique = false;

    while (!isUnique) {
        scheduleId = Math.floor(Math.random() * 20) + 1;
        const existingSchedule = await Schedule.findOne({ userID, schedule_id: scheduleId, cabinetID });
        if (!existingSchedule) {
            isUnique = true;
        }
    }
    return scheduleId;
};

const add_schedule = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const { schedule_name, day, time, actions, } = req.body;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        if (!userID) {
            return res.status(400).json({ error: 'User id is required.' });
        }
        if (!schedule_name) {
            return res.status(400).json({ error: 'Schedule name is required.' });
        }
        if (!day || !time || !actions) {
            return res.status(400).json({ error: 'day, time and actions are required.' });
        }
        const existingSchedule = await Schedule.findOne({ userID, schedule_name, cabinetID: cabinetId });
        if (existingSchedule) {
            return res.status(400).json({ error: 'This schedule already exists for this user.' });
        }
        const schedule_id = await generateUniqueScheduleId(userID, cabinetId);
        const schedule = new Schedule({ userID, cabinetID: cabinetId, schedule_id, schedule_name, state: false, day, time, actions });
        await schedule.save();
        const user = await modelUser.findById(userID);
        req.mode = 'Schedule';
        req.scheduleid = schedule_id;
        req.state = schedule.state;
        req.day = schedule.day;
        req.time = schedule.time;
        req.actions = schedule.actions;
        req.feed = 'schedule';
        req.activity = `Schedule ${schedule_name} added`;
        req.AIO_USERNAME = user.AIO_USERNAME;
        req.username = user.username;
        req.device_id = cabinet.device_id;
        req.actions = req.actions.map(action => {
            const { _id, ...rest } = action._doc;
            return rest;
        });
        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const get_schedule = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });

        const schedules = await Schedule.find({ userID: userID, cabinetID: cabinetId });
        const schedulesArray = schedules.map(schedule => {
            if (schedule.actions) {
                schedule.actions = schedule.actions.map(({ _id, ...rest }) => rest);
            }
            return schedule;
        });
        return res.status(200).json(schedulesArray);
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const set_schedule = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const { schedule_id, new_schedule_name, new_day, new_time, new_actions } = req.body;

        if (!schedule_id) {
            return res.status(400).json({ error: 'Schedule id is required.' });
        }

        const schedule = await Schedule.findOne({ schedule_id: schedule_id, userID: userID, cabinetID: cabinetId });
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        let result = `Schedule '${schedule.schedule_name}' edited: `;
        let changes = [];
        if (new_schedule_name && schedule.schedule_name !== new_schedule_name) {
            schedule.schedule_name = new_schedule_name;
            changes.push(`name updated to '${new_schedule_name}'`);
        }
        if (new_day) {
            schedule.day = new_day;
            changes.push(`day updated to '${new_day.join(', ')}'`);
        }
        if (new_time && schedule.time !== new_time) {
            schedule.time = new_time;
            changes.push(`time updated to '${new_time}'`);
        }
        if (new_actions) {
            schedule.actions = new_actions;
            changes.push(`actions updated`);
        }

        if (changes.length > 0) {
            result += changes.join('. ') + '.';
        } else {
            result = `No changes made to the schedule '${schedule.schedule_name}'.`;
        }
        const user = await modelUser.findById(userID);
        await schedule.save();
        req.mode = 'Schedule';
        req.scheduleid = schedule.schedule_id;
        req.state = schedule.state;
        req.day = schedule.day;
        req.time = schedule.time;
        req.actions = schedule.actions;
        req.feed = 'schedule';
        req.activity = result.trim();
        req.AIO_USERNAME = user.AIO_USERNAME;
        req.username = user.username;
        req.device_id = cabinet.device_id;
        req.actions = req.actions.map(action => {
            const { _id, ...rest } = action._doc;
            return rest;
        });
        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
};

const set_status = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const { schedule_id, state } = req.body;
        if (!schedule_id) {
            return res.status(400).json({ error: 'Schedule id is required.' });
        }
        if (state === undefined) {
            return res.status(400).json({ error: 'State is required.' });
        }
        const schedule = await Schedule.findOne({ schedule_id: schedule_id, userID: userID, cabinetID: cabinetId });
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        const user = await modelUser.findById(userID);
        schedule.state = state;
        await schedule.save();
        req.mode = 'Schedule';
        req.scheduleid = schedule_id;
        req.state = state;
        req.day = schedule.day;
        req.time = schedule.time;
        req.actions = schedule.actions;
        req.feed = 'schedule';
        req.activity = `Schedule ${schedule.schedule_name} ${schedule.state ? 'ON' : 'OFF'}`;
        req.AIO_USERNAME = user.AIO_USERNAME;
        req.username = user.username;
        req.device_id = cabinet.device_id;
        req.actions = req.actions.map(action => {
            const { _id, ...rest } = action._doc;
            return rest;
        });
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const delete_schedule = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const { schedule_id } = req.body;
        if (!schedule_id) {
            return res.status(400).json({ error: 'Schedule id is required.' });
        }
        const schedule = await Schedule.findOne({ schedule_id: schedule_id, userID: userID, cabinetID: cabinetId });
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        const user = await modelUser.findById(userID);
        req.AIO_USERNAME = user.AIO_USERNAME;
        req.username = user.username;
        req.mode = 'Schedule';
        req.scheduleid = schedule_id;
        req.deleteid = true;
        req.feed = 'schedule';
        req.device_id = cabinet.device_id;
        const name = schedule.schedule_name;
        await schedule.deleteOne();
        req.activity = `Schedule ${name} deleted.`;
        next();
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const get_schedule_home = async (req, res) => {
    try {
        const userID = req.user.id;
        const { cabinetId } = req.params;
        const cabinet = await Cabinet.findOne({ _id: cabinetId, userID });
        if (!cabinet) return res.status(404).json({ message: 'Cabinet not found' });
        const day = [req.body.day];
        const schedules = await Schedule.find({
            userID: userID,
            cabinetID: cabinetId,
            day: { $in: day }
        });

        return res.status(200).json(schedules);
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

module.exports = {
    add_schedule,
    get_schedule,
    set_schedule,
    set_status,
    delete_schedule,
    get_schedule_home
};