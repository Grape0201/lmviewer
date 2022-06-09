/* eslint-disable no-constant-condition */
import { byte2int } from './hexfuncs';
import readLmData from './dataHandler';

const PCAPHEADERLENGTH = 16;

function PcapParseException(message) {
  this.message = message;
  this.name = 'LMException';
}

function is_private_ipaddress(ips) {
  if (ips[0] === 10) {
    return true;
  }
  if (ips[0] === 172 && 16 <= ips[1] && ips[1] <= 31) {
    return true;
  }
  if (ips[0] === 192 && ips[1] === 168) {
    return true;
  }
  return false;
}

class PCAPHeader {
  timestamp;
  timestampm;
  caplen;
  len;
  isValid;

  constructor(d, j) {
    if (d.length < j + 16) {
      throw new PcapParseException(`not enough length for PCAPHeader: ${d.length - j}`);
    }
    this.timestamp = byte2int(d, j + 0, j + 4, true);
    this.timestampm = byte2int(d, j + 4, j + 8, true);
    this.caplen = byte2int(d, j + 8, j + 12, true);
    this.len = byte2int(d, j + 12, j + 16, true);
    this.check();
  }
  check() {
    // console.assert(this.timestamp > 1654059757, { timestamp: this.timestamp });
    // console.assert(this.caplen === this.len, { caplen: this.caplen, len: this.len });
    this.isValid = this.timestamp > 1654059757 && this.caplen === this.len;
  }
}

class IPV4Header {
  version;
  headerLength;
  packetLength;
  protocol;
  fragmented;
  srcAddress;
  dstAddress;
  isValid = true;

  constructor(d, j) {
    if (d.length < j + 20) {
      throw new PcapParseException(`IPV4Header: not enough length: ${d.length - j}`);
    }
    this.version = Math.floor(d[j] / 16);
    this.headerLength = (d[j] % 16) * 4;
    this.packetLength = byte2int(d, j + 2, j + 4);
    this.fragmented = d[j + 6] !== 64 || d[j + 7] !== 0;
    this.protocol = d[j + 9];
    this.srcAddress = d.slice(j + 12, j + 16);
    this.dstAddress = d.slice(j + 16, j + 20);
    this.check();
  }
  is_lm_packet() {
    if (this.version !== 4) {
      return false;
    }
    if (this.protocol !== 6) {
      return false;
    }
    if (!is_private_ipaddress(this.dstAddress)) {
      return false;
    }
    if (is_private_ipaddress(this.srcAddress)) {
      return false;
    }
    return true;
  }
  check() {
    // console.assert(this.version === 4, 'IPV4Header: invalid version');
    // console.assert(this.headerLength < 40, 'IPV4Header: too loog header length');
    // console.assert(this.packetLength < 10000, 'IPV4Header: too large packet length');
    // console.assert(this.headerLength < this.packetLength, 'IPV4Header: header length < packet length');
    this.isValid = this.isValid && this.version === 4;
    this.isValid = this.isValid && this.headerLength < 40;
    this.isValid = this.isValid && this.packetLength < 10000;
    this.isValid = this.isValid && this.headerLength < this.packetLength;
    this.isValid =
      this.isValid &&
      this.srcAddress[0] < 256 &&
      this.srcAddress[1] < 256 &&
      this.srcAddress[2] < 256 &&
      this.srcAddress[3] < 256 &&
      this.dstAddress[0] < 256 &&
      this.dstAddress[1] < 256 &&
      this.dstAddress[2] < 256 &&
      this.dstAddress[3] < 256;
  }
}

class TCPHeader {
  srcPort;
  dstPort;
  headerLength;
  isValid = true;

  constructor(d, j) {
    if (d.length < j + 20) {
      throw new PcapParseException(`not enough length for TCPHeader: ${d.length - j}`);
    }
    this.srcPort = byte2int(d, j, j + 2);
    this.dstPort = byte2int(d, j + 2, j + 4);
    this.headerLength = Math.floor(d[j + 12] / 16) * 4;
    this.check();
  }
  is_from_igg() {
    if (this.srcPort !== 5991) {
      return false;
    }
    return true;
  }
  check() {
    console.assert(this.headerLength < 40, 'TCPHeader: too loog header length');
    this.isValid = this.isValid && this.headerLength < 40;
  }
}

class Packet {
  d;
  j;
  hPcap;
  hIpv4;
  packetLength;
  isValid;
  hTcp;

