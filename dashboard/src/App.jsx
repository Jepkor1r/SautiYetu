import { Activity, Gift, RefreshCcw, Send, Smartphone, Trophy, Users, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EventTicker from "./EventTicker.jsx";
import LiveLeaderboard from "./LiveLeaderboard.jsx";
import { API_BASE_URL, createSocket } from "./socket.js";

function scoreLine(match) {
  if (!match) {
    return "--";
  }

  return `${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}`;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [match, setMatch] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [events, setEvents] = useState([]);
  const [recap, setRecap] = useState("");
  const [rewards, setRewards] = useState([]);
  const [connected, setConnected] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      api("/api/match"),
      api("/api/leaderboard"),
      api("/api/events"),
      api("/api/rewards")
    ]).then(([matchData, leaderboardData, eventData, rewardData]) => {
      if (!active) {
        return;
      }

      setMatch(matchData);
      setLeaderboard(leaderboardData);
      setEvents(eventData);
      setRewards(rewardData);
    }).catch((error) => {
      console.error(error);
    });

    const socket = createSocket();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("match:update", setMatch);
    socket.on("leaderboard:update", setLeaderboard);
    socket.on("events:update", setEvents);
    socket.on("match:event", (event) => {
      setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 40));
    });
    socket.on("match:recap", (payload) => setRecap(payload.recap));
    socket.on("rewards:issued", (payload) => {
      setRewards(payload.map((winner) => winner.reward));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  const metrics = useMemo(() => {
    const voteCount = leaderboard.filter((fan) => fan.lastVote).length;

    return {
      fans: leaderboard.length,
      events: events.length,
      votes: voteCount,
      leader: leaderboard[0]?.points || 0
    };
  }, [events.length, leaderboard]);

  async function triggerDemo(type) {
    setBusyAction(type);

    try {
      await api("/api/demo/event", {
        method: "POST",
        body: JSON.stringify({ type })
      });
    } finally {
      setBusyAction("");
    }
  }

  async function resetDemo() {
    setBusyAction("reset");

    try {
      const result = await api("/api/demo/reset", {
        method: "POST",
        body: JSON.stringify({})
      });
      setMatch(result.match);
      setLeaderboard([]);
      setRewards([]);
      setRecap("");
      setEvents([]);
    } finally {
      setBusyAction("");
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brand-mark">SY</span>
            <span>Sauti Yetu</span>
          </div>
          <span className={`connection ${connected ? "online" : "offline"}`}>
            {connected ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
            {connected ? "Socket live" : "Connecting"}
          </span>
        </nav>

        <div className="score-grid">
          <section className="scoreboard" aria-label="Match score">
            <p className="eyebrow">{match?.title || "Sauti Derby Live"}</p>
            <h1>{scoreLine(match)}</h1>
            <div className="score-meta">
              <span>{match?.minute ?? "--"}'</span>
              <span>{match?.status || "Loading"}</span>
              <span>{match?.venue || "Nyayo National Stadium"}</span>
            </div>
          </section>

          <section className="channel-panel" aria-label="Fan channels">
            <div>
              <Smartphone size={22} aria-hidden="true" />
              <strong>USSD</strong>
              <span>*384*000#</span>
            </div>
            <div>
              <Send size={22} aria-hidden="true" />
              <strong>SMS</strong>
              <span>SCORE | PREDICT | TRIVIA | VOTE</span>
            </div>
          </section>
        </div>
      </header>

      <section className="metrics-row" aria-label="Live metrics">
        <Metric icon={Users} label="Fans" value={metrics.fans} />
        <Metric icon={Activity} label="Events" value={metrics.events} />
        <Metric icon={Trophy} label="Leader Pts" value={metrics.leader} />
        <Metric icon={Gift} label="Rewards" value={rewards.length} />
      </section>

      <section className="demo-bar" aria-label="Demo controls">
        <button type="button" onClick={() => triggerDemo("goal")} disabled={Boolean(busyAction)}>
          <Activity size={16} aria-hidden="true" />
          Goal
        </button>
        <button type="button" onClick={() => triggerDemo("card")} disabled={Boolean(busyAction)}>
          <RefreshCcw size={16} aria-hidden="true" />
          Card
        </button>
        <button type="button" onClick={() => triggerDemo("fulltime")} disabled={Boolean(busyAction)}>
          <Trophy size={16} aria-hidden="true" />
          Full-Time
        </button>
        <button type="button" className="ghost-button" onClick={resetDemo} disabled={Boolean(busyAction)}>
          <RefreshCcw size={16} aria-hidden="true" />
          Reset
        </button>
      </section>

      <div className="content-grid">
        <LiveLeaderboard fans={leaderboard} />
        <EventTicker events={events} />
      </div>

      <section className="bottom-grid">
        <article className="panel reward-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Airtime</p>
              <h2>Reward Queue</h2>
            </div>
            <Gift size={22} aria-hidden="true" />
          </div>
          {rewards.length ? (
            <div className="reward-list">
              {rewards.map((reward) => (
                <div className="reward-item" key={reward.id}>
                  <span>Rank {reward.rank}</span>
                  <strong>
                    {reward.currencyCode} {reward.amount}
                  </strong>
                  <small>{reward.phoneNumber}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No rewards issued yet.</p>
          )}
        </article>

        <article className="panel recap-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Claude Recap</p>
              <h2>Full-Time Story</h2>
            </div>
            <Activity size={22} aria-hidden="true" />
          </div>
          <p>{recap || "Awaiting full-time recap."}</p>
        </article>
      </section>
    </main>
  );
}
