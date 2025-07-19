# Flipkart Offer Extractor

## Project Overview

This backend service processes Flipkart's offers, stores them in a database, and provides APIs to retrieve the highest discount for given payment details.

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/shubhamkr7519/flipkart-offer-extractor.git
cd flipkart-offer-extractor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start          # PORT=3000, or update PORT in .env
npm run dev        # For development with nodemon
```

Ensure MongoDB is running locally on mongodb://localhost:27017/flipkart-offers, or update MONGO_URI in .env

---

## API Endpoints

### 1. Ingest Offers

**POST /offer**

Ingests offers from Flipkart’s internal offers API response and stores them in MongoDB.

#### How to Retrieve the Payload

You must extract the flipkart offers response by inspecting Flipkart’s web app:

1. Go to the **Payment Page** on Flipkart (desktop browser).
2. Open **Chrome DevTools** → go to the **Network** tab.
3. Filter by **Fetch/XHR**.
4. Look for a request named **`options?token=...`** (see `Flipkart_Offers_API.png` for reference).
5. Click on it → go to the **Response** tab → copy the entire JSON and use it as the request payload.

#### Request Payload:

```json
{
  "offer_sections": {
    "PBO": {
      "offers": [
        /* Flipkart offers array */
      ]
    }
  }
}
```
##### Note: 
The sample-payload.json file contains a sample payload retrieved using the above steps (in case you're not able to retrieve or facing other issues). There are many keys in this json payload but we're only interested in the key "offer_sections" as shown above.

#### Response:
```json
{
  "noOfOffersIdentified": 5,
  "noOfNewOffersCreated": 3
}
```

---

### 2. Get Highest Discount

**GET /highest-discount**

#### Query Parameters:
- `amountToPay` (required): e.g. `10000`
- `bankName` (required): e.g. `ICICI`, `SBI`
- `paymentInstrument` (optional): e.g. `CREDIT`, `EMI_OPTIONS`

#### Example:
```
/highest-discount?amountToPay=10000&bankName=SBI&paymentInstrument=CREDIT
```

#### Response:
```json
{
  "highestDiscountAmount": 500
}
```

---

## Assumptions

- Only offers under `offer_sections.PBO.offers` are considered.
- `adjustment_id` is treated as the unique identifier for deduplication.
- If the word "UPI" is found in the summary, we manually add "UPI" in `banks`.
- The discount is estimated from the summary text using a set of regex rules and it's capped at 50% of the payment amount for practicality to tackle complex edge cases where minimum order value is not present. These kind of cases may occur as several offers are linked to a particular high MRP products. 

---

## Design Decisions

- **Node.js** and **Express** were chosen for their minimal boilerplate and fast development.
- **MongoDB** (via Mongoose) was ideal due to flexible schema requirements and easy array querying.
- `adjustment_id` is used as a unique key to prevent duplicate entries.

---

## Scaling the GET /highest-discount API

To handle **1,000+ requests per second**, the following strategies can be employed:

- **Database Optimization**:
  - Index fields like `banks`, `payment_instrument`, and `adjustment_id`.
  - Use compound indexes to support complex queries.

- **Caching**:
  - Use Redis to cache results for frequent bank + instrument + amount combinations.
  - Expire cache after X minutes or invalidate on ingestion.

- **Horizontal Scaling**:
  - Run multiple instances behind a load balancer (e.g. AWS ALB, NGINX).
  - Use stateless APIs to enable better horizontal scale.

- **Rate Limiting**:
  - Use tools like `express-rate-limit` to protect against abuse.

- **Preprocessing**:
  - During ingestion, precompute and store top offers per bank/payment combo for faster lookup.

---

## Future Improvements

If given more time, these enhancements would be prioritized:

- **Robust discount parsing** using a rules engine or NLP to improve summary parsing to tackle more complex cases.
- **Data normalization** for bank and instrument names using mapping tables.
- **Scaling** as mentioned above for production-grade reliability.
- **Integration Tests** with tools like Jest.
- **Admin dashboard** to browse, filter and export stored offers.

---

## Testing

The `parseDiscount()` function has been tested for complex summaries and edge cases. These include:

- Flat discounts
- Cashback with minimum order
- Percentage discounts with cap
- Generic discount formats like "Save ₹500 instantly"

---

## License

This project is strictly for educational and evaluation purposes and does not encourage or endorse any unauthorized usage of Flipkart’s APIs.
