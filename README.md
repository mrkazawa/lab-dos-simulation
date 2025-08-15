# Dockerized Server Overload Simulation with Monitoring

This project demonstrates how to simulate server overload using a flood script and visualize the impact in real time with Grafana, Prometheus, and cAdvisor.

## Quick Start

### 1. Build and Start All Services

From the project root directory, build and start all services (servers, monitoring, and Grafana):

```
docker compose up -d --build
```

This will start:

- TCP and UDP servers
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

- **TCP Flood:**
  ```
  docker compose run flood -i tcp-server -p 9001 -c n
  ```
- **UDP Flood:**
  ```
  docker compose run flood -i udp-server -p 9002 -c y
  ```

You can adjust the arguments as needed. All flood.py options are supported.

### 4. Observe the Impact

- Watch the Grafana dashboard for spikes in CPU, memory, and network usage on the targeted server container.
- This will demonstrate how the server is overwhelmed under load.

## Notes

- Use the service name (`tcp-server` or `udp-server`) as the host when running the flood script.
- cAdvisor provides container-level metrics; no custom /metrics endpoint is needed in the servers.
- Stop all services with:
  ```
  docker compose down
  ```
