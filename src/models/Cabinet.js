// models/Cabinet.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CabinetSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },

  name: { type: String, required: true },
  description: { type: String },

  board: { type: String, enum: ['Yolo Uno', 'Relay 6ch'], required: true },

  deviceId: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CabinetSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

CabinetSchema.index({ userID: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Cabinet', CabinetSchema, 'Cabinet');
