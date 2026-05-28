---
created-on: "[[Journal/2026/May/28-Wed]]"
ctime: 2026-05-28 09:00:00
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# Cassandra Interview Primer

Focused Q+A primer on Apache Cassandra — data modelling, the ring architecture, consistency tuning, compaction, and operational concerns. Aimed at backend and distributed systems interviews.

---

## Architecture and the Ring

### Summary

**What this topic covers**

Cassandra's distributed architecture: the peer-to-peer ring, consistent hashing, how data is partitioned and replicated across nodes, and why there is no single point of failure. This is the foundation everything else builds on.

**Mental model**

Imagine a clock face with your nodes sitting at positions around the dial. Every row of data hashes to a position on that dial. The node at (or just after) that position is responsible for it. To guard against node failure, the next N−1 nodes clockwise also hold copies. Every node is equal — there's no leader, no master. Any node can accept any request and act as a coordinator for that request, routing it to the correct replica nodes.

This is fundamentally different from Postgres replication (one leader) or Redis Cluster (leader per shard). Cassandra trades strong consistency for availability and partition tolerance — it sits firmly on the AP side of CAP unless you explicitly configure it otherwise.

**Key terms**

- **Ring** — the logical structure representing the hash token space (0 to 2^127). Nodes own token ranges around the ring.
- **Consistent hashing** — partition key is hashed to a token; the node owning that token range stores the data. Adding/removing nodes only redistributes a proportional slice of data.
- **Vnodes (virtual nodes)** — each physical node owns many small token ranges instead of one large range. Smooths data distribution and makes adding/removing nodes faster (many small migrations instead of one large one). Default: 256 vnodes per node.
- **Replication factor (RF)** — how many copies of each row exist across the cluster. RF=3 means 3 nodes hold each row.
- **Replication strategy** — `SimpleStrategy` (RF copies placed on the next RF nodes clockwise, ignoring rack/DC) for single-DC; `NetworkTopologyStrategy` (specify RF per datacenter, rack-aware placement) for production.
- **Coordinator node** — the node that receives a client request. It determines which replicas own the data, fans out the request, and waits for the required number of responses.
- **Gossip protocol** — peer-to-peer protocol where each node exchanges state with 3 random peers every second. All nodes learn about the cluster topology, node health, and schema changes through gossip.
- **Snitch** — tells Cassandra the network topology (rack, datacenter) of each node so `NetworkTopologyStrategy` can place replicas across failure domains.

**Why interviewers ask this**

The ring architecture explains almost every other Cassandra behaviour — consistency, availability, repair, and performance. If you don't have this mental model, you'll give surface-level answers. Interviewers use ring questions to calibrate depth.

**Common confusions**

- "Cassandra has a master node" — it doesn't. Fully peer-to-peer. Any node can coordinate any request. This is what makes it operationally resilient and linearly scalable.
- "Consistent hashing means even data distribution" — consistent hashing alone doesn't guarantee evenness if partition keys aren't uniformly distributed. Vnodes help by spreading each node's ownership across many token ranges.
- "Replication factor is the number of nodes" — RF is the number of *copies* of each row. A 10-node cluster with RF=3 stores each row on exactly 3 of the 10 nodes.
- "SimpleStrategy is fine for production" — only for single-datacenter deployments with no rack awareness. `NetworkTopologyStrategy` is required for multi-DC and recommended for any production cluster for operational flexibility.

**What follows from this topic**

The ring and replication directly determine the consistency model (how many replicas must respond), the repair process (how diverged replicas are reconciled), and the impact of node failures on availability.

### Q1. How does Cassandra distribute data across nodes?

Every row has a **partition key**. Cassandra hashes the partition key to a 64-bit token using Murmur3. The token determines which node(s) store the row: the node responsible for the token range containing that hash is the primary replica; the next RF−1 nodes clockwise hold additional copies.

With vnodes (default since Cassandra 1.2): each node owns 256 token ranges distributed around the ring. This means data is spread evenly and adding a node migrates ~1/N of data from each existing node in small chunks, rather than one large migration from one neighbour.

Result: a 10-node cluster with RF=3 stores each row on 3 nodes. Reads and writes can be served by any of those 3 replica nodes (or any node can coordinate by routing to them).

### Q2. What is the coordinator node and what does it do?

Any node can receive a client request — it becomes the **coordinator** for that request. The coordinator:

