---
type: interview-prep
---

# Postgres Interview Primer — 100 Questions

Senior backend interview prep for PostgreSQL 16 / 17 / 18. Each answer is interview-shaped: 2–6 sentences, focused on failure modes, tradeoffs, and "what breaks under load" — not textbook trivia.

1. [[#Architecture & Processes]]
2. [[#MVCC, Tuples & Visibility]]
3. [[#VACUUM & Autovacuum]]
4. [[#WAL, Checkpoints & Crash Recovery]]
5. [[#Query Planning & Execution]]
6. [[#Indexing Strategy]]
7. [[#Transactions, Locking & Isolation]]
8. [[#JSON & JSONB]]
9. [[#Full-Text Search]]
10. [[#Partitioning]]
11. [[#Replication & High Availability]]
12. [[#Backup & Disaster Recovery]]
13. [[#Connection Management & Pooling]]
14. [[#Schema Design & Data Types]]
15. [[#Advanced SQL Features]]
16. [[#Monitoring, Diagnostics & Extensions]]
17. [[#Postgres 17 / 18 Specifics]]

---

## Architecture & Processes

### Q1. Walk me through the Postgres process model.

Postgres is **process-per-connection**: `postmaster` accepts new connections and `fork()`s a dedicated **backend** process per client. Each backend owns its own memory (`work_mem`, `temp_buffers`, catalog cache), so a connection costs ~10 MB resident plus fork latency. That's why production deployments *always* sit behind a pooler — direct app-to-Postgres at thousands of connections is a known way to OOM the server. Shared memory holds `shared_buffers`, the WAL buffer, lock tables, and replication slots; everything else is per-backend.

### Q2. What are the background processes and what do they do?

`checkpointer` writes dirty buffers and the checkpoint record on schedule, `bgwriter` trickles dirty buffers out between checkpoints to smooth I/O, `walwriter` flushes WAL, `autovacuum launcher` spawns `autovacuum worker`s, the **cumulative statistics system** (PG 15+, replaced the old stats collector) records table/index stats in shared memory, `logical replication launcher` spawns logical replication workers, and `archiver` ships completed WAL segments. Knowing they exist matters because each can become a bottleneck — e.g. archiver lag triggers `pg_wal` disk fill, the classic outage.

### Q3. How is data laid out on disk?

Each table and index is a file under `$PGDATA/base/<db_oid>/<rel_oid>`, segmented at 1 GB (`<rel_oid>.1`, `.2`, etc.). Tables have multiple **forks**: the **main** fork (heap pages), the **FSM** (free space map, tells the planner which pages can fit a new tuple), the **VM** (visibility map, marks pages where all tuples are visible to all transactions — index-only scans and vacuum skip pages flagged here), and the **init** fork (for unlogged tables, used to truncate on crash). Pages are 8 KB.

### Q4. Describe the structure of a heap page and what a HOT update is.

An 8 KB page has a header, a downward-growing array of **line pointers** (item IDs), and tuples filled upward from the bottom. A **HOT (Heap-Only Tuple)** update happens when an `UPDATE` doesn't change any indexed column *and* the new tuple fits in the same page — Postgres links the new tuple from the old via the line pointer and **skips updating any indexes**, which is the single biggest write-path optimisation. You enable headroom for HOT with `fillfactor` (drop tables to 80-90 for update-heavy workloads). Once a page is full, HOT degrades and every update touches every index again.

### Q5. Why is `max_connections` not the answer to "we need more connections"?

Because each connection is a forked OS process holding ~10 MB of private memory plus catalog caches; raising `max_connections` past a few hundred wastes RAM that should be in `shared_buffers` or `work_mem` and worsens lock-table contention. The right answer is **PgBouncer** in `transaction` pooling mode in front, with a small backend pool (~CPU × 2-4) and thousands of cheap app-side connections behind the pooler. Use `session` pooling only when features require it — prepared statements (before PG 17 protocol-level fix), advisory locks, `SET LOCAL`, `LISTEN`/`NOTIFY`.

### Q6. What's the difference between `shared_buffers`, the OS page cache, and `work_mem`?

`shared_buffers` is Postgres's own buffer cache in shared memory, sized as a percentage of RAM (25% on bare metal is the historical default; 40-50% is fine on modern hardware and cloud). The OS page cache also caches the same files — so data is often **double-buffered**, but that's tolerated because the kernel reads are still fast. `work_mem` is **per-operation, per-backend** memory for sorts and hash joins; setting it too high multiplies under load (concurrent queries × number of operations) and crushes the server. Tune `work_mem` per session for ad-hoc heavy queries instead of raising it globally.

### Q7. What is the visibility map and why does it matter for performance?

The VM is a per-table fork with two bits per heap page: **all-visible** (every tuple on this page is visible to every transaction) and **all-frozen** (every tuple's `xmin` is frozen, so this page never needs vacuum-freeze again). Index-only scans use the all-visible bit to skip the heap lookup entirely — the index already has the column values, and if the page is all-visible we don't need MVCC checks. `VACUUM (FREEZE)` and aggressive autovacuum set the all-frozen bit so future anti-wraparound vacuums skip the page; this is critical for huge static tables.

### Q8. How does Postgres handle TOAST — and when does it bite you?

**TOAST (The Oversized-Attribute Storage Technique)** kicks in when a row would exceed ~2 KB: large `text`, `bytea`, or `jsonb` values are compressed and/or stored out-of-line in a hidden TOAST table. Reads of un-TOAST'd columns are cheap; reads that touch the TOASTed column cost an extra index lookup per row. It bites when you `SELECT *` from a wide table with a big `jsonb` column — every row triggers a TOAST fetch even if you only displayed one field. Mitigation: read narrow columns; use `EXTERNAL` storage when you compress at the app layer; in PG 14+ tune `default_toast_compression` to `lz4` for faster compression than the default `pglz`.

---

## MVCC, Tuples & Visibility

### Q9. What does MVCC mean in Postgres and how is it implemented?

**Multi-Version Concurrency Control**: readers never block writers and writers never block readers, achieved by keeping multiple versions of each row tagged with the transaction IDs that created (`xmin`) and deleted (`xmax`) them. An `UPDATE` doesn't overwrite — it marks the old tuple with `xmax = current_xid` and inserts a new tuple with `xmin = current_xid`. A snapshot taken at the start of a transaction defines which `xmin`/`xmax` ranges are visible. The dead tuples accumulate until vacuum reclaims them.

### Q10. What is `xmin` / `xmax`, and how does a `SELECT` decide if a tuple is visible?

Every tuple has system columns `xmin` (creating xid) and `xmax` (deleting xid; zero if alive). A snapshot is `{xmin: earliest active xid, xmax: next xid to issue, xip: in-progress xid list}`. A tuple is visible to a snapshot iff `xmin` committed *before* the snapshot, `xmin` is not in the in-progress list, and either `xmax = 0` or `xmax` rolled back / hasn't committed before the snapshot. This is the **MVCC visibility check** — runs on every tuple touched.

### Q11. What is transaction ID wraparound and how does Postgres prevent it?

Xids are 32-bit so they wrap every ~4 billion transactions; once they wrap, *every* tuple looks like it was created in the future and vanishes from existence — a database-level extinction event. Postgres prevents it by **freezing** old tuples: vacuum rewrites tuples whose `xmin` is older than `vacuum_freeze_min_age` to a special "frozen" flag meaning "always visible". When a database approaches wraparound, **autovacuum** kicks in *aggressively* — even ignoring `autovacuum = off`. The warning sign is `datfrozenxid` falling far behind `txid_current()`; the alert is `database is not accepting commands to avoid wraparound data loss`.

### Q12. What's the difference between a "dead tuple" and "bloat"?

A **dead tuple** is a row version that's no longer visible to any active transaction — the result of any `UPDATE` or `DELETE`. **Bloat** is the disk space those dead tuples occupy plus the space that vacuum-recycled but didn't return to the OS. Vacuum reclaims dead tuples *into* the table's free space (visible via the FSM); only `VACUUM FULL` or `pg_repack` returns disk to the OS. Bloat hurts because the planner sees a fatter table, sequential scans read more pages, and cache hit ratios drop.

### Q13. Why can long-running transactions kill a Postgres database?

A transaction's snapshot pins `xmin` — vacuum *cannot* remove any dead tuple newer than the oldest live snapshot, because that transaction might still need to see the old version. So a single open transaction on an OLTP system halts cleanup across **all** tables. Visible symptom: bloat balloons, autovacuum logs "could not truncate", `pg_stat_activity` shows a `BEGIN` from hours ago. The fix is timeouts: `idle_in_transaction_session_timeout`, `statement_timeout`, and connection-pool idle limits — and *never* keeping a transaction open across user think-time.

### Q14. What is `txid_current_snapshot()` actually returning, and when would you query it?

It returns `xmin:xmax:xip_list` — the bounds of the snapshot the current transaction is using. Useful for debugging visibility ("why does this read see a row that should be invisible?") and as a building block for logical decoding / change-data-capture systems that need to know what's visible at a given LSN. In day-to-day work you'd query it indirectly via `pg_stat_activity.backend_xmin` to find the oldest snapshot pinning vacuum.

### Q15. What's a "broken HOT chain" and when does it happen?

A **HOT chain** is a sequence of in-page tuple versions where index entries always point at the chain's root tuple, not at intermediate versions. The chain is "broken" when an update changes an indexed column — Postgres must now create a new heap tuple *and* a new index entry pointing at it, breaking the HOT optimisation. From then on, every subsequent update on that row also breaks the chain. The pathology is updating indexed columns frequently (e.g. `last_seen_at`) on a heavily-indexed table — the fix is either fewer indexes or moving the hot column into a side table.

### Q16. What's the relationship between MVCC and replication?

Physical replication replays WAL byte-for-byte, so MVCC visibility on the replica mirrors the primary — a transaction on the replica sees what it would see on the primary at the same LSN. Logical replication, on the other hand, decodes WAL into INSERT/UPDATE/DELETE events at commit time, so subscribers see only the *final* state of each row, not intermediate versions. This means **logical replication can't replay open transactions** — subscribers wait until the publisher commits, which is why long transactions on a publisher cause subscriber lag spikes.

---

## VACUUM & Autovacuum

### Q17. What exactly does `VACUUM` do?

Vacuum scans the heap, identifies dead tuples (using the visibility map to skip all-visible pages), marks their line pointers as `LP_DEAD` so they can be reused, and updates the FSM with reclaimed free space. It also updates pg_class statistics like `relpages` and `reltuples`, and (since PG 16) the visibility map's all-frozen bits as a byproduct. Crucially, plain `VACUUM` does **not** return disk to the OS — it just makes space inside the table available for reuse.

### Q18. What's the difference between `VACUUM`, `VACUUM FULL`, and `pg_repack`?

`VACUUM` is online, doesn't lock writes, leaves the file size unchanged. `VACUUM FULL` is `ACCESS EXCLUSIVE` lock for the duration — it rewrites the entire table into a new file, blocking *all* reads and writes, and is unsafe on production tables larger than maintenance window allows. `pg_repack` does the same compaction *online* by maintaining a trigger-based shadow copy during the rebuild and swapping at the end with a brief lock — preferred for production bloat cleanup.

### Q19. When does autovacuum kick in?

When the number of dead tuples exceeds `autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × n_live_tup` (defaults: 50 + 20%). For analyze it's `autovacuum_analyze_threshold + autovacuum_analyze_scale_factor × n_live_tup`. On large tables 20% is way too high — you'll wait hours of dead-tuple accumulation before autovacuum starts and then it has so much to do it never catches up. Override per-table: `ALTER TABLE huge_orders SET (autovacuum_vacuum_scale_factor = 0.02)` — kick in at 2% bloat.

### Q20. How would you debug an autovacuum that "isn't running"?

Check `pg_stat_user_tables` — `last_autovacuum`, `n_dead_tup`, `n_live_tup`. If `n_dead_tup` is high and `last_autovacuum` is old, autovacuum's running but losing to write rate. Look at `autovacuum_max_workers` (default 3 — almost always too low), `autovacuum_naptime` (default 1min), and `autovacuum_vacuum_cost_limit` (the throttle — raise to 2000-5000 on SSD). Then check for a **long-running transaction** holding `backend_xmin` — `SELECT pid, xact_start, query FROM pg_stat_activity WHERE state != 'idle' AND xact_start IS NOT NULL ORDER BY xact_start;` — that's the most common silent failure.

### Q21. What does `vacuum_cost_delay` actually control, and why was the default changed in PG 12?

Autovacuum pages itself in: every time the vacuum cost counter (page hits + misses + dirty writes, each with different weights) exceeds `vacuum_cost_limit`, the worker sleeps `vacuum_cost_delay` milliseconds. In PG 12 the default was lowered from 20 ms to **2 ms** because the old default throttled vacuum so heavily on modern SSD-backed databases that autovacuum couldn't keep up with even modest write workloads. On any modern hardware, set `autovacuum_vacuum_cost_delay = 2ms` and `autovacuum_vacuum_cost_limit = 2000+`.

### Q22. What is a "lazy" vacuum doing differently from an "aggressive" one?

Lazy vacuum (the normal case) scans only pages flagged as having dead tuples in the VM, plus pages modified since the last vacuum. **Aggressive** (anti-wraparound) vacuum, triggered when a table's `relfrozenxid` falls behind `vacuum_freeze_table_age` (default 150M xids), scans **every page** of the table to freeze old tuples — even all-visible pages. Aggressive vacuums are how Postgres survives wraparound but they're I/O storms; tune `autovacuum_freeze_max_age` (default 200M, raise to 500M-1B on huge tables to defer the aggressive sweep into off-peak windows).

### Q23. What's the difference between `VACUUM ANALYZE` and `ANALYZE`?

`ANALYZE` samples tuples and updates pg_statistics — histograms, MCV (most common values), nulls fraction — that the planner uses for cost estimates. `VACUUM ANALYZE` does both vacuum and analyze in one scan. `ANALYZE` alone is fast and **safe to run anytime** — when query plans go wrong after a bulk insert/update, `ANALYZE` is the first thing to try. Adjust per-column with `ALTER TABLE … ALTER COLUMN x SET STATISTICS 1000;` for columns with skew that the default 100 buckets don't capture.

### Q24. Senior interview angle: what fails when autovacuum isn't keeping up?

In order of pain: table bloat grows → sequential scans slow → cache hit ratios drop → index bloat grows independently → query plans regress because stats are stale → `xid` consumption gets close to `autovacuum_freeze_max_age` and emergency anti-wraparound vacuums kick in *on top of* the existing load, often during peak traffic. Visible from `pg_stat_user_tables.n_dead_tup`, `pg_stat_database.xact_commit` rate, and `age(datfrozenxid)`. The recovery move under pressure: `VACUUM (FREEZE, VERBOSE)` on the worst-offending table directly, then permanently lower `autovacuum_vacuum_scale_factor` on it.

---

## WAL, Checkpoints & Crash Recovery

### Q25. What is the WAL and what guarantees does it give you?

The **Write-Ahead Log** is a stream of records describing every modification, written to `$PGDATA/pg_wal/` in 16 MB segments before the data pages themselves are flushed (`fsync`'d). The guarantee: at commit, WAL up to the commit record is durable on disk; the heap pages can lag because crash recovery replays WAL from the last checkpoint forward to rebuild any unwritten changes. This is the foundation of durability, replication (replicas tail the WAL), point-in-time recovery, and logical decoding.

### Q26. What is a checkpoint?

A point where Postgres flushes **all dirty buffers** out of `shared_buffers` to data files, writes a checkpoint record to WAL, and then truncates/recycles WAL segments older than that checkpoint. Recovery starts from the latest checkpoint's LSN. Triggered by `checkpoint_timeout` (default 5 min) or when accumulated WAL hits `max_wal_size` (default 1 GB). Frequent checkpoints = lots of I/O but fast recovery; infrequent = sparse I/O bursts but long crash-recovery times.

### Q27. What's `synchronous_commit`, and what does each value cost you?

Controls how durable a `COMMIT` is. `on` (default): WAL is `fsync`'d to local disk before commit returns. `off`: commits return before fsync; ~5-10× faster but can lose up to `wal_writer_delay` (~200 ms) of committed work on crash. `local`: like `on` but doesn't wait for replicas. `remote_write` / `remote_apply`: with sync replication, wait for a replica to receive (`remote_write`) or apply (`remote_apply`) — the highest durability tier and the slowest. Common pattern: `local` on hot writes, `on` on financial commits, never `off` for production OLTP.

### Q28. What is "full page writes" and why does it exist?

After a checkpoint, the first WAL record for any page contains the **entire 8 KB page image**, not just the diff. This protects against **torn pages** — if the OS only managed to write 4 KB of an 8 KB page during a crash, replay of a partial-update WAL record would corrupt the page. `full_page_writes = off` saves WAL volume but is only safe with hardware that guarantees atomic 8 KB writes (almost nothing does). The cost is the size of `pg_wal` — high-update workloads can see WAL volume double right after a checkpoint.

### Q29. What's the relationship between `wal_level`, replication, and logical decoding?

`wal_level = minimal` (PG 10+ default is `replica`): only enough info for crash recovery, no streaming replication. `replica`: enough for streaming + base backups + hot standby. `logical`: extra information (origin xid, schema decoding hints) for logical decoding output plugins like `pgoutput`. Raising the level adds WAL volume — typical jumps are ~5% (`replica`) and another ~5-15% (`logical`). Production is almost always `replica` (HA) or `logical` (CDC + HA).

### Q30. What happens during crash recovery, step by step?

`postmaster` starts → reads `pg_control` → finds the last checkpoint LSN → opens WAL from that LSN forward → for each WAL record, applies it to the corresponding page in `shared_buffers` (`InRecovery` mode, no MVCC checks) → at end of WAL, writes a new checkpoint and starts accepting connections. The whole flow is **idempotent** — replaying the same WAL twice yields the same state because every record has its target LSN. Recovery time is roughly proportional to `(max_wal_size / write_speed_bytes_per_second)`, so frequent checkpoints = fast recovery but more I/O.

### Q31. How would you investigate "WAL is filling up the disk"?

Three suspects in order: (1) **archive_command failing** — `pg_stat_archiver` shows `failed_count` rising; the archiver retries forever, holding WAL segments until success. (2) **Inactive replication slot** — `SELECT * FROM pg_replication_slots WHERE active = false;` — slots pin WAL until the consumer drains them; an orphaned slot will fill the disk. (3) **Replica disconnected/lagging** — `pg_stat_replication` shows the lag. The emergency move: drop the inactive slot (`pg_drop_replication_slot`), accept that consumer is now broken, free the disk before Postgres goes read-only.

### Q32. Senior interview angle: how do you tune checkpoints?

Aim for **checkpoint by timeout, not by `max_wal_size`** — measure with `SELECT checkpoints_timed, checkpoints_req FROM pg_stat_bgwriter` and target `checkpoints_req / (checkpoints_timed + checkpoints_req) < 5%`. If you're checkpointing by WAL pressure, raise `max_wal_size` (modern systems: 8-32 GB is normal). Set `checkpoint_completion_target = 0.9` so the I/O is spread over 90% of `checkpoint_timeout` instead of bursting. Watch `pg_stat_bgwriter.buffers_checkpoint` vs `buffers_clean` vs `buffers_backend` — high `buffers_backend` means backends are evicting dirty pages themselves, a sign `bgwriter` is under-tuned.

---

## Query Planning & Execution

### Q33. Walk through what happens when you run a `SELECT`.

Parser builds an AST → analyzer resolves names against catalogs → rewriter expands rules/views → **planner** generates candidate plans (different join orders, scan types, join algorithms), costs each using pg_statistics + page counts, picks the cheapest → executor runs the plan as a pipeline of nodes pulling tuples from each other. The interesting one is the planner: it's a cost-based optimiser that explores plans up to `geqo_threshold` joins (default 12) exhaustively then switches to a genetic algorithm.

### Q34. How do you read `EXPLAIN ANALYZE` output?

Each line is a plan node; indentation = child relationship; numbers are `(cost=startup..total rows=expected width=bytes) (actual time=startup..total rows=actual loops=N)`. Pay attention to: **row mismatches** (actual vs expected — wildly off means stale stats or correlated predicates the planner can't model), **loops** (the node ran N times — often inside a nested loop), **buffers** (with `EXPLAIN (ANALYZE, BUFFERS)` shows shared hit/read; high read = cache miss), and the **slowest leaf**. The classic gotcha: `actual time=0.5..0.5 rows=1 loops=100000` — half a millisecond per loop times 100k loops = 50 seconds.

### Q35. What's the difference between cost and actual time in EXPLAIN?

Cost is the planner's *abstract* estimate in arbitrary "cost units" — calibrated against `seq_page_cost = 1.0`, `random_page_cost = 4.0`, `cpu_tuple_cost = 0.01`. Actual time is measured wall-clock in milliseconds during `EXPLAIN ANALYZE` execution. **A plan with the lowest cost isn't always the fastest** — high `random_page_cost` defaults assume rotational disks; lower it to ~1.1 on SSDs to make index scans cheaper relative to seq scans, fixing a category of "why is it doing a seq scan?" bugs.

### Q36. When does the planner choose a sequential scan over an index?

When the planner estimates that a large fraction of the table will match — Postgres uses `random_page_cost` to model the index-lookup overhead and decides that *random* index-driven reads cost more than sequentially streaming the heap. On SSDs the threshold is well below the historical 5-10% — but the planner still uses the old `random_page_cost = 4.0` default. Fix by either lowering `random_page_cost` to 1.1, raising `effective_cache_size` (so the planner believes more data is cached), or refining predicates so the row estimate drops. `SET enable_seqscan = off;` is a debugging hack, not a production setting.

### Q37. What's a "bitmap heap scan"?

A two-phase scan for medium-selectivity predicates: first build a **bitmap** of matching tuple-IDs by walking the index, *sort the bitmap by page* (or coalesce by page), then scan the heap pages in physical order picking out the matches. Wins over a plain index scan when the matching rows are scattered across many pages because heap I/O becomes sequential rather than random. The planner uses bitmap scans when expected match cardinality is in the 1-30% range, and they're the workhorse for combining multiple indexes via `BitmapAnd` / `BitmapOr`.

### Q38. How do nested loop, hash join, and merge join differ?

**Nested loop**: for each tuple from the outer, probe the inner — wins when one side is tiny and the other has a good index lookup. **Hash join**: build a hash table on the smaller side, probe with the larger — wins when both sides are large but fit in memory; degrades when the hash spills (`work_mem` too low). **Merge join**: both inputs sorted on the join key, walk them together — wins when both are already sorted (e.g. clustered on the join key) or when the join is `>` / `<`. The planner picks based on cardinality estimates and `work_mem`; misestimated cardinality is the #1 cause of bad join plans.

### Q39. What is the "join order" problem and how does Postgres solve it?

For N tables, there are roughly N! join orders; cost-based optimisation needs to evaluate enough of them to find a near-optimal one. Postgres uses a **dynamic programming** algorithm (DP-Bushy variant) up to `geqo_threshold` joins (default 12 — covers most queries), then switches to the **genetic query optimiser (GEQO)** which uses evolutionary search to avoid combinatorial explosion. For 10+ table joins, lower `geqo_threshold` only if you're seeing planner time dominate execution time; otherwise pin the join order via `JOIN` keyword nesting and `join_collapse_limit = 1`.

### Q40. What is "row estimation error" and how do you fix it?

The planner estimates how many rows each node will emit based on pg_statistics; if reality is 100× off, downstream choices (index vs seq, join algorithm, hash work_mem) cascade into bad plans. Causes: (1) **correlated predicates** — `WHERE city='NYC' AND state='NY'` is selectivity × selectivity by default, but in reality 100% overlap. Fix with `CREATE STATISTICS ON (city, state) FROM addresses;` (PG 10+ extended statistics). (2) **expression predicates** — `WHERE lower(email) = …` has no stats; create an expression index OR `CREATE STATISTICS … ON (lower(email)) FROM …`. (3) **stale stats** — `ANALYZE`. (4) **highly-skewed columns** — raise per-column `STATISTICS` from 100 to 1000.

### Q41. What does `pg_hint_plan` do and when would you use it?

`pg_hint_plan` is an extension that lets you embed planner hints in SQL comments (`/*+ IndexScan(table_alias index_name) */`) to force a specific scan, join order, or join method — like Oracle hints. It's an emergency stabiliser for queries where the planner reliably picks wrong despite good stats. Don't use it as a substitute for fixing root causes (missing indexes, stale stats, bad column correlation); use it when those fixes are blocked and you need predictable plans now. Vendors hate it; pragmatists ship it.

### Q42. Explain when a CTE will materialise and when it won't.

Before PG 12, CTEs were an "optimisation fence" — always materialised, plan choices in the outer query couldn't push predicates inside. From PG 12 the planner inlines non-recursive CTEs by default unless they're referenced more than once or marked `MATERIALIZED`. Use `WITH x AS NOT MATERIALIZED ( … )` to force inlining if needed; use `MATERIALIZED` to deliberately memoise an expensive sub-result. Common mistake on older Postgres: writing CTEs for readability and silently disabling planner optimisations.

---

## Indexing Strategy

### Q43. Walk me through the major index types in Postgres.

**B-tree**: default, ordered, supports `=`, `<`, `>`, `BETWEEN`, `IS NULL`, `ORDER BY`. **Hash**: equality only, smaller than B-tree, finally crash-safe in PG 10+; niche, rarely worth it. **GIN** (Generalized Inverted Index): for composite values — array containment, `jsonb` keys, full-text search; large indexes, slow to update. **GiST** (Generalized Search Tree): geometric, range types, full-text (older); supports KNN searches via `<->`. **SP-GiST**: space-partitioned GiST, good for non-balanced data like quad-trees or radix-style. **BRIN** (Block Range Index): tiny summary index per block range, only useful for naturally clustered data (timestamps on append-only tables). **Hash partitioning indexes** in PG 11+.

### Q44. When would you use a GIN index vs a B-tree?

GIN for set-like contents inside a column — `jsonb` containment (`WHERE doc @> '{...}'`), full-text search (`WHERE tsv @@ query`), trigram fuzzy text (`pg_trgm` + `WHERE name ILIKE '%foo%'`), array overlap (`WHERE tags && '{a,b}'`). B-tree for ordered comparisons on scalar columns. GIN is **slower to update** (writes go to a pending list flushed on vacuum) and **larger on disk**, so it shines for read-heavy / write-rare patterns. Don't reach for GIN on equality — B-tree wins on point lookups.

### Q45. What's a partial index and when is it a force-multiplier?

`CREATE INDEX idx ON orders (created_at) WHERE status = 'pending';` — only rows matching the predicate get indexed. Wins when the predicate is selective (10-20% or less of the table) and queries always include the same predicate. Massive savings on both index size and write cost (only updates touching matching rows hit the index). Classic application: a queue table where `WHERE status = 'pending' ORDER BY created_at` is the hot query — a partial B-tree on `(created_at) WHERE status='pending'` is a fraction the size of a full one and stays fast as the table grows.

### Q46. What's an expression index and what's the gotcha?

`CREATE INDEX idx ON users (lower(email));` indexes a computed value. Queries must use the **same expression** verbatim — `WHERE lower(email) = $1` hits the index; `WHERE email = $1` doesn't. The gotcha is **the planner has no statistics for the expression** — selectivity estimates default to magic numbers and join plans suffer. Fix from PG 10: `CREATE STATISTICS users_email_lower ON (lower(email)) FROM users;` then `ANALYZE`.

### Q47. What is a covering index ("INCLUDE") and what does it enable?

`CREATE INDEX idx ON orders (customer_id) INCLUDE (status, total);` — `customer_id` is in the key (used for ordering and equality), `status` and `total` are payload-only, stored on leaf pages but not used for ordering or uniqueness. Enables **index-only scans** — the query can be answered entirely from the index without touching the heap, as long as the matching pages are flagged all-visible in the VM. Lower update cost than putting `status` in the key (no re-ordering required), and a smaller index than wide composite keys.

### Q48. What's a multicolumn index and when does it help vs separate indexes?

`CREATE INDEX idx ON orders (customer_id, created_at);` is one B-tree sorted lexicographically: it can serve `WHERE customer_id = $1` *and* `WHERE customer_id = $1 ORDER BY created_at`, but **not** `WHERE created_at = $1` alone — that's a "left-prefix" rule. Separate indexes on each column let the planner combine them via `BitmapAnd`, useful when queries hit columns independently. Rule of thumb: multicolumn when the columns are always used together with the leading column; separate when usage is independent.

### Q49. What's a BRIN index and when is it the right call?

BRIN stores **one summary entry per range of heap blocks** (default 128 blocks) — min/max of the indexed column per range. Lookups read the summary, find ranges where the predicate *might* match, then scan those heap pages. Index size is ~0.01% of a B-tree but only works if the data is **naturally correlated with physical order** — usually a timestamp on an append-only events table. Useless on a table with random insert order or heavy updates. Tune with `pages_per_range = 32` for tighter blocks on smaller tables.

### Q50. How do you find unused or duplicate indexes?

`SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;` — indexes that have never been scanned (since the stats reset). Beware of indexes used to enforce constraints (PK, UK) — never drop those. For duplicates: `SELECT indrelid::regclass, array_agg(indexrelid::regclass), indkey FROM pg_index GROUP BY indrelid, indkey HAVING count(*) > 1;` — same column set indexed multiple times. Every unused index costs every write — drop them.

### Q51. What's the difference between `CREATE INDEX` and `CREATE INDEX CONCURRENTLY`?

Default `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock — blocks all writes (and on the index'd table, also blocks reads in many practical cases) — never use it on a production table. `CREATE INDEX CONCURRENTLY` does two passes over the table with a `ShareUpdateExclusive` lock (blocks DDL but allows DML), so writes continue throughout. It's slower (two scans) and can fail mid-way — leaving an **invalid index** (`SELECT indisvalid FROM pg_index WHERE …`) that you must drop and recreate. Always concurrent in prod.

### Q52. Senior interview angle: when do indexes *hurt*?

Every index multiplies write cost: each `INSERT` touches every index, each `UPDATE` that doesn't HOT-qualify touches every index, every `DELETE` touches every index, *and* the indexes themselves bloat just like heap. On write-heavy tables, the right number of indexes is **the smallest set that supports the read paths actually hot enough to need them**. A senior signal is being able to point at a fat index that's worth dropping — and to know the cost of a covering index in update overhead vs the read it enables.

---

## Transactions, Locking & Isolation

### Q53. What are the four SQL isolation levels and what does Postgres actually implement?

ANSI defines READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Postgres treats READ UNCOMMITTED as READ COMMITTED (no dirty reads ever — MVCC doesn't expose them). REPEATABLE READ in Postgres is actually **snapshot isolation** — stronger than ANSI's, but allows write skew. SERIALIZABLE uses **SSI (Serializable Snapshot Isolation)**: snapshot isolation plus predicate-locking and dependency tracking; if it detects a serialization anomaly it rolls back one transaction with `40001 serialization_failure`. So Postgres effectively has READ COMMITTED, REPEATABLE READ (snapshot), and SERIALIZABLE.

### Q54. What's the difference between `SELECT FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, and `FOR KEY SHARE`?

Row-level lock strengths: `FOR UPDATE` (strongest — blocks every other lock kind on the row), `FOR NO KEY UPDATE` (blocks `FOR UPDATE` but not `FOR KEY SHARE` — used internally by `UPDATE` when no PK/unique column is touched), `FOR SHARE` (multiple concurrent shares OK, blocks `FOR UPDATE` and writes), `FOR KEY SHARE` (allows non-key updates on the same row — what FK enforcement uses). Picking the weakest sufficient lock is the difference between "occasional waits" and "every FK check serialises".

### Q55. What does `SELECT … FOR UPDATE SKIP LOCKED` enable?

A canonical queue-table pattern: workers pop the next job by `SELECT … FROM jobs WHERE status = 'pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`. Each worker gets a different unblocked row instead of stacking up behind the first locker. Combined with a partial index on `(created_at) WHERE status = 'pending'` and an `UPDATE … SET status = 'running'`, it's a production-grade FIFO queue. Pre-PG 9.5 alternative was advisory locks; SKIP LOCKED is dramatically simpler and faster.

### Q56. Why is `SELECT FOR UPDATE` outside a transaction useless?

Row locks are released at transaction end. Without `BEGIN; … COMMIT;` (or `BEGIN; … ROLLBACK;`) wrapping the read and the subsequent dependent write, the lock is dropped immediately and a concurrent transaction can race. The "got a row, modified it elsewhere, wrote it back" pattern needs an explicit transaction so the row stays locked between read and write.

### Q57. What's the difference between `pg_advisory_lock`, `pg_advisory_xact_lock`, and `pg_try_advisory_lock`?

Application-level locks (Postgres doesn't enforce semantics — you do). `pg_advisory_lock(key)` blocks until the lock's free, held until session ends or you `unlock`. `pg_advisory_xact_lock(key)` held until transaction ends — almost always what you want. `pg_try_advisory_lock` returns false immediately if taken — used for "one runner only" patterns where you want to skip rather than wait. Use them for cron-style "only one worker runs this job", not as a substitute for row locks (no MVCC semantics, no automatic rollback).

### Q58. What's a deadlock in Postgres and how does it resolve?

A cycle of waits: A holds row 1 waiting for row 2; B holds row 2 waiting for row 1. Postgres detects cycles via a periodic deadlock check (`deadlock_timeout`, default 1s) and **aborts one transaction with 40P01 deadlock_detected**. Common pattern: two upserts touching the same rows in different orders. Fix at the app level by always locking in a consistent order (e.g., by id ascending), or use `SELECT FOR UPDATE` to lock everything you'll need upfront in one shot.

### Q59. What's the difference between `READ COMMITTED` and `REPEATABLE READ` in practice?

`READ COMMITTED` (default): every statement gets a fresh snapshot, so two `SELECT`s in the same transaction can see different committed states. `REPEATABLE READ`: snapshot taken at the first statement, held for the whole transaction — every read sees the same world. But REPEATABLE READ can fail with `40001 could not serialize access` if a row was modified by a concurrent transaction the planner can't safely ignore. Use READ COMMITTED for short OLTP, REPEATABLE READ for reports needing internal consistency, SERIALIZABLE when invariants span multiple rows (e.g., balance sheet sum must equal zero).

### Q60. What's "write skew" and why does snapshot isolation allow it?

Two transactions each read overlapping data, then write *different* rows — neither writes the data the other read, so snapshot isolation sees no conflict. Classic example: two doctors checking that at least one is on-call. Both read "two on-call doctors", both write themselves to off-call. After both commit: zero on-call. Snapshot isolation allows this because it only checks **modified rows** for conflicts, not the predicate that made the decision. SERIALIZABLE (SSI) catches it via predicate locking — and rolls one back.

### Q61. Senior interview angle: investigating "table is locked" in production.

`SELECT * FROM pg_locks JOIN pg_stat_activity USING (pid) WHERE NOT granted;` — pending lock requests and the queries waiting. Cross-reference with `pg_blocking_pids(pid)` (PG 9.6+) to find who's blocking. Common findings: an idle-in-transaction client holding `RowExclusiveLock`, a `CREATE INDEX` (non-concurrent) holding `ShareLock` on the whole table, an unindexed FK update doing a serial table-lock, or `VACUUM FULL` running on a not-as-quiet-as-you-thought table. Kill via `pg_cancel_backend(pid)` (graceful) or `pg_terminate_backend(pid)` (SIGTERM).

---

## JSON & JSONB

### Q62. JSON vs JSONB — and when would you ever use plain JSON?

`json` stores the original text, including whitespace and duplicate keys, parsed on every operation. `jsonb` parses once into a binary format, deduplicates keys, sorts them, supports indexes and operators. **Use `jsonb` 99% of the time**. The 1% case for `json` is preserving exact input — webhook payloads kept for audit, or APIs that contract on key order. Otherwise `jsonb` is faster, indexable, and supports `@>` containment, `?` key existence, and `jsonb_path_query` (SQL/JSON path).

### Q63. How do you index a `jsonb` column?

`CREATE INDEX … USING gin (doc);` — default opclass `jsonb_ops` supports `@>`, `?`, `?&`, `?|`. Or `USING gin (doc jsonb_path_ops)` — smaller, faster, but **only** supports `@>`. For predicates that hit one specific key path, an **expression index** on `(doc->>'status')` is much smaller than a full GIN index. The pattern is: GIN for ad-hoc containment queries; B-tree-on-expression for known-shape predicates.

### Q64. What does `@>` mean and how does it differ from `?`?

`@>` is **containment**: `'{"a":1,"b":2}'::jsonb @> '{"a":1}'` is true. `?` is **key existence at the top level**: `'{"a":1}'::jsonb ? 'a'` is true. `@@` is **JSON path predicate** (PG 12+): `'$.a > 1'`. `->` returns a JSON value; `->>` returns text. Mix-up that bites: `WHERE doc->>'a' = '1'` (text comparison, no GIN index for plain `doc`) vs `WHERE doc @> '{"a":1}'` (containment, GIN-indexable).

### Q65. When should `jsonb` *not* be your schema choice?

When the fields are well-known and queried — that's a relational schema. Reasons `jsonb` hurts: (1) no per-field types/constraints, (2) every read of one field decodes the whole document, (3) no statistics on nested keys so the planner guesses, (4) large `jsonb` triggers TOAST per row, (5) updating one key rewrites the whole row. Use `jsonb` for genuinely sparse or schemaless data (user prefs, integrations, audit blobs) — promote frequently-queried keys to real columns when patterns stabilise.

### Q66. What's `jsonb_path_query` and why does it matter?

PG 12 added SQL/JSON path support: `jsonb_path_query(doc, '$.users[*] ? (@.age > 30).name')` — a proper query language for nested JSON. Replaces awkward chains of `->` and `->>`. Tied to the `@@` operator for predicates and `@?` for existence. Useful when the data shape is genuinely nested arrays of objects; for shallow structures, plain operators are simpler. Doesn't make GIN indexes magically apply to all path queries — selective use of expression indexes is still needed.

---

## Full-Text Search

### Q67. How does Postgres full-text search work, at a high level?

Convert documents to **`tsvector`** (a sorted list of lexemes with positions) via a text search configuration (defaults: language stemming + stopword removal + lowercasing). Convert queries to **`tsquery`** (boolean expression of lexemes). Match with `@@`: `tsv @@ to_tsquery('english', 'cat & dog')`. Index `tsvector` with GIN for fast lookup. Phrase queries via `<->` distance operator. Rank with `ts_rank` or `ts_rank_cd`.

### Q68. Should you store the `tsvector` as a column or compute it at query time?

Storing it as a generated column (`GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED`) is the production pattern — write-once, indexable, queries don't recompute. Computing at query time forces a CPU spike per row and means no GIN index can apply. PG 12+ has stored generated columns built-in; older versions used a trigger. The size cost is roughly 30-50% of the source text — typically tolerable.

### Q69. When should you reach for `pg_trgm` instead of FTS?

`pg_trgm` indexes character-trigrams for **fuzzy substring matching** — `ILIKE '%foo%'`, similarity search, typo tolerance. Use it for autocomplete and "find by partial name"; FTS is wrong because it requires whole-word matches. Combine with a GIN index: `CREATE INDEX ON people USING gin (name gin_trgm_ops);` — turns `WHERE name ILIKE '%bob%'` from full-table-scan to indexed. Slower writes than B-tree, but transformative for search UX.

### Q70. What's the difference between `to_tsquery`, `plainto_tsquery`, and `websearch_to_tsquery`?

`to_tsquery` requires a properly-formatted query (`'foo & bar'`), throws on user input with parser errors. `plainto_tsquery` accepts plain text and AND-s all words — safe but limited. `websearch_to_tsquery` (PG 11+) accepts Google-style syntax: `"exact phrase" OR foo -bar` — the right choice for user-facing search boxes. Always use one of the plain/websearch variants for user input; never feed user text into `to_tsquery` directly.

---

## Partitioning

### Q71. What kinds of partitioning does Postgres support, and when do you use each?

**Range** partitioning by a column value range — events by month, orders by year. **List** partitioning by enumerated values — orders by region, users by tier. **Hash** partitioning by hash of a column — even spread when no natural range/list exists; PG 11+. Range is the workhorse for time-series. List for geographic / multi-tenant. Hash for sharding-style spread.

### Q72. What's "partition pruning" and when does it apply?

The planner skips partitions whose constraints can't satisfy the query predicate — `WHERE created_at >= '2026-01-01'` on a monthly-partitioned table only scans the matching months. **Compile-time pruning** uses constants in the query; **runtime pruning** (PG 11+) handles parameters and joins. Won't apply if the predicate uses functions the planner can't trace (`WHERE date(created_at) = …`) or if column types don't match the partition key. Always test with `EXPLAIN (ANALYZE, COSTS OFF, BUFFERS)` to confirm only the expected partitions are touched.

### Q73. What's the difference between partitioning by range and by list, in operational terms?

Range: easy to add new partitions (`CREATE TABLE ... PARTITION OF events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01')`); rollover via cron. Detaching old partitions is `O(1)` — instant archival of historical data. List: partition set is essentially fixed; adding a new list value means adding a partition. The killer feature of both: **dropping a partition is metadata-only**, not a slow `DELETE`, which is why partitioning by retention boundary (month/quarter) is the canonical archival pattern.

### Q74. What are the gotchas with partitioned tables?

(1) **No global indexes** — each partition has its own indexes; uniqueness on a non-partition-key column isn't enforceable across partitions. (2) **Plan time** scales with partition count — 1000+ partitions slows planning measurably; raise `partition_pruning` works but plan time is real. (3) **Foreign keys** *into* a partitioned table work; FKs *from* a partitioned table to a non-partitioned table work since PG 12. (4) `INSERT` into the wrong partition routes correctly but `UPDATE` that moves rows across partitions was only added in PG 11.

### Q75. Senior angle: when do you partition vs when do you just index?

Partition when the table is large enough that operations on a slice need to be fast or independent — typically 100s of GB+. Three real wins partition gives that indexes can't: (1) **dropping a partition** is metadata-only vs `DELETE` + `VACUUM` of the heap, (2) **vacuum runs per partition** in parallel, fixing the "vacuum-this-2TB-table-takes-12-hours" pathology, (3) **partition-wise joins** (PG 11+) can parallelise across partitions when both joined tables share the partition key. Below ~100 GB, a good index strategy beats partitioning's complexity.

---

## Replication & High Availability

### Q76. Streaming vs logical replication — when do you choose which?

**Streaming (physical) replication** ships raw WAL byte-for-byte; replica is an exact binary copy of the primary, including system catalogs. Use for HA failover, read scaling, and offloading backups. Limitations: must be same major version, can't replicate selectively, can't write on the replica. **Logical replication** decodes WAL into row-level changes per table/database; subscribers can be different major versions, selective tables, even other DBMSes via plugins. Use for major-version upgrades with near-zero downtime, cross-region CDC, and selective sync. Slower throughput, no DDL replication, no sequence sync.

### Q77. What's a replication slot and why might it kill your primary?

A **replication slot** records the LSN up to which a replica or logical consumer has consumed — and Postgres won't recycle WAL beyond that LSN. If the consumer disappears (network partition, crashed subscriber), the slot becomes a leak: WAL accumulates indefinitely until the disk fills and Postgres goes read-only. Logical slots additionally pin `xmin`, so dead tuples can't be vacuumed either. Monitor `pg_replication_slots.confirmed_flush_lsn` lag against `pg_current_wal_lsn()`; drop orphaned slots before disk fills.

### Q78. What's the difference between synchronous and asynchronous replication?

**Asynchronous** (default): primary commits, returns to client, replicates WAL in the background. Lag can be milliseconds to minutes; failover loses uncommitted tail. **Synchronous**: configured via `synchronous_standby_names` and `synchronous_commit = on/remote_write/remote_apply`. Primary waits for the chosen replica(s) to receive (or apply) WAL before returning commit. Trade-off: a slow or down sync replica blocks every commit. Production pattern: `ANY 1 (s1, s2, s3)` (any one of three standbys) so a single failure doesn't stall writes.

### Q79. Hot standby vs warm standby?

**Warm standby**: replica replays WAL but accepts no connections. **Hot standby**: replica replays WAL and serves read-only queries — the modern default. Hot standby has a tension: queries on the replica can hold snapshots that conflict with WAL records that want to vacuum the same tuples. Postgres resolves this by either cancelling the query (`max_standby_streaming_delay`, default 30s) or pausing WAL replay; you tune the balance. Use `hot_standby_feedback = on` to let replicas push their `xmin` to the primary so vacuum delays for them — but watch primary bloat.

### Q80. Walk me through a failover.

In a managed environment (RDS, Patroni, repmgr, Cloud SQL): (1) detect primary failure via missed heartbeats, (2) elect a new primary from the replicas, prefer the one with the highest replay LSN, (3) **fence** the old primary so it can't come back as a primary (split-brain prevention), (4) `pg_promote()` on the chosen replica, (5) reconfigure remaining replicas to follow the new primary, (6) update DNS / virtual IP / connection string. The tricky steps are fencing and follower reconfiguration; the rest is mechanical. Practice failover regularly — production failover #1 should not be the rehearsal.

### Q81. What's the relationship between WAL volume and replica lag?

Replica lag scales with WAL generation rate ÷ replica replay rate. Replay is single-threaded historically (parallel apply is improving in PG 16+); a primary that bursts WAL during a `VACUUM` or bulk import can outpace replay. Monitor `pg_stat_replication.replay_lag` (time-based, PG 10+). Causes of replay falling behind: (1) replica disk slower than primary, (2) heavy read queries on the replica blocking WAL apply via `max_standby_streaming_delay`, (3) recovery conflict on locks. Fix order: faster replica disk → `hot_standby_feedback = on` for read replicas → don't replicate WAL-heavy maintenance to read replicas (use a dedicated maintenance replica).

### Q82. Senior angle: failure modes of synchronous replication.

(1) **Sync replica down**: every commit on the primary blocks forever — use `ANY 1 (...)` or `synchronous_commit = local` for hot-path writes that can tolerate async. (2) **WAL fills disk on primary** because the standby is slow/disconnected and the slot pins WAL — monitor `pg_replication_slots`. (3) **Quorum confusion**: with `FIRST 2 (s1, s2)` if s1 is down, commits wait on s2; misconfigured `synchronous_standby_names` reorders priority unexpectedly. (4) **Cross-region latency**: a sync replica across an Atlantic hop adds ~80ms per commit; few apps can absorb that without throughput dropping by orders of magnitude.

---

## Backup & Disaster Recovery

### Q83. `pg_dump` vs `pg_basebackup` — when do you use which?

`pg_dump` is **logical**: emits SQL (`pg_dump`) or a custom archive (`-Fc`) that recreates the schema and data via INSERT/COPY on restore. Works across major versions, slow on large databases, **doesn't capture WAL** so it's a point-in-time snapshot only. Best for migrations and small/medium DBs. `pg_basebackup` is **physical**: a file-level copy of the cluster, captures WAL during the copy, and is the foundation for streaming replicas and PITR. Required for any database large enough that `pg_dump`/`pg_restore` takes too long.

### Q84. What's PITR and how does it work?

**Point-in-time recovery**: restore a base backup, then replay archived WAL up to a specific moment (`recovery_target_time = '2026-05-15 14:23:00'`). Requires you to be **continuously archiving WAL** (`archive_mode = on`, `archive_command = '...'`) somewhere durable. Recovery flow: copy base backup to `$PGDATA` → drop a `recovery.signal` file (PG 12+ — used to be `recovery.conf`) → configure `restore_command` → start Postgres → it pulls WAL via `restore_command` and stops at the recovery target. Practice it; nobody's "tested" their PITR until they've done it on a Saturday.

### Q85. What's the relationship between `archive_command`, `archive_mode`, and `wal_keep_size`?

`archive_mode = on` enables WAL archiving; the `archiver` process runs `archive_command` (a shell command, e.g. `cp` to NFS or `aws s3 cp`) for each completed segment. **The command must exit 0 only on durable success** — Postgres doesn't recycle the segment until success, so a flaky command piles up WAL on the primary. `wal_keep_size` (PG 13+; was `wal_keep_segments`) keeps recent WAL on the primary for **replicas to fetch** without needing `archive_command`. Use both for belt-and-braces: archive for DR, `wal_keep_size` for replica reconnect.

### Q86. What's the difference between PITR and a logical dump for recovery?

PITR recovers to a **specific LSN/time**, the whole cluster, exactly as it was. Useful for "undo the bad migration that ran at 14:23". A logical dump only captures the moment of the dump and restores via SQL — no point-in-time choice. PITR is faster for large DBs (file copy + WAL replay vs row-by-row INSERT) but recovers the entire cluster (can't selectively restore one table without extra ceremony). For per-table restores, the modern answer is `pg_restore -t table_name backup.dump` on a logical dump or `pg_dumpall --binary-upgrade` for major-version paths.

### Q87. What does `pgBackRest` give you that `pg_basebackup` doesn't?

Parallel backup/restore, incremental and differential backups, delta restore (only changed pages), compression, encryption, retention policies, point-in-time recovery automation, S3-native support. `pg_basebackup` is one full backup at a time; for a TB+ database, `pgBackRest` (or `barman`, `wal-g`) is what teams actually run in production. They all use `pg_basebackup`-equivalent mechanisms (calling `pg_backup_start`/`pg_backup_stop`) under the hood — the value is in the workflow around backups, not the bytes-on-disk step.

---

## Connection Management & Pooling

### Q88. Why does every production Postgres deployment have a connection pooler?

Each Postgres connection is a forked OS process holding ~10 MB and competing for CPU on every backend wake. Apps want thousands of connections (one per worker, one per HTTP handler, etc.); Postgres performs best at 50-200 connections. A pooler bridges that — apps connect to PgBouncer/PgCat cheaply, PgBouncer maps active sessions onto a small Postgres backend pool, idle apps consume no Postgres resources. Without a pooler, raising `max_connections` past 500 is a slow-motion outage waiting for traffic.

### Q89. What's the difference between session, transaction, and statement pooling in PgBouncer?

**Session pooling**: a client holds a backend for its entire session. Equivalent to no pooling except for connection setup amortisation; preserves *all* server-side state (prepared statements, `SET`, `LISTEN`, advisory locks). **Transaction pooling**: backend assigned per transaction; the workhorse mode. Most app frameworks work, but **no server-side state survives across transactions** — prepared statements, advisory locks, `SET LOCAL`, `LISTEN`/`NOTIFY` break. **Statement pooling**: backend assigned per query; only `SELECT` workloads where you don't even use transactions; rare.

### Q90. Prepared statements in PgBouncer — what breaks and what fixes it?

Pre-Postgres 17, named prepared statements lived on a specific backend; with PgBouncer transaction-pooling, the next transaction might land on a different backend that's never seen the statement → `prepared statement "S_1" does not exist`. Workarounds: disable named prepared statements in your driver (often a `prepareThreshold = 0` or `statement_cache_size = 0`); use protocol-level unnamed statements; or upgrade to PG 17 which added **server-side preparation that survives pooling** via a protocol extension PgBouncer 1.21+ supports. Same problem applies to PostGIS regprefix and any session-local server state.

### Q91. How do you size a connection pool?

Start with `pool_size = (CPU_count × 2)` to `(CPU_count × 4)` per Postgres backend pool. App-side: as many client-side connections as your concurrency level supports. The math: if you have 8 CPUs, a backend pool of 32-64 is plenty for OLTP. Higher pools add contention without throughput. Watch `pg_stat_activity` for `state = 'idle in transaction'` — those are pool-trapped backends doing nothing useful, often from app frameworks that leak transactions; that's a code bug, not a pool-size bug.

### Q92. Senior angle: how would you debug "we're getting too many connections" errors?

`SELECT state, count(*) FROM pg_stat_activity GROUP BY state;` — distinguish active, idle, idle-in-transaction. High `active` = legitimate concurrency; raise pool or scale up. High `idle in transaction` = app leaking transactions; fix the app, not the DB. High `idle` past `idle_session_timeout` = drop the pooler's pool size or reduce app concurrency. Watch `pg_stat_database.numbackends` over time — a step-function jump means a deploy introduced a leak; a gradual climb is real user growth.

---

## Schema Design & Data Types

### Q93. `int` vs `bigint` vs `uuid` for primary keys — what's the call?

`int` (4-byte): 2 billion max; fine for tables you're confident will never reach that. `bigint` (8-byte): 9 quintillion; default for anything user-facing. `uuid` (16-byte): no central sequence, generatable client-side, but **random UUIDv4 destroys B-tree locality** — every insert hits a random page, killing cache hit rates and bloating indexes. Use **UUIDv7** (PG 17+ generators or app-side) which is sortable by time and preserves locality. For high-throughput tables, `bigint` + a `Snowflake`-like generator beats UUID on index size and write amplification.

### Q94. `varchar(n)` vs `text` — which should you reach for?

`text` is the default. `varchar(n)` adds a length check (`check (length(col) <= n)`) but stores identically. Use `varchar(n)` *only* when there's a domain constraint you want enforced — e.g. ISO country code `varchar(2)`. For arbitrary user input, `text` + an explicit application-level limit is more flexible (changing `varchar(255)` to `varchar(1000)` is a `ALTER TABLE` that's near-instant on PG 9.2+, but still a DDL).

### Q95. `timestamp` vs `timestamptz` — which and why?

**Always `timestamptz`** for any time you care about. Both store 8 bytes; the difference is interpretation: `timestamp` is a naive wall clock (no time zone), `timestamptz` is stored in UTC and converted to/from the session's `TIMEZONE` setting on read/write. `timestamp` is correct for things like "the wall clock at the user's location at the moment of an event" — but mixing it with `timestamptz` in arithmetic is the source of half of all "the times are wrong" bugs.

### Q96. When should you use `numeric` vs `float8`?

`numeric` (`decimal`): arbitrary precision, slow, large storage, **exact arithmetic** — required for currency, accounting, anywhere `0.1 + 0.2 == 0.3` must be true. `float8` (`double precision`): IEEE 754 double, fast, 8 bytes — for science, engineering, ML features where approximation is fine. Never store currency as `float8` — you'll explain to compliance why a balance is `$0.30000000000000004`.

### Q97. What does `GENERATED ALWAYS AS … STORED` give you vs a trigger?

PG 12+ generated columns are declarative: `col GENERATED ALWAYS AS (a + b) STORED` — Postgres maintains it automatically, can be indexed, can't be written directly. Compared to a `BEFORE INSERT OR UPDATE` trigger: less code, no PL/pgSQL overhead per row, automatic in `COPY` paths, and the constraint is enforced at the catalog level. The limitation: only `STORED` is supported, not virtual computed columns; and the expression can't reference other tables.

### Q98. Senior angle: what's your default schema for an event-sourced events table?

```sql
CREATE TABLE events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aggregate_id uuid NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (occurred_at);

CREATE INDEX events_aggregate_idx ON events (aggregate_id, occurred_at);
CREATE INDEX events_type_idx      ON events (type, occurred_at);
```

Range partitioning on `occurred_at` (monthly) enables painless retention via `DETACH PARTITION`. `bigint` PK + `uuid` aggregate id covers both fast inserts and stable external references. `jsonb` payload is the right call for evolving schemas. The composite indexes match the two hot read patterns (per-aggregate timeline, per-type recent).

---

## Advanced SQL Features

### Q99. What's a window function and what would I use one for?

A function that operates over a "window" of rows related to the current row, without collapsing them like a `GROUP BY`. `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC)` numbers each user's events from latest. `LAG(price) OVER (ORDER BY ts)` gets the previous row's price for diff calculations. Use them for ranking ("top 3 per category"), running totals (`SUM(...) OVER (ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`), deduplication ("first row per key"), and gap-and-island problems. Vastly cleaner than the self-join alternatives.

### Q100. What's a LATERAL join and when does it earn its keep?

`SELECT … FROM a, LATERAL (SELECT … FROM b WHERE b.x = a.x LIMIT N) sub` — the subquery can reference columns of the table to its left, evaluated per outer row. The "top N per group" pattern: get the 3 most recent orders per customer in one query without a correlated subquery in `SELECT`. Also useful for unnesting JSON arrays per row, or expensive computed columns. The planner can sometimes inline LATERAL into a nested loop with index lookup — very efficient compared to the equivalent window-function approach for small N.

### Q101. What's the difference between `UNION` and `UNION ALL`, and why does it matter?

`UNION` removes duplicates — implemented as a sort or hash-distinct after concatenation, expensive. `UNION ALL` concatenates verbatim — free except for the I/O. **`UNION ALL` whenever you know the inputs are disjoint** (different partitions, different filters that don't overlap, different tables with disjoint key spaces). The accidental `UNION` is one of the easiest perf bugs to introduce; in code reviews, default to `UNION ALL` and only "upgrade" when dedup is actually required.

### Q102. What's a recursive CTE and a real use case?

`WITH RECURSIVE x AS (anchor UNION ALL recursive_step REFERENCES x)` — Postgres iterates until the recursive step returns no rows. Canonical use: walking a tree/graph — organisational hierarchy from any employee up to the CEO, or thread of replies in a forum. Recursive CTE for graph traversal can outperform application-side joins by orders of magnitude. Guard against runaway recursion with `LIMIT` inside the recursive step or a depth column with `WHERE depth < 100`.

### Q103. What's `INSERT … ON CONFLICT … DO UPDATE` and what's the gotcha?

Postgres's UPSERT. `INSERT INTO users (id, name) VALUES (1, 'A') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;` — `EXCLUDED` refers to the row that *would have been inserted*. The gotcha is the conflict target: it must match a unique constraint or unique index. Soft-conflict logic ("upsert if email matches case-insensitively") needs an expression unique index: `CREATE UNIQUE INDEX ON users (lower(email))`, then `ON CONFLICT (lower(email))`. Avoid the older `INSERT ... WHERE NOT EXISTS` pattern — race-condition unsafe.

---

## Monitoring, Diagnostics & Extensions

### Q104. What's `pg_stat_statements` and why is it the first extension you install?

It tracks aggregate execution stats per query template (normalised — literals replaced by placeholders): call count, total time, mean time, rows, shared buffer hits/reads. `SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;` reveals your worst queries instantly. Without it, you're guessing what's slow. Set `pg_stat_statements.max = 10000`, `pg_stat_statements.track = top` in `postgresql.conf`. Reset with `pg_stat_statements_reset()` after deploys to measure incremental impact.

### Q105. What's in `pg_stat_activity` and what do you watch?

Per-backend row: pid, user, app name, client address, **state** (active/idle/idle in transaction/disabled), **query** (current or last), `query_start`, `xact_start`, `wait_event_type`, `wait_event`, `backend_xmin`. The hot triages: `state = 'idle in transaction'` (apps leaking transactions), `wait_event = 'Lock'` (blocked on something), `xact_start` very old (the snapshot blocking vacuum), `query` containing autovacuum (ongoing vacuum + table). Combined with `pg_blocking_pids(pid)` it's 80% of production debugging.

### Q106. What does `pg_stat_io` give you that older stats didn't?

PG 16+ added per-backend-type, per-relation-type breakdowns of read/write/extend/fsync counts and timings. Before `pg_stat_io`, you could see global I/O (`pg_stat_bgwriter`) and per-table (`pg_statio_user_tables`) but couldn't tell whether autovacuum, checkpointer, or regular backends were doing the I/O. Now you can. The diagnostic value: "is my checkpointer storm vacuum-driven, query-driven, or normal?" — `pg_stat_io` finally answers cleanly.

### Q107. Senior angle: which extensions should be in every production deployment?

`pg_stat_statements` (above), `pg_buffercache` (inspect shared_buffers contents — what's hot vs evicted), `pgcrypto` (hashing without sending to app layer), `pg_trgm` (fuzzy text search), `btree_gin` / `btree_gist` (composite indexes mixing column types), `pg_repack` (online table rewrite for bloat), `auto_explain` (log slow query plans automatically). Optional but common: `pgaudit` (compliance auditing), `pglogical` (logical replication superset), `timescaledb` (time-series extension), `pgvector` (vector embeddings for AI).

### Q108. What does `auto_explain` do and how do you tune it?

Logs the `EXPLAIN ANALYZE` plan of any query exceeding `auto_explain.log_min_duration` (in ms). Set conservatively to start: `auto_explain.log_min_duration = '1s'` — captures only obvious problems without log spam. Add `log_analyze = on, log_buffers = on, log_timing = on, log_triggers = on` for full detail. The cost is measurable on hot paths (`EXPLAIN ANALYZE` overhead is ~5-10%) — use `log_analyze = off` and just log the plan structure if you only need to know which plans were chosen.

---

## Postgres 17 / 18 Specifics

### Q109. What's the biggest thing PG 17 brought?

(1) **Significantly faster `VACUUM`** thanks to a new dead-tuple data structure (TID store), reducing memory use and improving large-table vacuum time by often 5-10×. (2) **MERGE … RETURNING** completes the MERGE story from PG 15. (3) **Streaming I/O subsystem** (foundation; mostly used by `pg_basebackup` and read paths). (4) **Logical replication failover support** — slots are synchronised to physical replicas so subscriber state survives primary failover. (5) Several protocol-level improvements that PgBouncer 1.21+ uses for prepared statements across pooling.

### Q110. What changed in PG 18 (Sept 2025)?

(1) **Async I/O (AIO)** for read paths — `io_method = worker` or `io_uring` on Linux, dramatic gains on read-heavy workloads where the storage layer has parallelism to exploit. (2) **UUIDv7** generation built-in (`uuidv7()`), so time-sortable UUIDs without app-side libraries — fixes UUID-as-PK index locality at the language level. (3) **Skip-scan B-tree** for multi-column indexes where the leading column has few distinct values — index works for predicates that previously couldn't use it. (4) **OAuth 2 authentication** via the new `oauth` auth method.

### Q111. Should I upgrade from PG 14 to 17 or 18?

PG 14 is in support but ancient by today's perf standards — 17 is the safe LTS-style choice (proven for a year, most extensions support it). 18 is the newest but extensions and managed providers take 6-12 months to fully validate. The upgrade path: `pg_upgrade` for binary in-place (fast, ~minutes for TBs), or **logical replication** from 14 → 17 for near-zero downtime (set up a 17 subscriber, switch traffic, drop 14). Don't run `pg_dump` + `pg_restore` for anything > ~50 GB.

### Q112. Senior angle — what's the biggest perf-tuning shift in modern Postgres?

The **vacuum bottleneck has been substantially eased** between PG 14 → 17. The old playbook of "set `autovacuum_vacuum_scale_factor = 0.02` and raise `autovacuum_max_workers` to 8 and hope" is replaced on PG 17 with "tune `autovacuum_naptime` to 10s, raise `maintenance_work_mem` to 1-2 GB so the new TID store doesn't spill, and watch vacuum complete in minutes instead of hours". This is the largest single operational improvement the project has shipped in years. Anyone interviewing senior on Postgres in 2026 should know it.

---

*End of primer. The list isn't exhaustive — partitioned-join tuning, pg_stat_progress_*, BRIN multi-minmax (PG 14+), heap_pgnow_progress, and dozens of niche topics live in the vault's [[Postgres PATH]] note. But these 112 questions cover ~90% of what senior backend Postgres interviews actually probe.*
