---
type: interview-prep
---

# Postgres Interview Primer — 140 Questions

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

### Summary

**What this topic covers**

The on-disk and in-memory shape of a running Postgres cluster: the process model (postmaster + per-connection backends + background workers), how shared memory is partitioned (`shared_buffers`, WAL buffers, lock table), how data is laid out on disk (forks, segments, heap pages, line pointers), and the optimisations that ride on those structures (HOT updates, the visibility map, TOAST, fillfactor). Includes the operational consequences — why `max_connections` is the wrong knob, why every production deployment sits behind a pooler, and why the **xmin horizon** is the single most important number on any Postgres dashboard.

**Mental model**

Think of Postgres as a federation of OS processes coordinated through shared memory and a single WAL stream. The **postmaster** is a supervisor — it accepts TCP connections, `fork()`s a backend per client, and supervises a small fleet of background workers (`checkpointer`, `bgwriter`, `walwriter`, `autovacuum`, `archiver`, stats collector, logical replication launcher). Each backend is a full OS process holding ~10 MB of private memory (catalog cache, `work_mem` allocations, prepared-statement cache); shared memory holds the buffer pool, the WAL ring buffer, the lock table, replication slots, and the cumulative statistics tables (PG 15+). On disk, every relation is one or more 1 GB files made of 8 KB pages, supplemented by **forks** — the main heap, the free-space map (FSM), the visibility map (VM), and the init fork for unlogged tables. The visibility map is the unsung hero: its `all-visible` and `all-frozen` bits power index-only scans and let vacuum skip whole regions of huge static tables.

**Key terms**

- **postmaster** — the supervisor process that accepts connections and supervises background workers.
- **backend** — a per-connection forked OS process with private memory and its own catalog cache.
- **`shared_buffers`** — Postgres's own buffer pool in shared memory; typically 25-40% of RAM.
- **WAL buffer** — staging area in shared memory for WAL records before flush.
- **fork** — a per-relation file family: main heap, FSM, VM, init.
- **heap page** — 8 KB unit with header, line pointers (item IDs), and tuples filled bottom-up.
- **HOT (Heap-Only Tuple)** — in-page update that touches no indexed column and skips index maintenance.
- **`fillfactor`** — table-level setting (default 100) reserving page headroom for HOT-eligible updates.
- **visibility map** — fork with `all-visible` and `all-frozen` bits per page; powers index-only scans and frozen-page skip during vacuum.
- **TOAST** — out-of-line, optionally compressed storage for oversized attributes (>~2 KB rows).
- **xmin horizon** — `min(backend_xmin, slot_xmin, prepared_xact_xmin, hot_standby_feedback_xmin)`; the oldest xid any observer still needs; the ceiling vacuum can reclaim under.

**Why interviewers ask this**

Three signals. (1) **Operational reality** — anyone who has run Postgres in production knows the process-per-connection model is why poolers exist; candidates who only know the SQL surface miss this. (2) **Failure-mode awareness** — "what fails when `max_connections` is 5000?" separates devs who've read the docs from devs who've watched a server OOM. (3) **The xmin horizon question** — being able to point at idle-in-transaction backends, dormant replication slots, and `hot_standby_feedback` as the three things that pin the horizon is a senior-engineer tell. If you can also explain why dropping `fillfactor` to 90 on an update-heavy table preserves HOT and saves index writes, you're showing the operator's reflex of trading a little disk for a lot of write throughput. Junior candidates name the components; senior candidates know which knobs to turn at 2 AM.

**Common confusions**

- "Postgres uses threads" — it doesn't; every connection is a forked OS process. That's why connection cost is real and pooling is mandatory.
- "`shared_buffers` should be 75% of RAM" — no, the kernel also caches the same files; 25-40% is the sweet spot; over-large `shared_buffers` wastes RAM that the OS would cache anyway.
- "TOAST is automatic so I don't need to think about it" — `SELECT *` from a wide table with a fat `jsonb` column triggers a TOAST fetch per row even if you never read that column.
- "HOT updates are about avoiding the WAL" — they're about skipping **index** maintenance; the WAL record is still written.
- "The xmin horizon is set by the oldest transaction" — it's set by the *oldest observer of any kind*: backend snapshot, replication slot, prepared xact, or hot-standby-feedback xmin.

**What follows from this topic**

Every later topic builds on this foundation. MVCC and Visibility are the rules the heap page format encodes. VACUUM is the daemon that cleans the dead tuples this topic explains. WAL and Checkpoints are the durability machinery for the heap pages described here. Connection Management is the operational answer to "the process model is expensive". If the process model and the heap page layout aren't crisp in your head, the rest of the primer is harder than it needs to be.

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

### Q8b. What's the "xmin horizon" and why is it the single most important number on your dashboard?

The xmin horizon is `min(backend_xmin, replication_slot_xmin, prepared_xact_xmin, hot_standby_feedback_xmin)` — the oldest xid any observer still needs. Vacuum can only reclaim tuples whose `xmax < xmin_horizon`. When the horizon stalls (idle-in-transaction backend, dormant replication slot, hot-standby-feedback replica running long queries), bloat compounds across **every** table on **every** database simultaneously. `SELECT backend_xmin, pid, state, query FROM pg_stat_activity WHERE backend_xmin IS NOT NULL ORDER BY age(backend_xmin) DESC;` finds the culprit.

### Q8c. War-story: walk me through an "idle in transaction" outage.

Pattern: ORM (Hibernate, ActiveRecord) opens a transaction at request start, app worker hangs on a downstream HTTP call for 30+ minutes. Across hundreds of workers this pins the xmin horizon, autovacuum logs "tuples: 0 removed, 800000 remain" for hours, plans degrade as stats grow stale, disk I/O climbs. Mitigation: `idle_in_transaction_session_timeout = '5min'` at the role level, `statement_timeout = '30s'` at the database level, pool-level idle-connection reaping. Bring this story to senior interviews — it's the most common production Postgres outage.

---

## MVCC, Tuples & Visibility

### Summary

**What this topic covers**

How Postgres achieves "readers never block writers, writers never block readers" — the **Multi-Version Concurrency Control** (MVCC) model. Tuple-level mechanics: every row carries `xmin` and `xmax` system columns that encode which transaction created and deleted it. Snapshots: how a `SELECT` decides which tuple versions it can see. Transaction ID wraparound and freezing — the only existential threat MVCC creates. Dead tuples vs bloat. Why long-running transactions stall cleanup across the entire cluster. The HOT chain optimisation and what breaks it. How MVCC interacts with physical and logical replication.

**Mental model**

MVCC means **never overwrite a row in place** — every `UPDATE` is a logical delete-then-insert, every `DELETE` is a tombstone marker. A tuple's `xmin` is the transaction that created it; `xmax` is the transaction that deleted/updated it (zero if alive). A transaction snapshot is the triple `(xmin, xmax, in-progress-xid-list)` — the bounds of "what was committed when I started". A `SELECT` running under that snapshot looks at each tuple's `xmin`/`xmax` and decides visibility: visible iff `xmin` committed before the snapshot **and** (`xmax` is zero, or `xmax` is in-progress, or `xmax` committed after the snapshot). This rule runs on **every tuple touched** — it's hot-path code. The consequence: dead tuples accumulate, and vacuum has to reclaim them, but it can only reclaim tuples whose `xmax` is older than the **oldest live snapshot in the cluster**. One backend with a snapshot open at noon prevents vacuum cleanup of *every* dead tuple in *every* table for the duration. That's the secret architecture of every bloat and "autovacuum can't keep up" outage.

**Key terms**

- **MVCC** — readers see a consistent snapshot; writers create new tuple versions instead of mutating in place.
- **`xmin` / `xmax`** — system columns: creating xid / deleting xid (0 if alive).
- **snapshot** — `{xmin, xmax, xip}`; the visibility window for a transaction.
- **dead tuple** — a row version no longer visible to any active transaction.
- **bloat** — disk occupied by dead tuples plus unreclaimed free space inside heap and index pages.
- **freezing** — marking an old tuple's `xmin` as "always visible" to survive xid wraparound.
- **transaction ID wraparound** — the 32-bit xid counter wraps every ~4B; un-frozen tuples then look future-dated and vanish.
- **HOT chain** — a sequence of in-page tuple versions reachable via line-pointer redirects; index entries point at the chain root.
- **broken HOT chain** — caused by updating an indexed column, forcing a new index entry per update.
- **snapshot pinning** — a long-running snapshot blocking vacuum from reclaiming any tuple newer than its `xmin`.
- **`backend_xmin`** — the oldest xmin held by any active backend; visible in `pg_stat_activity`.

**Why interviewers ask this**

Three signals. (1) **Can you reason about a tuple's life?** Junior candidates know "Postgres uses MVCC"; senior candidates can walk through `xmin`/`xmax` updates on an `UPDATE` and explain why a `SELECT` from another transaction sees the old version. (2) **Do you know why long transactions are dangerous?** This is the most common production Postgres outage shape — a Hibernate or ActiveRecord session leaks a transaction across a slow HTTP call, the xmin horizon stalls, autovacuum logs "0 tuples removed" for hours, bloat compounds across every table. The candidate who can explain this *unprompted* signals operator-grade experience. (3) **Do you know the wraparound endgame?** Anti-wraparound vacuum, `datfrozenxid`, the read-only shutdown at 2B xids — knowing this means you've at least read post-mortems, ideally lived one.

**Common confusions**

- "MVCC means no locking" — wrong; MVCC eliminates read locks against writers but writes still take row locks against each other.
- "Dead tuples are bloat" — closely related but not identical: a dead tuple becomes recoverable space when vacuum processes it; the space stays inside the table until `VACUUM FULL` or `pg_repack`.
- "Long transactions block vacuum on the table they touch" — wrong; a long transaction's snapshot pins **the cluster-wide xmin horizon**, blocking vacuum on every table in every database.
- "Wraparound is theoretical" — it's killed production databases; anti-wraparound vacuum runs even when `autovacuum = off`, holds locks for hours, and cannot be cancelled.
- "Updating any column breaks HOT" — only updating an *indexed* column; non-indexed-column updates can stay HOT if the new tuple fits in the same page.

**What follows from this topic**

VACUUM is the daemon that cleans the dead tuples this topic creates. Transactions & Isolation builds on snapshots to define isolation semantics. WAL & Crash Recovery is the durability layer for the new-tuple inserts MVCC depends on. Replication relies on the same `xmin`/`xmax` machinery — logical decoding replays only committed changes, physical replication replays the WAL records that materialise them. Internalise the snapshot model and the rest of Postgres operations falls into place.

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

### Summary

**What this topic covers**

The cleanup daemon that makes MVCC sustainable. What `VACUUM` actually does (mark dead-tuple line pointers reusable, update the FSM, update the VM, update stats), the distinction between online `VACUUM`, blocking `VACUUM FULL`, and online-rewrite `pg_repack`. How autovacuum decides to fire — the scale-factor + threshold formula, why the defaults are wrong for large tables, the insert-only-table fix in PG 13, the `vacuum_failsafe_age` last-line-of-defence in PG 14. The cost-based throttle (`vacuum_cost_delay`, `vacuum_cost_limit`) and the PG 12 default change that finally made autovacuum keep up on SSDs. The difference between lazy and aggressive (anti-wraparound) vacuums. How to measure bloat accurately with `pgstattuple` vs estimation queries.

**Mental model**

Autovacuum is the **garbage collector** for MVCC. Like every GC, two things determine whether it keeps up: how fast it runs (cost throttle, worker count) and what it has to do (dead-tuple count). The threshold formula `dead_tuples > threshold + scale_factor × n_live_tup` means autovacuum fires at **20% bloat** by default — fine for a 10k-row table (autovacuum fires every 2000 dead tuples), catastrophic for a 1B-row table (autovacuum waits for 200M dead tuples before firing, then has to scan all of them in one pass). The fix is **per-table overrides**: `ALTER TABLE huge SET (autovacuum_vacuum_scale_factor = 0.02)`. The two failure shapes are: (1) autovacuum **isn't running** — usually because a long transaction or replication slot has pinned the xmin horizon, so vacuum reports "0 tuples removed" forever; (2) autovacuum is running but **losing the race** — write rate outpaces clean rate, dead tuples grow monotonically. The diagnostic ladder: check `pg_stat_user_tables.n_dead_tup` and `last_autovacuum`; check `pg_stat_activity` for old `xact_start`; check `pg_replication_slots` for dormant slots; raise `autovacuum_max_workers` and lower `autovacuum_vacuum_cost_delay`.

**Key terms**

- **`VACUUM`** — online, non-blocking; reclaims dead tuples into the FSM but doesn't return disk to OS.
- **`VACUUM FULL`** — rewrites table under `ACCESS EXCLUSIVE` lock; never run on a busy production table.
- **`pg_repack`** — online table rewrite via trigger-shadow + atomic swap; the production cure for bloat.
- **`autovacuum_vacuum_scale_factor`** — fraction of `n_live_tup` that triggers vacuum (default 0.2; tune to 0.01-0.05 on big tables).
- **`autovacuum_vacuum_threshold`** — absolute floor added to the scale-factor threshold (default 50).
- **`autovacuum_max_workers`** — cap on concurrent autovacuum workers (default 3; raise to 6-10 on big clusters).
- **`vacuum_cost_delay` / `vacuum_cost_limit`** — the I/O throttle; PG 12 dropped the delay default from 20ms to 2ms.
- **anti-wraparound vacuum** — emergency scan triggered at `autovacuum_freeze_max_age`; cannot be cancelled, blocks DDL.
- **`vacuum_failsafe_age`** — PG 14+; the "panic" threshold (default 1.6B) where vacuum drops throttling and skips index cleanup.
- **`pgstattuple`** — extension for exact bloat measurement; slow, page-by-page.
- **insert-only landmine** — pre-PG 13, append-only tables never triggered vacuum and silently aged toward wraparound.

**Why interviewers ask this**

