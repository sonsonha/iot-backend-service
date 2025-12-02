var express = require('express');
var ScheduleRoutes = express.Router();
const scheduleController = require('../controllers/scheduleController');
const logController = require('../controllers/logController');
const IpMiddleware = require('../middlewares/IpMiddleware');
const MQTTController = require('../connect/mqttController');

ScheduleRoutes.post('/:cabinetId/add', IpMiddleware('add schedule'), scheduleController.add_schedule, MQTTController.publishdata, logController.setLog);
ScheduleRoutes.get('/:cabinetId/get', IpMiddleware('get schedule'), scheduleController.get_schedule);
ScheduleRoutes.patch('/:cabinetId/set', IpMiddleware('set schedule'), scheduleController.set_schedule, MQTTController.publishdata, logController.setLog);
ScheduleRoutes.delete('/:cabinetId/delete', IpMiddleware('delete schedule'), scheduleController.delete_schedule, MQTTController.publishdata, logController.setLog);
ScheduleRoutes.patch('/:cabinetId/set-status', IpMiddleware('set status schedule'), scheduleController.set_status, MQTTController.publishdata, logController.setLog);
ScheduleRoutes.patch('/:cabinetId/get-home', IpMiddleware('get schedule home'), scheduleController.get_schedule_home);
module.exports = ScheduleRoutes;