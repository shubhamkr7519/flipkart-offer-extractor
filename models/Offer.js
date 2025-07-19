const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  adjustment_type: String,
  adjustment_id: { type: String, unique: true },  // unique key for offers
  summary: String,
  payment_instrument: [String],
  banks: [String],
  emi_months: [String]
});

module.exports = mongoose.model('Offer', offerSchema);