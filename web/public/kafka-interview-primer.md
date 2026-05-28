# Kafka Interview Primer

Comprehensive Q+A primer covering senior-level Kafka interviews. Covers distributed messaging fundamentals through production operations. Each answer is interview-shaped: 2–6 sentences, real config knobs, real failure modes.

---

## Core Concepts

### Summary

**What this topic covers**

The foundational data model and actors in Kafka: brokers, topics, partitions, offsets, producers, consumers, and consumer groups. This is the vocabulary every Kafka question is built on. Get fuzzy here and every follow-up question about replication, compaction, or stream processing becomes harder to reason about. The core insight is that Kafka is a **distributed, partitioned, replicated commit log** — not a queue, not a database, but a log you can replay.

**Mental model**

Think of a Kafka cluster as a set of **brokers** (JVM processes) each holding a subset of **partitions**. A **topic** is a logical name; partitions are the actual unit of storage and parallelism. Each partition is an ordered, immutable sequence of **records** — append-only. Each record has an **offset**, a monotonically increasing integer that is the record's permanent address within its partition. Producers write to the tail of a partition. Consumers read from any offset, tracking their own position independently. A **consumer group** is a logical subscriber: Kafka assigns each partition to exactly one consumer in the group at a time, giving you parallelism without duplicate processing. Across different consumer groups, every group gets its own independent read cursor — the same messages are re-read from scratch by each group. This is the fundamental difference from traditional queues: the broker doesn't track what's been consumed and delete it; *consumers* track their own offset, and the broker retains data by time or size policy.

**Key terms**

- **Broker** — a single Kafka server process. Stores partitions, handles producer/consumer connections. A cluster is typically 3–9+ brokers.
- **Topic** — a named, logical category for a stream of records. Backed by one or more partitions.
- **Partition** — the unit of parallelism and ordering in Kafka. A totally ordered, append-only log on disk. Ordering is guaranteed only within a partition.
- **Offset** — a 64-bit integer, the permanent sequence number of a record within its partition. Never reused (except with log compaction tombstones).
- **Producer** — a client that appends records to a topic. Determines partition assignment (round-robin, key-hash, custom partitioner).
- **Consumer** — a client that reads records from one or more partitions, tracking its own committed offset.
- **Consumer group** — a named set of consumers sharing partition assignments. Kafka ensures each partition is owned by exactly one consumer in the group at any time.
- **Leader replica** — the partition replica that handles all reads and writes. Each partition has exactly one leader at a time.
- **Follower replica** — a passive replica that replicates from the leader. Eligible to become leader on failover.
- **Controller** — one broker per cluster that manages partition leader elections and cluster metadata. In KRaft mode, replaced by a Raft-based metadata quorum.
- **Record** — key + value + timestamp + headers. Key and value are byte arrays; Kafka is schema-agnostic at the broker layer.
- **KRaft** — KIP-500 replacement for ZooKeeper. Brokers elect a controller via Raft consensus; removes the ZK dependency entirely (GA in Kafka 3.3+).

**Why interviewers ask this**

Every deeper Kafka question bottoms out here. Partition count decisions, rebalancing behaviour, offset commit strategies, exactly-once semantics — none of it makes sense without internalising that a partition is the unit of ordering, parallelism, and fault isolation simultaneously. Interviewers also probe whether candidates know the difference between Kafka and a traditional broker/queue: no deletion-on-consume, consumer-managed offsets, independent consumer groups. Getting this distinction clean is a signal of real production experience vs. tutorial knowledge.

**Common confusions**

- "Kafka guarantees ordering across a topic" — no. Ordering is per-partition only. If you need total order across a topic, you need a single partition, which caps your throughput.
- "Consumer groups consume different records" — consumer groups are independent cursors. Every group reads the full topic from its own committed offset. A single record is read by *every* group that subscribes.
- "Offset is a message ID" — offset is a position within a partition. The same offset in different partitions refers to completely unrelated records.
- "The broker deletes messages once consumed" — Kafka retains data by retention policy (`retention.ms`, `retention.bytes`), not by consumer acknowledgement. A record is deleted when it ages out or the log is full, not when a consumer commits its offset.
- "Increasing partition count is free" — adding partitions to an existing topic doesn't repartition existing data; key-based ordering invariants break for existing keys that change their partition mapping.

**What follows from this topic**

Storage & Retention (how logs are structured and cleaned), Producers (exactly how writes land), Consumers & Consumer Groups (the rebalancing machinery), Replication & Durability (what followers do and why ISR matters), and ultimately Performance & Tuning (partition count as the primary throughput lever).

### Q1. What is a Kafka partition and why does it matter?

A partition is a totally ordered, append-only log stored on a single broker (the leader). It is the unit of parallelism — more partitions means more consumers in a group can work in parallel. It is also the unit of ordering — if you need two records to be processed in sequence, they must go to the same partition (typically via the same key). Partition count is one of the most consequential design decisions in a Kafka deployment: too few caps throughput, too many increases metadata overhead and rebalance time.

### Q2. How do consumer groups achieve parallel consumption without duplicate processing?

Kafka assigns each partition to exactly one consumer within a group. This means two consumers in the same group never read the same record at the same time — the partition is the mutual exclusion boundary. You can scale consumption up to the number of partitions; adding more consumers than partitions leaves the extras idle. Across groups, all groups read all records independently.

### Q3. What is the role of an offset and who manages it?

An offset is the record's immutable position within its partition. Consumers own their offsets — they commit them to the `__consumer_offsets` internal topic (or historically ZooKeeper). The broker doesn't care whether a consumer has processed a record; it retains it until retention policy triggers. This design makes it trivially cheap to replay: reset your committed offset to the start and re-read everything.

### Q4. What changed when Kafka moved from ZooKeeper to KRaft?

In the ZK era, a separate ZooKeeper ensemble stored cluster metadata (partition assignments, controller election). KRaft (KIP-500, GA Kafka 3.3) folds this into a Raft-based metadata log stored on the brokers themselves. Benefits: faster startup, fewer components to operate, better metadata scalability, and elimination of the ZK dependency. In KRaft mode a subset of brokers (or dedicated controller nodes) form the Raft quorum; the elected active controller handles all metadata changes.

### Q5. Why does Kafka guarantee ordering only within a partition, not across partitions?

Records are written to and read from a single partition's log sequentially. Across partitions, there is no synchronisation — different partitions live on different brokers and are written and consumed independently. If you write record A to partition 0 and record B to partition 1, a consumer reading both partitions has no guarantee about which it will see first. The solution when global ordering matters is a single-partition topic, accepting the throughput cap, or using a key that keeps causally related records in the same partition.

