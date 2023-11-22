const clients = {};

function sendToClient(clientId, data) {
  const client = clients[clientId];
  //console.log(`Attempting to send message to client ${clientId}`);
  if (client && !client.finished) {
    console.log(`Sending message to client ${clientId}`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  } else {
    console.log(`Client ${clientId} not found or response finished`);
  }
}

function sse(req, res) {
  const requestHeaders = req.headers;
  const userNameAndJob = requestHeaders["usernameandjob"];
  const clientId = userNameAndJob;
  console.log(`Client connected with ID: -> ${clientId}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });

  clients[clientId] = res;
  console.log(`Added client. Total clients: ${Object.keys(clients).length}`);

  const welcomeData = { message: "Connected to update stream" };
  sendToClient(clientId, welcomeData);
  console.log(`Sent welcome message to client ${clientId}`);

  const keepAliveInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepAliveInterval);
      delete clients[clientId];
      console.log(`Stopped keep-alive for client ID: ${clientId}`);
    } else {
      res.write(": keep-alive\n\n");
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAliveInterval);
    console.log(`Client disconnected with ID: ${clientId}`);
    delete clients[clientId];
    console.log(
      `Removed client. Total clients: ${Object.keys(clients).length}`
    );
  });

  const data = { message: "Job done", result: "Your result here" };
  sendToClient(clientId, data);
}

module.exports = { sse, sendToClient };
