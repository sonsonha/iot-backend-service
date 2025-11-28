const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HumiditySensor = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    cabinetID: { type: Schema.Types.ObjectId, ref: 'Cabinet', required: true },
    data: { type: Number, required: true },
    Date: { type: Date, required: true },
});

module.exports = mongoose.model(
    'HumiditySensor',
    HumiditySensor,
    'HumiditySensor',
);
