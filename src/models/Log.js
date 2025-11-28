const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Log = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    cabinetID: { type: Schema.Types.ObjectId, ref: 'Cabinet', required: true },
    
    activity: { type: String, required: true },
    Date: { type: Date, required: true }
})

module.exports = mongoose.model(
    'Log',
    Log,
    'Log',
);
