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

### Summary

**What this topic covers**

The handful of mental primitives that every senior system design answer silently leans on: the **latency hierarchy** (L1 → memory → SSD → same-DC RTT → cross-region RTT), **capacity estimation** (QPS, bandwidth, storage from user counts), the precise definitions of **reliability / availability / scalability / performance**, the **percentile ladder** (p50 / p99 / p99.9) and why tails amplify under fan-out, **Little's Law** (`L = λ × W`) as the universal sizing equation, and the three competing observability frameworks — **USE** (resources), **RED** (services), and Google SRE's **Four Golden Signals**. The 7 questions in this topic are the warm-up of every senior round; getting them tight is what buys you airtime for the harder questions later.

**Mental model**

Think of system design as a constant arithmetic game played against the physics of the network. Every design choice is bounded by three numbers: the **latency budget** (~50ms for a p99 user-facing target leaves no room for a synchronous cross-region call at 100ms RTT), the **utilisation ceiling** (queueing theory says you can't run hot — utilisation past ~70% turns tail latency exponential), and the **concurrency in-flight** that Little's Law forces on you (1000 RPS × 50ms service time = 50 concurrent in-flight, period). The right framing for every prompt is: "given the back-of-envelope numbers, what is the system *physically* able to do?" Combined with the percentile mindset — your p50 is a lie at scale because fan-out turns sub-call p99s into request-level p99.9s — you can dismiss bad designs in 30 seconds without simulation. Systems like Netflix's Hystrix, Google's hedged-request fabric, and AWS's load shedders are all engineered against these primitives.

**Key terms**

- **Latency numbers** — L1 ~1ns, memory ~100ns, SSD ~16µs, same-DC RTT ~0.5ms, cross-region RTT 50-150ms. Decide design feasibility in seconds.
- **QPS estimation** — users × actions ÷ seconds; apply 2-4× peak factor, then 3-5× safety for surge/failover.
- **Reliability vs availability** — reliability is "doesn't lose data under fault"; availability is "% time serving requests". Orthogonal axes.
- **p50 / p99 / p99.9** — percentile latency; p99.9 is what fan-out users actually experience.
- **Tail amplification** — N parallel sub-calls means request-level p50 ≈ sub-call p99 for N=100.
- **Little's Law** — `L = λ × W`; drives thread pools, connection pools, queue depth.
- **USE method** — Utilisation, Saturation, Errors. Brendan Gregg's resource-level dashboard.
- **RED method** — Rate, Errors, Duration. Per-service dashboard.
- **Four Golden Signals** — Latency, Traffic, Errors, Saturation. SRE alerting + SLO foundation.
- **Hedged requests** — Google's tail-cutting technique; fire to a second replica if p95 elapses.

**Why interviewers ask this**

Three signals at once. (1) **Numerical fluency** — staff candidates quote the latency numbers without hesitating; if you have to derive them mid-interview you've already lost the airtime. (2) **Method over answer** — capacity estimation is graded on whether you write assumptions on the whiteboard, not whether you hit the right number. Interviewers want to see "100M DAU × 10 actions / 86,400 = ~12k RPS, peak 4× = 50k, design for 3× = 150k". (3) **Tail awareness** — the p50-vs-p99 question is the trap that separates senior from junior. Anyone who says "p50 is 5ms so we're fine" loses the room; the correct answer names GC pauses, lock contention, cold caches, fan-out amplification, head-of-line blocking, and noisy neighbours as the six suspects, then names the diagnostic tools (flame graphs, distributed tracing).

**Common confusions**

- "Reliability = availability" — no; you can be reliable but unavailable (offline correctness), or available but unreliable (serving wrong data).
- "p50 is the typical user experience" — false at scale; a user making 100 requests will probably hit at least one p99-bad one per session.
- "More capacity fixes tail latency" — not if the tail is GC pauses or lock contention; you need root-cause diagnosis, not headroom.
- "Little's Law only applies to queues" — applies to any system in steady state; thread pools, connection pools, in-flight requests.
- "USE and RED measure the same thing" — USE is for resources (CPU is saturated), RED is for services (this endpoint's error rate). Use both.
- "Peak = 2× average is good enough" — for daily-cycle apps maybe; viral spikes and failover demand 3-5× peak as the design target.

**What follows from this topic**

Every later section assumes you've internalised these primitives. The latency ladder dictates Networking choices (HTTP/3 vs HTTP/2, edge vs origin). Capacity estimation dictates Database Scaling (when sharding crosses the cost/benefit line). Little's Law dictates Resilience (timeout ordering, backpressure, retry budgets). Tail amplification dictates Caching (stampede prevention, hot key handling) and Resilience (hedged requests). Golden Signals dictate Observability (SLOs, error budgets, multi-burn-rate alerts). If this topic feels shaky, fix it before going further — the rest of the primer compounds on these foundations.

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

### Summary

**What this topic covers**

The wire protocols and routing fabric that connect every distributed system together. Three layers of concern: (1) the **request lifecycle** — what happens between L3 IP, L4 TCP, TLS, and L7 HTTP for a single HTTPS call, and which round trips are unavoidable vs cacheable; (2) the **HTTP protocol family** — HTTP/1.1 vs HTTP/2 (multiplexing) vs HTTP/3 (QUIC over UDP) and the practical differences for tail latency and mobile networks; and (3) the **internal vs edge dichotomy** — gRPC for typed service-to-service calls, REST at the public boundary, WebSockets vs SSE vs long polling for browser push, and the CDN cache header set (`Cache-Control`, `stale-while-revalidate`, `stale-if-error`) that powers modern edge networks. The 7 questions also cover **anycast** — the BGP-level trick that makes Cloudflare and Google DNS resilient — and the diagnostic playbook for "the site is slow from country X".

**Mental model**

Networking decisions are dominated by **round trips, not bytes**. A modern internet path adds ~50ms cross-region, and most production latency is RTT × number of round trips, not bandwidth. That's why TLS 1.3 (1 RTT, 0-RTT with resumption) replaced TLS 1.2 (2 RTT), why HTTP/2 multiplexing matters less than people think (head-of-line blocking still bites at the TCP layer), and why HTTP/3's QUIC is a meaningful win for mobile users who switch networks mid-session. The second mental shift is **where you terminate matters**: terminate TLS at the edge (Cloudflare, AWS CloudFront, Fastly) and origin RTT drops because the edge has warm connections. Anycast routes users to the topologically nearest POP automatically — failure of one POP is invisible because BGP reconverges. Inside the mesh, gRPC over HTTP/2 with persistent connections is the right call; at the public edge, REST plus HTTP/3 plus aggressive CDN caching is the modern default.

**Key terms**

- **L3 / L4 / L7** — IP routing / TCP transport (with congestion control like BBR) / HTTP application semantics.
- **TLS handshake** — 2 RTT on TLS 1.2, 1 RTT on TLS 1.3, 0 RTT with session resumption.
- **HTTP/2** — binary framing, multiplexed streams on one TCP connection; suffers TCP head-of-line blocking.
- **HTTP/3 / QUIC** — UDP-based, independent streams, 0-RTT, connection migration across IP changes.
- **gRPC** — Protobuf-typed RPC over HTTP/2; supports unary + streaming; needs gRPC-Web for browsers.
- **Anycast** — same IP advertised from multiple POPs via BGP; routes users to nearest, fails over transparently.
- **GeoDNS** — DNS-resolution-time location targeting; complementary to anycast.
- **Server-Sent Events (SSE)** — unidirectional server→client over HTTP; auto-reconnect via `EventSource`.
- **WebSockets** — full-duplex upgrade from HTTP/1.1; stateful, sticky load balancing required.
- **stale-while-revalidate** — CDN header: serve stale up to N seconds while fetching fresh; hides origin latency.
- **Connection migration** — QUIC feature; survives client IP change without reconnecting (WiFi → LTE).

**Why interviewers ask this**

Three signals. (1) **Protocol-level fluency** — staff candidates can name which RTTs are unavoidable vs cacheable, and pick HTTP/3 vs HTTP/2 vs HTTP/1.1 with a reason ("HTTP/3 because our users are mobile and connection migration matters"). (2) **Edge / origin reasoning** — knowing that CDN caching with `s-maxage` and `stale-while-revalidate` is the single highest-ROI latency win for user-facing content separates candidates who've shipped production from candidates who've only done internal services. (3) **Diagnostic instinct** — the "site is slow from one country" question is a multi-layer triage problem: DNS → TLS → network path → CDN coverage → app latency → bundle size. The right answer walks down the OSI stack with diagnostic tools (`mtr`, `dig`, WebPageTest, Chrome DevTools) at each layer.

**Common confusions**

- "HTTP/2 fixes head-of-line blocking" — only at the HTTP layer; TCP still serialises packet retransmits, blocking all streams.
- "WebSockets are always better than SSE" — SSE is simpler, HTTP-friendly, and auto-reconnects natively; pick it for one-way push.
- "gRPC is faster, use it everywhere" — gRPC is harder to debug, hard to CDN-cache, needs shimming for browsers. Reserve for service-to-service.
- "Anycast and GeoDNS are competitors" — they're complementary; modern stacks use both at different layers.
- "TLS handshake is always 2 RTT" — TLS 1.3 is 1 RTT, and session resumption hits 0-RTT.
- "CDN cache headers are just `Cache-Control: max-age`" — modern CDNs respect `s-maxage`, `stale-while-revalidate`, and `stale-if-error` — these are the killer features.

**What follows from this topic**

Networking primitives feed directly into Load Balancing (where L4 vs L7 decisions live), Caching (CDN is just a cache at the edge), Resilience (timeout ordering depends on knowing RTTs at each hop), and Real-Time (WebSocket vs SSE for push). The cost lever in Cost & Capacity Engineering is partly networking — egress bandwidth is the silent killer in cross-region designs. Get this topic right and the rest of the primer's protocol references make sense without re-derivation.

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

### Summary

**What this topic covers**

How traffic gets distributed across a fleet of backends, and how that distribution holds up under realistic conditions: unequal connection lifetimes, sick backends, hot keys, and partial network partitions. Six questions cover the foundational dichotomies and one staff-tier diagnostic. (1) **L4 vs L7 load balancers** — payload-blind TCP forwarding (HAProxy/NLB) vs HTTP-aware routing (NGINX/Envoy/ALB); (2) **consistent hashing** with virtual nodes (Cassandra, DynamoDB, Discord) and its cousin rendezvous hashing; (3) **power of two choices** — the surprisingly effective O(1) approximation of least-connections; (4) **active vs passive health checks** with Envoy-style **outlier detection** as the modern hybrid; (5) the **service mesh vs API gateway** distinction (east-west vs north-south); and (6) the canonical senior diagnostic: the load balancer says traffic is even, but one backend is melting — what's actually going on?

**Mental model**

Load balancing is a **scheduling problem disguised as a routing problem**. "Even distribution" is the wrong target because backends don't have equal capacity, equal connection lifetimes, or equal per-request work. The right targets are **balance work, not connections** (use least-connections or per-request L7 routing for HTTP), and **isolate failure** (consistent hashing limits the blast radius of a backend swap to 1/N of keys, vs the entire keyspace under naive modulo). The other mental shift: **load balancers are observability points**, not just traffic distributors — Envoy's per-route metrics, outlier ejection counters, and circuit-breaker tripping signals are how you find sick backends before users notice. Power-of-two-choices is the canonical example of "less coordination = better outcome": polling every backend's load to pick the least-loaded one is slower than picking two at random because the global view is stale by the time you act on it. Production systems (Netflix Ribbon, Finagle, Envoy) all converged on this insight.

**Key terms**

- **L4 load balancer** — TCP/UDP forwarding, payload-blind, fast, protocol-agnostic. HAProxy TCP mode, AWS NLB.
- **L7 load balancer** — HTTP-aware, routes by path/header/host, terminates TLS, per-route policy. NGINX, Envoy, AWS ALB.
- **Consistent hashing** — hash keys + nodes onto a ring; adding/removing a node moves 1/N of keys, not all.
- **Virtual nodes (vnodes)** — each physical node owns hundreds of ring positions; smooths distribution.
- **Rendezvous hashing** — `argmax(hash(node, key))`; no ring; simpler for small N.
- **Power of two choices** — pick 2 backends at random, route to less-loaded; max load O(log log N).
- **Active health checks** — periodic `/health` probes; predictable but stale.
- **Passive health checks** — observe real traffic for errors/latency; reactive.
- **Outlier detection** — Envoy hybrid; passively counts errors, ejects + probes for recovery.
- **API gateway** — north-south traffic (external → internal); auth, rate limit, transform.
- **Service mesh** — east-west traffic (service ↔ service); sidecar Envoys for mTLS, retries, observability.
- **Connection draining** — graceful shutdown phase where LB stops sending new requests but lets in-flight finish.

**Why interviewers ask this**

Two signals. (1) **You've felt the production pain**. The "evenly distributed connections, one backend melting" diagnostic is the dead giveaway between candidates who've operated systems and candidates who've only designed them. The answer requires knowing that **long-lived connections + recent deploys = uneven steady-state load** — A restarts, its connections rebalance to B and C, A comes back with zero connections, new clients land on A but new clients are *active* clients, so A's per-connection work is higher even though its connection count is lower. (2) **Layer-fluency**. Mixing up API gateway and service mesh in a senior interview is a junior tell. Kong / Apigee / AWS API Gateway live at the edge with auth + rate limiting + monetisation; Istio / Linkerd / Consul Connect live between services with sidecar mTLS and retries. Both can coexist.

**Common confusions**

- "L7 is always better than L4" — L4 is faster, supports any protocol (PostgreSQL, Redis, custom binary), critical for raw TCP services where latency dominates.
- "Consistent hashing eliminates rebalancing" — it eliminates *most* of it; you still move 1/N when the topology changes.
- "Least-connections is the gold standard" — it's O(N) to scan, and the global view is always stale. Power of two choices wins in practice.
- "Service mesh = API gateway" — north-south vs east-west; they sit at different points and solve different problems.
- "Sticky sessions are fine" — they break load balancing on deploy and create hot backends; avoid unless protocol requires (WebSockets).
- "Active health checks catch everything" — probe interval = staleness window; passive checks react faster to real degradation.

**What follows from this topic**

Load balancing patterns feed into Caching (consistent hashing in Redis Cluster), Database Scaling (the same hash ring for shard ownership), Resilience (outlier detection as a circuit-breaker precursor), and Service Architecture (service mesh as the substrate for mTLS, retries, timeouts everywhere). The hot key problem in Caching is the same shape as the whale problem in sharding — both are "uniform hashing doesn't mean uniform load".

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

### Summary

**What this topic covers**

The storage substrates you compose every distributed system out of, and how they earn or fail their place against modern Postgres. Five questions across (1) the **B-tree vs LSM-tree** dichotomy — read-optimised in-place updates (Postgres, MySQL InnoDB) vs write-optimised append-only with compaction (RocksDB, Cassandra, ScyllaDB); (2) **when Cassandra beats Postgres** — write rates above ~100k/sec, multi-region active-active, billion-row tables with bounded query patterns; (3) **column-oriented storage** for analytics — ClickHouse, DuckDB, Snowflake, BigQuery, Parquet — and why compression + vectorisation + column-scan-only wins by 10-100× on OLAP; (4) **S3 / object storage** as the 11-nines, infinite-scale, strongly-consistent-since-2020 blob layer; and (5) the contrarian staff-tier answer — "just put everything in Postgres" is right more often than candidates believe.

**Mental model**

Storage engines split along **write path vs read path**. B-trees update pages in place — every write is a page modification protected by the WAL, every point lookup is 3-4 page hits, range scans are sequential within the tree. LSM-trees buffer writes in an in-memory memtable, flush to immutable sorted SSTables on disk, and pay the cost later via **compaction** that merges levels. Writes are sequential and cheap; reads may hit multiple SSTables (read amplification), mitigated by bloom filters and tiered/leveled compaction. The third axis is **row vs column**: row stores (Postgres, MySQL) put all columns of one row together — great for OLTP point lookups; column stores (ClickHouse, Snowflake) put all values of one column contiguously — great for analytical scans because compression hits 5-20× and SIMD vectorisation crushes aggregation. The fourth axis is **block vs object**: EBS-style block storage is low-latency-high-cost; S3-style object storage is high-latency-low-cost-infinite. Modern designs are **layered** — Postgres for OLTP, ClickHouse for OLAP, S3 for the data lake underneath, Redis for the hot cache. The senior insight: most systems below 1TB don't need the second engine yet.

**Key terms**

- **B-tree** — balanced page tree, in-place updates, optimised for reads. Postgres, MySQL InnoDB, MongoDB WiredTiger.
- **LSM-tree** — memtable → SSTable + compaction; write-optimised, sequential I/O. RocksDB, Cassandra, ScyllaDB, BigTable.
- **WAL (Write-Ahead Log)** — durability primitive; writes go to log before pages, replayed on crash recovery.
- **Compaction** — LSM background merge of SSTables; trades write amplification for read amplification.
- **Tiered vs leveled compaction** — tiered (Cassandra default) batches sizes; leveled (RocksDB default) bounds level size for better reads.
- **Row store** — all columns of one row together; OLTP-friendly.
- **Column store** — all values of one column together; OLAP-friendly; 5-20× compression, vectorised execution.
- **OLTP vs OLAP** — transactional (point ops, ms latency) vs analytical (aggregate scans, seconds OK).
- **Object storage (S3)** — 11 nines durability, strongly consistent reads since 2020, ~tens of ms latency, dirt cheap.
- **Storage tiers** — Standard → IA → Glacier → Deep Archive; retrieval cost vs storage cost tradeoff.
- **Polyglot persistence** — multiple databases for different workloads; expensive, increasingly avoidable.

**Why interviewers ask this**

Two signals. (1) **Tooling justification** — staff candidates can defend "we used Cassandra" or "we used ClickHouse" with quantitative thresholds (write rate, query pattern, multi-region requirement). The wrong answer is "Cassandra because it scales"; the right answer names the specific Postgres ceiling you hit. (2) **Anti-overengineering instinct** — 2026 interviews increasingly reward the candidate who picks Postgres for a 1TB workload and explains *when* they'd reach for Cassandra or ClickHouse, vs the candidate who reflexively reaches for polyglot persistence. Modern Postgres handles JSON + full-text + GIS + pgvector + Citus extensions, scales to ~10-50TB, ~10k writes/sec sustained, ~100k reads/sec with replicas. Reaching for specialist tools before you hit a *specific* Postgres limit is a junior tell.

**Common confusions**

- "LSM is always faster than B-tree" — for writes, yes; for reads, often slower due to multi-SSTable lookups; bloom filters mitigate but don't eliminate.
- "Column stores replace row stores" — no; OLTP point updates are catastrophic on column stores (every column file changes).
- "S3 is a database" — it isn't; high latency, no atomic multi-object ops, no transactions. Use for blobs, data lakes, backups.
- "Cassandra is the obvious scale-out choice" — only if you can design schema-per-query upfront; ad-hoc queries are unforgiving.
- "Postgres tops out at 100GB" — modern Postgres on a tuned box handles TBs comfortably; the wall is workload-specific, not size-specific.
- "Eventual consistency in S3" — was true historically; since 2020 S3 provides strong read-after-write consistency.

**What follows from this topic**

Storage foundations feed directly into Database Scaling Patterns (the scaling ladder for Postgres, sharding strategies, replication), Caching (cache-aside on top of which engine), CAP/PACELC (Cassandra is AP/EL, Spanner is CP/EC, Postgres single-region is CP), and Search (Elasticsearch when Postgres FTS hits its wall). The "just Postgres" instinct is the senior-engineer humility move that the rest of the primer repeatedly returns to.

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

### Summary

**What this topic covers**

The disciplined order of escalation for scaling a relational database from "single box" to "horizontally sharded across regions", and the bugs each rung introduces. Seven questions: (1) the **scaling ladder** — vertical → read replicas → query optimisation → caching → functional partitioning → table partitioning → sharding, and why each step is a one-way door; (2) **read replicas and replication lag** — the read-your-writes bug and its three escalating fixes; (3) **sharding strategies** — hash, range, lookup service, geographic — and the killer flaw of each; (4) the **whale problem** — 1% of users having 90% of the data and how to isolate them; (5) **quorum math** — the `W + R > N` rule and the 3-replica sweet spot from DynamoDB / Cassandra; (6) **single-leader vs multi-leader vs leaderless** replication topologies and when each fits; and (7) a staff-tier diagnostic on handling 30 seconds of replication lag without papering over the root cause.

**Mental model**

Database scaling is a **ladder, not a buffet**. Every step adds operational complexity that doesn't compose down — once you shard, you don't un-shard; once you go multi-leader, you inherit conflict resolution forever. The discipline is to climb only as high as you must, and to exhaust the cheap rungs before reaching the expensive ones. The second mental shift: **replication is async by default**, which means **eventual consistency between primary and replicas is a fact**, not a bug — read-your-writes is the standard application-level concern. Async replication scales (one primary, N replicas, no coordination); synchronous replication trades throughput for durability (Postgres `synchronous_commit`, Spanner-style cross-region). The third mental shift: **uneven data is more common than uneven keys**. Hash sharding distributes keys evenly but doesn't distribute load evenly — Twitter has celebrities, Slack has Salesforce-sized customers, payments has whales who post 1000× the merchant volume. Production sharding designs always have a whale story.

**Key terms**

- **Vertical scaling** — bigger box; 24 TB RAM / 200+ cores available on modern instances; the right first step.
- **Read replica** — async streaming replica; reads to replica, writes to primary; lag is the bug pattern.
- **Replication lag** — ms to minutes; drives read-your-writes routing or causal consistency tokens.
- **Functional partitioning (federation)** — split databases by feature (users DB, orders DB); independent scaling.
- **Sharding** — horizontal partitioning across multiple primaries; one-way door.
- **Hash sharding** — `hash(key) % N`; even key distribution; range queries hit every shard.
- **Range sharding** — contiguous key ranges; easy range scans; hotspots on recent data.
- **Lookup service (directory)** — key → shard map via metadata service; flexible, SPOF risk.
- **Whale problem** — skewed tenants concentrate load; mitigate via secondary partitioning or dedicated shards.
- **Quorum (W + R > N)** — guarantees read sees latest write; 3-replica W=2/R=2 is the standard.
- **Single-leader / multi-leader / leaderless** — Postgres-style / Aurora multi-master / Dynamo-style; each picks different consistency tradeoffs.
- **Read-your-writes** — session guarantee: you see your own writes; fixed via primary routing or causal tokens.

**Why interviewers ask this**

Two signals. (1) **The order of escalation matters more than the destination**. Staff candidates climb the ladder in order — "we'd start with vertical scaling, then read replicas, then caching, then federation, then sharding" — and only reach for the next rung when the current one demonstrably failed. Junior candidates jump straight to sharding because "scale". (2) **Replication lag is the canonical hidden bug**. The 30-second-lag senior question has three user-visible bugs (vanished writes on next read, double-charge if retried, stale UI) and the right answer names all three plus the long-term fix ("investigate why lag is 30s, don't just paper over"). The whale question is the second-most-asked diagnostic; the right answer is "the question isn't how to distribute evenly, it's how to isolate impact".

**Common confusions**

- "Sharding is the goto answer at scale" — modern Postgres on a tuned box handles 10TB and 10k writes/sec; most teams shard 3-5 years too early.
- "Consistent hashing solves the whale problem" — it solves topology change; it doesn't solve uneven *load per key*.
- "Quorum reads guarantee linearizability" — only against concurrent writes; doesn't prevent stale reads under leader failover.
- "Multi-leader is just multi-region active-active" — it inherits conflict resolution: LWW (lossy), CRDTs (mergeable), or app-level merge.
- "Read replicas eliminate read load on the primary" — they shift it, but replication lag is now your application's problem.
- "Functional partitioning is a microservices thing" — no, it's a database pattern; you can do it inside a monolith just fine.

**What follows from this topic**

Scaling patterns feed Caching (caching is rung 4 on the ladder), CAP/PACELC (replication topology choices map to PACELC labels), Consensus (single-leader fail-over is what Raft solves), Messaging (CDC reads the WAL, depends on knowing replication mechanics), and Anti-patterns (premature sharding is the canonical smell). The discipline of "earn each rung" generalises to the rest of system design.

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

### Summary

**What this topic covers**

The patterns and pathologies of putting a cache in front of a slow data source. Six questions covering (1) the **four cache-update patterns** — cache-aside, read-through, write-through, write-back — and the practical tradeoffs in race conditions, freshness, and durability; (2) **cache stampedes** — the thundering-herd failure when a hot key expires and 1000 concurrent misses hit the database, plus the four mitigations (single-flight locks, stale-while-revalidate, XFetch probabilistic refresh, cache warming); (3) the **hot key problem** — one viral post or celebrity user generating 100× the load of others, and the five fixes from client-side replication to broadcast trees; (4) **eviction policies** — LRU vs LFU vs **W-TinyLFU** (Caffeine's admission filter that empirically beats both); (5) **Redis-specific scaling traps** — the single-threaded data plane, hash slots, pipelining, Lua scripts, persistence trade-offs; and (6) the staff-tier diagnostic: cache hit rate dropped from 95% to 70% after a deploy — triage.

**Mental model**

A cache is **an optimisation layered on top of a source of truth**, never the source of truth itself. The instant you start treating Redis as the durable store, you've signed up for data-loss failure modes (eviction under memory pressure, async replication losing writes on failover, AOF persistence not equivalent to a real WAL). The second mental shift: **caching changes failure modes, it doesn't eliminate them**. The cache turns "every read hits the database" into "rare reads hit the database with massive amplification at the wrong moment" — stampedes are the canonical example. Production caches are designed against the stampede shape: stale-while-revalidate so the cache is never *empty* for hot keys, probabilistic early refresh (XFetch) so 1000 clients don't simultaneously notice expiry, and per-key single-flight locking so the first miss serves the rest. The third mental shift: **hot keys break uniform-hashing assumptions**. One celebrity user can melt one cache shard's CPU while the other 99 sit idle; the fix is per-key replication or sharding-by-suffix, not "buy a bigger Redis box". Caffeine's W-TinyLFU is the canonical example of cache-quality engineering — admission filters out scans, frequency sketch tracks long-term heat.

**Key terms**

- **Cache-aside (lazy)** — app reads cache, falls through to DB on miss, populates cache; the default pattern.
- **Read-through** — cache fronts DB and knows how to load on miss; cleaner code, opaque debugging.
- **Write-through** — write to cache + DB synchronously; always-fresh cache, slower writes.
- **Write-back (write-behind)** — write to cache, async to DB; fastest writes, data loss risk.
- **TTL (time-to-live)** — expiry timer; balance freshness vs hit rate.
- **Cache stampede** — hot key expires, N concurrent misses hit the DB simultaneously.
- **Single-flight (per-key locking)** — first miss acquires lock, others wait for populated value.
- **Stale-while-revalidate** — serve expired value while background refresh runs; smooths expiry cliff.
- **XFetch** — probabilistic early refresh based on TTL + last fetch time; eliminates synchronised expiry.
- **W-TinyLFU** — Caffeine's eviction policy; admission window + frequency sketch; beats LRU/LFU on real workloads.
- **Hot key problem** — single key receives 100× load of others; melts one cache shard.
- **Hash slots (Redis Cluster)** — 16,384 slots; multi-key commands require same-slot keys via `{hashtag}` syntax.

**Why interviewers ask this**

Three signals. (1) **Stampede awareness** — cache stampedes are the canonical "expected outage" most teams under-engineer until it bites them. Staff candidates name single-flight + stale-while-revalidate + probabilistic refresh without prompting. (2) **Production triage** — the "cache hit rate dropped to 70% after a deploy" question is graded on suspect ordering: key format change (most common), TTL change, deploy invalidation, working set growth, request-scoped value bug. The right answer names the diagnostic ("log a hash of the cache key per request"). (3) **Redis-specific operational knowledge** — knowing that `KEYS *` and `LRANGE 0 -1` block every other client on a single-threaded data plane separates candidates who've operated Redis from candidates who've only used it. Pipelining, Lua scripts, hash slot constraints, RDB vs AOF persistence — these are operational facts, not theory.

**Common confusions**

- "Cache invalidation is the hard part" — it's hard, but stampedes are usually what kills you first.
- "Bigger cache = higher hit rate" — only up to the working set size; past that, working-set-rotation breaks LRU.
- "Write-through is always safer than write-back" — only against cache failure; against DB failure, both have data loss windows.
- "Redis is multi-threaded now" — Redis 6+ has multi-threaded I/O, but command execution is still single-threaded.
- "Stale-while-revalidate breaks freshness guarantees" — it's the right answer for almost all user-facing reads; tighten only where freshness is a hard requirement.
- "LRU is always good enough" — it's vulnerable to scans (one batch job wipes the working set); W-TinyLFU is empirically better.

**What follows from this topic**

Caching feeds CDN behaviour (Networking), eviction policies cross-reference Memory Management, hot key handling parallels the whale problem in Database Scaling, and stampedes are the canonical example of "what fails first under correlated load". Materialised views (Data Modelling) are a cousin of write-through caching — pre-compute on write, read-optimised storage of the answer.

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

### Summary

**What this topic covers**

The vocabulary distributed-systems engineers use to talk precisely about what their system actually guarantees under normal operation and under network partition. Six questions covering (1) **CAP** stated precisely — the choice between consistency and availability *only* applies during a partition, not always; (2) **PACELC** — the everyday extension that adds "else latency or consistency" so you can talk about the partition-free case (PA/EL systems like Cassandra and DynamoDB vs PC/EC systems like Spanner and HBase); (3) the **consistency hierarchy** from strict linearizability through sequential, causal, session guarantees (read-your-writes, monotonic reads), to eventual consistency; (4) **CRDTs** — conflict-free replicated data types that merge deterministically without coordination (Figma's multiplayer canvas, Automerge, Linear); (5) why **Spanner needs TrueTime** — bounded clock uncertainty + commit-wait gives external consistency globally; and (6) the senior interview angle — never just say "strongly consistent", always qualify with "for X operations under Y conditions".

**Mental model**

CAP is a **partition-time tradeoff**, not an always-on choice. The misrepresentation "pick 2 of 3" is wrong because outside partitions you get all three; the question is what you do *when* partitioned. PACELC is more useful day-to-day because it names the **always-on tradeoff** between latency (return fast from a local replica) and consistency (wait for global agreement). Most production systems live in the "else" clause most of the time — DynamoDB tables choosing eventually-consistent reads for 2× the throughput, Postgres replicas serving stale reads to lower primary load. The second mental shift: **consistency is a lattice, not a binary**. Linearizable is the strongest single-key guarantee; serializable extends to transactions; sequential is weaker; causal is weaker still; session guarantees layer on top of any of these. Eventual consistency is the floor — replicas converge if writes stop. Production systems pick a level per operation: payment writes might be linearizable, profile reads eventually consistent. The third mental shift: **time itself is a distributed-systems problem**. Spanner's TrueTime — GPS + atomic clocks giving a *bounded uncertainty interval* — exists because without a global clock, you can't tell which of two writes happened first. The commit-wait latency is the price of external consistency at planetary scale.

**Key terms**

- **CAP** — under partition, choose Consistency or Availability. The "P" is unavoidable, the choice is C vs A.
- **PACELC** — extends CAP: if Partition then A or C, Else Latency or Consistency. Captures everyday tradeoff.
- **Linearizable** — appears atomic, single-copy illusion; the strongest single-object consistency.
- **Serializable** — strongest transactional consistency; result equivalent to some serial order.
- **Sequential consistency** — total order, same on every node, not necessarily real-time.
- **Causal consistency** — causally related ops seen in order; concurrent ops can be seen in any order.
- **Session guarantees** — read-your-writes, monotonic reads, monotonic writes, writes-follow-reads.
- **Eventual consistency** — replicas converge if writes stop; no order guarantees during convergence.
- **CRDT** — conflict-free replicated data type; merges deterministically; G-Counter, PN-Counter, OR-Set, LWW-Set, RGA.
- **External consistency (Spanner)** — linearizability across globally distributed transactions.
- **TrueTime** — Google's GPS+atomic-clock service returning `[earliest, latest]` uncertainty intervals.
- **Commit-wait** — Spanner waits out timestamp uncertainty before acking, ensuring monotonic ordering.

**Why interviewers ask this**

Two signals. (1) **Precision of language**. Staff candidates never say "strongly consistent" without qualifying; they say "linearizable for X within a single region, eventually consistent with up to 100ms lag on cross-region reads". They name PACELC labels with reasons — "PA/EL: we accept stale reads to keep p99 < 10ms in normal operation". (2) **Knowing the production systems**. Naming Spanner, DynamoDB, Cassandra, Redis CRDT modules, Figma's collaborative canvas, Automerge — and explaining what consistency model each implements — proves you've read past the textbook chapter. CRDTs are the test case for whether you've actually built multi-region active-active: G-Counter for grow-only counters, OR-Set for observed-remove sets, LWW-Element-Set for last-write-wins, RGA for collaborative text. Production deployments are Linear, Figma, Notion, Redis CRDT.

**Common confusions**

- "CAP says pick 2 of 3" — wrong; partition is given, the choice is C vs A *during* partition.
- "Eventually consistent = wrong" — eventual is fine for counters, feeds, notifications, search; reserve stronger guarantees for money and identity.
- "Strong consistency requires Spanner" — no; single-leader Postgres in one region is strongly consistent. Spanner is for *global* strong consistency.
- "CRDTs solve all multi-region writes" — they solve mergeable structures; complex business invariants still need coordination.
- "Linearizability and serializability are the same" — linearizability is single-object real-time order; serializability is multi-object transactional order. Different axes.
- "Read-your-writes is automatic in async replication" — explicitly the opposite; you need primary-routing or causal tokens.

**What follows from this topic**

Consistency vocabulary feeds Consensus (Raft provides linearizability), Database Scaling (replication topology maps to PACELC), Messaging (exactly-once requires application-level idempotence on top of at-least-once delivery), and Tradeoff Vocabulary (the consistency-vs-availability axis is named explicitly). The discipline of qualifying consistency claims with operation + condition generalises to all senior interview answers.

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

### Summary

**What this topic covers**

How a group of nodes agrees on a single answer when answers must not diverge — leader election, distributed locking, atomic commit, cluster metadata, unique ID allocation. Eight questions across (1) **why consensus is needed at all** — wherever divergent answers cause irreversible harm; (2) **Raft explained to implementation depth** — followers / candidates / leaders, election with random timeouts, log replication, commit on majority, safety via the up-to-date-log rule; (3) **Paxos vs Raft** — same guarantees, dramatically different understandability; (4) **split-brain** and the **fencing token** discipline — STONITH, epochs, monotonic tokens — and Kleppmann's "Redlock isn't safe" argument; (5) **distributed locks** stratified by criticality — `SETNX` for best-effort, etcd/ZooKeeper/Consul for serious work, idempotent design when correctness matters; (6) **when you need consensus vs accepting eventual** — the 80/20 between control plane and data plane; (7) **two-phase commit's failure mode** and why sagas largely replaced it; and (8) **gossip protocols** (SWIM, Cassandra cluster membership, Consul Serf) that converge in O(log N) without central coordination.

**Mental model**

Consensus is **expensive**, so the senior discipline is to **minimise where you use it**. Push consensus to the edges of the system — leader election, configuration changes, cluster membership transitions — and keep the data plane local. Every Raft round trip costs you a network RTT to majority; every distributed lock acquisition is a coordination point that can break under partition; every consensus dependency is an availability dependency. Production systems converge on a layered pattern: **etcd / Consul / ZooKeeper for the control plane** (a tiny amount of metadata coordinated rigorously), **gossip for membership** (eventually consistent, scales horizontally), and **app logic for the data plane** (idempotent operations, deduplication, local consistency). The second mental shift: **clocks are not synchronisation**. Distributed locks based on TTLs can dual-grant under clock skew + GC pause + network delay — fencing tokens are how you get safety from a stale leader (the resource itself rejects writes with an older token). Kleppmann's canonical Redlock critique is mandatory reading. The third shift: **2PC is dead for cross-service work** — coordinator failure between prepare and commit blocks participants indefinitely. Modern designs use sagas with compensating actions, or pull cross-service work back to single-shard transactions.

**Key terms**

- **Consensus** — agreement on a single value across a quorum of nodes; survives `f` failures with `2f+1` total.
- **Raft** — Diego Ongaro's understandable consensus algorithm; etcd, Consul, CockroachDB, TiKV, MongoDB.
- **Paxos** — foundational consensus algorithm; Google Chubby, Spanner; famously hard to understand.
- **Leader election** — single node serves as coordinator; failover via randomised election timeouts.
- **Log replication** — leader appends entries, replicates to majority, commits when acknowledged.
- **Term / epoch** — monotonic generation number; protects against stale leaders accepting writes.
- **Split-brain** — two nodes both think they're leader; classic consequence of network partition + missing fencing.
- **STONITH** — Shoot The Other Node In The Head; power-level fencing of a suspected stale leader.
- **Fencing token** — monotonic token issued with each lease; resource rejects writes with stale tokens.
- **Distributed lock** — coordination primitive; tier by criticality (best-effort SETNX vs Raft-backed leases).
- **Two-phase commit (2PC)** — coordinator-driven atomic commit; blocks on coordinator failure.
- **Saga** — multi-step workflow with compensating actions; replaces 2PC for cross-service consistency.
- **Gossip protocol** — epidemic state propagation; SWIM, Cassandra, Consul Serf; O(log N) convergence.

**Why interviewers ask this**

Three signals. (1) **Raft implementation depth** — "explain Raft well enough that I'd believe you could implement it" is the canonical filter; the right answer names follower/candidate/leader states, election timeouts (150-300ms randomised), AppendEntries, majority-commit, and the up-to-date log safety rule. (2) **Production-grade lock answer** — naming three tiers (best-effort SETNX, etcd/ZooKeeper for serious work, idempotent design for correctness-critical) and referencing the Antirez/Kleppmann debate proves you've read past Redis tutorials. (3) **Consensus avoidance instinct** — the right framing is "where in this design do we *need* consensus vs accept eventual + reconcile?" Staff candidates push coordination to the edges; juniors sprinkle distributed locks throughout the design.

**Common confusions**

- "Raft is faster than Paxos" — same guarantees, similar performance; the win is understandability, not speed.
- "Distributed locks work like local mutexes" — they don't; clock skew, GC pauses, and network delay create dual-grant windows.
- "Redlock is safe if you use multiple Redis instances" — Kleppmann showed it isn't, due to missing fencing tokens.
- "2PC is fine if the coordinator is reliable" — coordinator failure between phases blocks every participant; no clean recovery.
- "Gossip is unreliable" — gossip is eventually correct; for membership, that's the right tradeoff.
- "We need consensus for every cross-service operation" — most cross-service work is sagas + idempotency, not 2PC.

**What follows from this topic**

Consensus feeds Database Scaling (Raft underpins CockroachDB, TiKV, Spanner's Paxos groups), Messaging (KRaft replaces ZooKeeper in Kafka), Resilience (idempotency keys + fencing tokens are the alternative to locks), Sagas (the modern 2PC replacement), and Anti-patterns (coordination on the hot path is a smell). The discipline of "consensus at the edges, eventual at the core" generalises to all distributed designs.

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

### Summary

**What this topic covers**

The async substrate that connects services together when synchronous chains stop scaling. Eight questions across (1) the precise distinctions between **queues** (SQS, RabbitMQ — point-to-point, consumed once), **logs** (Kafka, Pulsar, Kinesis, Redpanda — append-only, replayable, retention-based), and **pub/sub** (Redis pub/sub, Google Pub/Sub — fan-out, often ephemeral); (2) **at-least-once vs exactly-once** and the senior truth that exactly-once is at-least-once + idempotency across system boundaries; (3) the **outbox pattern** for solving the dual-write problem (DB + Kafka in the same transaction); (4) **Change Data Capture** (Debezium, Maxwell, AWS DMS) as the WAL-streaming alternative to dual writes; (5) **Kafka mechanics** — partitions as the unit of ordering and parallelism, consumer groups, the `hash(key) % partitions` placement rule; (6) **backpressure** — bounded queues with explicit policies (block, drop, shed) as the alternative to unbounded OOM-bound queues; (7) the senior diagnostic on consumer-falls-behind-by-an-hour catch-up; and (8) **stream processing** — stateless vs stateful, windowing types, the event-time vs processing-time distinction, and watermarks.

**Mental model**

Messaging shifts the **coupling axis** from spatial (service A calls service B's IP) to temporal (A produces an event when convenient, B consumes when capable). That's the operational win: A doesn't fail when B is down, B can be scaled or replaced without A noticing. The cost: **delivery semantics become an application concern**. At-least-once is the default for serious systems; exactly-once is a marketing claim across system boundaries. The right framing is "at-least-once delivery + idempotent consumers = effective exactly-once". The second mental shift: **logs replaced queues for most modern workloads**. A queue throws away the message after ack; a log retains it for hours-to-days, lets consumers track their own offset, supports replay (reset to T-30min when a bug ships), and supports multiple consumer groups reading the same stream independently. Kafka, Pulsar, Kinesis, Redpanda all share this shape; LinkedIn, Uber, Airbnb, Confluent built modern data platforms on it. The third shift: **stream processing is the natural OLAP-on-data-in-motion**. Flink and Kafka Streams turn the log into a continuously-updated view; watermarks let you finalise event-time windows in the face of late data; RocksDB-backed state stores hold the aggregations.

**Key terms**

- **Queue** — point-to-point, consumed once, hard to replay. SQS, RabbitMQ, Celery.
- **Log** — append-only ordered sequence, replayable, retention-based deletion. Kafka, Pulsar, Kinesis, Redpanda.
- **Pub/sub** — fan-out broadcast, often without persistence. Redis pub/sub, Google Pub/Sub.
- **At-least-once** — retry until acked; may duplicate; the production default with idempotent consumers.
- **Exactly-once** — within-Kafka via transactions + idempotent producers; across systems, requires app-level idempotency.
- **Outbox pattern** — write business state + event to outbox table in one DB txn; publisher reads outbox.
- **CDC (Change Data Capture)** — stream DB WAL/binlog changes to Kafka. Debezium, Maxwell, DMS.
- **Partition** — Kafka's unit of ordering and parallelism; `hash(key) % partitions` placement.
- **Consumer group** — set of consumers; each partition consumed by exactly one within the group.
- **Backpressure** — propagate slowness from consumer to producer; bounded queues with block/drop/shed policies.
- **Watermark** — event-time threshold for finalising stream windows in the face of late data.
- **Compacted topic** — Kafka retention by latest-per-key; powers KTable materialised views.

**Why interviewers ask this**

Three signals. (1) **Delivery-semantics precision** — the candidate who claims "Kafka gives exactly-once" loses the room; the candidate who says "at-least-once with idempotent consumers, with Kafka transactional API for exactly-once *within Kafka*" wins it. (2) **The outbox pattern** is the canonical solution to the dual-write problem, and it's the test for whether you've actually shipped event-driven services. The right framing: "we wrote to the DB and Kafka in the same code path, one of them eventually failed, we hit inconsistency we couldn't recover from, we moved to outbox + idempotent consumers". (3) **Catch-up calculus** — partition count is the ceiling on consumer parallelism; that's a design-time decision you can't undo retroactively for existing data. The senior signal is naming this constraint without prompting.

**Common confusions**

- "Kafka is a queue" — it's a log; messages persist, consumers track offsets, replay is supported.
- "Exactly-once is a Kafka feature" — only within Kafka; cross-system exactly-once doesn't exist without idempotency.
- "CDC replaces application events" — partly; CDC events are tied to DB schema, harder to evolve than domain events.
- "Unbounded queues are fine if you have memory" — they hide the imbalance until OOM; bound them.
- "More consumers = more throughput" — only up to partition count; extra consumers in a group sit idle.
- "Stream processing is just batch with smaller batches" — windowing, watermarks, and event-time semantics make it qualitatively different.

**What follows from this topic**

Messaging feeds Asynchronous & Event-Driven Patterns (EDA, event sourcing, CQRS all assume a reliable log), Resilience (backpressure replaces unbounded buffers, dead-letter queues handle poison messages), Data Modelling (Lambda vs Kappa architectures), and Modern Frameworks (Kafka KRaft, Flink, Temporal). The outbox + idempotent consumer pattern shows up in every serious cross-service consistency design.

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

### Summary

**What this topic covers**

The eleven patterns that turn a brittle distributed system into one that degrades gracefully under load and recovers cleanly from faults. Questions cover (1) **timeouts** — the rule that they must decrease as you go deeper; (2) **retries** — exponential backoff with full jitter, retry budgets, bounded attempts, error-class discrimination; (3) **circuit breakers** — closed/open/half-open states and the tuning trade-offs; (4) **bulkheads** — resource pool isolation per dependency or tenant; (5) **load shedding** — failing 10% fast vs 100% slow; (6) **rate limiting** — token bucket vs leaky bucket vs fixed window vs sliding window; (7) **hedged requests** — Google's "tail at scale" technique that doubles capacity for 1% of requests; (8) **idempotency keys** — the canonical Stripe pattern; (9) **sagas** — orchestration vs choreography for cross-service consistency; (10) the retry-storm diagnostic — synchronised retries amplifying a downstream blip into an outage; plus (11) Marc Brooker's exact framing of what backoff is *for* and his "deferring load doesn't work" argument.

**Mental model**

Resilience is **planning for partial failure as the steady state**, not the exception. The senior framing: every network call fails eventually, every dependency degrades, every retry strategy that doesn't include jitter will synchronise into a thundering herd, every queue without a bound is a future OOM. The right patterns compose: **timeouts** bound work, **retries with jitter** convert transient failures into success, **circuit breakers** fast-fail when retries won't help, **bulkheads** isolate failure to one dependency, **load shedding** drops work before queues build, **rate limits** stop one client from starving others. The second mental shift: **backoff has two purposes** (Brooker's framing) — let the downstream recover, and de-synchronise retries. Pure exponential gives you the first but not the second; jitter gives you the second. Capped exponential bounds the worst case. The third shift: **deferring load doesn't work**. If your offered load permanently exceeds capacity, queueing just defers pain — load shedding solves overload, backoff solves transient pain. AWS's Marc Brooker has written canonically on this; production teams who don't internalise it discover it during an outage. Hedged requests, idempotency keys, sagas — every modern resilience pattern is a specific composition of timeout + retry + circuit + bulkhead.

**Key terms**

- **Timeout ladder** — outer timeouts > inner timeouts; deepest call fails first, not last.
- **Exponential backoff** — `base × 2^attempt`; classic shape; synchronises without jitter.
- **Full jitter** — `random_between(0, min(cap, base × 2^attempt))`; AWS recommendation.
- **Retry budget** — cap retries as % of original traffic; prevents 10× amplification storms.
- **Circuit breaker** — closed (normal) / open (fast-fail) / half-open (probe). Hystrix, Polly, resilience4j.
- **Bulkhead** — per-dependency resource pools (thread or semaphore); isolates failure blast radius.
- **Load shedding** — drop work before queueing under overload; 503/429 fast over slow timeout.
- **Token bucket** — refill at rate R, burst to capacity C; the standard rate-limit algorithm.
- **Hedged requests** — fire to second replica at p95; eliminates tail amplification at 2× cost on slow tail.
- **Idempotency key** — client-supplied unique key; server caches result; safe retry across the network.
- **Saga** — multi-step transaction with compensating actions; orchestration (Temporal) vs choreography (events).
- **Retry storm** — synchronised retries from missing jitter; canonical production outage shape.

**Why interviewers ask this**

Two signals. (1) **The retry storm question is the canonical filter**. Service A retries B with no jitter, B has a blip — what happens? The right answer names the storm, the synchronised intervals, the propagation upward as A becomes B's downstream's problem, and the three-part fix: full jitter, retry budget, circuit breaker. This is "the single most common production resilience failure" — staff candidates bring receipts from real outages. (2) **Brooker awareness** — citing Marc Brooker's AWS blog posts on backoff, load shedding, and the impossibility of deferring load is a 2026 staff-tier tell. The framing "backoff cannot solve long-term overload" separates engineers who've operated production from engineers who've read about it. (3) **Saga vs 2PC fluency** — knowing that orchestrated sagas (Temporal, Step Functions) handle complex cross-service workflows where 2PC is dead is the modern senior baseline.

**Common confusions**

- "Retries make systems more reliable" — only with jitter, budgets, idempotency, and circuit breakers. Naive retries amplify outages.
- "Circuit breakers fix the downstream" — they protect *you* from the downstream; the downstream still needs fixing.
- "Hedged requests are free" — they double capacity at the tail; reserve for idempotent reads with spare capacity.
- "Idempotency keys are optional" — they're mandatory for any operation a client might retry across a network failure.
- "Queues smooth bursts" — bounded queues do; unbounded queues hide the problem until OOM.
- "Load shedding is giving up" — it's the discipline that keeps the system serving the requests it *can* serve.

**What follows from this topic**

Resilience patterns feed Anti-patterns (synchronous chains, unbounded queues, missing fencing tokens are the smells), Cost & Capacity (60-70% utilisation rule absorbs the headroom resilience needs), Observability (SLOs and error budgets quantify the resilience target), and Modern Frameworks (Temporal as the orchestrated-saga substrate). Bring one war story per pattern; they're the questions interviewers love most.

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

### Summary

**What this topic covers**

The three architectural ideas that are constantly confused and the operational discipline that makes them work at scale. Five questions across (1) **EDA vs event sourcing vs CQRS** — distinct ideas often conflated; EDA is about service-to-service communication via events, event sourcing makes events the source of truth, CQRS separates the read model from the write model; (2) **when event sourcing is actually worth it** — audit history requirements, multiple projections, time-travel debugging, against the real cost of schema evolution being permanent; (3) **the trigger for CQRS** — when read and write shapes diverge enough that one model serves both badly; (4) **materialised views** — pre-computed query results trading write cost for read latency (Postgres `MATERIALIZED VIEW`, ClickHouse, Kafka Streams `KTable`); and (5) **schema evolution maturity** — backward, forward, and full compatibility, schema registries (Confluent, Apicurio), Avro / Protobuf for binary efficiency plus schema enforcement.

**Mental model**

Asynchronous architectures are the **natural response to synchronous chains failing**. When A → B → C → D synchronously, latency multiplies, failure probability multiplies, and partial-failure handling is exponential in the number of hops. Event-driven decoupling lets each service own its own pace and failure model. The second mental shift: **events are forever**. Once you publish an event into Kafka with a topic retention of 7 days, you can no longer change its schema without thinking about every consumer that might replay it. Schema registries with backward + forward compatibility checks are how mature teams enforce this discipline — Confluent Schema Registry blocks breaking changes at publish time, Avro and Protobuf give binary efficiency plus typed contracts. The third shift: **event sourcing is not the default**. Most CRUD apps don't need replayable history; the trigger is genuine audit / regulatory / time-travel requirements, and the cost is permanent schema evolution discipline plus snapshots for replay performance. CQRS is similarly conditional — the trigger is genuine read/write shape divergence (reads do 10 joins because writes are normalised), and the cost is eventual consistency between write commit and read visibility. Materialised views (`CREATE MATERIALIZED VIEW`, Kafka Streams KTables, ClickHouse materialised views) are the practical CQRS substrate — denormalised pre-computed views fed by events.

**Key terms**

- **EDA (Event-Driven Architecture)** — services react to events; loose coupling; A emits "OrderPlaced", B reacts.
- **Event sourcing** — events are the source of truth; state is derived by replay; audit is free.
- **CQRS** — separate write model from read model; reads served from specialised projections.
- **Materialised view** — pre-computed query result, persisted, refreshed on write or async.
- **Projection** — derived read model built from an event stream; CQRS's read side.
- **Snapshot** — checkpoint of derived state; speeds replay on large event streams.
- **Schema evolution** — adding/removing/changing fields over time without breaking consumers.
- **Backward-compatible** — new readers handle old data; the "add optional field" case.
- **Forward-compatible** — old readers handle new data; the "ignore unknown field" case.
- **Schema registry** — Confluent / Apicurio centralised schema versioning + compatibility enforcement.
- **Avro / Protobuf** — binary serialisation + schema enforcement; the production default.
- **Upcaster** — code that transforms old event shapes into new for consumers reading historic streams.

**Why interviewers ask this**

Two signals. (1) **Distinguishing the three concepts** — confusing EDA with event sourcing with CQRS in a senior interview is a junior tell. The right framing: "you can do EDA without event sourcing (most production EDA is just topic-driven pub/sub on top of mutable databases), you can do CQRS without event sourcing (read replicas are a degenerate CQRS), and event sourcing is the strongest commitment that often appears with CQRS but doesn't require it." (2) **The cost-aware adoption story** — staff candidates resist event sourcing for CRUD apps and reach for it only when audit, multiple projections, or time-travel debugging genuinely justifies the schema-evolution-forever cost. The same applies to CQRS — the trigger is read/write divergence, not "scale". Naming the cost (eventual consistency, schema-as-immutable-contract, snapshot logistics) is what separates someone who's deployed these from someone who's read about them.

**Common confusions**

- "Event sourcing = event-driven" — distinct; event sourcing is about storage semantics, EDA is about communication.
- "CQRS doubles complexity" — only when separate models are warranted; degenerate CQRS (read replicas) is fine.
- "Materialised views are always faster" — for reads yes, but write amplification can be brutal at high write rates.
- "Schema evolution is just adding fields" — renames, removals, type changes all need versioning + upcasters.
- "Event sourcing replaces databases" — it complements them; you still need projections for queries.
- "JSON schemas are good enough" — for low-stakes, yes; for production EDA at scale, Avro/Protobuf with a registry pays off.

**What follows from this topic**

EDA primitives feed Messaging (the substrate), Data Modelling (Lambda/Kappa, Twitter timeline, materialised view dashboards), Search (CDC-fed search indexes), Real-Time (live projections via WebSocket/SSE), and Resilience (sagas as orchestrated event flows). The schema-evolution discipline is the test for whether your event-driven design is operationally mature.

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

### Summary

**What this topic covers**

The shape decisions that determine read latency, write amplification, and the operational complexity of an analytics tier. Four questions covering (1) **normalised vs denormalised** — facts stored once vs duplicated for read speed; default to normalised at the source of truth and denormalise in derived views; (2) the **Twitter timeline problem** — three canonical approaches (fanout-on-write, fanout-on-read, hybrid) and why the hybrid is the actual production answer; (3) **Lambda vs Kappa architecture** — Nathan Marz's batch-plus-speed dual-pipeline vs Jay Kreps's streaming-only single-pipeline, and why Kappa won most modern use cases; and (4) the staff-tier decision framework for **pre-computation vs on-demand** along three axes: read-write ratio, staleness tolerance, result size.

**Mental model**

Data modelling is a **read-vs-write tradeoff continuum**. Normalised storage minimises write amplification (each fact lives once, updates are localised) at the cost of read complexity (joins for queries). Denormalised storage minimises read latency (no joins, pre-computed answers) at the cost of write fanout (every update touches N copies) and the risk of inconsistency between copies. Production systems live in the middle: **normalised at the source of truth, selectively denormalised in derived views** (search indexes, caches, materialised views, read-optimised projections). The second mental shift: **fanout direction is a scale decision**. Twitter's timeline is the canonical example — push (fanout-on-write) means O(1) reads but catastrophic writes for celebrities with millions of followers; pull (fanout-on-read) means O(1) writes but slow reads for users following many people. The hybrid — push for normal users, pull for celebrities, merged on read — is the actual production answer at Twitter, Instagram, and every modern feed product. The third shift: **Kappa won for most workloads**. Lambda's dual batch + speed layer was right when streaming infrastructure was immature; modern Flink / Kafka Streams / Materialize / RisingWave gives you streaming accuracy without the dual-codepath cost. Lambda survives in legacy and where batch is genuinely cheaper.

**Key terms**

- **Normalised** — each fact stored once; updates localised; joins required for queries.
- **Denormalised** — duplicated data; updates fan out; reads are fast.
- **Fanout-on-write (push)** — write copies to all consumers at write time; O(1) reads, O(followers) writes.
- **Fanout-on-read (pull)** — assemble at read time; O(1) writes, O(followers × posts) reads.
- **Hybrid fanout** — push for normal users, pull for celebrities, merged on read; Twitter's actual approach.
- **Lambda architecture** — batch layer (Hadoop, daily) + speed layer (Storm/Spark streaming) + serving layer.
- **Kappa architecture** — streaming-only; reprocess from log when you need a different view.
- **Materialised view** — pre-computed query result, persisted; trades write cost for read latency.
- **Rollup pyramid** — pre-compute top-level aggregations, query on-demand for drill-downs.
- **Star schema** — analytics shape; fact table + dimension tables; columnar warehouse convention.
- **Selective denormalisation** — normalised source of truth + denormalised derived views; production default.
- **Aggregation pre-computation** — trade storage for query-time CPU; the dashboard / leaderboard default.

**Why interviewers ask this**

Two signals. (1) **The Twitter timeline question is the canonical filter** for whether you understand fanout-direction tradeoffs at scale. The wrong answer picks one approach; the right answer names all three, identifies the celebrity threshold problem with pure push, identifies the slow-read problem with pure pull, and lands on the hybrid. Bonus points for naming the celebrity threshold (typically follower count > some N) as the explicit policy. (2) **The pre-computation framework** is the staff-tier 2026 signal — the three axes (read frequency vs write frequency, staleness tolerance, result size) plus the right answer ("rollup pyramids: pre-compute top-level, on-demand for drill-downs") prove you've designed analytics systems. Naming ClickHouse, Druid, Pinot for live OLAP vs Snowflake/BigQuery for batch warehousing earns trust.

**Common confusions**

- "Normalised is always cleaner" — only if reads are infrequent; for read-heavy systems, selective denormalisation is the right call.
- "Fanout-on-write is more scalable" — only for users with bounded follower counts; breaks catastrophically for celebrities.
- "Lambda is the modern shape" — Kappa replaced it for most workloads; Lambda survives in legacy.
- "Pre-computation is always faster" — only when reads dominate writes; for sparse queries on huge data, on-demand wins.
- "Materialised views are free" — write amplification can be brutal; refresh policy is a real tuning problem.
- "Denormalisation breaks consistency" — only if not designed for it; events + projections give bounded eventual consistency.

**What follows from this topic**

Data modelling feeds Search (denormalised search indexes via CDC), Caching (materialised views are write-through caches with persistence), Database Scaling (read replicas are degenerate denormalisation), and Real-Time (live aggregates via streaming materialised views — Materialize, RisingWave, ClickHouse). The fanout-direction decision recurs in feed products, notifications, presence systems, and dashboards.

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

### Summary

**What this topic covers**

How modern search engines actually find relevant documents, how relevance scoring evolved from TF-IDF to BM25 to hybrid lexical-plus-vector, and the operational threshold for graduating from Postgres FTS to dedicated search infrastructure. Four questions across (1) **Elasticsearch / OpenSearch internals** — inverted index, tokenisation chain, shards as self-contained Lucene indexes, near-real-time refresh, segment merges; (2) **BM25 vs TF-IDF** — the saturation and length-normalisation refinements that made BM25 the universal modern baseline; (3) **hybrid search in 2026** — BM25 for lexical precision plus vector ANN for semantic match, combined via Reciprocal Rank Fusion, with cross-encoder rerankers on top-K, now the standard for RAG and modern search; and (4) **when Postgres FTS stops being enough** — multilingual analysers, faceting at scale, write-rate ceilings, relevance tuning, hybrid lexical-plus-vector requirements.

**Mental model**

Search is the canonical **inverted-index problem**: given a query, find documents containing matching terms, then rank by relevance. The tokenisation chain — lowercase, stopword removal, stemming, synonyms — determines what counts as a match; the scoring function determines what counts as relevant. BM25 replaced TF-IDF because two empirical refinements proved out: **term frequency saturates** (doubling a word's count doesn't double relevance), and **document length normalises** (a short doc matching once is more relevant than a long doc matching once). Both are tunable via `k1` and `b` — production search teams tune these for their corpus. The second mental shift: **search in 2026 is hybrid**. Lexical search (BM25) is precise but misses paraphrases and synonyms; vector ANN search captures semantic similarity but misses exact matches and proper nouns. Running both and combining via **Reciprocal Rank Fusion** (`sum(1 / (k + rank))`) is robust and parameter-light. The top of the funnel is then reranked by a cross-encoder for quality. This is the standard RAG retrieval architecture, and it's the modern search-product architecture (Algolia, Elastic, Vespa). The third shift: **Postgres FTS handles 1M docs and basic relevance trivially** — the senior call is when to leave it for Elasticsearch / OpenSearch / Tantivy / Meilisearch / Typesense vs Vespa.

**Key terms**

- **Inverted index** — term → list of doc IDs; the foundational search data structure.
- **Tokenisation chain** — lowercase + stopword removal + stemming + synonyms + n-grams.
- **Shard** — partition of an index; self-contained Lucene index; fixed at index creation.
- **Segment** — immutable Lucene file; merged in the background to keep count manageable.
- **Refresh interval** — Elasticsearch's near-real-time visibility window (default 1s).
- **TF-IDF** — term frequency × inverse document frequency; classic relevance scoring.
- **BM25** — TF-IDF with saturation + length normalisation; modern default; `k1`, `b` tunable.
- **Vector ANN search** — approximate nearest neighbour on embeddings; HNSW, IVF, ScaNN.
- **Hybrid search** — BM25 + vector ANN; combined via Reciprocal Rank Fusion.
- **Reciprocal Rank Fusion (RRF)** — `sum(1 / (k + rank_i))`; parameter-light, robust combiner.
- **Cross-encoder reranker** — neural model rerank of top-K for quality; expensive but accurate.
- **Postgres FTS** — `tsvector` / `tsquery` / GIN indexes; fine to ~1M docs and basic relevance.

**Why interviewers ask this**

Two signals. (1) **Hybrid search awareness** — 2026 staff-tier search answers default to "BM25 + vector ANN + RRF + cross-encoder rerank for top-K". Candidates who still say "Elasticsearch with BM25" without mentioning vectors are signalling they haven't tracked the field since 2023. The RAG section of this primer reinforces the same architecture. (2) **The Postgres-to-Elasticsearch threshold** — knowing when to leave Postgres FTS (multilingual, faceting at scale, relevance tuning, write rate, hybrid requirements) and when Postgres is still the right answer (under 1M docs, basic relevance) is the cost-aware-adoption signal. The right framing: "Postgres FTS until I hit a specific limit, then I'd evaluate Elasticsearch vs Vespa vs Typesense for my specific failure mode".

**Common confusions**

- "BM25 is the same as TF-IDF" — BM25's saturation + length normalisation are meaningful improvements.
- "Vector search replaces lexical search" — it complements; exact-match precision is still BM25's domain.
- "Reranking is optional" — top-K hybrid retrieval plus cross-encoder rerank is where modern search quality lives.
- "Elasticsearch is always better than Postgres FTS" — under 1M docs, the operational cost rarely justifies the migration.
- "Synonyms are easy" — multilingual synonyms, domain-specific synonyms, and synonym precision/recall trade-offs are hard.
- "ANN search is exact" — it's approximate; recall trades against latency and memory via HNSW parameters.

**What follows from this topic**

Search feeds AI / LLM Infrastructure (RAG retrieval pipelines), Data Modelling (search indexes as denormalised CDC-fed projections), Real-Time (live indexing via Kafka Connect / Elasticsearch sink), and Cost & Capacity (Elasticsearch is operationally expensive — earn it). The hybrid lexical + vector + reranker stack is the 2026 reference architecture for any retrieval problem.

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

### Summary

**What this topic covers**

The spatial indexing systems and real-time push protocols that underlie ridesharing, delivery, social presence, and live-update products. Four questions: (1) the **three spatial indexing systems** — Geohash (recursive grid, Postgres/Redis-friendly), S2 (Google's hierarchical spherical cells, better near poles), and H3 (Uber's hexagonal grid with uniform neighbour distance); (2) the canonical **"drivers near me"** architecture — H3 cell + k-ring fetch + haversine distance ranking, with continuous WebSocket location updates decoupled from the matching engine; (3) **presence systems** — heartbeats every ~30s with TTL-based online/offline detection, debounced fanout to relevant audiences only; and (4) **real-time push to browsers** — SSE for one-way, WebSockets for bidirectional, FCM/APNs for offline mobile, composed appropriately rather than picking WebSockets reflexively.

**Mental model**

Spatial problems are **bucketing problems**. The earth's curvature, distortion at the poles, and the awkwardness of square cells (your neighbours are at distances varying by sqrt(2)) drive different cell systems. Geohash is the simplest (base-32 string, prefix matching is easy) but suffers polar distortion and uneven neighbour distance. S2 (Google Maps, Foursquare) uses spherical cells that perform better globally. H3 (Uber's invention, now industry standard for ridesharing) uses **hexagons** because every cell has exactly 6 equidistant neighbours — which matters when you're computing "nearby" for matching. The second mental shift: **location updates and matching are two different services**. Drivers push location to a high-write location service (Redis with GEO commands, or H3-cell → driver-set in Redis Sorted Sets); riders query a matching engine that pulls from the location service via cell lookups. Coupling them is a scale anti-pattern. The third shift: **presence is a fanout problem disguised as a state problem**. The bug everyone hits at million-user scale is broadcasting presence updates globally — DDoS-ing your own backend. Production presence systems debounce updates (only on transitions, not every heartbeat) and scope fanout to relevant audiences (followers, conversation participants), not the global user base.

**Key terms**

- **Geohash** — recursive grid encoded as base-32 string; prefix length = precision; Postgres/Redis-friendly.
- **S2** — Google's hierarchical spherical cells; better near poles; foundation of Google's geo systems.
- **H3** — Uber's hexagonal grid; uniform neighbour distance; dominant in ridesharing / delivery.
- **k-ring** — H3 query: a cell plus its neighbours out to radius k; used for "find within R meters".
- **Haversine distance** — great-circle distance on a sphere; the standard "as the crow flies" metric.
- **GEOADD / GEORADIUS (Redis)** — geospatial commands; sorted sets keyed by location.
- **Heartbeat** — periodic client → server ping; presence and connection-alive detection.
- **TTL-based presence** — `user:123 → last_heartbeat`; online if `last > now - 60s`.
- **Debounced fanout** — broadcast on state transitions or periodic intervals, not every heartbeat.
- **SSE (Server-Sent Events)** — unidirectional server→client; browser-native auto-reconnect.
- **WebSocket** — full-duplex; sticky load balancing required; pub/sub fanout via Redis or Kafka.
- **APNs / FCM** — Apple/Google push notification services; survive app-not-running.

**Why interviewers ask this**

Two signals. (1) **The "drivers near me" question is canonical for ridesharing / delivery prompts** — the right answer names H3 cells + k-ring + haversine + WebSocket-driven location updates + decoupled matching engine. Saying "Redis GEORADIUS" without acknowledging the cell-based architecture is the junior answer. (2) **Presence at scale is the senior trap** — naïve "broadcast presence to everyone" designs DDoS themselves at million-user scale. The right framing: debounce updates, scope fanout to relevant audiences, accept some staleness on the indicator. Naming H3 (Uber), S2 (Google), and Geohash (simple Postgres apps) with reasons earns trust.

**Common confusions**

- "Geohash is good enough" — for simple proximity it's fine; for ridesharing-grade matching, H3's uniform neighbours matter.
- "WebSockets are the default for live updates" — SSE is simpler and right more often than people think.
- "Presence is just a boolean per user" — at scale, fanout dominates; debouncing and audience scoping are the real problems.
- "Spatial queries belong in the main DB" — high-write location data should be in Redis or a dedicated geo store, not your OLTP primary.
- "k-ring of 1 is enough" — depends on cell size vs radius; large radii need larger k or you miss candidates.
- "FCM/APNs replace WebSockets" — they're for offline / background push; in-app live uses WS/SSE.

**What follows from this topic**

Geospatial primitives feed AI / LLM Infrastructure (vector indexes are conceptually similar — bucketing high-dimensional space), Search (geo-faceting in Elasticsearch), Real-Time messaging (WebSocket gateways + Kafka fanout), and Caching (per-cell driver lists in Redis). The presence-fanout discipline generalises to all "broadcast at scale" problems including feed updates and chat.

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

### Summary

**What this topic covers**

The signal, language, and deploy primitives of operating a production system the way 2026 staff interviewers expect. Six questions across (1) the **three pillars of observability** — logs, metrics, traces — plus the **fourth pillar** of continuous profiling (Pyroscope, Datadog Continuous Profiler, Parca); (2) **trace context propagation** with W3C `traceparent` and the canonical bug of dropping context across async boundaries; (3) the **SLO / SLI / SLA / error budget** system from the Google SRE book; (4) **multi-window multi-burn-rate alerting** as the SRE-recommended pattern for catching both fast and slow degradations; (5) **deployment strategies** — blue/green vs canary vs rolling vs feature-flagged dark deploys; and (6) **shadow / dark traffic** for validating new versions against real production load before exposing users.

**Mental model**

Observability is **the ability to ask new questions about your system without redeploying**. Logs answer "what happened at time T" (high cardinality, expensive to query at scale), metrics answer "what's the trend" (low cardinality, cheap to query), traces answer "where did this specific request spend its time across services" (the right tool for distributed systems), and continuous profiles answer "which function is slow without me reproducing the issue". The fourth pillar matters because at scale, perf regressions are statistically detectable in flame graphs but invisible in metrics. The second mental shift: **SLOs are the language of risk**. The SLO is your reliability target (99.9% over 30 days), the error budget (`1 - SLO`) is the badness you're allowed to spend on deploys, experiments, and controlled risk-taking; when you burn it, you freeze. Multi-burn-rate alerts catch both acute spikes (14.4× burn over 1 hour = paging) and slow degradations (6× burn over 6 hours = ticket) without the noise of raw error counts. The third shift: **deploy strategy is risk management, not deployment plumbing**. Blue/green for safety-critical infrequent releases (instant rollback at 2× cost), canary for continuous deploy (catch regressions at 1%-25%-100% steps), rolling for stateless services. Feature flags (LaunchDarkly, Unleash, OpenFeature) decouple deploy from release — ship code dark, enable per-segment.

**Key terms**

- **Logs** — discrete timestamped events; ELK / Loki / OpenSearch / Datadog.
- **Metrics** — aggregated numerics over time; Prometheus, Grafana, Datadog.
- **Traces** — request flow across services with span breakdowns; OpenTelemetry, Jaeger, Tempo, Honeycomb.
- **Continuous profiling** — production CPU sampling; Pyroscope, Parca, Datadog.
- **W3C traceparent** — header carrying trace ID + parent span ID across HTTP/gRPC.
- **SLI** — Service Level Indicator; what you measure.
- **SLO** — Service Level Objective; the target (99.9% / 30 days).
- **SLA** — Service Level Agreement; external commercial contract with penalties.
- **Error budget** — `1 - SLO`; the badness you can spend on deploys + experiments.
- **Multi-burn-rate alerting** — fast burn (14.4× / 1h) + slow burn (6× / 6h); SRE-book pattern.
- **Blue/green** — two full environments, swap traffic via LB; instant rollback at 2× infra cost.
- **Canary** — gradual traffic shift (1% → 5% → 25% → 100%) with per-step SLO checks.
- **Shadow traffic** — copy production traffic to new version without serving response.
- **Feature flags** — LaunchDarkly / Unleash / OpenFeature; decouple deploy from release.

**Why interviewers ask this**

Three signals. (1) **SLO fluency** — staff candidates use SLO / SLI / SLA / error budget precisely, never interchangeably. The right framing is "we have a 99.9% SLO over 30 days, current 30-day burn is 0.5%, our error budget allows X risk this month". (2) **Multi-burn-rate alerting awareness** — citing the SRE book's specific pattern (14.4× / 1h + 6× / 6h) separates candidates who've operated SLO-driven systems from candidates who've read about them. (3) **Deploy strategy reasoning** — picking blue/green vs canary vs rolling with explicit reasons (safety-critical vs continuous deploy vs cheap stateless) and naming feature flags as the deploy/release decoupling primitive is the modern staff baseline. Shadow traffic is the senior signal for validating major rewrites or model deployments — Stripe, Netflix, and Google all use it heavily.

**Common confusions**

- "Observability = monitoring" — monitoring is for known-unknowns; observability is for unknown-unknowns. You add observability before you need it.
- "SLA = SLO" — SLA is external + contractual; SLO is internal + operational. SLA penalties drive SLOs, not the other way.
- "Alerting on error count is enough" — too noisy on bad minutes, misses slow degradations; burn rate is the right metric.
- "Canary always works" — only if you have enough traffic for the % sample to be statistically meaningful at each step.
- "Feature flags = config" — they're a deployment pattern; ship dark, enable per-segment, kill instantly on regression.
- "Continuous profiling is too expensive" — sampling at 1% is virtually free and catches regressions metrics miss.

**What follows from this topic**

Observability primitives feed every other topic — Resilience needs SLOs to set retry budgets and circuit thresholds, Cost & Capacity needs metrics to size capacity at 60-70% utilisation, Anti-patterns are diagnosed via traces and profiles, AI / LLM Infrastructure needs TTFT and TPOT metrics as first-class. SLO-driven operations is the modern staff baseline; everything else assumes it.

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

### Summary

**What this topic covers**

The security primitives every senior engineer is expected to reason about at the system level — not application-bug-level OWASP details, but the design choices that determine whether a system is breach-resistant by construction. Six questions across (1) **AuthN vs AuthZ** and the canonical 2026 OAuth flows (Authorization Code + PKCE for public clients, Client Credentials for M2M); (2) **JWT** — stateless wins and the no-revocation-until-expiry catch; (3) **mTLS** — when service-to-service certificate authentication is worth the operational cost, and how service meshes hide it; (4) **authorization models** — RBAC vs ABAC vs ReBAC (Google Zanzibar-style, the modern SaaS default); (5) the **OWASP API Top 10** with BOLA (Broken Object Level Authorization) as the universally bites-everyone bug; and (6) the senior diagnostic on **protecting a public API from abuse** — layered defence from WAF through DDoS protection through rate limiting through bot detection.

**Mental model**

Security is **defence in depth**, not a single layer. Every production system pays for breaches in proportion to how thin its top layer is — WAFs catch known signatures, DDoS scrubbing absorbs volumetric attacks, rate limits stop credential stuffing, auth checks stop unauthenticated access, authorization checks stop cross-tenant data leaks. The BOLA problem is canonical: an endpoint that accepts an object ID, looks it up, and returns it *without* verifying the caller owns that object lets any authenticated user read any tenant's data with a simple ID enumeration. The fix is systemic — ReBAC plus middleware enforcement — not per-endpoint discipline. The second mental shift: **JWT is a stateless wins / no-revocation tradeoff**. Stateless tokens scale beautifully and need no session store, but you can't invalidate a JWT until it expires. The mitigation is short-lived access tokens (5-15 min) plus refresh tokens, or a fast revocation list in Redis that defeats statelessness in exchange for instant revoke. The third shift: **mTLS is a service mesh feature in practice**. Without Istio / Linkerd / Consul Connect's automatic cert rotation, mTLS is operational pain — manual cert distribution, expiry monitoring, rotation. With a mesh, it's transparent and is the right default for zero-trust networks.

**Key terms**

- **AuthN (authentication)** — "who are you"; login, MFA, SSO.
- **AuthZ (authorization)** — "what can you do"; role / policy / relationship checks.
- **OAuth 2.0 Authorization Code + PKCE** — modern public-client flow; prevents intercepted code reuse.
- **OIDC** — OpenID Connect; sits on OAuth 2.0; adds identity claims via the ID token.
- **JWT** — JSON Web Token; signed, stateless, no revocation until expiry.
- **Refresh token** — long-lived, exchanged for short-lived access tokens; revocable server-side.
- **mTLS** — mutual TLS; both client and server present certs; service-mesh default for zero-trust.
- **RBAC** — Role-Based Access Control; users have roles, roles have permissions.
- **ABAC** — Attribute-Based; policies = function of user/resource/context attributes.
- **ReBAC** — Relationship-Based (Google Zanzibar); permissions defined via subject ↔ object relations.
- **BOLA** — Broken Object Level Authorization; the most common API bug; per-object access not checked.
- **WAF** — Web Application Firewall; Cloudflare, AWS WAF; signature-based attack blocking.

**Why interviewers ask this**

Two signals. (1) **JWT trade-off awareness** — the candidate who says "JWTs are stateless and great" without naming the revocation problem is signalling junior. The right framing is "short-lived JWTs plus refresh tokens for normal use, or stateful sessions when instant revoke matters; pick based on threat model". (2) **ReBAC fluency** — Google Zanzibar's relationship-based authorization is the backbone of Notion, Carta, Linear, and modern multi-tenant SaaS. Naming AuthZed/SpiceDB, Oso, OpenFGA as production implementations earns trust. The BOLA answer is the test for whether you've shipped multi-tenant APIs — the right fix is systemic middleware that checks ownership on every object access, not per-endpoint code review.

**Common confusions**

- "JWT = secure" — JWTs are signed, not encrypted by default. Don't put secrets in claims unless using JWE.
- "OAuth implicit grant is still fine" — deprecated; use Authorization Code + PKCE.
- "RBAC scales to all our needs" — RBAC breaks on fine-grained per-object permissions ("can user X edit document Y").
- "mTLS without a mesh is doable" — operationally it's miserable; cert rotation, expiry, distribution are the killers.
- "BOLA is just authentication" — it's authorization at the object level, not the endpoint level.
- "Bot detection is just rate limiting" — Cloudflare Bot Management, hCaptcha, BotID do behavioural fingerprinting beyond rate limits.

**What follows from this topic**

Security primitives feed Networking (mTLS terminates on the service mesh sidecar), Load Balancing (API gateways enforce authN/authZ at the edge), Resilience (rate limits are both anti-abuse and load-shedding), and AI / LLM Infrastructure (agent action budgets, tool sandboxing, prompt-injection defence are 2026 security additions). The layered-defence discipline generalises — no single layer is sufficient.

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

### Summary

**What this topic covers**

The cost and capacity discipline that 2026 staff interviewers grade explicitly — gone are the days when system design rounds ignored AWS bills. Seven questions across (1) **cloud cost dimensions in priority order** — compute, memory, storage, egress bandwidth, per-request fees, managed-service premiums; (2) **spot / preemptible instances** at 60-90% discount for stateless fault-tolerant workloads; (3) the **autoscaling trap** — scale-out fast, scale-in slow, reactive lags real load by minutes; (4) **cross-region data transfer** as the silent budget killer at $0.02-0.09/GB; (5) **capacity planning** — the 60-70% utilisation rule grounded in queueing theory; (6) the staff-tier diagnostic on **estimating monthly cloud cost of your design**; and (7) the **operational maturity tiers** framework that defines what "staff-level" actually looks like in 2026 interviews (functional → scalable → production-ready → operationally mature → war-story fluent).

**Mental model**

Cost is **the fifth non-functional requirement**, alongside latency, throughput, availability, and durability. Every design decision has a cost shape: managed RDS is 2-3× DIY Postgres but absorbs ops overhead; cross-region replication trades $0.02/GB egress for failover safety; pre-computed materialised views trade storage for query-time CPU. The senior framing is "I'm trading $X/month for Y benefit; here's why that's worth it at our scale". The second mental shift: **utilisation has tail behaviour**. Running at 90% mean utilisation puts you at 100% with significant probability — queueing theory says queue length approaches infinity as utilisation approaches 1. The 60-70% rule is not waste; it's the headroom that absorbs surge, failover, and growth. The third shift: **egress is the silent killer**. Compute and storage costs scale predictably; cross-region egress at $0.02-0.09/GB explodes silently when a "small" service moves 100GB/day cross-region. Mitigations: colocate compute and data, compress (zstd / brotli), batch, replicate locally instead of querying remotely, edge cache for read-heavy. The fourth shift: **operational maturity is a tier system**. 2026 staff interviews explicitly grade beyond "correct" and "scalable" into "production-ready" (SLOs + error budgets + capacity headroom), "operationally mature" (runbooks, on-call, chaos, cost models), and "war-story fluent" (Netflix solves this by X, here's the lesson). Hitting tier 1-2 alone is a senior signal, not staff.

**Key terms**

- **Compute cost** — CPU-hours; usually the largest line; right-sized via instance type + count.
- **Egress bandwidth** — cross-region/AZ transfer at $0.02-0.09/GB; the silent budget killer.
- **Per-request fees** — DynamoDB RCU/WCU, API Gateway, Lambda invocations, S3 PUT/GET.
- **Managed-service premium** — 2-3× DIY infra cost; bought for ops simplicity.
- **Spot / preemptible** — 60-90% off; reclaimable on 30-120s notice; for stateless fault-tolerant workloads.
- **Reactive autoscaling** — CPU > threshold → add; lags by minutes.
- **Predictive autoscaling** — historical pattern-based; scales ahead of load.
- **Scale-out vs scale-in** — out is fast, in is slow (connection drain, deregister, handoff).
- **60-70% utilisation rule** — tail-aware capacity target; absorbs surge + N+1 failover.
- **N+1 redundancy** — capacity to lose one instance and still serve peak.
- **Tier framework** — functional / scalable / production-ready / operationally mature / war-story fluent.
- **Right-sizing** — most prod is over-provisioned 2-10×; first lever in cost optimisation.

**Why interviewers ask this**

Three signals. (1) **Cost reasoning at design time** — 2026 staff candidates can give "this design costs ~$50k/month at 1M DAU, ~$2M at 100M DAU" within 30 seconds of estimation, with assumptions written down. Knowing the rough numbers ($0.05/hour small instance, $0.50 mid, $3-5 GPU, $0.023/GB-month S3, $0.10 EBS, $0.20 RDS) is a memorisation task that pays off. (2) **The 60-70% utilisation rule** with the queueing-theory justification ("utilisation → 1 means queue → infinity") proves you understand why over-provisioning is a feature, not waste. (3) **Operational maturity tier awareness** — naming the Hello Interview / Exponent tier framework and self-locating ("I'd hit tier 4 by adding chaos engineering, runbooks, and a cost model") is the staff-tier 2026 signal that separates candidates who know they're being graded on operations from candidates who think system design is just architecture.

**Common confusions**

- "Cloud is always cheaper than on-prem" — for variable load yes; for steady-state heavy workloads, dedicated hardware can win.
- "Right-sizing is one-time" — workloads drift; right-sizing is a continuous discipline.
- "Spot saves 90% always" — only with proper fleet diversification + retry logic for reclaims.
- "Autoscale on CPU is enough" — queue depth, request latency, and custom metrics often work better.
- "90% utilisation is efficient" — it's the precursor to outage; queue length explodes as utilisation → 1.
- "Egress doesn't matter" — until you accidentally move 100GB/day cross-region for a year.

**What follows from this topic**

Cost discipline feeds every design choice — Caching is partly cost optimisation (avoid DB requests at $0.0001 each), CDN coverage is cost optimisation (avoid cross-region egress), spot fleets are cost optimisation for stateless workers, and GPU autoscaling in AI / LLM Infrastructure is the new frontier because GPU idle cost is brutal. The "estimate the monthly cost" question now appears in 30%+ of staff system design rounds.

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

### Summary

**What this topic covers**

The six probabilistic and tree-shaped data structures that appear constantly in production system design at scale. Six questions across (1) **bloom filters** — probabilistic set membership with no false negatives and bounded false positives, at ~10 bits per element; (2) **HyperLogLog** — cardinality estimation in O(1) memory (~12KB for billion-element cardinality at 1% error); (3) **Count-Min Sketch** — frequency estimation with bounded error for top-K and heavy-hitter detection; (4) **Merkle trees** — hash trees enabling efficient comparison of large datasets (Git, blockchain, Dynamo anti-entropy, Certificate Transparency); (5) **skip lists** — probabilistic sorted structures used in Redis sorted sets and some LSM memtables; and (6) **tries / radix trees** — prefix-query structures behind autocomplete, IP routing tables, and Postgres GIN indexes.

**Mental model**

These six structures share a theme: **trade exact answers for sub-linear memory or sub-linear comparison**. Bloom filters give you "definitely not in set" or "probably in set" at ~10 bits per element regardless of element size — Cassandra and HBase use them per SSTable to skip reads that would miss. HyperLogLog answers "how many distinct things" with 12KB regardless of cardinality — Redis `PFCOUNT` is the production face. Count-Min Sketch answers "how many of this thing" with bounded error in sub-linear memory — DDoS detection, hot key tracking, query optimisers. The second theme: **structural identity via hashing**. Merkle trees hash children up to a root, so two replicas can compare roots in O(1) and only descend where they differ — the basis of Dynamo-style anti-entropy, Git's content-addressable storage, blockchain block hashes, and Certificate Transparency. The third theme: **prefix structures for prefix problems**. Tries (or compressed radix trees) make "what words start with 'sys'" an O(prefix length) operation regardless of corpus size; the Linux kernel's IP routing table is a radix tree, Postgres GIN indexes use them, autocomplete services use them. The senior signal is matching the data structure to the question shape — "unique users at scale" → HLL, "set membership at scale" → bloom, "sync two replicas" → Merkle.

**Key terms**

- **Bloom filter** — probabilistic set membership; no false negatives; tunable false positive rate; ~10 bits per element.
- **HyperLogLog (HLL)** — cardinality estimation; ~12KB for billions of distinct elements; Redis `PFADD` / `PFCOUNT`.
- **Count-Min Sketch (CMS)** — frequency estimation; upper-bound counter; tunable accuracy/memory; Apache DataSketches.
- **Heavy hitters** — top-K frequent items detected via CMS; DDoS, hot key, query optimisation.
- **Merkle tree** — tree of hashes; root hash uniquely identifies contents; O(differences × log N) comparison.
- **Anti-entropy** — periodic replica reconciliation via Merkle tree diffs; Cassandra, Riak, Dynamo.
- **Skip list** — probabilistic sorted linked list with skip levels; O(log N) ops; Redis sorted sets.
- **Trie (prefix tree)** — character-per-node tree; O(prefix length) prefix queries.
- **Radix tree (compressed trie)** — single-child chains merged; space-efficient; Linux kernel routing.
- **GIN index (Postgres)** — Generalized Inverted Index; trie-backed; full-text search, JSON containment, array operations.
- **Probabilistic data structure** — trades accuracy for sub-linear memory; lossy by design.
- **Pre-filter** — bloom filter as a cheap gate before expensive lookups (DB, cache, disk).

**Why interviewers ask this**

Two signals. (1) **Pattern matching from prompt to data structure** — when the prompt mentions "unique users at scale", staff candidates reach for HyperLogLog without prompting; "set membership cheaply" → bloom filter; "sync two replicas efficiently" → Merkle tree; "fast autocomplete" → trie. Recognising these is the test for whether you've internalised the catalogue. (2) **Production naming** — Cassandra/HBase/LevelDB bloom filters, Redis HyperLogLog, Apache DataSketches CMS, Git/blockchain/Dynamo Merkle trees, Redis ZSET skip lists, Linux kernel radix tree routing. Naming where they actually run in production turns "I read about this" into "I've thought about how this is used".

**Common confusions**

- "Bloom filters have false negatives" — they don't; they only have false positives. Get this wrong and you've lost the room.
- "HyperLogLog gives exact counts" — it's lossy; ~1% error is typical, no `PFREMOVE` exists, but merges are clean.
- "Count-Min Sketch counts exactly" — it gives an upper bound; underestimates are impossible, overestimates are bounded.
- "Merkle trees are blockchain-only" — they predate blockchain by decades; Git, Cassandra, Dynamo, S3 all use them.
- "Skip lists are obsolete" — Redis sorted sets use them; LSM memtables sometimes do; they're alive in production.
- "Tries are slow because of pointer chasing" — radix trees compress single-child chains; production implementations are cache-friendly.

**What follows from this topic**

Data structures feed Caching (bloom filter as negative-cache gate), Database Scaling (Merkle anti-entropy for replica sync), Search (tries for autocomplete, inverted indexes for full-text), Real-Time (skip lists for sorted sets, leaderboards), and Cost & Capacity (HLL and CMS save orders of magnitude of memory vs exact counts). The "match the shape of the question to the data structure" discipline is the canonical pattern-recognition test in senior interviews.

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

### Summary

**What this topic covers**

The nine architectural smells that signal a senior engineer "this design is going to hurt you". Questions cover (1) the **distributed monolith** — microservices coupled by shared deploy / data / synchronous chains; worse than a real monolith because you get operational pain plus deployment coupling; (2) **synchronous chains A → B → C → D** where latency multiplies, failure probability multiplies, and partial-failure handling is exponential; (3) **shared databases between services** breaking schema ownership, coordination, and failure isolation; (4) **unbounded queues** that hide imbalance until OOM; (5) **dual writes** to DB + Kafka in the same code path inevitably failing in inconsistent ways; (6) **cache as source of truth** with all four failure modes (eviction, crash, replication lag, invalidation bugs); (7) **premature sharding** as a one-way door that's hard to reverse; (8) **microservices without operational maturity** — distributed tracing, log aggregation, service catalogue, schema versioning are prerequisites; and (9) **coordination on the hot path** as the canonical availability hazard.

**Mental model**

Anti-patterns are **shapes of regret**. Each one starts as a reasonable-looking decision and compounds into something painful you can't easily reverse. The recurring theme: **complexity that doesn't earn its cost**. Microservices are right when team independence + operational maturity + clear bounded contexts justify them; distributed monoliths are what you get when you split the code but not the data. Synchronous chains are right when latency + failure budgets allow them; they're catastrophic when one hop's blip cascades through four. Sharding is right when a tuned Postgres on a 24TB-RAM box has demonstrably hit its ceiling; it's a one-way door that adds operational complexity dwarfing imagined scale benefits. The second mental shift: **smells share solutions**. Outbox + idempotent consumers solves dual writes; sagas + compensations solve synchronous chains for cross-service workflows; database-per-service solves shared databases; bounded queues with explicit policies solve unbounded queues; coordination at the edges (initialisation, config) solves hot-path coordination. The third shift: **the modular monolith is the modern starting point**. The honest senior take is "start with a modular monolith with clear bounded contexts; extract services only when team / scale / independence pain justifies the operational cost". Premature microservices is the dominant 2026 anti-pattern.

**Key terms**

- **Distributed monolith** — microservices coupled by shared deploy / data / sync calls; worst of both worlds.
- **Synchronous chain** — A → B → C → D over the network; latency + failure multiply.
- **Shared database** — multiple services on one schema; coupling, contention, no clear ownership.
- **Unbounded queue** — no max depth; hides imbalance until OOM.
- **Dual writes** — DB + Kafka in same code path; one will fail; no clean recovery.
- **Outbox pattern** — DB + event row in one txn; publisher reads outbox; the dual-write fix.
- **Cache as source of truth** — Redis treated as durable; eviction / crash / replication lag / invalidation bugs.
- **Premature sharding** — sharding before exhausting vertical / replicas / caching / partitioning; one-way door.
- **Modular monolith** — single deployable with clear bounded contexts; extract to services only when justified.
- **Coordination on the hot path** — distributed locks / consensus per request; availability dependency.
- **Bounded context** — DDD term; a clear scope of language and ownership; the prerequisite for service extraction.
- **Microservices prerequisites** — tracing, log aggregation, service catalogue, schema versioning, deploy automation, observability per service, mTLS, retries everywhere.

**Why interviewers ask this**

Three signals. (1) **The "modular monolith first" instinct** — 2026 staff candidates resist microservices for small teams and reach for them only when team independence + operational maturity + bounded context clarity all justify the cost. Naming "modular monolith with clear bounded contexts" as the modern starting point is the senior signal. (2) **The dual-write → outbox migration** as a war story — candidates who can recite "we used to write to DB and Kafka in the same code path, hit inconsistency we couldn't recover from, moved to outbox + idempotent consumers" are signalling production experience. (3) **The premature-sharding diagnostic** — the right order of escalation (vertical → replicas → caching → query opt → table partitioning → functional partitioning → sharding) is a discipline question; staff candidates climb it in order, juniors jump to the destination.

**Common confusions**

- "Microservices are better than monoliths" — only with operational maturity; without it, the inverse is true.
- "Synchronous chains are fine if everything is fast" — until one hop blips and the cascade takes 4 services down.
- "Shared databases are pragmatic at small scale" — they ossify into coupling; pay the database-per-service cost early.
- "Unbounded queues smooth bursts" — they smooth bursts up to OOM; bound them.
- "Cache crashes are rare" — eviction under memory pressure is constant; treating cache as truth loses data routinely.
- "Sharding is just adding boxes" — it's a schema-design + routing + rebalancing + ops one-way door.

**What follows from this topic**

Anti-patterns feed every other section as cautionary tales — Database Scaling's order of escalation is the cure for premature sharding, Messaging's outbox pattern is the cure for dual writes, Caching's "DB is source of truth" is the cure for cache-as-truth, Consensus's "edges not data plane" is the cure for hot-path coordination. Bring receipts on these — interviewers love war stories about avoiding (or surviving) each smell.

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

### Summary

**What this topic covers**

The meta-skill that separates senior from staff in system design interviews — naming every design choice as an explicit tradeoff axis with a chosen endpoint, instead of saying "we'll use X". Five questions across (1) **how to frame a design choice** in senior language ("I'm choosing consistency over availability for this feature because…"); (2) the **ten classic tradeoff axes** with examples (consistency vs availability, latency vs consistency, read vs write throughput, storage vs compute, push vs pull, sync vs async, coupling vs coordination, cost vs performance, simplicity vs scale, generality vs optimisation); (3) the **"one DB for all" vs "polyglot persistence"** debate and how the 2020s reversed the 2012 polyglot orthodoxy; (4) a **pattern-recognition cheat sheet** mapping prompt signals to canonical patterns; and (5) the staff-tier framework for **structuring a 45-minute system design interview** (requirements 5min → capacity estimation 5min → high-level design 10min → data model 5-10min → deep dive 10-15min → wrap-up 5min).

**Mental model**

Every senior system design answer is **a sequence of explicit tradeoffs**. The phrasing "we trade Y for Z by using X" alone moves you a level — "we trade strong consistency for low latency by serving reads from local replicas with up to 100ms staleness". The opposite ("we'll use Redis") is the junior tell. The second mental shift: **the cheat sheet is internalised pattern recognition**, not a lookup table. When the prompt mentions "real-time updates", the senior reflex is "WebSocket / SSE + pub/sub fanout + CRDTs if collaborative". When it mentions "rate limit", the reflex is "token bucket in Redis with a Lua script for atomicity". When it mentions "long-running workflow", the reflex is "orchestrated saga via Temporal / Step Functions". This recognition is what makes a 45-minute interview tractable — you compose familiar patterns rather than inventing from scratch. The third mental shift: **the polyglot pendulum has swung back**. Pramod Sadalage's 2012 polyglot persistence argument made sense when Postgres was relational-only; modern Postgres handles JSON + FTS + vectors + geo + analytics-via-Citus in one engine. The 2026 senior default is "start with just Postgres; reach for specialist engines only when a specific workload genuinely outgrows it". This is the cost-aware-adoption discipline applied to data infrastructure.

**Key terms**

- **Tradeoff axis** — named dimension along which design choices live; explicit endpoints both visible.
- **Consistency vs availability** — under partition, refuse writes (CP) or accept stale reads/writes (AP).
- **Latency vs consistency** — local replica fast read vs global agreement; PACELC's "else" clause.
- **Push vs pull** — fanout-on-write vs fanout-on-read; Twitter timeline is canonical.
- **Sync vs async** — request/response vs event-driven; coupling vs throughput.
- **Coupling vs coordination** — choreography (events) vs orchestration (workflow engine).
- **Cost vs performance** — cold storage vs hot in-memory; S3 Glacier vs Redis.
- **Simplicity vs scale** — vertical scale vs horizontal sharding; defer the latter.
- **Polyglot persistence** — multiple DBs for multiple workloads; expensive ops, sometimes justified.
- **Pattern-recognition cheat sheet** — prompt signal → canonical pattern mapping.
- **Bring receipts** — name production examples to ground every tradeoff claim.
- **Interview structure** — requirements → capacity → high-level → data model → deep dive → wrap-up.

**Why interviewers ask this**

Two signals. (1) **Tradeoff phrasing alone moves you a level**. The candidate who says "I'm trading X for Y because Z" wins the room over the candidate who says "I'll use Redis". This is a habit, not knowledge — practice it until it's reflexive. (2) **The 45-minute interview structure** — junior candidates dive into boxes-and-arrows without clarifying requirements; staff candidates spend the first 5 minutes on functional + non-functional requirements (scale, SLOs, consistency expectations, dominant access patterns) and the last 5 on wrap-up (tradeoffs reviewed, what they'd revisit, what they'd monitor). The cheat sheet earns trust at the high-level design stage — "this prompt smells like a fanout-on-write problem with a celebrity-pull hybrid" is the recognition that buys you airtime for the deep dive.

**Common confusions**

- "Just say what you'd build" — without naming the tradeoff, you sound like a junior dev picking from memory.
- "Polyglot persistence is best practice" — it was in 2012; modern Postgres makes "just Postgres" the right starting point.
- "Patterns are scripts to recite" — they're tools to compose; recognition is the skill, not memorisation.
- "Strong consistency is always better" — only when you need it; most user-visible data tolerates eventual.
- "Cost optimisation is later" — 2026 staff interviews evaluate cost reasoning at design time.
- "Coupling is bad" — only when it's accidental; deliberate coupling for transactional consistency is sometimes correct.

**What follows from this topic**

Tradeoff vocabulary is the **meta-topic** that frames every other section — Caching is read-latency vs write-cost, Database Scaling is simplicity vs scale, Consensus is availability vs correctness, Sagas vs 2PC is loose vs strict consistency. The cheat sheet plus interview structure plus polyglot pendulum awareness is the modern senior baseline; everything else in this primer is the catalogue you draw from when applying these axes.

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

### Summary

**What this topic covers**

The 2026 reality that ~50% of staff-level system design rounds include an ML-adjacent question, and the patterns specific to LLM serving / RAG / agent infrastructure that don't reduce to traditional web service design. Eight questions across (1) **designing 10k concurrent LLM requests** with 2-8s latency on $3/hr GPUs — queue with priority tiers, token-level streaming, queue-depth autoscaling, batch inference (vLLM, TensorRT-LLM, Triton); (2) **GPU autoscaling** with 3-7 minute cold starts, no partial scale, brutal idle cost; (3) **RAG architecture** — ingestion (chunk + embed + vector DB) plus query path (hybrid search + reranker + LLM generation with citations); (4) **AI agent safety** — tool sandboxing, action budgets, human-in-the-loop, audit logs, capability boundaries; (5) **token-level streaming response** — SSE / WebSocket / HTTP/2 streaming, cancellation propagation, time-to-first-token as a first-class metric; (6) **distributing a 100GB model** to 1000 inference machines via P2P + tiered caching + compression; (7) **feature stores** — train/serve consistency, offline + online stores (Feast, Tecton, Vertex AI); and (8) **LLM inference latency breakdown** — TTFT, TPOT, and the levers (quantisation, prompt caching, speculative decoding, prefix sharing).

**Mental model**

LLM serving breaks three traditional assumptions. (1) **Latency is seconds, not milliseconds** — a request takes 2-8s, sometimes more. Active connections live for the full inference duration; thread / connection pool sizing changes radically (Little's Law says 10k RPS × 5s service time = 50k concurrent in-flight). (2) **Compute is expensive** — GPUs cost 30-100× CPU instances; you can't over-provision casually. Spot interruption costs you 3-7 minutes of cold start to replace. (3) **Output is variable-length** — a request emits 50 tokens or 5000; you can't pre-allocate response buffers. The production response is a different shape from web serving: **token-level streaming** so users see something at 200ms instead of 5s, **batch inference at the model layer** to amortise GPU memory bandwidth, **queue with priority tiers** so paid users get low-latency lanes, **autoscale on queue depth + GPU utilisation** rather than CPU. The second mental shift: **RAG is hybrid by default in 2026** — BM25 plus vector ANN plus reranker, not pure vector. The third shift: **agent safety is an unsolved research problem**; production deployments over-rotate to human review for irreversible actions. Tool sandboxing (Firecracker / gVisor), action budgets, capability boundaries, and audit logs are the layered defence — analogous to defence-in-depth for traditional security but with prompt injection as the new attack surface.

**Key terms**

- **TTFT (Time-To-First-Token)** — prompt processing latency; proportional to input length; 50-500ms on 7B, seconds on 70B+.
- **TPOT (Time-Per-Output-Token)** — 10-50ms per token typically; total = TTFT + TPOT × output length.
- **Continuous batching** — vLLM PagedAttention; multiple requests per forward pass; amortises memory bandwidth.
- **Token streaming (SSE)** — emit tokens as generated; reduces perceived latency dramatically.
- **RAG (Retrieval-Augmented Generation)** — retrieve relevant context → assemble → LLM generates with citations.
- **Vector DB** — pgvector, Pinecone, Weaviate, Milvus; ANN search over embeddings.
- **Hybrid search** — BM25 + vector ANN combined via RRF; the 2026 retrieval default.
- **Cross-encoder reranker** — neural rerank of top-K (10-50) for quality; expensive but accurate.
- **Prompt caching** — Anthropic / OpenAI APIs cache prefix; slashes TTFT for chatbots.
- **Speculative decoding** — small model proposes tokens, large model verifies; 2-3× speedup.
- **Quantisation** — 4-bit / 8-bit weights (GPTQ, AWQ); 2-3× faster, mild quality loss.
- **Feature store** — single feature definition for training + serving; Feast, Tecton, Vertex AI; train/serve consistency.

**Why interviewers ask this**

Three signals. (1) **Awareness that LLM serving is different** — staff candidates who treat a 10k-concurrent-LLM-request prompt like a web service prompt lose the room. The right answer names queue + streaming + batch + GPU-aware autoscaling within 60 seconds. (2) **Hybrid RAG fluency** — saying "vector DB and an LLM" is 2023-vintage; saying "BM25 + vector ANN + RRF + cross-encoder reranker for top-K + LLM with citation grounding" is the 2026 staff baseline. (3) **Cost-aware GPU reasoning** — knowing GPUs cost $3/hour, that 30-100× CPU pricing means over-provisioning hurts immediately, and that spot interruption costs you 3-7 minutes of cold-start time, is the test for whether you've operated ML serving. The 100GB-model-distribution question is a 2026 staff favourite — naming BitTorrent-style P2P (Meta Torchcache, Uber Petastorm, Dragonfly) + tiered caching + zstd compression separates engineers who've shipped from engineers who haven't.

**Common confusions**

- "LLM serving is just web serving with bigger boxes" — variable latency + GPU cost + variable output length break traditional assumptions.
- "Vector search is enough for RAG" — hybrid (lexical + vector) plus reranker is the modern default.
- "GPU autoscaling is CPU autoscaling with GPUs" — cold starts are 10× longer, no partial scale, idle cost is brutal.
- "Agents can be deployed like services" — irreversible action requires human-in-the-loop; agent safety is unsolved.
- "Streaming is a UI optimisation" — it's an architectural choice; connection lifetime, cancellation, observability all change.
- "Pull the model from S3 on each box" — at 100GB × 1000 boxes, you'll DDoS your own S3; use P2P + tiered caching.

**What follows from this topic**

AI / LLM infrastructure feeds Search (RAG is hybrid retrieval), Resilience (priority-tier queues, streaming-cancellation propagation), Cost & Capacity (GPU economics are the new frontier), Observability (TTFT, TPOT, embedding drift, citation accuracy as new metrics), and Security (prompt injection, agent action sandboxing). This section grows year-over-year; expect more depth in 2027 interviews.

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

### Summary

**What this topic covers**

The platforms and frameworks that 2026 senior interviewers expect you to name by version + capability, not just by category. Eight questions across (1) **KRaft** — Kafka's internal Raft-based metadata cluster replacing ZooKeeper, default since 3.5+; (2) **Kafka exactly-once semantics** via transactional API + idempotent producers, plus the cross-system honest answer; (3) **Flink vs Kafka Streams** — embedded library vs separate cluster, when each fits; (4) **Temporal** — durable replayable workflow engine replacing hand-rolled state machines + cron + queue glue; (5) **AWS Step Functions vs Temporal vs Cadence** decision matrix; (6) **Sidekiq / Celery / Hangfire / Bull** as the lighter "background job" tier; (7) **real-time data warehouse shape** — streaming ETL via Flink / Materialize / RisingWave / ClickHouse + Kafka engine; and (8) **edge functions** — Cloudflare Workers, Vercel Edge, AWS Lambda@Edge, Deno Deploy, and when V8-isolate-constrained runtime pays off.

**Mental model**

Modern data infrastructure is **stratified by latency, state size, and operational complexity**. At the messaging layer, Kafka with KRaft is the universal default; Pulsar / Kinesis / Redpanda compete on specific axes. At the stream processing layer, Kafka Streams is the lightweight embedded option (deploys with your app), Flink is the heavy-state heavy-latency-correctness option (separate cluster, RocksDB-backed state, event-time watermarks, exactly-once across complex pipelines). At the workflow layer, Sidekiq / Celery / Hangfire / Bull are the "send-email, generate-report" tier; Temporal / Step Functions / Cadence are the "long-running multi-step workflow with compensations and human-in-the-loop" tier. The mistake is using Sidekiq for what should be Temporal — ending up rebuilding workflow state in job code. The second mental shift: **the real-time data warehouse replaced batch ETL for many workloads**. Old shape: nightly batch into Snowflake / BigQuery / Redshift; analysts query yesterday's data. New shape: streaming ETL via Flink / Kafka Connect / Materialize / RisingWave continuously populating ClickHouse / Druid / Pinot, with dashboards reflecting 1-second-stale data. The distinction matters: batch warehouse for ad-hoc analytics, real-time OLAP for live dashboards, operational store (Postgres) for app data. The third shift: **edge compute pays off for specific shapes** — personalised CDN responses, API aggregation, A/B routing without origin round trips. It doesn't replace backend services for heavy compute or stateful workloads.

**Key terms**

- **KRaft** — Kafka Raft metadata cluster; replaces ZooKeeper since 3.5+; faster failover, more partitions.
- **Kafka transactional API** — exactly-once within Kafka via `beginTransaction` / `commitTransaction`.
- **Idempotent producer** — `enable.idempotence=true`; dedupes producer retries via sequence numbers.
- **Kafka Streams** — embedded library; deploys with your app; good for lightweight stateful processing.
- **Flink** — separate streaming cluster; event-time watermarks, RocksDB state, exactly-once.
- **Temporal** — durable replayable workflow engine; code-defined; Go/Java/TS/Python SDKs.
- **Cadence** — Uber's predecessor to Temporal; similar capabilities; less momentum in 2026.
- **AWS Step Functions** — serverless JSON-defined workflows; deep AWS integration; vendor lock-in.
- **Sidekiq / Celery / Hangfire / Bull** — job queue tier; single-step async work; not for long workflows.
- **Materialize / RisingWave** — streaming SQL engines; incremental view maintenance over Kafka.
- **ClickHouse / Druid / Pinot** — real-time OLAP; live dashboards over minutes-to-second-fresh data.
- **Edge functions** — Cloudflare Workers, Vercel Edge, Lambda@Edge, Deno Deploy; V8 isolates; sub-50ms global latency.

**Why interviewers ask this**

Three signals. (1) **Version-aware naming** — saying "Kafka with KRaft" (default since 3.5+, ZooKeeper deprecated) earns trust over "Kafka with ZooKeeper". Same for "Temporal" over generic "workflow engine". (2) **Tier-appropriate framework picks** — Sidekiq for single-step jobs, Temporal for multi-step long-running workflows, Flink for stateful streaming at scale, Kafka Streams for in-app real-time enrichment. The wrong pick is the junior tell. (3) **Real-time warehouse fluency** — knowing the line between batch warehouse (BigQuery / Snowflake), real-time OLAP (ClickHouse / Druid / Pinot), and operational store (Postgres) and *not confusing them* is the 2026 staff-tier signal. Materialize and RisingWave are 2026 mentions worth knowing — streaming SQL with incremental view maintenance is the modern shape.

**Common confusions**

- "Kafka exactly-once works across systems" — only within Kafka; cross-system needs idempotent consumers + at-least-once.
- "Flink and Kafka Streams are interchangeable" — Flink for heavy state + complex windowing; Streams for lightweight in-app.
- "Temporal is just a job queue" — it's a workflow engine; durable replayable execution, not single-step jobs.
- "Step Functions are framework-agnostic" — they're AWS-locked; complex logic in JSON gets ugly fast.
- "Edge functions replace backends" — they don't; heavy compute, stateful workloads, large deps don't fit V8 isolates.
- "ClickHouse is a data warehouse" — it's real-time OLAP; different shape from BigQuery / Snowflake.

**What follows from this topic**

Modern frameworks are the **production-grade implementations** of patterns introduced earlier — Kafka realises the Messaging section's log abstraction, Temporal realises the Resilience section's orchestrated saga, Flink realises the stream-processing watermarks of Messaging Q60, edge functions realise the Networking section's "compute at the POP" ideal. This section is where the patterns become deployable systems with specific operational characteristics.

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