---

## Storage & Retention

### Summary

**What this topic covers**

How Kafka physically stores records on disk, how it manages log growth, and the two retention strategies (time/size-based deletion vs. log compaction). This topic also covers tiered storage, a newer addition that decouples compute from storage.

**Mental model**

Each partition is a directory on the broker filesystem. Inside are **log segments** — pairs of a `.log` file (raw records) and an `.index` file (sparse offset-to-byte-position index for seeks). Kafka writes only to the **active segment** (the tail); old segments are read-only. Segment rolling is triggered by `log.segment.bytes` (default 1 GB) or `log.roll.ms`. The **log cleaner** runs in the background and applies one of two policies. **Delete** policy: segments older than `retention.ms` (default 7 days) or beyond `retention.bytes` are deleted wholesale. **Compact** policy: for each key, keep only the most recent value (tombstone = null value, signals eventual deletion). Compacted topics are used for changelogs and materialised views where only the latest state per key matters. The `.index` and `.timeindex` files are memory-mapped by the broker — this is why Kafka prefers dedicated hosts with large page caches.

**Key terms**

- **Log segment** — a fixed-size or time-bounded chunk of a partition's log. A `.log` file plus its `.index` and `.timeindex` companions.
- **Active segment** — the segment currently being written to. Only one per partition.
- **log.segment.bytes** — max size before a new segment is rolled (default 1 GB).
- **retention.ms** — records older than this are eligible for deletion (default 7 days = 604800000 ms).
- **retention.bytes** — per-partition max size; segments are deleted oldest-first when exceeded.
- **Log compaction** — background process that removes superseded records for a key, keeping the latest value. Enables unbounded retention of the "current state" of a keyed dataset.
- **Tombstone** — a record with a non-null key and a null value. Signals the key should be deleted; the tombstone itself is retained briefly then cleaned.
- **Cleaner thread** — background thread pool (`log.cleaner.threads`) running compaction or deletion. Monitors `min.cleanable.dirty.ratio`.
- **Tiered storage** — KIP-405 feature offloading older log segments to object storage (S3, GCS, Azure Blob). Brokers retain only a hot local tier; older data fetched from remote on demand.
- **__consumer_offsets** — internal compacted topic storing consumer group committed offsets.
- **Log index** — sparse offset→file-position index enabling O(log n) seeks; fully rebuilt from the log on unclean shutdown.

**Why interviewers ask this**

Log compaction trips up most candidates. Interviewers use it to probe whether you understand Kafka as a storage system, not just a transport. Compaction questions often come paired with Kafka Streams state stores (which use compacted changelogs) or event sourcing patterns. Retention misconfiguration is also a common production failure mode — setting `retention.bytes` without accounting for replication factor, or confusing topic-level overrides with broker defaults.

**Common confusions**

- "Log compaction keeps exactly one record per topic" — it keeps one per **key** per **partition**. Different partitions run compaction independently.
- "Compaction runs in real-time" — compaction is async and best-effort. During a compaction window, duplicates for a key may exist in the log. Consumers should be idempotent.
- "Setting `retention.ms=-1` disables deletion" — correct for delete-policy topics, but only meaningful if compaction is also set. A compacted topic without delete policy retains data indefinitely (subject to tombstone cleanup).
- "Tiered storage replaces replication" — tiered storage is about offloading cold segments, not replacing ISR-based fault tolerance. The local replicas are still used for durability of hot data.
- "You can shrink partition count" — Kafka does not support reducing partition count on a topic without deleting and recreating it.

**What follows from this topic**

Replication & Durability (segment files are what followers replicate), Kafka Streams & Connect (state stores are compacted topics under the hood), and Operations (monitoring disk usage, cleaner lag, and segment counts is operational table stakes).

### Q1. What is a log segment and when does Kafka roll a new one?

A log segment is a chunk of a partition's log stored as a `.log` file with an offset index and time index alongside it. Kafka writes only to the active (tail) segment. A new segment is rolled when the active segment exceeds `log.segment.bytes` (default 1 GB), when `log.roll.ms` elapses since the segment was created, or when the index fills (`log.index.size.max.bytes`). Rolling segments is what makes bulk deletion efficient — Kafka deletes entire cold segments rather than scanning individual records.

### Q2. Explain the difference between delete and compact retention policies.

**Delete** is time or size-based: entire segments older than `retention.ms` or beyond `retention.bytes` are removed. Data is gone. **Compact** is key-based: the log cleaner keeps the most recent record per key and removes older duplicates. Compacted topics grow without bound in the number of unique keys but never accumulate stale versions of a key — useful for materialised state (e.g., the latest account balance per account ID). You can combine both with `cleanup.policy=compact,delete`, which compacts *and* then deletes segments older than retention.

### Q3. What is a tombstone record in a compacted topic?

A tombstone is a record with a non-null key and a null value. It signals that the key should be considered deleted. The log cleaner retains tombstones for at least `delete.retention.ms` (default 24 hours) so downstream consumers (especially Kafka Streams state stores) can observe the deletion. After that grace period, tombstones are eligible for removal in the next compaction pass.

### Q4. How does tiered storage change the operational model?

Tiered storage (KIP-405) allows Kafka to offload closed log segments to object storage (S3, GCS) while keeping only a small local hot tier. This decouples retention (cheap object storage, potentially months) from broker disk sizing (only the recent hot window). Consumers reading old data fetch segments from the remote tier transparently. The tradeoff is added latency for remote reads and operational complexity (IAM, object store costs, eventual consistency of the remote tier on segment upload).

---

## Producers

### Summary

**What this topic covers**

Everything on the write path: how producers batch records, the acks contract, idempotent producers, transactions, compression, and partitioning. The producer is where durability guarantees are configured, and where the throughput vs. latency tradeoff is most directly controlled.

**Mental model**