1. Hashes the partition key to find the replica nodes
2. Sends the request to all required replicas in parallel
3. Waits for the required number of ACKs based on the consistency level (e.g., QUORUM = majority of replicas)
4. Returns the result to the client

The coordinator doesn't need to own the data. It's just routing and aggregation. This means clients can connect to any node (often via a load balancer or round-robin) without knowing data placement. The driver typically knows the token map and routes directly to the replica node that owns the partition key (token-aware routing), skipping a network hop.

### Q3. What happens when a node goes down?

**For writes:** if the coordinator can still reach enough replicas to satisfy the consistency level, the write succeeds. For data destined for the downed node, Cassandra uses **hinted handoff** — the coordinator stores the write as a "hint" locally and delivers it to the downed node when it recovers (within a configurable window, default 3 hours).

**For reads:** if the coordinator can reach enough replicas for the consistency level, the read succeeds. The downed node's data is served by the other RF−1 replicas.

**For recovery:** when the node comes back online, it receives hinted handoff writes and then runs **repair** to catch up on any data it missed beyond the hint window. Without repair, a recovered node can serve stale data.

## Data Modelling

### Summary

**What this topic covers**

How to model data in Cassandra — the most important and most misunderstood aspect of using it correctly. Cassandra's data model is query-driven, not entity-driven. The schema is designed around the queries you need to run, not around normalisation principles.

**Mental model**

In Cassandra, the table is the query. You design a table to answer exactly one access pattern efficiently. If you have three different ways you need to access the same data, you create three tables — each denormalised for its query. This is the inverse of relational thinking. The partition key determines which node holds the data; the clustering columns determine the sort order on disk within a partition. A well-designed partition is a pre-sorted, pre-grouped result set ready to be read in one sequential disk operation.

**Key terms**

- **Partition key** — the first part of the primary key. Determines which node(s) store the row. All rows with the same partition key are stored together on the same node, sorted by clustering columns.
- **Clustering columns** — the remaining parts of the primary key after the partition key. Define the sort order of rows within a partition. Enable efficient range queries within a partition.
- **Primary key** — `(partition_key, clustering_col1, clustering_col2, ...)`. Uniquely identifies a row within a table.
- **Composite partition key** — `((col1, col2), clustering_col)` — the partition key is made of multiple columns. Used to distribute data more evenly or to group related data differently.
- **Wide row** — a partition containing many rows with the same partition key. Efficient for time-series data (partition = device_id, clustering = timestamp).
- **Denormalisation** — duplicating data across multiple tables to serve different query patterns. In Cassandra, this is not a smell — it's the design strategy.
- **Materialized view** — a Cassandra-maintained copy of a table with a different primary key. Automatically updated on writes. Operationally expensive; use sparingly.
- **Secondary index** — index on a non-primary-key column. Generally avoided in production — queries using secondary indexes fan out to all nodes. Use a separate denormalised table instead.

**Why interviewers ask this**

Data modelling is where Cassandra interviews live or die. Most candidates know "Cassandra is a wide-column store" but can't explain what a partition key does, why you'd use clustering columns, or why `SELECT * WHERE email = ?` on a table keyed by `user_id` is a full cluster scan. The model-a-time-series or model-a-user-messages question is almost guaranteed.

**Common confusions**

