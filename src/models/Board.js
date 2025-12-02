const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Board = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    cabinetID:{ type: Schema.Types.ObjectId, ref: 'Cabinet', required: true },

    version: {
        type: String,
        required: true,
        unique: true,
    },
    board: {
        type: String,
        required: true,
        enum: ['Yolo Uno', 'Relay 6ch'],
    },
    Date: { type: Date, required: true },
});

Board.index(
  { userID: 1, cabinetID: 1, board: 1 },
  { unique: true }
);

module.exports = mongoose.model(
    'Board',
    Board,
    'Board',
); 
