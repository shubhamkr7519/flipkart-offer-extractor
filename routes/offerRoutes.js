// routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const {
  ingestOffers,
  getHighestDiscount
} = require('../controllers/offerController');

router.post('/offer', ingestOffers);;
router.get('/highest-discount', getHighestDiscount);

module.exports = router;
