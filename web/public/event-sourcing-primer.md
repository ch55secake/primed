# Event Sourcing Primer

A senior-level primer on Event Sourcing, grounded in Martin Fowler's concepts from *eaaDev* and related writings. Eight topics, interview-shaped answers, real tradeoffs.

---

## Foundations

### Summary

**What this topic covers**

The core idea of Event Sourcing: instead of storing only current state, you store a sequence of events that, when replayed, produce that state. The event log *is* the source of truth. This topic covers Fowler's original framing, the accounting-ledger analogy, how it contrasts with CRUD, and the three capabilities that make the pattern worth the complexity: Complete Rebuild, Temporal Query, and Event Replay.

**Mental model**

Think of a bank account. A CRUD system stores the balance: `balance = 1050`. An event-sourced system stores the ledger entries: `opened($0) → deposited($1000) → charged($50) → deposited($100)`. The balance is *derived* — you get it by replaying entries. The ledger is the record of truth; the balance is a cached projection. Every accounting system in the world works this way, and for good reason: auditors want the history, not just the number.

Fowler's shipping tracker makes the same point. A simple service just updates `ship.port = newPort`. An event-sourced service creates an `ArrivalEvent` object, persists it to a log, and *then* applies it to update the ship. At any point you can discard all the ship objects and rebuild them from the log. The log never shrinks; application state is always re-derivable.

The three capabilities Fowler names:

1. **Complete Rebuild** — discard application state entirely and replay the event log from scratch. Useful for migrations, bug fixes, and schema changes.
2. **Temporal Query** — reconstruct state at any past point in time by replaying up to a given timestamp or sequence number.
3. **Event Replay** — correct a past event by reversing it (and subsequent events) and re-processing. Version control systems use this constantly; enterprise apps rarely do but benefit enormously when they need it.

**Key terms**

- **Event** — an immutable record of something that happened in the domain, named in the past tense (`OrderPlaced`, `PaymentReceived`).
- **Event log** — the append-only sequence of all events; the system of record in a fully event-sourced architecture.
- **Application state** — the current state of domain objects, fully derivable from the event log.
- **Complete Rebuild** — replaying the entire event log onto an empty state to produce current application state.
- **Temporal Query** — replaying events up to a point in time to answer "what was the state on Tuesday?".
- **Event Replay** — re-processing a corrected or reordered sequence of events to fix incorrect past processing.
- **CRUD** — Create/Read/Update/Delete; stores only current state, discards the history of how it got there.
- **Domain Event** — an event that has meaning within a bounded context; distinct from integration events published to external systems.
- **Audit log** — a side-effect benefit of Event Sourcing: the event log is inherently an audit trail.
- **Source of truth** — in Event Sourcing, the event log, not the current-state projection.

**Why interviewers ask this**

Because "Event Sourcing" gets thrown around loosely. Interviewers want to know if you've actually implemented it or just read a blog post. The tell is whether you can explain *why* it's different from change-data-capture, audit logging, or just keeping a `updated_at` timestamp. If you can articulate Complete Rebuild and Temporal Query with concrete examples, you've passed the sanity check.

**Common confusions**

- "Event Sourcing is just audit logging" — audit logging is a *side-effect* of Event Sourcing. The defining difference is that in ES the log is the source of truth; application state is derived. In audit logging, the database rows are the source of truth and the log is a secondary record.
- "Event Sourcing requires CQRS" — they're complementary and often used together, but CQRS is not required. You can have an event-sourced write side with a single synchronous read path. You can also have CQRS without event sourcing.
- "Event Sourcing means storing events in Kafka" — Kafka is a distributed log, but Event Sourcing is a persistence *pattern*. You can implement it with Postgres, EventStoreDB, or even a flat file.
- "Events are the same as messages" — events record facts; messages are commands or notifications sent to other systems. Domain events become integration messages when published across a boundary.

**What follows from this topic**

Everything. Event Design (what makes an event good), Aggregates (who emits and applies events), Projections (how you query), Event Store (how you persist), Snapshotting (how you avoid replaying 10 million events), and Integration (how you share events with the world).

### Q1. What is Event Sourcing and how does it differ from a CRUD system?

In a CRUD system, each write *replaces* the previous state; history is discarded unless you add explicit audit machinery. In Event Sourcing, every state change is recorded as an immutable event object, and the event log is the system of record — current state is always a derived projection. Fowler's accounting analogy is the cleanest summary: a bank stores *transactions*, not just a balance, because the transaction history is more valuable than any single derived number. The cost is higher read complexity and infrastructure to manage the log; the benefit is Complete Rebuild, Temporal Query, and Event Replay for free.

### Q2. What are Fowler's three core capabilities of Event Sourcing?

**Complete Rebuild**: discard all application state and replay every event from scratch — useful when your schema changes or you discover a bug in your projection logic. **Temporal Query**: replay events up to a timestamp to answer "what did this aggregate look like at 3pm on Tuesday?" — git blame for domain state. **Event Replay**: reverse an incorrect past event and replay a corrected version — the event log becomes a mutable view of an immutable history. These capabilities are hard or impossible to retrofit onto a CRUD system; Fowler notes you should make the ES decision early if you think you'll need them.

### Q3. Is Event Sourcing the same as the Outbox pattern or Change Data Capture?

