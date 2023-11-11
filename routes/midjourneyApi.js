// const express = require("express");
// const router = express.Router();
// const url = require("url");
// const needle = require("needle");
// const { Midjourney } = require("midjourney");

// // This object will hold the SSE connections
// const clients = {};

// // Establish an SSE connection
// router.get('/events', (req, res) => {
//   const clientId = Date.now(); // Generate a unique client ID
//   const headers = {
//     'Content-Type': 'text/event-stream',
//     'Connection': 'keep-alive',
//     'Cache-Control': 'no-cache'
//   };
//   res.writeHead(200, headers);

//   // Construct a simple SSE response message
//   const data = `data: ${JSON.stringify({ message: "Connection established" })}\n\n`;
//   res.write(data);

//   // Store this client's response object so we can send updates later
//   clients[clientId] = res;

//   // When the client closes the connection, remove the corresponding response object
//   req.on('close', () => {
//     console.log(`Client ${clientId} connection closed`);
//     delete clients[clientId];
//   });
// });

// // Function to send updates to all clients
// function sendUpdateToClients(update) {
//   Object.keys(clients).forEach(clientId => {
//     clients[clientId].write(`data: ${JSON.stringify(update)}\n\n`);
//   });
// }

// const client = new Midjourney({
//   ServerId: process.env.SERVER_ID,
//   ChannelId: process.env.CHANNEL_ID,
//   SalaiToken: process.env.SALAI_TOKEN,
//   Debug: false,
//   Ws: true, //enable ws is required for remix mode (and custom zoom)
// });

// router.get("/imagine", async (req, res) => {
//   const requestData = req.body;

//   if (process.env.NODE_ENV !== "production") {
//     console.log("Request query ", url.parse(req.url, true).query);
//     console.log("Request body: ", requestData);
//     //console.log("Request headers: ", req.headers);
//   }

//   await client.init();

//   // Instead of sending the response immediately, send a job accepted message
//   const jobId = Date.now(); // Generate a unique job ID
//   sendUpdateToClients({ jobId, status: 'accepted', message: 'Job accepted and queued for processing.' });

//   try {
//     const prompt = requestData.prompt;
//     if (prompt === undefined) {
//       console.log("no prompt");
//       res.status(400).json({ success: false, error: "no prompt" });
//     }

//     //imagine
//     const Imagine = await client.Imagine(prompt, (uri, progress) => {
//       console.log("loading", uri, "progress", progress);
//     });

//     console.log(Imagine);

//     if (!Imagine) {
//       console.log("no message");
//       res.status(400).json({ success: false });
//     } else {
//       const U1CustomID = Imagine.options?.find((o) => o.label === "U1")?.custom;
//       if (!U1CustomID) {
//         console.log("no U1");
//         res.status(400).json({ success: false, error: "no U1" });
//       }

//       // Upscale U1

//       const Upscale = await client.Custom({
//         msgId: Imagine.id,
//         flags: Imagine.flags,
//         customId: U1CustomID,
//         content: prompt,
//         loading: (uri, progress) => {
//           console.log("loading", uri, "progress", progress);
//         },
//       });

//       console.log(Upscale);

//       if (!Upscale) {
//         console.log("no Upscale");
//         res.status(400).json({ success: false, error: "no Upscale" });
//       }

//       console.log("Upscale ", Upscale);

//       console.log("link to all img " + Imagine.uri);
//       console.log("link to upscaled img " + Upscale.uri);
//       //res.status(200).json({ success: true, img: Upscale.uri });

//       // Instead of sending the response immediately, send a job accepted message
//   const jobId = Date.now(); // Generate a unique job ID
//   sendUpdateToClients({ jobId, status: 'accepted', message: 'Job accepted and queued for processing.' });

//     }
//   } catch (error) {
//     console.error("Error: ", error.message);
//     console.error("Stack Trace: ", error.stack);
//     //res.status(500).json({ success: false, error: error.message });
//     sendUpdateToClients({ jobId, status: 'error', message: error.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { Midjourney } = require("midjourney");

// This will store client connections for SSE
const clients = {};

// Helper function to send data to all clients
function sendToAllClients(data) {
  Object.keys(clients).forEach((clientID) => {
    const client = clients[clientID];
    console.log(`Sending message to client ${clientID}`);
    if (client.finished) { // Check if the response is finished
      delete clients[clientID]; // Remove from clients if finished
    } else {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  });
}

// SSE endpoint to establish a connection and send updates
router.get("/events", (req, res) => {
  // Generate a unique client ID
  const clientId = Date.now();
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
  res.write(`data: ${JSON.stringify({ message: "Connected to update stream" })}\n\n`);
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
});

// Your existing /imagine endpoint modified to use SSE
router.post("/imagine", async (req, res) => {
  // Extract the prompt from the request
  const requestData = req.body;
  const prompt = requestData.prompt;
  if (!prompt) {
    return res
      .status(400)
      .json({ success: false, error: "No prompt provided" });
  }

  // When something happens (e.g., when you get a result from your existing code), send an event to all clients
  const data = { message: 'Something happened', result: 'Your result here' };
  for (const client in clients) {
    clients[client].write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Initialize the client and send a job accepted message
  const jobId = Date.now();
  sendToAllClients({
    jobId,
    status: "accepted",
    message: "Job accepted and processing started.",
  });

  // res.json({
  //   success: true,
  //   message: "Job accepted, updates will be sent via SSE.",
  // });

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
      sendToAllClients({ jobId, status: "in-progress", progress, uri });
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
        sendToAllClients({ jobId, status: "in-progress", progress, uri });
      },
    });

    if (!Upscale) {
      throw new Error("No response from Upscale API");
    }

    // When the image is ready, send an update to the client
    sendToAllClients({ jobId, status: "completed", img: Upscale.uri });

    // Respond to the initial HTTP request to acknowledge it was received
    res.json({
      success: true,
      message: "Job accepted, updates will be sent via SSE.",
    });
  } catch (error) {
    // If an error occurs, send an error update to the client
    sendToAllClients({ jobId, status: "error", message: error.message });

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
