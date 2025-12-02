// models/Cabinet.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CabinetSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },

  name: { type: String},
  description: { type: String },

  board: { type: String, enum: ['Relay 6ch'], required: true, default: 'Relay 6ch', },

  device_id: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CabinetSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// CabinetSchema.index({ userID: 1, name: 1 }, { unique: true });
CabinetSchema.index({ userID: 1, device_id: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Cabinet', CabinetSchema, 'Cabinet');