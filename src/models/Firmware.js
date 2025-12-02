const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FirmwareSchema = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    cabinetID: { type: Schema.Types.ObjectId, ref: 'Cabinet', required: true },

    board: {
        type: String,
        required: true,
        enum: ['Yolo Uno', 'Relay 6ch'],
    },
    file: {
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true },
    },
    version: {
        type: String,
        required: true,
        unique: true,
    },
    size: {
        type: String,
        required: true,
    },
});

FirmwareSchema.index(
  { userID: 1, cabinetID: 1, board: 1, version: 1 },
  { unique: true }
);

FirmwareSchema.pre('save', function (next) {
    const validUserID = '66c38bb86a798188855a88ea';
    if (this.userID.toString() !== validUserID) {
        const err = new Error('Cannot upload firmware');
        err.statusCode = 403;
        return next(err);
    }
    next();
});

module.exports = mongoose.model('Firmwares', FirmwareSchema, 'Firmwares');