No. CDC and the outbox are mechanisms for *reliably publishing* state changes; they sit on top of a CRUD store. Event Sourcing makes the event log the *source of truth*. With CDC, if your events log is lost, the database state survives. With Event Sourcing, if the event log is lost, everything is lost. The conceptual inversion matters: in ES you derive state from events; in CDC you derive events from state changes.

### Q4. Why do interviewers care whether you understand Event Sourcing vs CQRS?

Because conflating them is a common junior mistake. CQRS (Command Query Responsibility Segregation) separates the write model from the read model regardless of persistence strategy — you can have CQRS with a plain relational write store. Event Sourcing is a persistence strategy for the write side. They're often used together because the event log makes it easy to build multiple read models, but neither requires the other. Mixing them up in an interview signals you've absorbed the buzzwords without understanding the boundaries.

---

## Event Design

### Summary

**What this topic covers**

What events look like: their schema, naming conventions, immutability guarantees, versioning strategies, and the discipline of "upcasting" old events into current schemas. This is the craft layer — getting event design wrong is the most common reason ES projects become unmaintainable.

**Mental model**

An event is a *fact*, not a command. `OrderPlaced` happened — you cannot un-happen it. The record is immutable because the past is immutable. This is the hardest mental shift for engineers coming from OO mutation-heavy systems. A good event captures everything the domain needed to know at the moment it occurred: not just foreign keys ("customerId: 42") but enough denormalized context that later processors don't need to make expensive lookups.

Events are named in the past tense and scoped to a bounded context. `UserCreated` is a domain event; `user.created` published over Kafka to a downstream billing service is an integration event — same fact, different schema contract, different versioning concerns. Conflating the two creates coupling you'll regret.

**Key terms**

- **Past-tense naming** — events record facts: `PaymentReceived`, `ShipmentDispatched`, `AccountClosed`.
- **Immutability** — events are never updated or deleted; the log is append-only.
- **Event schema** — the structure of the event payload, typically serialized to JSON or Avro.
- **Schema evolution** — adding, removing, or renaming fields in an event schema over time.
- **Weak schema** — using a flexible serialization format (JSON) that tolerates additive changes without coordination.
- **Strong schema** — using a schema registry (Avro + Confluent) that enforces compatibility rules.
- **Upcasting** — a pattern where old event versions are transformed to current version at read time; the store remains immutable, the translation happens on the way out.
- **Event versioning** — strategies: version field in payload (`"version": 2`), separate event type names (`OrderPlacedV2`), or upcaster chain.
- **Thin event** — event contains only IDs, requires downstream lookups; low payload size, high coupling risk.
- **Fat event** — event contains full context at time of occurrence; higher payload size, lower coupling, better for replay fidelity.
- **Domain event** — meaningful within one bounded context.
- **Integration event** — published across context boundaries; demands stricter schema contracts.

**Why interviewers ask this**

Because event design is where most ES systems accumulate technical debt. Interviewers at companies that have *actually run* ES in production want to know if you've thought about what happens when you need to rename a field two years after 50 million events have been written. The difference between "just add a version field" and explaining upcasters with a concrete example separates candidates who've done this from candidates who've read about it.

**Common confusions**

- "You can fix events in the store" — you cannot; the event log is immutable. You fix *projections* by replaying with corrected logic. To correct bad *data* in an event, you append a corrective event (`PaymentCorrected`), you don't update the original.
- "Thin events are safer because they're smaller" — thin events tie your replay fidelity to the availability of reference data at replay time. If a `productId` referenced in a `CartItemAdded` event is deleted, your rebuild breaks. Fat events are safer for long-lived event stores.
- "Version numbers are enough" — version numbers require every consumer to switch simultaneously or handle all versions. Upcasting lets the store hold old formats and transform them at read time, decoupling producer schema changes from consumer deployments.

**What follows from this topic**

Aggregate design (what data the aggregate needs to reconstruct state), projection design (what context needs to be denormalized into events), and the event store implementation (schema registry integration).

### Q1. What makes a good event schema?

A good event records *what happened*, *who caused it*, *when*, and *enough context to be useful without external lookups*. Name in past tense, scoped to the bounded context. Include the aggregate ID and version, a correlation/causation ID for tracing, and a wall-clock timestamp plus a logical sequence number. Prefer fat events for long-lived stores — denormalize the product name into `ItemAddedToCart` even though it's also in the product catalog, because the catalog will drift. The event should read like a ledger entry: self-contained and unambiguous.

### Q2. How do you evolve an event schema without breaking consumers?

Three approaches: (1) **Additive only** — new optional fields, never remove or rename. Works for JSON-based thin contracts. (2) **Version field + multi-version handlers** — consumers check `event.version` and branch. Simple but pollutes every consumer. (3) **Upcasters** — on read, old events are transformed to the current schema before reaching business logic. The event store stays immutable; the upcaster chain in your reading infrastructure handles translation. Upcasting is the most maintainable for long-lived systems because the transformation logic is centralized. Axon Framework implements this explicitly.

### Q3. What is the difference between a domain event and an integration event?

A **domain event** is an internal fact raised within a bounded context — `OrderPaymentReceived` in the orders domain. It may contain private domain concepts. An **integration event** is published across a context boundary — typically serialized to a message broker and consumed by other services. Integration events should be stable, versioned contracts; domain events are an implementation detail of the aggregate. A common pattern is to translate from domain events to integration events at the boundary, maintaining a separate schema registry for the external contract.

### Q4. Why avoid thin events (events with only IDs)?