  constructor(d, j) {
    this.d = d;
    this.load(j);
  }
  load(j) {
    this.j = j;
    this.hPcap = new PCAPHeader(this.d, j);
    this.hIpv4 = new IPV4Header(this.d, j + PCAPHEADERLENGTH);
    this.packetLength = PCAPHEADERLENGTH + this.hIpv4.packetLength;
    this.isValid = this.hPcap.isValid && this.hIpv4.isValid;
  }
  parseLmLog(lmExtraBuffer) {
    // return {
    //   isFromIgg,
    //   logs,
    //   buf: Uint8Array 残ってしまった分
    // }
    let logs = [];

    // まずは関係ないデータを弾く。弾く場合はlmExtraBufferは使われないのでそのまま戻る。
    if (!this.hIpv4.is_lm_packet()) {
      return { logs, lmExtraBuffer }; // IPV4かつTCPかつ送信元がプライベートIPでない場合はlogなし
    }
    this.hTcp = new TCPHeader(this.d, this.j + PCAPHEADERLENGTH + this.hIpv4.headerLength);
    if (!this.hTcp.is_from_igg()) {
      return { logs, lmExtraBuffer }; // 送信ポートが5991でなければlogなし
    }

    // ここからlmLogのparse
    const iLmBuffStarts = this.j + PCAPHEADERLENGTH + this.hIpv4.headerLength + this.hTcp.headerLength;
    const iLmBuffEnds = this.j + PCAPHEADERLENGTH + this.hIpv4.packetLength;
    if (iLmBuffStarts === iLmBuffEnds) {
      console.log('      no data');
      return { logs, lmExtraBuffer }; // データなしだったとき
    }

    // concat extract buffer
    let lmBuff;
    if (lmExtraBuffer) {
      console.log(`    lmExtraBuffer.length: ${lmExtraBuffer.length}`);
      lmBuff = new Uint8Array(lmExtraBuffer.length + iLmBuffEnds - iLmBuffStarts);
      lmBuff.set(lmExtraBuffer);
      lmBuff.set(this.d.slice(iLmBuffStarts, iLmBuffEnds), lmExtraBuffer.length);
    } else {
      lmBuff = this.d.slice(iLmBuffStarts, iLmBuffEnds);
    }
    // let lmBuff = this.d.slice(iLmBuffStarts, iLmBuffEnds);
    let i = 0;
    while (true) {
      const lmDatalength = byte2int(lmBuff, i, i + 2, true);
      if (lmDatalength < 5) {
        // 短すぎ
        console.error('TOO SHORT !');
        return {
          logs,
          lmExtraBuffer: lmBuff.slice(i), // 残り
        };
      } else if (i + lmDatalength === lmBuff.length) {
        // ちょうど足りて読み終わったので終了
        logs = [...logs, readLmData(lmBuff.slice(i), this.hPcap.timestamp)];
        return { logs, lmExtraBuffer: null };
      } else if (i + lmDatalength > lmBuff.length) {
        // 足りない時は終了
        console.warn(`some lmExtraBuffer remained... ${i + lmDatalength - lmBuff.length}`);
        return {
          logs,
          lmExtraBuffer: lmBuff.slice(i), // 残り
        };
      } else if (lmBuff.length - (i + lmDatalength) < 2) {
        // 余るけどlmDatalengthが読み込めない位置にある場合も終了
        console.warn('some lmExtraBuffer remained...');
        return {
          logs,
          lmExtraBuffer: lmBuff.slice(i), // 残り
        };
      } else if (i + lmDatalength < lmBuff.length) {
        // 余る時はcontinueして次を読みに行く
        logs = [...logs, readLmData(lmBuff.slice(i, i + lmDatalength), this.hPcap.timestamp)];
        i += lmDatalength;
        continue;
      } else {
        console.error('eehhhh ?');
      }
    }
  }
}

function parsePcap(d, lmExtraBuffer) {
  // return {
  //   ok: bool,
  //   logs: [
  //     { code: '060b00', data: }
  //   ],
  //   lmExtraBuffer:
  //   msg: "",
  // }
  console.log('==============================================');
  console.log('total : ', d.length);
  let logs = [];
  let index = 0;
  while (true) {
    const packet = new Packet(d, index);
    if (!packet.isValid) {
      // .pcapの最初の24Byteのごみが含まれる可能性があるので24Byte進めてみる
      let kk = 0;
      for (; index + kk * 8 <= d.length - 56; kk++) {
        packet.load(index + 8 * kk);
        if (packet.isValid) {
          break;
        }
      }

      if (kk === 10) {
        // それでもダメなら諦める
        console.error(`could not load as packet, ${d.slice(index, index + 56)}`);
        return {
          ok: false,
          logs,
          msg: 'invalid data',
        };
      } else {
        // 脱出成功！
        console.log(`  kk was ${kk}`);
        index += kk * 8;
      }
    }
    console.log(`  - packet: ${packet.isValid} ${packet.packetLength} ${packet.hIpv4.srcAddress}`);

    // ここから先はpacketが読み込めた場合
    // - 必要なデータでない可能性もある(TCPではないorスマホからの送信)
    // -
    index += packet.packetLength;
    // console.log(`combined data index: ${index}/${d.length}`);
    if (index === d.length) {
      const result = packet.parseLmLog(lmExtraBuffer);
      return {
        ok: true,
        logs: [...logs, ...result.logs],
        lmExtraBuffer: result.lmExtraBuffer,
      };
    } else if (index < d.length) {
      const result = packet.parseLmLog(lmExtraBuffer);
      logs = [...logs, ...result.logs];
      lmExtraBuffer = result.lmExtraBuffer;
      continue;
    } else if (index > d.length) {
      // パケットとしてデータが足りない
      // 読み込めなかった最初のindexを返す
      return {
        ok: false,
        logs,
        msg: 'no enough data',
        index: index - packet.length,
        lmExtraBuffer,
      };
    }
  }
}

export default parsePcap;
