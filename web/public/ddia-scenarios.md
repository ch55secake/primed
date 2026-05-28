---
created-on: "[[Journal/2026/May/28-Wed]]"
ctime: 2026-05-28 09:00:00
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

### 1. Design a Distributed Key-Value Store

#### Problem
Build a fault-tolerant, horizontally scalable key-value store that supports get/set/delete operations. It must survive node failures without data loss, partition data across nodes, and remain available under partial failure.

#### Summary
**The picture in your head:** a hash ring of nodes, each holding a slice of the keyspace, with each key replicated to N neighbours. Reads and writes go to the coordinator node for that key; the coordinator fans out to replicas and waits for a quorum before responding. If a node is down, its neighbours hold hints and hand off data when it recovers.

**The single-request walkthrough:** A client calls `PUT key=foo value=bar`. The client library hashes `foo` to a position on the consistent hash ring; sends the request to the coordinator (the first node clockwise of that position). The coordinator writes to itself and fans the write to N−1 replica nodes. It waits for W acknowledgements (quorum). Returns OK. A `GET foo` follows the same path, reads from R replicas, and returns the value with the highest version (vector clock). If W + R > N, you're guaranteed to see the latest write.

**The pieces:**
- **Consistent hashing** — maps keys to nodes; adding/removing a node only rebalances 1/N of keys, not the whole keyspace.
- **Replication factor N** — each key is stored on N consecutive ring nodes. Typically N=3.
- **Quorum (W, R)** — tunable consistency. W=2, R=2, N=3 → strong consistency. W=1, R=1 → high availability, eventual consistency.
- **Vector clocks** — track causality between versions of the same key across replicas. Detect and surface conflicts rather than silently picking a winner.
- **Hinted handoff** — if a replica is down, the coordinator stores a "hint" and delivers it when the replica recovers. Maintains write availability.
- **Anti-entropy / Merkle trees** — background process that compares trees of key hashes between replicas and syncs diverged data.

**The hard parts:** (1) Choosing W and R — strong consistency costs availability; eventual consistency requires conflict resolution. (2) Ring rebalancing — virtual nodes (vnodes) smooth out uneven key distribution. (3) Node failure vs. network partition — you can't tell the difference; pick availability or consistency per Brewer's CAP.

#### Clarifying Questions
- Read-heavy or write-heavy workload?
- What consistency model is acceptable — strong, eventual, or tunable?
- Expected data size per key? TTL support needed?
- How many nodes? What's the target replication factor?
- Geographic distribution — single region or multi-region?
- What does the client library look like — SDK or HTTP API?

#### Requirements
- **FR:** `get(key)`, `set(key, value, ttl?)`, `delete(key)`. Keys up to 1 KB, values up to 1 MB.
- **NFR:** p99 read <10ms, p99 write <20ms. Survive loss of any single node without data loss. Horizontal scale to hundreds of nodes.

#### Scale Estimate
- 100M keys, average value 10 KB → ~1 TB raw data. With N=3 replication → 3 TB total. At 100k ops/s peak: 10 GB/s read bandwidth across cluster. Per-node: 10 nodes → 300 GB data, 10k ops/s.

#### High-Level Design
Client → consistent-hash router → coordinator node → fan-out to N replicas (parallel) → quorum response → client. Background: anti-entropy daemon syncs diverged replicas via Merkle tree comparison. Gossip protocol maintains cluster membership.

#### Data Model
Single-table per node: `(key_hash, key, value_bytes, vector_clock, expiry_ts)`. Stored in an LSM-tree (LevelDB/RocksDB) for write-optimised throughput. Sorted by key_hash for range scans within a partition.

#### Detailed Design
- **Consistent hash ring** — SHA-256 of key mod 2^32. Each physical node owns 150 virtual nodes (vnodes) distributed around the ring for even distribution.
- **Coordinator** — first vnode clockwise from the key's hash position. Handles client requests, fans out to next N−1 nodes.
- **Quorum** — W=2 writes, R=2 reads (N=3). Clients can override per-request for lower latency (W=1) or stronger consistency (W=3).
- **Conflict resolution** — vector clocks surface conflicts; last-write-wins (LWW) by wall clock as a default fallback; application-level merge for CRDTs.
- **Gossip** — each node exchanges membership state with 3 random peers every second. Failure detection: node marked suspect after 3 missed heartbeats, dead after 10.

#### Failure Modes
- **Node crash** — replicas continue serving reads/writes. Hinted handoff queues writes for recovery. Anti-entropy syncs delta on rejoin.
- **Network partition** — coordinator can only reach W−1 replicas. If W not met: return error (CP behaviour) or write to available nodes and reconcile later (AP behaviour). Choose at design time.
- **Slow replica** — quorum doesn't wait for the straggler. Straggler catches up via anti-entropy.
- **Split brain** — two coordinators believe they own the same key. Vector clocks detect divergence; reconciliation on read.

#### Talking Points for the Interview
- Why consistent hashing over modulo hashing: adding a node with modulo remaps ~all keys; consistent hashing remaps only 1/N.
- Dynamo-style (Amazon) vs. Raft-based (etcd) — Dynamo is leaderless, highly available, eventual; Raft is leader-based, strongly consistent, lower write throughput.
- When to use LWW vs. vector clocks: LWW is simple but loses concurrent writes; vector clocks expose conflicts but require application-level merge.
- CRDTs as a path to conflict-free eventual consistency — counters, sets, registers.

### 2. Design a Replicated SQL Database with Leader-Follower Replication

#### Problem
Design the replication layer for a relational database. Writes go to a single leader; followers replicate asynchronously and serve reads. Handle failover when the leader crashes, and explain the consistency tradeoffs.

#### Summary
**The picture in your head:** one node is the leader — it accepts all writes, sequences them into an append-only replication log, and ships that log to follower nodes. Followers apply the log and serve read queries. If the leader crashes, one follower is promoted. The hard parts are: how far behind can followers be (replication lag), what happens during failover (who becomes leader, what about lost writes), and how clients are routed correctly after promotion.

**The key tradeoffs:** asynchronous replication = low write latency, risk of losing committed transactions on failover. Synchronous replication = no data loss on failover, write latency includes round-trip to at least one follower. Semi-synchronous = one synchronous follower, rest async — the common production default.

