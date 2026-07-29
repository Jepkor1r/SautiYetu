const EventEmitter = require("events");
const store = require("./store");

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildEvent(type, minute) {
  const player = sample(store.players);
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    minute,
    player,
    createdAt: new Date().toISOString()
  };

  if (type === "goal") {
    return {
      ...base,
      title: "Goal",
      team: player.team,
      scorer: player.name,
      message: `${player.name} scores for ${player.team}!`
    };
  }

  if (type === "card") {
    return {
      ...base,
      title: "Card",
      team: player.team,
      message: `${player.name} is booked after a late challenge.`
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
      if (nextMinute >= 90) {
        type = "fulltime";
      } else if (nextMinute >= 45 && !this.halftimeEmitted) {
        type = "halftime";
        this.halftimeEmitted = true;
      } else {
        type = Math.random() > 0.42 ? "goal" : "card";
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
