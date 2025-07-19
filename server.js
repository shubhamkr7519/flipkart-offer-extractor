const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const offerRoutes = require('./routes/offerRoutes'); // With .js extension if needed

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
app.use('/', offerRoutes);

// Start server after DB connects
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('DB connection error:', err));
