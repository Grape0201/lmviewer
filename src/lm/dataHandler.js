import ByteBuffer from 'byte-buffer';
import { byte2int, byte2hexstr } from './hexfuncs';

function readLmData(d, timestamp) {
  const code = d.slice(2, 5);
  const codeHexStr = byte2hexstr(code);
  if (code[0] === 6 && code[1] === 11 && code[2] === 0) {
    // 0x060b00
    console.log(`    # ${codeHexStr}: you got might ranking !`);
    return {
      code: codeHexStr,
      timestamp,
      data: read060b00(d),
    };
    // } else if (code[0] === 57 && code[1] === 11 && code[2] === 0) {
    //   // 0x390b00
    //   console.log(`    # ${codeHexStr}: you got nickname list !`);
  } else if (code[0] === 55 && code[1] === 11 && code[2] === 0) {
    // 0x370b00
    console.log(`    # ${codeHexStr}: you opened gifts at once !`);
    return {
      code: codeHexStr,
      timestamp,
      data: read370b00(d),
    };
  } else if (code[0] === 43 && code[1] === 11 && code[2] === 18) {
    // 0x2b0b12
    console.log(`    # ${codeHexStr}: you got gift popup!`);
    return {
      code: codeHexStr,
      timestamp,
      data: read2b0b12(d),
    };
  } else if (code[0] === 187 && code[1] === 11 && code[2] === 0) {
    // 0xbb0b00
    console.log(`    # ${codeHexStr}: you got chat !`);
    return {
      code: codeHexStr,
      timestamp,
      data: readbb0b00(d),
    };
  } else {
    console.log(`    # ${codeHexStr}: not implemented`);
    return {
      code: codeHexStr,
      timestamp,
      data: null,
    };
  }
}

function read060b00(d) {
  // packet of might ranking(your guild)
  // - [2 byte]: data length
  // - [3 byte]: 060b00
  // - [1 byte]: unkonwn
  // - [1 byte]: number of player entries
  //   - [48 bytes]: player entry 1
  //   - [48 bytes]: player entry 2
  //   - ...

  // [48 bytes] consists of
  // - [8 byte]: iggid
  // - [2 byte]: avatar_id
  // - [13 byte]: player name
  // - [1 byte]: guild rank in your guild, like r4
  // - [8 byte]: might
  // - [8 byte]: kills
  // - [8 byte]: last seen, unixtime
  const length = byte2int(d, 0, 2, true);
  const num_members = byte2int(d, 6, 7, true);
  if (length !== 7 + 48 * num_members) {
    console.error(`read060b00: invalid length: ${length} vs members: ${num_members}`);
    return;
  }
  const members = [...Array(num_members)].map((_, _m) => {
    const m = 7 + _m * 48;
    const playerName = new ByteBuffer(d.slice(m + 10, m + 23)).readString();
    return {
      iggId: byte2int(d, m, m + 4, true),
      avatarId: byte2int(d, m + 8, m + 10, true),
      playerName,
      guildRank: byte2int(d, m + 23, m + 24),
      might: byte2int(d, m + 24, m + 28, true),
      kills: byte2int(d, m + 32, m + 36, true),
      lastSeen: byte2int(d, m + 40, m + 44, true),
    };
  });
  return members;
}

function read370b00(d) {
  const length = byte2int(d, 0, 2, true);
  console.warn(`NOT implemented yet ! ${length}`);
}

function read2b0b12(d) {
  // packet of might ranking(your guild)
  // - [2 byte]: data length == 22byte
  // - [3 byte]: 2b0b12
  // - [2 byte]: some counter
  // - [2 byte]: item id
  // - [13 byte]: player name
  // const length = byte2int(d, 0, 2, true);
  const playerName = new ByteBuffer(d.slice(9, 22)).readString();
  const result = {
    counter: byte2int(d, 5, 7, true),
    itemId: byte2int(d, 7, 9, true),
    playerName,
  };
  console.log(result);
  return result;
}

function readbb0b00(d) {
  // const length = byte2int(d, 0, 2, true);
  const playerName = new ByteBuffer(d.slice(36, 49)).readString();
  const guildTag = new ByteBuffer(d.slice(50, 53)).readString();
  const comment =
    d[33] === 0
      ? new TextDecoder().decode(d.slice(58))
      : d[33] === 109
      ? 'emoticon'
      : 'entered/exit/kicked/executed by ' + new ByteBuffer(d.slice(58)).readString();
  return {
    // chatPlace: byte2int(d, 5, 8),
    timestamp: byte2int(d, 8, 12, true),
    // 4 zeros
    iggId: byte2int(d, 16, 20, true),
    // 4 zeros
    counter: byte2int(d, 24, 28, true),
    // 4 zeros
    // ??(1 byte)
    commentType: d[33],
    // ??(2 byte)
    playerName,
    // ??(1 byte)
    guildTag,
    color: d[53],
    title: d[54],
    // ??(1 byte)
    commentLength: byte2int(d, 56, 58),
    comment,
  };
}

/*
function read(d) {
    const length = byte2int(d, 0, 2, true);
}
 */
export default readLmData;
