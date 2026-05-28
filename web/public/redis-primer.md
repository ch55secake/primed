---
created-on: "[[Journal/2026/May/28-Wed]]"
ctime: 2026-05-28 09:00:00
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# Redis Interview Primer

Focused Q+A primer on Redis — data structures, persistence, replication, clustering, and common production patterns. Aimed at backend and infrastructure interviews where Redis is expected knowledge.

---

## Core Data Structures

### Summary

**What this topic covers**

Redis is an in-memory data structure store. Understanding what data structures it provides — and when to reach for each one — is the foundation of every Redis interview question. This topic covers the six primary types: strings, hashes, lists, sets, sorted sets, and streams, plus the HyperLogLog and Bloom filter extensions.

**Mental model**

Think of Redis as a giant hash map where every key maps not to a raw byte blob, but to a typed, richly-operable data structure. The type determines what operations are available atomically. A string supports `INCR`; a sorted set supports `ZRANGEBYSCORE`; a list supports blocking pops. Choosing the wrong type for a use case usually means you're doing in-application logic that Redis could do atomically in microseconds.

**Key terms**

- **String** — bytes, up to 512 MB. Supports `GET/SET`, atomic `INCR/DECR`, `APPEND`, `GETSET`, bit operations. The Swiss army knife.
- **Hash** — a map of field → value within a key. Good for representing objects (`HSET user:1 name Alice age 30`). More memory-efficient than one key per field.
- **List** — a doubly-linked list of strings. `LPUSH/RPUSH`, `LPOP/RPOP`, `LRANGE`, `BLPOP` (blocking). Natural queue or stack.
- **Set** — unordered collection of unique strings. `SADD/SMEMBERS`, `SINTER/SUNION/SDIFF`. Good for tags, unique visitors.
- **Sorted Set (ZSet)** — set where each member has a floating-point score. Ordered by score. `ZADD/ZRANGE/ZRANGEBYSCORE/ZRANK`. Natural leaderboard, priority queue, rate limiter sliding window.
- **Stream** — append-only log of messages with consumer groups (`XADD/XREAD/XGROUP`). Redis's Kafka-lite.
- **HyperLogLog** — probabilistic cardinality estimator. Counts unique elements with ~0.81% error using fixed 12 KB memory. `PFADD/PFCOUNT`.
- **Bitmap** — bit-level operations on strings (`SETBIT/GETBIT/BITCOUNT`). Compact boolean arrays.

**Why interviewers ask this**

Getting a Redis question in an interview means the interviewer wants to see whether you instinctively reach for the right structure. Storing a leaderboard as a list of JSON strings and sorting in the application is a red flag; using a sorted set is the answer. Every structure question is really a judgment question.

**Common confusions**

- "Hash is just a nested key-value store" — yes, but it's a single Redis key with multiple fields. Matters for memory (one key overhead vs. N keys), for atomic operations across fields (`HMSET`), and for expiry (one TTL for the whole hash, not per field — until Redis 7.4 added hash field expiry).
- "List is a queue" — it can be either a queue (`LPUSH` + `RPOP`) or a stack (`LPUSH` + `LPOP`). The choice determines FIFO vs. LIFO.
- "Sorted sets are slow because they're sorted" — they use a skip list internally. `ZADD/ZRANK` are O(log N). For N up to millions, this is fast enough for nearly all use cases.
- "HyperLogLog is lossy" — it's probabilistic, not lossy in the storage sense. It cannot return the individual elements, only an estimate of the count. Use sets if you need to enumerate members.

**What follows from this topic**

Every later topic (caching patterns, rate limiting, pub/sub, streams) is built on top of these primitives. The sorted set underpins leaderboards and sliding-window rate limiters. The list underpins queues and pub/sub alternatives. Streams underpin event log patterns.

### Q1. When would you use a Hash over individual String keys for an object?

Use a **Hash** when you're storing multiple related fields for a single entity (`user:1` → `{name, email, age}`).

