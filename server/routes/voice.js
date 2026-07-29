const express = require("express");
const aiService = require("../services/aiService");
const store = require("../services/store");

const router = express.Router();

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.post("/", async (req, res, next) => {
  try {
    const hype = await aiService.generateVoiceHypeScript({
      match: store.getMatchState(),
      recentEvents: store.getEvents(5)
    });

    res
      .type("application/xml")
      .send([
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<Response>",
        `<Say>${escapeXml(hype.script)}</Say>`,
        "</Response>"
      ].join(""));
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const hype = await aiService.generateVoiceHypeScript({
      match: store.getMatchState(),
      recentEvents: store.getEvents(5)
    });

    res
      .type("application/xml")
      .send([
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<Response>",
        `<Say>${escapeXml(hype.script)}</Say>`,
        "</Response>"
      ].join(""));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
