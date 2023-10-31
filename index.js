const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

const app = express();

//enable cors;
app.use(cors())

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
