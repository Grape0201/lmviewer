let sampleLog = [
  {
    code: 'bb0b00',
    timestamp: 16000000,
    data: {
      playerName: 'ikarino99',
      guildTag: 'LHA',
      comment: 'hi !',
      timestamp: 12345,
    },
  },
  {
    code: '123456',
    timestamp: 16000001,
    data: null,
  },
  {
    code: '060b00',
    timestamp: 16000002,
    data: [
      { playerName: 'testuser1', guildRank: 4 },
      { playerName: 'testuser2', guildRank: 2 },
      { playerName: 'testuser3', guildRank: 3 },
      { playerName: 'testuser4', guildRank: 1 },
    ],
  },
  {
    code: '2b0b12',
    //         1654177779
    timestamp: 1654200000,
    data: {
      counter: 0,
      itemId: 2507,
      playerName: 'testuser1',
    },
  },
];

export default sampleLog;
