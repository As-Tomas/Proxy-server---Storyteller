const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());


//rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60* 1000, //10 minutes
    max: 10 //limit each IP to 1 requests per windowMs
}); 


// Middleware to check for API key in the request header
function checkApiKey(req, res, next) {
    const apiKey = req.get('X-API-Key'); // Replace 'X-API-Key' with the name of your header
    if (!apiKey || apiKey !== process.env.SRV_USR_API) {
      return res.status(401).json({ success: false, message: 'Invalid or missing API key' });
    }
    next();
  }

app.use(limiter);
app.set('trust proxy', 1);

//enable cors;
app.use(cors())

// Routes
app.use('/api', checkApiKey, require('./routes/midjourneyApi'))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
