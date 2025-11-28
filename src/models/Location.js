const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Location = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    cabinetID: { type: Schema.Types.ObjectId, ref: 'Cabinet', required: true },
    
    X: { type: String, required: true },
    Y: { type: String, required: true },
    Date: { type: Date, required: true },
});

module.exports = mongoose.model(
    'Location',
    Location,
    'Location',
);