- "Design the schema first, then figure out queries" — the opposite of correct. In Cassandra, queries come first. The schema is derived from the queries.
- "Use a secondary index for flexible querying" — secondary indexes in Cassandra fan out reads to all nodes; they're O(N nodes) not O(log N). For any non-trivial query pattern, create a separate denormalised table.
- "One table per entity like in a relational DB" — one entity might need 3–5 Cassandra tables to support 3–5 different query patterns. Duplication is the cost; query performance is the benefit.
- "Partition key just needs to be unique" — the partition key determines both data placement (which node) and data grouping (what's stored together). A unique UUID per row is a valid partition key but produces a table you can only query by exact ID — no range queries, no grouping.

**What follows from this topic**

Data modelling decisions directly determine read/write performance, partition size limits, and whether certain operations are even possible. Tombstone accumulation, partition size limits, and compaction costs all flow from modelling choices.

### Q4. What is the difference between a partition key and a clustering column?

**Partition key** — determines which node(s) store the row (via token hashing). All rows with the same partition key are stored **on the same node**, sorted by clustering columns. Partition key enables: `WHERE partition_key = ?`.

**Clustering column** — defines the sort order of rows **within** a partition, stored on disk in sorted order. Enables efficient range queries within a partition: `WHERE partition_key = ? AND clustering_col >= ? AND clustering_col <= ?`.

Example — time-series sensor data:
```cql
CREATE TABLE sensor_readings (
    sensor_id   UUID,
    recorded_at TIMESTAMP,
    temperature DOUBLE,
    PRIMARY KEY (sensor_id, recorded_at)
) WITH CLUSTERING ORDER BY (recorded_at DESC);
```

`sensor_id` is the partition key — all readings for one sensor live on the same node. `recorded_at` is the clustering column — readings are sorted by time on disk. Query `WHERE sensor_id = ? AND recorded_at >= ?` is a single-partition range scan: one node, sequential disk read.

### Q5. How do you model a "get messages for a conversation" query in Cassandra?

The query: fetch the last 50 messages in a conversation, ordered by time descending.

```cql
CREATE TABLE messages_by_conversation (
    conversation_id UUID,
    sent_at         TIMESTAMP,
    message_id      UUID,
    sender_id       UUID,
    body            TEXT,
    PRIMARY KEY (conversation_id, sent_at, message_id)
) WITH CLUSTERING ORDER BY (sent_at DESC, message_id DESC);
```

- **Partition key** = `conversation_id` — all messages in one conversation are co-located on the same node.
- **Clustering columns** = `sent_at DESC, message_id DESC` — messages sorted newest-first on disk.
- Query: `SELECT * FROM messages_by_conversation WHERE conversation_id = ? LIMIT 50` — single partition, sequential read, no scatter-gather.

`message_id` is included in the clustering key to handle messages sent at the exact same millisecond (ensures row uniqueness).

### Q6. What is a wide partition and what are the limits?

A wide partition is a partition with many rows (same partition key). For time-series data this is natural — one sensor → millions of readings over time.

**Limits:**
- Cassandra has a soft limit of **~2 billion cells** per partition (a cell = one column value in one row).
- In practice, partitions over **100 MB** start causing operational problems: compaction takes longer, repair is slower, GC pressure increases, read latency rises.

**Managing wide partitions — time bucketing:**
```cql
PRIMARY KEY ((sensor_id, bucket), recorded_at)
```
Where `bucket = YEAR-MONTH` or `YEAR-WEEK`. Each partition covers one time bucket. Queries spanning buckets need multiple partition reads (handled in the application or with `IN` clause on partition key — use carefully).

Rule: aim for partitions of 10–100 MB maximum. Monitor with `nodetool tablestats` and Cassandra's partition size metrics.

## Consistency and the CAP Tradeoff

### Summary

**What this topic covers**

How to tune Cassandra's consistency model per operation, the relationship between consistency level and replication factor, and how to achieve strong consistency when you need it while keeping the default high availability.

**Mental model**

Every read and write has a **consistency level (CL)** that specifies how many replica nodes must respond before the coordinator considers the operation complete. The key formula: if `W + R > RF`, you're guaranteed that at least one node overlaps between the write quorum and the read quorum — so you always read data that includes the latest write. `QUORUM` on both reads and writes achieves this for any RF. `ALL` is strongest and least available. `ONE` is fastest and weakest.

Cassandra's default is eventual consistency (`ONE`) — high availability, low latency, but stale reads are possible. You opt into stronger consistency per operation.

**Key terms**

- **Consistency level (CL)** — number of replicas that must acknowledge a read/write. Specified per-request by the client.
- **ONE** — fastest; 1 replica must respond. Stale reads possible if replicas are out of sync.
- **QUORUM** — majority of replicas in the DC (floor(RF/2) + 1). Balances consistency and availability.
- **LOCAL_QUORUM** — quorum within the local DC only. Used in multi-DC to avoid cross-DC latency on every operation.
- **ALL** — every replica must respond. Strongest consistency, lowest availability (one replica down = operation fails).
- **ANY** — weakest write CL; even a hinted handoff counts. Guarantees the write is stored somewhere; no read guarantee.
- **Read repair** — when a read at QUORUM+ detects diverged replicas (different values for the same row), the coordinator sends a background write to bring lagging replicas up to date.
- **Last-write-wins (LWW)** — Cassandra's default conflict resolution. Every write is timestamped (client-side microseconds). On conflict, the highest timestamp wins. Clock skew can cause newer writes to be overwritten by older ones with higher clocks.

**Why interviewers ask this**

Consistency questions reveal whether you understand the CAP tradeoffs Cassandra forces on you. "Cassandra is eventually consistent" is a starting answer; knowing the formula `W + R > RF` for strong consistency, knowing `LOCAL_QUORUM` for multi-DC, and knowing the LWW clock skew problem — that's the senior answer.

**Common confusions**

- "Cassandra can't do strong consistency" — it can, with `CL=QUORUM` on both reads and writes (or `ALL`). It just doesn't do it by default.
- "QUORUM always means majority of all nodes" — `QUORUM` means majority of the replicas for that partition (floor(RF/2) + 1 out of RF), not all nodes. A 100-node cluster with RF=3 uses 2 replicas for QUORUM.
- "LWW is safe" — only if clocks are synchronised. Client-side timestamps mean the application controls the clock; a client with a fast clock can overwrite newer data. NTP sync is essential; some applications use server-side timestamps to mitigate this.
- "Read repair fixes everything immediately" — read repair is async by default. `read_repair_chance` (deprecated in Cassandra 4.0) controlled probabilistic repair. Use `nodetool repair` for reliable consistency.

**What follows from this topic**

Consistency levels connect directly to multi-DC deployments (`LOCAL_QUORUM` vs. `QUORUM`) and to the repair process (how you fix nodes that missed writes while down).

### Q7. How do you achieve strong consistency in Cassandra?

Use the formula: **W + R > RF**

For RF=3:
- Write at QUORUM (2 replicas), Read at QUORUM (2 replicas): 2 + 2 = 4 > 3 ✓ — strong consistency
- Write at ONE (1 replica), Read at ONE (1 replica): 1 + 1 = 2, not > 3 — eventual consistency
- Write at ALL (3), Read at ONE (1): 3 + 1 = 4 > 3 ✓ — strong, but write fails if any replica is down

`QUORUM/QUORUM` is the standard strong-consistency configuration: tolerates 1 node down (RF=3), reads always see the latest write.

For multi-DC, use `LOCAL_QUORUM/LOCAL_QUORUM` — quorum within each DC independently. Avoids cross-DC latency on every operation while maintaining per-DC strong consistency.

### Q8. What is last-write-wins and what problems does it cause?

Cassandra resolves write conflicts by timestamp: the write with the highest timestamp wins. On a read at QUORUM, if two replicas have different values for the same cell, the one with the higher `writetime` is returned.

**Problems:**

1. **Clock skew** — Cassandra uses client-side timestamps (microseconds since epoch). If two clients have different wall clocks, the one with the faster clock always wins, regardless of which write actually happened last. A client with a clock 1 second ahead can overwrite writes that happened up to 1 second later in real time.

2. **Blind overwrites** — there's no check-and-set by default. Two clients writing different values simultaneously both "succeed"; one silently overwrites the other.

3. **Deletions and tombstones** — a delete writes a **tombstone** (a marker with a timestamp). If a replica missed the delete and later gets a read repair, the tombstone must win over the old data — requires the tombstone's timestamp to be higher than the last write timestamp. Tombstones persist for `gc_grace_seconds` (default 10 days) to ensure all replicas receive them before they're purged.

**Mitigations:** use **lightweight transactions** (LWT — `INSERT IF NOT EXISTS`, `UPDATE IF condition`) for compare-and-set semantics. LWT uses Paxos internally — much slower (4 round trips) but provides linearisable consistency for that partition.

### Q9. What are lightweight transactions and when should you use them?

Lightweight transactions (LWT) provide compare-and-set (CAS) semantics using a per-partition Paxos protocol:

```cql
-- Create a user only if the username doesn't already exist
INSERT INTO users (username, email) VALUES ('alice', 'alice@example.com') IF NOT EXISTS;

-- Update only if the current value matches
UPDATE users SET email = 'new@example.com' WHERE username = 'alice' IF email = 'old@example.com';
```

The `IF` condition is checked and the write is applied atomically. Concurrent writers are serialised — only one succeeds.

**Cost:** LWT requires 4 network round trips (Paxos prepare → promise → propose → commit). At a typical DC RTT of 1ms, this is ~4ms per LWT vs. ~0.5ms for a normal write. Use LWT only when you genuinely need CAS semantics:
- Unique constraint enforcement (username uniqueness)
- Conditional updates that must not overwrite concurrent changes
- Idempotent operations where double-execution must be prevented

**Avoid LWT for:** high-throughput paths, time-series inserts, any operation where eventual consistency is acceptable.

## Storage Engine and Compaction

### Summary

**What this topic covers**

How Cassandra stores data on disk — the LSM tree (Log-Structured Merge tree), SSTables, memtables, and the compaction process that merges them. This underpins Cassandra's write performance characteristics and explains tombstone accumulation.

**Mental model**

Cassandra never overwrites data in place. Every write goes first to a commit log (for durability) and a memtable (in memory). When the memtable is full, it's flushed to an immutable SSTable on disk. Over time you accumulate many SSTables. Compaction merges SSTables together, discarding overwritten and deleted data, producing fewer, larger, sorted SSTables. This makes writes fast (sequential append) at the cost of periodic compaction I/O and the need to check multiple SSTables per read.

**Key terms**

- **Commit log** — append-only, per-node durability log. Every write is committed here first. Replayed on node restart to recover in-flight writes.
- **Memtable** — in-memory write buffer. Sorted by partition key + clustering columns. Flushed to SSTable when full or on a time threshold.
- **SSTable (Sorted String Table)** — immutable on-disk file containing sorted rows. Once written, never modified. Deleted or updated data is not removed from existing SSTables — it's written as new entries with higher timestamps or tombstones.
- **Tombstone** — a deletion marker written as a special SSTable entry. Suppresses older values on reads. Purged after `gc_grace_seconds` (default 10 days) by compaction, once all replicas are guaranteed to have received the tombstone.
- **Bloom filter** — per-SSTable probabilistic data structure. On a read, Cassandra checks the bloom filter before opening an SSTable. If the filter says the partition key is absent, the SSTable is skipped. Reduces unnecessary disk reads.
- **Compaction** — background process that merges multiple SSTables into one, discarding superseded versions and expired tombstones.
- **STCS (Size-Tiered Compaction Strategy)** — groups SSTables of similar size and merges them. Good for write-heavy workloads. Downside: temporarily needs 2× disk space during compaction.
- **LCS (Leveled Compaction Strategy)** — organises SSTables into levels of fixed size. Better read performance (fewer SSTables to check), more predictable space usage, but higher compaction I/O. Good for read-heavy workloads.
- **TWCS (Time-Window Compaction Strategy)** — groups SSTables by time window. Ideal for time-series data where old data is never updated — compaction only touches recent windows, old windows are frozen.

**Why interviewers ask this**

Compaction is where Cassandra's performance quirks live. Tombstone overload causing read timeouts, STCS causing disk space spikes, choosing the wrong compaction strategy for a workload — these are real production failure modes. Knowing them signals operational maturity.

**Common confusions**

- "Cassandra updates data in place" — it doesn't. Updates are new writes with a higher timestamp. The old value stays in an older SSTable until compaction.
- "Deletes are fast and immediate" — a delete writes a tombstone. The actual storage isn't reclaimed until compaction purges the tombstone after `gc_grace_seconds`. Heavy delete workloads accumulate tombstones and slow reads.
- "Compaction only happens when disk is full" — compaction runs continuously in the background based on SSTable count or size thresholds. It's not emergency cleanup; it's normal operation.
- "STCS is always the right choice" — STCS is the default and good for writes, but it degrades reads over time (many SSTables to check) and can spike disk usage during compaction. LCS or TWCS is often better for production.

**What follows from this topic**

Storage engine knowledge connects to: tombstone tuning (`gc_grace_seconds`, `tombstone_warn_threshold`), compaction strategy selection, disk capacity planning, and diagnosing slow read queries.

### Q10. Why does Cassandra have good write performance?

Three reasons:

1. **Sequential writes only** — every write appends to the commit log (sequential I/O, very fast) and updates the in-memory memtable. No random disk seeks on the write path.
2. **No read-before-write** — unlike a B-tree (which must read a page before updating it), Cassandra never reads existing data to perform a write. The new value is simply appended with a higher timestamp. LWT is the only exception.
3. **Batched flushes** — the memtable absorbs writes in memory and flushes to disk as a sorted batch (one sequential write per flush). This amortises the cost of many small writes into one large sequential I/O.

**Write path:** client write → coordinator → commit log append (fsync) + memtable update → ACK to client. SSTable flush and compaction happen asynchronously. Total write latency: ~0.5ms for a local write, ~1–2ms for QUORUM.

### Q11. What is a tombstone problem and how do you fix it?

When you delete data, Cassandra writes a tombstone. On reads, Cassandra must scan through tombstones to find live data. If a partition has accumulated many tombstones (e.g., a queue table where items are consumed, or time-series data where old rows are deleted), reads degrade dramatically.

**Symptoms:** `TombstoneOverwhelmingException` in logs, read timeouts on specific partitions, high GC pressure during reads.

**Fixes:**

1. **Use TTL instead of DELETE** — `INSERT ... USING TTL 86400` expires the row automatically. Cassandra writes an expiration marker instead of a tombstone on delete, which compaction handles more efficiently.
2. **Use TWCS for time-series** — Time-Window Compaction Strategy keeps data by time bucket. Old buckets are compacted and tombstones purged without touching recent data.
3. **Tune `gc_grace_seconds`** — the time tombstones are retained before being purged. Default 10 days. Can be reduced if repair runs frequently, but must be longer than your longest repair interval — a tombstone purged before all replicas receive it causes "zombie" data resurrection.
4. **Avoid delete-heavy table designs** — redesign the data model to use TTL-based expiry or append-only patterns.
5. **Increase `tombstone_warn_threshold` / `tombstone_failure_threshold`** — only as a temporary measure while fixing the root cause.

### Q12. Which compaction strategy should you use and when?

| Strategy | Best for | Avoid when |
|---|---|---|
| **STCS** | Write-heavy, infrequent reads | Read-heavy (too many SSTables per read); large datasets (2× disk spike) |
| **LCS** | Read-heavy, mixed read/write | Extremely write-heavy (high compaction I/O overhead) |
| **TWCS** | Time-series / append-only by time | Data is frequently updated or deleted outside the current time window |

**Decision tree:**
- Time-series (inserts only, rarely updated, no cross-time deletes)? → **TWCS**
- Read-heavy, SLA on read latency? → **LCS**
- Write-heavy, reads are secondary? → **STCS**
- Default for new tables with unknown workload? → **STCS**, then migrate to LCS or TWCS once the access pattern is clear.

## Operations and Production Concerns

### Summary

**What this topic covers**

Running Cassandra in production: repair, anti-entropy, capacity planning, multi-DC deployments, and the operational failure modes that catch teams off guard.

**Mental model**

Cassandra is eventually consistent by design — replicas can diverge. Repair is the mechanism that reconciles diverged replicas. Without regular repair, a node that was down and missed writes will serve stale data forever after it comes back (hints only cover the hint window). Think of repair as Cassandra's version of database VACUUM — it must run regularly or data integrity degrades silently.

**Key terms**

- **Repair** — `nodetool repair` — compares data across replicas using Merkle trees and synchronises any diverged rows. The primary mechanism for maintaining consistency.
- **Anti-entropy repair** — full repair that compares the entire dataset. Expensive. Should run on every node at least once per `gc_grace_seconds` period.
- **Incremental repair** — marks SSTables as repaired once they've participated in a repair. Subsequent repairs only touch unrepaired SSTables. Reduces repair time and I/O.
- **`nodetool`** — the primary CLI for Cassandra operations: `status`, `repair`, `flush`, `compact`, `decommission`, `removenode`, `tablestats`, `tpstats`.
- **Bootstrap** — the process of a new node joining the cluster: it streams data from existing nodes for its assigned token ranges.
- **Decommission** — graceful removal of a node: it streams its data to other nodes before leaving the ring.
- **JVM heap / GC** — Cassandra runs on the JVM. GC pauses cause latency spikes. The row cache and key cache live in the JVM heap; the page cache (OS-level) caches SSTable data off-heap. CMS GC is deprecated; G1GC or ZGC (Cassandra 4+) is standard.
- **Read repair chance** — historically a background probabilistic read repair on every read. Deprecated in Cassandra 4.0 in favour of explicit repair.

**Why interviewers ask this**

Anyone who's operated Cassandra knows that neglecting repair is the most common way to introduce data inconsistency. Knowing when and why to run repair, and knowing that you must run it within `gc_grace_seconds`, is the difference between knowing Cassandra theoretically and knowing it operationally.

**Common confusions**

- "Repair is optional if I use QUORUM" — QUORUM ensures reads see the latest write, but it doesn't fix replicas that diverged from earlier missed writes. Repair is how you fix those diverged replicas.
- "I can reduce `gc_grace_seconds` to 0 to reclaim disk faster" — if a node is ever down for any period, tombstones purged before that node comes back will cause deleted data to re-appear on that node (zombie resurrection). Never set `gc_grace_seconds` lower than your longest expected node outage + repair interval.
- "Adding a node doubles my cluster's capacity immediately" — bootstrapping a new node streams data from existing nodes, consuming bandwidth and CPU on those nodes. Plan node additions during low-traffic periods, and add one node at a time.
- "Cassandra handles schema changes automatically across nodes" — DDL (ALTER TABLE, etc.) is propagated via gossip but must be run on one node and allowed to propagate. Schema disagreements between nodes cause errors. In Cassandra 4+, the distributed schema agreement mechanism is more robust.

**What follows from this topic**

Operational topics connect to: monitoring (what to alert on), capacity planning (disk, CPU, network), multi-region deployments, and disaster recovery.

### Q13. What is repair and why must it run regularly?

Cassandra replicas can diverge when a node is down and misses writes beyond the hint window, or when hinted handoff fails. Repair reconciles diverged replicas:

1. Each node builds a Merkle tree of its data for a token range.
2. Trees are compared across replicas — differing subtrees identify diverged partitions.
3. Missing or stale rows are streamed from the replica with the most recent data.

**Why regularly:** tombstones are only safe to purge after `gc_grace_seconds` (default 10 days) — by which time all replicas must have received the tombstone. If a replica was down when the delete happened and repair hasn't run since, the tombstone might be purged on healthy nodes while the downed replica still has the live data. When that replica comes back, the data "resurrects." Running repair within `gc_grace_seconds` prevents this.

**Tooling:** `nodetool repair -pr` (primary range only — avoids repairing the same data N times across N replicas). In production, use Reaper (open source) or ScyllaDB's repair service for automated, incremental repair scheduling.

### Q14. How do you scale a Cassandra cluster?

**Scale up (add nodes):**
1. Prepare the new node with the same Cassandra config (cluster name, seed nodes, DC/rack assignment).
2. Start the node — it contacts seed nodes, joins the ring, and begins bootstrapping (streaming its token ranges from existing nodes).
3. Once bootstrap completes, the node is live and serving traffic.
4. Run `nodetool cleanup` on the nodes that gave up token ranges — removes data no longer owned by those nodes.

**Key considerations:**
- Add one node at a time to avoid overwhelming the cluster with streaming traffic.
- With vnodes, the new node automatically takes ~1/N of token ranges from each existing node — no manual token calculation needed.
- For a capacity increase, add nodes to match the desired RF (e.g., go from 3 nodes to 6 with RF=3 — each new node becomes a replica for some partitions).

**Scale down (remove nodes):**
- `nodetool decommission` — node streams its data to remaining nodes, then leaves the ring gracefully.
- Never kill a node without decommissioning — use `nodetool removenode` only for dead nodes that can't be decommissioned.

### Q15. How does multi-DC Cassandra work and what is LOCAL_QUORUM?

In a multi-DC deployment, each datacenter has its own set of replica nodes. `NetworkTopologyStrategy` specifies the RF per DC:

```cql
CREATE KEYSPACE my_app WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,
    'dc2': 3
};
```

Each DC has RF=3 replicas. Writes go to 3 nodes in DC1 and 3 nodes in DC2 — 6 total replicas across DCs.

**`LOCAL_QUORUM`** — quorum is satisfied within the local DC only. A write at `LOCAL_QUORUM` waits for 2 of 3 replicas in the local DC to ACK — it doesn't wait for the remote DC. The remote DC receives the write asynchronously.

Benefits:
- Write latency is local DC RTT only (~1ms), not cross-DC (~60–100ms)
- Read latency is local DC RTT only
- Tolerate entire DC failure — the other DC continues operating independently

Tradeoff: reads in DC2 may temporarily see stale data if DC1 writes haven't replicated yet. Use `LOCAL_QUORUM` on both reads and writes for per-DC strong consistency with cross-DC eventual consistency.

**`QUORUM` in multi-DC:** quorum across all DCs. Ensures cross-DC strong consistency but pays cross-DC latency on every operation. Rarely used — `LOCAL_QUORUM` is the standard multi-DC choice.