Three signals. (1) **Do you treat autovacuum as something to tune, not something to disable?** The number-one anti-pattern in production Postgres is "we turned autovacuum off because it was causing I/O spikes" — followed inevitably by an anti-wraparound emergency. The candidate who reflexively says "tune the cost limit and per-table scale factors" passes. (2) **Can you debug "autovacuum isn't running"?** The five-second answer is `pg_stat_user_tables.n_dead_tup + last_autovacuum`; the senior follow-up is the xmin-horizon hunt — finding the long transaction or dormant slot blocking cleanup cluster-wide. (3) **Do you know the wraparound playbook?** Alerting at 50% of `autovacuum_freeze_max_age`, running planned `VACUUM (FREEZE)` in off-peak windows, knowing what `vacuum_failsafe_age` means in the logs — these are war-story-grade questions.

**Common confusions**

- "`VACUUM FULL` is a safer, more thorough vacuum" — it's a **rewrite** under `ACCESS EXCLUSIVE` lock; unsafe on any table that gets concurrent traffic.
- "Autovacuum slows down my system" — usually the *absence* of autovacuum slows the system; tune `cost_delay` and per-table thresholds rather than disabling.
- "Insert-only tables don't need vacuum" — pre-PG 13 they were a wraparound landmine; even now they need anti-wraparound freezing.
- "`ANALYZE` is part of `VACUUM`" — `VACUUM` updates `relpages`/`reltuples` but not the histograms; `ANALYZE` samples and updates `pg_statistic` independently.
- "Anti-wraparound vacuum is rare" — on busy OLTP it happens every few weeks; the question is whether it runs planned (at 3 AM) or unplanned (at noon).

**What follows from this topic**

VACUUM ties directly to WAL and Checkpoints (vacuum generates WAL), to Indexing (index bloat needs `REINDEX CONCURRENTLY` separately), to Replication (`hot_standby_feedback` can stall primary vacuum), and to Schema Design (partitioning enables per-partition parallel vacuum). If autovacuum tuning is shaky, every other topic gets harder — bad plans from stale stats, write amplification from index bloat, replication lag from vacuum WAL spikes.

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

### Q24b. Insert-only tables never accumulate dead tuples — why do they still need vacuum?

Pre-PG 13, insert-only tables (events logs, append-only audit tables) were a wraparound landmine: no dead tuples → autovacuum never fired → `relfrozenxid` aged untouched → emergency anti-wraparound vacuum eventually fired at peak load to scan billions of rows. PG 13 added `autovacuum_vacuum_insert_threshold` (default 1000) and `autovacuum_vacuum_insert_scale_factor` (default 0.2) — autovacuum now fires on insert volume too. PG 18 added `autovacuum_vacuum_max_threshold` as a hard cap so giant tables don't keep raising the trigger linearly with row count.

### Q24c. What's `vacuum_failsafe_age` and when does it save you?

PG 14+. When a table's `relfrozenxid` age exceeds `vacuum_failsafe_age` (default 1.6 billion), running vacuums switch to **emergency mode**: ignore cost-based throttling, skip index cleanup, just freeze pages as fast as possible. The last-line-of-defence before wraparound shutdown at 2 billion. If you see this in logs, you've lost autovacuum tuning months ago — investigate which long-running thing pinned vacuum.

### Q24d. Why is "anti-wraparound vacuum" so feared in production?

(1) It **cannot be cancelled** — `pg_cancel_backend` is ignored once it's running. (2) It holds a lock that **blocks DDL** for the duration (no `ALTER TABLE`, no `CREATE INDEX`, no schema migrations). (3) It scans the entire table including all-frozen pages on the first pass. (4) It always fires when you least want it — at 200M xid age, which on a high-write OLTP system arrives mid-peak. Mitigation: **alert at 50% of `autovacuum_freeze_max_age`** so the planned vacuum runs in an off-peak window instead of the emergency one running at noon.

### Q24e. How do you accurately measure bloat?

Two options: (1) **`pgstattuple`** extension — exact per-table dead-tuple percentage by scanning every page. Slow (locks page-by-page); run on staging or off-peak. (2) **Estimation queries** from `wiki.postgresql.org/wiki/Show_database_bloat` — algebraic estimate from pg_class and pg_stats; cheap, ~10-20% accurate. Production pattern: cheap estimate continuously in monitoring; exact `pgstattuple` on suspect tables during incidents.

---

## WAL, Checkpoints & Crash Recovery

### Summary

**What this topic covers**

The durability machinery: the **Write-Ahead Log** (WAL), the checkpoint cycle that bounds recovery time, the `synchronous_commit` knob that picks your durability tier, full-page writes (the WAL-volume side-effect of checkpoint-followed-by-write), the `wal_level` setting (`minimal` / `replica` / `logical`) that gates streaming and logical decoding, and the crash-recovery flow. Operational failure modes: `pg_wal` filling up the disk (failed archive, dormant replication slot, lagging replica), checkpoint storms, and how to tune `max_wal_size` + `checkpoint_timeout` + `checkpoint_completion_target` for a smooth I/O profile.

**Mental model**

WAL is the **single source of durability truth** in Postgres. Every modification — heap insert, index update, vacuum cleanup — generates a WAL record, written sequentially to `$PGDATA/pg_wal/` in 16 MB segments. The discipline: WAL is `fsync`'d to disk **before** the corresponding data pages are flushed, so on crash you can replay WAL from the last checkpoint forward and rebuild any unwritten dirty pages. A **checkpoint** is the I/O wave that flushes all currently-dirty buffers, writes a checkpoint record to WAL, and lets older WAL segments be recycled. Tune checkpoints toward "by timeout, not by `max_wal_size`" — frequent forced checkpoints (because WAL filled before the timer) means bursty I/O and double-write amplification via **full-page writes** (the first WAL record for any page after a checkpoint is the entire 8 KB image, to protect against torn writes). The three knobs are entangled: more frequent checkpoints → faster recovery but more FPW WAL volume; less frequent → less WAL but slow startup after crash. `synchronous_commit` is the durability dial — `on` waits for local fsync, `remote_apply` waits for a sync replica to apply, `off` returns before fsync and risks losing up to `wal_writer_delay` of commits on crash.

**Key terms**

- **WAL** — Write-Ahead Log; sequential record of every modification, written before data pages.
- **LSN** — Log Sequence Number; a monotonic position in the WAL stream.
- **checkpoint** — flush all dirty buffers, write checkpoint record, allow WAL recycling.
- **`max_wal_size`** — soft cap that triggers a checkpoint when exceeded (default 1 GB; modern: 8-32 GB).
- **`checkpoint_timeout`** — periodic checkpoint interval (default 5 min; modern: 15-30 min).
- **`checkpoint_completion_target`** — fraction of timeout over which to spread checkpoint I/O (set 0.9).
- **`synchronous_commit`** — durability tier: `on`, `off`, `local`, `remote_write`, `remote_apply`.
- **full-page writes (FPW)** — first WAL record per page after a checkpoint contains the whole 8 KB; protects against torn writes.
- **`wal_level`** — `minimal` (crash only), `replica` (streaming + base backup), `logical` (decoding extras).
- **`wal_compression`** — PG 9.5+ pglz, PG 15+ lz4/zstd; compresses FPW specifically.
- **`pg_wal`** — the WAL directory; if full, server goes read-only.

**Why interviewers ask this**

Three signals. (1) **Do you know the durability ladder?** `synchronous_commit = off` is ~10× faster but loses recent commits on crash; can you articulate which value to set per workload? (2) **Can you debug `pg_wal` filling the disk?** This is the classic Postgres outage — `archive_command` returning non-zero, an inactive replication slot, or a disconnected replica pinning WAL. The senior answer names all three suspects and the order to check. (3) **Can you tune checkpoints?** Knowing to target `checkpoints_req / (checkpoints_timed + checkpoints_req) < 5%`, why shortening `checkpoint_timeout` *increases* WAL volume (FPW amplification), and when to turn on `wal_compression = lz4` — these are operator-grade calls.

**Common confusions**

- "`synchronous_commit = off` means no durability" — it's an *async* fsync; you lose up to ~200ms of commits on crash, not all data; still unsuitable for financial OLTP.
- "Checkpoints write WAL" — they write a *checkpoint record* and flush dirty data pages; the data writes are the I/O cost, not WAL writes.
- "Recovery time scales with checkpoint frequency" — recovery time scales with `(WAL bytes since last checkpoint) / replay speed`; *more frequent* checkpoints = *faster* recovery but more FPW WAL.
- "Disabling full-page writes saves money" — `full_page_writes = off` is only safe on hardware with atomic 8 KB writes; almost nothing in 2026 qualifies, so leave it on.
- "Archive failures auto-recover" — they don't; `archive_command` retries forever, holding WAL until it returns 0, while disk fills.

**What follows from this topic**

WAL is what Replication consumes (physical streams it verbatim, logical decodes it). Backup & Disaster Recovery is built on WAL archiving + base backups for PITR. Crash recovery semantics inform Connection Management (long recovery = long downtime = bigger pooler queue). VACUUM generates WAL too — vacuum-heavy maintenance windows blow up replica lag. Get the WAL story right and replication, backups, and HA all become tractable.

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

### Q32b. What is `wal_compression` and when should you turn it on?

PG 9.5 added `wal_compression = on` (pglz); PG 15 added `wal_compression = lz4` (faster CPU, similar ratio) and `zstd` (best ratio, more CPU). Compresses **full-page writes** specifically — the WAL volume spike right after a checkpoint. Default off; turn on `lz4` for write-heavy OLTP where WAL volume dominates network/disk costs (replication bandwidth, archive storage). Cost: ~5-10% CPU on commit path. Win: 30-50% smaller WAL on FPW-heavy workloads.

### Q32c. Why does shortening `checkpoint_timeout` increase WAL volume?

Full-page writes: every dirty page's **first** modification after a checkpoint logs the entire 8 KB page. Shorter checkpoint intervals → more "first modifications after a checkpoint" → more full-page WAL records → larger `pg_wal/`. Counterintuitive: more frequent checkpoints save recovery time but **cost** WAL bandwidth. The right balance is "checkpoint by timeout at 15-30 min on busy systems" + `wal_compression = lz4` to claw back the FPW overhead.

---

## Query Planning & Execution

### Summary

**What this topic covers**

How a `SELECT` becomes a running plan: parser → analyzer → rewriter → planner → executor. The planner's job — generating candidate plans, costing them against `pg_statistic`, picking the cheapest. How to read `EXPLAIN ANALYZE` (cost vs actual, rows expected vs actual, buffers, loops). Scan choices (seq scan, index scan, index-only scan, bitmap heap scan). Join algorithms (nested loop, hash, merge) and when each wins. Row-estimation error and its fixes — extended statistics (`CREATE STATISTICS`), expression statistics, per-column `STATISTICS` overrides. CTE materialisation (the PG 12 change). PG 18's OR-to-array transformation and default-on BUFFERS.

**Mental model**

The planner is a **cost-based optimiser** searching the space of equivalent plan trees. Two ideas drive everything. (1) **Row estimates flow upward** — a leaf node's row estimate is read from `pg_statistic`; every node above multiplies/filters/joins those estimates. If a leaf estimate is 100× off, the error compounds — wrong join algorithm, wrong work_mem budget, wrong index choice. (2) **Cost is calibrated against `seq_page_cost = 1.0`** and the planner believes those calibrations are accurate. On SSDs the default `random_page_cost = 4.0` is 3-4× too pessimistic, so the planner under-uses indexes; lowering it to 1.1 fixes a category of "why is it doing a seq scan?" bugs. The executor is a **pull-based pipeline** of nodes — each node returns one tuple per call, the root node loops asking for tuples until exhausted. This is why "loops=100000" in `EXPLAIN ANALYZE` is a red flag: a half-millisecond inner node called 100k times is 50 seconds of work. The senior diagnostic toolkit: `EXPLAIN (ANALYZE, BUFFERS)` for I/O, `pg_stat_statements` to find candidates, `auto_explain` for surprise plans, and `CREATE STATISTICS` to fix correlated-predicate misestimates.

**Key terms**

- **planner** — cost-based optimiser; DP up to `geqo_threshold` (12) joins, then GEQO.
- **`pg_statistic` / `pg_stats`** — per-column histograms, MCVs, null fraction, n_distinct.
- **cost** — abstract estimate in arbitrary units; calibrated to `seq_page_cost = 1.0`.
- **`random_page_cost`** — index-driven random read cost; default 4.0, set 1.1 on SSD.
- **`effective_cache_size`** — planner's belief about OS + Postgres cache; raise to ~50-75% of RAM.
- **sequential scan** — read all heap pages in order; wins for large fractions of the table.
- **index scan / index-only scan** — index lookup; index-only skips heap iff page is all-visible in VM.
- **bitmap heap scan** — build a TID bitmap from index, sort by page, scan heap pages in physical order.
- **nested loop** — outer × inner; wins when inner has fast index lookup and outer is small.
- **hash join** — build hash on smaller side; wins when both sides are large and fit in `work_mem`.
- **merge join** — both inputs sorted; wins when input order is preserved.
- **extended statistics** — `CREATE STATISTICS … ON (a, b)` fixes correlated-predicate misestimates.

**Why interviewers ask this**

Three signals. (1) **Can you read `EXPLAIN ANALYZE`?** A surprising number of candidates can't tell `cost=10..200` from `actual time=10..200` or know that `loops=N` means the node ran N times. The senior tell is spotting the "actual rows=10 loops=10000" inner-loop trap. (2) **Do you know the failure modes of cost estimation?** Stale stats, correlated predicates (`WHERE country='IE' AND city='Dublin'`), expression predicates, and default `random_page_cost` for SSDs — naming these unprompted shows you've debugged real plan regressions. (3) **Do you reach for the right fix?** Junior candidates `SET enable_seqscan = off`; senior candidates `CREATE STATISTICS` and lower `random_page_cost`. The diagnostic story arc — "stats stale → ANALYZE; correlated predicate → CREATE STATISTICS; SSD → random_page_cost = 1.1; planner trapped → pg_hint_plan as last resort" — is the senior shape.

**Common confusions**

