
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

//TODO - reduce limits
// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000 // Limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.set('trust proxy', 1);

// Enable CORS
app.use(cors({
  origin: 'http://10.0.2.2:3000' // or use '*' to allow any domain
}));

// Middleware to check for API key in the request header
function checkApiKey(req, res, next) {
    const apiKey = req.get('X-API-Key'); // Replace 'X-API-Key' with the name of your header
    if (!apiKey || apiKey !== process.env.SRV_USR_API) {
        return res.status(401).json({ success: false, message: 'Invalid or missing API key' });
    }
    next();
}

// Routes
app.use('/api', checkApiKey, require('./routes/midjourneyApi'));
//app.use('/api',  require('./routes/midjourneyApi'));

// // Endpoint for Server-Sent Events
// app.get('/events', (req, res) => {
//     // Set headers for SSE
//     res.writeHead(200, {
//         'Content-Type': 'text/event-stream',
//         'Connection': 'keep-alive',
//         'Cache-Control': 'no-cache'
//     });

//     // Send a welcome message on connection
//     res.write(`data: ${JSON.stringify({ message: 'Connected to update stream' })}\n\n`);

//     // Keep the connection open by sending a comment
//     const keepAliveInterval = setInterval(() => {
//         res.write(': keep-alive\n\n');
//     }, 20000);

//     // Remove the keep-alive interval when the connection is closed
//     req.on('close', () => {
//         clearInterval(keepAliveInterval);
//     });
// });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