The producer client maintains an in-memory **record accumulator** — a per-partition queue of **batches**. A batch is sent when it hits `batch.size` bytes or when `linger.ms` elapses since the first record was added, whichever comes first. `linger.ms=0` (default) means send immediately on the next I/O loop iteration — low latency, small batches. `linger.ms=5` means wait up to 5 ms to fill a larger batch — higher throughput. Compression (`compression.type`: snappy, lz4, zstd, gzip) is applied per batch; the broker decompresses only if it needs to re-compress for inter-broker replication (usually it doesn't, since `compression.type=producer` passes the batch through). The `acks` setting controls how many replicas must acknowledge before the producer considers the write committed: `acks=0` (fire-and-forget), `acks=1` (leader only — common, but can lose data if leader fails before followers replicate), `acks=all` / `acks=-1` (all ISR members must acknowledge — required for durability). With `acks=all` + `min.insync.replicas=2`, you get strong durability guarantees. **Idempotent producer** (`enable.idempotence=true`) adds a producer ID and per-partition sequence number to each batch; the broker deduplicates retries. **Transactions** extend idempotence across partitions and across producer sessions — atomic multi-partition writes, used for exactly-once stream processing.

**Key terms**

- **acks** — durability contract: `0` (none), `1` (leader), `all`/`-1` (all ISR).
- **batch.size** — max bytes per batch before it's sent (default 16384 bytes). Increase for throughput.
- **linger.ms** — max ms to wait before sending an incomplete batch (default 0). Increase for throughput.
- **compression.type** — per-batch compression. `zstd` gives best ratio, `lz4`/`snappy` best CPU tradeoff.
- **max.in.flight.requests.per.connection** — max concurrent unacknowledged batches to a broker. >1 with retries can cause reordering unless idempotence is enabled.
- **enable.idempotence** — producer assigns a PID + sequence; broker deduplicates retried batches. Implies `acks=all`, `retries=MAX_INT`, `max.in.flight=5`.
- **Transactional producer** — sets `transactional.id`; supports atomic writes across multiple partitions and topics. Requires transactional API (`beginTransaction`, `commitTransaction`, `abortTransaction`).
- **Partitioner** — determines which partition a record goes to. Default: round-robin for null keys, murmur2 hash of key otherwise. Kafka 2.4+ changed default to sticky partitioner (batch to one partition until batch is full).
- **ProducerRecord** — the unit the application sends: topic, optional partition, optional key, value, optional headers, optional timestamp.
- **RecordMetadata** — returned on successful send: topic, partition, offset, timestamp.

**Why interviewers ask this**

`acks` and `min.insync.replicas` are a classic pair question. The common trap is thinking `acks=all` alone guarantees durability when ISR has shrunk to 1. Idempotent vs. transactional is another common probe: idempotence is per-producer per-partition, transactions are cross-partition atomic. Interviewers at stream-processing shops also probe `max.in.flight` + retries ordering gotcha.

**Common confusions**

- "`acks=all` means all replicas" — `acks=all` means all **ISR** replicas, not all replicas. If ISR shrinks to 1 and `min.insync.replicas=1`, `acks=all` commits with just the leader.
- "Idempotence means exactly-once end-to-end" — idempotent producer prevents duplicate records from retried produce requests. It doesn't help if your application logic publishes the same record twice intentionally, and it doesn't span consumer processing. That requires transactions + consumer idempotency.
- "`linger.ms` improves latency" — it trades latency for throughput. Higher `linger.ms` = larger batches = better throughput, but p99 latency increases.
- "Increasing `batch.size` always helps" — only if you're actually filling batches. On low-volume topics it just wastes memory.
- "Compression happens at the broker" — compression is done by the producer, stored compressed at the broker, and decompressed by the consumer. The broker stores and replicates compressed batches as-is (unless broker-side compression is configured differently).

**What follows from this topic**

Replication & Durability (ISR, `min.insync.replicas`), Consumers (offset commit and exactly-once), Performance & Tuning (batching knobs), and Kafka Streams (transactions used internally for EOS processing).

### Q1. What is the difference between `acks=1` and `acks=all`?

`acks=1` means the leader writes the record to its local log and acknowledges immediately, without waiting for followers. If the leader crashes before a follower replicates, the record is lost. `acks=all` (or `-1`) means the leader waits until all in-sync replicas (ISR) have written the record before acknowledging. Combined with `min.insync.replicas=2`, this guarantees the record is on at least 2 replicas before the producer sees success — durable against single-broker failure.

### Q2. How does the idempotent producer work and what does it guarantee?

When `enable.idempotence=true`, the producer is assigned a **Producer ID (PID)** by the broker and attaches a monotonically increasing **sequence number** to each batch per partition. On a retry, the broker checks the sequence: if it's a duplicate (sequence already seen), it silently deduplicates. This prevents duplicate records from network-level retries. It does *not* prevent application-level double-sends and does not span multiple partitions transactionally.

### Q3. What is a Kafka transaction and when do you need one?

A Kafka transaction provides atomic writes across multiple partitions and topics: either all writes commit or all abort, even across producer crashes. You need transactions when implementing exactly-once stream processing — e.g., reading from topic A, processing, and writing to topic B while committing offsets atomically. Configure `transactional.id` (stable across restarts), call `initTransactions()`, then wrap writes in `beginTransaction` / `commitTransaction`. Consumers must set `isolation.level=read_committed` to skip records from aborted transactions.

### Q4. Why can `max.in.flight.requests.per.connection > 1` cause record reordering?

If batch 1 fails and batch 2 succeeds before batch 1 is retried, batch 2's records land at a lower offset than their send order implies. With `enable.idempotence=true`, Kafka enforces per-partition sequence ordering at the broker (up to `max.in.flight=5`), eliminating this reordering. Without idempotence, you must set `max.in.flight=1` to guarantee order under retries, at the cost of throughput.

### Q5. How does compression work in Kafka and which codec should you choose?

The producer compresses a batch before sending; the broker stores and replicates the compressed batch. The consumer decompresses. `lz4` and `snappy` are fast with modest compression ratio — good for high-throughput, CPU-sensitive pipelines. `zstd` (Kafka 2.1+) gives the best compression ratio at reasonable CPU cost and is the modern default choice for storage-sensitive deployments. `gzip` is slower and generally outclassed by zstd. Set `compression.type=producer` on the broker to pass producer-compressed batches through without re-compression.

---

## Consumers & Consumer Groups

### Summary

**What this topic covers**

How consumers read from Kafka, how consumer groups coordinate partition assignment, how rebalances work, offset commit strategies, and how to diagnose and reduce consumer lag. This is the most operationally fraught area of Kafka — rebalance storms and lag spikes are the most common production incidents.

**Mental model**

A consumer in a group sends a **JoinGroup** request to the **group coordinator** broker (the leader of the `__consumer_offsets` partition for that group). The group coordinator elects one consumer as the **group leader** — it receives the full member list and runs the **partition assignment strategy** (RangeAssignor, RoundRobinAssignor, StickyAssignor, CooperativeStickyAssignor). The group leader sends assignments back via SyncGroup. All members then begin polling their assigned partitions. Any change — member joins, leaves, or crashes; topic partition count changes; subscription changes — triggers a **rebalance**. In **eager rebalancing** (classic), all consumers stop consuming, revoke all partitions, and reassign from scratch — causes a pause proportional to group size and assignment complexity. **Cooperative rebalancing** (Kafka 2.4+, `CooperativeStickyAssignor`) is incremental: only the partitions that need to move are revoked, the rest continue. Offset commits go to `__consumer_offsets` either automatically (`enable.auto.commit=true`, every `auto.commit.interval.ms`) or manually via `commitSync()` / `commitAsync()`. Manual commit gives you control over the at-least-once / exactly-once boundary. **Consumer lag** is the number of records behind the end of the partition log; it's the primary health signal for consumer groups.

**Key terms**

- **Group coordinator** — the broker hosting the `__consumer_offsets` partition for a group. Manages join/sync/heartbeat/leave protocol.
- **Group leader** — the first consumer to join a generation. Runs partition assignment and sends the result to the coordinator.
- **Rebalance** — reassignment of partitions among the current group members. Triggered by membership changes or subscription changes.
- **Eager rebalancing** — all partitions revoked from all consumers before reassignment. Stop-the-world within the consumer group.
- **Cooperative (incremental) rebalancing** — only partitions that must move are revoked. Requires `CooperativeStickyAssignor` (or `cooperative-sticky` in librdkafka).
- **session.timeout.ms** — max time the coordinator waits for a heartbeat before declaring a consumer dead (default 45 s). Triggers rebalance on expiry.
- **max.poll.interval.ms** — max time between `poll()` calls before the consumer is removed from the group (default 5 min). Important for slow processors — increase or move heavy work off the poll thread.
- **enable.auto.commit** — if true, offsets are committed in the background periodically. Easy but risks re-processing on restart if the consumer crashes mid-batch.
- **commitSync / commitAsync** — manual offset commit after processing. `commitSync` retries until success; `commitAsync` is non-blocking but can silently fail (handle the callback).
- **Consumer lag** — `log-end-offset - committed-offset` per partition. Measured by `kafka-consumer-groups.sh --describe` or JMX metric `records-lag-max`.
- **Partition assignor** — strategy for mapping partitions to consumers. `StickyAssignor` minimises partition movement on rebalance; `CooperativeStickyAssignor` adds incremental rebalance support.

**Why interviewers ask this**

Rebalances are the #1 source of production Kafka pain. Interviewers probe whether you know the difference between session timeout and poll interval, how eager vs cooperative rebalancing affects pause duration, and why slow consumers (long processing time per record) cause rebalance loops. Offset commit strategy is also heavily probed — the difference between at-most-once, at-least-once, and exactly-once consumer semantics.

**Common confusions**

- "Increasing `session.timeout.ms` prevents rebalances" — it only prevents rebalances due to missed heartbeats. Rebalances from `max.poll.interval.ms` violations (slow processing) require increasing that setting, or reducing batch size.
- "Auto-commit is safe" — auto-commit commits on a timer, so if a consumer crashes between a commit tick and finishing processing, records are re-processed. At-least-once is fine if your consumer is idempotent; if it's not, you need manual commit after processing.
- "Committing after every record maximises safety" — it maximises overhead. Commit at the end of a batch of records after processing; the reprocessing window on failure is bounded to that batch.
- "Consumer lag means slow consumers" — lag can spike from slow consumers or from a sudden burst of producer throughput. Distinguish: is the consumer's throughput (records/sec) steady but the producer outpacing it, or has consumer throughput dropped?

**What follows from this topic**

Replication & Durability (how offsets in `__consumer_offsets` are replicated), Performance & Tuning (`fetch.min.bytes`, `fetch.max.wait.ms` on the consumer side), Kafka Streams (which manages consumer groups internally).

### Q1. What triggers a consumer group rebalance?

A rebalance is triggered when the group membership changes: a consumer joins (startup), leaves (graceful shutdown with `leaveGroup`), or is presumed dead (session timeout due to missed heartbeats, or `max.poll.interval.ms` exceeded). It also triggers when the subscribed topic's partition count changes. In eager mode this halts all consumption during reassignment; cooperative mode only interrupts the partitions being moved.

### Q2. What is the difference between `session.timeout.ms` and `max.poll.interval.ms`?

`session.timeout.ms` governs heartbeats — if the coordinator hasn't heard a heartbeat within this window, the consumer is declared dead and a rebalance starts. Heartbeats are sent on a background thread, so this fires when the process is genuinely dead or the network is partitioned. `max.poll.interval.ms` governs the application poll loop — if the consumer's application thread hasn't called `poll()` within this window, the consumer proactively leaves the group. This fires when processing a batch takes too long. Both trigger rebalances but for different reasons; each needs independent tuning.

### Q3. Explain at-least-once vs exactly-once consumer semantics.

**At-least-once**: commit offsets *after* processing. On failure, the consumer restarts from the last committed offset and reprocesses records. Safe if your sink is idempotent. **At-most-once**: commit offsets *before* processing. Records are skipped if the consumer crashes mid-processing. Rarely acceptable. **Exactly-once**: requires transactions — read from Kafka, process, write output and commit offsets atomically in one transaction (using Kafka Streams EOS or manual `sendOffsetsToTransaction`). The output sink must also support transactional writes, or be idempotent.

### Q4. Why might a consumer in a group sit idle and receive no messages?

If there are more consumers in a group than partitions in the topic, the excess consumers are assigned zero partitions and remain idle. This is by design — a partition can only be owned by one consumer in a group. The fix is to increase partition count (or remove idle consumers). Alternatively, a consumer may be temporarily unassigned during a rebalance — in eager mode this applies to all consumers until the new assignment is complete.

### Q5. How do you investigate and resolve consumer lag?

First, measure lag per partition using `kafka-consumer-groups.sh --bootstrap-server ... --describe --group <group>` or the JMX metric `kafka.consumer:records-lag-max`. Determine if lag is growing (consumer behind), stable (consumer keeping up with producer), or only spiking transiently (burst absorbed). Resolution options: increase consumer instances (up to partition count), increase `fetch.min.bytes` / `fetch.max.wait.ms` to batch larger fetches, reduce processing time per record (parallelise within a consumer), or increase partition count and scale out consumers (requires careful key remapping).

---

## Replication & Durability

### Summary

**What this topic covers**

How Kafka replicates data across brokers, the ISR (In-Sync Replicas) mechanism, leader election, `min.insync.replicas`, and the implications of unclean leader election. This is where Kafka's durability story is told and where the CAP tradeoff is made explicit.

**Mental model**

Every partition has a **replication factor** (typically 3). One replica is the **leader** — it handles all reads and writes. The rest are **followers** — they continuously fetch from the leader, lagging by `replica.lag.time.max.ms` at most before being removed from the ISR. The **ISR (In-Sync Replica set)** is the set of replicas fully caught up to the leader. The leader tracks ISR membership; a follower that falls behind is removed from ISR, added back when it catches up. When a producer sends with `acks=all`, the leader waits until all current ISR members confirm the write before acknowledging. This means durability is a function of ISR size, not replication factor. If ISR shrinks to 1 (just the leader), `acks=all` commits with a single copy — replication factor 3 is irrelevant. `min.insync.replicas` prevents this: if ISR falls below the threshold, the leader refuses produce requests with `NotEnoughReplicasException`, trading availability for durability. **Unclean leader election** (`unclean.leader.election.enable=true`) allows an out-of-sync replica to be elected leader when no ISR member is available — data loss guaranteed, but the partition becomes available. Default is `false` (prefer unavailability over data loss).

**Key terms**

- **Replication factor** — number of replica copies per partition. Typical: 3. Set at topic creation.
- **Leader replica** — the single replica handling all produce and (default) fetch requests.
- **Follower replica** — passive replica fetching from the leader. No client-facing traffic by default (Kafka 2.4+ fetch-from-follower is opt-in).
- **ISR (In-Sync Replicas)** — replicas within `replica.lag.time.max.ms` of the leader. Leader tracks membership.
- **replica.lag.time.max.ms** — max time a follower can be behind before being removed from ISR (default 30 s).
- **min.insync.replicas** — minimum ISR size before the leader will accept `acks=all` writes. Set to 2 for replication factor 3.
- **unclean.leader.election.enable** — if true, out-of-ISR replicas can be elected leader. Data loss on election. Default false.
- **HWM (High Watermark)** — the offset up to which all ISR members have replicated. Consumers see only records up to HWM, ensuring they don't read uncommitted data.
- **LEO (Log End Offset)** — the next offset to be written to a replica. Leader's LEO advances on every write; followers advance their LEO as they replicate.
- **Controller** — the broker (or Raft leader in KRaft) that orchestrates leader elections when a broker dies or is restarted.
- **Preferred leader** — the first replica in the partition's replica list. On cluster restart, Kafka tries to restore preferred leaders for load balance.

**Why interviewers ask this**

The `acks=all` + `min.insync.replicas` interaction is a classic senior-level Kafka question. Many candidates know one of these settings but not how they interact. Unclean leader election is asked to probe understanding of the availability vs. durability tradeoff. ISR dynamics are also the foundation for understanding why a cluster can appear healthy while being one broker failure away from data loss.

**Common confusions**

- "Replication factor 3 means I can lose 2 brokers" — you can lose 2 without losing data only if `min.insync.replicas=1` (or no `acks=all`). With `min.insync.replicas=2`, losing 2 of 3 means ISR size = 1 < 2 — writes fail.
- "Consumers read from ISR members" — by default, consumers always read from the leader. Follower fetching (`replica.selector.class=RackAwareReplicaSelector`) is opt-in and typically used for cross-AZ cost reduction.
- "High watermark is the latest offset" — HWM is the highest offset all ISR members have replicated. Leader's LEO (latest offset) can be ahead of HWM. Consumers cannot read past HWM.
- "Preferred leader election causes downtime" — it's a metadata-only operation; existing connections repoint to the new leader smoothly. Brief pause possible during the election.

**What follows from this topic**

Performance & Tuning (replication adds latency; RF=3 triples write I/O), Operations (under-replicated partitions metric, broker failure runbooks), and Producers (`acks` and `min.insync.replicas` configuration).

### Q1. What is the ISR and why does it matter for durability?

The ISR (In-Sync Replicas) is the set of partition replicas that are fully caught up with the leader within `replica.lag.time.max.ms`. With `acks=all`, the leader only acknowledges a produce request after all ISR members have written the record. This means ISR size, not replication factor, is the actual durability guarantee at any given moment. If 2 of 3 replicas fall out of ISR (network partition, slow broker), `acks=all` commits on the single remaining ISR member — one copy.

### Q2. How does `min.insync.replicas` interact with `acks=all`?

`min.insync.replicas` (broker or topic config) sets a floor on ISR size. If ISR shrinks below this value, the leader refuses `acks=all` produce requests with `NotEnoughReplicasException`. This is the correct production configuration for durability: replication factor 3, `min.insync.replicas=2`, `acks=all` — you can lose one broker and still write safely; losing two makes the partition read-only until a replica recovers.

### Q3. What is unclean leader election and when would you enable it?

Unclean leader election allows an out-of-ISR replica to become leader when no ISR member is alive. This guarantees partition availability but guarantees data loss — records that existed only on the previous leader are gone. Enable it only when availability is strictly more important than durability: logging pipelines where dropped events are tolerable, or during a controlled disaster recovery where you accept some loss. Never enable it for financial, billing, or event-sourced systems.

### Q4. What is the high watermark and why do consumers care?

The high watermark (HWM) is the highest offset that all ISR members have replicated. Consumers can only read records up to the HWM, not beyond it. This prevents consumers from reading records that might be lost if the leader crashes before followers replicate them. After a leader failover, the new leader's HWM reflects the replicated state — records above the old leader's HWM that weren't replicated are truncated.

### Q5. How does Kafka handle leader election when a broker fails?

The controller (the active KRaft leader, or ZooKeeper-era controller broker) detects the broker failure via a session expiry. It selects a new leader for each affected partition by choosing the first ISR member in the partition's replica list (the preferred replica if available). The controller updates the cluster metadata with the new leader, and clients (producers, consumers) fetch updated metadata and reconnect. The election is fast (milliseconds for a healthy cluster) but clients may see `NotLeaderForPartition` errors briefly during the transition.

---

## Performance & Tuning

### Summary

**What this topic covers**

The key throughput vs. latency tradeoffs in Kafka and the specific configuration knobs that control them: producer batching (`linger.ms`, `batch.size`), consumer fetching (`fetch.min.bytes`, `fetch.max.wait.ms`), replication tuning, partition count, and GC/OS-level considerations. Real Kafka performance work is mostly about batch size, I/O scheduling, and avoiding stop-the-world pauses.

**Mental model**

Kafka's performance model is built around **sequential disk I/O** and **zero-copy** (`sendfile` syscall). Brokers write to the OS page cache; the OS flushes to disk. Consumers typically read directly from the page cache without a disk read if the data is recent and the broker has enough RAM. This is why Kafka brokers should have large page caches and minimal JVM heap (the heap is for the Kafka application, not the data). The throughput-latency tradeoff surfaces at two places: the producer (how long to wait to fill a batch before sending) and the consumer (how long to wait for enough bytes before returning a fetch response). Bigger batches = higher throughput, higher latency. The `linger.ms` / `batch.size` producer pair and the `fetch.min.bytes` / `fetch.max.wait.ms` consumer pair are the two primary levers. Partition count is the **macro lever** — more partitions = more parallelism but higher end-to-end latency (each partition adds replication round trips), larger metadata, and longer rebalance times. The rule of thumb is ~10 partitions per broker per topic as a starting point; benchmark before going much higher.

**Key terms**

- **linger.ms** — producer waits up to this many ms before sending an incomplete batch (default 0). Increase for throughput.
- **batch.size** — max bytes per producer batch (default 16 KB). Increase for throughput-heavy producers.
- **compression.type** — reduce bytes on the wire and on disk; zstd for ratio, lz4 for speed.
- **fetch.min.bytes** — broker waits until it has this many bytes to return in a fetch response (default 1 byte). Increase for consumer throughput (reduces fetch RPC overhead).
- **fetch.max.wait.ms** — max time broker waits to satisfy `fetch.min.bytes` before responding anyway (default 500 ms).
- **replica.fetch.min.bytes / replica.fetch.wait.max.ms** — same levers for follower replication fetch loop.
- **num.network.threads / num.io.threads** — broker-side threading. Tune based on I/O vs. CPU bottleneck.
- **socket.send.buffer.bytes / socket.receive.buffer.bytes** — TCP socket buffers. Increase for high-throughput networks.
- **Page cache** — Linux kernel buffer for disk I/O. Kafka relies on it heavily; brokers should be sized with 50%+ RAM for page cache.
- **G1GC / ZGC** — GC algorithm for the broker JVM. G1 is the long-standing default; ZGC (Java 15+) gives sub-millisecond pauses at the cost of slightly higher CPU, worth it for latency-sensitive brokers.
- **Partition count** — the primary parallelism lever. Adds overhead; don't over-partition.

**Why interviewers ask this**

Performance tuning questions separate candidates who've run Kafka in production under load from those who haven't. Interviewers look for understanding of *why* a knob works (not just what it does), the tradeoff it makes, and real-world context (e.g., "we had 0 ms linger and tiny batches hitting 10k partitions — CPU on the broker was 80% from fetch RPC overhead, we set linger.ms=5 and halved it").

**Common confusions**

- "More partitions is always better" — more partitions increases parallelism but also increases end-to-end latency (replication round trips), metadata size (all clients cache full partition metadata), rebalance time, and file handle usage on brokers. Partition count should follow actual throughput need.
- "Kafka flushes to disk synchronously" — by default, Kafka relies on the OS to flush the page cache asynchronously (`log.flush.interval.messages` and `log.flush.interval.ms` default to never / very large). Replication is the durability mechanism, not synchronous disk flush.
- "Increasing heap helps Kafka broker performance" — the opposite is often true. More heap → more GC pressure → longer GC pauses → broker unresponsive → followers fall out of ISR. Keep broker heap modest (4–8 GB) and let the OS page cache use the rest.
- "Consumer throughput is limited by network" — often limited by fetch RPC overhead when `fetch.min.bytes=1` causes tiny responses. Increase `fetch.min.bytes` to 1 MB and watch consumer throughput increase with no network change.

**What follows from this topic**

Operations & Observability (monitoring consumer lag, broker throughput, GC pause metrics), Kafka Streams (stream processing has its own state store I/O performance model), and overall system design decisions (how many partitions to provision for a given throughput SLO).

### Q1. What is the throughput vs. latency tradeoff in Kafka producer batching?

Setting `linger.ms=0` (default) sends records as soon as the I/O thread picks them up — minimum latency, small batches. Setting `linger.ms=5` accumulates records for up to 5 ms — larger batches, higher throughput (fewer network round trips, better compression), but adds up to 5 ms to p50 produce latency. Similarly, increasing `batch.size` (e.g., 64–256 KB) lets batches fill larger before being sent. For throughput-sensitive pipelines (analytics, log ingestion), tune both up. For latency-sensitive pipelines (user-facing, alerting), keep them low or default.

### Q2. How do `fetch.min.bytes` and `fetch.max.wait.ms` affect consumer performance?

`fetch.min.bytes=1` (default) makes the broker return a response the moment it has any data — high RPC rate, low latency. Setting it to 1 MB makes the broker wait until it has 1 MB of data (or `fetch.max.wait.ms` elapses, default 500 ms) — fewer RPCs, higher consumer throughput. This matters when you have many consumers or many partitions and broker CPU is the bottleneck from fetch RPC handling overhead. For real-time alerting consumers, keep defaults. For bulk analytics consumers, tune up.

### Q3. Why should Kafka broker JVM heap be kept small?

Kafka brokers don't hold message data in the JVM heap — they rely on the OS page cache. The JVM heap is only for Kafka's internal data structures (partition metadata, connection state, request queues). A large heap means a larger GC scope: longer GC pauses cause the broker to be unresponsive, heartbeats to miss, and followers to fall out of ISR — triggering rebalances and reducing effective replication factor. Standard advice: 4–6 GB heap, the rest of RAM (32–128 GB servers) available to the OS as page cache.

### Q4. What is the relationship between partition count and end-to-end latency?

More partitions means the `acks=all` round trip covers more follower acknowledgements per produce call (they happen in parallel, so it's not additive per partition, but broker processing overhead scales). Each partition also adds a replication fetch loop. For Kafka Streams, more partitions mean more state stores and more commit overhead. A rough guideline: partition count = desired throughput / throughput per partition. For most workloads, 10–100 partitions per topic is the sweet spot; thousands of partitions per topic should be a deliberate decision with benchmarked justification.

---

## Kafka Streams & Connect

### Summary

**What this topic covers**

Kafka Streams as a stream processing library and its core abstractions (KStream, KTable, topology, state stores, changelogs), and Kafka Connect as a connector framework for integrating external systems. These are the two main high-level frameworks built on top of the Kafka producer/consumer APIs.

**Mental model**

**Kafka Streams** is a Java library (not a separate cluster) that builds a **processing topology** — a DAG of sources, processors, and sinks — and runs it embedded in your application. Each application instance is a consumer in a Kafka Streams consumer group; partitions are assigned to instances, which then run the corresponding sub-topology on their assigned partitions in parallel. A **KStream** is an unbounded sequence of records — each record is independent (think events). A **KTable** is a changelog stream viewed as a materialised table — each record is an upsert for its key; the latest value per key is the "current state." Aggregations and joins produce state that must be persisted: Kafka Streams uses **state stores** (RocksDB-backed by default) to hold this state locally. State stores are backed by **changelog topics** (compacted Kafka topics) so state can be rebuilt after a crash by replaying the changelog. **Windowed operations** (tumbling, hopping, sliding, session windows) partition a stream by time for aggregations like "count of events per 5-minute window." **Kafka Connect** is a separate runtime (distributed or standalone) that manages connectors: **source connectors** read from external systems (JDBC, S3, Debezium for CDC) and write to Kafka topics; **sink connectors** read from Kafka and write to external systems (Elasticsearch, Snowflake, S3). Connectors run as **tasks** (parallel workers) inside Connect workers; task count is bounded by source parallelism (e.g., table count for JDBC) and topic partition count for sink connectors.

**Key terms**

- **Topology** — the processing DAG in a Kafka Streams application. Visualised via `Topology#describe()`.
- **KStream** — event stream abstraction. Append-only, every record matters.
- **KTable** — materialised table abstraction. Records are upserts by key; only the latest value per key is retained.
- **GlobalKTable** — a KTable replicated to every application instance (not partitioned). Used for broadcast joins.
- **State store** — local key-value store (RocksDB default, in-memory option). Holds aggregation results, join state. Backed by a changelog topic.
- **Changelog topic** — a compacted Kafka topic backing a state store. Used for fault-tolerance: replay to restore state after failure.
- **Windowing** — grouping records by time: tumbling (non-overlapping), hopping (overlapping), sliding (event-time offset), session (activity-gap).
- **Interactive queries** — querying a state store directly from a Streams application without going through Kafka. Useful for real-time dashboards.
- **StreamsBuilder** — the high-level DSL entry point for building topologies.
- **Kafka Connect** — distributed connector framework. Workers pull connector plugins; connectors run as tasks.
- **Source connector** — reads external data, writes to Kafka.
- **Sink connector** — reads from Kafka, writes to external system.
- **SMT (Single Message Transform)** — lightweight per-record transformation in a Connect pipeline, applied before a record reaches the topic or sink.

**Why interviewers ask this**

KStream vs KTable is a common interview question because it tests understanding of stream vs. table duality — a core concept in event-driven systems. State stores and changelog topics are probed because they're where Kafka Streams' fault tolerance model lives. Kafka Connect questions often focus on at-least-once vs. exactly-once delivery guarantees in connectors and how CDC (Debezium) works.

**Common confusions**

- "KTable is just a filtered KStream" — no, KTable semantics are fundamentally different: records are upserts, not appends. Joining a KStream to a KTable is a lookup-join (stream record triggers lookup in table), not a symmetric join.
- "Kafka Streams runs on a separate cluster" — it doesn't. It's a library embedded in your JVM. The "cluster" is just multiple instances of your application sharing the same consumer group ID.
- "State is stored in Kafka" — state is stored locally in RocksDB (or in-memory) on the instance. Kafka stores the *changelog* for durability. Local state is what makes Streams low-latency; the changelog is what makes it fault-tolerant.
- "More Streams instances always helps" — adding instances beyond the number of partitions gives you no additional parallelism (same as adding consumers beyond partition count).

**What follows from this topic**

Operations & Observability (Streams consumer group monitoring, state store restore time), Performance & Tuning (RocksDB tuning for state stores, changelog topic replication factor).

### Q1. What is the difference between a KStream and a KTable?

A **KStream** is an append-only stream of events — every record is an independent event. A **KTable** represents a materialised view: records are upserts keyed by the record's key, and only the latest value per key is semantically current. If you're modelling "page view events," that's a KStream. If you're modelling "current account balance per user ID," that's a KTable. The stream-table duality means you can convert between them: `KStream#toTable()` aggregates a stream into a table; `KTable#toStream()` emits every change as an event.

### Q2. How does Kafka Streams achieve fault tolerance?

Every state store in a Kafka Streams application is backed by a **changelog topic** — a compacted Kafka topic that receives every state store write as a record. On failure, the replacement instance restores its state store by replaying the changelog from the beginning (or from a standby replica if standby tasks are configured with `num.standby.replicas`). This makes state stores durable without any external database dependency. The tradeoff is restore time: large state stores can take minutes to hours to restore from a cold changelog.

### Q3. What is the role of a GlobalKTable?

A `GlobalKTable` is a KTable that is fully replicated to every Streams application instance regardless of partition count. This allows every instance to perform foreign-key or broadcast lookups without co-partitioning. The tradeoff is memory — the full table must fit in each instance's state store. `GlobalKTable` is appropriate for small, slowly changing reference data (e.g., user profiles, product catalogue); for large tables, use a regular KTable join with co-partitioned topics.

### Q4. What does a Kafka Connect sink connector guarantee around at-least-once delivery?

By default, Connect sink connectors operate at-least-once: offsets are committed periodically, and if a task fails between a successful write and an offset commit, the records are redelivered on restart. For exactly-once, the sink system must be idempotent (e.g., upsert by primary key in a database) or the connector must use transactional capabilities (e.g., Kafka-to-Kafka connectors using transactions). Some connectors (JDBC sink with upsert mode, Elasticsearch with document ID) are effectively idempotent and tolerate at-least-once delivery safely.

### Q5. What is Debezium and how does it work with Kafka Connect?

Debezium is an open-source CDC (Change Data Capture) source connector that reads the database transaction log (MySQL binlog, Postgres WAL, etc.) and emits row-level change events (insert/update/delete) to Kafka topics. Each table becomes a topic; each change is a keyed record (key = primary key, value = before/after image). This enables near-real-time replication to downstream systems without polling. Debezium runs as a Kafka Connect source connector task; it requires appropriate database permissions (replication role in Postgres, binlog access in MySQL) and careful management of snapshot behaviour on connector startup.

---

## Operations & Observability

### Summary

**What this topic covers**

Running Kafka in production: key metrics to monitor, how to diagnose common failure modes (under-replicated partitions, consumer lag spikes, rebalance storms, broker OOM), and operational patterns (rolling restarts, partition reassignment, cluster expansion). This topic is about the difference between reading the docs and having paged into a Kafka incident at 3 AM.

**Mental model**

Kafka exposes metrics via JMX, and most modern deployments scrape them into Prometheus via a JMX exporter. The three **tier-1 alerts** for a Kafka cluster are: (1) **under-replicated partitions** > 0 — some partition has fewer ISR members than its replication factor, meaning you're losing redundancy; (2) **active controller count ≠ 1** — cluster has no controller (split brain) or multiple (bug); (3) **consumer lag > threshold** — a consumer group is falling behind, risking unbounded queue growth. Secondary alerts include: broker GC pause duration > 1 s, request handler idle ratio < 0.2 (broker CPU saturated), and log flush latency spikes. **Common failure modes** in rough order of frequency: (a) ISR shrinkage from follower falling behind (under-provisioned broker, GC pause, network issue); (b) rebalance storm — consumer group oscillating because `max.poll.interval.ms` is too short for processing time; (c) broker disk full — caused by misconfigured retention, compaction lag, or sudden traffic spike; (d) partition leadership imbalance — all leaders on one broker post-restart (fix with `kafka-preferred-replica-election.sh` or `auto.leader.rebalance.enable=true`). **Partition reassignment** (`kafka-reassign-partitions.sh`) moves partition replicas between brokers. It triggers log replication and is I/O-intensive — throttle it with `--throttle` to avoid impact.

**Key terms**

- **Under-replicated partitions (URP)** — partitions with fewer ISR members than replication factor. JMX: `kafka.server:ReplicaManager,UnderReplicatedPartitions`. Target: 0.
- **Offline partitions** — partitions with no leader. Writes and reads fail. Indicates broker failure with no ISR member available.
- **Active controller count** — should always be exactly 1. JMX: `kafka.controller:KafkaController,ActiveControllerCount`.
- **Consumer lag** — `log-end-offset - committed-offset`. JMX: `kafka.consumer:records-lag-max`. Monitored externally via Burrow or kminion.
- **Request handler idle ratio** — fraction of request handler threads idle. < 0.2 signals broker CPU saturation.
- **Log flush latency** — p99 latency of fsync (if enabled). Usually not the bottleneck but worth watching.
- **Kafka-consumer-groups.sh** — CLI tool for inspecting consumer group state, lag, and offsets.
- **kafka-reassign-partitions.sh** — CLI tool for generating and executing partition replica reassignment plans.
- **Burrow / kminion** — dedicated consumer lag monitoring tools that expose Prometheus metrics and support alerting on lag growth rate (not just absolute value).
- **Rolling restart** — restarting brokers one at a time, waiting for ISR to recover between each restart. Preserves availability.
- **Cruise Control** — LinkedIn's open-source Kafka cluster balancer. Automates partition reassignment for load balancing.

**Why interviewers ask this**

Operationally fluent candidates know what metric to look at first, what the common failure chain is (e.g., GC pause → follower falls out of ISR → URP alert → if not fixed, eventually offline partition), and how to respond. Interviewers probe whether you understand the difference between a URP alert (degraded redundancy, still serving) and an offline partition alert (complete outage for that partition). Monitoring consumer lag growth *rate* rather than absolute value is a common "experienced ops" signal.

**Common confusions**

- "Under-replicated partitions mean data loss" — URP means reduced redundancy, not data loss. The partition is still serving from the leader; you've just lost one or more backup copies temporarily. Data loss would require losing the leader *while* URP is active.
- "Restarting the broker fixes everything" — if a broker is in a restart loop due to disk full or JVM OOM, restarting without fixing the root cause repeats the problem. Check disk usage and heap dumps first.
- "Consumer lag is always a consumer problem" — producer throughput spikes also cause lag. Monitor both consumer throughput (records/sec ingested) and producer throughput to distinguish.
- "Auto leader rebalance is safe to run anytime" — leader election is fast but not instantaneous. During `auto.leader.rebalance`, there are brief moments of `NotLeaderForPartition` errors. Schedule during low-traffic periods or use Cruise Control for gradual rebalancing.

**What follows from this topic**

Every other topic feeds into operations. The key habit is: when an alert fires, trace from symptom (URP, lag, high latency) to cause (slow follower, slow consumer, disk full, GC pause, network issue) systematically, rather than blindly restarting processes.

### Q1. What does an under-replicated partition alert mean and how do you respond?

Under-replicated partitions (URP > 0) means one or more partitions have fewer ISR members than their replication factor — you have less redundancy than configured. It does not mean data loss yet. The immediate question is: which broker fell out of ISR and why? Check `kafka-topics.sh --describe` to identify the lagging replicas. Common causes: a broker is under GC pressure (check GC logs), the broker's disk I/O is saturated (check `iostat`), or there's a network issue. If URP persists, you're one leader failure away from an offline partition (write/read outage).

### Q2. How do you monitor consumer lag effectively in production?

Point-in-time lag from `kafka-consumer-groups.sh --describe` is useful for debugging but not for alerting — a group at lag=1M that's catching up is fine; a group at lag=1000 that's growing is not. Use a dedicated lag monitor (Burrow, kminion, or Confluent's consumer lag metrics) that tracks lag *rate of change*. Alert on: lag growing for > N minutes, or lag > threshold AND consumer throughput dropping. Burrow's "WAIT" vs "STOP" vs "ERR" lag states are a useful model: STOP means the consumer hasn't moved at all.

### Q3. What causes a rebalance storm and how do you fix it?

A rebalance storm is a consumer group rebalancing repeatedly, never settling into stable consumption. Common cause: `max.poll.interval.ms` is shorter than the time it takes to process a batch. The consumer's poll thread exceeds the interval, the consumer proactively leaves the group, triggers a rebalance, rejoins, gets assigned, starts processing, exceeds the interval again, repeat. Fix: increase `max.poll.interval.ms`, reduce the work done per `poll()` call (smaller `max.poll.records`), or move heavy processing off the poll thread. Switching to `CooperativeStickyAssignor` reduces the blast radius of rebalances but doesn't fix the root cause.

### Q4. Walk me through a rolling broker restart procedure.

Stop broker 1 gracefully (`kafka-server-stop.sh`). Wait for all partitions that had leaders or replicas on broker 1 to have their leaders re-elected and ISR recovered on the remaining brokers — check `UnderReplicatedPartitions = 0`. If broker 1 had preferred leaders, `kafka-preferred-replica-election.sh` will eventually restore them. Restart broker 1, wait for it to rejoin and replicate all its partitions back into ISR (watch URP). Repeat for broker 2, 3, etc. The key invariant: never restart a second broker while the first is still causing URP. Violating this risks having ISR shrink below `min.insync.replicas` and making partitions unavailable for writes.

### Q5. How would you diagnose and resolve broker disk full?

First, identify which broker is full (`df -h` on the host or check the `kafka.log:LogFlushStats` / OS disk metrics). Then identify which topics are consuming the most disk: `kafka-log-dirs.sh --describe --topic-list ...`. Immediate relief options: (a) lower `retention.bytes` or `retention.ms` on the largest topics to trigger deletion; (b) trigger log compaction manually on compacted topics; (c) add a broker and rebalance partitions to spread load. Root cause analysis: was there a sudden traffic spike, a misconfigured retention policy, or a compaction backlog (check `kafka.log:LogCleaner` metrics)? Long-term fix: size brokers with headroom for 2x peak traffic and set topic-level retention policies explicitly rather than relying on broker defaults.
