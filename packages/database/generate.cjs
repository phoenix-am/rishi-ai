const tty = require('tty');
tty.isatty = () => true;
process.stdout.isTTY = true;
process.stdin.isTTY = true;

process.stdin.setRawMode = () => {};
process.stdin.resume = () => {};
process.stdin.pause = () => {};

const originalWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, fd) {
  originalWrite.apply(process.stdout, arguments);
  const str = chunk.toString();
  if (str.includes('?')) {
    setTimeout(() => {
      process.stdin.emit('data', Buffer.from('\r'));
    }, 100);
  }
};

require('drizzle-kit/bin.cjs');
