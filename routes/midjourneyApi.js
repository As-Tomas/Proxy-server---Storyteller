const express = require('express');
const router = express.Router();
const needle = require('needle');
const { Midjourney } = require('midjourney');



const SALAI_TOKEN = process.env.SALAI_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const API_VCHANNEL_IDERSION = process.env.CHANNEL_ID;
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;



router.get('/imagine', async (req, res) => {

    const client = new Midjourney({
        ServerId: process.env.SERVER_ID,
        ChannelId: process.env.CHANNEL_ID,
        SalaiToken: process.env.SALAI_TOKEN,
        Debug: true,
        Ws: true, //enable ws is required for remix mode (and custom zoom)
      });

      await client.init();

      const prompt =
      "Christmas dinner with family in a cozy house in mountains, simple warm collors illustration";
    //imagine
    const Imagine = await client.Imagine(
      prompt,
      (uri, progress) => {
        console.log("loading", uri, "progress", progress);
      }
    );
    
    console.log(Imagine);

    if (!Imagine) {
        console.log("no message");
        res.json({success: false})
      }
      else {
        console.log("link to img " + Imagine.uri);
        res.json({success: true, img: Imagine.uri})   
      }

})

module.exports = router;

