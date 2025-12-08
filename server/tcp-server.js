// TCP server for testing flood.py
// Supports both CPU-bound and memory-bound attacks

const net = require('net');

const TCP_PORT = 9001;
const connections = new Map();
let connectionId = 0;
const MEMORY_ATTACK_THRESHOLD = 4096; // Packets larger than 4KB are considered memory attacks

const tcpServer = net.createServer((socket) => {
  const id = connectionId++;
  const buffer = [];
  let isMemoryAttack = false;
  let headerDetected = false;

  console.log(`[Connection ${id}] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  connections.set(id, { socket, buffer, bytesReceived: 0, packetsReceived: 0, isMemoryAttack: false });

  socket.on('data', (data) => {
    const conn = connections.get(id);
    if (!conn) return;

    conn.packetsReceived++;

    // Detect attack type from header in first packet
    if (!headerDetected) {
      const dataStr = data.toString('utf8', 0, Math.min(20, data.length));
      if (dataStr.startsWith('MEM_ATTACK:')) {
        conn.isMemoryAttack = true;
        headerDetected = true;
        console.log(`[Connection ${id}] Detected MEMORY attack (header-based)`);
        // Remove header from data
        data = data.slice(11);
      } else if (dataStr.startsWith('CPU_ATTACK:')) {
        conn.isMemoryAttack = false;
        headerDetected = true;
        console.log(`[Connection ${id}] Detected CPU attack (header-based)`);
        // Remove header from data
        data = data.slice(11);
      } else {
        // Fallback to size-based detection if no header
        if (data.length > MEMORY_ATTACK_THRESHOLD) {
          conn.isMemoryAttack = true;
          console.log(`[Connection ${id}] Detected MEMORY attack (size-based: ${data.length} bytes)`);
        }
        headerDetected = true;
      }
    }

    if (conn.isMemoryAttack) {
      // Memory attack: buffer all data
      buffer.push(data);
      conn.bytesReceived += data.length;

      // Log every 10 MB received
      if (conn.bytesReceived % (10 * 1024 * 1024) < data.length) {
        const totalMemory = Array.from(connections.values())
          .reduce((sum, c) => sum + c.bytesReceived, 0);
        console.log(`[Connection ${id}] Buffered: ${(conn.bytesReceived / 1024 / 1024).toFixed(2)} MB`);
        console.log(`[Total] ${(totalMemory / 1024 / 1024).toFixed(2)} MB across ${connections.size} connections`);
        console.log(`[Memory] RSS: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB, Heap: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
    } else {
      // CPU attack: just count, don't buffer
      conn.bytesReceived += data.length;

      // Log every 10000 packets
      if (conn.packetsReceived % 10000 === 0) {
        console.log(`[Connection ${id}] CPU attack: ${conn.packetsReceived} packets, ${(conn.bytesReceived / 1024).toFixed(2)} KB total`);
      }
    }
  });

  socket.on('end', () => {
    const conn = connections.get(id);
    if (conn) {
      const wasMem = conn.isMemoryAttack;
      const size = (conn.bytesReceived / 1024 / 1024).toFixed(2);
      console.log(`[Connection ${id}] Client disconnected (${wasMem ? 'Memory' : 'CPU'} attack), released ${size} MB`);
    }
    connections.delete(id);

    // Trigger GC if we just released a memory attack connection
    if (conn?.isMemoryAttack && global.gc) {
      global.gc();
      const mem = process.memoryUsage();
      console.log(`[GC] Triggered after memory attack - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    }
  });

  socket.on('error', (err) => {
    console.error(`[Connection ${id}] Error:`, err.message);
    connections.delete(id);
  });

  socket.on('close', () => {
    if (connections.has(id)) {
      console.log(`[Connection ${id}] Connection closed, cleaning up`);
      connections.delete(id);
    }
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
  console.log(`Supports CPU-bound and memory-bound attacks`);
});

// Log memory stats every 5 seconds
setInterval(() => {
  const mem = process.memoryUsage();
  const totalBuffered = Array.from(connections.values())
    .reduce((sum, conn) => sum + conn.bytesReceived, 0);

  if (connections.size > 0 || totalBuffered > 0) {
    console.log(`[Stats] Connections: ${connections.size}, Buffered: ${(totalBuffered / 1024 / 1024).toFixed(2)} MB, RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB, Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }

  // Clean up closed connections
  const closedConnections = [];
  connections.forEach((conn, id) => {
    if (conn.socket.destroyed) {
      closedConnections.push(id);
    }
  });

  closedConnections.forEach(id => {
    console.log(`[Cleanup] Removing closed connection ${id}`);
    connections.delete(id);
  });
}, 5000);
