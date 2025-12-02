const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const checkRole = require('../middlewares/checkRole');
const cabinetController = require('../controllers/cabinetController');

router.use(authenticateToken);

router.get('/locations/all', cabinetController.getCabinetLocations);
router.get('/:id/overview', cabinetController.getCabinetOverview);

// CRUD cabinet
router.get('/', cabinetController.getCabinets);
router.get('/:id', cabinetController.getCabinetById);
router.post('/', cabinetController.createCabinet);
router.put('/:id', cabinetController.updateCabinet);
router.delete('/:id', cabinetController.deleteCabinet);

module.exports = router;