**Replication lag problems:** (1) Read-your-writes — you write on the leader, immediately read from a follower that hasn't replicated yet; you see stale data. Fix: route reads to the leader for a short window after a write, or use monotonic reads (always read from the same follower). (2) Causality violations — you read new data, then read old data because two reads hit different followers. Fix: monotonic reads, or include a read-after-write token (LSN — log sequence number).

#### Clarifying Questions
- Read/write ratio? How many followers needed for read scale?
- Can the application tolerate replication lag on reads, or is read-your-writes consistency required?
- What is the acceptable RPO (recovery point objective) on leader failover?
- Synchronous, asynchronous, or semi-synchronous replication?
- Manual or automatic failover?

#### Requirements
- **FR:** Single leader accepts writes. N followers serve reads. Automatic or semi-automatic failover on leader crash. Configurable sync/async per follower.
- **NFR:** Replication lag <1s under normal load. Failover completes in <30s. No split-brain.

#### Scale Estimate
- Leader handles 10k writes/s → WAL (write-ahead log) generates ~50 MB/s. Each follower must consume 50 MB/s of replication stream. 5 followers → 250 MB/s total replication bandwidth from leader.

#### High-Level Design
Client writes → leader (WAL append + apply) → replication stream → follower applies in order. Read clients connect to follower pool via load balancer. Separate replication monitor/agent detects leader failure and orchestrates promotion.

#### Data Model
**WAL / binlog** — ordered sequence of `(LSN, transaction_id, operation, table, row_before, row_after)`. Followers consume this stream and apply operations. Followers persist their current LSN; on reconnect they request from their last confirmed LSN.

#### Detailed Design
- **Logical replication** — ship row-level changes (INSERT/UPDATE/DELETE) rather than physical page writes. Allows followers to have different indexes, allows cross-version replication (Postgres logical replication model).
- **Replication slot** — leader tracks the minimum LSN any active follower has consumed; won't delete WAL until all slots have passed it. Risk: a slow/dead follower stalls WAL cleanup → disk exhaustion. Monitor slot lag.
- **Semi-synchronous** — leader waits for ACK from exactly one follower before committing. If that follower is unavailable, fall back to async (configurable). Guarantees at most one follower has the latest data.
- **Failover sequence:** (1) detect leader failure via missed heartbeats; (2) elect the follower with the highest LSN; (3) fence the old leader (STONITH — Shoot The Other Node In The Head) to prevent split-brain; (4) promote elected follower; (5) point other followers at new leader; (6) update DNS/connection pool.

#### Failure Modes
- **Replication lag spike** — follower falls behind during write burst. Reads from that follower return stale data. Mitigate: lag monitoring, route reads away from lagging followers.
- **Lost writes on failover** — async follower promoted before it received the last N transactions. RPO is non-zero. Mitigate: semi-sync replication, or accept RPO tradeoff.
- **Split-brain** — old leader recovers and accepts writes alongside new leader. Both have diverged state. Mitigate: fencing token / STONITH — old leader must be forcibly demoted before new leader is writable.
- **Replication slot bloat** — disconnected follower holds a slot; WAL accumulates indefinitely. Mitigate: drop inactive slots after lag threshold; alert early.

#### Talking Points for the Interview
- Postgres streaming replication (physical) vs. logical replication — physical replicates WAL byte-for-byte, requires same major version; logical replicates row changes, flexible but no DDL replication.
- Why synchronous replication hurts write latency: every write waits for a network round-trip to the synchronous follower. At 1ms RTT, max write throughput ≈ 1/(2×0.001) = 500 TPS single-threaded.
- Multi-leader replication — allows writes to multiple datacenters, but write conflicts require application-level resolution. Rarely worth it unless multi-region write latency is critical.
- Raft as an alternative — consensus-based leader election eliminates split-brain at the cost of write throughput (must replicate to majority before committing).

### 3. Design a Database Partitioning (Sharding) Strategy

#### Problem
A single relational database node can no longer handle the write throughput or data volume of a growing application. Design a horizontal partitioning (sharding) strategy that distributes data across multiple nodes while maintaining query correctness and operational manageability.

#### Summary
**The picture in your head:** instead of one big table, you have N copies of the schema spread across N nodes. Each row lives on exactly one shard, determined by a partition key. Queries that include the partition key go to one shard (fast). Queries that don't — scatter-gather across all shards (slow, painful). The choice of partition key is the most consequential design decision; get it wrong and you get hot spots or queries that can never be routed to a single shard.

**The strategies:** (1) Range partitioning — ranges of key values map to shards. Simple, enables range scans. Risk: hot spots if writes cluster at the high end (e.g., auto-increment IDs, time-based keys). (2) Hash partitioning — hash of key mod N. Even distribution. Destroys range query locality. (3) Directory-based — a lookup service maps keys to shards. Flexible; adds a hop and a single point of failure.

**The problem nobody mentions until it's too late:** cross-shard queries. Anything that joins data across shards requires scatter-gather — fan out to all shards, collect results, merge in the application. Expensive and complex. Design the partition key to co-locate data that is queried together.

#### Clarifying Questions
- What is the primary access pattern — point lookups, range scans, or aggregations?
- What entity is the natural partition unit? (user, tenant, order?)
- Are there secondary access patterns that require different partition keys?
- Expected data growth rate? How often will re-sharding be needed?
- Are cross-shard transactions required?

#### Requirements
- **FR:** Reads and writes for a single entity routed to a single shard with no fan-out. Re-sharding without downtime. Optional: cross-shard queries via scatter-gather.
- **NFR:** Even data distribution. No hot shards. p99 single-shard query <5ms. Re-shard operation completes in hours, not days.

#### Scale Estimate
- 10 TB data, 100k writes/s. Single node limit ~2 TB, ~10k writes/s. → minimum 10 shards by data, 10 by throughput → start with 16 shards (power of 2 for easier doubling). Each shard: 625 GB, 6.25k writes/s.

#### High-Level Design
Application layer holds a shard map (partition key → shard node). Writes: hash/range the partition key, route to correct shard. Reads: same routing. Cross-shard queries: scatter to all shards, gather results in application layer or a query coordinator. Background: re-sharding daemon splits hot shards online.

#### Data Model
Each shard is a full schema clone. Partition key embedded in every table that needs to be co-located (e.g., `user_id` on `orders`, `order_items`, `payments`). Cross-shard foreign keys replaced with application-level joins.

