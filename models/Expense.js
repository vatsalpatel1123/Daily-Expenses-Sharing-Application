const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    share: { type: Number, required: true } // stores exact amount or percentage owed by the participant
  }],
  splitMethod: { type: String, enum: ['equal', 'exact', 'percentage'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
