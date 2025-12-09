# Dockerized Server Overload Simulation with Monitoring

This project demonstrates how to simulate server overload using a flood script and visualize the impact in real time with Grafana, Prometheus, and cAdvisor.

## Quick Start

### 1. Build and Start All Services

From the project root directory, build and start all services (servers, monitoring, and Grafana):

```
docker compose up -d --build
```

This will start:

- TCP and UDP servers (support both CPU-bound and memory-bound attacks)
- cAdvisor (container metrics)
- Prometheus (metrics collection)
- Grafana (visualization)

### 2. Access Grafana Dashboard

- Open your browser and go to: [http://localhost:3000](http://localhost:3000)
- Default login: `admin` / `admin`
- Import the cAdvisor dashboard:
  - Go to the "+" (Create) menu → Import
  - Enter dashboard ID: `14282` and click "Load"
  - Select your Prometheus data source and click "Import"

### 3. Run the Flood Script

In a new terminal, run the flood service to generate DoS attacks on the servers.

**Quick Commands:**

- **TCP Flood (CPU-bound):**
  ```
  docker compose run --rm flood -i tcp-server -p 9001 -m tcp-cpu
  ```
- **UDP Flood (CPU-bound):**
  ```
  docker compose run --rm flood -i udp-server -p 9002 -m udp-cpu
  ```
- **TCP Memory Exhaustion:**
  ```
  docker compose run --rm flood -i tcp-server -p 9001 -m tcp-memory
  ```
- **UDP Memory Exhaustion:**
  ```
  docker compose run --rm flood -i udp-server -p 9002 -m udp-memory
  ```

**Advanced Parameters:**
- `-m`: Attack mode (tcp-cpu, udp-cpu, tcp-memory, udp-memory)
- `-th 5`: Number of concurrent connections (default: 5)
- `-t 50000`: Packets per connection for CPU modes (default: 50000)
- `-s 10`: Payload size in MB per connection for memory modes (default: 10)
- `-d 0.001`: Delay between sends for memory modes (default: 0.001)
- `--duration 300`: Attack duration in seconds (default: 300 = 5 minutes)

### 4. Observe the Impact

- **IMPORTANT**: Open Grafana BEFORE starting the attack
- Go to the "DoS Simulation - Real-time" dashboard
- Start your attack, then **wait 30-40 seconds** for metrics to appear
- Watch the dashboard for spikes in CPU, memory, and network usage on the targeted server container

**Timing Summary:**
- **Prometheus scrapes metrics every 15 seconds** from cAdvisor (with `honor_timestamps: false` to prevent data gaps)
- **Grafana refreshes dashboard every 1 second** for visual updates
- **Metrics use 60-second rate windows** for smooth, stable graphs
- **Result: Graphs update 60-90 seconds after attack starts** (this is normal and expected)

## Notes

- Use the service name (`tcp-server` or `udp-server`) as the host when running the flood script.
- Both servers support CPU-bound (flood) and memory-bound (exhaustion) attacks.
- All attacks automatically stop after 300 seconds (5 minutes) by default (configurable with `--duration`).
- Servers automatically detect attack type using header markers (CPU_ATTACK: or MEM_ATTACK:) sent by the flood client.
- Memory is automatically released 10 seconds after attack traffic stops (for both TCP and UDP).
- **Monitoring Pipeline**:
  - cAdvisor collects container metrics (10s housekeeping interval)
  - Prometheus scrapes cAdvisor every 15 seconds with out-of-order sample ingestion enabled
  - Out-of-order ingestion (5-minute window) prevents data loss from timestamp mismatches
  - Grafana queries Prometheus using 60-second rate windows for smooth graphs
  - Dashboard refreshes every 1 second
  - **Total latency: 60-90 seconds from attack start to graph display**
  - **Resource reservations ensure monitoring stability during attacks** (cAdvisor: 0.5 CPU + 128MB, Prometheus: 0.3 CPU + 256MB)
- The real-time dashboard "DoS Simulation - Real-time" is automatically provisioned at http://localhost:3000
- Stop all services with:
  ```
  docker compose down
  ```
