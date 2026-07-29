const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {
  res
    .type("application/xml")
    .send([
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<Response>",
      "<Say>Welcome to Sauti Yetu. Use USSD or SMS to play the live match experience.</Say>",
      "</Response>"
    ].join(""));
});

module.exports = router;
