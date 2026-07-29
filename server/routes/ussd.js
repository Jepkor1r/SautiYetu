const express = require("express");
const gameEngine = require("../services/gameEngine");
const leaderboard = require("../services/leaderboard");
const rewardService = require("../services/rewardService");
const store = require("../services/store");

const router = express.Router();

function menu() {
  return [
    "CON Sauti Yetu",
    "1. Live score",
    "2. Predict next scorer",
    "3. Trivia",
    "4. Vote man of the match",
    "5. Leaderboard"
  ].join("\n");
}

function formatPlayers(prefix) {
  return [`CON ${prefix}`, gameEngine.playerListText()].join("\n");
}

function formatTrivia(trivia) {
  return [
    `CON Trivia - 5 pts`,
    trivia.question,
    `1. ${trivia.options.A}`,
    `2. ${trivia.options.B}`,
    `3. ${trivia.options.C}`,
    `4. ${trivia.options.D}`
  ].join("\n");
}

function sendText(res, body) {
  res.type("text/plain").send(body);
}

router.post("/", async (req, res, next) => {
  try {
    const phoneNumber = req.body.phoneNumber || req.body.msisdn || req.body.from;
    const text = String(req.body.text || "").trim();
    const parts = text ? text.split("*") : [];
    const io = req.app.get("io");

    if (!parts.length) {
      return sendText(res, menu());
    }

    const choice = parts[0];

    if (choice === "1") {
      return sendText(res, `END ${gameEngine.formatScore()}`);
    }

    if (choice === "2") {
      if (parts.length === 1) {
        return sendText(res, formatPlayers("Pick next goal scorer"));
      }

      const result = gameEngine.recordPrediction({
        phoneNumber,
        playerInput: parts[1],
        channel: "USSD",
        io
      });

      if (!result.ok) {
        return sendText(res, `END ${result.message}`);
      }

      await rewardService.sendActionConfirmation({
        phoneNumber,
        action: "next goal prediction",
        outcome: `${result.player.name} is locked as your next scorer pick`
      });

      return sendText(res, `END ${result.message} SMS confirmation sent.`);
    }

    if (choice === "3") {
      const trivia = await gameEngine.getOrCreateTrivia();

      if (parts.length === 1) {
        return sendText(res, formatTrivia(trivia));
      }

      const result = await gameEngine.recordTriviaAnswer({
        phoneNumber,
        answer: parts[1],
        channel: "USSD",
        io
      });

      await rewardService.sendActionConfirmation({
        phoneNumber,
        action: "live trivia",
        outcome: result.message
      });

      return sendText(res, `END ${result.message} ${result.trivia.explanation}`);
    }

    if (choice === "4") {
      if (parts.length === 1) {
        return sendText(res, formatPlayers("Vote man of the match"));
      }

      const result = gameEngine.recordVote({
        phoneNumber,
        playerInput: parts[1],
        channel: "USSD",
        io
      });

      if (!result.ok) {
        return sendText(res, `END ${result.message}`);
      }

      await rewardService.sendActionConfirmation({
        phoneNumber,
        action: "man-of-the-match vote",
        outcome: result.message
      });

      return sendText(res, `END ${result.message} SMS confirmation sent.`);
    }

    if (choice === "5") {
      return sendText(res, `END Leaderboard\n${leaderboard.formatLeaderboardText()}`);
    }

    store.getFan(phoneNumber);
    return sendText(res, "END Invalid choice. Dial again and pick 1-5.");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