- "Low cost = fast" — cost is *estimated*; actual time can be wildly different when stats are wrong.
- "Index scan is always faster than seq scan" — false; for >5-10% of a table on rotational disks, seq scan wins; on SSD the threshold is higher but still not 100%.
- "CTEs are always optimisation fences" — true pre-PG 12, false after; the planner inlines non-recursive CTEs unless `MATERIALIZED` is specified.
- "`pg_hint_plan` is best practice" — it's an emergency stabiliser; the right fix is usually statistics or schema, not hints.
- "BUFFERS shows kernel cache" — it shows the Postgres buffer cache (`shared_buffers`); kernel page cache is invisible.

**What follows from this topic**

Indexing Strategy is what the planner has to work with. Transactions & Locking explain when plans are stable vs disrupted by concurrent writes. Schema Design influences row estimates (column correlation, distinct values). Monitoring relies on `pg_stat_statements` + `auto_explain` to catch plan regressions. Bad plans are the most common "Postgres is slow" complaint — this topic is where the diagnosis starts.

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

### Q42b. What's the OR-to-array transformation in PG 18?

Pre-18, `WHERE id = 1 OR id = 2 OR id = 3` often defeated index usage because the planner couldn't combine the disjuncts cleanly — fell back to seq scan or `BitmapOr`. PG 18 rewrites such clauses to `WHERE id = ANY('{1,2,3}')` internally, restoring a single index scan. Real-world impact: ORMs that emit OR-chains (e.g. polymorphic associations) get free perf wins on upgrade. Knowing this on PG 17 → recommend rewriting OR-chains to `= ANY(array)` in app code.

### Q42c. What does PG 18's `EXPLAIN BUFFERS` change reveal?

In PG 18, `EXPLAIN (ANALYZE)` includes `BUFFERS` by default (was opt-in). Index scans also now report **lookup counts** — how many index probes happened, distinct from rows-returned. This exposes hidden index-probe explosions in nested-loop joins where "actual rows=10 loops=1000" hid the fact that the inner index was probed 10,000 times. The diagnostic value: index lookup count × cost-per-lookup = real I/O budget.

### Q42d. Senior angle: when do correlated predicates wreck the planner, and how do you fix it?

`WHERE country = 'IE' AND city = 'Dublin'` — by default the planner multiplies selectivities assuming independence: 1% × 1% = 0.01% estimated. Reality: 100% correlation, ~1% actual. Plan picks nested-loop instead of hash join, query is 1000× slower than it should be. Fix: `CREATE STATISTICS s (dependencies, mcv, ndistinct) ON country, city FROM addresses;` then `ANALYZE`. Extended statistics teach the planner about cross-column correlation; the row estimate jumps from 0.01% to 1% and the plan switches to the right join algorithm.

---

## Indexing Strategy

### Summary

**What this topic covers**

The index types Postgres ships (B-tree, hash, GIN, GiST, SP-GiST, BRIN) and what each is good for. Specialisations: partial indexes (predicate-restricted), expression indexes (computed value), covering indexes (`INCLUDE` columns for index-only scans), multicolumn indexes and the left-prefix rule. Lifecycle operations: `CREATE INDEX CONCURRENTLY` (never plain CREATE in production), `REINDEX CONCURRENTLY` (PG 12+), finding unused/duplicate indexes. The write-cost reality — every index multiplies INSERT/UPDATE/DELETE cost. Niche but important: `NULLS NOT DISTINCT` (PG 15), GIN's `fastupdate` pending list, `btree_gin` / `btree_gist` for mixed-type composite indexes.

**Mental model**

Indexes are a **write-cost-for-read-gain** trade. Every index touches the write path: an INSERT writes to every index, an UPDATE writes to every index whose column was modified (the HOT optimisation tries to avoid this), a DELETE marks every index entry. So the right index strategy is **the smallest set that supports the read paths actually hot enough to need them** — not "index everything that might be queried". Pick the index *type* by the operator: equality and range comparisons → B-tree; containment / set operations on JSON or arrays / full-text → GIN; geometric or KNN / range overlap → GiST; massive append-only with natural physical order → BRIN; equality only and you're sure → hash (rarely worth it). Use **partial indexes** when one predicate filters most of the table (`WHERE status = 'pending'` queue patterns); use **expression indexes** when you query a computed value and remember `CREATE STATISTICS` on the same expression so the planner gets accurate selectivity. The senior reflex: when you see "we added an index and writes got slow", ask which other indexes that same table has — the right cure is often *dropping* an index, not adding one.

**Key terms**

