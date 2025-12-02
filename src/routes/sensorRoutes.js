const express = require('express');
const SensorRoutes = express.Router();
const SensorController = require('../controllers/sensorController');
const IpMiddleware = require('../middlewares/IpMiddleware');

SensorRoutes.patch('/:cabinetId/set/temp', IpMiddleware('set temp'), SensorController.setTemp);
SensorRoutes.patch('/:cabinetId/set/humi', IpMiddleware('set humi'), SensorController.setHumi);
SensorRoutes.patch('/:cabinetId/set/location', IpMiddleware('set location'), SensorController.setLocation);

SensorRoutes.get('/:cabinetId/get/temp', IpMiddleware('get temp'), SensorController.getTemp);
SensorRoutes.get('/:cabinetId/get/humi', IpMiddleware('get humi'), SensorController.getHumi);
SensorRoutes.get('/:cabinetId/get/location', IpMiddleware('get location'), SensorController.getLocation);

module.exports = SensorRoutes;