#### Detailed Design
- **Consistent hashing for shard assignment** — hash the partition key; assign to the nearest shard clockwise. Adding a shard moves only 1/N of data. Virtual nodes per shard smooth distribution.
- **Shard map service** — a small coordination service (ZooKeeper / etcd) stores the authoritative shard map. Application caches locally; invalidated on shard topology change.
- **Online re-sharding (split):** (1) create new shard; (2) dual-write to both old and new shard for the key range being moved; (3) backfill historical data to new shard; (4) once caught up, flip reads to new shard; (5) stop dual-write; (6) drop data from old shard.
- **Co-location** — all tables accessed together for the same entity share the same partition key so queries stay on one shard. Denormalise aggressively.

#### Failure Modes
- **Hot shard** — one shard receives disproportionate traffic (celebrity user, time-based key monotonically increasing). Mitigate: hash the partition key, add randomness to the key (compound key with a suffix), split the shard.
- **Cross-shard transaction** — two-phase commit (2PC) across shards. Slow, blocking, and fragile. Mitigate: avoid by design — architect to keep transactional boundaries within a single shard. If unavoidable: saga pattern.
- **Shard map inconsistency** — stale cache routes to wrong shard. Mitigate: versioned shard maps with invalidation; graceful misdirection (shard returns redirect error, client re-fetches map).
- **Uneven re-sharding** — new shard assignment creates an immediate hot spot. Mitigate: virtual nodes, observe write distribution before committing the new split.

#### Talking Points for the Interview
- Functional partitioning vs. horizontal sharding — functional splits by feature (users DB, orders DB); horizontal shards by key within one feature. Both are often applied together.
- Why auto-increment IDs are a terrible partition key: every new row goes to the same (highest) shard. Use UUIDs or time-based UUIDs (ULIDs) that hash evenly.
- The fan-out cost of scatter-gather: 16 shards × 5ms per shard query = 80ms minimum for any cross-shard aggregation, even with parallelism. Design it out of the hot path.
- Vitess (MySQL sharding), Citus (Postgres sharding) — production-grade middleware that handles shard routing, re-sharding, and cross-shard queries transparently.

### 4. Design a Distributed Transaction System (with Sagas)

#### Problem
You have a microservices system where a single business operation (e.g., placing an order) spans multiple services — inventory, payment, shipping. Design a mechanism to ensure that either all steps complete successfully or the entire operation is compensated and rolled back, without using distributed two-phase commit.

#### Summary
**The picture in your head:** a saga is a sequence of local transactions, one per service, linked by events. If step 3 fails, you don't roll back the DB — you run compensating transactions that undo the effects of steps 1 and 2. Think of it as forward-only progress with an escape hatch: instead of locking resources across services, you move forward and undo if needed.

**Why not 2PC:** two-phase commit works by having all participants hold locks until a coordinator says commit or abort. If the coordinator crashes after prepare but before commit, all participants block indefinitely. In a microservices architecture with dozens of services and network partitions, 2PC is a deadlock time bomb. Sagas exchange atomicity for availability: each step commits locally; rollback is via compensation, not lock release.

**Choreography vs. orchestration:** choreography — each service emits events and reacts to others' events; no central coordinator. Simple to implement, hard to reason about as complexity grows. Orchestration — a central saga orchestrator sends commands to each service and tracks state. More complex infrastructure, much easier to observe and debug.

#### Clarifying Questions
- How many steps are in the typical saga? What's the failure rate at each step?
- Is the business domain tolerant of temporary inconsistency (e.g., inventory reserved but payment not yet confirmed)?
- Are compensating transactions always possible, or are some steps irreversible?
- Do you need exactly-once saga execution, or is idempotent at-least-once acceptable?

#### Requirements
- **FR:** Multi-step business operation executes atomically from the user's perspective. On failure at any step, all prior steps are compensated. Saga state is durable and survives crashes.
- **NFR:** No cross-service locks. Saga completes in <5s under normal conditions. Compensation completes within 30s of failure detection.

#### Scale Estimate
- 10k orders/s → 10k sagas/s. Each saga: 4 steps (reserve inventory, charge payment, create shipment, confirm order). 40k local transactions/s distributed across 4 services (10k each).

#### High-Level Design
Client → Order Service (saga orchestrator) → sends commands to Inventory, Payment, Shipping services via message bus. Each service executes local transaction, publishes result event. Orchestrator listens to events, advances or compensates saga. Saga state stored in a durable saga store (Postgres table or event store).

#### Detailed Design
- **Saga state machine** — each saga is an instance of a state machine: `STARTED → INVENTORY_RESERVED → PAYMENT_CHARGED → SHIPMENT_CREATED → COMPLETED`. On failure at any state, transition to a compensation state: `PAYMENT_FAILED → COMPENSATING_INVENTORY → COMPENSATED`.
- **Idempotent command handlers** — each service's handler must be idempotent (same command applied twice = same result). Use a command ID / idempotency key stored with the local transaction.
- **Compensating transactions** — each step has a defined undo: inventory reservation has a release, payment charge has a refund. Compensations must also be idempotent.
- **Saga persistence** — the orchestrator persists every state transition before sending the next command. On crash/restart, it replays from the last persisted state.
- **Timeout handling** — if a service doesn't respond within N seconds, the orchestrator treats it as a failure and triggers compensation.

#### Failure Modes
- **Compensating transaction fails** — payment was charged but inventory release fails. The system is stuck in a partially compensated state. Mitigate: retry with exponential backoff + dead letter queue + human intervention alert.
- **Orchestrator crash mid-saga** — saga state was not persisted before crash. On restart, orchestrator doesn't know what happened. Mitigate: persist state before sending every command (write-ahead).
- **Duplicate command delivery** — at-least-once delivery means a service may receive the same command twice. Mitigate: idempotency keys stored with the local transaction result.
- **Irreversible step** — a step cannot be compensated (e.g., SMS sent, physical item shipped). Mitigate: identify these steps upfront; place them last in the saga so compensation is only needed for reversible prior steps.

