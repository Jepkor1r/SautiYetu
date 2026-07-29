const MATCH_ID = "sauti-derby-001";

const players = [
  { id: "1", name: "Amani Otieno", team: "Nairobi Rhythms", role: "Forward" },
  { id: "2", name: "Musa Barasa", team: "Nairobi Rhythms", role: "Midfielder" },
  { id: "3", name: "Kevin Njoroge", team: "Nairobi Rhythms", role: "Winger" },
  { id: "4", name: "Talia Wambui", team: "Mombasa Waves", role: "Forward" },
  { id: "5", name: "Rashid Omondi", team: "Mombasa Waves", role: "Midfielder" },
  { id: "6", name: "Zuri Achieng", team: "Mombasa Waves", role: "Winger" }
];

const matchState = {
  id: MATCH_ID,
  title: "Sauti Derby Live",
  homeTeam: "Nairobi Rhythms",
  awayTeam: "Mombasa Waves",
  venue: "Nyayo National Stadium",
  halftimeAct: "Sol Generation Soundsystem",
  minute: 21,
  status: "LIVE",
  score: {
    home: 1,
    away: 1
  },
  lastUpdatedAt: new Date().toISOString()
};

const fans = new Map();
const events = [
  {
    id: "kickoff",
    type: "kickoff",
    minute: 1,
    title: "Kickoff",
    message: "Sauti Derby is live from Nyayo National Stadium.",
    createdAt: new Date().toISOString()
  }
];
const rewards = [];
const inboundSms = [];

let currentTrivia = null;

function normalizePhone(phoneNumber) {
  return String(phoneNumber || "").trim();
}

function maskPhone(phoneNumber) {
  const phone = normalizePhone(phoneNumber);

  if (phone.length <= 4) {
    return phone || "Unknown fan";
  }

  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

function getFan(phoneNumber) {
  const phone = normalizePhone(phoneNumber);

  if (!fans.has(phone)) {
    fans.set(phone, {
      phoneNumber: phone,
      displayName: `Fan ${phone.slice(-4) || fans.size + 1}`,
      points: 0,
      pendingPrediction: null,
      predictions: [],
      triviaAnswers: {},
      votes: {},
      rewards: [],
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }

  const fan = fans.get(phone);
  fan.lastActiveAt = new Date().toISOString();
  return fan;
}

function listFans() {
  return Array.from(fans.values()).map((fan) => ({
    ...fan,
    maskedPhone: maskPhone(fan.phoneNumber)
  }));
}

function addPoints(phoneNumber, points, reason) {
  const fan = getFan(phoneNumber);
  fan.points += points;
  fan.lastPointReason = reason;
  fan.lastActiveAt = new Date().toISOString();
  return fan;
}

function findPlayer(input) {
  const needle = String(input || "").trim().toLowerCase();

  if (!needle) {
    return null;
  }

  return players.find((player) => {
    return player.id === needle || player.name.toLowerCase() === needle || player.name.toLowerCase().includes(needle);
  }) || null;
}

function addEvent(event) {
  const enriched = {
    id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: event.createdAt || new Date().toISOString(),
    minute: typeof event.minute === "number" ? event.minute : matchState.minute,
    ...event
  };

  events.unshift(enriched);

  if (events.length > 80) {
    events.length = 80;
  }

  return enriched;
}

function getEvents(limit = 40) {
  return events.slice(0, limit);
}

function updateMatchState(updates) {
  Object.assign(matchState, updates, {
    lastUpdatedAt: new Date().toISOString()
  });

  return getMatchState();
}

function incrementScore(team) {
  if (team === matchState.homeTeam) {
    matchState.score.home += 1;
  }

  if (team === matchState.awayTeam) {
    matchState.score.away += 1;
  }

  matchState.lastUpdatedAt = new Date().toISOString();
  return getMatchState();
}

function getMatchState() {
  return {
    ...matchState,
    score: {
      ...matchState.score
    },
    players
  };
}

function setCurrentTrivia(trivia) {
  currentTrivia = trivia;
  return currentTrivia;
}

function getCurrentTrivia() {
  return currentTrivia;
}

function addInboundSms(payload) {
  const sms = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    ...payload
  };

  inboundSms.unshift(sms);

  if (inboundSms.length > 60) {
    inboundSms.length = 60;
  }

  return sms;
}

function addReward(phoneNumber, reward) {
  const fan = getFan(phoneNumber);
  const storedReward = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phoneNumber: fan.phoneNumber,
    awardedAt: new Date().toISOString(),
    ...reward
  };

  fan.rewards.unshift(storedReward);
  rewards.unshift(storedReward);
  return storedReward;
}

function getRewards() {
  return rewards.slice(0, 20);
}

function resetDemo() {
  fans.clear();
  events.length = 0;
  rewards.length = 0;
  inboundSms.length = 0;
  currentTrivia = null;
  matchState.minute = 21;
  matchState.status = "LIVE";
  matchState.score.home = 1;
  matchState.score.away = 1;
  matchState.lastUpdatedAt = new Date().toISOString();
  addEvent({
    id: "kickoff",
    type: "kickoff",
    minute: 1,
    title: "Kickoff",
    message: "Sauti Derby is live from Nyayo National Stadium."
  });
}

module.exports = {
  MATCH_ID,
  addEvent,
  addInboundSms,
  addPoints,
  addReward,
  findPlayer,
  getCurrentTrivia,
  getEvents,
  getFan,
  getMatchState,
  getRewards,
  incrementScore,
  listFans,
  maskPhone,
  normalizePhone,
  players,
  resetDemo,
  setCurrentTrivia,
  updateMatchState
};
