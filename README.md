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

In a new terminal, run the flood service to generate load on the server. For example:

- **TCP Flood (CPU-bound):**
  ```
  docker compose run --rm flood -i tcp-server -p 9001 -m tcp-cpu
  ```
- **UDP Flood (CPU-bound):**
  ```
  docker compose run --rm flood -i udp-server -p 9002 -m udp-cpu
  ```
- **TCP Memory Exhaustion (Memory-bound):**
  ```
  docker compose run --rm flood -i tcp-server -p 9001 -m tcp-memory -s 50 -th 10
  ```
- **UDP Memory Exhaustion (Memory-bound):**
  ```
  docker compose run --rm flood -i udp-server -p 9002 -m udp-memory -s 50 -th 10
  ```

**Parameters:**
- `-m`: Attack mode (tcp-cpu, udp-cpu, tcp-memory, udp-memory)
- `-s 50`: Send 50 MB per connection (memory modes only)
- `-th 10`: Use 10 concurrent connections
- `-d 0.001`: Delay between sends in seconds (memory modes only)
- `--duration 300`: Attack duration in seconds (default: 300 = 5 minutes)

### 4. Observe the Impact

- **IMPORTANT**: Open Grafana BEFORE starting the attack
- Go to the "DoS Simulation - Real-time" dashboard
- Start your attack, then **wait 30-40 seconds** for metrics to appear
- Watch the dashboard for spikes in CPU, memory, and network usage on the targeted server container

**Timing Summary:**
- **Prometheus scrapes metrics every 5 seconds** from cAdvisor
- **Grafana refreshes dashboard every 1 second** for visual updates
- **Metrics use 30-second rate windows** for stable calculations
- **Result: Graphs update 30-40 seconds after attack starts** (this is normal and expected)

## Notes

- Use the service name (`tcp-server` or `udp-server`) as the host when running the flood script.
- Both servers support CPU-bound (flood) and memory-bound (exhaustion) attacks.
- All attacks automatically stop after 300 seconds (5 minutes) by default (configurable with `--duration`).
- Servers automatically detect attack type using header markers (CPU_ATTACK: or MEM_ATTACK:) sent by the flood client.
- Memory is automatically released 10 seconds after attack traffic stops (for both TCP and UDP).
- **Monitoring Pipeline**:
  - cAdvisor collects container metrics (1s housekeeping interval)
  - Prometheus scrapes cAdvisor every 5 seconds
  - Grafana queries Prometheus using 30-second rate windows
  - Dashboard refreshes every 1 second
  - **Total latency: 30-40 seconds from attack start to graph display**
- The real-time dashboard "DoS Simulation - Real-time" is automatically provisioned at http://localhost:3000
- Stop all services with:
  ```
  docker compose down
  ```