#### Talking Points for the Interview
- Saga vs. 2PC: 2PC provides ACD (no I — isolation between distributed transactions is lost in practice); saga provides eventual consistency with compensation. For microservices, saga wins on availability.
- Why choreography doesn't scale to complex sagas: with 10 services each reacting to 5 event types, the implicit state machine becomes impossible to trace, debug, or change safely. Orchestration makes state explicit.
- Pivot to process managers: a saga orchestrator that also maintains business-level state (not just coordination state) is called a process manager. Useful for long-running workflows (days/weeks).
- Axon Framework, Temporal, AWS Step Functions — production saga/orchestration infrastructure.

### 5. Design a Change Data Capture (CDC) Pipeline

#### Problem
You need to propagate every write made to a production database to downstream consumers — a search index, a cache, an analytics warehouse, and a microservice — without double-writing from the application and without impacting the production DB's write performance.

#### Summary
**The picture in your head:** instead of the application publishing an event to a bus (dual-write, fragile), you treat the database's own replication log as the event source. A CDC tool (Debezium) reads the WAL / binlog as a follower would, transforms each row change into a structured event, and publishes it to Kafka. Downstream consumers subscribe to Kafka topics and update their own stores — search index, read model, warehouse — independently, at their own pace, with no impact on the write path.

**Why it beats dual-write:** dual-write requires the application to atomically write to the DB and publish to the bus. If the publish fails after the DB commit, the event is lost. CDC reads from the WAL — if the DB committed, the event will eventually be captured. At-least-once delivery. Downstream consumers must be idempotent.

**The operational concerns:** (1) Schema evolution — if you rename a column, the CDC event schema changes; downstream consumers break. Use a schema registry. (2) Log retention — the CDC tool holds a replication slot; if it falls behind, WAL accumulates and can fill the disk. Monitor slot lag aggressively. (3) Initial snapshot — for new consumers, you need to backfill historical data before switching to CDC. Debezium's snapshot mode handles this.

#### Clarifying Questions
- Which database is the source? (Postgres, MySQL, MongoDB — CDC mechanism differs)
- What downstream consumers need the data? What latency do they require?
- Is schema evolution expected? Do you need a schema registry?
- What's the acceptable consumer lag before alerting?
- Is exactly-once delivery required, or is idempotent at-least-once acceptable?

#### Requirements
- **FR:** All INSERT/UPDATE/DELETE on specified tables published to Kafka within 1s of commit. Multiple independent consumers. Supports initial snapshot for new consumers. Schema evolution without breaking consumers.
- **NFR:** <1s end-to-end latency (DB commit → Kafka → consumer). Zero impact on source DB write throughput. Replication slot lag <10s under normal load.

#### Scale Estimate
- Source DB: 50k writes/s → WAL generates ~100 MB/s. Debezium reads this as a logical replication follower. Kafka: 100 MB/s ingress on 1 topic with N partitions (partition by table + row key). Each consumer group reads at its own pace.

#### High-Level Design
Source DB → Debezium connector (reads WAL/binlog as a logical replication follower) → Kafka topic per table → consumer groups (search indexer, cache updater, warehouse loader, microservice projector). Schema Registry validates event schemas. Monitoring: Kafka consumer lag per group.

#### Data Model
Kafka event per row change: `{ op: "c|u|d", before: {...}, after: {...}, source: { table, lsn, ts_ms }, schema_version }`. Keyed by primary key for compaction (deletes tombstone prior versions). Schema defined in Avro/Protobuf in the Schema Registry.

#### Detailed Design
- **Debezium** — runs as a Kafka Connect connector. Connects to Postgres as a logical replication follower using `pgoutput` plugin. Reads WAL, transforms to structured change events, publishes to Kafka. Stores its offset (LSN) in Kafka Connect's offset store.
- **Replication slot** — Debezium creates a named logical replication slot in Postgres. The slot ensures Postgres keeps WAL until Debezium has consumed it. Critical: monitor slot lag; drop and recreate if Debezium is dead for too long.
- **Initial snapshot** — for each new consumer, Debezium can perform a consistent snapshot: take a read lock, export current table state as synthetic CREATE events, then switch to streaming WAL. The consumer sees a complete history from the start.
- **Schema Registry** — Confluent Schema Registry stores Avro schemas per topic. Producers register schema; consumers validate on read. Backward-compatible schema evolution (add optional fields) is automatic; breaking changes require a migration strategy.
- **Idempotent consumers** — CDC delivers at-least-once. Each consumer must deduplicate by (table, primary key, LSN) or use upsert semantics (insert-or-update rather than blind insert).

#### Failure Modes
- **Debezium lag / crash** — if Debezium stops consuming, the replication slot grows the WAL. If WAL fills the disk, Postgres crashes. Mitigate: alert at 5 GB slot lag; drop slot and rebuild from snapshot if Debezium is down > 1h.
- **Kafka consumer lag** — downstream consumer falls behind. Upstream data keeps flowing; consumer eventually catches up. Mitigate: consumer group lag monitoring, autoscaling consumers.
- **Schema mismatch** — producer deployed new schema before consumer updated. Schema Registry with backward compatibility prevents consumer crashes; consumer reads with the schema it registered against.
- **Large transaction** — a single DB transaction affects millions of rows. WAL burst floods Kafka. Mitigate: batch large operations outside peak hours; use Debezium's batch size limits.

#### Talking Points for the Interview
- CDC vs. outbox pattern: outbox is application-controlled (more explicit, works with any DB); CDC is infrastructure-level (zero application changes, but operationally more complex). In practice, both are used: outbox for events the domain cares about, CDC for replication to read models.
- Postgres logical replication vs. physical: logical ships row-level changes (flexible, cross-version); physical ships raw WAL pages (faster but version-locked).
- Log compaction in Kafka: compact topics retain only the latest value per key. Useful for CDC — consumers that start late only need the latest state of each row, not the full history.
- Debezium alternatives: Maxwell (MySQL only), AWS DMS, Google Datastream.

### 6. Design a Consensus System (Distributed Lock / Leader Election)

#### Problem
Multiple nodes in a distributed system need to agree on a single leader, or to acquire an exclusive lock on a shared resource. Design a system that ensures only one node holds the lock at a time, even under network partitions, node crashes, and clock skew.

