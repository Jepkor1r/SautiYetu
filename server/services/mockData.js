const teams = {
  home: "Gor Mahia",
  away: "AFC Leopards"
};

const players = [
  { id: "1", name: "Benson Omala", team: "Gor Mahia", position: "Forward" },
  { id: "2", name: "Austin Odhiambo", team: "Gor Mahia", position: "Midfielder" },
  { id: "3", name: "Vincent Oburu", team: "Gor Mahia", position: "Defender" },
  { id: "4", name: "Boniface Muchiri", team: "AFC Leopards", position: "Forward" },
  { id: "5", name: "Elvis Rupia", team: "AFC Leopards", position: "Midfielder" },
  { id: "6", name: "Whyvonne Isuza", team: "AFC Leopards", position: "Goalkeeper" },
  { id: "7", name: "Erisa Ssekisambu", team: "Gor Mahia", position: "Forward" },
  { id: "8", name: "Jesse Were", team: "AFC Leopards", position: "Forward" }
];

const eventTemplates = [
  { type: "goal", weight: 3 },
  { type: "yellow_card", weight: 2 },
  { type: "red_card", weight: 1 },
  { type: "substitution", weight: 2 },
  { type: "halftime", weight: 1, fixed: true },
  { type: "fulltime", weight: 1, fixed: true }
];

const artists = [
  { name: "Sauti Sol", genre: "Afro-pop" },
  { name: "Nyashinski", genre: "Hip-hop/Afrobeat" },
  { name: "Bien", genre: "Afro-fusion" },
  { name: "Khaligraph Jones", genre: "Hip-hop" },
  { name: "Otile Brown", genre: "RnB" },
  { name: "Bahati", genre: "Gospel/Afrobeat" }
];

const triviaFallback = [
  {
    question: "Which club is nicknamed 'K'Ogalo'?",
    choices: ["Gor Mahia", "AFC Leopards", "Tusker FC", "Bandari FC"],
    correctAnswer: "Gor Mahia"
  },
  {
    question: "Which Kenyan artist is known as 'Prezzo wa Bidii'... just kidding, which group sings 'Sura Yako'?",
    choices: ["Sauti Sol", "Nyashinski", "Bien", "Khaligraph Jones"],
    correctAnswer: "Sauti Sol"
  },
  {
    question: "In football, how many players are on the pitch per team?",
    choices: ["9", "10", "11", "12"],
    correctAnswer: "11"
  }
];

const mockEventLog = [
  { time: "00:00", type: "kickoff", detail: `${teams.home} vs ${teams.away} kicks off!` },
  { time: "12:34", type: "goal", team: "Gor Mahia", player: "Benson Omala" },
  { time: "23:10", type: "yellow_card", team: "AFC Leopards", player: "Elvis Rupia" },
  { time: "38:45", type: "goal", team: "AFC Leopards", player: "Jesse Were" },
  { time: "45:00", type: "halftime", detail: "1-1 at the break" },
  { time: "52:20", type: "substitution", team: "Gor Mahia", playerOut: "Vincent Oburu", playerIn: "Erisa Ssekisambu" },
  { time: "67:15", type: "goal", team: "Gor Mahia", player: "Erisa Ssekisambu" },
  { time: "81:00", type: "red_card", team: "AFC Leopards", player: "Whyvonne Isuza" },
  { time: "90:00", type: "fulltime", detail: "Final score: Gor Mahia 2-1 AFC Leopards" }
];

module.exports = {
  teams,
  players,
  eventTemplates,
  artists,
  triviaFallback,
  mockEventLog
};
