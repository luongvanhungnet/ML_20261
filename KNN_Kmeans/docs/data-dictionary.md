# Data Dictionary: cybersecurity_attacks Dataset

The platform manages the 25 telemetry attributes defined in `dataset/cybersecurity_attacks.csv` (40,000 records):

| # | Field Name | Type | Ingestion Treatment | Pre-Decision Predictor? | Description |
|---:|---|---|---|---|---|
| 1 | `Timestamp` | DateTime | Parse to UTC datetime | Yes (Time context) | Event timestamp of observed packet. |
| 2 | `Source IP Address` | String | Format validate | Yes | IPv4 address of originating endpoint. |
| 3 | `Destination IP Address` | String | Format validate | Yes | IPv4 address of target endpoint. |
| 4 | `Source Port` | Integer | Range check (1-65535) | Yes | Source TCP/UDP ephemeral port. |
| 5 | `Destination Port` | Integer | Range check (1-65535) | Yes | Target service port (e.g., 80, 443, 22, 53). |
| 6 | `Protocol` | Categorical | Normalise casing | Yes | Transport protocol (TCP, UDP, ICMP). |
| 7 | `Packet Length` | Integer | Value check (>=0) | Yes | Packet size in bytes. |
| 8 | `Packet Type` | Categorical | Strip whitespace | Yes | Packet function (Data vs Control). |
| 9 | `Traffic Type` | Categorical | Strip whitespace | Yes | Application payload protocol (HTTP, DNS, FTP). |
| 10 | `Payload Data` | Text | Masked / Truncated | No (Excluded) | Sensitive raw payload strings. |
| 11 | `Malware Indicators` | String | Sparse nulls allowed | No (Excluded) | IoC detections (~50% null in dataset). |
| 12 | `Anomaly Scores` | Float | Range 0.0 - 100.0 | No (Excluded) | External detector anomaly evaluation. |
| 13 | `Alerts/Warnings` | String | Sparse nulls allowed | No (Excluded) | Existing IDS warning tags (~50% null). |
| 14 | `Attack Type` | Categorical | Target Variable | **Target Class** | Ground-truth labels: DDoS, Malware, Intrusion. |
| 15 | `Attack Signature` | String | Preserved | No (Leakage risk) | Known signature pattern identifiers. |
| 16 | `Action Taken` | Categorical | Preserved | No (Post-event) | Automated firewall action (Blocked, Logged, Ignored). |
| 17 | `Severity Level` | Categorical | High, Medium, Low | No (Post-event) | Impact assessment level. |
| 18 | `User Information` | String | Preserved | No (PII minimized) | Username associated with the traffic source. |
| 19 | `Device Information` | String | Preserved | No | User-agent string / operating system signature. |
| 20 | `Network Segment` | Categorical | Segment A, B, C | Yes | Internal network sub-domain. |
| 21 | `Geo-location Data` | String | City, Region | No | Inferred geographic source coordinates. |
| 22 | `Proxy Information` | String | Sparse nulls allowed | No | Upstream proxy IP address if detected. |
| 23 | `Firewall Logs` | String | Sparse nulls allowed | No | Secondary firewall log presence. |
| 24 | `IDS/IPS Alerts` | String | Sparse nulls allowed | No | Secondary IDS/IPS alert presence. |
| 25 | `Log Source` | Categorical | Server, Firewall | No | Originating telemetry sensor. |
