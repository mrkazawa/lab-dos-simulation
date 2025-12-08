// UDP server for testing flood.py
// Supports both CPU-bound and memory-bound attacks

const dgram = require('dgram');

const UDP_PORT = 9002;
const messageBuffer = [];
let totalBytesReceived = 0;
let cpuPacketsReceived = 0;
let lastActivityTime = Date.now();
let attackType = null; // 'cpu' or 'memory'
const IDLE_TIMEOUT = 10000; // 10 seconds of no traffic = cleanup
const MEMORY_ATTACK_THRESHOLD = 4096; // Packets larger than 4KB are considered memory attacks

const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  // Update last activity time
  lastActivityTime = Date.now();

  // Detect attack type from header in first meaningful packet
  if (!attackType) {
    const msgStr = msg.toString('utf8', 0, Math.min(20, msg.length));
    if (msgStr.startsWith('MEM_ATTACK:')) {
      attackType = 'memory';
      console.log('[UDP] Detected MEMORY attack (header-based)');
      return; // Skip the header packet
    } else if (msgStr.startsWith('CPU_ATTACK:')) {
      attackType = 'cpu';
      console.log('[UDP] Detected CPU attack (header-based)');
      // Remove header and process the rest
      msg = msg.slice(11);
      if (msg.length === 0) return;
    } else {
      // Fallback to size-based detection
      attackType = msg.length > MEMORY_ATTACK_THRESHOLD ? 'memory' : 'cpu';
      console.log(`[UDP] Detected ${attackType.toUpperCase()} attack (size-based: ${msg.length} bytes)`);
    }
  }

  if (attackType === 'memory') {
    // Memory attack: buffer the data
    messageBuffer.push(msg);
    totalBytesReceived += msg.length;

    // Log every 10 MB received
    if (totalBytesReceived % (10 * 1024 * 1024) < msg.length) {
      const mem = process.memoryUsage();
      console.log(`[UDP Memory Attack] Received: ${(totalBytesReceived / 1024 / 1024).toFixed(2)} MB total`);
      console.log(`[Memory] RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB, Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }
  } else {
    // CPU attack: just count, don't buffer
    cpuPacketsReceived++;

    // Log every 100k packets
    if (cpuPacketsReceived % 100000 === 0) {
      console.log(`[UDP CPU Attack] Received ${cpuPacketsReceived} packets`);
    }
  }
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
});

udpServer.bind(UDP_PORT, () => {
  console.log(`UDP server listening on port ${UDP_PORT}`);
  console.log(`Supports CPU-bound and memory-bound attacks`);
});

// Log memory stats and clean up after idle period
setInterval(() => {
  const mem = process.memoryUsage();
  const idleTime = Date.now() - lastActivityTime;
  const isIdle = idleTime > IDLE_TIMEOUT;

  if (totalBytesReceived > 0 || cpuPacketsReceived > 0) {
    console.log(`[Stats] Memory buffered: ${(totalBytesReceived / 1024 / 1024).toFixed(2)} MB (${messageBuffer.length} msgs), CPU packets: ${cpuPacketsReceived}, RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB, Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB, Idle: ${(idleTime / 1000).toFixed(0)}s`);
  }

  // Auto-cleanup after 10 seconds of no traffic
  if (isIdle && (messageBuffer.length > 0 || cpuPacketsReceived > 0)) {
    console.log(`[Cleanup] No traffic for ${(idleTime / 1000).toFixed(0)}s, clearing buffers`);

    if (messageBuffer.length > 0) {
      console.log(`  - Clearing ${messageBuffer.length} buffered messages (${(totalBytesReceived / 1024 / 1024).toFixed(2)} MB)`);
      messageBuffer.length = 0;
      totalBytesReceived = 0;
    }

    if (cpuPacketsReceived > 0) {
      console.log(`  - Resetting CPU packet counter: ${cpuPacketsReceived}`);
      cpuPacketsReceived = 0;
    }

    // Reset attack type detection for next session
    attackType = null;

    if (global.gc) {
      global.gc();
      console.log(`[GC] Garbage collection triggered`);
    }

    const memAfter = process.memoryUsage();
    console.log(`[Memory] After cleanup - RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)} MB, Heap: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
}, 5000);