**Advantages over separate string keys:**
- One key overhead instead of N — more memory-efficient for small objects (Redis uses a compact ziplist encoding for hashes with few fields)
- Atomic multi-field operations (`HMGET`, `HMSET`, `HINCRBY`)
- Single `DEL` or `EXPIRE` covers the whole entity
- Easier key namespace management — one `user:1` key, not `user:1:name`, `user:1:email`, etc.

**Use separate string keys when:** fields have different TTLs, or fields are accessed individually far more often than together, or you need per-field expiry (Redis 7.4+).

### Q2. What are sorted sets and what are they best used for?

A sorted set is a set where every member has a `score` (float64). Members are always ordered by score. Core operations:

- `ZADD key score member` — O(log N)
- `ZRANGE key 0 -1 WITHSCORES` — range by rank, O(log N + M)
- `ZRANGEBYSCORE key min max` — range by score
- `ZRANK key member` — position of a member, O(log N)
- `ZINCRBY key delta member` — increment score atomically

**Best use cases:**
- **Leaderboard** — score = points, member = user ID. `ZREVRANGE` gives top-N instantly.
- **Sliding-window rate limiter** — score = timestamp, member = request ID. `ZREMRANGEBYSCORE` prunes old entries; `ZCARD` counts remaining.
- **Priority queue** — score = priority or scheduled time. `ZPOPMIN` dequeues the highest-priority item.
- **Autocomplete** — store all prefixes as members; range query returns completions.

### Q3. When should you use a Stream instead of a List as a queue?

| | List (as queue) | Stream |
|---|---|---|
| Consumer groups | No — one consumer per message | Yes — multiple independent consumer groups |
| Message acknowledgement | No | Yes — `XACK`; unacknowledged messages stay pending |
| Message replay | No — `LPOP` is destructive | Yes — consumers can read from any ID |
| Persistence | AOF/RDB | AOF/RDB |
| Backpressure | `BLPOP` blocks | `XREAD COUNT` with `BLOCK` |

Use **List** for a simple single-consumer queue where delivery is fire-and-forget. Use **Stream** when you need: multiple independent consumer groups, at-least-once delivery with acknowledgement, or the ability to replay messages.

## Persistence

### Summary

**What this topic covers**

How Redis survives a restart: the two persistence mechanisms (RDB snapshots and AOF — Append-Only File), how to combine them, and the durability vs. performance tradeoffs of each.

**Mental model**

Redis is in-memory first. Persistence is a backstop. RDB takes periodic point-in-time snapshots of the entire dataset to disk — fast to restore, but you lose everything since the last snapshot on crash. AOF logs every write command sequentially — on restart, Redis replays the log to reconstruct state. AOF can be configured to fsync on every write (safest, slowest), every second (good balance), or never (OS decides, fastest, least safe). In practice, most production deployments use both: AOF for durability, RDB as a fast-restore backup.

**Key terms**

- **RDB (Redis Database)** — point-in-time snapshot. `BGSAVE` forks a child process that writes the snapshot without blocking the main thread. File: `dump.rdb`.
- **AOF (Append-Only File)** — log of every write command. File: `appendonly.aof`. Replayed on restart.
- **AOF fsync policy** — `always` (fsync per write, max 1 command lost), `everysec` (fsync every second, max 1s of writes lost), `no` (OS decides, fastest).
- **AOF rewrite** — the AOF grows indefinitely. A background rewrite compacts it: replays current state as a minimal set of `SET` commands. Triggered automatically when AOF exceeds a size threshold.
- **RDB + AOF hybrid** — Redis 4.0+. On AOF rewrite, embed the current RDB snapshot in the AOF file. Fast restore (load RDB section) + full durability (replay AOF tail). Best of both.

**Why interviewers ask this**

Persistence questions reveal whether you understand the durability guarantees Redis actually provides. Redis is not a durable database by default — if you treat it as one without understanding the tradeoffs, you'll lose data in production. Interviewers use this to separate engineers who know Redis from engineers who've just used it.

**Common confusions**

