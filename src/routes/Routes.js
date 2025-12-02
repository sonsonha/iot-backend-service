const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const checkRole = require('../middlewares/checkRole');
const cabinetRoutes = require('./cabinetRoutes');

const usersRouter = require('./userRoutes');
const sensorRoutes = require('./sensorRoutes');
const emailRoutes = require('./emailRoutes');
const logRoutes = require('./logRoutes');
const relayRoutes = require('./relayRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const mqttRoutes = require('./mqttRoutes')
const firmwareRoutes = require('./firmwareRoutes')

router.use('/', usersRouter);
router.use('/sensor', authenticateToken, checkRole, sensorRoutes);
router.use('/email', emailRoutes);
router.use('/log', authenticateToken, checkRole, logRoutes);
router.use('/relay', authenticateToken, checkRole, relayRoutes);
router.use('/schedule', authenticateToken, checkRole, scheduleRoutes);
router.use('/mqtt', authenticateToken, mqttRoutes);
router.use('/firmware', authenticateToken, firmwareRoutes);
router.use('/cabinet', cabinetRoutes);

module.exports = router;
