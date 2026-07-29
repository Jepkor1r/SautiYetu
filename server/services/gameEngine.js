const aiService = require("./aiService");
const leaderboard = require("./leaderboard");
const rewardService = require("./rewardService");
const store = require("./store");

function playerListText() {
  return store.players.map((player) => `${player.id}. ${player.name} (${player.team})`).join("\n");
}

function formatScore() {
  const match = store.getMatchState();
  return `${match.title}: ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}, ${match.minute}' ${match.status}`;
}

function emitDashboardState(io) {
  if (!io) {
    return;
  }

  io.emit("match:update", store.getMatchState());
  io.emit("leaderboard:update", leaderboard.getLeaderboard());
  io.emit("events:update", store.getEvents());
}

async function getOrCreateTrivia() {
  const existing = store.getCurrentTrivia();

  if (existing) {
    return existing;
  }

  const trivia = await aiService.generateTriviaQuestion(store.getMatchState());
  return store.setCurrentTrivia(trivia);
}

async function refreshTrivia() {
  const trivia = await aiService.generateTriviaQuestion(store.getMatchState());
  return store.setCurrentTrivia(trivia);
}

function recordPrediction({ phoneNumber, playerInput, channel = "USSD", io }) {
  const fan = store.getFan(phoneNumber);
  const player = store.findPlayer(playerInput);

  if (!player) {
    return {
      ok: false,
      status: "invalid_player",
      fan,
      message: "Pick a valid player number or name."
    };
  }

  fan.pendingPrediction = {
    playerId: player.id,
    playerName: player.name,
    team: player.team,
    channel,
    createdAt: new Date().toISOString()
  };
  fan.predictions.unshift(fan.pendingPrediction);

  const event = store.addEvent({
    type: "prediction",
    title: "Prediction",
    message: `${store.maskPhone(phoneNumber)} picked ${player.name} for the next goal.`,
    fan: store.maskPhone(phoneNumber),
    player
  });

  if (io) {
    io.emit("match:event", event);
    emitDashboardState(io);
  }

  return {
    ok: true,
    status: "recorded",
    fan,
    player,
    message: `Prediction locked: ${player.name} to score next.`
  };
}

async function recordTriviaAnswer({ phoneNumber, answer, channel = "USSD", io }) {
  const fan = store.getFan(phoneNumber);
  const trivia = await getOrCreateTrivia();
  const normalizedAnswer = String(answer || "").trim().toUpperCase();
  const selectedLetter = ["1", "2", "3", "4"].includes(normalizedAnswer)
    ? ["A", "B", "C", "D"][Number(normalizedAnswer) - 1]
    : normalizedAnswer.slice(0, 1);

  if (!["A", "B", "C", "D"].includes(selectedLetter)) {
    return {
      ok: false,
      status: "invalid_answer",
      fan,
      trivia,
      message: "Reply A, B, C, or D."
    };
  }

  if (fan.triviaAnswers[trivia.id]) {
    return {
      ok: true,
      status: "already_answered",
      fan,
      trivia,
      correct: fan.triviaAnswers[trivia.id].correct,
      message: "You already answered this trivia question."
    };
  }

  const correct = selectedLetter === trivia.answer;
  const points = correct ? 5 : 0;

  if (points > 0) {
    store.addPoints(phoneNumber, points, "Correct trivia");
  }

  fan.triviaAnswers[trivia.id] = {
    answer: selectedLetter,
    correct,
    points,
    channel,
    answeredAt: new Date().toISOString()
  };

  const event = store.addEvent({
    type: "trivia",
    title: correct ? "Trivia Hit" : "Trivia Miss",
    message: `${store.maskPhone(phoneNumber)} answered ${selectedLetter}. ${correct ? "+5 points" : "No points this time"}.`,
    fan: store.maskPhone(phoneNumber),
    points
  });

  if (io) {
    io.emit("match:event", event);
    emitDashboardState(io);
  }

  return {
    ok: true,
    status: correct ? "correct" : "incorrect",
    fan,
    trivia,
    correct,
    points,
    message: correct ? "Correct! You earned 5 points." : `Not quite. Correct answer: ${trivia.answer}.`
  };
}

