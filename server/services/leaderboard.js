const store = require("./store");

function getLeaderboard(limit = 20) {
  return store
    .listFans()
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, limit)
    .map((fan, index) => ({
      rank: index + 1,
      phoneNumber: fan.phoneNumber,
      maskedPhone: fan.maskedPhone,
      displayName: fan.displayName,
      points: fan.points,
      pendingPrediction: fan.pendingPrediction,
      lastVote: fan.votes[store.MATCH_ID] || null,
      lastPointReason: fan.lastPointReason || null,
      rewards: fan.rewards
    }));
}

function formatLeaderboardText(limit = 5) {
  const rows = getLeaderboard(limit);

  if (!rows.length) {
    return "No scores yet. Play trivia, vote, or predict the next scorer.";
  }

  return rows.map((fan) => `${fan.rank}. ${fan.maskedPhone} - ${fan.points} pts`).join("\n");
}

module.exports = {
  formatLeaderboardText,
  getLeaderboard
};
