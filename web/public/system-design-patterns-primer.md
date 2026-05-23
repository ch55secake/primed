---
type: interview-prep
---

# System Design Patterns Primer — 150 Questions

> Pass 2 added (a) an **AI / LLM Infrastructure** section reflecting the 2026 reality that ~50% of staff-level system design rounds now include an ML-adjacent question, (b) a **Modern Frameworks** section (Kafka KRaft, Flink, Temporal), (c) Brooker-specific takes on backoff, jitter, and load shedding, and (d) gap-fill `Q…b` insertions across sections.

Senior/staff system design interview prep. Patterns and components — not worked examples (see "Example Questions" for those). The aim: build a toolkit so any prompt becomes *"I recognise this — it's patterns X, Y, Z composed in this order."* Each answer is 2–6 sentences shaped for an interview: failure modes, tradeoffs, "what fails first" — not surface trivia.

1. [[#Foundational Mental Models]]
2. [[#Networking & Protocols]]
3. [[#Load Balancing & Traffic Management]]
4. [[#Data Storage Foundations]]
5. [[#Database Scaling Patterns]]
6. [[#Caching]]
7. [[#CAP, PACELC & Consistency Models]]
8. [[#Distributed Consensus & Coordination]]
9. [[#Messaging, Queues & Streaming]]
10. [[#Resilience & Failure Patterns]]
11. [[#Asynchronous & Event-Driven Patterns]]
12. [[#Data Modelling & Aggregation Patterns]]
13. [[#Search]]
14. [[#Geospatial, Time-Series & Real-Time]]
15. [[#Observability, SLOs & Operations]]
16. [[#Security at the System Level]]
17. [[#Cost & Capacity Engineering]]
18. [[#Data Structures for System Design]]
19. [[#Anti-patterns & Smells]]
20. [[#Tradeoff Vocabulary]]
21. [[#AI & LLM Infrastructure]]
22. [[#Modern Frameworks: Kafka, Flink, Temporal]]

---

## Foundational Mental Models

### Q1. Give me the back-of-envelope latency numbers every senior engineer should have memorised.

L1 cache ~1 ns · L2 ~4 ns · main memory ~100 ns · SSD random read ~16 µs · same-DC network RTT ~0.5 ms · cross-region RTT ~50–150 ms · HDD seek ~5 ms (mostly historical). These decide whether a design is sane in 30 seconds — "we'll do a sync cross-region call on the hot path" with 100ms RTT is a non-starter for a p99 SLO of 50ms. Internalise them; if you have to look them up mid-interview, you've already lost ground.

### Q2. How do you estimate capacity in an interview?

(1) Restate the user count and per-user activity. (2) Convert to QPS — divide by seconds (86,400/day, ~2.6M/month). (3) Estimate per-request data size → bandwidth. (4) Multiply QPS × bytes → bytes/sec. (5) Storage: items/year × bytes. (6) Apply **peak = 2-4× average** for daily cycles. (7) Design for **3-5× peak** so launch traffic, viral spikes, and failover don't break you. Write every assumption on the whiteboard — interviewers care about the *method* more than the exact number.

### Q3. Reliability vs availability vs scalability vs performance — define each.

**Reliability**: continues working in the presence of faults (you don't lose data even if a disk dies). **Availability**: % of time responding to requests (different — a system can be available but unreliable, or vice versa). **Scalability**: capacity grows with added resources without redesign. **Performance**: latency (per-request time, usually percentiles) and throughput (work per second). Confusing these is a junior signal; using them precisely earns trust.

### Q4. p50 vs p99 vs p99.9 — why does the tail matter so much at scale?

p50 is a lie at scale because it averages over working users; it doesn't reflect the experience of any actual person. p99 means **1% of requests are slow** — if a user makes 100 requests in a session, almost all will hit at least one bad one. **p99.9** is what you actually see if any single request fans out to many backends — fanout *amplifies* the tail because the slowest sub-call dominates the whole. Design for fan-in or use hedged requests; never report just p50.

### Q5. State Little's Law and give me a sizing example.

`L = λ × W` — in-flight items = arrival rate × service time. If you serve 1000 RPS at 50ms each, you have **50 concurrent in-flight requests** on average. Drives thread pool sizing (must handle at least L concurrent), connection pool sizing, queue depth. Production safety factor: provision for 3-5× the steady-state L to absorb bursts and slower-than-average sub-calls. The corollary: if you halve service time, you halve in-flight at the same load — *or* you can serve double the load with the same fleet.

### Q6. USE vs RED vs the Four Golden Signals — when do you use each?

**USE** (Utilization, Saturation, Errors): Brendan Gregg's framework for **resources** — CPU, disk, network, memory. "Is the resource exhausted?". **RED** (Rate, Errors, Duration): for **services** — what's the request rate, error rate, and latency distribution. **Four Golden Signals** (Latency, Traffic, Errors, Saturation): Google SRE's blend, the most universal. Pick: USE for hardware/system-level dashboards, RED for per-service dashboards, Golden Signals for SLOs and alerting.

### Q7. Senior interview angle: p50 is 5ms but p99 is 800ms. What's going on?

Six suspects: (1) **GC pause** — bursty, kills the tail. (2) **Lock contention** — most requests pass cheaply, occasional ones queue. (3) **Cold cache** on some keys — most hot, occasional cold trip to disk. (4) **Tail-of-fanout** — request makes 10 parallel sub-calls; p99 of the whole is p99.9 of the sub-call. (5) **Head-of-line blocking** in shared resources (HTTP/1.1 pipeline, single-threaded Redis). (6) **Noisy neighbour** in shared infra. Diagnose via flame graphs (`async-profiler` / `dotnet-trace`), tracing (per-request span breakdown), and percentile breakdown by code path.

---

## Networking & Protocols

### Q8. Walk me through what happens at each layer when you make an HTTPS request.

**L3 (IP)**: routing your packet to the destination IP. **L4 (TCP)**: 3-way handshake (1 RTT) establishing the connection, with congestion control (Cubic, BBR) shaping throughput. **TLS**: handshake — 2 RTT on TLS 1.2, 1 RTT on TLS 1.3, **0 RTT with session resumption**. **L7 (HTTP)**: request/response semantics on top. Each layer adds overhead; the senior signal is knowing which RTTs are unavoidable vs cacheable.

### Q9. HTTP/1.1 vs HTTP/2 vs HTTP/3 — what's the actual difference?

**HTTP/1.1**: text protocol, **head-of-line blocking** per connection (request 2 waits for request 1's response); workaround is multiple parallel connections (~6 per origin). **HTTP/2**: binary framing, **multiplexing many streams on one TCP connection**, header compression (HPACK), server push (mostly deprecated). Still suffers **TCP head-of-line blocking** — one lost packet stalls all streams. **HTTP/3**: runs on QUIC (UDP-based), **independent streams** (one lost packet only stalls its own stream), 0-RTT, and **connection migration** (survives client IP change — phone switching from WiFi to LTE without reconnecting). Default for new edge services.

### Q10. When do you pick gRPC over REST?

**Internally** (service-to-service): gRPC for typed contracts (Protobuf), streaming (server/client/bidi), HTTP/2 efficiency, lower marshaling cost. **Externally** (public APIs): REST for browser/curl/SDK ecosystem; gRPC needs gRPC-Web shimming for browsers. Other tradeoffs: gRPC is harder to debug (binary), harder to cache via CDN, harder to inspect with browser devtools. Rule of thumb: REST at the public edge, gRPC inside the service mesh.

### Q11. What is anycast, and why is it the backbone of modern CDNs?

The same IP is advertised from multiple POPs via BGP; routers send each user's packets to the topologically nearest POP. The user gets low latency without needing GeoDNS, and a POP failure is invisible — BGP reconverges. Used by Cloudflare, Google DNS (`8.8.8.8`), AWS Global Accelerator. Compared to **GeoDNS**: anycast is more responsive to network conditions, GeoDNS gets you DNS-resolution-time location targeting. Modern stacks often use both.

### Q12. WebSockets vs Server-Sent Events vs Long Polling — what's the modern call?

**WebSockets**: full-duplex over an upgraded HTTP/1.1 connection. Use for genuinely bidirectional traffic (chat, collaboration, gaming). Requires sticky load balancing (the connection is stateful), doesn't multiplex over HTTP/2. **Server-Sent Events (SSE)**: unidirectional server→client, HTTP-friendly, browser-native auto-reconnect via `EventSource`. **Underrated** — when you only need server-push (notifications, live data feeds), SSE is simpler and more reliable than WebSockets. **Long polling**: fallback when neither is viable; high overhead from reconnections.

### Q13. CDN cache headers — what's the modern set you should know?

`Cache-Control: max-age=N` (browser/intermediate cache), `s-maxage=N` (CDN-specific, overrides max-age for shared caches), `stale-while-revalidate=N` (serve stale up to N seconds while fetching fresh — *killer feature* for latency), `stale-if-error=N` (serve stale on origin error — resilience win), `private`/`public`, `no-store`. The right pattern for most user-facing content: `s-maxage=60, stale-while-revalidate=600` — cache aggressively, hide origin latency.

### Q14. Senior interview angle: a user from one country reports "the site is slow" — what do you check?

Order: (1) **DNS resolution** — slow or wrong record? `dig` + `mtr`. (2) **TLS handshake** — slow handshake = certificate chain bloat, lack of session resumption. (3) **Network path** — packet loss / high RTT to nearest POP. (4) **CDN coverage** — is there a POP in their region? (5) **MTU / fragmentation** — uncommon but happens with VPNs. (6) **Application latency** at the regional origin. (7) **JS bundle size** — if a perf regression, the largest payload often dominates. Tools: WebPageTest from the user's region, Chrome DevTools network tab, `mtr`, real-user monitoring (RUM).

---

## Load Balancing & Traffic Management

### Q15. L4 vs L7 load balancers — when do you pick each?

**L4 (transport)**: HAProxy in TCP mode, AWS NLB. Doesn't inspect the payload — just forwards TCP/UDP. Faster, supports any protocol (PostgreSQL, Redis, custom binary). Can't route by URL path, can't terminate TLS (unless using SNI-based passthrough). **L7 (application)**: NGINX, Envoy, AWS ALB. Inspects HTTP — routes by path/header/host, terminates TLS, applies per-route retries/timeouts/rate-limits/headers. Slower per request, more memory. Use L4 for raw TCP services or when latency is critical; L7 for HTTP services where routing/observability/policy matters.

### Q16. Walk me through consistent hashing and its production variants.

Hash both nodes and keys onto a ring (typically 0 to 2^32). To find a key's owner, walk the ring clockwise from the key's hash to the first node hash. Adding/removing a node moves only `1/N` of keys, vs `~all` keys for simple modulo-based hashing. **Virtual nodes (vnodes)**: each physical node owns hundreds of points on the ring; smooths distribution and isolates the impact of any single node change. Used by Cassandra, DynamoDB, Discord's message routing, Riak. Compared to **rendezvous hashing**: no ring, no vnodes, just `argmax(hash(node, key))` per key — simpler, sometimes preferred for small N.

### Q17. What's "power of two choices" and why does it work so well?

Algorithm: pick 2 backends at random, route to whichever has fewer in-flight requests. Surprisingly effective — gets you the load balancing of "least-connections" without the O(N) cost of inspecting every backend. Mathematically, the maximum load on any backend is O(log log N) instead of O(log N) for pure random. Used by NGINX (`least_conn` variants), Envoy, Finagle. The senior signal: knowing why it's effective without falling for "just route to the actual least-loaded" (which scales poorly and reacts badly to stale data).

### Q18. Active vs passive health checks — and what's outlier detection?

**Active**: load balancer periodically probes `/health` on each backend; remove failing ones. Predictable, but probe interval = staleness window. **Passive**: observe real traffic — count 5xx responses, latency violations, connection failures. Faster to detect issues, no extra probe load. **Outlier detection** (Envoy): a hybrid — passively counts consecutive errors, ejects a backend for an exponential cool-off, then probes to bring it back. The modern default in service meshes; combines reactivity with self-healing.

### Q19. Service mesh vs API gateway — what's the distinction?

**API Gateway** (Kong, Apigee, AWS API Gateway, Zuplo): **north-south** traffic (external → internal). Authentication, rate limiting, request transformation, schema validation, analytics, monetisation. Sits at the edge. **Service mesh** (Istio, Linkerd, Consul Connect): **east-west** traffic (service ↔ service). Sidecar Envoy proxies on every pod; gives you mTLS, retries, timeouts, circuit breaking, observability without app code changes. Both can coexist — gateway at the edge, mesh inside. Don't conflate.

### Q20. Senior interview angle: the load balancer evenly distributes connections, but one backend is melting. What's going on?

Likely **long-lived connections + recent deploys** = uneven steady-state. When backend A restarts, its connections move to B and C; A comes back with zero connections; new clients connect to A (less loaded by the LB's connection count metric), but A's actual load (work per connection) is much higher because new clients tend to be active. Fixes: **least-connections** with active-connection tracking, **consistent hashing** for partitioned work, **connection draining** with re-balancing on reconnect, or **L7 LB** that load-balances per request, not per connection.

---

## Data Storage Foundations

### Q21. B-tree vs LSM — what's the practical difference and when do you pick each?

**B-tree** (Postgres, MySQL InnoDB): in-place updates, balanced tree of pages, **optimised for reads** — point lookups are 3-4 page hits. Write goes through WAL first, then to the page. **LSM-tree** (RocksDB, Cassandra, ScyllaDB, BigTable): append-only memtables flushed to immutable sorted SSTables on disk, periodic **compaction** merges levels. **Write-optimised** — sequential writes, no in-place updates. Reads can hit multiple SSTables (read amplification), mitigated by bloom filters and tiered/leveled compaction. Pick B-tree for OLTP read-heavy; LSM for write-heavy time-series or high-ingest workloads.

### Q22. When would you reach for Cassandra over Postgres?

The Cassandra fit: (1) **write rate** exceeds what a single Postgres primary can handle (~100k writes/sec ceiling, less in practice). (2) **multi-region active-active** with last-writer-wins or app-merged conflicts. (3) **billion-row tables** with simple access patterns (key-based lookups, time-range scans). (4) **bounded query patterns** — Cassandra is unforgiving about ad-hoc queries; you must design schema per query upfront. Postgres is the right answer surprisingly often — modern Postgres + partitioning + read replicas handles up to TB-scale and tens of thousands of writes per second.

### Q23. Column-oriented storage — why is it so good for analytics?

A column store (ClickHouse, DuckDB, Snowflake, BigQuery, Parquet on S3) stores all values for one column contiguously, not all columns for one row. Wins: (1) **compression** — adjacent values are similar (same type, often same value range), compression ratios 5-20×. (2) **vectorised execution** — operate on column chunks with SIMD. (3) **scan only the columns you need** — `SELECT sum(revenue) FROM events` reads 1/100 of the data on a wide table. Loses: **point row updates** — every column file changes, expensive. The rule: row stores for OLTP, column stores for OLAP.

### Q24. S3 / object storage — what's important to know about it?

11 nines of durability (data loss is essentially impossible), infinite scale, **strongly consistent reads** (post-2020 — was eventual historically), high per-request latency (~tens of ms), and *cheap* relative to block storage. Lifecycle tiers: Standard → Standard-IA → Glacier Flexible → Glacier Deep Archive (retrieval cost vs storage cost tradeoff). Don't use as a database — high latency, no atomic multi-object operations. Do use for: blob storage, data lakes, backups, presigned-upload patterns where clients upload directly bypassing your app server.

### Q25. Senior interview angle: when is "just put everything in Postgres" the right answer?

Way more often than candidates think. Modern Postgres scales to: ~10-50 TB total data, ~10k writes/sec sustained on a well-tuned box, ~100k reads/sec with read replicas, JSON + full-text + GIS + vectors all in one engine. The "we need a separate DB for X" story is usually wrong below 1 TB scale. Defensible threshold: stick with Postgres until you hit a *specific* limit (column-store analytics, sub-ms read latency at scale, billion-key KV, write rate above primary capacity); then pick the right specialist tool for that specific workload, not as a wholesale replacement.

---

## Database Scaling Patterns

### Q26. Walk me through the scaling ladder — what do you try in order?

(1) **Vertical scaling**: bigger box. Modern instances: 24 TB RAM, 200+ cores. The right first step. (2) **Read replicas**: async streaming replication; reads to replicas, writes to primary. Watch for replication lag. (3) **Query optimisation**: missing indexes, bad plans, ORM N+1s. (4) **Caching**: Redis/Memcached for hot reads. (5) **Functional partitioning** (federation): split databases by feature (users DB, orders DB). (6) **Table partitioning**: range/hash partitions on hot tables. (7) **Sharding**: horizontal partitioning across multiple primaries. **Each step is a one-way door** — try them in order, never sharded before exhausting earlier rungs.

### Q27. Read replicas: what bug pattern do they introduce?

**Replication lag** — async replicas may be milliseconds to minutes behind the primary. Bug: user posts a comment (write to primary), navigates to their profile (read from replica), doesn't see their comment yet → confused, retries. Fixes in increasing complexity: (1) **read-your-writes routing**: after a write, route subsequent reads from the same session to the primary for N seconds. (2) **session pinning** via sticky cookies. (3) **causal consistency tokens**: track LSN/timestamp and wait for replica to catch up before reading.

### Q28. Sharding strategies — and what's the killer flaw of each?

**Hash sharding**: hash the key, mod by shard count. Even distribution. **Flaw**: range queries hit every shard; resharding moves nearly all keys (mitigated by consistent hashing). **Range sharding**: shards own contiguous key ranges. Easy range scans. **Flaw**: hotspots when data is naturally skewed (recent timestamps all hit the last shard). **Lookup service (directory)**: map keys to shards via a separate metadata service. Flexible, supports arbitrary policies. **Flaw**: the directory is a SPOF and a coordination point. **Geographic/tenant**: shard by region or customer. Natural for compliance + multi-region. **Flaw**: skewed tenants ("whales") concentrate load.

### Q29. The whale problem — 1% of users have 90% of the data. What do you do?

Pure hash sharding gives every shard ~equal *key count* but wildly unequal *data and load*. Mitigations: (1) **secondary partitioning of whales** — split a single hot user across multiple sub-shards on a different dimension (time, conversation, region). (2) **dedicated whale shards** — top-N users get their own infrastructure with bespoke tuning. (3) **per-tenant capacity isolation** so a whale's traffic can't starve normal users (bulkheads). (4) **storage tiering** — recent/active data on hot infra, historical on cheaper storage. The senior signal: knowing the question isn't "how do I distribute evenly" but "how do I isolate impact".

### Q30. Quorum reads/writes — explain the math.

`N` replicas total, `W` ack writes before commit, `R` replicas read from. **W + R > N** guarantees that any read intersects with the latest write — strong consistency in the absence of conflicts. Typical: `N=3, W=2, R=2` (tolerate one failure, strongly consistent). `W=3, R=1` gives fast reads, slow writes. `W=1, R=1` gives fast everything but no consistency guarantees. The 3-replica config is the standard sweet spot for DynamoDB / Cassandra-style systems; 5 replicas (`N=5, W=3, R=3`) for higher fault tolerance.

### Q31. Single-leader vs multi-leader vs leaderless — when do you reach for each?

**Single-leader** (Postgres, MySQL, MongoDB): simple consistency story (one source of truth), one place to apply schema migrations. Failover is the operational complexity. Default for most systems. **Multi-leader**: multi-region active-active, conflict resolution via LWW (last-write-wins, lossy) or CRDTs (mergeable) or app-level merge. Use when you genuinely need writes in multiple regions and can tolerate conflicts. **Leaderless / Dynamo-style** (Cassandra, DynamoDB, Riak): every node accepts writes; quorum semantics; read repair / hinted handoff / anti-entropy for healing. Use for write-heavy multi-region with mergeable data models.

### Q32. Senior interview angle: how do you handle 30 seconds of replication lag?

Three user-visible bugs to think about: (1) **Vanished writes on next read** — user just wrote, replica doesn't have it, UI shows old state. Fix: read-your-writes routing. (2) **Double-charge if retried** — user clicks "pay", times out, retries, replica didn't show the first attempt's record, second attempt also charges. Fix: idempotency keys + read from primary for safety-critical reads. (3) **Stale UI** — dashboards show old data. Fix: explicit "last updated 30s ago" UI cue or push updates via WebSocket/SSE. Long-term: investigate why lag is 30s (under-provisioned replica, slow disk, network saturation), don't paper over.

---

## Caching

### Q33. Cache-aside vs read-through vs write-through vs write-back — what's the practical difference?

**Cache-aside (lazy)**: app reads cache → on miss, reads DB → populates cache. Most common, app controls the contract. Race condition: two writers updating + invalidating in interleaved order. **Read-through**: cache fronts DB, knows how to load on miss. Cleaner code, hides DB. Harder to debug (cache is now a service). **Write-through**: write to cache *and* DB synchronously. Always-fresh cache, slower writes. **Write-back (write-behind)**: write to cache, async to DB. Fastest writes, **data loss risk on cache failure** before flush. The default for most apps: cache-aside with TTL + explicit invalidation on write.

### Q34. What's a cache stampede and how do you prevent it?

A hot key expires at time T. Between T and T+δ, 1000 concurrent requests miss the cache → all 1000 hit the DB → DB melts. Mitigations: (1) **Single-flight / per-key locking**: first miss acquires a lock, fetches, populates; concurrent misses wait on the lock and get the populated value. (2) **Stale-while-revalidate**: serve the expired value, kick off a single background refresh. (3) **XFetch probabilistic early refresh**: probabilistically refresh *before* expiry based on how recently the value was fetched and its TTL — smooths the cliff. (4) **Cache warming** on key creation. Most teams under-engineer this until it bites them.

### Q35. The hot key problem — when one key gets 100× the load of others.

A single key (celebrity user, viral post, "/" endpoint) gets so many requests that one cache shard maxes out CPU. Mitigations: (1) **Client-side replication of hot keys** — clients keep a small local LRU; reduces remote calls. (2) **Sharded counters**: split a single counter key into N sub-keys, sum on read. (3) **Replicate hot keys across all cache shards** — every shard can serve the read; only one updates. (4) **Broadcast tree** — for very hot writes, propagate to all nodes via gossip. (5) **CDN cache the upstream** — if it's a read-only resource, push it to the edge.

### Q36. Eviction policies — when is W-TinyLFU the right answer over LRU?

**LRU** (least recently used): simple, but admits *every* miss into the cache, evicting potentially-still-useful entries. Vulnerable to scans (a one-time large scan wipes the working set). **LFU** (least frequently used): better for skewed access patterns, but slow to adapt to changing workloads. **W-TinyLFU** (Caffeine's algorithm): combines a tiny "admission window" with a frequency sketch — admits new keys only if they're predicted to be hotter than what they'd evict. Empirically beats both LRU and LFU on most real workloads. The senior signal: knowing about Caffeine and that its replacement isn't simply LRU.

### Q37. What's special about Redis that breaks naive scaling assumptions?

(1) **Single-threaded data plane** — one slow command (`KEYS *`, `LRANGE 0 -1` on a million-element list) blocks every other client. Use SCAN, paginate, never hold a single thread for long. (2) **Pipelining** — batch commands without waiting for replies; orders-of-magnitude throughput improvement. (3) **Lua scripts** — atomic multi-step server-side ops; Redis blocks while the script runs. (4) **Cluster mode**: 16,384 hash slots; multi-key commands require all keys in the same slot (use `{hashtag}` syntax). (5) **Persistence**: RDB snapshots are point-in-time and forkful; AOF is append-only fsync'd. Different durability trade-offs.

### Q38. Senior interview angle: cache hit rate dropped from 95% to 70% after a deploy. Triage.

Suspects in order: (1) **Key format change** — new deploy generates different cache keys → entire cache cold. Diff key formats across deploys. (2) **TTL change** — shorter TTL → more turnover. Check config drift. (3) **Deploy invalidation strategy** — if the deploy explicitly invalidated, that's expected; design for warm-up. (4) **Working set grew** — new feature adds new keys, evicts hot ones. Right answer is larger cache, not more aggressive eviction. (5) **Bug**: cache key includes a request-scoped value (request-id, timestamp) → 100% miss. The most common one — log a hash of the cache key and the value source per request to spot it.

---

## CAP, PACELC & Consistency Models

### Q39. CAP — explain it precisely.

Under network **partition** (P), a distributed system must choose between **consistency** (C — every read sees the latest write) and **availability** (A — every request gets a non-error response). Most popular misrepresentation: "you must pick 2 of 3." Wrong — CAP only applies during partitions; outside partitions, you can have both C and A. The real choice is: *when partitioned, do I refuse writes (CP, like Spanner) or accept potentially-stale reads/writes (AP, like Cassandra)?* And outside partitions, **PACELC** captures the everyday tradeoff.

### Q40. PACELC — and why is it more useful than CAP day-to-day?

PACELC extends CAP: "if **P**artition then **A** or **C**, **E**lse **L** or **C**." The "else" clause is the everyday distributed-systems tradeoff: even with no partition, you choose between **latency** (return fast from a local replica) and **consistency** (wait for global agreement). PA/EL systems (Cassandra, DynamoDB): available under partition, low-latency otherwise. PC/EC systems (Spanner, HBase): consistent always, even at latency cost. Most apps live in EL most of the time; PACELC tells you what they sacrifice when they need to.

### Q41. Walk me through the consistency hierarchy, strongest to weakest.

(1) **Linearizable / strict serializable**: appears atomic, single-copy illusion. (2) **Sequential consistency**: a single total order exists, same on every node, but not necessarily real-time. (3) **Causal consistency**: causally related operations seen in order; concurrent operations may be seen in any order. (4) **Session guarantees** — *read-your-writes* (you see your own writes), *monotonic reads* (you never see older data after newer), *monotonic writes*, *writes-follow-reads*. Layered on weaker base models. (5) **Eventual consistency**: replicas converge if no new writes — no order guarantees during convergence.

### Q42. What are CRDTs and where do they actually show up in production?

**Conflict-free Replicated Data Types** — data structures that merge deterministically without coordination, so multi-leader replication converges to the same state regardless of order. Examples: **G-Counter** (grow-only counter, sum across replicas), **PN-Counter** (positive + negative), **OR-Set** (observed-remove set), **LWW-Element-Set** (last-write-wins set), **RGA** (Replicated Growable Array, for text). Production use: Redis CRDT modules, Riak, **Figma's multiplayer canvas** (custom CRDT), **Automerge** (general-purpose collaborative editing), Linear/Notion-style sync. Use when multi-region writes must merge without app-level conflict resolution.

### Q43. Why does Spanner need TrueTime?

Spanner offers **external consistency** (a.k.a. linearizability) globally — across continents — while still allowing local reads. The challenge: with no global clock, you can't tell which of two writes happened first. Google's solution: **TrueTime** — a service that returns a *bounded uncertainty interval* (`[earliest, latest]`) backed by GPS + atomic clocks in each datacenter. On commit, Spanner picks a timestamp and **waits out** the uncertainty (commit-wait) before acknowledging, ensuring any later transaction sees a higher timestamp. The latency cost: a few ms per commit. Most apps don't need this; Spanner is a niche bet on the strongest possible consistency model.

### Q44. Senior interview angle: "is your system strongly consistent?"

Never just say yes. The right answer: *"strongly consistent for X operations under Y conditions; eventually consistent for Z."* Examples: "Postgres single-region writes are strongly consistent; cross-region reads from a replica are eventually consistent up to ~100ms lag." Or: "DynamoDB strongly-consistent reads cost 2× and only work on the same region; eventually-consistent reads are the default." Avoid blanket claims; precision is what gets you promoted.

---

## Distributed Consensus & Coordination

### Q45. Why do we need consensus at all?

**One answer from a group**: leader election (who's the primary?), distributed locking (only one job runs the migration), atomic commit across nodes, configuration metadata (which shard owns this range?). Wherever divergent answers would cause irreversible harm — money moving twice, two systems both thinking they're leader, a unique ID issued twice. The discipline: identify which decisions *need* consensus and which can be eventual + reconcile. Consensus is expensive; minimise its use to where it's essential.

### Q46. Explain Raft well enough that I'd believe you could implement it.

Three states: **follower**, **candidate**, **leader**. Followers passive; candidates request votes; leader handles all client writes. **Election**: when a follower's timer expires without hearing from a leader, it bumps its `term`, becomes a candidate, votes for itself, requests votes from peers. First to majority wins. Random timeouts (150-300ms) prevent perpetual ties. **Log replication**: leader receives writes, appends to its log, sends `AppendEntries` to followers; a write commits when replicated to majority. Followers truncate divergent log entries. **Safety**: a candidate can only win if its log is at least as up-to-date as the voter's, so committed entries never roll back. Used in etcd, Consul, CockroachDB, TiKV, modern MongoDB.

### Q47. Paxos vs Raft — what's the practical difference?

**Paxos** is foundational and famously hard to understand — multiple proposers can compete simultaneously, the algorithm is described in abstract roles (proposer/acceptor/learner), and real implementations need extensions (Multi-Paxos for sequences, leader leases for efficiency). **Raft** is designed for understandability: a single leader at a time, explicit terms, log-based replication. Both provide the same guarantees. In practice: read Raft, implement Raft, debug Raft. Paxos shows up in Google's internal systems (Chubby, Spanner); everyone else moved to Raft.

### Q48. What's a split-brain and what are fencing tokens?

**Split-brain**: two nodes both believe they're leader, accept writes concurrently — data divergence on a partition heal. The classical example: a leader is GC-paused for 30s, the cluster elects a new leader, then the old leader wakes up and tries to commit its in-flight writes. Solutions: (1) **STONITH** (shoot the other node in the head) — fence off the old leader via a power controller or VM kill. (2) **Epochs / terms** — every leader has a monotonic term; followers reject writes from stale terms. (3) **Fencing tokens** — every operation includes a monotonic token; the resource (DB, storage) rejects writes with a stale token. Kleppmann's canonical "Redlock isn't safe" example hinges on the lack of fencing tokens.

### Q49. Distributed locks — what's the production answer?

Three tiers of seriousness. (1) **For coordination of best-effort work** (e.g. "only one worker runs this cron"): Redis `SETNX` with TTL is fine — accept that on rare failures it may run twice. (2) **For coordination where double-execution is bad**: etcd / ZooKeeper / Consul — Raft-backed, with **lease-based** locks (the lock auto-releases if the holder crashes) and **fencing tokens** issued with each lease. (3) **For correctness-critical operations on a shared resource**: don't use distributed locks at all — design idempotent operations with deduplication, or use a transactional system that natively serialises (Postgres advisory locks for in-database coordination). **Redlock** (Antirez vs Kleppmann debate): don't use it without fencing tokens — clock skew, fsync semantics, and lack of fencing make it unsafe for serious workloads.

### Q50. When do you actually need consensus vs accepting eventual consistency?

**Need consensus**: anything where two answers cause irreversible harm — money movement, unique ID generation (without sufficient bits to avoid collision), leader election, locking, cluster membership changes, distributed transactions across critical resources. **Accept eventual**: counters, feeds, search indexes, notifications, presence, recommendations, analytics, most user-visible data. The 80/20: most of your system is eventual; the consensus paths are small but critical. Push coordination to the edges (initialisation, leader election, config) and keep the data plane local.

### Q51. Two-phase commit — why is it largely dead in modern designs?

**2PC**: coordinator asks all participants "can you commit?" (prepare phase), each replies yes/no, coordinator broadcasts commit or abort. **Blocking failure mode**: if the coordinator dies *between* sending the prepare and sending the commit, participants are stuck holding locks indefinitely — they can't decide unilaterally. **3PC** addresses this but adds round trips and is still vulnerable to network partitions. Modern replacement: **sagas** (multi-step business workflows with compensating actions) for cross-service consistency, or **single-shard transactions** where business logic fits in one place. The senior take: if your design needs 2PC, you usually have a service-boundary problem, not a transaction problem.

### Q52. What's a gossip protocol and where does it shine?

Epidemic-style state propagation: each node periodically picks a few peers at random and exchanges state diffs. Converges in **O(log N)** rounds — surprisingly fast even at thousands of nodes. Used by Cassandra (cluster membership, schema), Consul (Serf), HashiCorp products. **SWIM** is a popular gossip-based membership protocol. Trades **freshness** (state is eventually correct, not instantly correct) for **partition tolerance** (no central coordination point). Reach for it for cluster-membership-style problems; not for things requiring strict ordering.

---

## Messaging, Queues & Streaming

### Q53. Queue vs log vs pub/sub — what's the actual distinction?

**Queue** (SQS, RabbitMQ, Celery brokers): point-to-point, message removed after ack, hard to replay (it's gone). Producer-consumer one-to-one or one-to-N-competing. **Log** (Kafka, Pulsar, Kinesis, Redpanda): append-only ordered sequence, retention-based deletion (time or size), consumers track their own offset, **replayable** (reset to an earlier offset). Broadcast by topic — multiple consumer groups read independently. **Pub/sub** (Redis pub/sub, Google Pub/Sub): fan-out broadcast, often **without persistence** — if the subscriber's offline, the message is lost. Pick: queue for "one worker handles each job", log for streaming/replay, pub/sub for fire-and-forget broadcasts.

### Q54. At-least-once vs exactly-once — what's the truth?

**At-most-once**: send and forget; may drop on failure. OK for metrics, telemetry. **At-least-once**: retry until acknowledged; may duplicate. **The default for serious systems** — requires idempotent consumers. **Exactly-once**: a marketing claim *across systems*. Within Kafka, the transactional API gives exactly-once for Kafka-to-Kafka pipelines. Across Kafka + Postgres + an external service, you're back to at-least-once with deduplication via **idempotency keys**. The senior answer: "exactly-once semantics are at-least-once delivery + idempotent processing; the broker doesn't give you exactly-once for free across system boundaries."

### Q55. What's the outbox pattern and what problem does it solve?

**Dual-write problem**: a service needs to update its DB *and* publish an event to Kafka. If the DB commit succeeds but the Kafka publish fails (network blip, broker down), you have an inconsistent state and no clean recovery. **Outbox**: in the same DB transaction, write the business state *and* an event row to an `outbox` table. A separate process (or CDC pipeline) reads the outbox and publishes to Kafka, marking events as published. The DB transaction guarantees the event is recorded; the publisher is at-least-once. Combined with idempotent consumers, you get effective exactly-once semantics across the boundary.

### Q56. CDC (Change Data Capture) — when do you reach for it?

Read the DB's WAL/binlog and stream row-level changes to Kafka. Tools: **Debezium** (Postgres, MySQL, MongoDB, SQL Server), Maxwell (MySQL), AWS DMS. Use cases: (1) **Replace dual-writes** — instead of code emitting events, the DB *is* the event source. (2) **Hydrate downstream systems** — search indexes, caches, analytics warehouses, ML feature stores. (3) **Outbox** automation — Debezium publishes outbox rows automatically. Costs: schema changes require care (events are tied to DB schema), CDC pipeline becomes critical infrastructure, replication slot pins WAL on the source DB (Postgres-specific failure mode).

### Q57. Kafka — explain partitions, consumer groups, and ordering.

**Topic** → **partitions** (each is an ordered immutable log). **Producers** can pick the partition (typically `hash(key) % partition_count`) — same key = same partition = ordered. **Consumer groups**: each partition is consumed by exactly one consumer within a group. Parallelism is bounded by partition count — N consumers in a group can process up to N partitions concurrently. **Ordering**: guaranteed per-partition (per-key), not across the topic. To get total ordering, use one partition (and lose horizontal scale). Compaction: retain latest value per key, turning the log into a materialised KV view — used for stateful streaming (Kafka Streams `KTable`).

### Q58. Backpressure — what is it and how do you implement it?

When a fast producer outpaces a slow consumer, *something* has to give: queue grows unboundedly (OOM), producer is forced to slow down, or messages drop. **Unbounded queues hide load** — they let you ignore the problem until OOM. **Backpressure** propagates the slowness back: bounded queues with explicit policies (Reactive Streams' `request(n)`, Akka's `OverflowStrategy`, channels' `BoundedChannelFullMode`). Choices when the queue is full: **Block** the producer (synchronous backpressure), **drop oldest/newest/random** (lossy but bounded), **shed load** (return 429 / error). In .NET, `Channel<T>` exposes all of these explicitly.

### Q59. Senior interview angle: consumer falls behind by 1 hour. How do you catch up?

(1) **Scale up consumers within the group** — but only up to the partition count (extra consumers sit idle). (2) **Increase partition count for future work** — can't be done retroactively on existing data. (3) **Provision a temporary parallel consumer group** to drain a backlog, then retire it. (4) **Scale up consumer CPU/memory** if processing is bottlenecked there, not on broker reads. (5) **Accept temporary stale reads** — most catch-up scenarios are bounded; tell stakeholders "ETA 30 min". The senior signal: knowing the partition count is the ceiling on consumer parallelism, and that you must plan for it at design time.

### Q60. Stream processing: stateless vs stateful, and what are watermarks?

**Stateless**: filter / map / route — Kafka Streams stateless ops, Flink stateless processing. No need to remember anything between messages. **Stateful**: joins, aggregations over time windows. Need state — typically RocksDB-backed (Flink, Kafka Streams). **Windowing types**: tumbling (non-overlapping), sliding (overlapping), session (gap-defined), hopping (sliding with stride). **Event time vs processing time**: event time is when the event happened; processing time is when your code sees it. They diverge — late data arrives 5 minutes after the event. **Watermarks** are a threshold ("we believe all data with event time < T has arrived") used to finalize windows. The art is choosing the right watermark policy: too eager loses late data, too lazy delays output.

---

## Resilience & Failure Patterns

### Q61. What's the right way to set timeouts across a system?

Two rules. (1) **Every network call has a timeout** — never default-infinite (Java's HttpClient pre-11, many SDKs). (2) **Timeouts must decrease as you go deeper**: gateway timeout > app timeout > DB timeout, or you cascade — the deeper call's timeout fires first, the outer call times out *after*, and the user already gave up. Concrete pattern: 30s at the edge → 25s at the app → 20s at the DB → 15s for the deepest call. The exact numbers don't matter as long as they're ordered correctly.

### Q62. Retries — what's the production playbook?

(1) **Only retry idempotent operations** — or pair non-idempotent ones with idempotency keys. (2) **Exponential backoff with full jitter** (AWS recommendation: `sleep = random(0, base × 2^attempt)`) — pure exponential causes synchronised retries; jitter de-correlates them. (3) **Retry budget**: cap the retry rate per service (e.g. retries ≤ 10% of original traffic) so a downstream blip doesn't multiply into a 10× retry storm. (4) **Bounded attempts** — typically 3-5; beyond that, surface the failure. (5) **Distinguish errors**: 5xx retryable, 4xx generally not, network errors retryable with care.

### Q63. Circuit breaker — explain the states and the tuning.

**Closed**: requests flow normally; the breaker counts failures. **Open**: on threshold exceeded (e.g. 50% failure over 10 requests), reject all requests immediately for a cooldown period — fast-fail. **Half-open**: after cooldown, allow a small probe (e.g. 1-3 requests); if successful, close; if failing, re-open. Tuning: thresholds too tight → false trips that reduce throughput; too loose → no protection during real outages. Half-open probe count too low → flaky behaviour on recovery. The senior signal: knowing it's a *symptom* of a degraded downstream, not a fix — investigate the downstream.

### Q64. Bulkhead — what does isolation actually give you?

Named after ship compartments. Isolate resource pools per dependency / tenant / priority so one slow downstream can't drain *all* threads/connections/memory. Two flavours: **thread pool isolation** — each dependency gets its own pool (heavyweight, gives full isolation). **Semaphore isolation** — count-based limit per dependency, shares one thread pool (lightweight, less isolation but cheap). Production: bulkhead per downstream dependency, with per-tenant bulkheads for noisy-neighbour protection in multi-tenant systems. Without bulkheads, your slowest downstream sets your whole service's latency.

### Q65. Load shedding — when and how?

When **overloaded**, drop work *before* queuing it. Counterintuitive but correct: better to fail 10% of requests fast than 100% slow (latency starvation kills the whole system). **Token bucket per client / priority** lets you drop low-priority work first. **Concurrency limits**: the simplest form — `max_concurrent_requests = 100`, requests above the limit get 503. **Adaptive shedding**: monitor queue depth or latency; shed when degraded. Marc Brooker's posts on AWS load shedding are mandatory reading.

### Q66. Rate limiting — the four algorithms and when to use each.

(1) **Token bucket**: refill at rate R, burst up to capacity C. The standard — allows controlled bursts, easy to implement. (2) **Leaky bucket**: smooths bursts to constant output rate. Less burst-friendly. (3) **Fixed window**: simple counter per N-minute window. Has boundary-effect double-bursts (10 RPS limit allows 19 RPS spanning a window boundary). (4) **Sliding window** (log of timestamps or weighted bucket): no boundary effect, more accurate. **Distributed implementation**: Redis with a Lua script for atomicity (the canonical pattern), or a dedicated rate-limiting service for high-scale (e.g. Stripe's open-source `clockss`).

### Q67. What are hedged requests and what do they cost?

Google's "tail at scale" technique: fire a request, and if you don't have a response by p95, **fire to a second replica in parallel**, take whichever wins. Crushes p99 — eliminates the slow-tail amplification of fanout. **Cost**: ~2× capacity at the tail (most requests don't hedge, but the slow ones double-dispatch). Avoid for non-idempotent operations. Pattern: best for read-heavy fanout workloads where you can spare the capacity.

### Q68. Idempotency keys — what does the canonical Stripe-style implementation look like?

Client supplies a unique key per logical operation (`Idempotency-Key: abc-123-def`). Server: (1) **Look up the key** in a store (Redis with TTL, or DB). (2) If found, return the cached response — without re-executing the operation. (3) If not found, execute the operation, cache the response keyed by `Idempotency-Key`, return. Edge cases: in-flight collision (two requests with the same key arrive simultaneously) — use a transaction or lock to serialise. TTL: ~24h is the Stripe default. The win: clients can safely retry on network failures without worrying about double-charge.

### Q69. Sagas — orchestration vs choreography?

A **saga** is a long-running multi-step transaction across services, **without 2PC**. Each step has a **compensating action** to roll back what's already committed. **Orchestrated** (Temporal, AWS Step Functions, Cadence): a central coordinator drives the steps and runs compensations on failure. Easier to debug (one place owns the flow), explicit visibility into state. **Choreographed**: each step emits an event; the next service listens and reacts. Lower coupling, harder to debug (state is scattered). Senior take: orchestration scales to complex flows where visibility matters; choreography for simple linear flows. Don't mix them in one saga.

### Q70. Senior interview angle: "service A retries calls to B with no jitter. B has a brief blip. What happens?"

**Retry storm.** When B returns errors, all of A's clients retry at the same exponentially-spaced intervals. Since the intervals are synchronised (no jitter), they all retry simultaneously — a much larger spike than the original load. B, just recovering, gets clobbered again, fails again, triggering another synchronised retry. The storm propagates upward (A becomes the new B for its own callers). The fix is **jitter** (full jitter ideally), **retry budgets** to cap the multiplier, and **circuit breakers** to fast-fail when B is sick. Bring receipts on this — it's the single most common production resilience failure.

### Q70b. Marc Brooker's exact framing: what is backoff *for*?

Brooker (Senior Principal Engineer at AWS, the canonical voice on this) frames it precisely: backoff has two purposes — (1) **let the downstream recover** without being kept under the same load that broke it, and (2) **spread retries across time** so they don't synchronise. Pure exponential gives you (1) but not (2). Jitter — adding randomness — gives you (2). The AWS-recommended **full jitter** formula: `sleep = random_between(0, min(cap, base × 2^attempt))`. **Capped exponential**: you must bound the maximum sleep (often 30s-5min) or attempts climb into hours. The senior gotcha: backoff *cannot* solve long-term overload — if the downstream is permanently smaller than your offered load, retries just defer pain. Load shedding solves overload; backoff solves transient pain.

### Q70c. "Deferring load doesn't work" — what's Brooker driving at?

A common naive defence against overload: "we'll buffer the excess requests and process them later." Brooker's point: **deferred load is still load**, and your downstream's capacity didn't change. If your offered load permanently exceeds capacity, queue depth grows without bound, latency grows without bound, OOM eventually. The only escape: **reduce the offered load** — load shed (return 429), shrink the work per request (fewer features under stress), or scale capacity (slow). Queues smooth bursts; they don't fix steady-state overcapacity. The discipline: always model your steady-state, not just your peak.

---

## Asynchronous & Event-Driven Patterns

### Q71. Event-driven architecture vs event sourcing vs CQRS — distinguish them.

Three distinct ideas, often conflated. **EDA**: services react to events; loose coupling — service A emits "OrderPlaced", service B reacts. **Event sourcing**: events are the *source of truth*; state is derived by replaying. Past state is reconstructible; audit is free. **CQRS**: separate write model from read model; the read side has multiple specialised projections (one for the API, one for search, one for analytics). You can do EDA without event sourcing; you can do CQRS without event sourcing; you can do event sourcing without CQRS — but they often appear together because they reinforce each other.

### Q72. When is event sourcing actually worth it?

When you need: (1) **Audit history of every state change** — financial, healthcare, regulatory. (2) **Multiple projections** from the same source — different read shapes (search vs API vs reporting). (3) **Time-travel debugging** — replay events to see what the system looked like at 14:23 last Tuesday. (4) **Natural fit for downstream EDA**. **Costs**: schema evolution is *hard* — events are immutable forever; renaming a field requires upcasters and versioning. Eventual consistency on reads. Snapshots needed for replay performance on large streams. Most CRUD apps don't need it; the trigger is genuine temporal/auditing requirements.

### Q73. CQRS — what's the trigger for splitting reads and writes?

You need CQRS when the read shape and write shape diverge enough that one model serves both badly. Symptoms: read queries do 10 joins because the write model is normalised; reads dominate writes 100:1; reads need denormalised aggregations that the write model can't efficiently produce. With CQRS: writes go to the normalised model; reads served from denormalised projections (materialised views, ElasticSearch, Redis), updated via events or CDC. Cost: **eventual consistency** between write commit and read visibility — typically ms but explicit. Don't reach for CQRS in a CRUD app; the trigger is genuine read/write model divergence.

### Q74. What's a materialised view and where does it shine?

A pre-computed query result, persisted, refreshed on write (or async). Trade **write cost** (every update fans out to the view) for **read latency** (point lookup instead of N-join scan). Postgres has them natively (`CREATE MATERIALIZED VIEW`); ClickHouse has them as a first-class feature; Kafka Streams `KTable` is effectively a materialised view of a compacted topic. Use cases: dashboards, leaderboards, "top N per X" queries, search-result pre-computation. Trade-off: staleness — the view is at-best as fresh as your refresh policy.

### Q75. Schema evolution in event-driven systems — what does mature look like?

Schemas change; events live forever. **Backward-compatible**: new readers handle old data (added an optional field — readers without it ignore). **Forward-compatible**: old readers handle new data (additions don't break parsing). **Full-compatible**: both — the gold standard for event schemas. **Schema Registry** (Confluent's, Apicurio): centralises schema versioning, enforces compatibility on publish, blocks breaking changes at the broker. Pair with **Avro** or **Protobuf** for binary efficiency + schema enforcement. JSON Schema is acceptable but less rigorous. Without a schema registry, you eventually get the "we published a breaking change three months ago" outage.

---

## Data Modelling & Aggregation Patterns

### Q76. Normalised vs denormalised — when do you pick which?

**Normalised**: each fact stored once; updates are localised; joins required for queries. Default for OLTP systems with frequent writes and updates. **Denormalised**: duplicate data across tables/documents; updates fan out to all copies; reads are fast (no joins). Default for read-heavy systems, OLAP, document stores. Mixed reality: most systems are **selectively denormalised** — normalised at the source of truth, denormalised in derived views (search indexes, caches, read replicas with different schemas). Don't denormalise prematurely — joins are cheap until they're not.

### Q77. Walk me through the Twitter timeline problem.

Three approaches. (1) **Fanout-on-write (push)**: when you post, write a copy of the post to each follower's pre-computed timeline. Reads are O(1) — just read the timeline. Writes are O(followers) — fine for normal users, **catastrophic for celebrities with millions of followers** (each post triggers millions of writes). (2) **Fanout-on-read (pull)**: timeline is assembled at read time from the people you follow. Writes are O(1). Reads are O(followers you have × avg posts per follower) — slow. (3) **Hybrid** (Twitter's actual approach): push for normal users, pull for celebrities. Each user has a hybrid timeline merged on read from their pushed timeline + recent celebrity posts. Senior signal: knowing the hybrid is the production answer and being able to explain the threshold logic.

### Q78. Lambda vs Kappa architecture?

**Lambda** (Nathan Marz): batch layer (accurate, slow — daily Hadoop jobs) + speed layer (fast, approximate — Storm/Spark Streaming) → serving layer merges them. Reconciles real-time approximations with batch corrections. **Kappa** (Jay Kreps): just streaming. Reprocess from the log when you need a different view. Simpler operationally — one code path, one infrastructure. Modern preference is Kappa for most use cases; Lambda survives in legacy pipelines and where batch is genuinely cheaper than continuous compute.

### Q79. Senior interview angle: pre-computation vs on-demand — how do you decide?

Three axes. (1) **Read frequency vs write frequency** — if a query is run 1000× per write, pre-compute. (2) **Result staleness tolerance** — if the read can tolerate 1-hour-stale data, batch pre-compute is fine; if it needs second-fresh, streaming materialised view; if it must be live, on-demand. (3) **Result size** — pre-computing 100GB of "all possible aggregations" trades storage for compute; pre-computing 1KB of "top-10 by region" is trivial. The right answer is usually **rollup pyramids**: pre-compute the top-level aggregations; query on-demand for drill-downs that pre-computation can't anticipate.

---

## Search

### Q80. Walk me through how Elasticsearch / OpenSearch actually works.

**Inverted index**: term → list of doc IDs containing it. To search "cat dog", look up both terms' postings lists and intersect. **Tokenisation chain**: lowercase, remove stopwords ("the"), stem ("running" → "run"), optionally apply synonyms / n-grams. **Sharding**: each index is split into N shards (fixed at index creation); each shard is a self-contained Lucene index. **Replication**: each shard has primary + replicas; replicas serve reads for scale. **Near-real-time**: writes go to an in-memory buffer, flushed to a new segment every `refresh_interval` (default 1s) — segments are searchable post-refresh. Periodic segment merges keep the count manageable.

### Q81. BM25 vs TF-IDF — what changed and why?

**TF-IDF**: term frequency × inverse document frequency. Higher TF in a doc → more relevant; rarer term across corpus → more important. **BM25**: same idea, but **saturates** term frequency (doubling TF doesn't double score — diminishing returns) and **normalises by document length** (a short doc matching once is more relevant than a long doc matching once). BM25 is the modern default in Elasticsearch / Lucene / Tantivy. Tuning: `k1` controls TF saturation, `b` controls length normalisation. Replaced by **learning-to-rank** and **neural rerankers** at the top end of retrieval quality, but BM25 is the universal baseline.

### Q82. Hybrid search — what does it look like in 2026?

BM25 for **lexical match** (keyword precision, exact terms) + vector ANN for **semantic match** (synonyms, paraphrases). Run both, combine with **Reciprocal Rank Fusion (RRF)**: each result's score = `sum(1 / (k + rank_i))` across each retrieval source. RRF is parameter-light and surprisingly robust. Now the standard for RAG (retrieval-augmented generation) and modern search products. Tuning: source weights, RRF `k` (typically 60), final reranker with a cross-encoder for top-K (10-50 results).

### Q83. When do you leave Postgres FTS for Elasticsearch?

Postgres FTS is fine until: (1) **multilingual** — Postgres has per-language configs but limited compared to Elasticsearch's analyzers + plugins. (2) **Faceting at scale** — aggregations across millions of docs with multiple filter dimensions. (3) **Relevance tuning needs** — Elasticsearch's BM25 parameters, custom analyzers, custom scoring. (4) **Write rate exceeds Postgres FTS indexing capacity** (~thousands/sec on a tuned box). (5) **Hybrid lexical + vector at scale**. Postgres FTS handles up to ~1M docs and basic search needs trivially; beyond that, Elasticsearch / OpenSearch / Tantivy / Meilisearch / Typesense earn their complexity.

---

## Geospatial, Time-Series & Real-Time

### Q84. Geohash vs S2 vs H3 — when do you pick which?

**Geohash**: recursive grid encoded as a base-32 string; prefix length = precision. Easy, Postgres/Redis-friendly. Downside: distortion near poles, neighbours can be in non-prefix-adjacent cells. **S2** (Google): hierarchical spherical cells; better near poles; the foundation of Google's geo systems. **H3** (Uber): hexagonal grid; uniform neighbour distance (every cell has 6 equidistant neighbours, vs squares' awkward diagonals); dominant in ridesharing / density / delivery dispatch. Pick H3 for ride-share-style "nearby drivers"; S2 for global mapping; Geohash for simple Postgres-based proximity.

### Q85. How does "drivers near me" actually work?

(1) Driver app pushes location every N seconds to a **location service** (Redis with geospatial commands, or H3 cell → list-of-drivers in Redis sorted set). (2) Rider app sends "find drivers within R meters of my location". (3) Service computes the rider's H3 cell + its **k-ring** (neighbouring cells out to radius R). (4) Fetch drivers in those cells. (5) Compute **haversine distance** for each candidate, filter to within R, rank by distance (or by ETA model). (6) Return top N. Updates are continuous via WebSocket — the matching engine is decoupled from location updates.

### Q86. Presence systems (online indicators) — what's the production pattern?

Client heartbeats every ~30s to a presence service. Service stores `user:123 → last_heartbeat_timestamp` in Redis with a TTL. Online if `last_heartbeat > now - 60s`. Presence updates are **debounced** (don't notify every heartbeat — only on transitions or every N seconds) and **fanned out** only to users who care (followers, conversation participants, not everyone globally). The senior gotcha: don't broadcast presence to everyone — at million-user scale, you'll DDoS yourself. Scope to relevant audience.

### Q87. Real-time push to the browser — what's the stack?

For one-way push (notifications, live updates): **SSE** (Server-Sent Events) — simpler than WebSockets, browser-native auto-reconnect, HTTP-friendly. For bidirectional (chat, collab): **WebSockets** with sticky load balancing + fan-out via Redis pub/sub or Kafka. For mobile background push: **APNs** (iOS), **FCM** (Android) — operating-system-level delivery, survives app-not-running. Composition pattern: SSE/WS for in-app live, FCM/APNs for offline notifications. Don't pick WebSockets just because you've heard of them — SSE is the right answer more often than people think.

---

## Observability, SLOs & Operations

### Q88. The three pillars of observability — and the fourth?

**Logs**: discrete events with timestamps, structured JSON ideally; ELK / Loki / OpenSearch / Datadog. **Metrics**: aggregated numerics over time; Prometheus, Grafana, Datadog. **Traces**: request flow across services with timing breakdowns; OpenTelemetry, Jaeger, Tempo, Honeycomb. The **fourth pillar**: **continuous profiling** — sampling CPU profiles in production (Pyroscope, Datadog Continuous Profiler, Parca). Increasingly important for performance debugging at scale: "this regression is in this function" without needing to reproduce.

### Q89. Trace context propagation — what's the common bug?

W3C `traceparent` header carries the trace ID and parent span ID across HTTP/gRPC calls; OpenTelemetry libraries inject/extract automatically. **The common bug**: dropping trace context across **async boundaries** — `CompletableFuture` chains, `Channel<T>` workers, message-queue consumers. The instrumentation that auto-propagates over HTTP doesn't follow your in-process async glue. Fix: explicitly capture the current `Activity` / `Span` at enqueue, set it as parent on dequeue. Result: full distributed traces show the worker's spans as children of the originating request.

### Q90. SLO / SLI / SLA / error budget — explain the system.

**SLI** (Service Level Indicator): what you measure. "99th percentile API latency", "request success rate". **SLO** (Service Level Objective): the target. "99.9% of requests succeed over a 30-day window". **SLA** (Service Level Agreement): the external commercial contract (with penalties for breach). **Error budget**: `1 - SLO`. If your SLO is 99.9%, you have 0.1% of requests' worth of badness to spend on deploys, experiments, controlled risk-taking. **When error budget is exhausted, you freeze risky work and stabilise.** This is the language of operational maturity — Google SRE book is the reference.

### Q91. Multi-window multi-burn-rate alerting — what does Google SRE recommend?

Alerting on raw error counts is noisy (one bad minute fires constantly) and misses slow burns (steady 0.5% errors burns through your monthly budget in days). The SRE book pattern: alert on **error budget burn rate** at multiple windows. E.g. **fast burn**: 14.4× normal burn rate over 1 hour (would exhaust monthly budget in 2 days) → paging alert. **Slow burn**: 6× burn over 6 hours (would exhaust in ~5 days) → ticket. The dual window catches both acute spikes and slow degradation, with low false-positive rates.

### Q92. Blue/green vs canary vs rolling — when do you pick which deployment strategy?

**Blue/green**: two full environments, swap traffic via load balancer. Instant rollback. Costs: 2× infrastructure during the window. Use for: safety-critical deploys, infrequent releases. **Canary**: gradually shift traffic (1% → 5% → 25% → 100%) while monitoring SLOs at each step. Catches regressions before full rollout. Use for: continuous deploy. **Rolling**: replace instances incrementally (kill 1, deploy 1, repeat). Cheapest. Use for: stateless services with quick startup. **Feature flags** (LaunchDarkly, Unleash, OpenFeature) **decouple deploy from release** — ship code dark, enable per-segment.

### Q93. What's shadow / dark traffic and where is it useful?

**Shadow traffic**: copy production traffic to a new version of the service; *don't* serve the response to users — just compare results, latency, error rates. Lets you validate a major rewrite or model change against real production load before exposure. Costs: 2× downstream load (the new version makes the same DB/API calls), careful handling of side effects (the new version must not write twice, send duplicate emails, etc.). Use for: model deployments, query engine rewrites, infrastructure migrations.

---

## Security at the System Level

### Q94. AuthN vs AuthZ — and what's the canonical OAuth flow in 2026?

**AuthN** = authentication = "who are you" (login). **AuthZ** = authorization = "what can you do" (permissions). **OAuth 2.0** flows for 2026: **Authorization Code + PKCE** for public clients (SPAs, mobile, native apps) — PKCE prevents intercepted authorization codes from being usable. **Client Credentials** for machine-to-machine. **Refresh tokens** to extend access without re-login. **Avoid**: implicit grant (deprecated, replaced by PKCE), password grant (anti-pattern — your app sees the user's password). OIDC sits on top of OAuth 2.0 and adds identity claims via the ID token.

### Q95. JWT — stateless wins, what's the catch?

**Stateless**: the JWT contains all auth info (signed); no DB lookup per request. Wins: fast, scales horizontally, no session store. **The catch — no revocation until expiry**: if you change a user's role, demote an admin, or terminate their session, the JWT still validates until its `exp` claim passes. Mitigations: (1) **short-lived access tokens** (5-15 min) + refresh tokens — limits the staleness window. (2) **Revocation list** in fast cache (Redis); middleware checks every request — adds a DB call but enables instant revoke. (3) **Stateful sessions** — JWT becomes a session ID, defeating the statelessness benefit. The senior signal: knowing the trade-off and picking explicitly based on threat model.

### Q96. mTLS — when do you bother?

**Mutual TLS**: both client and server present certificates; both verify the other. Used for **service-to-service in zero-trust networks** — every internal call is authenticated cryptographically, no shared secrets needed. Service mesh (Istio, Linkerd) hides the complexity — sidecars handle cert rotation, validation, traffic encryption transparently. Without a mesh, mTLS is operationally painful (cert distribution, rotation, expiry monitoring). Reach for it when: zero-trust is a requirement, you have a service mesh, or you're exposing services to untrusted networks (B2B integrations, partner APIs).

### Q97. Authorization models — RBAC vs ABAC vs ReBAC?

**RBAC** (Role-Based): users have roles, roles have permissions. Simple, doesn't scale to fine-grained policies ("can user X edit document Y"). **ABAC** (Attribute-Based): policies are functions of user attributes + resource attributes + context. More flexible, harder to reason about. **ReBAC** (Relationship-Based, Google Zanzibar): permissions defined via relationships between subjects and objects ("user X has role 'editor' on document Y"). Backbone of Notion, Carta, Linear's permissions. Implementations: AuthZed/SpiceDB, Oso, OpenFGA. ReBAC is the modern default for SaaS with complex sharing semantics.

### Q98. OWASP API Top 10 — what's the one that bites everyone?

**BOLA** (Broken Object Level Authorization) — by far the most common. The bug: an endpoint accepts an object ID from the client, looks it up, returns it — without verifying the caller has permission to access that *specific* object. `GET /api/orders/12345` happily returns order 12345 to any authenticated user, even if it belongs to a different tenant. The fix: every object access checks ownership/permission in code (not just at the endpoint level). ReBAC + middleware enforcement makes this systemic instead of per-endpoint discipline.

### Q99. Senior interview angle: how do you protect a public API from abuse?

Layered defence: (1) **WAF** (Cloudflare, AWS WAF) — block known bad patterns, signatures, OWASP rules. (2) **DDoS protection** — anycast scrubbing centres, rate limits on connections per IP. (3) **Per-user rate limiting** (token bucket in Redis) with **auth-aware buckets** — authenticated users get higher limits. (4) **Bot detection** — Cloudflare Bot Management, hCaptcha, BotID; behavioural fingerprinting. (5) **Anomaly detection** on usage patterns. (6) **Secret rotation** — credentials in Vault, never in env vars in images. The senior signal: layered defence — no single layer is sufficient.

---

## Cost & Capacity Engineering

### Q100. What are the cost dimensions in a cloud system, in priority order?

(1) **Compute** (CPU-hours) — usually the largest line. (2) **Memory** (RAM, often tied to instance size). (3) **Storage** (per GB-month) — cheap on S3, expensive on EBS. (4) **Egress bandwidth** — the **silent killer** in cross-region designs; $0.02-0.09/GB depending on direction, adds up at scale. (5) **Per-request fees** — S3 PUT/GET, DynamoDB RCU/WCU, API Gateway, Lambda invocations — surprise at scale. (6) **Managed-service premiums** — managed databases cost 2-3× raw infra; worth it for ops simplicity. Cost optimisation is a senior skill; the first lever is usually right-sizing (most prod is over-provisioned 2-10×).

### Q101. Spot / preemptible instances — when are they worth it?

60-90% cheaper than on-demand. Catch: AWS / GCP / Azure can reclaim them with 30-120s notice. Worth it for: (1) **stateless, fault-tolerant workloads** — batch jobs, training pipelines, render farms, queue consumers (with proper retry). (2) **Diversified fleets** — pool multiple spot pools / instance types so reclaims don't take you to zero. Not worth it for: stateful services without graceful handover, latency-critical online serving, single-instance services. The savings are real — many startups run 80% of compute on spot.

### Q102. Autoscaling — what's the trap?

**Scale-out is fast, scale-in is slow.** When traffic spikes, you can boot more instances in seconds. When it drops, you must **drain connections** (let in-flight requests finish), deregister from load balancer, hand off state. This asymmetry means you over-provision on the downswing. **Reactive autoscaling** (CPU > threshold → add capacity) lags real load by minutes; **predictive autoscaling** uses historical patterns to scale ahead. Custom metrics (queue depth, request latency) often work better than CPU. The discipline: utilisation targets of 60-70% (not 80%+) — headroom absorbs surge + failover.

### Q103. Cross-region data transfer — the silent budget killer.

Cross-region traffic costs $0.02-0.09/GB on AWS / GCP / Azure. A "small" service moving 100GB/day cross-region = $200-900/month just in transfer fees. Mitigations: (1) **Colocate compute and data** — keep services in the same region as their primary DB. (2) **Compress payloads** — gzip / zstd / brotli reduce volume 5-10× on text. (3) **Batch** — fewer round trips. (4) **Edge cache** — CDN at the edge means cross-region calls only on cache miss. (5) **Replicate vs query** — instead of cross-region queries, replicate the data to a local read replica.

### Q104. Capacity planning — the 60-70% utilisation rule and why.

Target steady-state utilisation at 60-70% of peak capacity. Why not 90%? Because **utilisation has tail behaviour** — at 90% mean, you spend significant time at 100% (queueing theory: utilisation approaches 1 → queue length → infinity). Also: N+1 redundancy requires you can lose one instance and still serve peak. At 70% × 3 instances, you can absorb the loss of one (then 105%, briefly overloaded, recoverable). Over-provisioning is a feature, not waste. Capacity engineers model peak × failure × growth and provision accordingly.

### Q104b. Senior interview angle: "estimate the monthly cloud cost of your design".

2026 interviewers explicitly evaluate cost reasoning at staff level. The framing: (1) **Compute** — number of instances × hours × $/hour. Memorise rough numbers ($0.05/hour for small, $0.50 for mid, $3-5 for GPU). (2) **Storage** — GB × $/GB-month (S3 ~$0.023, EBS ~$0.10, RDS ~$0.20). (3) **Data transfer** — egress GB × $0.02-0.09. (4) **Managed service premiums** — RDS / DynamoDB / managed Kafka often 2-3× DIY. (5) **Per-request fees** — DynamoDB RCU/WCU, API Gateway, S3 requests. Walk through each line, write the assumption, give a total. The signal: "this design costs ~$50k/month at 1M DAU, ~$2M at 100M DAU" — concrete enough that you've clearly thought about it.

### Q104c. What do "operationally mature" services look like in 2026 staff interviews?

Tier framework (Hello Interview / Exponent style): (1) **functional correctness**, (2) **scalable to spec**, (3) **production readiness** — SLOs defined, error budgets, capacity headroom. (4) **operational maturity** — runbooks, on-call rotation, chaos engineering, capacity planning, cost models. (5) **real-world case-study fluency** — "Netflix solves this by X, here's the war story". Staff candidates are expected to hit tier 4 reflexively and tier 5 to win the room. Hitting tier 1-2 only is a senior signal, not staff.

---

## Data Structures for System Design

### Q105. Bloom filter — what is it and where do you actually use one?

**Probabilistic set membership**: tells you "definitely not in set" or "probably in set" — no false negatives, controlled false positive rate. **Tiny memory**: ~10 bits per element for ~1% false positive rate, regardless of element size. Uses: (1) **Avoid DB lookups for likely-misses** — Cassandra, HBase, LevelDB use bloom filters per SSTable to skip reads. (2) **Avoid cache lookups for keys you've never cached**. (3) **Click fraud detection** — "have I seen this user-action pair?". (4) **Web crawlers** — "have I seen this URL?". Senior pattern: bloom filter as a cheap gate before expensive lookups.

### Q106. HyperLogLog — what does it solve?

**Cardinality estimation in O(1) memory** — how many distinct elements have I seen? Standard counts require O(N) memory to track seen elements. HLL uses ~12KB to estimate cardinalities up to billions with ~1% error. Redis `PFADD` / `PFCOUNT`. Classic use case: "unique visitors per day across all properties" without storing visitor IDs. Limitations: lossy (not exact), no `PFREMOVE` (can't delete from the set), merge-friendly (union of two HLLs is another HLL). The standard answer to "how do I count uniques at scale".

### Q107. Count-Min Sketch — what is it and where does it appear?

Frequency estimation with bounded error in sub-linear memory. `add(item)` increments item's estimated count; `count(item)` returns an upper bound on the actual count. Tunable accuracy/memory tradeoff via dimensions. Use cases: (1) **Top-K frequent items** without exact counting (heavy hitters in DDoS detection, hot keys in caching). (2) **Sketches in stream processing** (Apache DataSketches). (3) **Approximate join estimation** in query optimisers. Not as famous as bloom/HLL but useful in similar approximate-counting scenarios.

### Q108. Merkle tree — what gives it its superpower?

A tree where each non-leaf node is a hash of its children. Root hash uniquely identifies the entire tree's contents. Superpower: **efficient comparison of large datasets** — to find what differs between two replicas with N items, compare root hashes (O(1)); if equal, done; if different, descend, recursively comparing subtree hashes. Total comparison cost is O(differences × log N), not O(N). Used in: **Dynamo anti-entropy** (Cassandra, Riak), **Git** (commit/tree/blob hashes), **blockchain** (every block's root hash), **certificate transparency**. Senior signal: knowing it's *the* pattern for "sync two replicas efficiently".

### Q109. Skip list — when does it beat balanced BSTs?

A linked list with multiple "skip levels" — each level is a sparser linked list pointing to subsets of nodes. Lookup walks down levels, skipping ahead in O(log N) average. Simpler to implement than red-black or AVL trees, lock-free variants exist (no rotations to coordinate). Redis sorted sets use skip lists; LSM memtables sometimes do. Don't reach for it in app code (BSTs are everywhere); know it when explaining Redis internals or LSM design.

### Q110. Trie / radix tree — and where do they show up at scale?

**Trie**: tree where each path from root spells a key character-by-character. Prefix queries are O(prefix length). Use cases: (1) **Autocomplete** — "what words start with 'sys'?" — trie traversal from the 's' node. (2) **IP routing tables** — longest-prefix match for routing decisions. **Radix tree** (compressed trie): merge single-child chains into one edge; much more space-efficient. Used in Linux kernel routing, Postgres GIN indexes. When the question is "fast prefix queries on millions of strings", trie/radix is the answer.

---

## Anti-patterns & Smells

### Q111. Distributed monolith — why is it worse than a real monolith?

Microservices that all must deploy together — same release train, same downtime window, same coupling. You get all the **operational complexity** of microservices (distributed tracing, multiple repos, deploy pipelines, service-to-service auth) **and** the **deployment coupling** of a monolith. Usually a sign of: services drawn on the wrong boundaries (data shared across services, no clean ownership), shared databases between services, synchronous chains where one service must call another for every operation. The fix is hard: redraw boundaries around data ownership, eliminate shared state, decouple deployments. Often a "modular monolith would have been better" outcome.

### Q112. Synchronous chains — A → B → C → D — why are they fragile?

(1) **Latency multiplies**: each hop adds its latency; total latency is sum of all hops. (2) **Failure probability multiplies**: each hop introduces failure modes; one slow service slows the chain; one failure fails the chain. (3) **Partial-failure handling is exponentially harder** — what does A do when B succeeds but C fails? Mitigations: (1) **Reduce chains** — collapse logical operations. (2) **Async / event-driven** — A emits an event, B/C/D react independently; no synchronous dependency. (3) **Materialise upstream data** — A pre-fetches what it needs from B/C/D, owns its copy. (4) **Saga** for multi-step business workflows.

### Q113. Shared databases between services — what breaks?

(1) **Schema coupling**: team A's migration breaks team B's queries. (2) **No clear ownership**: who owns the customer table? (3) **Coordination overhead**: every schema change is a multi-team negotiation. (4) **Connection pool contention**: services compete for limited DB connections. (5) **No isolation of failure**: a slow query from service B affects service A. Fix: **database-per-service** (each service owns its schema, exposes APIs/events for other services). The migration is painful (data extraction, sync, event sourcing), but the result is real service boundaries.

### Q114. Unbounded queues — why are they a smell?

Unbounded queues don't smooth load — they **hide** the imbalance. The queue grows, latency grows, memory grows, until OOM. Symptoms: alerts on memory or pod restarts, customer reports of "stuck" jobs, "we just need bigger workers" without root-cause analysis. Fix: **bounded queues** with explicit policies (block producer, drop oldest, return 429). Bounded queues + backpressure + load shedding make the problem visible early. The discipline: every queue you create has a bound; the bound is part of the design.

### Q115. Dual writes — what's the failure mode?

A service writes to its DB *and* publishes to Kafka in the same code path. **One will fail eventually** — DB succeeds, Kafka publish fails (network blip), or vice versa. Result: inconsistent state with no clean recovery. **Fix: outbox pattern** — write business state + event to outbox table in one DB transaction; a separate publisher reads the outbox and writes to Kafka, at-least-once with idempotent consumers. Variants: **CDC** publishes DB changes directly to Kafka (bypasses outbox); **transactional outbox** in Kafka (Kafka transactions across topic + state) — limited to Kafka-internal patterns.

### Q116. Cache as source of truth — the failure mode.

Treating Redis as the durable store of important data. Failure modes: (1) Redis evicts under memory pressure → data loss. (2) Redis crashes → data loss (AOF helps but isn't equivalent to a real DB). (3) Replication is async → failover loses recent writes. (4) Cache invalidation bugs corrupt the "truth". **The rule**: cache is an optimisation, never authoritative. Always have a DB behind the cache; cache populated from DB; cache miss = read from DB. The DB is the source of truth; the cache is a speed-up.

### Q117. Premature sharding — what's the right order of escalation?

Sharding is a **one-way door** — once you shard, you can't easily un-shard. Before sharding, try: (1) **Vertical scaling** (bigger box) — modern boxes are huge. (2) **Read replicas**. (3) **Query optimisation** (indexes, plans). (4) **Caching**. (5) **Table partitioning** (within a single DB). (6) **Functional partitioning / federation** (split by feature). Only after all of these have hit a wall do you reach for sharding. Premature sharding is a leading cause of "everything is broken and nobody knows why" startups — the operational complexity dwarfs the imagined scale benefit.

### Q118. Senior interview angle: microservices without operational maturity.

Microservices require: distributed tracing (you can't debug a request without it), centralised log aggregation, service catalogue (who owns what), automated deploys, schema/API versioning, observability per service, service-to-service auth, network reliability work (timeouts, retries, circuit breakers everywhere). **These are prerequisites, not nice-to-haves.** A team that splits a monolith into microservices without these will lose more time to operational pain than they save in development velocity. The honest senior take: **start with a modular monolith with clear bounded contexts; extract services only when team/scale/independence pain justifies the operational cost.**

### Q119. Coordination on the hot path — what's wrong with it?

Every distributed lock, every consensus step, every coordination point is a potential availability hit. If the lock service is down, your service is down. If the consensus quorum can't be reached, your service can't proceed. **Push coordination to the edges** — initialisation, config loading, leader election (which is rare) — and keep the data plane local. Pattern: a service uses a leader-elected coordinator to *assign* work (each partition has one owner), then operates locally on its assigned work without coordinating per request.

---

## Tradeoff Vocabulary

### Q120. How do you frame a design choice in a senior interview?

Name the axis and the endpoint you're picking. "I'm choosing **availability over consistency** for this feature because we can tolerate 30s of staleness on profile reads but can't accept any downtime." "I'm choosing **storage over compute** by pre-aggregating dashboard data daily — we save query-time CPU at the cost of 5GB of materialised views." "I'm choosing **simplicity over scale** — Postgres handles our load up to 10× current, sharding adds complexity we don't yet need." This phrasing alone moves you a level. Don't say "we'll use X"; say "we trade Y for Z by using X".

### Q121. The classic tradeoff axes — list them and give an example for each.

| Axis | Endpoints | Example |
|---|---|---|
| Consistency vs Availability | Strong ↔ Eventual | Spanner vs DynamoDB defaults |
| Latency vs Consistency | Local-low-latency ↔ Synchronous-global | Local read vs read-from-leader |
| Read vs Write throughput | B-tree (read-fast) ↔ LSM (write-fast) | Postgres vs Cassandra |
| Storage vs Compute | Pre-compute ↔ On-demand | Materialised view vs query-time aggregation |
| Push vs Pull | Fanout-on-write ↔ Fanout-on-read | Twitter timeline |
| Sync vs Async | Request/response ↔ Event-driven | REST vs message bus |
| Coupling vs Coordination | Choreography ↔ Orchestration | Event-driven saga vs Temporal workflow |
| Cost vs Performance | Cold storage ↔ Hot in-memory | S3 Glacier vs Redis |
| Simplicity vs Scale | Vertical ↔ Horizontal | Bigger Postgres vs Sharded Postgres |
| Generality vs Optimisation | One DB for all ↔ Polyglot persistence | Just Postgres vs Postgres + Redis + Elasticsearch + S3 |

### Q122. What's the "one DB for all" vs "polyglot persistence" debate in 2026?

**Polyglot persistence** (Pramod Sadalage, 2012): use the right DB for each workload — relational for OLTP, document for flexible schema, columnar for analytics, KV for cache, search engine for text. The 2020s reversal: **modern Postgres** does relational + JSON + full-text + vector + geo + analytics tier (Citus) in one engine. The new wisdom: start with **just Postgres**; reach for specialised engines only when a specific workload genuinely outgrows it. Polyglot has real operational cost (ops, monitoring, expertise, data sync); pay it only when justified. Senior signal: knowing the historical pendulum and where it's at now.

### Q123. Pattern-recognition cheat sheet — when a prompt mentions X, reach for Y.

| Signal | Patterns |
|---|---|
| "Real-time updates / collab" | WebSocket / SSE; pub/sub fan-out; CRDTs for collab |
| "Trending / top N / leaderboard" | Sorted set in Redis; sliding-window counters |
| "Suggestions / autocomplete" | Trie or completion index; precomputed top-K per prefix |
| "Feed (Twitter/Instagram)" | Fanout-on-write + fanout-on-read hybrid for celebrities |
| "Rate limit / abuse" | Token bucket in Redis (Lua) per-user/per-IP |
| "Counter / view count / likes" | Sharded counter; eventual aggregation; CRDTs for multi-region |
| "Unique users at scale" | HyperLogLog (Redis `PFCOUNT`) |
| "Set membership at scale" | Bloom filter (negative-side cache) |
| "Geographic / nearby" | H3 / S2 / geohash + spatial index |
| "Ride share / delivery" | Geospatial cells + WebSocket + matching engine (queue-based) |
| "Chat / messaging" | WebSocket gateway + Kafka per-conversation partition + presence |
| "Payment / money movement" | Idempotency keys; double-entry ledger; saga; outbox |
| "Booking / reservation" | Pessimistic lock OR optimistic with version OR Postgres `EXCLUDE USING gist` |
| "Search" | Inverted index (Elasticsearch); BM25; hybrid with vectors |
| "Analytics dashboards" | Columnar store (ClickHouse/BigQuery); pre-aggregated rollups |
| "Audit log / event history" | Append-only log; event sourcing if events are the source of truth |
| "Long-running workflow" | Orchestrated saga (Temporal / Step Functions / Cadence) |
| "File upload at scale" | Presigned URL → direct to object storage; metadata in DB |
| "Video / media streaming" | CDN with chunked HLS/DASH; transcode pipeline (queue + workers) |
| "Multi-tenant" | Per-tenant sharding / DB isolation; noisy-neighbour bulkheads |
| "Cross-region / global" | Active-passive async OR active-active with CRDTs / per-region authority |
| "Idempotent / safe retry" | Idempotency key in request; server stores key → result hash |
| "Two services need agreement" | Consensus (Raft via etcd) — or accept eventual + reconcile |
| "Strong consistency required" | Single-leader + sync replication OR Spanner-style + clock bounds OR avoid (eventual + reconciliation) |

### Q124. Senior interview angle: structure a 45-minute system design interview.

(1) **Requirements** (5 min) — functional + non-functional; clarify scale, SLOs, consistency expectations, dominant access patterns. (2) **Capacity estimation** (5 min) — QPS, storage, bandwidth, peak vs avg, with assumptions written down. (3) **High-level design** (10 min) — boxes-and-arrows architecture; name the components and why. (4) **Data model** (5-10 min) — schemas, partition keys, indexes; show you've thought about scale. (5) **Deep dive into 1-2 components** (10-15 min) — typically the most interesting / risky one; failure modes, tradeoffs, capacity. (6) **Wrap-up** (5 min) — review tradeoffs you made, what you'd revisit, what you'd monitor. **Bring war stories** throughout — "at company X we hit this exact problem, here's what we did."

---

## AI & LLM Infrastructure

### Q125. Design a system that handles 10,000 concurrent requests to an LLM with 2-8s inference latency on $3/hour GPUs. Walk me through it.

Three big shifts from traditional serving. (1) **Long, variable latency** — each request takes seconds, not ms. Active connections grow until you hit pool limits. (2) **Expensive compute** — GPUs cost 30-100× a CPU instance; you can't over-provision casually. (3) **Variable output length** — a request might emit 50 tokens or 5000; can't pre-allocate. Architecture: **request queue with priority tiers** (paid users → low-latency lane, free users → standard lane), **token-level streaming response** (start emitting tokens as soon as they're generated — don't wait for full completion), **autoscaling on queue depth + GPU utilisation** (not just CPU), and **batch inference** at the model layer (process multiple requests per forward pass to amortise GPU memory bandwidth). Tools: vLLM / TensorRT-LLM for batching, Ray Serve / KServe / Triton for orchestration.

### Q126. GPU autoscaling — why is it harder than CPU autoscaling?

(1) **Cold start time** — GPU instances take 3-7 minutes to boot (vs ~30s for CPU): model weights download (10-100 GB), CUDA init, library load, weight loading into VRAM. (2) **No partial scale** — a GPU instance either has the model loaded or doesn't; can't gradually accept traffic. (3) **Cost** — at $3/hour idle, over-provisioning hurts immediately. (4) **Spot interruption hurts more** — losing a GPU instance loses 3-7 minutes of replacement time. Mitigations: **pre-warm capacity** (predictive scaling based on time of day), **model sharing** (load multiple model variants on one GPU via LoRA), **request hold-and-retry** during scale-up window, **mixed fleet** of on-demand + reserved + spot with priority routing.

### Q127. Walk me through a RAG (retrieval-augmented generation) architecture.

(1) **Ingestion**: documents → chunked (200-500 tokens) → embeddings via embedding model → stored in vector DB (pgvector / Pinecone / Weaviate / Milvus) with metadata (source, timestamp, doc-level access controls). (2) **Query path**: user query → embedding → **hybrid search** (vector ANN + BM25 keyword) → top-K (typically 10-50) → optional **reranker** (cross-encoder for quality) → top-N (typically 3-10) → assembled context → LLM generates answer with citations. (3) **Operational**: monitor recall (did we retrieve relevant docs), embedding drift (re-embed when model changes), citation accuracy (does the answer ground in the retrieved docs). The senior signal: knowing it's hybrid (not pure vector), knowing the reranker step, and explicitly designing for stale-data handling.

### Q128. How do you do AI agents safely — when the agent can take real actions?

Defence in depth. (1) **Tool sandboxing** — agents can only call a whitelisted set of tools with typed inputs; no arbitrary code execution unless in an isolated sandbox (Firecracker, gVisor). (2) **Action budgets** — caps on tool calls per turn, money spent, API calls made. (3) **Human-in-the-loop** for irreversible actions — agent proposes, human approves anything destructive / financial / external-facing. (4) **Audit log** of every action with the prompt that triggered it (for forensic review). (5) **Capability boundaries** — agents operate within bounded contexts (one user's data, one project, one timeframe); never cross-tenant. (6) **Output filtering** — moderation on agent responses to catch prompt-injection-driven exfiltration. The honest answer: agentic safety is an unsolved research problem; production deployments today over-rotate to human review.

### Q129. Token-level streaming response — what changes architecturally?

Traditional request/response: client sends, server processes, server returns. LLM responses arrive **token by token over seconds**. Streaming protocols: **SSE** (most common — browser-native, HTTP/1.1 friendly), **WebSocket** (when bidirectional like agent interactions), **HTTP/2 streaming**. Implications: (1) **Connection holds for seconds** — sticky load balancing, longer keep-alive timeouts. (2) **Backpressure** — slow client → don't buffer all tokens; let the model pause. (3) **Cancellation propagation** — user closes tab → cancel inference (saves GPU time on dropped requests; meaningful $$). (4) **Observability** — measure time-to-first-token separately from total latency; both are user-experienced metrics.

### Q130. Distribute a 100 GB model file to 1000 inference machines on a constrained network link. How?

A 2026 staff-favourite. Naive approach: each machine pulls from S3 — 100 TB cross-region transfer, hours, expensive. Better: (1) **BitTorrent-style P2P**: one downloader becomes a seeder; new downloaders pull from the swarm. Total transfer is bounded by N × file size at network limit, not N² × file size. (2) **Tiered caching**: regional / rack-local caches; the rack pulls once, machines pull from rack. (3) **Compression** (zstd level 19 on weights — 30-50% savings) and **delta updates** (only changed weights for fine-tunes). Real-world: **Meta's Torchcache**, **Uber's Petastorm**, Kubernetes-native solutions like **Dragonfly**. Senior signal: P2P + tiered caching, not "just S3 with retries".

### Q131. Feature stores — what problem do they solve in ML systems?

The bug: training computes features one way (batch pipeline, Pandas, last week's data); production serves features a different way (real-time API, different code, recent data). Result: model trained on slightly different inputs than it serves → performance gap. **Feature store** (Feast, Tecton, Featureform, Vertex AI Feature Store): single definition of each feature, used by both training (offline store: warehouse) and serving (online store: Redis-like). Guarantees train/serve consistency. Bonus: feature reuse across models, freshness monitoring, lineage. Operational complexity is real — adopt when you have multiple models, not your first model.

### Q132. What's the inference latency breakdown for an LLM request — and where are the levers?

(1) **Time-to-first-token (TTFT)**: prompt processing (the LLM reads the input) — proportional to input length, often 50-500ms on a 7B model, seconds on 70B+. (2) **Time-per-output-token (TPOT)**: 10-50ms per token typically. (3) **Total latency** = TTFT + TPOT × output_length. Levers: (a) **smaller / quantised models** (4-bit, 8-bit GPTQ/AWQ — 2-3× faster, mild quality loss), (b) **prompt caching** (Anthropic / OpenAI APIs — cache the prefix, slash TTFT for chatbots), (c) **speculative decoding** (small model proposes tokens, large model verifies — 2-3× speedup), (d) **prefix sharing** in batching (vLLM PagedAttention), (e) **shorter outputs** via response-length caps.

---

## Modern Frameworks: Kafka, Flink, Temporal

### Q133. What's KRaft and why did Kafka replace ZooKeeper with it?

ZooKeeper was Kafka's external coordination service — stored metadata about brokers, topics, partitions, consumer offsets. Operational complexity (separate cluster, separate version compatibility matrix, separate failure mode). **KRaft** (Kafka Raft, GA in Kafka 3.5+): Kafka's own internal Raft-based metadata cluster — same Kafka brokers host the control plane via a quorum. Wins: one cluster to operate, faster controller failover (seconds vs minutes), supports orders of magnitude more partitions (millions vs ~200k), simpler deployment. As of 2026, **KRaft is the default** and ZooKeeper is deprecated for new Kafka clusters.

### Q134. Kafka exactly-once semantics — how does the transactional API actually work?

Within Kafka, producers can write to multiple partitions atomically using **transactional API**: `producer.beginTransaction()`, write to multiple topics/partitions, `producer.commitTransaction()`. Consumers configured with `isolation.level=read_committed` only see committed messages. Combined with **idempotent producers** (`enable.idempotence=true` — dedupes producer retries via sequence numbers), this gives exactly-once within Kafka. **Across systems** (Kafka → Postgres, Kafka → external API): still at-least-once with idempotent consumers; Kafka transactions don't span external resources. The senior take: "exactly-once within Kafka via transactions + idempotent producers; across system boundaries, at-least-once + idempotent consumers."

### Q135. When do you reach for Flink over Kafka Streams?

**Kafka Streams**: a library embedded in your JVM app; deploys with your service; great for stateless / lightly-stateful processing co-located with Kafka. **Flink**: a separate cluster, designed for stateful streaming at scale — event-time windowing with watermarks, sophisticated state management (RocksDB-backed), exactly-once across complex pipelines, streaming SQL. Use Flink for: complex windowing, joins across multiple streams, large state (TB scale), event-time correctness against late data, ML feature pipelines. Use Kafka Streams for: per-service real-time enrichment, simple aggregations, when you don't want to operate a separate cluster. Flink dominates the low-latency / large-state streaming space in 2026.

### Q136. What is Temporal and what does it solve that wasn't well-solved before?

**Temporal** (and Cadence, its predecessor at Uber): a workflow orchestration engine where workflow code is **durable and replayable**. Write a workflow in code (`async def order_workflow(order_id)`), call activities (each an idempotent unit of work). Temporal persists every step's input + output; if the worker crashes mid-workflow, a new worker resumes from the persisted state — workflow looks like uninterrupted execution to the developer. Solves: (1) long-running multi-step workflows that previously needed bespoke state machines + retries + timer logic, (2) sagas with compensation, (3) human-in-the-loop workflows (sleep for 7 days, then check). Replaces: hand-rolled state machines + cron + queue glue. Production-grade orchestrated saga engine.

### Q137. AWS Step Functions vs Temporal vs Cadence — when do you pick which?

**AWS Step Functions**: serverless, AWS-native, JSON-defined workflows, integrates with all AWS services. Good for: AWS-centric pipelines, infrequent runs, simple workflows. Limits: complex logic in JSON gets ugly, vendor lock-in. **Temporal**: code-defined workflows in Go/Java/TypeScript/Python; richer programming model; self-hostable or Temporal Cloud. Best for: complex business workflows, multi-cloud, when you want workflow logic in your team's language. **Cadence**: Uber's predecessor (Temporal is the fork); similar capabilities; less momentum than Temporal in 2026. Default modern choice: **Temporal** unless you're deep in AWS and Step Functions covers your needs.

### Q138. Sidekiq / Celery / Hangfire — what tier of "background job" are these?

The lighter tier: **job queues for periodic / async work**. Sidekiq (Ruby/Redis), Celery (Python/Redis/RabbitMQ), Hangfire (.NET/SQL/Redis), Bull/BullMQ (Node). Use for: send-email, generate-report, retry-failed-payment, scheduled cleanup. Compared to Temporal: simpler programming model (each job is independent), no built-in long-running workflow state, no compensations. Use Sidekiq-tier for **single-step async jobs**; reach for Temporal when steps span hours/days and need to coordinate. The mistake is using Sidekiq for what should be a Temporal workflow — you end up rebuilding workflow state in your job code.

### Q139. Real-time data warehouse — what's the modern shape?

**Old shape**: batch ETL daily; data lands in BigQuery / Snowflake / Redshift; analysts query yesterday's data. **Modern shape**: **streaming ETL** via Flink / Kafka Connect / Materialize / RisingWave → real-time aggregates pushed into the warehouse continuously. Dashboards reflect data 1-second-stale instead of 24-hour-stale. Specific products: **Materialize** (streaming SQL engine, "incremental view maintenance"), **RisingWave**, **ClickHouse** with Kafka engine, **Tinybird**. The senior signal: knowing the line between **batch warehouse** (BigQuery / Snowflake for analytics), **real-time OLAP** (ClickHouse, Druid, Pinot for live dashboards), and **operational store** (Postgres for app data) — and not confusing them.

### Q140. Edge functions / edge compute — when does it pay off?

Cloudflare Workers, Vercel Edge Functions, AWS Lambda@Edge, Deno Deploy. **Edge compute** runs at the CDN POP — sub-50ms latency for users globally, no cold start (V8 isolates), but constrained runtime (no traditional Node modules, time/CPU/memory limits, no native binaries). Wins: (1) **personalised CDN responses** without origin round trips (A/B test routing, geo routing, auth checks). (2) **API aggregation** at the edge (compose multiple backend calls, return one response). (3) **Static + dynamic** in one — render a page with edge-fetched content. Loses: heavy compute, large dependencies, stateful workloads. Match the workload to the runtime; edge isn't a universal replacement for backend services.

---

## War Stories — Bring Receipts

Senior/staff system design interviews care less about pattern catalogue trivia and more about whether you've felt the pain. Prepare *one production war story per major area*. The shape:

> *"At &lt;company&gt;, our &lt;symptom&gt; alert fired at &lt;time&gt;. We saw &lt;metric&gt; climbing, traced it to &lt;root cause&gt;. We mitigated with &lt;immediate action&gt; and the permanent fix was &lt;architectural change&gt;. The lesson was &lt;takeaway&gt;."*

Have one ready for: a **retry storm** (synchronised retries with no jitter that took down a downstream); a **cache stampede** that DDoS'd your DB when a hot key expired; a **replication lag** outage where read-your-writes broke a payment flow; a **dual-write inconsistency** that you eventually fixed with outbox; a **circuit breaker that false-tripped** at peak; a **noisy neighbour** scenario you fixed with bulkheads; a **migration that took an exclusive lock** and blocked production; a **multi-region failover** where async replication lost recent commits; a **deploy that wiped the cache** and 10×ed DB load. These are the questions that separate "read about distributed systems" from "ran them at scale".

---

*End of primer. ~125 questions across 20 senior-interview pattern areas, derived from the vault's `System Design Path.md` curriculum. Pair with the "Example Questions" source (worked design problems like rate limiter, URL shortener, etc.) for the full system-design toolkit. Coverage hits ~85% of what shows up in real senior/staff system design rounds; the remaining 15% is whichever specialisation the role probes (real-time, ML serving, payments, mobile-scale fanout) — pick one and study deep.*