#### Summary
**The picture in your head:** a Raft cluster of 5 nodes. Any node can try to become leader by running an election. To win, it must get votes from a majority (3 of 5). Once elected, it periodically sends heartbeats to maintain leadership. If a leader dies, the remaining nodes hold a new election after a timeout. Because decisions require a majority, you can never have two leaders simultaneously — a partition that splits into 2+3 means the 2-node partition can't form a majority and simply stops accepting writes.

**Why clocks don't work for distributed locks:** wall clocks drift. If node A holds a lock until `T+10s` by its clock, and node B's clock is 30s ahead, B will try to acquire the lock before A releases it, creating a race. The fix: use a fencing token — a monotonically increasing number issued by the lock service. The resource being protected rejects any request with a stale (lower) fencing token, even if the lock holder thinks it still holds the lock.

#### Clarifying Questions
- What is being protected — a resource, a leadership role, or a distributed counter?
- What is the acceptable time to detect a failure and acquire the lock (TTL, heartbeat interval)?
- How many nodes? What is the expected network partition frequency?
- Is the lock for short-lived operations (<1s) or long-lived leases (minutes)?
- Is ZooKeeper / etcd available, or does this need to be built from scratch?

#### Requirements
- **FR:** Only one node holds the lock at any time. Lock auto-expires if holder crashes (TTL). Lock holder can renew the lock. Returns a fencing token with each acquisition.
- **NFR:** Lock acquisition <100ms under normal conditions. Detect crash + re-grant within 2× TTL. Tolerates loss of minority of nodes without service interruption.

#### Scale Estimate
- 5-node consensus cluster (odd number for majority). Handles ~10k lock operations/s — mostly uncontended. Replication latency: 1–5ms within a datacenter.

#### High-Level Design
5-node Raft cluster (or ZooKeeper ensemble). Clients send lock requests to the leader. Leader replicates the grant to a majority of followers before returning. Heartbeat interval: 150ms. Election timeout: 300–600ms. On leader crash: election completes within 1 election timeout.

#### Detailed Design
- **Raft leader election** — each node starts as a follower. On election timeout with no heartbeat received: increment term, become candidate, vote for self, request votes from all nodes. Majority vote → become leader. Term number prevents stale leaders from issuing grants.
- **Lock as a Raft log entry** — lock acquisition is a log entry: `(lock_name, holder_id, fencing_token, expiry)`. Only committed (majority-replicated) entries are acknowledged to the client.
- **Fencing token** — the Raft log index of the lock grant. Monotonically increasing. The protected resource stores the highest seen token; rejects operations with a lower token.
- **TTL and heartbeat** — lock has a TTL (e.g., 10s). Holder sends a heartbeat every 3s to renew. If 3 consecutive heartbeats are missed, the lock expires and is re-granted.
- **Lease-based optimisation** — after the lock is granted, the holder can perform non-consensus reads for the duration of the lease without round-tripping to the consensus cluster. Safe as long as the lease is shorter than the minimum election timeout.

#### Failure Modes
- **Network partition (split brain attempt)** — a partitioned minority cannot form a majority; they cannot grant locks. The majority partition continues normally. No split brain.
- **Leader crash** — a new election completes within election timeout (typically <600ms). Fencing tokens ensure in-flight requests from the old leader are rejected by the protected resource.
- **Clock skew on TTL** — TTL is measured by the consensus cluster's logical time (term + heartbeat count), not wall clocks. Safe.
- **Thundering herd on leader crash** — all nodes time out at the same time and start elections simultaneously, causing vote-splitting and multiple rounds. Raft mitigates this with randomised election timeouts.

#### Talking Points for the Interview
- Why Redis SETNX is not a safe distributed lock: Redis single-node has no consensus; in a Redis Cluster, SETNX is not atomic across the hash slot's replicas; clock-based TTLs don't protect against GC pauses extending lock lifetime past expiry.
- Redlock (Martin Kleppmann critique) — even with 5 Redis nodes, Redlock can grant the same lock to two clients if a node crashes between grant and replication. Fencing tokens fix this at the cost of requiring the protected resource to validate tokens.
- ZooKeeper ephemeral znodes — a znode held by a session expires automatically when the client session dies. Simpler than TTL + heartbeat but requires the ZooKeeper client library.
- etcd leases — same concept; lease ID issued, operations tagged with lease ID, lease expires on client disconnect or TTL.

### 7. Design a Stream Processing System

#### Problem
You need to process a continuous, unbounded stream of events (e.g., user clickstream, IoT sensor readings, financial transactions) in real time — computing aggregations, detecting patterns, and writing results to downstream sinks — while handling late-arriving events, exactly-once semantics, and stateful operations.

#### Summary
**The picture in your head:** events flow into Kafka topics. A stream processor (Flink, Kafka Streams) consumes them, maintains state (windowed counts, running totals, join tables), and emits derived events or writes to output sinks. The hard parts are: (1) time — event time vs. processing time, watermarks to handle late data; (2) state — stateful operations must be checkpointed so they survive processor crashes; (3) exactly-once — preventing double-counting when a processor restarts after a crash.

**Windowing:** most aggregations are over a time window. Tumbling windows: fixed, non-overlapping (count events per minute). Sliding windows: overlapping (count events in any 5-minute window). Session windows: variable-length, closed after a period of inactivity. The choice depends on the business question.

**Watermarks:** the processor doesn't know when all events for a given time window have arrived — events can arrive late due to network delays. A watermark is a progress marker: "I believe all events with timestamp ≤ T have arrived." Events arriving after the watermark for their window are either dropped or trigger a late-arrival correction. Setting watermarks too early drops valid late events; too late delays output.

#### Clarifying Questions
- What are the latency requirements — real-time (<1s), near-real-time (<10s), or micro-batch (minutes)?
- What types of operations are needed — aggregations, joins, pattern detection, enrichment?
- What is the expected event rate (events/s) and event size?
- Are late-arriving events expected? What's the acceptable latency for late data?
- Is exactly-once processing required, or is at-least-once acceptable?
- What are the output sinks — another Kafka topic, a DB, a dashboard?

#### Requirements
- **FR:** Consume from Kafka. Compute windowed aggregations (e.g., sum, count, top-N per user per minute). Emit results to output sink within the latency SLA. Handle late events with configurable allowed lateness.
- **NFR:** Exactly-once semantics. Recover from processor crash with state intact within 30s. Scale to 1M events/s.

