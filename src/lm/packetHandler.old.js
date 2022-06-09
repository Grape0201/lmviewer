import { byte2int, byte2hexstr } from './hexfuncs';
import { read2b0b12, read060b00, read370b00, readbb0b00 } from './dataHandler';

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
  isValid = true;

  constructor(d, j) {
    if (d.length < j + 16) {
      throw new PcapParseException(`not enough length for PCAPHeader: ${d.length - j}`);
    }
    this.timestamp = byte2int(d, j + 0, j + 4, true);
    this.timestampm = byte2int(d, j + 4, j + 8, true);
    this.caplen = byte2int(d, j + 8, j + 12, true);
    this.len = byte2int(d, j + 12, j + 16, true);
    this.isValid = true;
    this.check();
  }
  check() {
    console.assert(this.timestamp > 1654059757, { timestamp: this.timestamp });
    console.assert(this.caplen === this.len, { caplen: this.caplen, len: this.len });
    this.isValid = this.isValid && this.timestamp > 1654059757;
    this.isValid = this.isValid && this.caplen === this.len;
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
    console.assert(this.version === 4, 'IPV4Header: invalid version');
    console.assert(this.headerLength < 40, 'IPV4Header: too loog header length');
    console.assert(this.packetLength < 10000, 'IPV4Header: too large packet length');
    console.assert(this.headerLength < this.packetLength, 'IPV4Header: header length < packet length');
    this.isValid = this.isValid && this.version === 4;
    this.isValid = this.isValid && this.headerLength < 40;
    this.isValid = this.isValid && this.packetLength < 10000;
    this.isValid = this.isValid && this.headerLength < this.packetLength;
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
    // if (this.dstPort !== 5991) { return false; }
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

class LordsMobileData {
  d;
  codes;
  remainDataInfo = null;

  constructor(d, data_remained) {
    if (data_remained) {
      console.log(`data remained passed !`);
      this.d = new Uint8Array(d.length + data_remained.length);
      this.d.set(data_remained);
      this.d.set(d, data_remained.length);
    } else {
      this.d = d;
    }
  }

  readCode(timestamp) {
    let i = 0;
    let result = [];
    let hasExtra = true;
    while (hasExtra) {
      const length = byte2int(this.d, i, i + 2, true);
      if (length < 5 || length > 5000) {
        console.assert(false, `data length/index/total = ${length}/${i}/${this.d.length}`);
        break;
      }
      const code = this.d.slice(i + 2, i + 5);
      const codeHexStr = byte2hexstr(code);
      if (i + length > this.d.length) {
        console.warn(`-- code: ${code}, length: ${length} not enough data, needs ${i + length - this.d.length}, passing ...`);
        this.remainDataInfo = {
          startIndex: i,
          dataLength: this.d.length - i,
          dataLengthRequired: length,
        };
        break;
      }

      if (code[0] === 6 && code[1] === 11 && code[2] === 0) {
        // 0x060b00
        console.log(`    # ${codeHexStr}: you got might ranking !`);
        result.push({
          code: codeHexStr,
          timestamp,
          data: read060b00(this.d.slice(i, i + length)),
        });
      } else if (code[0] === 57 && code[1] === 11 && code[2] === 0) {
        // 0x390b00
        console.log(`    # ${codeHexStr}: you got nickname list !`);
      } else if (code[0] === 55 && code[1] === 11 && code[2] === 0) {
        // 0x370b00
        console.log(`    # ${codeHexStr}: you opened gifts at once !`);
        result.push({
          code: codeHexStr,
          timestamp,
          data: read370b00(this.d.slice(i, i + length)),
        });
      } else if (code[0] === 43 && code[1] === 11 && code[2] === 18) {
        // 0x2b0b12
        console.log(`    # ${codeHexStr}: you got gift popup!`);
        result.push({
          code: codeHexStr,
          timestamp,
          data: read2b0b12(this.d.slice(i, i + length)),
        });
      } else if (code[0] === 187 && code[1] === 11 && code[2] === 0) {
        // 0xbb0b00
        console.log(`    # ${codeHexStr}: you got chat !`);
        result.push({
          code: codeHexStr,
          timestamp,
          data: readbb0b00(this.d.slice(i, i + length)),
        });
      } else {
        console.log(`    # ${codeHexStr}: not implemented`);
        // result.push({
        //   code: codeHexStr,
        //   timestamp,
        //   data: null,
        // });
      }
      i += length;
      if (i === this.d.length) {
        break;
      }
      // console.log(`data length/index/total = ${length}/${i}/${this.d.length}`)
      // break;
    }
    // console.log(result);
    return result;
  }
}

class Packet {
  hPcap;
  hIpv4;
  hTcp;
  data;
  isValid = true;
  lmData = null;
  hasData = false;
  indexOfPacketEnds = 0;

  constructor(d, j, data_remained) {
    this.hPcap = new PCAPHeader(d, j);
    this.hIpv4 = new IPV4Header(d, j + PCAPHEADERLENGTH);
    this.indexOfPacketEnds = j + PCAPHEADERLENGTH + this.hIpv4.packetLength;
    this.isValid = this.isValid && this.hPcap.isValid;
    this.isValid = this.isValid && this.hIpv4.isValid;
    console.log(
      `- packet bytes: ${PCAPHEADERLENGTH + this.hIpv4.packetLength}, protocol: ${this.hIpv4.protocol}, srcAddress: ${this.hIpv4.srcAddress}`
    );
    if (!this.hIpv4.is_lm_packet()) {
      return;
    }
    if (this.hIpv4.protocol === 6) {
      // if TCP packet
      this.hTcp = new TCPHeader(d, PCAPHEADERLENGTH + this.hIpv4.headerLength);
      this.isValid = this.isValid && this.hTcp.isValid;
      const header_length = PCAPHEADERLENGTH + this.hIpv4.headerLength + this.hTcp.headerLength;
      if (!this.hTcp.is_from_igg()) {
        return;
      }
      if (this.hIpv4.fragmented) {
        console.log('fragmented !');
      }
      // console.log("total header bytes: ", header_length);
      console.assert(this.hPcap.caplen === this.hIpv4.packetLength);
      console.assert(j + header_length <= this.indexOfPacketEnds);
      if (j + header_length < this.indexOfPacketEnds) {
        // if data exists
        // in case not enough length
        if (d.length < this.indexOfPacketEnds) {
          throw new PcapParseException('not enough length for TCP data');
        }

        this.hasData = true;
        this.data = d.slice(j + header_length, this.indexOfPacketEnds);
        // this.data = new Uint8Array(this.indexOfPacketEnds - (j+header_length) + data_remained.length);
        // if (data_remained.length) {
        //     this.data.set(data_remained);
        // }
        // this.data.set(d.slice(j+header_length, this.indexOfPacketEnds), data_remained.length);

        console.assert(this.data.length >= 5);
        // 1 packet may include 2 or 3 codes.
        // console.assert(this.indexOfPacketEnds - (j+header_length) === byte2int(this.data, 0, 2, true));
        console.log('  tcp data length: ', this.indexOfPacketEnds - (j + header_length));
        // console.log("1st code:    ", this.data.slice(2, 5));
        // console.log(`address: ${this.hIpv4.srcAddress}/${this.hIpv4.dstAddress}`);
        // console.log(`port:    ${this.hTcp.srcPort}/${this.hTcp.dstPort}`);

        this.lmData = new LordsMobileData(this.data, data_remained);
      } else {
        console.log('  no data');
        // console.log(`port:    ${this.hTcp.srcPort}/${this.hTcp.dstPort}`);
      }
    } else {
      console.log(`storange protocol: ${this.hIpv4.protocol}`);
    }
  }
}

function testParsePcap(d) {
  // 最初の方だけ読んでHeaderがきちんと入っているデータか確認する
  const packet = new Packet(d, 0, []);
  return packet.isValid;
}

function parsePcap(d) {
  // 理想的にはdに以下が入ってくる
  // - [PCAP Header]: 16byte
  // - [IPV4 Header]: 20byte
  // - [TPC Header]: 20byte
  // - [TCP data]: ...byte
  //
  // でもこれだけじゃ足りないこともあり、LMExceptionを投げる。
  // その時は次のdと合体させる必要がある。
  console.log('==============================================');
  console.log('total : ', d.length);
  let hasExtra = true;
  let index = 0;
  let data = [];
  let data_remained = [];
  while (hasExtra) {
    try {
      const packet = new Packet(d, index, data_remained);
      console.log(`  -> packet was: ${packet.isValid ? 'valid' : 'invalid'}`);
      if (packet.isValid && packet.lmData) {
        data = [...data, ...packet.lmData.readCode(packet.hPcap.timestamp)];
      }
      if (packet.isValid && packet.lmData && packet.lmData.remainDataInfo) {
        // console.log("passing remaining data...");
        data_remained = packet.lmData.d.slice(packet.lmData.remainDataInfo.startIndex);
      } else if (packet.hTcp && packet.hTcp.is_from_igg()) {
        data_remained = null;
      }
      if (packet.indexOfPacketEnds < d.length) {
        index = packet.indexOfPacketEnds;
        continue;
      }
      console.assert(d.length === packet.indexOfPacketEnds, `total(${d.length}) vs lastIndex(${packet.indexOfPacketEnds})`);
      // if (d.length !== packet.indexOfPacketEnds) {
      //   throw new PcapParseException('Last packet exceeds d.length');
      // }
      break;
    } catch (e) {
      if (e instanceof PcapParseException) {
        console.warn(e);
        return {
          ok: false,
          data: 'PcapDataNotEnough',
        };
      } else {
        console.error('***************************************************');
        console.error(e);
        console.error('***************************************************');
        return {
          ok: false,
          data: e.message,
        };
      }
    }
  }
  return {
    ok: true,
    data,
  };
}

export default parsePcap;
export { testParsePcap };