- "Redis always persists data" — not by default. A default Redis install has `save ""` (no RDB) and no AOF. It's a pure cache unless you configure persistence.
- "AOF with everysec means at most 1 second of data loss" — correct under normal operation. Under high write load, the fsync thread can fall behind; actual loss can be slightly more. Still the practical sweet spot.
- "RDB is faster than AOF for writes" — RDB has zero write-path overhead between snapshots. AOF appends every command; `everysec` is the common choice to minimise write overhead.
- "AOF rewrite blocks Redis" — the rewrite is done by a forked child process. The parent continues serving requests. The fork itself (copy-on-write) is the only brief blocking moment, proportional to dataset size.

**What follows from this topic**

Persistence settings interact directly with replication (a replica is seeded from an RDB snapshot) and Redis Cluster (each shard's persistence is independent). Understanding AOF and RDB is a prerequisite for reasoning about Redis's durability guarantees in HA setups.

### Q4. What is the difference between RDB and AOF persistence?

**RDB** — periodic snapshot of the full dataset. Triggered by `BGSAVE` or automatic `save` rules (e.g., `save 60 1000` — snapshot if 1000 keys changed in 60s). Fast to restore (binary file, no replay). Downside: data written since the last snapshot is lost on crash.

**AOF** — every write command appended to a log file. On restart, Redis replays the file to reconstruct state. Three fsync modes:
- `always` — fsync after every command. Max 1 command lost. ~10× slower writes.
- `everysec` — fsync every second. Max ~1s of writes lost. Recommended default.
- `no` — OS decides. Fastest. Potentially seconds of writes lost.

**Combined (recommended for production):** enable AOF with `everysec` for operational durability. Take periodic RDB snapshots as fast-restore backups. On restart, Redis loads the AOF (more up-to-date than RDB).

### Q5. What happens to in-flight writes during an RDB snapshot?

`BGSAVE` forks the Redis process. The child writes the snapshot using copy-on-write (COW) semantics — it sees the memory state at the moment of fork. The parent continues serving writes, modifying pages independently. Writes after the fork are not in the snapshot.

The cost: the fork itself briefly blocks Redis (proportional to dataset size — a 10 GB dataset fork takes ~100ms on a typical server). After that, the child runs concurrently. Memory overhead: up to 2× the dataset size during snapshot if all pages are being written (dirty pages are COW-copied). Monitor `used_memory` vs. `used_memory_rss` to detect COW pressure.

### Q6. How does AOF rewrite work and when does it trigger?

Over time the AOF grows without bound — every `INCR`, `SET`, and `DEL` is appended. An AOF rewrite compacts this: it forks a child that writes the current state as the minimum set of commands needed to reproduce it (e.g., a key `SET` 1000 times becomes one `SET`).

Triggers:
- Automatic: when AOF size exceeds `auto-aof-rewrite-min-size` (default 64 MB) **and** has grown by `auto-aof-rewrite-percentage` (default 100%) since the last rewrite.
- Manual: `BGREWRITEAOF`.

During the rewrite, the parent buffers new commands in a rewrite buffer. When the child finishes, the buffer is appended to the new AOF and it atomically replaces the old file. No data is lost.

## Replication and High Availability

### Summary

**What this topic covers**

How Redis replicates data across nodes, the Redis Sentinel HA system for automatic failover, and the consistency guarantees (and gaps) that come with async replication.

**Mental model**

Redis replication is leader-follower, asynchronous. The leader (primary) accepts all writes and ships a replication stream to replicas. Replicas serve reads. If the primary dies, Redis Sentinel (a distributed monitor) detects the failure, elects a replica as the new primary, and reconfigures clients. Because replication is async, a failover can lose the last few writes that hadn't been replicated yet — Redis replication is not zero-RPO by default.

**Key terms**

- **Primary (master)** — the single writable node. Receives all writes, ships changes to replicas.
- **Replica (slave)** — read-only copy. Replicates from primary via a persistent TCP connection. Can serve reads to offload the primary.
- **Replication ID** — a random string identifying the primary's replication stream. Replicas track their offset in this stream.
- **Partial resync** — if a replica reconnects after a brief disconnect, it requests only the missed commands using its stored offset. Requires the primary's replication backlog to still hold those commands.
- **Full resync** — if the offset is no longer in the backlog, the primary does a `BGSAVE`, sends the RDB snapshot, then streams subsequent commands. Expensive.
- **Redis Sentinel** — a separate process (or set of processes) that monitors primaries and replicas, performs automatic failover, and provides service discovery (clients ask Sentinel for the current primary address).
- **Min-replicas-to-write** — `min-replicas-to-write N` + `min-replicas-max-lag S` — primary refuses writes unless at least N replicas are within S seconds of lag. Reduces write loss on failover at cost of availability.

**Why interviewers ask this**

Redis HA is a common design question component. Knowing the difference between Sentinel (failover for a single primary) and Cluster (sharded + HA) is essential. Knowing that async replication means potential write loss is what separates senior from junior answers.

**Common confusions**

- "Redis replication is synchronous" — it's async by default. `WAIT N T` can block the client until N replicas confirm, but this is not the default.
- "Sentinel is the same as Redis Cluster" — Sentinel provides HA for a single primary-replica set (no sharding). Cluster provides both sharding and HA.
- "Replicas can serve consistent reads" — replicas are eventually consistent. A read immediately after a write to the primary may return stale data from a replica. Use `WAIT` or route reads to the primary if consistency is required.
- "Failover is instantaneous" — Sentinel failover typically takes 10–30 seconds (detection timeout + election + reconfiguration). Design clients with reconnect logic.

**What follows from this topic**

Replication is the building block of Redis Sentinel and Redis Cluster. Understanding async replication and its durability gap is required to reason about data loss scenarios, `WAIT` usage, and `min-replicas-to-write` configuration.

### Q7. How does Redis replication work?

On first connection (or after a full resync): the primary forks and sends an RDB snapshot to the replica. While the snapshot transfers, new commands are buffered in the replication backlog. Once the replica loads the RDB, the primary streams the buffered and subsequent commands in real time.

Ongoing: the primary sends every write command to connected replicas over a persistent TCP connection. The replica applies commands in the same order. The replication offset tracks how far the replica has consumed the stream.

Partial resync: if the replica disconnects briefly and reconnects, it sends `PSYNC repl_id offset`. If the primary still has the commands from `offset` in its replication backlog (`repl-backlog-size`, default 1 MB), it sends only the delta. Otherwise, full resync.

### Q8. What is Redis Sentinel and what does it provide?

Redis Sentinel is a high-availability solution for a single primary + replica setup. It runs as separate processes (typically 3 or more, for quorum) that:

1. **Monitor** — continuously ping primaries and replicas; track their health.
2. **Notify** — alert administrators (via pub/sub) when a node changes state.
3. **Automatic failover** — when a primary is unreachable by a quorum of Sentinels, elect a replica as the new primary, reconfigure other replicas to follow the new primary.
4. **Service discovery** — clients connect to Sentinel to ask "who is the current primary?" Sentinel returns the address; clients connect directly. On failover, clients re-query Sentinel.

Sentinel does **not** provide sharding. For a dataset that needs to be partitioned across multiple nodes, use Redis Cluster.

### Q9. Can you lose data on Redis failover, and how do you mitigate it?

**Yes.** Because replication is async, the primary may have processed writes that haven't been shipped to any replica at the time it crashes. Those writes are lost.

Mitigations:
- **`WAIT N T`** — blocks the client until N replicas have confirmed the write (or T milliseconds pass). Turns a single write into a semi-synchronous operation. Use for critical writes.
- **`min-replicas-to-write 1` + `min-replicas-max-lag 10`** — primary refuses writes if no replica has been reachable in the last 10 seconds. Prevents writes that have zero chance of surviving failover. Trades availability for durability.
- **Accept the tradeoff** — for caches, losing a few seconds of writes is acceptable. Redis is often used as a cache where the source of truth is elsewhere. Design the system to treat Redis as lossy.

## Redis Cluster

### Summary

**What this topic covers**

Redis Cluster — the built-in horizontal scaling and HA solution. How data is partitioned across nodes using hash slots, how reads and writes are routed, what happens when nodes fail, and the consistency model.

**Mental model**

Redis Cluster divides the keyspace into 16,384 hash slots. Each slot is assigned to a primary node. Every key maps to a slot via `CRC16(key) mod 16384`. A cluster of N primaries each owns ~16384/N slots. Each primary has one or more replicas. Clients use a cluster-aware client library that caches the slot→node mapping and routes requests directly to the correct node. On node failure, the replicas of that node elect a new primary and take over its slots — no Sentinel needed.

**Key terms**

- **Hash slot** — the unit of partitioning. 16,384 total. Each key belongs to exactly one slot.
- **Hash tag** — `{foo}` in a key name — the slot is computed only from the part inside `{}`. Allows co-locating multiple keys on the same slot (needed for multi-key commands).
- **MOVED redirect** — if a client sends a command to the wrong node, the node responds with `MOVED slot ip:port`. The client updates its slot map and retries.
- **ASK redirect** — during a slot migration, the source node sends `ASK` to redirect to the target node for that specific request only (without updating the slot map).
- **Cluster bus** — a separate TCP port (client port + 10000) used for node-to-node gossip, failure detection, and configuration propagation.
- **Epoch** — a logical clock used to order configuration changes and resolve conflicts during failover.

**Why interviewers ask this**

Redis Cluster is the production answer to "how do you scale Redis beyond a single node?" Knowing how hash slots work, what hash tags are for, and the consistency tradeoffs is expected for any senior backend role that uses Redis at scale.

**Common confusions**

- "Redis Cluster supports all Redis commands" — it doesn't. Multi-key commands (`MSET`, `SUNIONSTORE`, Lua scripts touching multiple keys) only work if all keys are in the same slot. Hash tags solve this but require key naming discipline.
- "Cluster provides strong consistency" — it doesn't. Replication within each shard is async; the same failover data loss risk applies per shard.
- "You need Sentinel with Cluster" — no. Cluster has built-in automatic failover via its gossip protocol. Sentinel is only for non-clustered setups.
- "Adding a node is seamless" — slot migration is online but not zero-overhead. The cluster moves slots one by one; during migration, keys in the migrating slot get `ASK` redirects. Client-visible latency increases briefly.

**What follows from this topic**

Redis Cluster configuration connects to: application-level key design (hash tags for co-location), client library selection (must be cluster-aware), capacity planning (slot distribution, replica count), and operational concerns (rolling upgrades, slot rebalancing).

### Q10. How does Redis Cluster partition data?

Every key is hashed to one of 16,384 hash slots: `slot = CRC16(key) mod 16384`. Each primary node owns a contiguous or non-contiguous range of slots. The cluster configuration (which node owns which slots) is gossiped among all nodes and cached by client libraries.

On a write: the client library computes the slot, looks up the owning node from its cached slot map, and sends the command directly to that node. If the slot map is stale and the command lands on the wrong node, the node returns `MOVED slot ip:port` and the client retries on the correct node, updating its cache.

To scale out: add a new primary node, then use `redis-cli --cluster reshard` to migrate slots from existing nodes to the new one. Migration is online — keys in the migrating slot are served from the source until fully moved to the target.

### Q11. What are hash tags and why are they needed?

Multi-key commands (`MGET`, `SUNIONSTORE`, transactions with `MULTI/EXEC`, Lua scripts) require all keys involved to be on the same node — otherwise Redis Cluster cannot execute them atomically.

A hash tag forces a key to a specific slot by making the slot computation use only the substring between `{` and `}`:

```
user:{1001}:profile  →  slot = CRC16("1001") mod 16384
user:{1001}:sessions →  slot = CRC16("1001") mod 16384
```

Both keys land on the same slot → same node → multi-key commands work. Without hash tags, `user:1001:profile` and `user:1001:sessions` would likely hash to different slots.

Caution: overusing one hash tag concentrates too many keys on one slot (hot slot). Use the minimum granularity that satisfies your co-location needs.

### Q12. What happens when a node fails in Redis Cluster?

1. Other nodes detect the failure via gossip — a node is marked `PFAIL` (possibly failed) if it doesn't respond to `PING` within `cluster-node-timeout` (default 15s).
2. If a quorum of primaries agree the node is unreachable, it's marked `FAIL`.
3. A replica of the failed primary initiates a failover election: it increments its epoch and requests votes from other primaries.
4. The first replica to get a majority of votes becomes the new primary and takes over the failed node's slots.
5. The new configuration is gossiped to all nodes and client libraries receive `MOVED` redirects to update their slot maps.

If a primary has no replicas (or all replicas also fail), its slots become unavailable. The cluster can be configured with `cluster-require-full-coverage no` to keep serving available slots rather than going fully unavailable.

## Common Patterns

### Summary

**What this topic covers**

The production patterns Redis is most commonly used for: caching (with invalidation strategies), distributed locking, rate limiting, pub/sub, and session storage. Each pattern has a canonical Redis implementation and known failure modes.

**Mental model**

Redis patterns are recipes: a specific combination of data structures and commands that solve a recurring problem atomically and efficiently. The key skill is knowing which recipe to apply, what its failure modes are, and when a different tool (or a more complex Redis pattern) is the right answer.

**Key terms**

- **Cache-aside** — application checks cache before DB; on miss, loads from DB and populates cache.
- **Write-through** — writes go to cache and DB together; reads always hit cache.
- **TTL** — time-to-live; automatic expiry of a key after N seconds. The safety net for cache invalidation.
- **SETNX** — set if not exists; the primitive behind a naive distributed lock.
- **SET NX EX** — atomic set-if-not-exists with expiry; the correct primitive for a distributed lock.
- **Lua script** — executes atomically on the Redis server; used for multi-step operations that must be indivisible.
- **Pub/Sub** — fire-and-forget messaging. Publishers send to channels; subscribers receive. No persistence, no consumer groups.

**Why interviewers ask this**

Pattern questions are the practical half of Redis interviews. "How would you implement a rate limiter in Redis?" or "How would you implement a distributed lock?" are extremely common. The interviewer wants to see correct use of atomicity — naive multi-command implementations have race conditions; the correct answer always involves `MULTI/EXEC`, Lua, or a single atomic command.

**Common confusions**

- "Use `SETNX` then `EXPIRE` for a lock" — this is a race condition. If the process crashes between `SETNX` and `EXPIRE`, the lock never expires. Use `SET key value NX EX seconds` — atomic in a single command since Redis 2.6.
- "Pub/Sub is a reliable message queue" — pub/sub is fire-and-forget. If a subscriber is offline, it misses messages. For reliable messaging use Streams.
- "Redis transactions (MULTI/EXEC) provide isolation" — `MULTI/EXEC` queues commands and executes them atomically (no interleaving), but other clients can still read/write between the `MULTI` and `EXEC`. Use `WATCH` for optimistic locking, or Lua for true atomicity.

**What follows from this topic**

These patterns appear in system design questions: caching in the design of any read-heavy service, rate limiting in API gateway design, distributed locks in leader election and job scheduling.

### Q13. How do you implement a sliding-window rate limiter in Redis?

Use a **sorted set** where the score is the request timestamp (Unix milliseconds) and the member is a unique request ID.

```lua
-- Lua script (atomic)
local key = KEYS[1]
local now = tonumber(ARGV[1])       -- current time ms
local window = tonumber(ARGV[2])    -- window size ms
local limit = tonumber(ARGV[3])     -- max requests
local req_id = ARGV[4]

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
-- Count remaining
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, req_id)
    redis.call('PEXPIRE', key, window)
    return 1  -- allowed
end
return 0  -- denied
```

All operations in a single Lua script = atomic. No race conditions. Memory: O(requests per window per key). For 100 req/min per user with 1M users active → 100M sorted set entries max — manageable with a 1-minute TTL.

### Q14. How do you implement a correct distributed lock in Redis?

```
SET lock:resource_name <unique_token> NX PX 30000
```

- `NX` — only set if key doesn't exist (acquire)
- `PX 30000` — expire after 30 seconds (auto-release if holder crashes)
- `<unique_token>` — a UUID unique to this lock acquisition

**Release** must be done atomically — check the token matches before deleting, to avoid releasing someone else's lock:

```lua
-- Lua script
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end
```

**Failure modes:** a GC pause or slow process can cause the lock to expire while the holder thinks it still holds it. For correctness on the protected resource, use a **fencing token** (a monotonically increasing number from the lock service). The resource rejects operations with a stale token.

**Redlock** — multi-node lock across 5 Redis instances for higher availability. Controversial (Kleppmann critique): still vulnerable to timing issues under GC pauses. For strong guarantees, use a Raft-based lock service (etcd, ZooKeeper) instead.

### Q15. What is the difference between Redis Pub/Sub and Streams?

| | Pub/Sub | Streams |
|---|---|---|
| Persistence | None — messages lost if no subscriber | Yes — messages stored until deleted |
| Consumer groups | No | Yes — multiple independent groups |
| Message replay | No | Yes — read from any message ID |
| Acknowledgement | No | Yes — `XACK` |
| Backpressure | None | `MAXLEN` trims old messages |
| Use case | Real-time notifications, broadcasting | Reliable event log, task queues, CDC |

Use **Pub/Sub** for ephemeral real-time broadcasts where message loss is acceptable (live scores, presence updates). Use **Streams** for anything requiring durability, at-least-once delivery, or multiple independent consumers.

## Performance, Memory, and Operations

### Summary

**What this topic covers**

Redis performance characteristics, memory management, eviction policies, latency sources, and operational best practices — the topics that come up when Redis is misbehaving in production.

**Mental model**

Redis is single-threaded for command processing (multi-threaded for I/O since Redis 6). This means one slow command blocks every other client. Memory is finite — when it's full, Redis must evict keys or refuse writes. Latency spikes come from a predictable set of causes: slow commands, large key operations, fork for RDB/AOF rewrite, and memory fragmentation. Knowing where to look is the skill.

**Key terms**

- **Single-threaded command loop** — one goroutine processes commands sequentially. O(N) commands (`KEYS`, `SMEMBERS` on large sets, `LRANGE` on long lists) block all other clients.
- **`SCAN`** — cursor-based, O(1) per call, iterates over keys without blocking. The correct alternative to `KEYS` in production.
- **Eviction policy** — what Redis does when `maxmemory` is reached. `allkeys-lru`, `volatile-lru`, `allkeys-lfu`, `noeviction`, etc.
- **Memory fragmentation** — Redis allocates memory in chunks; freed memory may not be contiguous. `mem_fragmentation_ratio > 1.5` indicates fragmentation; `MEMORY PURGE` (Redis 4+) or a restart defragments.
- **Slow log** — `SLOWLOG GET` shows commands that exceeded `slowlog-log-slower-than` microseconds (default 10ms). First place to look on latency issues.
- **Pipelining** — send multiple commands without waiting for individual responses. Reduces round-trip overhead dramatically for batch operations.
- **Keyspace notifications** — Redis publishes events (key expiry, writes) to Pub/Sub channels. Useful for cache invalidation triggers but has performance cost when enabled.

**Why interviewers ask this**

Production Redis problems are almost always one of: a blocking command, memory exhaustion, or replication lag. Knowing the eviction policies by name and knowing to use `SCAN` instead of `KEYS` are baseline expectations for any senior engineer.

**Common confusions**

- "`KEYS *` is fine in development" — it is, but the habit kills production. `KEYS` is O(N) over all keys and blocks the server. Always use `SCAN` with a cursor.
- "LRU eviction means the oldest key is evicted" — LRU evicts the least-recently-used key, not the oldest. An old key that's accessed frequently is retained over a recently-set key that's never accessed again.
- "maxmemory-policy noeviction means data is safe" — `noeviction` causes Redis to return errors on write commands when memory is full. If your application doesn't handle these errors, it will crash.
- "Redis is always fast" — Redis is fast for simple operations. Large data structure operations (`SORT`, `LRANGE 0 -1` on a 1M-element list), `KEYS`, and Lua scripts with loops can take seconds and block all other clients.

**What follows from this topic**

Memory and performance topics connect to capacity planning, Redis Cluster shard sizing, and application-level patterns (pipelining, avoiding large keys, using `SCAN`).

### Q16. What eviction policies does Redis support and when do you use each?

When `maxmemory` is reached:

| Policy | Behaviour | Use when |
|---|---|---|
| `noeviction` | Return error on writes | Data must never be lost; prefer errors over eviction |
| `allkeys-lru` | Evict least recently used key (any key) | General-purpose cache — evict cold data |
| `volatile-lru` | Evict LRU key with a TTL set | Mixed cache + persistent data in same instance |
| `allkeys-lfu` | Evict least frequently used key (any key) | Skewed access pattern — protect hot keys |
| `volatile-lfu` | Evict LFU key with a TTL set | Mixed instance with skewed access |
| `allkeys-random` | Evict random key | Uniform access pattern, simplicity |
| `volatile-ttl` | Evict key with the shortest TTL | Expire soonest-to-die keys first |

**Default for a pure cache:** `allkeys-lru` or `allkeys-lfu`. LFU (available since Redis 4.0) is generally better for skewed workloads (Zipf-distributed key access) because it protects frequently-accessed keys even if they haven't been accessed in the last few seconds.

### Q17. How do you find and fix slow Redis commands in production?

1. **Check the slow log:** `SLOWLOG GET 25` — shows the 25 most recent commands that exceeded `slowlog-log-slower-than` (default 10ms). Look for `KEYS`, `SMEMBERS`, `LRANGE`, `SORT`, or Lua scripts.
2. **Replace `KEYS` with `SCAN`:** `SCAN 0 MATCH pattern COUNT 100` — iterates in O(1) chunks without blocking.
3. **Check command stats:** `INFO commandstats` — shows call count and cumulative microseconds per command type. Divide to get average latency per command.
4. **Profile large keys:** `redis-cli --bigkeys` scans the keyspace and reports the largest key per type. Large keys (MB-sized strings, millions of members in a set) are latency bombs.
5. **Pipeline batch operations:** if you're issuing 1000 sequential `SET` commands, pipeline them — send all 1000 in one TCP round trip, receive all 1000 responses together. Throughput improvement: 10–100×.

### Q18. What is the Redis memory model and how do you reduce memory usage?

Redis stores everything in RAM. Memory usage = sum of key + value sizes + per-key overhead (~50–100 bytes) + data structure overhead.

**Reducing memory:**
- **Use appropriate encodings** — Redis auto-uses compact encodings for small structures (ziplist for small hashes/lists/zsets, intset for small integer sets). Stay within the thresholds: `hash-max-ziplist-entries 128`, `hash-max-ziplist-value 64`. Exceeding these switches to a hash table (3–10× more memory).
- **Compress large values** — compress at the application layer before storing; Redis stores bytes, doesn't care about content.
- **Set TTLs** — expired keys are lazily deleted (on access) and actively purged by a background task. Without TTLs, keys accumulate indefinitely.
- **Use hashes for objects** — storing `user:1:name`, `user:1:email` as separate strings has 2× key overhead vs. one hash `user:1` with fields `name` and `email`.
- **`OBJECT ENCODING key`** — inspect the current encoding of a key. If a hash is using `hashtable` instead of `ziplist`, check if you've exceeded the ziplist threshold.