#### Scale Estimate
- 1M events/s at 500 bytes/event = 500 MB/s ingress. Kafka: 10 partitions × 50 MB/s each. Stream processor: 10 parallel tasks, one per partition. State store: windowed aggregations per user → 10M users × 1 window × 100B state = 1 GB per processing node.

#### High-Level Design
Kafka (source) → Flink job (stateful operators: filter, key-by user_id, window aggregate) → Kafka (sink topic) or OLAP DB (Druid, ClickHouse). Flink checkpoints state to S3 / HDFS every 30s. On failure: restart job, restore from last checkpoint, replay Kafka from checkpoint offset.

#### Detailed Design
- **Keyed state** — Flink partitions the event stream by key (e.g., `user_id`). All events for the same key go to the same operator instance; state for that key lives locally on that instance. No distributed locks needed.
- **Checkpointing** — Flink injects a checkpoint barrier into the event stream. When all operators have processed events up to the barrier, they snapshot their state to durable storage. On recovery, restore from snapshot and replay Kafka from the checkpoint's committed offset.
- **Exactly-once** — achieved by combining Flink's checkpointing (state) with Kafka's transactional producer (output). The output is only committed when the checkpoint completes; if the job crashes before the checkpoint, the output is aborted and replayed. Two-phase commit between Flink and Kafka.
- **Watermarks** — emitted by the source operator based on event timestamps. Flink advances the watermark to `max_event_time − allowed_lateness`. A window closes when the watermark passes the window's end time. Late events arriving after window close: either dropped, emitted as a side output, or trigger a window update (if late data correction is enabled).

#### Failure Modes
- **Processor crash** — job restarts from last checkpoint; replays Kafka events from the committed offset. Duplicate processing of events between checkpoint and crash handled by exactly-once output commit.
- **Kafka partition unavailable** — the corresponding Flink task pauses. Other tasks continue. On partition recovery, the task resumes from its checkpoint offset.
- **State backend full** — stateful aggregations grow unbounded. Mitigate: TTL on state (evict state not updated in N minutes), aggregate incrementally rather than storing raw events.
- **Watermark too aggressive** — watermark advances before late events arrive; those events' windows are already closed and results are emitted without them. Mitigate: calibrate `allowed_lateness` based on measured P99 event delivery delay.

#### Talking Points for the Interview
- Flink vs. Spark Streaming: Flink is true streaming (one event at a time, millisecond latency, native exactly-once). Spark Streaming is micro-batch (processes mini-batches every N seconds, higher latency). For <1s SLAs, Flink. For simplicity and batch/stream unification, Spark.
- Lambda architecture (batch + speed layer) vs. Kappa architecture (stream only): Lambda runs parallel batch and streaming paths and merges results — complex, dual codebase. Kappa uses only streaming; replay historical data through the same stream processor when you need batch reprocessing. Kappa is the modern default.
- Stateful vs. stateless operators: stateless (filter, map) are trivially parallelisable. Stateful (aggregations, joins, deduplication) require the same key to always go to the same operator instance (keyed partitioning). State size is the main scaling constraint.

### 8. Design a Write-Ahead Log (WAL) for Crash Recovery

#### Problem
A database must guarantee that committed transactions are durable even if the server crashes immediately after acknowledging a commit. Design the write-ahead logging mechanism that achieves this, and explain how recovery works after a crash.