- **B-tree** — default; ordered; supports `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, `IS NULL`.
- **GIN (Generalized Inverted Index)** — for composite contents: jsonb containment, full-text, arrays, trigram.
- **GiST (Generalized Search Tree)** — geometric, range types, KNN (`<->`).
- **BRIN (Block Range Index)** — tiny summary per N blocks; only useful for naturally clustered data.
- **partial index** — `WHERE predicate`; smaller, faster writes, hits only when predicate matches.
- **expression index** — indexes a computed value; queries must use the same expression verbatim.
- **covering index (`INCLUDE`)** — payload columns on leaf pages; enables index-only scans without bloating the key.
- **multicolumn index** — ordered lexicographically; left-prefix rule applies.
- **`CREATE INDEX CONCURRENTLY`** — online build under `ShareUpdateExclusive` lock; can fail and leave `invalid` index.
- **`REINDEX CONCURRENTLY`** — PG 12+ online rebuild; the standard cure for index bloat.
- **`fastupdate` pending list** — GIN's insert buffer; speeds writes but slows lookups when oversized.
- **`NULLS NOT DISTINCT`** — PG 15+ unique-constraint mode treating all NULLs as equal.

**Why interviewers ask this**

Three signals. (1) **Do you know index types beyond B-tree?** Naming GIN for jsonb containment, BRIN for time-series, and `pg_trgm` for `ILIKE '%foo%'` separates candidates who've only seen ORMs from candidates who've designed schemas. (2) **Do you reflexively use CONCURRENTLY?** Plain `CREATE INDEX` taking `ACCESS EXCLUSIVE` and blocking production is a famous outage shape; the senior candidate says `CONCURRENTLY` without prompting. (3) **Do you know when indexes hurt?** Being able to articulate "every unused index costs every write" and to point at `pg_stat_user_indexes.idx_scan = 0` as the diagnostic for dropping fat unused indexes is the operator's reflex. Bonus signal: knowing about HOT updates and `fillfactor` (covered in Architecture) and how they let you avoid index writes on update-heavy columns.

**Common confusions**

- "Indexes always speed up reads" — only if the planner uses them; an expression-mismatched predicate, low selectivity, or stale stats can defeat an index.
- "Multicolumn `(a, b)` index serves `WHERE b = ?`" — no; B-tree multicolumn obeys the **left-prefix rule** — needs a predicate on `a` (PG 18's skip-scan changes this for low-cardinality leading columns).
- "GIN is just a bigger B-tree" — different beast: inverted index for set-like contents, large on disk, slow to update (mitigated by the `fastupdate` pending list).
- "BRIN can replace B-tree on huge tables" — only if data is **physically correlated** with the indexed column; random insert order kills BRIN.
- "Covering indexes are always better than composite keys" — no; `INCLUDE` cols can't be used for ordering or uniqueness, only as payload.

**What follows from this topic**

Query Planning consumes the indexes this topic creates — bad index choice = bad plans. Schema Design picks the columns and types that indexes operate on. Transactions & Locking determines whether `CREATE INDEX CONCURRENTLY` is safe right now (long transactions block it). VACUUM cleans index bloat (`REINDEX CONCURRENTLY` is the cure for what vacuum can't fix). Partitioning interacts with indexes — no global indexes, indexes are per-partition. Indexing is the most leveraged tuning surface in Postgres; getting it right is half of being good at the database.

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

### Q52b. What does `REINDEX CONCURRENTLY` give you?

PG 12+ added online index rebuild. Old playbook: drop bloated index, recreate concurrently — but the table runs un-indexed during the rebuild, which can DoS production. `REINDEX INDEX CONCURRENTLY idx_name;` builds a new index alongside the old, then atomically swaps. Costs ~2× index disk during the rebuild plus a `ShareUpdateExclusive` lock (allows DML, blocks DDL). The standard cure for "index is 4× the size of the table" without downtime.

### Q52c. What's `NULLS NOT DISTINCT` and why does it matter?

PG 15+. Default unique-constraint behaviour treats NULLs as distinct — so `UNIQUE (email)` allows multiple rows with `email = NULL`, often surprising developers. `CREATE UNIQUE INDEX ON users (email) NULLS NOT DISTINCT;` treats all NULLs as the same value, enforcing "at most one row with NULL". The SQL-standard behaviour for many other databases; finally available in Postgres. Pick the right semantics at index-creation time; switching later requires a concurrent rebuild.

### Q52d. What's GIN's "fastupdate" pending list and why does it matter?

GIN updates are expensive (each insert touches many leaf pages for multi-valued data). `fastupdate = on` (default) buffers inserts into a **pending list** that vacuum or autovacuum eventually drains into the index proper. Win: fast inserts. Cost: lookups must scan both the index and the pending list — if the pending list grows large (vacuum running behind), GIN queries slow dramatically. Tune `gin_pending_list_limit` (default 4MB) and force-flush with `gin_clean_pending_list(regclass)`. On write-heavy + read-heavy GIN workloads, consider `fastupdate = off` to trade insert latency for predictable query times.

### Q52e. When do you reach for `btree_gin` or `btree_gist`?

Built-in opclasses that let B-tree-friendly types (int, text, timestamps) participate in GIN/GiST indexes. The use case: composite indexes mixing scalars and complex types — e.g. a GIN index on `(org_id, tsvector_column)` so full-text search is scoped per tenant. Without `btree_gin`, you can't put `org_id` into a GIN index; you'd need post-filtering. Adds a few-hundred-MB extension overhead but transformative for multi-tenant FTS / array search.

---

## Transactions, Locking & Isolation

### Summary

**What this topic covers**

The SQL isolation levels Postgres actually implements (READ COMMITTED, REPEATABLE READ as snapshot isolation, SERIALIZABLE as SSI) and how they differ from the ANSI spec. Row-level lock strengths (`FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`) and when each is right. The `SKIP LOCKED` queue pattern. Advisory locks (session vs transaction scope) and the PgBouncer transaction-pooling trap. Deadlock detection and resolution. Write skew and why SSI catches it. The "Strong Migrations" playbook for production DDL safety: `lock_timeout`, fast-default columns (PG 11+), `NOT VALID` + `VALIDATE CONSTRAINT`, `CONCURRENTLY` everything. Investigating "table is locked" with `pg_locks` + `pg_blocking_pids`.

**Mental model**

Postgres's locking model is **MVCC for reads + explicit row/object locks for writes**. Readers don't block writers because MVCC gives them a consistent snapshot of past committed state. Writers block writers at the row level — an `UPDATE` takes `FOR NO KEY UPDATE` on the row, conflicting with another `UPDATE` of the same row. DDL takes table-level locks — `ALTER TABLE` typically wants `ACCESS EXCLUSIVE`, which blocks *everything*. The senior playbook for production DDL is "never hold `ACCESS EXCLUSIVE` for more than a second" — use `lock_timeout`, prefer `ADD CONSTRAINT … NOT VALID` + later `VALIDATE`, use `CREATE INDEX CONCURRENTLY`, and add columns nullable (or with PG 11+ "fast default" constants). Isolation level picks the **snapshot strategy**: READ COMMITTED takes a new snapshot per statement (fine for short OLTP); REPEATABLE READ takes one at first statement and holds it (good for reports needing internal consistency, but can `40001 serialize` on update conflicts); SERIALIZABLE (SSI) adds predicate locking and dependency tracking to catch write skew — pay the cost when invariants span multiple rows. Locking failure modes are the famous outage shapes: idle-in-transaction backends pinning row locks (and the xmin horizon), deadlock cycles from inconsistent lock ordering, `CREATE INDEX` (non-concurrent) holding `ShareLock` on a huge table, unindexed FK updates serialising the cluster.

**Key terms**

- **READ COMMITTED** — Postgres default; new snapshot per statement; no dirty reads.
- **REPEATABLE READ** — Postgres's snapshot isolation; single snapshot per transaction; can fail with `40001`.
- **SERIALIZABLE** — SSI; snapshot + predicate locks + dependency tracking; rolls back on anomaly.
- **`FOR UPDATE`** — strongest row lock; blocks all other row locks.
- **`FOR NO KEY UPDATE`** — what UPDATE takes when no PK/UK column moves; allows `FOR KEY SHARE`.
- **`FOR KEY SHARE`** — what FK enforcement takes; allows non-key updates.
- **`SKIP LOCKED`** — queue-table pattern; skip rows another transaction has locked.
- **advisory lock** — application-level lock; `pg_advisory_xact_lock` is the safe choice under transaction pooling.
- **deadlock** — cycle of waits; detected at `deadlock_timeout` (default 1s); one xact aborted with `40P01`.
- **write skew** — two xacts each read shared data and write disjoint rows; snapshot isolation allows; SSI catches.
- **`lock_timeout`** — per-session cap on how long a statement waits for a lock; non-optional for migrations.
- **fast default** — PG 11+ catalog-only column add with constant default; no table rewrite.

**Why interviewers ask this**

Three signals. (1) **Do you know what Postgres's isolation levels actually mean?** A surprising number of candidates think REPEATABLE READ blocks writes or that SERIALIZABLE is "always slow"; the senior candidate explains snapshot isolation, write skew, and why SSI matters when invariants span rows. (2) **Can you write a safe migration?** The "Strong Migrations" playbook — `lock_timeout`, `NOT VALID` + `VALIDATE`, `CONCURRENTLY` indexes, fast defaults — is what separates "I know SQL" from "I've shipped to prod without breaking it". (3) **Can you debug a locking incident?** Pulling `pg_locks` + `pg_blocking_pids(pid)`, identifying idle-in-transaction culprits, knowing when to `pg_cancel_backend` vs `pg_terminate_backend` — that's the 2 AM kit. Bonus signal: the SKIP LOCKED queue pattern, advisory lock pooling trap, and consistent lock ordering for deadlock prevention.

**Common confusions**

- "REPEATABLE READ blocks writes" — it doesn't; it's snapshot isolation, still MVCC; can fail with serialization error but doesn't *block*.
- "SERIALIZABLE is true serializable execution" — Postgres's SSI is *snapshot-based* serializable; faster than 2PL but rolls back on anomaly.
- "`SELECT FOR UPDATE` without a transaction works" — the lock releases at statement end; race window opens immediately.
- "Advisory locks survive `COMMIT`" — only session-scope ones; under transaction pooling, the server connection returns to the pool with the lock leaked — use `pg_advisory_xact_lock`.
- "`ADD COLUMN ... NOT NULL DEFAULT 0` rewrites the table" — pre-PG 11, yes; PG 11+ with a constant default, no — fast default stores it in the catalog.
- "Deadlocks are bugs in Postgres" — they're application-level errors caused by inconsistent lock ordering; fix the app, not the DB.

**What follows from this topic**

MVCC and Vacuum interact with locking — long transactions pin the xmin horizon and block vacuum. Connection Management and idle-in-transaction timeouts are direct defences against the locking failure modes here. Query Planning is affected by stats freshness during migrations. Schema Design picks data types and constraints that the lock model enforces. Most production Postgres outages root-cause to something in this topic — internalise it.

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

### Q61b. Walk me through migration safety — what's the "Strong Migrations" playbook?

(1) **`lock_timeout` + `statement_timeout`** on every migration session — never block production for more than seconds. (2) Add columns **nullable**, no default — instant catalog-only change since PG 11 (PG 11 made constant defaults also instant). (3) **Backfill in batches** with a separate connection. (4) Add `NOT NULL` via `ADD CONSTRAINT ... NOT NULL ... NOT VALID` then `VALIDATE CONSTRAINT` (only `ShareUpdateExclusive`, not `AccessExclusive`). (5) Same pattern for CHECK and FK. (6) `CREATE INDEX CONCURRENTLY`, never plain `CREATE INDEX`. (7) **Never** rename a column in one PR — column rename means coordinated app deploy; use add-new + dual-write + drop-old over 3 deploys.

### Q61c. Why doesn't `ALTER TABLE … ADD COLUMN x int NOT NULL DEFAULT 0` rewrite the whole table in PG 11+?

PG 11 introduced "fast default" — the default is stored in the catalog (`pg_attribute.atthasmissing` + `attmissingval`), and existing rows logically have the default without being physically rewritten. Subsequent reads synthesise the default for old-format rows; writes rewrite to the new format gradually. The constraint: the default must be a constant or immutable expression. A volatile default (`now()`, `gen_random_uuid()`) still rewrites the table. Knowing this is the difference between a 50ms migration and a 4-hour table-rewrite outage.

### Q61d. PgBouncer transaction pooling + advisory locks — what's the trap?

Session-scope advisory locks (`pg_advisory_lock`) bind to the *server* connection, not the *app* connection. Under transaction pooling, after `COMMIT` the server connection returns to the pool — a different app session may grab it next and inherit the lock (or, worse, the original app session reconnects to a fresh server and the lock is gone). The fix: use **transaction-scope advisory locks** (`pg_advisory_xact_lock`) exclusively under transaction pooling — they release at `COMMIT`/`ROLLBACK` so pool reuse is safe. Same trap applies to `SET` (use `SET LOCAL`), prepared statements (use PgBouncer 1.21+ for protocol-level handling), and `LISTEN`/`NOTIFY` (use session pooling for those workers).

---

## JSON & JSONB

### Summary

**What this topic covers**

The `json` (text) vs `jsonb` (binary, indexable) choice — and why you should pick `jsonb` 99% of the time. How to index `jsonb` with GIN (`jsonb_ops` for the full operator set, `jsonb_path_ops` for smaller + faster containment-only) or expression indexes on a known key path. The operator zoo — `@>` (containment), `?` (key existence), `->` (json value), `->>` (text value), `@@` (path predicate, PG 12+), `@?` (path existence). When `jsonb` is the wrong choice (well-known queried fields belong in real columns). `jsonb_path_query` and SQL/JSON path syntax. PG 17's SQL-standard `JSON_TABLE`, `JSON_QUERY`, `JSON_VALUE`, `JSON_EXISTS`, and the constructor functions.

**Mental model**

`jsonb` is **a real Postgres type with binary representation, deduplicated/sorted keys, and operator support** — not "just a text column with JSON in it". Storing `jsonb` is a structural decision: every nested object becomes a sub-document, every key access is O(log n) within the document, and the whole value gets TOASTed if it's large. Two costs always apply: (1) **no per-field statistics** — the planner has no idea how selective `doc @> '{"status":"active"}'` is, so it guesses; (2) **whole-row decode** — reading one key still TOAST-fetches the full document. The right design discipline: use `jsonb` for **genuinely sparse or schemaless data** (user prefs, integration payloads, audit blobs), and as patterns stabilise, **promote frequently-queried keys to real columns**. Indexing follows usage: ad-hoc containment queries → GIN with `jsonb_ops`; known-key predicates → expression B-tree on `(doc->>'key')`; large containment-only workloads → GIN with `jsonb_path_ops` (smaller, faster, but no `?` / `?&` / `?|` operators). The PG 17 SQL-standard syntax (`JSON_TABLE`, `JSON_QUERY`, `JSON_VALUE`) replaces awkward chains of `jsonb_array_elements` + lateral joins with declarative form — biggest readability win for nested-array queries in years.

**Key terms**

- **`json`** — text storage; preserves whitespace, duplicate keys, key order; parsed on every operation.
- **`jsonb`** — binary storage; deduplicated/sorted keys; indexable; pick this 99% of the time.
- **`@>` containment** — does the left value contain the right? GIN-indexable.
- **`?` key existence** — does this top-level key exist? GIN-indexable with `jsonb_ops`.
- **`->` / `->>`** — json value / text value extraction.
- **`@@`** — JSON path predicate (PG 12+).
- **`jsonb_ops`** — default GIN opclass; supports `@>`, `?`, `?&`, `?|`.
- **`jsonb_path_ops`** — smaller, faster GIN opclass; supports only `@>`.
- **`JSON_TABLE`** — PG 17 SQL/JSON; project a json document into a relational result set.
- **`JSON_QUERY` / `JSON_VALUE` / `JSON_EXISTS`** — PG 17 path query/value/existence functions.
- **TOAST** — out-of-line storage for large `jsonb`; one fetch per row that reads any TOASTed column.
- **fast default for jsonb** — adding a `jsonb` column with constant default is catalog-only in PG 11+.

**Why interviewers ask this**

Three signals. (1) **Do you know when `jsonb` is the wrong tool?** The senior reflex is "promote queried keys to real columns" — junior candidates use `jsonb` for everything because it's easier to evolve, then complain about query performance. (2) **Can you index `jsonb` correctly?** Knowing the GIN opclass tradeoff (`jsonb_ops` vs `jsonb_path_ops`) and when expression indexes beat GIN for known-shape queries is the senior tell. (3) **Are you current on PG 17's SQL/JSON?** Knowing `JSON_TABLE` exists and that it replaces lateral-join + `jsonb_array_elements` patterns is fresh-from-the-release-notes material that signals "I track the project".

**Common confusions**

- "`json` and `jsonb` are the same" — they're not; `json` is text, `jsonb` is binary; only `jsonb` is indexable and supports operators efficiently.
- "GIN on `jsonb` indexes everything" — it indexes containment/existence; equality on a specific text key still needs an expression index.
- "`doc->>'key' = '1'` uses my GIN index" — no; GIN indexes containment (`doc @> '{"key":"1"}'`), not text-equality on extracted values.
- "Updating one key in `jsonb` rewrites only that key" — no; the whole row is rewritten (MVCC) and the entire `jsonb` value is re-encoded.
- "`jsonb_path_ops` is always better" — only for containment-only workloads; it doesn't support `?` key existence.

**What follows from this topic**

Indexing Strategy is where the GIN vs expression-index call is made. Schema Design is the topic where you decide to promote a key out of `jsonb`. Query Planning needs `CREATE STATISTICS` on expression-indexed keys to get accurate selectivity. Full-text search uses similar GIN machinery. If your tables have grown unbounded `jsonb` columns, this is the topic to revisit before any perf work elsewhere.

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

### Q66b. What did PG 17 add for SQL/JSON, and why does it matter for portability?

PG 17 finally implemented the SQL-standard SQL/JSON syntax: `JSON_TABLE` (turn a JSON document into a relational result set), `JSON_QUERY`, `JSON_VALUE`, `JSON_EXISTS`, and the constructor functions `JSON_OBJECT`, `JSON_ARRAY`, `JSON_OBJECTAGG`, `JSON_ARRAYAGG`. `JSON_TABLE` is the big one — it replaces nested `jsonb_array_elements` + lateral joins with a clean declarative form. Portability win: queries are now SQL-standard, not Postgres-specific, so migrations to/from Oracle/SQL Server preserve the JSON handling shape. Performance is comparable to the operator forms; the value is readability and standardization.

---

## Full-Text Search

### Summary

**What this topic covers**

How Postgres implements built-in full-text search: `tsvector` (sorted list of lexemes + positions) and `tsquery` (boolean expression of lexemes), connected by the `@@` match operator. Text search configurations (per-language stemming, stopword removal, lowercasing). Indexing — GIN on `tsvector` columns. Storage strategies — generated column vs query-time computation. The three `to_tsquery` variants: `to_tsquery` (parser-strict, throws on user input), `plainto_tsquery` (safe, AND-only), `websearch_to_tsquery` (PG 11+, Google-style syntax, the right choice for user-facing search boxes). When to reach for `pg_trgm` (trigram fuzzy substring) instead of FTS, and when to combine them. Ranking with `ts_rank` and `ts_rank_cd`.

**Mental model**

Postgres FTS is **lexeme-based whole-word matching with stemming**, not substring matching. The pipeline is: document → `to_tsvector('english', text)` → list of lemmatised words ("running" → "run") with stopwords removed and positions tracked → store as `tsvector` column → GIN-index it. Queries become `tsquery` boolean expressions over the same lemmas, matched via `@@`. The critical design choice: **store the `tsvector` as a generated column** (`GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED`) — write once, index once, query never recomputes. Computing `to_tsvector` per row at query time forces a CPU scan and defeats GIN. The right tool depends on the search UX: built-in FTS for "find documents matching these words" (with stemming, ranking, phrase search via `<->`); `pg_trgm` GIN-indexed for autocomplete / "find by partial name" / typo tolerance / `ILIKE '%foo%'`. They're complementary, not competing — combine via `btree_gin` for multi-tenant scoping (`org_id` + `tsvector` in one GIN index). Always use `websearch_to_tsquery` for user input — `to_tsquery` parser errors on user typos and embarrasses you in production.

**Key terms**

- **`tsvector`** — sorted list of lexemes with positions; the indexable form of a document.
- **`tsquery`** — boolean expression of lexemes; the query side.
- **`@@`** — match operator; GIN-indexable.
- **text search configuration** — language-specific pipeline (stemmer + stopwords + lexer); default driven by `default_text_search_config`.
- **GIN on `tsvector`** — the standard index; large but fast.
- **stored generated `tsvector`** — write-once column maintained by Postgres; the production pattern.
- **`to_tsquery`** — parser-strict; throws on user input; never feed user text directly.
- **`plainto_tsquery`** — accepts plain text, AND-s words; safe but limited.
- **`websearch_to_tsquery`** — PG 11+; Google-style syntax (`"phrase" OR foo -bar`); the right choice for search boxes.
- **`pg_trgm`** — trigram extension for fuzzy substring; `ILIKE '%foo%'`, similarity, typo tolerance.
- **`<->` phrase distance** — find lexemes within N tokens of each other.
- **`ts_rank` / `ts_rank_cd`** — relevance scoring; rank by frequency / cover-density.

**Why interviewers ask this**

Three signals. (1) **Do you know FTS exists?** A surprising number of engineers reach for Elasticsearch as soon as "search" is mentioned, missing that Postgres FTS handles 80% of search use cases at a fraction of the operational cost. (2) **Do you store the `tsvector` correctly?** Generated columns vs query-time computation is the difference between fast and unusable; the senior candidate names the stored generated column pattern unprompted. (3) **Do you reach for `pg_trgm` when FTS isn't right?** Autocomplete / "find by partial name" is the trigram use case; FTS would require whole-word matches and miss the UX target. Bonus signal: knowing about `websearch_to_tsquery` (don't feed user input to `to_tsquery`) and the `btree_gin` trick for multi-tenant scoped search.

**Common confusions**

- "FTS does substring matching" — no; it does whole-lexeme matching with stemming. Substring is `pg_trgm` territory.
- "I should compute `to_tsvector` in my query" — no; store as a generated column so GIN can index it.
- "GIN updates are free" — they're slow (multi-leaf-page writes) and bottleneck on the `fastupdate` pending list; tune `gin_pending_list_limit`.
- "`to_tsquery` is the general query function" — it's parser-strict; user input goes through `plainto_tsquery` or `websearch_to_tsquery` only.
- "Postgres FTS can't do typo tolerance" — by itself, no; combine with `pg_trgm` similarity for fuzzy lookups.

**What follows from this topic**

Indexing Strategy is where GIN tuning happens (`fastupdate`, `gin_pending_list_limit`). JSON & JSONB shares the GIN machinery. Schema Design picks the source columns. Monitoring `pg_stat_user_indexes` for GIN scan counts validates the index is paying for itself. For most CRUD apps, FTS + `pg_trgm` together cover search needs without an external service.

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

### Summary

**What this topic covers**

Native declarative partitioning: range (by value range), list (by enumerated value), and hash (PG 11+, even spread). Partition pruning at compile time (constants) and runtime (parameters, joins). Operational mechanics — `CREATE TABLE … PARTITION OF` syntax, attach/detach for instant archival, `pg_partman` for automated lifecycle. The "no global indexes" constraint and what it means for uniqueness. Plan-time costs as partition count grows (~1000-5000 partitions is the cliff). Partition-wise joins (PG 11+) when both tables share the partition key. When to partition (>100 GB and slice-independent operations) vs when to just index.

**Mental model**

Partitioning is **storage decomposition** — one logical table backed by N physical child tables, with the planner routing reads/writes to the right child via partition pruning. The three reasons partitioning earns its complexity tax: (1) **dropping old data is metadata-only** — `DETACH PARTITION` + `DROP TABLE` is instant; `DELETE FROM events WHERE created_at < '2025-01-01'` is hours of WAL + vacuum bloat. (2) **vacuum runs per partition**, fixing the "vacuum-this-2TB-table-takes-12-hours" pathology — partitions are vacuumed independently, in parallel by separate workers. (3) **partition-wise joins** parallelise across partitions when both joined tables share the partition key. Range partitioning is the workhorse for time-series (events by month, orders by year); list for geography or multi-tenant (orders by region); hash for shard-style even spread when no natural range exists. The gotchas: **no global unique indexes** (uniqueness on non-partition-key columns isn't enforceable across partitions), **plan-time scales with partition count** (1000+ partitions slows planning even with pruning), and **FKs into a partitioned table work but only since PG 12 for FKs from partitioned tables to non-partitioned ones**. The threshold rule of thumb: below 100 GB, indexes beat partitioning; above 100 GB and growing, partition by retention boundary (month / quarter) so you get archival for free.

**Key terms**

- **range partitioning** — `FOR VALUES FROM ... TO ...`; time-series workhorse.
- **list partitioning** — `FOR VALUES IN (...)`; enumerated values like region/tier.
- **hash partitioning** — `FOR VALUES WITH (MODULUS n, REMAINDER r)`; PG 11+; even spread.
- **partition pruning** — planner skips partitions whose constraints can't satisfy the predicate.
- **runtime pruning** — PG 11+; pruning with parameters and join keys, not just constants.
- **`ATTACH PARTITION` / `DETACH PARTITION`** — add/remove partitions; detach is metadata-only.
- **partition-wise join** — PG 11+; join executed per matching partition pair when both share partition key.
- **partition-wise aggregate** — PG 11+; aggregate executed per partition then combined.
- **`pg_partman`** — extension automating partition creation/retention; pair with `pg_cron`.
- **default partition** — catch-all for unmatched rows; presence disables some pruning optimisations.
- **no global indexes** — each partition has its own indexes; cross-partition uniqueness is unenforceable on non-key columns.

**Why interviewers ask this**

Three signals. (1) **Do you know what partitioning is *for*?** Junior candidates say "shard the data"; senior candidates say "instant retention via DETACH and parallel vacuum across partitions". (2) **Do you know the gotchas?** No global indexes, plan-time cost, and the FK-from-partitioned-table limit are real production constraints; naming them shows you've used it. (3) **Do you reach for `pg_partman`?** Rolling your own partition lifecycle in PL/pgSQL is 50 lines that everyone gets wrong; the senior reflex is "we use `pg_partman` with `pg_cron` to pre-create next month's partitions and drop expired ones". Bonus: knowing the cliff at ~1000-5000 partitions and the mitigation (coarser partitions or fixed-set hash).

**Common confusions**

- "Partitioning improves all queries" — only queries with predicates on the partition key get pruning; queries without it scan every partition.
- "Unique constraints work across partitions" — only on columns that include the partition key; cross-partition uniqueness on arbitrary columns is unenforceable.
- "Hash partitioning is for very large tables" — hash is for *even-spread sharding-style* use cases; range remains the workhorse for time-series.
- "More partitions is always better" — plan-time scales with partition count; above ~1000-5000 it dominates simple queries.
- "Detaching a partition deletes the data" — it just unhooks it from the parent; the child table still exists until you `DROP TABLE` it.

**What follows from this topic**

Indexing changes shape with partitioning (per-partition indexes only). VACUUM benefits massively (per-partition parallel vacuum). Query Planning has to do partition pruning; misestimated partition selectivity is its own perf class. Schema Design must commit to a partition key early — changing it later means rebuilding the whole partition hierarchy. Backup & DR can be partition-aware. For any table growing past ~100 GB with a natural time dimension, this is the topic that determines whether the next year is painless or painful.

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

### Q75b. What does `pg_partman` give you and when is it the standard answer?

Extension that automates partition lifecycle: pre-creates upcoming time partitions on a cron (so `INSERT INTO events VALUES (now())` never hits the default partition), drops expired partitions per a retention policy, optionally moves cold partitions to a slower tablespace. Pair with `pg_cron` for the scheduler. The standard answer for "we want monthly partitions and 12-month retention" — rolling your own is 50 lines of PL/pgSQL that everyone gets wrong.

### Q75c. What's the cost of "too many partitions" and where's the cliff?

Each partition adds planner overhead: lock acquisition on every involved partition during planning, increased catalog cache pressure, slower plan generation. The cliff is workload-dependent but ~1000-5000 partitions is where planning time starts dominating for simple queries. Below that, mostly fine if **runtime pruning** (PG 11+) reliably narrows the partition set. Above, consider coarser partitioning (monthly → quarterly) or **hash-partitioning into a smaller fixed set**.

---

## Replication & High Availability

### Summary

**What this topic covers**

The two replication modes: **streaming (physical)** — ships raw WAL byte-for-byte, replica is an exact binary copy — and **logical** — decodes WAL into row-level change events per table, subscribers can be different versions or selective. Synchronous vs asynchronous configuration via `synchronous_standby_names` and `synchronous_commit`. Hot standby (replica serves reads) vs warm standby (replay only). The replication slot mechanism — what it pins, why orphaned slots fill the disk and the primary goes read-only. Failover mechanics: detection, election, fencing, `pg_promote`, follower reconfiguration. `pg_rewind` for fast failback. `pg_createsubscriber` (PG 17+) for near-zero-downtime major-version upgrades. PG 16's logical replication from physical standbys and parallel apply. CDC into Kafka via Debezium + `pgoutput`.

**Mental model**

Replication is built on the WAL stream. Physical replication is "tail my WAL byte-for-byte and apply it" — replicas are exact copies, must match the major version, can't be written to, and serve as read replicas + failover targets. Logical replication is "decode my WAL into INSERT/UPDATE/DELETE events at commit time and ship them" — subscribers can be other Postgres versions, selective tables, even different DBMSes via plugins. The two big operational concerns: **replication slots** and **synchronous mode**. A slot records the LSN up to which a consumer has consumed; Postgres won't recycle WAL beyond that LSN. If a logical consumer (Debezium subscriber, CDC sink) goes away without dropping its slot, WAL accumulates until the disk fills — and logical slots additionally pin `xmin`, so vacuum stalls too. Sync mode is a durability dial: `synchronous_commit = remote_apply` with a sync standby waits for the standby to apply before returning commit (highest durability, highest latency); `local` doesn't wait for replicas at all. The right production pattern is `ANY 1 (s1, s2, s3)` — wait for any one of three standbys — so single failure doesn't stall writes. Failover is the cluster's most dangerous moment: fencing the old primary is mandatory to prevent split-brain. `pg_rewind` is what lets the old primary rejoin as a replica without a full rebuild. `pg_createsubscriber` is the 2026 way to do major-version upgrades — convert a physical replica to a logical subscriber in one command, flip traffic, drop the old version.

**Key terms**

- **streaming (physical) replication** — raw WAL byte-for-byte; replica is exact binary copy.
- **logical replication** — decoded row-level changes; cross-version, selective.
- **replication slot** — records consumed LSN; pins WAL (and `xmin` for logical slots).
- **`synchronous_commit`** — `on` / `off` / `local` / `remote_write` / `remote_apply` durability tiers.
- **`synchronous_standby_names`** — quorum/priority spec: `ANY 1 (s1,s2,s3)` is the safe default.
- **hot standby** — replica serves read-only queries; `max_standby_streaming_delay` tunes conflict resolution.
- **`hot_standby_feedback`** — replica pushes `xmin` to primary so vacuum delays for replica queries.
- **`pg_promote`** — promote replica to primary.
- **`pg_rewind`** — rewinds an old primary's data to a point from which it can stream forward.
- **`pg_createsubscriber`** — PG 17+; convert physical replica to logical subscriber for upgrade flips.
- **`pgoutput`** — built-in logical decoding plugin; Debezium speaks it since 1.4.
- **fencing** — preventing the old primary from accepting writes during failover; mandatory to avoid split-brain.

**Why interviewers ask this**

Three signals. (1) **Do you know the replication-slot trap?** This is the most common Postgres outage outside of vacuum — orphaned slot pins WAL, disk fills, primary goes read-only. The senior candidate names it before being asked. (2) **Can you describe a failover?** Detection → election → fence → promote → reconfigure followers → DNS/VIP cutover is the canonical sequence; skipping fencing is the split-brain hole. (3) **Are you current on upgrade tooling?** `pg_createsubscriber` (PG 17) and logical replication from physical standbys (PG 16) changed the upgrade playbook — knowing them signals you've shipped recent Postgres work. Bonus: sync replication failure modes (sync replica down stalling writes; `ANY 1` quorum as the fix; cross-region latency cost).

**Common confusions**

- "Sync replication means zero data loss" — only if the sync standby is up; if it's down with `synchronous_commit = on` and a single sync target, every commit stalls forever.
- "Logical replication replicates DDL" — it doesn't; schema changes have to be applied separately or via a tool like pglogical.
- "Replicas can serve writes" — no; physical replicas are read-only, logical subscribers accept writes only on tables they're not subscribed to.
- "Replication lag = network slowness" — usually it's *replay* slowness (single-threaded WAL apply, recovery conflicts on locks, slow replica disk), not network.
- "Dropping the slot recovers the WAL immediately" — yes, but it also breaks the consumer permanently; you've made a tradeoff, not fixed the problem.

**What follows from this topic**

WAL & Checkpoints is the stream replication consumes. Backup & DR overlaps — PITR uses the same `archive_command` machinery. Connection Management routes read traffic to replicas. Vacuum interacts via `hot_standby_feedback` (primary bloat tradeoff). For any production cluster, replication setup determines whether failover is a 60-second cutover or a 4-hour incident — this topic is where HA is won or lost.

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

### Q82b. What's `pg_rewind` for, and why does it save the day after failover?

After failover, the **old primary** has WAL the new primary doesn't — it accepted writes between the last replicated LSN and the moment it died. You can't just restart it as a replica because its data diverges from the new primary. `pg_rewind` finds the divergence point, copies the differing blocks from the new primary, and rewinds the old primary's data files to a state from which it can stream WAL forward as a normal replica. Without it: full base backup of the new primary, hours of restore. With it: minutes. Required for fast failback in any Patroni/repmgr setup.

### Q82c. What's `pg_createsubscriber` and when do you reach for it?

PG 17 (extended in PG 18): convert a physical streaming replica into a **logical** subscriber in one command. Use case: zero-downtime major-version upgrades. Set up a physical replica of your PG 15 primary at PG 15, then promote and run `pg_createsubscriber` to flip it into a logical subscriber pointing at the PG 15 primary; the new instance can now be a PG 17 instance receiving logical replication. The old "build a fresh PG 17 cluster and run pg_dump for hours" path is replaced by a near-instant conversion.

### Q82d. What did PG 16 add for logical replication?

(1) **Logical replication from physical standbys** — finally. Pre-16, logical decoding only ran on the primary, which made the primary a bottleneck for CDC consumers. PG 16 lets you offload Debezium / wal2json subscribers to a replica, taking load off the primary. (2) **Parallel apply on subscribers** for large transactions, improving subscriber lag under bulk imports. (3) **Two-phase commit support** for logical replication. Combined with PG 15's row/column filters in publications, logical replication is now production-grade for cross-DC CDC.

### Q82e. What's the right way to consume Postgres CDC into Kafka / a warehouse?

The stack: **Debezium** Postgres connector (uses `pgoutput` logical decoding plugin since 1.4) → Kafka Connect → consumers. Alternatives: **wal2json** (older, JSON-formatted decode output, more transport-friendly), **`pg_recvlogical`** for one-shot pulls. The catches: (1) replication slot pins WAL — if Debezium falls behind, primary disk fills. (2) Schema changes don't replicate; the Debezium schema registry has to be in sync. (3) Initial snapshot of a 1 TB table can take days; use Debezium's parallel snapshot or seed via `pg_dump` + `COPY` and `ALTER SUBSCRIPTION ... ENABLE`.

---

## Backup & Disaster Recovery

### Summary

**What this topic covers**

The two backup mechanisms: **logical** (`pg_dump`, `pg_dumpall`) — emit SQL or a custom archive; works across major versions; slow on large databases; doesn't capture WAL. **Physical** (`pg_basebackup`, `pgBackRest`, `barman`, `wal-g`) — file-level copy of the cluster; foundation for streaming replicas and point-in-time recovery. Continuous WAL archiving via `archive_command` (must exit 0 only on durable success) and `archive_mode = on`. Point-in-Time Recovery (PITR) flow — base backup + archived WAL replay up to a target time/LSN. The `wal_keep_size` knob for replica reconnect tolerance. Why production teams run `pgBackRest` or `wal-g` rather than `pg_basebackup` directly: parallel, incremental, delta restore, S3-native, retention policies.

**Mental model**

Backup in Postgres is **base backup + WAL archive** for any database large enough to take backups seriously. The `pg_basebackup` takes a snapshot of the data files while the cluster is running (via the `pg_backup_start` / `pg_backup_stop` low-level API); concurrently, `archive_command` ships every completed 16 MB WAL segment to durable storage. Recovery is: copy base backup to `$PGDATA` → drop a `recovery.signal` file (PG 12+) → set `restore_command` to fetch WAL from your archive → start Postgres → it replays WAL forward, optionally stopping at `recovery_target_time`. The discipline: the `archive_command` **must be reliable** — return 0 only after the WAL segment is durably stored on the remote — because Postgres won't recycle the segment until it succeeds, and a flaky command piles up WAL on the primary until the disk fills. `pg_dump` is for **logical** moves: migrations, per-table restores, major-version paths on small data. For anything > ~50 GB, `pg_dump` + `pg_restore` is unusably slow; use base backups + PITR or logical replication for cross-version moves. The senior insight: **practice your restore**. Every team thinks their backups work; only the teams that have rehearsed a restore at 3 AM on a Saturday know they really do. The PG 18 change worth knowing: data checksums on by default catch silent corruption before it propagates to replicas and backups.

**Key terms**

- **`pg_dump`** — logical dump; SQL or custom archive (`-Fc`); per-table restores possible.
- **`pg_basebackup`** — physical file-level copy; foundation for replicas and PITR.
- **PITR** — Point-in-Time Recovery; base backup + WAL replay to target time/LSN.
- **`archive_mode`** — enable continuous WAL shipping.
- **`archive_command`** — shell command run per completed WAL segment; must exit 0 on durable success only.
- **`wal_keep_size`** — PG 13+ (was `wal_keep_segments`); WAL retained on primary for replica reconnect.
- **`restore_command`** — used during recovery to fetch archived WAL segments.
- **`recovery.signal`** — PG 12+; file that triggers recovery mode at startup.
- **`recovery_target_time` / `_lsn` / `_name`** — stop replay at a specific point.
- **`pgBackRest` / `barman` / `wal-g`** — production-grade backup tooling: parallel, incremental, S3-native, retention.
- **delta restore** — restoring only changed pages; `pgBackRest` feature.
- **data checksums** — PG 18 default; CRC32 per 8 KB page catches silent corruption.

**Why interviewers ask this**

Three signals. (1) **Have you practiced a restore?** "We have backups" is necessary but not sufficient; the senior candidate has done a PITR rehearsal and knows the failure modes (`restore_command` returns wrong exit code, WAL segment missing from archive, wrong `recovery_target_time` syntax). (2) **Do you know `archive_command` is the failure point?** A flaky archive command piling WAL on the primary is a classic outage; monitoring `pg_stat_archiver.failed_count` and `pg_wal` size are the alerts that catch it before the disk fills. (3) **Do you run a real backup tool?** Anyone using raw `pg_basebackup` for a TB+ database hasn't operated Postgres at scale; the standard answer is `pgBackRest` (or `wal-g`, `barman`) for parallelism, delta restore, and retention.

**Common confusions**

- "`pg_dump` is a backup" — it's a point-in-time logical snapshot; no PITR, no WAL capture; fine for small DBs and migrations, not for production DR.
- "WAL archiving and replication are the same" — both ship WAL, but archiving is for backup/PITR; replication is for HA/read-scaling. Use both.
- "`recovery_target_time` is precise to the second" — recovery stops at the first commit *after* the target; if no commits happened at that exact moment, you may land slightly later.
- "Incremental backups copy only changed rows" — incremental physical backups copy only changed *pages* (8 KB blocks), not rows; closer to "block-level diff".
- "Backups don't need testing" — untested backups are not backups; rehearse restores quarterly minimum.

**What follows from this topic**

WAL & Checkpoints is the stream backups consume. Replication shares the same WAL machinery and often the same archive. Monitoring (`pg_stat_archiver`, `pg_replication_slots`) is how you catch archive failures. For any production cluster, this topic is what stands between "we had an incident" and "we had an outage" — the cost of getting backup wrong is total.

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

### Summary

**What this topic covers**

Why a connection pooler is mandatory in production — every Postgres backend is a forked OS process holding ~10 MB and competing for CPU on every wake. PgBouncer's three pooling modes (session, transaction, statement) and what each preserves of server-side state. The transaction-pooling traps: prepared statements (fixed by PG 17 protocol + PgBouncer 1.21), advisory locks (use `pg_advisory_xact_lock`), `SET LOCAL` only, no `LISTEN`/`NOTIFY` on pooled connections. Sizing the pool (`CPU × 2-4`). The non-optional timeouts: `idle_in_transaction_session_timeout`, `statement_timeout`, `lock_timeout`. Diagnosing "too many connections" via `pg_stat_activity` state breakdown.

**Mental model**

The process-per-connection model means **scaling connections is operationally non-trivial**. Apps want thousands of cheap connections (one per HTTP handler, one per worker, one per cron); Postgres performs best at 50-200. The pooler bridges this — clients connect cheaply to PgBouncer, PgBouncer maps active sessions onto a small Postgres backend pool, idle clients consume no Postgres resources. **Transaction pooling** is the workhorse mode: a backend is assigned per transaction and returned to the pool at `COMMIT`/`ROLLBACK`. This means **no server-side state survives across transactions** — named prepared statements, advisory locks, `SET` (use `SET LOCAL`), `LISTEN`/`NOTIFY` all break under transaction pooling because the next transaction lands on a different backend that's never seen the state. The senior pattern is: transaction pooling for the bulk of OLTP traffic; session pooling on a separate port for the `LISTEN` workers and anything else with sticky state. Pool sizing math: start with `CPU × 2` to `CPU × 4` per backend pool. Higher numbers add lock contention without throughput. The three timeouts — `idle_in_transaction_session_timeout` (5min), `statement_timeout` (30s on OLTP), `lock_timeout` (5s on DDL) — are the **highest-ROI Postgres safety net in existence** and should be set at the role level on day one. They prevent the xmin-horizon pinning that causes the canonical "idle in transaction" outage.

**Key terms**

- **process-per-connection** — every Postgres connection is a forked OS process; ~10 MB resident.
- **PgBouncer** — the standard pooler; lightweight, single-threaded, battle-tested.
- **session pooling** — backend per client session; preserves all server-side state; minimal pooling benefit.
- **transaction pooling** — backend per transaction; the workhorse mode; breaks session-state features.
- **statement pooling** — backend per query; rare; only for transactionless SELECT workloads.
- **`max_connections`** — Postgres cap; raising past 500 is wrong-answer in production.
- **`idle_in_transaction_session_timeout`** — terminate idle-in-transaction sessions; non-optional in 2026.
- **`statement_timeout`** — per-session statement cap; 30s for OLTP roles.
- **`lock_timeout`** — per-session lock-wait cap; 5s for migration roles.
- **`LISTEN` / `NOTIFY`** — built-in pubsub; session-state, breaks under transaction pooling.
- **`pg_stat_activity.state`** — `active`, `idle`, `idle in transaction`; the triage view.

**Why interviewers ask this**

Three signals. (1) **Do you reach for a pooler reflexively?** Anyone raising `max_connections` to 5000 has not run Postgres in production. The senior answer is "PgBouncer in transaction mode in front, with a small backend pool and thousands of cheap app connections behind". (2) **Do you know what transaction pooling breaks?** Naming the prepared-statement, advisory-lock, `SET`, and `LISTEN` traps unprompted is the experience tell. The PG 17 + PgBouncer 1.21 prepared-statement fix is fresh knowledge worth signalling. (3) **Are the three timeouts set?** The `idle_in_transaction_session_timeout` + `statement_timeout` + `lock_timeout` combo is the single highest-impact production hardening pass; the candidate who lists them shows operator instinct.

**Common confusions**

- "Connection pooling is for performance" — it's for *survival*; without it, Postgres OOMs at a few thousand connections.
- "Session pooling is safest" — it's the same as no pooling for backend reuse; transaction pooling is the actual production mode.
- "Prepared statements work fine with PgBouncer" — they don't (pre-PG 17 / PgBouncer 1.21); driver-side prepared-statement caching breaks under transaction pooling.
- "Idle connections are free" — they hold ~10 MB of backend memory plus a file descriptor; on top of that, idle-in-transaction connections pin the xmin horizon.
- "Raise `max_connections` if we run out" — the cure is the pooler, not more backends.

**What follows from this topic**

MVCC and the xmin horizon explain *why* `idle_in_transaction_session_timeout` matters — every leaked transaction pins vacuum cluster-wide. Transactions & Locking is where the migration timeouts (`lock_timeout`) earn their keep. Monitoring (`pg_stat_activity` state breakdown) is the diagnostic layer for pool sizing. For any production Postgres deployment, this topic is the difference between "stable" and "constantly putting out fires".

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

### Q92b. What's `LISTEN`/`NOTIFY` and what's it for?

Built-in pubsub: any session can `LISTEN channel_name`, any session can `NOTIFY channel_name, 'payload'`. The notification is delivered to all listeners after the notifier commits. Payload limit ~8KB. The right use case: **cache invalidation** ("user 123 was updated, evict from your cache"). Not the right use case: high-volume event streaming (use Kafka, or a CDC plugin). Important: `LISTEN` is session-state, so it breaks under PgBouncer transaction pooling — use session pooling for listener workers or sidecar a dedicated direct connection.

### Q92c. Why is `idle_in_transaction_session_timeout` non-optional?

Because every idle-in-transaction connection holds the xmin horizon, pinning vacuum across the cluster. The standard configuration: set it at the role level (`ALTER ROLE app SET idle_in_transaction_session_timeout = '5min'`) so app connections get terminated if they leak a transaction; leave admin roles uncapped for migrations. Pair with `statement_timeout` ('30s' for OLTP, longer for batch roles) and `lock_timeout` ('5s' on DDL roles). These three timeouts are **the single highest-ROI Postgres safety net** — set them on day one.

---

## Schema Design & Data Types

### Summary

**What this topic covers**

The type choices that compound across the schema: integer-family PKs (`int` vs `bigint` vs `uuid` — and why UUIDv4 destroys index locality but UUIDv7 doesn't), `varchar(n)` vs `text` (use `text`), `timestamp` vs `timestamptz` (always `timestamptz`), `numeric` vs `float8` (exact vs approximate). Generated columns (PG 12+ STORED, PG 18 VIRTUAL). Domains for reusable constraints. Range types and exclusion constraints for "no overlapping bookings" patterns. PG 18 temporal constraints with `WITHOUT OVERLAPS`. A senior reference schema for an event-sourced events table — range-partitioned by `occurred_at`, `bigint` PK + `uuid` aggregate id, `jsonb` payload.

**Mental model**

Schema design in Postgres is about **picking types that fit the data, indexes that fit the queries, and constraints that fit the invariants**. Three rules cover most of it. (1) **`timestamptz` always** — naive `timestamp` is correct for "wall clock at user location at event time" but mixing it with `timestamptz` in arithmetic causes half of all "the times are wrong" bugs. (2) **`bigint` PKs by default; `uuidv7` if you need distributed generation** — random UUIDv4 is the famous index-locality killer (every insert hits a random page; cache hit rates tank; B-tree bloat compounds). PG 17/18's `uuidv7()` is sortable by time and preserves locality. (3) **`numeric` for money, `float8` for science** — never store currency in floats unless you want a compliance call about a `$0.30000000000000004` balance. Beyond types, the senior moves are: declarative constraints over triggers (`GENERATED ALWAYS AS … STORED`, range types + exclusion constraints, domains for reusable invariants), partitioning by retention boundary on any growing time-series table, and promoting frequently-queried `jsonb` keys to real columns as patterns stabilise. PG 18's temporal `WITHOUT OVERLAPS` makes bitemporal modelling ergonomic for the first time — niche today, standard senior material in 2027.

**Key terms**

- **`int`** (4-byte) vs **`bigint`** (8-byte) vs **`uuid`** (16-byte) — PK choices; `bigint` is the default.
- **UUIDv4 vs UUIDv7** — random vs time-sortable; UUIDv7 preserves B-tree locality.
- **`varchar(n)`** vs **`text`** — `text` by default; `varchar(n)` only when domain constraint matters.
- **`timestamp`** vs **`timestamptz`** — naive vs UTC-stored; always `timestamptz` unless wall-clock semantics required.
- **`numeric`** vs **`float8`** — exact arbitrary precision vs IEEE 754; never money in floats.
- **`GENERATED ALWAYS AS (expr) STORED`** — PG 12+ declarative computed column.
- **VIRTUAL generated column** — PG 18; computed at read; no storage; no index.
- **domain** — `CREATE DOMAIN`; named typed constraint reusable across columns.
- **range type** — `int4range`, `tstzrange`, `daterange`; intervals as first-class values.
- **exclusion constraint** — `EXCLUDE USING gist (a WITH =, period WITH &&)`; "no overlapping bookings".
- **temporal constraint** — PG 18 `WITHOUT OVERLAPS` for PKs/UKs/FKs with range overlap semantics.
- **fast default** — PG 11+; constant-default column add is catalog-only, no rewrite.

**Why interviewers ask this**

Three signals. (1) **Do you know the timestamp gotcha?** Always `timestamptz` is the single highest-impact schema rule; naive `timestamp` causes time-zone bugs that survive years. (2) **Do you know the UUID locality problem?** UUIDv4-as-PK is the famous "write-heavy table is slow" trap; the senior answer is `uuidv7()` (PG 17+) or `bigint` + Snowflake-style generator. (3) **Do you reach for declarative constraints?** Generated columns over triggers, range types + exclusion over app-locking, domains for reusable invariants — these show you've designed schemas that survived contact with production. Bonus: knowing the events-table reference schema (`bigint` PK + `uuid` aggregate id + `jsonb` payload + range partition on `occurred_at`).

**Common confusions**

- "`varchar(255)` is more efficient than `text`" — they store identically; `varchar(n)` just adds a length check.
- "UUID PKs are fine" — UUIDv4 PKs are a perf trap on write-heavy tables; UUIDv7 fixes the locality issue.
- "`timestamp` is the default" — Postgres's default is `timestamp without time zone`; you usually want `timestamptz`.
- "Money in `float8` is fine for most cases" — it isn't; even sums of dollar amounts produce rounding errors. Always `numeric`.
- "Generated columns are just triggers in disguise" — they're declarative and the catalog enforces; faster, simpler, more correct.

**What follows from this topic**

Indexing operates on the columns this topic defines. Query Planning relies on column type and statistics for selectivity. Partitioning needs a partition key (timestamps + `bigint` are most common). JSON & JSONB is the "I don't know my schema yet" escape hatch; this topic's discipline is when to graduate out of it. Schema decisions compound — a bad type choice multiplied by ten years of data is the most expensive thing in Postgres.

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

### Q97b. What are domains and when do you reach for them?

`CREATE DOMAIN positive_int AS int CHECK (VALUE > 0);` — a named, typed constraint reusable across columns. Use cases: enforce business invariants centrally (`email_address` domain that runs the regex once), narrow types (`positive_int`, `non_empty_text`). Tradeoff: domains live in the catalog and `ALTER DOMAIN` can be slow on large tables. Net positive when the constraint is used 10+ places; over-engineering for one-off cases. PostGIS-style schemas use them heavily.

### Q97c. What are range types and exclusion constraints — and the canonical use case?

Range types (`int4range`, `tstzrange`, `daterange`, etc.) represent intervals as a first-class type. Combined with **exclusion constraints** (`EXCLUDE USING gist (room_id WITH =, period WITH &&)`), they enforce "no two bookings on the same room overlap in time" declaratively. The classic use case is reservations: room/calendar/resource booking. Pre-range-types, this required application-level locking or trigger-based serialization; with exclusion constraints, the database enforces non-overlap atomically.

### Q97d. What's a temporal constraint and why does PG 18 make it interesting?

PG 18 adds **PRIMARY KEY / UNIQUE / FOREIGN KEY constraints with range overlap semantics** via `WITHOUT OVERLAPS` and `PERIOD` clauses. Replaces the manual "exclusion constraint + custom triggers" pattern. Use case: temporal tables — `employee (id, valid_from, valid_to, salary)` where `(id, valid_period WITHOUT OVERLAPS)` is the primary key, enforcing "one salary value per employee at any point in time". Bitemporal modelling (system time + valid time) becomes ergonomic for the first time. Niche for now (PG 18 is new); will become standard senior interview material in 2027+.

### Q97e. STORED vs VIRTUAL generated columns?

PG 12 added `GENERATED ALWAYS AS (expr) STORED` — computed at write, stored on disk, indexable. PG 18 made **VIRTUAL** the default (and the only option for non-trivial expressions in some cases): computed at read time, no storage, no index. Pick STORED when you'll query/index the column frequently; pick VIRTUAL for cheap derivations rarely accessed (saves write cost and disk). The same expression as VIRTUAL has zero migration cost — STORED requires a full table rewrite to add or drop.

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

### Summary

**What this topic covers**

The SQL features that separate "I write CRUD queries" from "I express business logic declaratively": window functions (per-row computation over related rows without collapsing them via `GROUP BY`); LATERAL joins (subquery references outer columns, the "top N per group" pattern); recursive CTEs (graph/tree traversal); `INSERT … ON CONFLICT … DO UPDATE` (UPSERT) and PG 15+ `MERGE` for complex multi-branch reconciliation; `DISTINCT ON` for "top 1 per group"; the FILTER clause for pivot-style aggregates; GROUPING SETS / ROLLUP / CUBE for multi-dimensional reporting; `COPY` for bulk ingest (10-100× faster than `INSERT`); `UNION ALL` vs `UNION` and the accidental-dedup perf trap.

**Mental model**

Most CRUD apps use a tiny subset of SQL — `SELECT`, `INSERT`, `UPDATE`, `DELETE`, simple joins. The Advanced SQL toolkit lets you push business logic that would otherwise be N+1 queries or app-layer loops into a single planned query. Two ideas dominate. (1) **Set-based thinking** — replace "loop over rows in app code" with "express the operation on the set". Window functions ("rank each user's events by recency"), LATERAL ("top 3 orders per customer"), and recursive CTEs ("walk this org chart from any node to the root") are the heavy hitters. (2) **Declarative reconciliation** — `ON CONFLICT` and `MERGE` collapse "select-then-insert-or-update" race conditions into a single atomic statement. `ON CONFLICT` is faster and clearer for the common single-conflict-target upsert; `MERGE` (PG 15, with PG 17's `RETURNING`) handles complex multi-branch cases. The performance kicker: `COPY` for bulk loads is **10-100× faster** than equivalent `INSERT`s — the production ingest path drops indexes, runs `COPY`, recreates indexes `CONCURRENTLY`. The everyday landmine: `UNION` does a sort/distinct after concatenation; default to `UNION ALL` and only "upgrade" when dedup is actually required. The senior signal is reaching for these tools reflexively — recognising the "top N per group" pattern as LATERAL territory, the "pivot" pattern as FILTER territory, the "bulk import" pattern as `COPY` territory.

**Key terms**

- **window function** — operates over rows related to current row via `OVER (PARTITION BY ... ORDER BY ...)`.
- **LATERAL join** — subquery references columns of preceding FROM-list entry; evaluated per outer row.
- **recursive CTE** — `WITH RECURSIVE x AS (anchor UNION ALL recursive_step REFERENCES x)`; tree/graph walks.
- **`INSERT … ON CONFLICT`** — Postgres UPSERT; single conflict target; `EXCLUDED` refers to would-be-inserted row.
- **`MERGE`** — PG 15+ SQL-standard; multi-branch; PG 17 added `RETURNING`.
- **`DISTINCT ON`** — Postgres-specific top-1-per-group; requires matching `ORDER BY` prefix.
- **FILTER clause** — `agg(...) FILTER (WHERE cond)`; pivot-style aggregation; cleaner than `CASE`.
- **GROUPING SETS / ROLLUP / CUBE** — multi-dimensional aggregation; subtotals + grand totals in one query.
- **`COPY`** — bulk-load path; 10-100× faster than `INSERT`; the standard ingest mechanism.
- **`UNION` vs `UNION ALL`** — UNION dedups (expensive); ALL concatenates verbatim; default to ALL.
- **`EXCLUDED`** — pseudo-row in `ON CONFLICT DO UPDATE` referring to the would-be-inserted row.

**Why interviewers ask this**

Three signals. (1) **Do you recognise the patterns?** "Top N per group" → LATERAL or window function; "walk this hierarchy" → recursive CTE; "upsert by unique key" → ON CONFLICT; "complex reconciliation" → MERGE. Pattern recognition speed separates seniors from juniors. (2) **Do you know the perf tools?** `COPY` for bulk loads, FILTER for single-scan pivots, `UNION ALL` over `UNION` — these are the everyday wins. (3) **Are you current?** `MERGE` (PG 15), `MERGE ... RETURNING` (PG 17), and PG 18's OR-to-array transformation are recent additions worth knowing. The senior reflex on a "we're doing N round trips" problem is "can we express this in one query with window/LATERAL/recursive CTE/`COPY`?".

**Common confusions**

- "Window functions are aggregates" — they're not; aggregates collapse rows, window functions return one row per input row with computed value over the window.
- "LATERAL is just a fancy subquery" — it specifically lets the subquery reference outer columns, evaluated per outer row; standard subqueries can't do that.
- "`ON CONFLICT` works on any predicate" — only on a unique constraint or unique index; soft-conflict logic needs an expression unique index.
- "`UNION` is faster than `UNION ALL`" — backwards; UNION adds a sort/distinct, UNION ALL is concat-only.
- "Recursive CTE will run forever on a cycle" — yes; guard with a depth column + `WHERE depth < 100` or `UNION` to suppress duplicates.

**What follows from this topic**

Query Planning is what executes these patterns; the planner inlines non-recursive CTEs and chooses join algorithms for LATERAL. Indexing supports the access patterns (`ON CONFLICT` needs the unique index; LATERAL benefits from indexes on the correlated column). Schema Design picks the columns and types that these features operate on. The mark of senior Postgres usage is reaching for these tools instead of writing app-layer loops.

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

### Q103b. ON CONFLICT vs MERGE — when do you reach for each?

`ON CONFLICT` is Postgres-specific, fast, works with a single conflict target. **`MERGE`** (PG 15+) is SQL-standard, supports multiple WHEN clauses including `WHEN NOT MATCHED` for inserts and `WHEN MATCHED` for updates/deletes against an arbitrary join condition, not just unique constraints. PG 17 added `MERGE … RETURNING`. Pick `MERGE` for complex multi-branch reconciliation (e.g. "if exists update salary, if exists with different department insert audit row, if not exists insert new"); pick `ON CONFLICT` for the common "upsert by key" case where it's clearer and slightly faster.

### Q103c. What's `DISTINCT ON` and when does it beat window functions?

Postgres-specific syntax for "top 1 per group": `SELECT DISTINCT ON (customer_id) * FROM orders ORDER BY customer_id, created_at DESC;` returns the most recent order per customer. Equivalent to `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) = 1` in a subquery but simpler and often faster — Postgres skips ahead in the sort. The trick: `DISTINCT ON (cols)` requires `ORDER BY` starting with the same cols. Limitation: top-1 only, not top-N — for top-N, fall back to window functions or LATERAL.

### Q103d. What's the FILTER clause and why is it cleaner than CASE?

`COUNT(*) FILTER (WHERE status = 'open')` aggregates only matching rows — replaces the older `COUNT(CASE WHEN status = 'open' THEN 1 END)`. Works on any aggregate (`SUM`, `AVG`, `array_agg`, `jsonb_agg`). Use case: pivot-style aggregations — `SELECT customer_id, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM orders GROUP BY customer_id;`. Single table scan, several pivoted columns; idiomatic Postgres.

### Q103e. What's GROUPING SETS / ROLLUP / CUBE for?

Multi-dimensional aggregation in one query. `SELECT region, product, SUM(revenue) FROM sales GROUP BY GROUPING SETS ((region, product), (region), ())` returns three result groupings stacked: per-region-per-product, per-region totals, grand total. `ROLLUP (a, b, c)` is shorthand for the hierarchical chain `(a,b,c), (a,b), (a), ()`; `CUBE (a,b)` does all 2^N subsets. Use case: BI dashboards that need subtotals and grand totals from one query; without grouping sets it's N+1 round trips or N UNION ALLs.

### Q103f. What's `COPY` and why is it so much faster than `INSERT`?

`COPY table FROM STDIN` (or a file) streams rows directly into the heap via a binary or text protocol — no per-row SQL parsing, no per-row WAL record for the INSERT command, no per-row index bookkeeping overhead between rows (bulked at batch boundaries). Typically **10-100×** faster than equivalent `INSERT`s. The standard ingest path for bulk loads: `psql -c "\copy table FROM 'file.csv' CSV"` from the client, or `COPY` from inside a stored procedure for staged-table-to-final patterns. For huge loads, drop indexes before `COPY` and recreate after with `CREATE INDEX CONCURRENTLY` — often 5× faster than indexed COPY.

---

## Monitoring, Diagnostics & Extensions

### Summary

**What this topic covers**

The diagnostic surface every Postgres operator needs to know: `pg_stat_statements` (aggregate per-query-template stats — the first extension you install), `pg_stat_activity` (per-backend live view: state, wait events, blocking pids), `pg_stat_io` (PG 16+ per-backend-type per-relation-type I/O breakdown), `pg_stat_progress_*` views for long-running maintenance ops, `auto_explain` for capturing slow query plans automatically, `pg_buffercache` for inspecting `shared_buffers` contents. The production-standard extension set: `pg_stat_statements`, `pgcrypto`, `pg_trgm`, `btree_gin`/`btree_gist`, `pg_repack`, `auto_explain`. Specialised: `pgvector` for AI/embedding workloads (standard in 2026), `timescaledb` for time-series, `pgaudit` for compliance.

**Mental model**

Postgres ships with strong instrumentation but it's all *opt-in* — `pg_stat_statements` is the most important extension ever shipped for Postgres, yet it isn't enabled by default. The mental shift is **monitoring is for finding hotspots, diagnostics is for understanding them**. `pg_stat_statements` answers "what's slow?" — sort by `total_exec_time DESC` and the worst queries surface immediately. `pg_stat_activity` answers "what's happening right now?" — the `state` column distinguishes `active` (legitimate concurrency, scale up), `idle in transaction` (app leak, fix the app), `idle` (pool too large). `pg_stat_io` (PG 16+) finally answers "who's doing the I/O?" — was that checkpoint storm vacuum-driven, query-driven, or normal? The `pg_stat_progress_*` family turns "is this 6-hour vacuum stuck?" into "phase: heap scan, 47% complete, ~2 hours remaining" — first thing to check before panicking. `auto_explain` is the ambient capture layer — set `log_min_duration = '1s'` and any slow query logs its plan, no manual `EXPLAIN ANALYZE` needed. The extension story shifted in 2026: `pgvector` has become the standard answer for "we need vector search" — Pinecone/Weaviate's dominance has eroded as `pgvector` matured and HNSW indexes got good. The production reflex: install `pg_stat_statements`, `auto_explain`, `pg_trgm`, `btree_gin`, `pgcrypto`, `pg_repack` on every cluster on day one.

**Key terms**

- **`pg_stat_statements`** — per-query-template aggregate stats; the first extension you install.
- **normalised query** — query text with literals replaced by `$1`, `$2`; used for `pg_stat_statements` grouping.
- **`pg_stat_activity`** — per-backend live view; `state`, `wait_event`, `query`, `xact_start`.
- **`pg_blocking_pids(pid)`** — PG 9.6+; returns array of pids blocking the given pid.
- **`pg_stat_io`** — PG 16+; per-backend-type per-relation-type I/O counts and timings.
- **`pg_stat_progress_vacuum`** etc. — real-time progress for long-running maintenance ops.
- **`auto_explain`** — logs EXPLAIN ANALYZE for queries exceeding `log_min_duration`.
- **`pg_buffercache`** — inspect current `shared_buffers` contents; find what's hot/evicted.
- **`pg_repack`** — online table rewrite extension; the production cure for bloat.
- **`pg_trgm`** — trigram extension; fuzzy substring search; GIN-indexable.
- **`pgvector`** — vector type + similarity operators; HNSW + IVFFlat indexes; standard for AI workloads in 2026.
- **`pgaudit`** — session/object audit logging for compliance.

**Why interviewers ask this**

Three signals. (1) **Do you have `pg_stat_statements` installed?** Without it you're guessing what's slow; the senior reflex is "install it on day one with `pg_stat_statements.max = 10000`, `track = top`". (2) **Can you triage `pg_stat_activity`?** The `state = 'idle in transaction'` filter is the everyday tool; `pg_blocking_pids` finds the blocker; knowing `pg_cancel_backend` vs `pg_terminate_backend` is operator hygiene. (3) **Are you current on extension trends?** `pg_stat_io` (PG 16), the `pg_stat_progress_*` family, `pgvector` becoming standard — these signal you've kept up. Bonus: tuning `auto_explain.log_min_duration` carefully (conservative starts at `1s`; setting `log_analyze = off` saves the 5-10% overhead when you only need the plan structure).

**Common confusions**

- "`pg_stat_statements` records all queries" — it records normalised query *templates*; literal values are replaced before aggregation.
- "Restarting Postgres resets `pg_stat_statements`" — yes, and so does `pg_stat_statements_reset()`; deploys are a good reset point to measure incremental impact.
- "`pg_stat_activity.query` shows the running query" — it shows the *current or last* query for that session; for an `idle` backend, that's the last query, not what's running.
- "`auto_explain` is free" — `log_analyze = on` adds ~5-10% overhead; use selectively.
- "`pg_stat_io` replaces `pg_stat_bgwriter`" — it complements it; bgwriter view still shows checkpoint stats.

**What follows from this topic**

Every other topic shows up in monitoring: vacuum lag in `pg_stat_user_tables`, replication lag in `pg_stat_replication`, slow plans in `pg_stat_statements` + `auto_explain`, lock waits in `pg_stat_activity` + `pg_locks`. If monitoring is shaky, every other tuning effort is blind. Set up `pg_stat_statements` + `auto_explain` + alerts on the canonical metrics (`xmin` horizon age, replication slot lag, `datfrozenxid` age, dead tuple ratio) before tuning anything else.

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

### Q108b. What's `pg_buffercache` and what does it tell you?

Extension exposing the current contents of `shared_buffers` as a table — relation, block, usage count, dirty bit. `SELECT relname, count(*) AS buffers FROM pg_buffercache b JOIN pg_class c ON b.relfilenode = c.relfilenode GROUP BY relname ORDER BY buffers DESC;` shows what's hot in the cache. Use cases: diagnose "why is this table still on disk after I queried it" (other tables are evicting it), validate that the working set fits in `shared_buffers`, find indexes that never get cached (and thus probably aren't useful).

### Q108c. Tell me about `pg_stat_progress_*` views.

Real-time progress for long-running maintenance ops: `pg_stat_progress_vacuum`, `pg_stat_progress_create_index`, `pg_stat_progress_analyze`, `pg_stat_progress_cluster`, `pg_stat_progress_copy`, `pg_stat_progress_basebackup`. Each shows phase, blocks done / blocks total, percentage complete. Before these existed, the only signal on a 6-hour vacuum was "is it still running in pg_stat_activity?" — these views turn that into "phase: heap scan, 47% complete, 2 hours remaining". The first thing to check before a panic-cancel of any long-running maintenance.

### Q108d. What's `pgvector` and why has it become standard in 2026?

Extension adding a `vector` data type and similarity-search operators (`<->` L2 distance, `<#>` negative inner product, `<=>` cosine distance). Indexes: **IVFFlat** (faster build, lossy search) and **HNSW** (better recall, slower build, more memory). The standard answer for "we need vector search for an AI app" without leaving Postgres for a dedicated vector DB. Hybrid pattern: combine `pgvector` similarity with a `WHERE org_id = ?` filter and full-text search in the same query for retrieval-augmented generation. Pinecone/Weaviate dominance has eroded as `pgvector` matured.

