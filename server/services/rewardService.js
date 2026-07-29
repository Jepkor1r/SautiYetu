const africastalking = require("../config/africastalking");
const aiService = require("./aiService");
const leaderboard = require("./leaderboard");
const store = require("./store");

const rewardedMatches = new Set();

function rewardAmounts() {
  return [
    Number(process.env.AT_AIRTIME_REWARD_1 || 50),
    Number(process.env.AT_AIRTIME_REWARD_2 || 30),
    Number(process.env.AT_AIRTIME_REWARD_3 || 20)
  ];
}

async function sendSms(to, message) {
  const smsClient = africastalking.getSmsClient();

  if (!smsClient) {
    console.log(`[mock-sms] ${to}: ${message}`);
    return {
      mock: true,
      to,
      message
    };
  }

  const payload = {
    to: [to],
    message
  };

  if (africastalking.smsFrom) {
    payload.from = africastalking.smsFrom;
  }

  return smsClient.send(payload);
}

async function sendAirtime(to, amount) {
  const airtimeClient = africastalking.getAirtimeClient();
  const currencyCode = process.env.AT_AIRTIME_CURRENCY || "KES";

  if (!airtimeClient) {
    console.log(`[mock-airtime] ${to}: ${currencyCode} ${amount}`);
    return {
      mock: true,
      to,
      amount,
      currencyCode
    };
  }

  return airtimeClient.send({
    recipients: [
      {
        phoneNumber: to,
        amount: `${currencyCode} ${amount}`
      }
    ]
  });
}

async function sendActionConfirmation({ phoneNumber, action, outcome }) {
  const confirmation = await aiService.generateConfirmation({
    phoneNumber,
    action,
    outcome
  });

  await sendSms(phoneNumber, confirmation.sms);
  return confirmation;
}

async function sendPredictionResult({ phoneNumber, playerName, correct }) {
  const confirmation = await aiService.generatePredictionResultMessage({
    phoneNumber,
    playerName,
    correct
  });

  await sendSms(phoneNumber, confirmation.sms);
  return confirmation;
}

async function rewardTopFans({ io } = {}) {
  const match = store.getMatchState();

  if (rewardedMatches.has(match.id)) {
    return {
      alreadyRewarded: true,
      winners: leaderboard.getLeaderboard(3),
      recap: null
    };
  }

  rewardedMatches.add(match.id);

  const winners = leaderboard.getLeaderboard(3);
  const amounts = rewardAmounts();
  const awarded = [];

  for (const [index, fan] of winners.entries()) {
    const amount = amounts[index] || amounts[amounts.length - 1];
    const airtimeResult = await sendAirtime(fan.phoneNumber, amount);
    const reward = store.addReward(fan.phoneNumber, {
      matchId: match.id,
      rank: fan.rank,
      points: fan.points,
      amount,
      currencyCode: process.env.AT_AIRTIME_CURRENCY || "KES",
      providerResult: airtimeResult
    });

    awarded.push({
      ...fan,
      reward
    });

    await sendSms(
      fan.phoneNumber,
      `Sauti Yetu: Rank ${fan.rank}! You won ${reward.currencyCode} ${amount} airtime for ${fan.points} pts.`
    );
  }

  const recap = await aiService.generateMatchRecap({
    match,
    events: store.getEvents(),
    topFans: winners
  });

  const allFans = store.listFans();

  await Promise.all(
    allFans.map((fan) => {
      return sendSms(fan.phoneNumber, recap.recap.slice(0, 320));
    })
  );

  const recapEvent = store.addEvent({
    type: "recap",
    title: "AI Match Recap",
    message: recap.recap,
    minute: match.minute
  });

  if (io) {
    io.emit("rewards:issued", awarded);
    io.emit("match:recap", recap);
    io.emit("match:event", recapEvent);
    io.emit("leaderboard:update", leaderboard.getLeaderboard());
  }

  return {
    alreadyRewarded: false,
    winners: awarded,
    recap
  };
}

function resetRewardState() {
  rewardedMatches.clear();
}

module.exports = {
  resetRewardState,
  rewardTopFans,
  sendActionConfirmation,
  sendPredictionResult,
  sendSms
};