#### Summary
**The picture in your head:** before any data page is written to disk, the change is first appended to the WAL — a sequential, append-only log on disk. The log record says "transaction T changed row X from value A to value B." Only after the WAL record is flushed to disk (fsync'd) is the commit ACK sent to the client. The actual data page can be written lazily later. If the server crashes after the ACK: the WAL record is on disk; recovery replays it. If the server crashes before the ACK: the WAL record is incomplete or missing; recovery ignores it.

**Why sequential writes are fast:** spinning disk random write ≈ 100 IOPS; sequential write ≈ 200 MB/s. SSDs narrow the gap but sequential writes are still faster. The WAL is always sequential; data page writes are random. By batching random data page writes (the buffer pool / page cache) and doing only sequential WAL writes on the hot path, databases achieve high throughput with durability.

#### Clarifying Questions
- OLTP or OLAP? (WAL design differs)
- What is the acceptable recovery time after a crash?
- Is group commit acceptable — batching multiple transactions' WAL records into a single fsync?
- How long should the WAL be retained? (Needed for replication, PITR, CDC)

#### Requirements
- **FR:** Every committed transaction's changes are in the WAL before ACK. Recovery replays WAL after crash to restore consistency. WAL supports replication consumers (followers, CDC tools).
- **NFR:** WAL write adds <1ms to commit latency. Recovery completes in <60s for a node that was down for <1 hour.

#### Scale Estimate
- 10k TPS, average 2 KB per transaction log record → 20 MB/s WAL write rate. On NVMe SSD, sequential write bandwidth ~3 GB/s → WAL is not the bottleneck. fsync overhead: with group commit, batch 100 transactions per fsync → 100 fsyncs/s instead of 10k/s. Fsync latency 0.1ms → 10ms overhead amortised over 100 transactions = 0.1ms/transaction.

#### High-Level Design
Transaction commits → WAL manager appends log record → fsync WAL segment file → ACK client → dirty page written to data file asynchronously (checkpoint process). On crash: open WAL, replay from last checkpoint LSN to end, applying redo records. Any uncommitted transaction at crash time: roll back using undo records.

#### Detailed Design
- **WAL record structure:** `(LSN, transaction_id, operation_type, table_id, page_id, offset, old_value, new_value, prev_lsn)`. `prev_lsn` chains all records for the same transaction (for undo on rollback).
- **Checkpointing:** periodically flush all dirty pages to disk and write a checkpoint record to the WAL. On recovery, only replay WAL from the last checkpoint — not from the beginning. Without checkpoints, WAL would need to be replayed from the beginning of time.
- **Group commit:** buffer WAL records from multiple concurrent transactions; flush all with a single fsync. Trades commit latency for throughput. Postgres uses this by default.
- **ARIES recovery algorithm:** (1) Analysis pass — scan WAL from last checkpoint to determine which transactions were active at crash time and which pages were dirty. (2) Redo pass — replay all log records from the earliest dirty page LSN to re-apply changes. (3) Undo pass — roll back all transactions that were in-flight at crash time using their undo records.

#### Failure Modes
- **fsync failure** — OS returns OK but data wasn't written (seen with some cloud EBS volumes). Results in silent data corruption on crash. Mitigate: use filesystems/storage that honour fsync; test with crash injection.
- **WAL too large for retention** — WAL accumulates because a replication slot or CDC consumer is behind. Mitigate: monitor slot lag; drop stale slots; set `max_wal_size`.
- **Long-running transactions** — a transaction open for hours holds back WAL recycling (undo records must be kept). Mitigate: transaction timeout policies; vacuum prevents table bloat from long-running transactions.
- **Checkpoint too infrequent** — recovery requires replaying many hours of WAL. Mitigate: tune checkpoint frequency; monitor `checkpoint_completion_target`.

#### Talking Points for the Interview
- Why WAL enables point-in-time recovery (PITR): given a base backup + WAL stream, you can replay to any LSN. This is how Postgres PITR and continuous archiving (pgBackRest, Barman) work.
- Undo vs. redo logs: redo logs record new values (used to replay committed changes after crash); undo logs record old values (used to roll back uncommitted transactions). WAL typically contains both (ARIES). Some engines use separate undo segments (InnoDB).
- Write amplification: each write is written twice — once to WAL, once to data page. Some engines (RocksDB's LSM tree) absorb multiple writes by buffering in a memtable and writing to disk in sorted runs (compaction). Trades random writes for sequential, reducing write amplification on the hot path.

### 9. Design a Batch Processing Pipeline (MapReduce / Spark)

#### Problem
You have petabytes of log data sitting in object storage (S3). Design a batch processing system that can run complex analytical queries over this data — aggregations, joins, filtering — reliably, at scale, and with the ability to reprocess historical data when logic changes.

#### Summary
**The picture in your head:** a cluster of worker nodes, each holding or able to read a slice of the input data. A job is split into tasks — each task processes its slice independently and produces intermediate output. A shuffle step redistributes data by key across workers. A reduce step aggregates all values for each key. The output is written back to object storage. If a task fails, the coordinator simply restarts it on another worker — the task is a pure function of its input slice, so re-running it is safe.

**Why batch processing is powerful:** (1) fault tolerance is cheap — failed tasks are re-run, not rolled back; (2) the computation moves to the data, not the data to the computation; (3) output is deterministic given the same input, so reprocessing is safe; (4) can process data at a rate that would overwhelm any real-time system.

**The shuffle is the bottleneck:** in a join or GROUP BY, all data for the same key must reach the same reducer. This requires shuffling data across the network. For a 1 TB dataset with 1000 reducers, the shuffle writes and reads up to 1 TB of data across the network. Optimise by pushing filters and projections before the shuffle (predicate pushdown, projection pushdown) and by using combiner steps to pre-aggregate at the map stage.

#### Clarifying Questions
- What is the data format? (Parquet, ORC, CSV, JSON)
- What types of operations are needed — aggregations, joins, complex transformations?
- How often do jobs run — daily, hourly, on-demand?
- What is the acceptable job completion time?
- Do you need incremental processing (only process new data since the last run) or full reprocessing?

#### Requirements
- **FR:** Process petabyte-scale data in object storage. Support SQL-style operations (GROUP BY, JOIN, filter). Re-runnable jobs produce the same output given the same input. Supports incremental (partition-based) processing.
- **NFR:** Daily job completes in <2 hours. Re-run of a failed job within 30 minutes. Cost-efficient — use spot/preemptible instances.

#### Scale Estimate
- 1 PB data, daily job. Split into 1 GB blocks → 1M tasks. With 1000 workers processing 1 task at a time at 100 MB/s each → 1M GB / (1000 × 100 MB/s) = 10,000s ≈ 2.8 hours. With 2000 workers: ~1.4 hours. Adjust worker count to hit the 2-hour SLA.

#### High-Level Design
Input data in S3 (Parquet, partitioned by date). Spark job submitted to cluster (EMR / Databricks / self-managed). Spark driver splits input into partitions, schedules tasks on executors. Executors process partitions in parallel, shuffle data by key, reduce. Output written to S3 (partitioned). Job metadata and lineage tracked in a data catalog (Glue, Hive Metastore).

#### Detailed Design
- **Partitioned input** — data in S3 is stored partitioned by `year/month/day`. Incremental jobs process only the new partition (e.g., `dt=2026-05-28`). Partition pruning eliminates reading irrelevant files.
- **Columnar format (Parquet/ORC)** — column pruning reads only the columns needed by the query; predicate pushdown filters rows at read time using min/max statistics per row group. 10× compression and read speed improvement over CSV for analytical queries.
- **Broadcast joins** — when joining a large table to a small lookup table (<200 MB), broadcast the small table to every executor. Eliminates the shuffle. Critical for dimension lookups.
- **Checkpointing long jobs** — for jobs taking >30 minutes, write intermediate results to S3 at stage boundaries. On failure, restart from the last checkpoint stage rather than from the beginning.
- **Spot/preemptible instances** — batch jobs are fault-tolerant (failed tasks are re-run). Use spot instances for 70–80% cost saving. Keep a small fleet of on-demand instances for the driver and critical tasks.

#### Failure Modes
- **Task failure** — Spark retries the task on another executor (default 4 retries). If a data block is corrupted in S3, the task will always fail. Mitigate: data validation / checksums at write time; dead letter partition for bad records.
- **Shuffle failure (OOM)** — the shuffle produces more data than executor memory can hold. Mitigate: increase executor memory, use disk-spill (always enabled in Spark), reduce shuffle partition count, use a combiner step.
- **Skewed keys** — a few keys have millions of rows; their tasks take 100× longer than others. Mitigate: salting (append random suffix to key, pre-aggregate, then merge); Adaptive Query Execution (AQE) in Spark 3+ auto-detects and splits skewed partitions.
- **Output overwrite on rerun** — rerunning a job with a bug writes bad data on top of good data. Mitigate: write to a staging path, validate output, then atomically swap with production path.

#### Talking Points for the Interview
- MapReduce vs. Spark: MapReduce spills every intermediate result to HDFS (disk); Spark keeps intermediate data in memory (with disk spill as fallback). Spark is 10–100× faster for iterative algorithms and multi-stage jobs.
- Lakehouse architecture (Delta Lake, Apache Iceberg): adds ACID transactions, schema evolution, and time travel on top of object storage + Parquet. Enables upserts/deletes (normally impossible in object storage) and safe concurrent batch + streaming writes.
- When to choose batch over streaming: batch wins when the question can tolerate daily/hourly answers, when correctness requires complete data (e.g., yesterday's total revenue), and when the computation is too complex for streaming operators. Stream for sub-minute latency; batch for everything else.

### 10. Design a Caching Layer for a High-Traffic Read System

#### Problem
A high-traffic API serving product catalogue reads is overwhelmed — the database can't keep up with read load. Design a caching layer that reduces database load by 90%, handles cache invalidation correctly, and degrades gracefully when the cache is unavailable.

#### Summary
**The picture in your head:** Redis sits in front of the database. The application checks Redis before hitting the DB. Cache hit → return immediately (sub-millisecond). Cache miss → fetch from DB, write to Redis with a TTL, return. The hard parts are: (1) cache invalidation — when data changes, the cached version must be expired or updated; (2) thundering herd — when a popular key expires, thousands of requests hit the DB simultaneously; (3) cache failure — when Redis is down, all traffic falls through to the DB and likely takes it down too.

**Cache invalidation strategies:** (1) TTL — set an expiry; stale data is served for up to TTL. Simple; eventual consistency. (2) Write-through — on write, update both DB and cache atomically. Strong consistency; write latency increases. (3) Write-behind — write to cache first; async flush to DB. Low write latency; risk of data loss on cache failure. (4) Cache-aside with explicit invalidation — on write, delete the cache key; next read will re-populate. Simple, correct, slightly higher miss rate after writes.

**Phil Karlton's Law:** "There are only two hard things in Computer Science: cache invalidation and naming things." Cache invalidation is legitimately hard in distributed systems. Get it wrong and you serve stale data indefinitely or corrupt data on write.

#### Clarifying Questions
- Read/write ratio? (Caching only pays off if reads >> writes)
- Can the application tolerate stale data? For how long?
- What is the data access pattern — hot keys (Zipf distribution), uniform, or time-based?
- What is the cache's memory budget? (Determines eviction policy importance)
- What happens when the cache is unavailable — must the system remain operational?

#### Requirements
- **FR:** Cache reads for product catalogue data. Cache miss falls through to DB. Cache is invalidated when a product is updated. TTL as a safety net.
- **NFR:** Cache hit rate ≥ 90%. Cache read p99 <1ms. System remains operational (degraded) if cache is unavailable. Cache memory budget: 64 GB per node.

#### Scale Estimate
- 100k reads/s. 90% cache hit rate → 10k reads/s to DB (down from 100k). DB can handle 10k reads/s. Cache working set: 1M products × 2 KB average → 2 GB — fits comfortably in 64 GB Redis node. Well within budget; a single Redis node suffices with a replica for HA.

#### High-Level Design
Application → Redis (read). Hit: return. Miss: read from Postgres → write to Redis with TTL → return. On product update: Postgres write + `DEL` cache key (cache-aside invalidation). Redis replica for read availability. Circuit breaker: if Redis latency > 50ms or errors > 5%, bypass cache and read from DB directly.

#### Detailed Design
- **Cache-aside (lazy loading)** — application manages the cache. Simple, tolerates cold starts naturally. Downside: first request after a miss or invalidation pays DB latency.
- **TTL** — every cache entry has a TTL (e.g., 5 minutes). Protects against stale data if explicit invalidation fails. Trade-off: stale data served for up to TTL after an update.
- **Thundering herd mitigation** — when a hot key expires, many concurrent requests all miss and hit the DB. Mitigations: (1) probabilistic early expiration — slightly before TTL, one request re-fetches; others still served from cache. (2) Mutex/lock on cache miss — first thread to miss acquires a lock, fetches, writes; others wait and get the populated result. (3) Background refresh — a job refreshes keys before they expire.
- **Eviction policy** — with a memory budget, Redis must evict when full. `allkeys-lru` (evict least-recently used across all keys) is the correct policy for a pure cache. `volatile-lru` only evicts keys with a TTL set (safer if some keys must never be evicted).
- **Cache stampede on deploy** — a fresh deploy with an empty cache sends all traffic to the DB. Mitigate: warm the cache before switching traffic (pre-warm from a snapshot), or use a gradual traffic shift.

#### Failure Modes
- **Redis crash** — all reads fall through to DB. 100k reads/s on a DB sized for 10k → DB overwhelmed. Mitigate: circuit breaker + rate limiter; Redis Sentinel / Cluster for HA; degrade gracefully (return stale data from local process cache if available).
- **Cache poisoning** — a bug writes incorrect data to the cache. Every request served the wrong value until TTL expires. Mitigate: explicit invalidation on write; short TTLs; ability to flush specific key patterns (`SCAN` + `DEL`).
- **Hot key** — one cache key receives disproportionate traffic (viral product). Single Redis node handling millions of ops/s on one key. Mitigate: local in-process cache for the hottest keys (reduces Redis load), read replicas + key sharding, write the key to multiple shards with a suffix and round-robin reads.
- **Stale reads after write** — invalidation failed (network error, application bug). Cache serves stale data past TTL. Mitigate: TTL as a backstop; idempotent invalidation retried asynchronously; monitoring for cache-DB consistency drift.

#### Talking Points for the Interview
- Redis vs. Memcached: Redis supports richer data structures (sorted sets, pub/sub, streams, Lua scripting), persistence, and replication. Memcached is simpler, multi-threaded, and uses memory more efficiently for pure key-value. For almost all modern use cases: Redis.
- Read-through vs. cache-aside: read-through — the cache itself fetches from the DB on a miss (requires cache to know how to read the DB). Cache-aside — the application manages the miss path. Cache-aside is more common because it's more flexible.
- Cache hierarchy: L1 = in-process heap (fastest, smallest, process-local), L2 = Redis (shared across instances, fast), L3 = DB read replica (slowest, always fresh). Design fallback through all three on degraded conditions.
- CDN as a cache: for static and semi-static content, a CDN (Cloudflare, Fastly) caches at the edge — geographically close to users. Cache-Control headers control TTL. Invalidation is via API (purge). For truly dynamic content, a CDN can still cache for 1–5 seconds to absorb burst.
