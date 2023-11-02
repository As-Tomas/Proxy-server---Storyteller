const express = require('express');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();


//enable cors;
app.use(cors())

// Routes
app.use('/api', require('./routes/midjourneyApi'))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