Because replay correctness depends on the referenced data still being available and unchanged. If a `ProductRemovedFromCatalog` event fires after `CartItemAdded` that only recorded `productId`, your read model rebuild must tolerate missing products. Fat events bake the relevant state at time of occurrence into the event payload, making rebuilds hermetic. The storage cost is usually negligible compared to the operational pain of thin events at scale.

---

## Aggregates & Event Application

### Summary

**What this topic covers**

How aggregates work in an event-sourced system: the aggregate root as the unit of consistency, how events are raised and applied, the rehydration cycle (load events → fold into state), and the performance optimization of snapshots. This is the "how do you actually write the code" topic.

**Mental model**

In a traditional DDD system, an aggregate is a consistency boundary that mutates state directly. In an event-sourced system, the aggregate *never mutates state directly* — it raises events, and those events are applied to produce state. The lifecycle is:

1. Load the event stream for the aggregate ID from the event store.
2. Apply each event in order to an initially empty state object (this is "rehydration" or "hydration").
3. Execute the command — validate business rules against current state.
4. Raise new events; apply them to update in-memory state.
5. Save the new events to the event store (optimistic concurrency: expected version must match).

The critical discipline is the separation between command handlers (which validate and raise events) and event handlers (which apply events to state). Event handlers must be *pure and side-effect free* — they only update state, never call external services. This purity is what makes replay safe.

```java
// Java-style pseudocode
public class BankAccount {
  private UUID id;
  private Money balance;
  private boolean closed;

  // Command handler — validates, raises events
  public List<Event> deposit(Money amount) {
    if (closed) throw new AccountClosedException();
    if (amount.isNegative()) throw new InvalidAmountException();
    return List.of(new MoneyDeposited(id, amount, Instant.now()));
  }

  // Event handler — pure state mutation, no validation
  public void apply(MoneyDeposited event) {
    this.balance = balance.add(event.amount());
  }

  // Rehydration: fold event stream into empty state
  public static BankAccount rehydrate(List<Event> events) {
    BankAccount account = new BankAccount();
    events.forEach(account::applyEvent);
    return account;
  }
}
```

**Key terms**

- **Aggregate root** — the top-level entity that defines the consistency boundary; identified by an aggregate ID.
- **Event stream** — the ordered sequence of events for a single aggregate instance (e.g., all events for account `abc-123`).
- **Rehydration** — loading an aggregate by replaying its event stream from scratch.
- **Apply method** — the pure function that mutates aggregate state in response to an event.
- **Command handler** — validates a command against current state and produces events; may throw if invariants are violated.
- **Optimistic concurrency** — when appending new events, assert the expected stream version; if the store has advanced, retry.
- **Version / sequence number** — the position of an event in the stream; used for ordering and concurrency control.
- **Snapshot** — a point-in-time serialization of aggregate state, used to short-circuit replay (covered in the Snapshotting topic).
- **Event-carried state transfer** — the aggregate state is fully derivable from its event stream, no external lookups needed.

**Why interviewers ask this**

Because the aggregate pattern is where ES code either becomes clean or becomes a mess. The key diagnostic question is whether the candidate separates command validation from event application. If they put `if (amount.isNegative()) return;` in the `apply` method, they've broken the pattern — apply methods are called during replay and must never throw business exceptions.

**Common confusions**

- "Apply methods should validate too" — no. Apply methods are called during rehydration. If they can throw, rehydration can fail on valid historical data. Validation belongs in the command handler.
- "Each command = one event" — sometimes a command produces multiple events. `PlaceOrder` might produce `OrderPlaced` + `InventoryReserved`. All events from one command should be persisted atomically.
- "Aggregates should be large" — wrong direction. Small aggregates with narrow consistency boundaries lead to shorter event streams and faster rehydration. An aggregate that owns hundreds of sub-entities will have unbounded stream growth.

**What follows from this topic**

Snapshotting (to optimize rehydration of long streams), Projections (consuming the events the aggregate emits), and the Event Store (where streams live).

### Q1. How does an aggregate produce and apply events in an event-sourced system?

The aggregate's command handler validates the command against current (rehydrated) state, then returns or raises a list of new events — it does *not* update state directly. Each event is then passed to an `apply` method (sometimes called `when` or `on`) that performs the actual in-memory state mutation. The same apply method is used during rehydration when loading from the event store, which is why it must be pure and side-effect-free. After the command handler completes, the new events are appended to the aggregate's stream in the event store atomically.

### Q2. What is optimistic concurrency control in an event-sourced context?

When you load an aggregate, you record the version (last sequence number) of its event stream. When you append new events, you tell the event store "I expect the current version to still be N". If another process has concurrently written to the same stream, the version will have advanced and the append fails. The command is then retried by reloading the updated stream and re-executing. This is the same optimistic locking concept as `@Version` in JPA, but enforced at the event stream level.

### Q3. What are the rules for apply (event handler) methods?

They must be: (1) **deterministic** — same event always produces the same state transition; (2) **side-effect free** — no external calls, no logging, no throws; (3) **exhaustive** — every event type the aggregate can emit must have a corresponding apply handler, or the apply dispatch will fail on rehydration. Breaking any of these rules corrupts replay. The phrase to use in an interview: "apply methods must be as pure as a `reduce` function."

### Q4. Should aggregates be large or small?