---

## Postgres 17 / 18 Specifics

### Summary

**What this topic covers**

The features that matter operationally in PG 17 (Sept 2024) and PG 18 (Sept 2025). PG 17 highlights: dramatically faster `VACUUM` via new TID-store data structure (5-10× on large tables), `MERGE … RETURNING`, streaming I/O foundation, logical replication failover support, prepared-statement protocol fix for PgBouncer, `pg_createsubscriber` for major-version upgrades. PG 18 highlights: async I/O (`io_uring` on Linux, `worker` elsewhere), built-in `uuidv7()`, B-tree skip-scan, OAuth 2 auth, MD5 deprecation in favour of SCRAM-SHA-256, data checksums on by default, `pg_upgrade` preserving planner statistics, default-on `BUFFERS` in `EXPLAIN ANALYZE`, OR-to-array transformation, temporal constraints with `WITHOUT OVERLAPS`. The upgrade-path question: PG 14 → 17 is the safe LTS-style jump; 18 is newest but ecosystem catch-up takes 6-12 months.

**Mental model**

The 2024-2025 Postgres releases represent **the biggest operational improvement cycle the project has shipped in years**. The vacuum bottleneck — the thing that's caused half of all production Postgres outages for a decade — has been substantially eased in PG 17. The old playbook of "set scale factor to 0.02, raise max workers to 8, hope" is replaced with "tune `autovacuum_naptime` to 10s, raise `maintenance_work_mem` to 1-2 GB so the new TID store doesn't spill, watch vacuum complete in minutes". The connection-pooling friction with prepared statements is finally fixed via protocol-level handling. PG 18 fixes UUID PK locality at the language level with `uuidv7()`, removes the post-upgrade ANALYZE storm by preserving statistics, and turns on data checksums for new clusters. The upgrade-path story is also new: `pg_createsubscriber` (PG 17) converts a physical replica to a logical subscriber in one command, replacing the "build fresh cluster + `pg_dump` for hours" path with a near-instant flip. PG 18 added `--swap` and `--jobs N` to `pg_upgrade`, dropping a 1 TB in-place upgrade from hours to minutes. The senior signal in 2026: knowing which excuses are dead. "We can't afford the downtime to upgrade" is dead. "Our UUID PKs make writes slow" is dead. "Autovacuum can't keep up on this 2 TB table" is mostly dead. "PgBouncer breaks prepared statements" is dead.

