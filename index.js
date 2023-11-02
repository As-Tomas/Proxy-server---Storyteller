const express = require('express');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();

app.get('/api', (req, res) => {
    res.json({success: true})
})

//enable cors;
app.use(cors())

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
