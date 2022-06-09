import ByteBuffer from 'byte-buffer';

function byte2int(b, start, end, reverse = false) {
  let buffer = reverse ? new ByteBuffer(b.slice(start, end).reverse()) : new ByteBuffer(b.slice(start, end));

  if (end - start === 4) {
    return buffer.readUnsignedInt();
  } else if (end - start === 2) {
    return buffer.readUnsignedShort();
  } else if (end - start === 1) {
    return buffer.readByte();
  } else {
    return 0;
  }
}

function i2hex(i) {
  return ('0' + i.toString(16)).slice(-2);
}

function byte2hexstr(b) {
  return b.reduce(function (memo, i) {
    return memo + i2hex(i);
  }, '');
}

export { byte2int, byte2hexstr };