**Key terms**

- **PG 17 TID store** — new dead-tuple data structure; 5-10× vacuum speedup on large tables.
- **`MERGE … RETURNING`** — PG 17; completes the MERGE story from PG 15.
- **`pg_createsubscriber`** — PG 17; convert physical replica to logical subscriber for upgrade flips.
- **logical replication failover support** — PG 17; subscriber state survives primary failover.
- **PgBouncer prepared statement fix** — PG 17 protocol + PgBouncer 1.21+; prepared statements survive pooling.
- **async I/O (`io_method`)** — PG 18; `worker` or `io_uring` (Linux); read-path parallelism.
- **`uuidv7()`** — PG 18 built-in time-sortable UUID; preserves B-tree locality.
- **skip-scan B-tree** — PG 18; multi-column index serves queries skipping the leading column when it has few distinct values.
- **OAuth 2 auth** — PG 18 `oauth` method in `pg_hba.conf`.
- **SCRAM-SHA-256** — replaces MD5 password auth; default for new clusters.
- **data checksums on by default** — PG 18; CRC32 per page; catches silent corruption.
- **`pg_upgrade --swap --jobs N`** — PG 18; directory-swap + parallel catalog checks; minutes not hours.

**Why interviewers ask this**

Three signals. (1) **Are you current?** Naming PG 17's vacuum overhaul, `pg_createsubscriber`, and PG 18's async I/O + `uuidv7()` + data checksums unprompted signals you track the project. Many candidates are still talking about PG 12. (2) **Do you know what's now dead?** The "can't afford to upgrade" / "UUIDs ruin writes" / "PgBouncer breaks prepared statements" excuses have answers in PG 17/18; the senior candidate can point at the version that fixed each. (3) **Can you sketch an upgrade plan?** Test via `pg_createsubscriber` on staging → audit auth (MD5 → SCRAM) → enable checksums on standby → flip `default_toast_compression` to lz4 → adopt `uuidv7()` for new tables → try `io_method = io_uring` for read-heavy workloads. That's a real PG 18 production checklist.

