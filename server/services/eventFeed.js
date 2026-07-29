const EventEmitter = require("events");
const store = require("./store");
const mockData = require("./mockData");

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chooseWeightedEventType(templates) {
  const pool = templates.filter((item) => item.weight > 0);
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of pool) {
    rand -= item.weight;

    if (rand <= 0) {
      return item.type;
    }
  }

  return pool.length ? pool[pool.length - 1].type : "goal";
}

function selectEventType(nextMinute, forcedType, halftimeEmitted) {
  if (forcedType) {
    return forcedType;
  }

  if (nextMinute >= 90) {
    return "fulltime";
  }

  if (nextMinute >= 45 && !halftimeEmitted) {
    return "halftime";
  }

  return chooseWeightedEventType(mockData.eventTemplates.filter((item) => !item.fixed));
}

function buildEvent(type, minute) {
  const player = sample(mockData.players);
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    minute,
    player,
    createdAt: new Date().toISOString()
  };

  if (type === "card" || type === "yellow_card" || type === "red_card") {
    const cardType = type === "card" ? (Math.random() > 0.5 ? "yellow_card" : "red_card") : type;
    const cardColor = cardType === "yellow_card" ? "yellow" : "red";

    return {
      ...base,
      title: `${cardColor.charAt(0).toUpperCase()}${cardColor.slice(1)} card`,
      type: cardType,
      team: player.team,
      player: player.name,
      message: `${player.name} receives a ${cardColor} card for a rash challenge.`
    };
  }

  if (type === "goal") {
    return {
      ...base,
      title: "Goal",
      team: player.team,
      scorer: player.name,
      message: `${player.name} scores for ${player.team}!`
    };
  }

  if (type === "substitution") {
    const playerOut = sample(mockData.players);
    const teamPlayers = mockData.players.filter((p) => p.team === playerOut.team && p.name !== playerOut.name);
    const playerIn = teamPlayers.length ? sample(teamPlayers) : sample(mockData.players.filter((p) => p.name !== playerOut.name));

    return {
      ...base,
      title: "Substitution",
      team: playerOut.team,
      playerOut: playerOut.name,
      playerIn: playerIn.name,
      message: `${playerIn.name} replaces ${playerOut.name} for ${playerOut.team}.`
    };
  }

  if (type === "halftime") {
    return {
      ...base,
      title: "Halftime",
      team: player.team,
      message: `Halftime whistle. ${store.getMatchState().halftimeAct} takes over the sound system.`
    };
  }

  return {
    ...base,
    title: "Full-time",
    team: player.team,
    message: `Full-time in the Sauti Derby. ${player.name} gets the last roar from the crowd.`
  };
}

class MatchEventFeed extends EventEmitter {
  constructor({ intervalMs = 10000 } = {}) {
    super();
    this.intervalMs = intervalMs;
    this.timer = null;
    this.halftimeEmitted = false;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.emitRandomEvent();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  emitRandomEvent(forcedType) {
    const match = store.getMatchState();

    if (match.status === "FULLTIME" && !forcedType) {
      this.stop();
      return null;
    }

    const nextMinute = Math.min(90, match.minute + Math.ceil(Math.random() * 6));
    let type = forcedType;

    if (!type) {
      type = selectEventType(nextMinute, type, this.halftimeEmitted);
      if (type === "halftime") {
        this.halftimeEmitted = true;
      }
    }

    const minute = type === "fulltime" ? 90 : nextMinute;
    const event = buildEvent(type, minute);
    this.emit("match:event", event);

    if (type === "fulltime") {
      this.stop();
    }

    return event;
  }
}

function createEventFeed() {
  return new MatchEventFeed({
    intervalMs: Number(process.env.EVENT_INTERVAL_MS || 10000)
  });
}

module.exports = {
  MatchEventFeed,
  createEventFeed
};
