const express = require("express");
const gameEngine = require("../services/gameEngine");
const leaderboard = require("../services/leaderboard");
const rewardService = require("../services/rewardService");
const store = require("../services/store");

const router = express.Router();

function helpText() {
  return [
    "Sauti Yetu SMS:",
    "SCORE",
    "PREDICT 1",
    "TRIVIA A",
    "VOTE 4",
    "BOARD"
  ].join("\n");
}

function parseCommand(text) {
  const [keyword, ...rest] = String(text || "").trim().split(/\s+/);

  return {
    keyword: String(keyword || "").toUpperCase(),
    value: rest.join(" ")
  };
}

async function handleSmsCommand({ phoneNumber, text, io }) {
  const { keyword, value } = parseCommand(text);

  if (!keyword || keyword === "HELP" || keyword === "MENU") {
    return {
      action: "help",
      message: helpText(),
      sendAiConfirmation: false
    };
  }

  if (keyword === "SCORE") {
    return {
      action: "live score",
      message: gameEngine.formatScore(),
      sendAiConfirmation: true
    };
  }

  if (keyword === "PREDICT" || keyword === "GOAL") {
    const result = gameEngine.recordPrediction({
      phoneNumber,
      playerInput: value,
      channel: "SMS",
      io
    });

    return {
      action: "next goal prediction",
      message: result.message,
      sendAiConfirmation: result.ok,
      result
    };
  }

  if (keyword === "TRIVIA" || keyword === "QUIZ") {
    if (!value) {
      const trivia = await gameEngine.getOrCreateTrivia();
      return {
        action: "live trivia",
        message: `${trivia.question} A) ${trivia.options.A} B) ${trivia.options.B} C) ${trivia.options.C} D) ${trivia.options.D}`,
        sendAiConfirmation: false,
        trivia
      };
    }

    const result = await gameEngine.recordTriviaAnswer({
      phoneNumber,
      answer: value,
      channel: "SMS",
      io
    });

    return {
      action: "live trivia",
      message: `${result.message} ${result.trivia.explanation}`,
      sendAiConfirmation: true,
      result
    };
  }

  if (keyword === "VOTE" || keyword === "MOTM") {
    const result = gameEngine.recordVote({
      phoneNumber,
      playerInput: value,
      channel: "SMS",
      io
    });

    return {
      action: "man-of-the-match vote",
      message: result.message,
      sendAiConfirmation: result.ok,
      result
    };
  }

  if (keyword === "BOARD" || keyword === "LEADERBOARD") {
    return {
      action: "leaderboard",
      message: `Leaderboard\n${leaderboard.formatLeaderboardText()}`,
      sendAiConfirmation: false
    };
  }

  if (keyword === "PLAYERS") {
    return {
      action: "player list",
      message: gameEngine.playerListText(),
      sendAiConfirmation: false
    };
  }

  return {
    action: "unknown",
    message: `Unknown keyword.\n${helpText()}`,
    sendAiConfirmation: false
  };
}

async function smsHandler(req, res, next) {
  try {
    const phoneNumber = req.body.from || req.body.phoneNumber || req.body.msisdn;
    const text = req.body.text || req.body.message || "";
    const io = req.app.get("io");

    store.addInboundSms({
      phoneNumber,
      text
    });

    const response = await handleSmsCommand({
      phoneNumber,
      text,
      io
    });

    if (response.sendAiConfirmation) {
      const confirmation = await rewardService.sendActionConfirmation({
        phoneNumber,
        action: response.action,
        outcome: response.message
      });

      return res.json({
        ok: true,
        response: response.message,
        sms: confirmation.sms
      });
    }

    await rewardService.sendSms(phoneNumber, response.message.slice(0, 320));

    return res.json({
      ok: true,
      response: response.message
    });
  } catch (error) {
    next(error);
  }
}

router.post("/", smsHandler);
router.post("/callback", smsHandler);

module.exports = router;
