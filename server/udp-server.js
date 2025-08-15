// UDP server for testing flood.py

const dgram = require('dgram');

const UDP_PORT = 9002; // Custom UDP port

const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
  console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
});

udpServer.bind(UDP_PORT, () => {
  console.log(`UDP server listening on port ${UDP_PORT}`);
});
