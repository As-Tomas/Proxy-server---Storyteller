const express = require("express");
const axios = require("axios");
const router = express.Router();
const { sse, sendToClient } = require("./sse");

require("dotenv").config();

router.get("/story", sse);

router.post("/story", async (req, res) => {
  // Extract the prompt from the request
  const requestData = req.body;
  const prompt = requestData.prompt;

  const clientId = requestData.userNameAndJob; // Get the client ID from the request

  console.log("prompt", prompt);
  console.log("clientId in oA", clientId); // Log the client ID
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
  processStoryJob(prompt, jobId, res);
});

async function processStoryJob(prompt, jobId, res) {
  const openai = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v1",
    },
  });

  try {
    //Retrieve excisting assistant
    const assistant = await openai.get(
      "/assistants/asst_oy9BzDnwDZYoT2Ubw8dhtLT5"
    );
    //console.log('assistant!!!', assistant)

    //Threads
    // Create new thread
    const thread = await openai.post("/threads");

    //create new message
    const message = await openai.post(`/threads/${thread.data.id}/messages`, {
      role: "user",
      content: "Storry about rich people",
    });

    //Run assistant
    const run = await openai.post(`/threads/${thread.data.id}/runs`, {
      assistant_id: assistant.data.id,
      instructions: "Please address user as Tester openAi",
    });

    //console.log(run.data);

    let intervalId = setInterval(async () => {
      const runStatus = await openai.get(
        `/threads/${thread.data.id}/runs/${run.data.id}`
      );
      if (runStatus.data.status === "completed") {
        const messages = await openai.get(
          `/threads/${thread.data.id}/messages`
        );
        //console.log('messages', messages)
        messages.data.data.forEach((message) => {
          const role = message.role;
          const content = message.content[0].text.value;
          //console.log(`${role.charAt(0).toUpperCase() + role.slice(1)}: ${content}`);
          if (role === "assistant") {
            sendToClient(jobId, {
              jobId,
              status: "completed",
              message: content,
            });
            res.status(200).json({
              success: true,
              message: "Job is completed.",
            });
          }
        });
        clearInterval(intervalId); // Stop the interval when the run is completed
      } else {
        console.log("Run not completed yet");
        sendToClient(jobId, {
          jobId,
          status: "in-progress",
          message: "Run not completed yet",
        });
      }
    }, 5000);
  } catch (error) {
    // If an error occurs, send an error update to the client
    const errorData = { jobId, status: "error", message: error.message };
    sendToClient(jobId, errorData);
    res.status(500).json({
      success: false,
      message: "An error occurred, please check the SSE for details.",
      error: error.toString(),
    });
  }
}
module.exports = router;
