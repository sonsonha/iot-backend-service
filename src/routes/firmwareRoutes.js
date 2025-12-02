var express = require('express');
var FirmwareRouter = express.Router();
const firmwareController = require('../controllers/firmwareController');
const upload = require('../middlewares/uploadMiddleware');

FirmwareRouter.post('/:cabinetId/upload', upload.single('file'), firmwareController.upload);
FirmwareRouter.post('/:cabinetId/download', firmwareController.downloadFile);
FirmwareRouter.post('/:cabinetId/get', firmwareController.getVersions);

module.exports = FirmwareRouter;