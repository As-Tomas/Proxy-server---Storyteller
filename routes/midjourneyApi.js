const express = require("express");
const router = express.Router();
const { Midjourney } = require("midjourney");

// This will store client connections for SSE
const clients = {};

// Helper function to send data to a specific client
function sendToClient(clientId, data) {
  const client = clients[clientId];
  console.log(`Attempting to send message to client ${clientId}`);
  if (client && !client.finished) { // Check if the client exists and the response is not finished
    console.log(`Sending message to client ${clientId}`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  } else {
    console.log(`Client ${clientId} not found or response finished`);
  }
}

// SSE endpoint to establish a connection and send updates
router.get("/events", (req, res) => {
  const requestHeaders = req.headers;
  const userName = requestHeaders['username'];
  // Generate a unique client ID
  const clientId = userName ;
  console.log(`Client connected with ID: ${clientId}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*", // Allow any domain to connect
  });

  clients[clientId] = res;
  console.log(`Added client. Total clients: ${Object.keys(clients).length}`);

  // Send a welcome message on connection
  const welcomeData = { message: "Connected to update stream" };
  sendToClient(clientId, welcomeData);
  console.log(`Sent welcome message to client ${clientId}`);

  // Keep the connection open by sending a comment
  const keepAliveInterval = setInterval(() => {
    if (res.writableEnded) { // Check if the client has disconnected
      clearInterval(keepAliveInterval); // Stop the keep-alive messages
      delete clients[clientId]; // Clean up the clients object
      console.log(`Stopped keep-alive for client ID: ${clientId}`);
    } else {
      res.write(': keep-alive\n\n');
    }
  }, 20000); // Send a keep-alive every 20 seconds

  // Log when the connection is closed
  req.on("close", () => {
    clearInterval(keepAliveInterval);
    console.log(`Client disconnected with ID: ${clientId}`);
    delete clients[clientId];
    console.log(`Removed client. Total clients: ${Object.keys(clients).length}`);
  });

  const data = {message: 'Job done', result: 'Your result here' };
  sendToClient(clientId, data);
});

// Your existing /imagine endpoint modified to use SSE
router.post("/imagine", async (req, res) => {
  // Extract the prompt from the request
  const requestData = req.body;
  const prompt = requestData.prompt;
  const clientId = requestData.userName; // Get the client ID from the request

  console.log('prompt', prompt);
  console.log('clientId', clientId); // Log the client ID
  if (!prompt) {
    return res
      .status(400)
      .json({ success: false, error: "No prompt provided" });
  }

  // Initialize the client and send a job accepted message
  const jobId = clientId; // Use the client ID as the job ID
  const jobAcceptedData = {
    jobId,
    status: "accepted",
    message: "Job accepted and processing started.",
  };
  sendToClient(jobId, jobAcceptedData);

  // Process the imagine job asynchronously
  processImagineJob(prompt, jobId, res);
});

async function processImagineJob(prompt, jobId, res) {
  const client = new Midjourney({
    ServerId: process.env.SERVER_ID,
    ChannelId: process.env.CHANNEL_ID,
    SalaiToken: process.env.SALAI_TOKEN,
    Debug: false,
    Ws: true, //enable ws is required for remix mode (and custom zoom)
  });

  try {
    await client.init();

    // Imagine process
    const Imagine = await client.Imagine(prompt, (uri, progress) => {
      // Send progress updates to the client
      const progressData = { jobId, status: "in-progress", progress, uri };
      sendToClient(jobId, progressData);
    });

    if (!Imagine) {
      throw new Error("No response from Imagine API");
    }

    const U1CustomID = Imagine.options?.find((o) => o.label === "U1")?.custom;
    if (!U1CustomID) {
      throw new Error("No U1 option found");
    }

    // Upscale process
    const Upscale = await client.Custom({
      msgId: Imagine.id,
      flags: Imagine.flags,
      customId: U1CustomID,
      content: prompt,
      loading: (uri, progress) => {
        // Send progress updates to the client
        const progressData = { jobId, status: "in-progress", progress, uri };
        sendToClient(jobId, progressData);
      },
    });

    if (!Upscale) {
      throw new Error("No response from Upscale API");
    }

    // When the image is ready, send an update to the client
    const completedData = { jobId, status: "completed", img: Upscale.uri };
    sendToClient(jobId, completedData);

    // Respond to the initial HTTP request to acknowledge it was received
    res.json({
      success: true,
      message: "Job accepted, updates will be sent via SSE.",
    });
  } catch (error) {
    // If an error occurs, send an error update to the client
    const errorData = { jobId, status: "error", message: error.message };
    sendToClient(jobId, errorData);

    // Respond to the initial HTTP request with the error
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred, please check the SSE for details.",
        error: error.toString(),
      });
  }
}

module.exports = router;