function recordVote({ phoneNumber, playerInput, channel = "USSD", io }) {
  const fan = store.getFan(phoneNumber);
  const player = store.findPlayer(playerInput);

  if (!player) {
    return {
      ok: false,
      status: "invalid_player",
      fan,
      message: "Pick a valid player number or name."
    };
  }

  const alreadyVoted = Boolean(fan.votes[store.MATCH_ID]);
  fan.votes[store.MATCH_ID] = {
    playerId: player.id,
    playerName: player.name,
    team: player.team,
    channel,
    votedAt: new Date().toISOString()
  };

  if (!alreadyVoted) {
    store.addPoints(phoneNumber, 1, "Man-of-the-match vote");
  }

  const event = store.addEvent({
    type: "vote",
    title: "MOTM Vote",
    message: `${store.maskPhone(phoneNumber)} voted ${player.name} for man of the match.${alreadyVoted ? " Vote updated." : " +1 point."}`,
    fan: store.maskPhone(phoneNumber),
    player,
    points: alreadyVoted ? 0 : 1
  });

  if (io) {
    io.emit("match:event", event);
    emitDashboardState(io);
  }

  return {
    ok: true,
    status: alreadyVoted ? "updated" : "recorded",
    fan,
    player,
    points: alreadyVoted ? 0 : 1,
    message: alreadyVoted ? `Vote updated to ${player.name}.` : `Vote recorded for ${player.name}. You earned 1 point.`
  };
}

async function resolveGoalPredictions(goalEvent, io) {
  const winners = [];
  const misses = [];

  for (const fan of store.listFans()) {
    if (!fan.pendingPrediction) {
      continue;
    }

    const wasCorrect = fan.pendingPrediction.playerName === goalEvent.scorer;
    const predictionResult = {
      ...fan.pendingPrediction,
      resolvedAt: new Date().toISOString(),
      resolvedByEventId: goalEvent.id,
      correct: wasCorrect
    };

    const liveFan = store.getFan(fan.phoneNumber);
    liveFan.predictions[0] = predictionResult;
    liveFan.pendingPrediction = null;

    if (wasCorrect) {
      store.addPoints(fan.phoneNumber, 10, "Correct next-goal prediction");
      winners.push({
        phoneNumber: fan.phoneNumber,
        maskedPhone: store.maskPhone(fan.phoneNumber),
        playerName: goalEvent.scorer,
        points: 10
      });
    } else {
      misses.push({
        phoneNumber: fan.phoneNumber,
        maskedPhone: store.maskPhone(fan.phoneNumber),
        playerName: goalEvent.scorer
      });
    }
  }

  await Promise.all([
    ...winners.map((winner) => rewardService.sendPredictionResult({
      phoneNumber: winner.phoneNumber,
      playerName: goalEvent.scorer,
      correct: true
    })),
    ...misses.map((miss) => rewardService.sendPredictionResult({
      phoneNumber: miss.phoneNumber,
      playerName: goalEvent.scorer,
      correct: false
    }))
  ]);

  if (winners.length) {
    const event = store.addEvent({
      type: "prediction_win",
      title: "Prediction Winners",
      message: `${winners.length} fan${winners.length === 1 ? "" : "s"} called ${goalEvent.scorer}'s goal. +10 points.`,
      minute: goalEvent.minute,
      winners
    });

    if (io) {
      io.emit("match:event", event);
    }
  }

  return {
    winners,
    misses
  };
}

async function applyMatchEvent(event, io) {
  if (event.type === "goal") {
    store.incrementScore(event.team);
    await resolveGoalPredictions(event, io);
    await refreshTrivia();
  }

  if (event.type === "halftime") {
    store.updateMatchState({
      minute: event.minute,
      status: "HALFTIME"
    });
  } else if (event.type === "fulltime") {
    store.updateMatchState({
      minute: event.minute,
      status: "FULLTIME"
    });
  } else {
    store.updateMatchState({
      minute: event.minute,
      status: "LIVE"
    });
  }

  const storedEvent = store.addEvent(event);

  if (io) {
    io.emit("match:event", storedEvent);
    emitDashboardState(io);
  }

  if (event.type === "fulltime") {
    await rewardService.rewardTopFans({
      io
    });
  }

  return {
    event: storedEvent,
    match: store.getMatchState(),
    leaderboard: leaderboard.getLeaderboard()
  };
}

module.exports = {
  applyMatchEvent,
  emitDashboardState,
  formatScore,
  getOrCreateTrivia,
  playerListText,
  recordPrediction,
  recordTriviaAnswer,
  recordVote,
  refreshTrivia
};