Small. An aggregate is a consistency boundary, not an ownership boundary. The rule of thumb: an aggregate should protect *one* invariant that requires atomicity. For an order system, `Order` owns its line items because the total calculation spans them; it does *not* own the `Customer` — customer address changes are independent and shouldn't generate events in the order stream. Large aggregates produce long event streams, slow rehydration, and high contention. Keep them small; use eventual consistency between aggregates.

---

## Projections & Read Models

### Summary

**What this topic covers**

How you build query-optimized views (read models) from the event stream, what eventual consistency means in practice, how you recover from projection bugs by rebuilding from the log, and the tradeoffs between synchronous and asynchronous projections.

**Mental model**

The event log is write-optimized and terrible for queries. A projection is a *subscription* to the event stream that builds and maintains a purpose-built read model — a denormalized table, a document store, a cache — optimized for specific query patterns. The key insight: because the event log is immutable and complete, projections are *disposable*. If the projection logic has a bug, you fix the code and replay from event position 0 to rebuild the read model from scratch. This makes projections cheap to iterate on.

Projections can be:
- **Synchronous (inline)** — updated in the same transaction as the write. Strong consistency, but tight coupling and potential performance cost.
- **Asynchronous (eventual)** — a separate process consumes events from the log and updates read models. Loose coupling, higher throughput, but a consistency lag.

The consistency lag is the main operational concern. For most business operations, "eventually consistent within seconds" is acceptable. For operations where the user immediately reads their own write ("you just placed an order, show me my orders"), you need either sync projections, read-your-own-writes routing, or optimistic UI updates.

**Key terms**

- **Projection** — a function that consumes events and maintains a read model.
- **Read model** — a query-optimized data structure built from projected events; may live in a relational DB, document store, cache, or in-memory.
- **Event handler (projection side)** — the function that processes a single event and updates the read model.
- **Checkpoint / position** — the last event sequence number successfully processed by a projection; persisted so the projection can resume after restart.
- **Catchup subscription** — a projection that reads from a historical position and then transitions to live events; used when building or rebuilding a projection.
- **Eventual consistency** — the read model will *eventually* reflect all writes; there is a lag between event emission and read model update.
- **Rebuild** — deleting a projection's read model and replaying from event position 0 with updated handler logic.
- **Projection group** — multiple read models updated by the same subscription for efficiency.
- **Live projection** — processes only new events from the subscription's start point, not historical events.

**Why interviewers ask this**

Because projections are the main day-to-day operational surface of an ES system. Interviewers want to know: do you understand eventual consistency and can you reason about its failure modes? Can you rebuild a projection? Do you checkpoint correctly to avoid double-processing? Have you dealt with slow projections falling behind the write side?

**Common confusions**

- "If the projection breaks, the data is lost" — incorrect. The data is in the event log. A broken projection is embarrassing, not catastrophic. Fix the handler, delete the read model, replay.
- "Projections and aggregates are the same thing" — aggregates enforce write-side invariants; projections build read-side views. They consume the same events, but serve completely different purposes.
- "Eventual consistency means data is sometimes wrong" — it means data is *stale* for a bounded time, not incorrect. A well-built event-sourced read model will converge to the correct state.
- "You need one projection per read model" — projections can be combined; a single subscription can update multiple denormalized tables.

**What follows from this topic**

Integration & Messaging (subscribing to events from other services), Testing (testing projections), and operational concerns around projection lag and monitoring.

### Q1. How do you build a read model from an event stream?

A projection subscribes to the event stream (usually starting from position 0 for a new projection). For each event, a handler function updates the read model — typically inserting, updating, or deleting rows in a dedicated read database. The projection persists its checkpoint (last processed event position) alongside the read model so it can resume after restart without reprocessing. The read model schema is tuned for the query, not for the domain — full denormalization is fine and expected.

### Q2. How do you recover from a bug in a projection?

The event log is immutable, so recovery is straightforward: (1) fix the projection handler code; (2) delete (or truncate) the affected read model; (3) reset the checkpoint to position 0; (4) replay the event stream. Because the event log is the source of truth, the projection will rebuild to a correct state. This is the *complete rebuild* capability at the projection level. In production, you can run the new projection in parallel alongside the old one (blue/green projection cutover) and swap when it catches up.

### Q3. What is a checkpoint and why does it matter?

A checkpoint is the last event sequence number a projection has successfully processed. It must be persisted durably and ideally updated atomically with the read model change (same transaction or two-phase commit). If you don't persist checkpoints, a projection restart reprocesses all events from the beginning, causing double-writes. If you persist checkpoints but not atomically with the read model update, you can miss events (checkpoint advanced but read model not updated) or double-process (read model updated but checkpoint not advanced). Atomic checkpoint + read model update is the reliable pattern.

### Q4. How do you handle eventual consistency in the UI?

Three common strategies: (1) **Optimistic UI** — the client assumes the write succeeded and updates the UI immediately without waiting for the read model; (2) **Read-your-own-writes** — route reads for the current user to the write side or a consistent replica for a short window after a write; (3) **Version tokens** — the write returns the event version, the client polls the read model with that version as a minimum, and waits until the projection has caught up. Which strategy is right depends on the latency tolerance and the UX. For most admin workflows, the lag is imperceptible; for financial confirmations, stronger guarantees are usually required.

---

## Event Store

### Summary

**What this topic covers**

