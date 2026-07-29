import { CircleDot, Flag, MessageSquare, Radio, Star, Trophy, Zap } from "lucide-react";

const iconByType = {
  card: Flag,
  fulltime: Trophy,
  goal: Zap,
  halftime: Radio,
  prediction: CircleDot,
  prediction_win: Star,
  recap: MessageSquare,
  trivia: MessageSquare,
  vote: Star
};

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function EventTicker({ events }) {
  return (
    <section className="panel ticker-panel" aria-label="Live event ticker">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Event Ticker</p>
          <h2>Live Feed</h2>
        </div>
        <span className="live-dot">Live</span>
      </div>

      <div className="ticker-list">
        {events.length ? (
          events.map((event) => {
            const Icon = iconByType[event.type] || Radio;

            return (
              <article className="ticker-item" key={event.id}>
                <span className={`event-icon event-${event.type}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <div className="ticker-meta">
                    <strong>{event.title || event.type}</strong>
                    <span>{event.minute ? `${event.minute}'` : formatTime(event.createdAt)}</span>
                  </div>
                  <p>{event.message}</p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty-state">No events yet.</p>
        )}
      </div>
    </section>
  );
}
