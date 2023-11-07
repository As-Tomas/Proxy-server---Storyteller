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
    max: 500 //limit each IP to 1 requests per windowMs
}); 

app.use(limiter);
app.set('trust proxy', 1);

//enable cors;
app.use(cors())

// Routes
app.use('/api', require('./routes/midjourneyApi'))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