What an event store is, how it differs from a regular database, the core append-only stream model, optimistic concurrency at the store level, and the landscape of implementation options: EventStoreDB, Kafka, Postgres-backed stores, and custom implementations.

**Mental model**

An event store has one primary operation: `appendToStream(streamId, expectedVersion, events)`. If `expectedVersion` doesn't match the current stream version, the append fails — that's the entire concurrency model. Reads are just `readStream(streamId, fromVersion, maxCount)`. There is no UPDATE, no DELETE, no schema migration in the traditional sense. The simplicity of the interface is also the trap: you cannot easily do ad-hoc queries across streams, so you need projections for anything beyond "give me all events for aggregate X".

Streams are typically scoped per aggregate instance: `account-{id}`, `order-{id}`. A global stream (or a category stream like `$ce-account` in EventStoreDB) provides an ordered view across all streams of a type, which is how projections subscribe.

**Key terms**

- **Stream** — an ordered, append-only sequence of events for a single aggregate or logical entity.
- **Stream ID** — the identifier for a stream, typically `{aggregate-type}-{aggregate-id}`.
- **Expected version** — the version the client believes the stream is at when appending; the store rejects if it has advanced.
- **Global stream / $all** — a synthetic stream across all events; used by projections that need cross-aggregate views.
- **EventStoreDB** — purpose-built event store (Greg Young's project); native stream model, persistent subscriptions, projections engine.
- **Kafka** — distributed log; not an event store by default (no stream-per-aggregate, no optimistic concurrency), but usable for ES with discipline.
- **Postgres** — relational; can implement ES with an `events` table (`stream_id`, `version`, `type`, `payload`, `timestamp`); cheap to start, limited at scale.
- **Optimistic concurrency** — append fails if stream version != expected version; the fundamental consistency guarantee of the event store.
- **Idempotency key** — a unique ID on each event used to detect and deduplicate duplicate appends.
- **Compaction** — not applicable to event stores in the traditional sense; events are never deleted (archiving to cold storage is a different concern).

**Why interviewers ask this**

Because "we're using Event Sourcing" means different things depending on the store. Kafka with event sourcing is a valid architecture but has different tradeoffs (no per-aggregate streams, no built-in optimistic concurrency) versus EventStoreDB. Interviewers at companies with mature ES want to know if you understand these tradeoffs, not just that you've heard of EventStoreDB.

**Common confusions**

- "Kafka is an event store" — Kafka is an event streaming platform optimized for high-throughput fan-out. It doesn't have per-aggregate streams or built-in optimistic concurrency. You can build ES on Kafka (using compacted topics per aggregate) but it's non-trivial. EventStoreDB is designed for ES from the ground up.
- "Postgres is too slow for Event Sourcing" — Postgres with a well-designed `events` table (indexed by `stream_id + version`) handles tens of thousands of appends per second. For most services it's more than adequate. The complexity of EventStoreDB or Kafka is rarely justified below ~500 rps.
- "You need a global ordered log" — global ordering is expensive and rarely required. Most ES systems need ordering *within a stream* (per aggregate), not across all streams. Cross-stream ordering is a projection concern.

**What follows from this topic**

Snapshotting (how to avoid reading entire streams), Integration & Messaging (publishing events to external systems), and Projections (subscribing to streams).

### Q1. What is the minimal interface of an event store?

Two operations: `appendToStream(streamId, expectedVersion, events[])` and `readStream(streamId, fromVersion, maxCount)`. The append operation enforces optimistic concurrency: if the stream's current version differs from `expectedVersion`, the write fails with a concurrency exception. Everything else — projections, subscriptions, snapshots — is built on top. A Postgres implementation can be as simple as a single `events` table with columns: `stream_id VARCHAR`, `version BIGINT`, `type VARCHAR`, `payload JSONB`, `recorded_at TIMESTAMPTZ`, with a unique constraint on `(stream_id, version)`.

```sql
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   TEXT NOT NULL,
  version     BIGINT NOT NULL,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_id, version)
);

CREATE INDEX events_stream_version ON events (stream_id, version);
CREATE INDEX events_recorded_at ON events (recorded_at);
```

### Q2. When would you choose EventStoreDB over Postgres for your event store?

Choose **EventStoreDB** when you need: native persistent subscriptions (catch-up + live in one subscription), a built-in server-side projections engine, stream categories (`$ce-*`) for cross-aggregate views, or you're running at high write throughput and want a purpose-built storage format. Choose **Postgres** when: the team already operates Postgres well, write volumes are moderate (<5k events/sec), you want transactional writes that include non-event tables (e.g., inbox/outbox in the same transaction), or you want to minimize infrastructure. Postgres is the pragmatic starting point; EventStoreDB is the upgrade when you're constrained by it.

### Q3. How do you implement optimistic concurrency on a Postgres event store?

The unique constraint on `(stream_id, version)` does it: if two transactions try to insert version 5 for the same stream, one will fail with a unique violation. The application layer catches that exception and maps it to a concurrency conflict, triggering a retry. For higher throughput, use advisory locks or `INSERT ... ON CONFLICT DO NOTHING` with row count checking. The version increment is the caller's responsibility: read current max version, set `expectedVersion = max`, send `max + 1, max + 2, ...` for new events.

### Q4. What is the difference between a stream and a topic in event-based systems?

A **stream** (in ES parlance) is a sequence of events for a *single aggregate instance*. A Kafka **topic** is a named channel typically used for a *category* of events (e.g., `orders`). Event stores give you per-aggregate streams as a first-class concept with version-based concurrency. Kafka gives you partitioned topics with offset-based consumption. For Event Sourcing, you need aggregate-level isolation; on Kafka you approximate this with a partition key of `aggregateId`, but you lose server-side concurrency control and must handle conflicts in the application layer.

---

## Integration & Messaging

### Summary

**What this topic covers**

How events produced by an event-sourced service are reliably published to external consumers: the outbox pattern, at-least-once vs exactly-once delivery, idempotent consumers, and the distinction between domain events and integration events. Also: the external systems problem Fowler identifies — when replaying events, you must not re-notify external systems.

**Mental model**

The event log inside your service is private. When other services need to react to your events, you publish *integration events* to a shared message bus. The hard problem: ensuring that every domain event eventually produces exactly one notification to the bus, and that downstream consumers handle duplicates gracefully.

The outbox pattern solves the "dual-write" problem. If you write to the event store and *then* publish to Kafka, the process can crash between the two writes, leaving downstream systems uninformed. The outbox writes both the domain event (to the event store) and a pending notification (to an outbox table or stream) in the same transaction. A separate relay process reads the outbox and publishes to the bus. Consumers receive each message at least once; they must be idempotent.

Fowler's formulation: when replaying events for a Complete Rebuild or bug fix, you must suppress external notifications. The gateway pattern — wrapping all external calls behind a gateway that checks a "replay mode" flag — is his solution. The same principle applies to integration event publishing: during replay, the publishing gateway must be disabled.

**Key terms**

- **Integration event** — an event published across a service boundary; stable, versioned, and schema-controlled.
- **Outbox pattern** — write domain events and outbox entries atomically; a relay publishes outbox entries to the message bus.
- **Dual-write problem** — the race condition between writing to the event store and publishing to the bus; the outbox eliminates it.
- **At-least-once delivery** — the guarantee provided by most message brokers; messages may be delivered more than once.
- **Exactly-once semantics** — a stronger guarantee requiring end-to-end idempotency; practically: idempotent consumers + at-least-once delivery.
- **Idempotent consumer** — a consumer that produces the same result whether it processes a message once or ten times; typically via deduplication on event ID.
- **Replay mode** — a flag indicating the system is replaying historical events; external gateways suppress real notifications.
- **Transactional outbox** — outbox entries written in the same DB transaction as the event store, guaranteeing no silent drops.
- **Change Data Capture (CDC)** — an alternative outbox relay using DB log tailing (Debezium) instead of polling.
- **Saga / process manager** — a long-running coordinator that reacts to integration events and issues commands; handles distributed workflows.

**Why interviewers ask this**

Because "we publish events to Kafka" sounds simple but hides a jungle of failure modes. The dual-write problem is real and has burned production systems. Interviewers want to know if you've thought about what happens when the Kafka publish fails after the DB commit, or when a consumer crashes mid-process and reprocesses the same event.

**Common confusions**

- "Just publish to Kafka after the DB commit" — the dual-write anti-pattern. If the publish fails, the event is silently dropped. Use the outbox.
- "Exactly-once processing is guaranteed by Kafka" — Kafka's exactly-once semantics apply within the Kafka broker. End-to-end exactly-once requires idempotent consumers. If your consumer writes to Postgres without deduplication, you will double-write.
- "Integration events and domain events have the same schema" — they shouldn't. Domain events are internal and can contain domain internals. Integration events are a public API with versioning commitments. Separate them.

**What follows from this topic**

Testing (testing at-least-once consumers), operational concerns (dead-letter queues, poison messages), and the Outbox relay implementation.

### Q1. What is the outbox pattern and why is it necessary?

The outbox pattern eliminates the dual-write problem: the race condition between persisting domain state and publishing an integration event. Instead of publishing to Kafka directly after a DB write, you write an outbox entry (the pending notification) to the *same database transaction* as the domain event. A separate relay process (or CDC via Debezium) reads the outbox and publishes to Kafka. If the relay fails, it retries from the unprocessed outbox entries. The consumer receives at-least-once; deduplication on event ID handles duplicates. Without the outbox, any crash between the DB commit and the Kafka publish silently drops notifications.

### Q2. What does it mean for a consumer to be idempotent?

An idempotent consumer produces the same system state whether it processes a given message once or multiple times. Implementation: assign each event a unique ID (`eventId` UUID); the consumer checks a `processed_events` table before processing and skips events it has already handled. Alternative for database writes: use `INSERT ... ON CONFLICT DO NOTHING` keyed on `eventId`. For state machines, design transitions so re-processing an event that was already applied leaves state unchanged (e.g., `ORDER_CONFIRMED → ORDER_CONFIRMED` is a no-op, not an error).

### Q3. Why must external gateways be suppressed during event replay?

Fowler's original formulation: replay is used for Complete Rebuilds and bug fixes. If processing an `OrderPlaced` event sends a confirmation email, replaying 10 million historical events would send 10 million emails. Gateways (wrapping all external calls) check a `replayMode` flag and suppress real external calls during replay. The same principle applies to integration event publishing: a replay-mode event store should not publish to Kafka. This is a non-trivial concern because it's easy to overlook non-obvious side effects (charging a payment gateway, hitting a rate-limited API).

### Q4. What is the difference between at-least-once and exactly-once delivery?

**At-least-once**: the broker guarantees every message is delivered, but may deliver duplicates on failure/retry. Most brokers (Kafka, RabbitMQ, SQS) provide this by default. **Exactly-once**: each message is processed precisely once end-to-end. True exactly-once is expensive and often impossible across heterogeneous systems. The practical pattern: at-least-once delivery + idempotent consumers = effectively-once processing. Kafka's `enable.idempotence=true` and transactions give exactly-once *within Kafka*, but once you write to an external database, you need application-level idempotency on the consumer side.

---

## Snapshotting & Performance

### Summary

**What this topic covers**

The performance problem of long event streams, snapshot strategies, when to snapshot, how snapshots interact with the event store, and archiving old events to cold storage.

**Mental model**

Rehydrating an aggregate with 10 events is fast. Rehydrating one with 100,000 events is not. Snapshots are the optimization: periodically serialize the aggregate's current state to the event store alongside the event stream, keyed with the version number at which the snapshot was taken. On load, instead of reading from event 0, you load the latest snapshot and replay only events that occurred *after* the snapshot version.

Crucially, snapshots do not make the event history inaccessible — the full stream is still there for Temporal Queries and Complete Rebuilds. Snapshots are purely a read optimization for the happy path (load-command-save cycle).

```
Event stream: [e0, e1, e2, ... e499, snapshot@500, e500, e501, ... e600]

Load aggregate:
  1. Read snapshot@500 → state at version 500
  2. Read events from version 501 → apply to snapshot state
  3. Ready at version 600
```

Snapshot frequency is a tradeoff: too frequent = write amplification; too infrequent = slow rehydration. Common strategies: every N events (every 100 or 1000), time-based (nightly), or triggered when rehydration time exceeds a threshold. Some teams snapshot only when stream length exceeds a threshold (e.g., > 200 events), measuring rehydration time in staging.

**Key terms**

- **Snapshot** — a serialized point-in-time capture of aggregate state, stored alongside the event stream.
- **Snapshot version** — the event stream version at which the snapshot was taken.
- **Rehydration** — loading an aggregate from its event stream (possibly with snapshot optimization).
- **Write amplification** — the overhead of writing a snapshot on every command in addition to events.
- **Snapshot store** — where snapshots live: same event store (as a special event), a separate table, or a cache.
- **N-event snapshot** — take a snapshot every N events.
- **Cold storage / archiving** — moving old events (pre-snapshot cutoff) to cheaper storage; relevant for compliance and cost.
- **Stream compaction** — not the same as Kafka compaction; in ES, you don't delete events, you optionally *archive* them to cold storage after a snapshot.
- **Snapshot-first load** — the read path that checks for a snapshot before loading the raw stream.

**Why interviewers ask this**

Because "Event Sourcing is slow" is the most common objection, and snapshotting is the standard answer. Interviewers want to know if you understand *when* it's a problem (not at 100 events; yes at 100,000) and *how* to fix it without breaking the event log's integrity guarantees.

**Common confusions**

- "Snapshots replace the event log" — no. Snapshots are a read optimization. The full event history is retained. Deleting events before the snapshot would break Temporal Queries and audit trails.
- "You should snapshot after every command" — this defeats the purpose. Every command would write one event + one snapshot, doubling write I/O. Snapshot infrequently enough that the replay of post-snapshot events is fast.
- "Snapshotting is complex to implement" — a basic implementation is straightforward: an extra `snapshots` table with `stream_id`, `version`, `payload`. The loading logic is a ten-line conditional. Complexity arises when snapshot schema evolves (same versioning/upcasting concerns as events).

**What follows from this topic**

Event archiving and cost management (long-running systems accumulate terabytes of events), and operational monitoring of stream lengths and rehydration latency.

### Q1. When should you introduce snapshotting?

When rehydration latency is measurably hurting your command processing throughput — typically when event streams exceed a few hundred events per aggregate and the aggregate is frequently loaded. Measure first: if P99 rehydration time is under 5ms, snapshotting adds complexity with no payoff. The trigger is usually a combination of stream length (>500 events is a common heuristic) and load frequency (hot aggregates that are read many times per second). Introduce snapshotting as an optimization, not upfront.

### Q2. How does snapshot loading work?

On load: (1) query the snapshot store for the latest snapshot for the aggregate ID; (2) if found, deserialize it into aggregate state at version N; (3) read events from the event store from version N+1 onward; (4) apply those events to the snapshot state. If no snapshot exists, fall back to reading all events from version 0. New events are still appended to the event stream normally; the snapshot is updated asynchronously or synchronously when a threshold is crossed.

### Q3. What happens when the snapshot schema changes?

The same problem as event schema evolution, solved the same way: upcasting. When deserializing an old snapshot, an upcaster transforms it to the current schema. Alternatively, discard old snapshots on schema change and let the system rebuild from raw events until new snapshots are taken. Snapshots can also carry a version field; the loading code branches on version to apply appropriate deserialization. In practice, snapshot schema changes are rarer than event schema changes because snapshots are internal implementation details, not public contracts.

### Q4. How do you archive old events without breaking the system?

You don't delete events — you move them to cold storage (e.g., S3, Glacier) after taking a reliable snapshot at the archival cutoff. The event store retains events from the snapshot version onward; older events are retrievable from cold storage for Temporal Queries and audit but are not in the hot path. The archiving process must be coordinated: take snapshot, verify snapshot integrity, move pre-snapshot events to cold storage, update event store metadata. For most teams, archiving is unnecessary for the first few years; event logs for typical services are measured in gigabytes, not petabytes.

---

## Testing Event-Sourced Systems

### Summary

**What this topic covers**

How to test aggregates, projections, and integration handlers in an event-sourced system. The given-when-then pattern for aggregate tests, property-based testing for event streams, and the operational benefits of replayable test scenarios.

**Mental model**

Event-sourced systems have a natural fit with the given-when-then testing pattern:

- **Given**: a sequence of past events (the history of the aggregate).
- **When**: a command is issued.
- **Then**: a specific sequence of new events is produced.

This is entirely deterministic and pure. The aggregate is initialized by replaying the "given" events, the command handler runs, and the output events are compared to the expected "then" events. No mocks needed for the aggregate itself. No database. No network. This is one of the underappreciated benefits of Event Sourcing: aggregate unit tests are maximally fast and maximally deterministic.

```java
// Given-when-then style aggregate test (Java)
@Test
void depositIncreasesBalance() {
  // Given: account opened with zero balance
  var history = List.of(new AccountOpened(accountId, Money.ZERO));
  var account = BankAccount.rehydrate(history);

  // When: deposit command
  var events = account.deposit(Money.of(100));

  // Then: MoneyDeposited event emitted
  assertThat(events).containsExactly(new MoneyDeposited(accountId, Money.of(100)));
}
```

Projection tests are equally clean: given a sequence of events, assert the read model state after projection. No need to fake a write side.

For integration tests, the full event log can be replayed against a test environment, including real external gateways in observation mode. This is Fowler's debugging use case: take a production event log, replay it into a test environment, verify that an upgraded version of the application processes it correctly.

**Key terms**

- **Given-when-then** — test structure: given past events, when command issued, then new events emitted.
- **Aggregate unit test** — tests command handler + apply logic in isolation; no DB, no mocks.
- **Projection unit test** — tests projection handler in isolation: given events, assert read model state.
- **Integration test** — tests the full stack: event store, command handler, projection, read model.
- **Event stream fixture** — a predefined sequence of events used to initialize aggregate state in tests.
- **Replay test** — replaying a production event log against a test environment to validate a new code version.
- **Property-based test** — generating random event sequences to find edge cases in aggregates or projections.
- **Determinism** — given the same event history, the aggregate always produces the same state; critical for testability.
- **Snapshot test (events)** — asserting that a known input produces a known serialized event payload; used to catch unintended schema changes.

**Why interviewers ask this**

Because testability is a major selling point of Event Sourcing that candidates often miss. If you can explain that aggregate tests require zero infrastructure because aggregates are pure event-in/event-out functions, you demonstrate real understanding. If you've only used ES with a heavy framework and haven't thought about the test layer, your answers will be vague.

**Common confusions**

- "You need an in-memory event store to test aggregates" — no. Aggregate tests don't need a store at all. You initialize state by calling `rehydrate(givenEvents)` and call `handleCommand(cmd)` directly. The store is only needed in integration tests.
- "Testing projections requires a full stack" — projection handlers are pure functions (event → state update). Unit test them by constructing an event and asserting the resulting read model state directly, without a real store or broker.
- "Given-when-then is just BDD naming" — in ES it maps directly to the domain model: given events (history), when command (input), then events (output). It's not a naming convention; it's the natural shape of the system.

**What follows from this topic**

Operational concerns: how do you test that a schema migration or upcaster is correct? Replay the full production event log in a staging environment and compare projected state before and after the change.

### Q1. How do you write a unit test for an event-sourced aggregate?

Construct the aggregate by calling `rehydrate(givenEvents)` with a list of past events. Issue the command. Assert the returned events match the expected list. No mocks, no database, no infrastructure. The test is fast, deterministic, and co-located with the domain logic. For negative cases (command rejected), assert that the command handler throws the expected domain exception. Because apply methods are pure, you can also test state transitions directly by asserting aggregate property values after rehydration.

### Q2. How do you test a projection?

Construct an in-memory (or test-scoped) read model. Feed events directly to the projection handler. Assert read model state. No event store, no broker. For integration tests, seed the event store with known events and assert the read model state after the projection catches up. Projection tests are fast and isolated because the handler is just a function from `(event, readModel) → readModel`. Test edge cases: events arriving out of order (if the system allows it), events with missing fields (schema evolution), and the empty stream case.

### Q3. What is the benefit of replay testing in production-like environments?

You can take a copy of the production event log, deploy a new version of the application, and replay the entire history to validate: (1) upcasters correctly transform old events; (2) projection logic produces the expected read model; (3) new aggregate logic applies cleanly to historical events; (4) performance characteristics under real data volumes. This is Fowler's debugging use case elevated to a deployment gate. It gives you a confidence level in schema migrations and logic changes that is impossible to achieve with synthetic test data alone.

### Q4. What are the risks of not testing the apply (event handler) methods thoroughly?

Apply methods are called during rehydration on *every* aggregate load. A bug in an apply method can make it impossible to load an aggregate, effectively bricking it until a fix is deployed and the stream is rehydrated again. Worse, if the apply method has a schema assumption that's violated by old events (e.g., assumes a field is non-null that was nullable in an old version), you get runtime exceptions on rehydration of old aggregates but not new ones — a time-delayed failure that's hard to reproduce in testing. Thorough apply tests with historical event fixtures catch these before they reach production.
