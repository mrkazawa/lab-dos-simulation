// TCP server for testing flood.py

const net = require('net');

const TCP_PORT = 9001; // Custom TCP port

const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    console.log(`Received ${data.length} bytes from ${socket.remoteAddress}:${socket.remotePort}`);
  });
  socket.on('error', (err) => {
    console.error('TCP server error:', err);
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
});
