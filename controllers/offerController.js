// controllers/offerController.js
const Offer = require('../models/Offer');

function parseDiscount(summary, amountToPay) {
  const normalized = summary.replace(/[,₹]/gi, ''); // Remove ₹ and commas
  const summaryLower = normalized.toLowerCase();

  const percentMatch = summaryLower.match(/(\d+)\s*%/);
  const maxCapMatch = summaryLower.match(/(?:up\s*to|upto)\s*(?:rs\.?)?\s*(\d{2,})/i);
  const flatDiscountMatch = summaryLower.match(/flat\s*(\d+)\s*(?:off|discount)?/i);
  const cashbackMatch = summaryLower.match(/(?:₹|rs\.?)?\s*(\d+)\s*cashback/i);
  const genericDiscountMatch = summaryLower.match(/(?:save|extra|instant|rs\.?|₹)?\s*(\d{2,})\s*(?:off|discount|instantly)?/i);

  const minOrderMatch = summaryLower.match(
    /min(?:imum|\.)?\s*(order|txn|transaction|purchase|amount|val(?:ue)?\.?)?\s*(of|value|val\.|amount)?\s*[:=]?\s*₹?\s*(\d{2,})/i
  );

  const percent = percentMatch ? parseInt(percentMatch[1]) : null;
  const maxCap = maxCapMatch ? parseInt(maxCapMatch[1]) : null;
  const flatDiscount = flatDiscountMatch ? parseInt(flatDiscountMatch[1]) : null;
  const cashback = cashbackMatch ? parseInt(cashbackMatch[1]) : null;
  const genericDiscount = genericDiscountMatch ? parseInt(genericDiscountMatch[1]) : null;
  const minOrder = minOrderMatch ? parseInt(minOrderMatch[3]) : 0;

  // STEP 1: Respect minOrder
  if (amountToPay < minOrder) return 0;

  let discount = 0;
  const fiftyPercentCap = Math.floor(amountToPay * 0.5);

  // STEP 2: Flat discount
  if (flatDiscount !== null) {
    discount = flatDiscount;
  }

  // STEP 3: Cashback
  if (cashback !== null) {
    discount = Math.max(discount, cashback);
  }

  // STEP 4: Generic discount (only if percent/flat not found)
  if (genericDiscount !== null && percent === null && flatDiscount === null) {
    discount = Math.max(discount, genericDiscount);
  }

  // STEP 5: Percentage logic
  if (percent !== null) {
    const rawPercent = (percent / 100) * amountToPay;
    const cap = maxCap !== null ? Math.min(rawPercent, maxCap) : rawPercent;
    discount = Math.max(discount, cap);
  }

  // STEP 6: Final Cap — don't allow > 50% of amount
  return Math.min(discount, fiftyPercentCap, amountToPay);
};

async function ingestOffers(req, res) {
  try {
    const payload = req.body;

    if (!payload.offer_sections?.PBO?.offers) {
      return res.status(400).json({ message: 'Missing offer_sections.PBO.offers in request body' });
    }

    const offers = payload.offer_sections.PBO.offers;
    let totalOffers = offers.length;
    let newOffersCreated = 0;

    for (const offer of offers) {
      // Defensive: skip if adjustment_id is missing (can't ensure uniqueness)
      if (!offer.adjustment_id) continue;

      const exists = await Offer.findOne({ adjustment_id: offer.adjustment_id });
      if (exists) continue;

      let banks = offer.contributors?.banks || [];
      if (/UPI/i.test(offer.summary) && !banks.includes("UPI")) {
        banks.push("UPI");
      }

      // Sort arrays for consistent storage (optional but good)
      banks = banks.sort();
      const payment_instrument = (offer.contributors?.payment_instrument || []).sort();
      const emi_months = offer.contributors?.emi_months || [];

      const newOffer = new Offer({
        adjustment_type: offer.adjustment_type,
        adjustment_id: offer.adjustment_id,
        summary: offer.summary,
        payment_instrument,
        banks,
        emi_months
      });

      await newOffer.save();
      newOffersCreated++;
    }

    res.json({
      message: 'Offer ingestion completed',
      noOfOffersIdentified: totalOffers,
      noOfNewOffersCreated: newOffersCreated
    });

  } catch (error) {
    console.error('Error while ingesting offers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

async function getHighestDiscount(req, res) {
  try {
    const amountToPay = parseFloat(req.query.amountToPay);
    const bankName = req.query.bankName?.toUpperCase();
    const paymentInstrument = req.query.paymentInstrument?.toUpperCase();

    if (isNaN(amountToPay) || !bankName) {
      return res.status(400).json({ message: 'Missing or invalid amountToPay or bankName' });
    }

    const query = {
      banks: bankName
    };

    if (paymentInstrument) {
      query.payment_instrument = paymentInstrument;
    }

    const applicableOffers = await Offer.find(query);

    if (!applicableOffers.length) {
      return res.json({ highestDiscountAmount: 0 });
    }

    let maxDiscount = 0;

    for (const offer of applicableOffers) {
      const discount = parseDiscount(offer.summary, amountToPay);
      if (discount > maxDiscount) {
        maxDiscount = discount;
      }
    }

    res.json({ highestDiscountAmount: Math.floor(maxDiscount) });

  } catch (err) {
    console.error('Error in getHighestDiscount:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  parseDiscount,
  ingestOffers,
  getHighestDiscount
};
