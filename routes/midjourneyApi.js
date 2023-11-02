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

  if(process.env.NODE_ENV === 'production') {
  console.log("Request query" + url.parse(req.url, true).query);
  }

  await client.init();

  try {
    const prompt =
      "Christmas dinner with family in a cozy house in mountains, simple warm collors illustration";
    //imagine
    const Imagine = await client.Imagine(prompt, (uri, progress) => {
      console.log("loading", uri, "progress", progress);
    });

    console.log(Imagine);

    if (!Imagine) {
      console.log("no message");
      res.status(400).json({ success: false });
    } else {
      console.log("link to img " + Imagine.uri);
      res.status(200).json({ success: true, img: Imagine.uri });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }
});

module.exports = router;