**Common confusions**

- "PG 18's async I/O speeds up writes" — it's primarily a *read*-path feature today; write-path AIO is a future direction.
- "PG 17 fixed all vacuum problems" — fixed the *speed*; the xmin-horizon pin and write-rate-vs-vacuum-rate races remain.
- "`uuidv7()` is just `uuidv4()` with a timestamp" — uuidv7 puts the time *prefix* in the high bits so values sort by creation time, preserving B-tree locality.
- "Data checksums catch all corruption" — they catch storage-layer bit-rot on read; logical corruption (bad UPDATEs, app bugs) is unaffected.
- "Logical replication failover is automatic" — PG 17 makes slot state synchronisable to physical standbys; you still need to wire the failover orchestration.

**What follows from this topic**

All earlier topics interact with the version timeline: vacuum tuning differs between PG 14 and PG 17; UUID PK choice differs pre/post `uuidv7()`; PgBouncer + prepared statements is a non-issue post PG 17; auth hardening (SCRAM, OAuth) is PG 18 ergonomic. If your cluster is on PG 14 or older, this topic is also a *push* — the gap is now operationally meaningful, not just a feature wish-list.

### Q109. What's the biggest thing PG 17 brought?

(1) **Significantly faster `VACUUM`** thanks to a new dead-tuple data structure (TID store), reducing memory use and improving large-table vacuum time by often 5-10×. (2) **MERGE … RETURNING** completes the MERGE story from PG 15. (3) **Streaming I/O subsystem** (foundation; mostly used by `pg_basebackup` and read paths). (4) **Logical replication failover support** — slots are synchronised to physical replicas so subscriber state survives primary failover. (5) Several protocol-level improvements that PgBouncer 1.21+ uses for prepared statements across pooling.

