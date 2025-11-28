const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RelaySchema = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users' },
    
    relay_id: { type: Number, required: true },
    relay_name: { type: String },
    state: { type: Boolean, required: true },
    relay_home: { type: Boolean, required: true },
});

RelaySchema.index({ userID: 1, relay_id: 1 }, { unique: true });

module.exports = mongoose.model('Relay', RelaySchema, 'Relay');
