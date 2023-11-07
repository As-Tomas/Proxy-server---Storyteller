const express = require("express");
const router = express.Router();
const url = require("url");
const needle = require("needle");
const { Midjourney } = require("midjourney");

const client = new Midjourney({
  ServerId: process.env.SERVER_ID,
  ChannelId: process.env.CHANNEL_ID,
  SalaiToken: process.env.SALAI_TOKEN,
  Debug: true,
  Ws: true, //enable ws is required for remix mode (and custom zoom)
});

router.get("/imagine", async (req, res) => {
  const requestData = req.body;

  if (process.env.NODE_ENV !== "production") {
    console.log("Request query ", url.parse(req.url, true).query);
    console.log("Request body: ", requestData);
    //console.log("Request headers: ", req.headers);
  }

  await client.init();

  try {
    const prompt = requestData.prompt;
    if (prompt === undefined) {
      prompt =
        "Christmas evening with family in a cozy house in mountains close to ski resort, realistic";
    }

    //imagine
    const Imagine = await client.Imagine(prompt, (uri, progress) => {
      console.log("loading", uri, "progress", progress);
    });

    console.log(Imagine);

    if (!Imagine) {
      console.log("no message");
      res.status(400).json({ success: false });
    } else {
      const U1CustomID = Imagine.options?.find((o) => o.label === "U1")?.custom;
      if (!U1CustomID) {
        console.log("no U1");
        return;
      }
      // Upscale U1
      const Upscale = await client.Custom({
        msgId: Imagine.id,
        flags: Imagine.flags,
        customId: U1CustomID,
        loading: (uri, progress) => {
          console.log("loading", uri, "progress", progress);
        },
      });
      if (!Upscale) {
        console.log("no Upscale");
        return;
      }
      console.log(Upscale);

      console.log("link to all img " + Imagine.uri);
      console.log("link to upscaled img " + Upscale.uri);
      res.status(200).json({ success: true, img: Upscale.uri });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }
});

module.exports = router;