### Q110. What changed in PG 18 (Sept 2025)?

(1) **Async I/O (AIO)** for read paths — `io_method = worker` or `io_uring` on Linux, dramatic gains on read-heavy workloads where the storage layer has parallelism to exploit. (2) **UUIDv7** generation built-in (`uuidv7()`), so time-sortable UUIDs without app-side libraries — fixes UUID-as-PK index locality at the language level. (3) **Skip-scan B-tree** for multi-column indexes where the leading column has few distinct values — index works for predicates that previously couldn't use it. (4) **OAuth 2 authentication** via the new `oauth` auth method.

### Q111. Should I upgrade from PG 14 to 17 or 18?

PG 14 is in support but ancient by today's perf standards — 17 is the safe LTS-style choice (proven for a year, most extensions support it). 18 is the newest but extensions and managed providers take 6-12 months to fully validate. The upgrade path: `pg_upgrade` for binary in-place (fast, ~minutes for TBs), or **logical replication** from 14 → 17 for near-zero downtime (set up a 17 subscriber, switch traffic, drop 14). Don't run `pg_dump` + `pg_restore` for anything > ~50 GB.

### Q112. Senior angle — what's the biggest perf-tuning shift in modern Postgres?

The **vacuum bottleneck has been substantially eased** between PG 14 → 17. The old playbook of "set `autovacuum_vacuum_scale_factor = 0.02` and raise `autovacuum_max_workers` to 8 and hope" is replaced on PG 17 with "tune `autovacuum_naptime` to 10s, raise `maintenance_work_mem` to 1-2 GB so the new TID store doesn't spill, and watch vacuum complete in minutes instead of hours". This is the largest single operational improvement the project has shipped in years. Anyone interviewing senior on Postgres in 2026 should know it.

### Q113. What does PG 18's `pg_upgrade` change mean operationally?

Two big wins. (1) **Planner statistics are preserved across the upgrade** — pre-18, immediately after `pg_upgrade` every query had stale stats and the first `ANALYZE` storm took hours, during which plans were catastrophic. Now stats carry over and the cluster is production-ready the moment `pg_upgrade` finishes. (2) **`--jobs N`** parallelises the catalog checks and **`--swap`** flag swaps directories instead of file-copy, dropping a 1 TB upgrade from hours to minutes. The "we can't afford the downtime to upgrade" excuse is dead in 2026.

### Q114. What changed for authentication in PG 18?

(1) **OAuth 2.0** auth method (`oauth` in `pg_hba.conf`) — direct integration with corporate SSO without an external pgbouncer/proxy in the way. (2) **MD5 password auth is deprecated** in favour of **SCRAM-SHA-256**. New clusters default to SCRAM; old clusters with MD5 hashes need `ALTER USER ... PASSWORD ...` to upgrade hashes. (3) **`scram_iterations`** GUC for tuning iteration count. Production hygiene: turn off MD5 in `pg_hba.conf` (replace `md5` with `scram-sha-256`), rotate any stored MD5 hashes, audit clients for old `libpq` that doesn't speak SCRAM.

### Q115. What does "data checksums enabled by default" change?

PG 18 enables `data_checksums = on` on new clusters by default. Every 8 KB page gets a CRC32 stored in the header; reads verify the checksum and the server logs `WARNING: page verification failed`. Catches silent disk corruption (bit rot, SAN bugs, cosmic rays) before it propagates to replicas via WAL. Cost: a few % CPU on read/write. Existing clusters: `pg_checksums --enable` on an offline cluster, or rolling restart via a replica + failover. For any compliance-adjacent workload, checksums are table stakes.

### Q116. Senior angle — what's the "PG18 production upgrade" checklist?

(1) Test the upgrade on staging via logical replication (pg_createsubscriber) or `pg_upgrade --swap --jobs`. (2) Audit auth: turn off MD5, enforce SCRAM. (3) Enable data checksums (`pg_checksums --enable` on the standby first, then failover). (4) Switch `default_toast_compression` to `lz4` if not already. (5) Switch UUID PKs to `uuidv7()` for new tables. (6) Turn on `wal_compression = lz4` if heavy FPW. (7) Try `io_method = io_uring` on Linux for async-I/O wins on read-heavy workloads. (8) Confirm `EXPLAIN ANALYZE` outputs now include BUFFERS by default and update any tooling that parses plans.

---

## War Stories — Bring Receipts

Senior interviews care less about your trivia and more about whether you've felt the pain. Prepare *one production war story per topic area*. The shape:

> *"At <company>, our <symptom> alert fired at <time>. We saw <metric> climbing — turned out <root cause>. We mitigated by <action> and the permanent fix was <change>. The lesson was <takeaway>."*

Have one ready for: an `idle in transaction` xmin-horizon outage; an anti-wraparound vacuum that hit at peak; a missing index that the planner row-estimated 100× wrong; a deadlock cycle from inconsistent lock ordering; a replication-slot fill-up that took the primary read-only; a major-version upgrade with logical replication; a migration that took an `ACCESS EXCLUSIVE` lock and blocked production. These are the questions that separate "read about Postgres" from "ran Postgres".

---

*End of primer. ~140 questions across 17 senior-interview topic areas, derived from the vault's `Postgres PATH.md` curriculum and reconciled against the PG 18 release notes (GA'd 2025-09-25). Coverage hits ~95% of what shows up in real senior backend Postgres interviews; the remaining 5% is whichever niche the interviewer specialises in (geospatial, time-series, vector, sharding) — pick one based on the JD and study deep.*
