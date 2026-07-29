import { Award, Crown, Medal } from "lucide-react";

const rankIcon = {
  1: Crown,
  2: Medal,
  3: Award
};

function PredictionCell({ prediction }) {
  if (!prediction) {
    return <span className="muted">Open</span>;
  }

  return (
    <span className="prediction">
      {prediction.playerName}
      <small>{prediction.team}</small>
    </span>
  );
}

export default function LiveLeaderboard({ fans }) {
  return (
    <section className="panel leaderboard-panel" aria-label="Live leaderboard">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2>Top Fans</h2>
        </div>
        <span className="pill">{fans.length} active</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Fan</th>
              <th>Points</th>
              <th>Next Scorer</th>
              <th>MOTM</th>
            </tr>
          </thead>
          <tbody>
            {fans.length ? (
              fans.map((fan) => {
                const Icon = rankIcon[fan.rank];

                return (
                  <tr key={fan.phoneNumber}>
                    <td>
                      <span className={`rank rank-${fan.rank}`}>
                        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                        {fan.rank}
                      </span>
                    </td>
                    <td>
                      <strong>{fan.displayName}</strong>
                      <small>{fan.maskedPhone}</small>
                    </td>
                    <td>
                      <span className="points">{fan.points}</span>
                    </td>
                    <td>
                      <PredictionCell prediction={fan.pendingPrediction} />
                    </td>
                    <td>{fan.lastVote?.playerName || <span className="muted">None</span>}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  Awaiting first fan play.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
