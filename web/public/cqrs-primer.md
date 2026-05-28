---
created-on: "[[Journal/2026/May/28-Wed]]"
ctime: 2026-05-28 09:00:00
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# CQRS Interview Primer

Focused Q+A primer on Command Query Responsibility Segregation — the pattern, its variants, tradeoffs, and how it composes with Event Sourcing and DDD. Aimed at senior backend and architecture interviews.

---

## What is CQRS

### Summary

**What this topic covers**

CQRS (Command Query Responsibility Segregation) is the architectural pattern of separating the write side of a system (commands that mutate state) from the read side (queries that return data). Greg Young coined the term; the idea descends from Bertrand Meyer's Command-Query Separation principle at the method level. This topic covers what the pattern actually is, when it is and isn't the right tool, and the vocabulary interviewers expect you to use fluently.

**Mental model**

Think of a busy restaurant. The kitchen (write side) receives orders, mutates ingredients, and produces meals — it cares about correctness, consistency, and not poisoning anyone. The front-of-house menu boards (read side) tell customers what's available, in whatever format is most useful — by price, by dietary requirement, by table — without touching the kitchen's inventory directly. The two sides have completely different performance profiles, scaling needs, and data shapes. CQRS makes that split explicit in code.

At the method level: a command changes state and returns nothing (or just an acknowledgement); a query returns data and changes nothing. At the architectural level: commands go to a write model backed by a normalised, consistency-enforcing store; queries go to one or more read models (projections) optimised for the exact shape UIs and APIs need.

**Key terms**

- **Command** — an instruction to change state (`PlaceOrder`, `CancelReservation`). Named in the imperative. May be rejected. Returns void or an ack.
- **Query** — a request for data (`GetOrderSummary`, `ListAvailableRooms`). Never mutates state. Returns a value.
- **Write model** — the authoritative domain model; enforces invariants; typically normalised.
- **Read model / Projection** — a denormalised, query-optimised view of the data; rebuilt from the write side.
- **Command handler** — receives a command, validates it, applies business logic, persists changes.
- **Query handler** — fetches from the read model and returns a DTO; no domain logic.
- **Eventual consistency** — the read model may lag the write model by milliseconds to seconds after a command succeeds.
- **Thin vs thick read model** — thin = a simple DB view; thick = a fully denormalised separate datastore (Redis, Elasticsearch, separate SQL DB).

**Why interviewers ask this**

CQRS is a litmus test for architectural maturity. Junior engineers see it as "just two classes." Senior engineers recognise it as a decision with cascading consequences — on consistency guarantees, operational complexity, team topology, and how you handle failures in the synchronisation path. Interviewers use it to probe whether you understand *why* the pattern exists (asymmetric read/write scaling and domain model mismatch with query shapes), not just what it is.

**Common confusions**

- "CQRS means two databases" — not necessarily. The simplest CQRS is two code paths into the same database. Two databases is one valid deployment choice, not the definition.
- "CQRS requires Event Sourcing" — they compose well but are independent. You can have CQRS with a mutable write store, and Event Sourcing without CQRS.
- "CQS and CQRS are the same thing" — CQS is a method-level principle (Bertrand Meyer, 1988). CQRS is an architectural pattern that applies the same idea to entire subsystems.
- "The read model is just a cache" — a cache is a copy of the write model's data. A read model is purpose-built for query shapes and may aggregate data from multiple write-side aggregates.
- "CQRS is always eventual consistency" — only when the read model is updated asynchronously. Synchronous projection updates (in the same transaction) preserve strong consistency at the cost of write throughput.

**What follows from this topic**

CQRS is the entry point to Event Sourcing (where the write model stores events instead of current state), DDD aggregates (the natural unit behind a command handler), projections and read-model rebuilding, and saga/process-manager patterns for multi-aggregate workflows. Get CQRS solid first; those topics layer on top.

### Q1. What is CQRS and where does it come from?

CQRS separates every operation into either a **command** (mutate state, return nothing) or a **query** (return data, mutate nothing) — and routes them through entirely separate models. Greg Young extracted and named it (~2010) from Bertrand Meyer's CQS principle, applying the same idea at architectural scale rather than just method signatures.

The motivation: a single unified model is forced to serve two conflicting masters — the write side needs to enforce invariants and keep data normalised; the read side needs denormalised, pre-joined projections that match exactly what the UI needs. CQRS stops pretending one model can do both well.

### Q2. What is the difference between CQS and CQRS?

**CQS (Command-Query Separation)** is a method-level design principle: every method is either a command (side effects, void return) or a query (no side effects, returns value), never both. Bertrand Meyer introduced it in *Object-Oriented Software Construction* (1988).

**CQRS** applies the same intent at the architectural level: entire subsystems are split into a command stack and a query stack, each with their own models, handlers, and optionally their own datastores. CQS is about API design discipline; CQRS is about system architecture.

### Q3. Do you need two databases to implement CQRS?

No. The spectrum runs from:

1. **Same DB, two code paths** — command handlers write to normalised tables; query handlers read from views or the same tables directly. Minimal infrastructure, strong consistency, limited benefit.
2. **Same DB, separate read tables** — projections are materialised into denormalised tables alongside the write tables. Moderate complexity, read performance gains.
3. **Separate read store** — write model in Postgres; read models in Redis, Elasticsearch, or a read replica. Maximum read scalability; introduces eventual consistency and a sync mechanism.

Two databases is one deployment option, not the definition. Start with option 1 or 2; only add a separate read store when you have a measured need.

### Q4. When should you use CQRS and when should you avoid it?

**Use it when:**
- Read and write loads are asymmetric (reads >> writes, or they have different SLAs)
- Domain model structure is a poor fit for query shapes (complex joins, aggregated views)
- You need independent scaling of reads and writes
- You're already doing DDD with aggregates and bounded contexts

**Avoid it when:**
- The domain is CRUD — no meaningful invariants, no complex domain model
- Team is small or unfamiliar with the pattern — the operational overhead is real
- Strong consistency across reads is a hard requirement and you can't afford synchronous projection updates
- You're building an MVP — add it when the pain is demonstrated, not in anticipation

The biggest mistake: applying CQRS to a simple CRUD service because it sounds sophisticated. The pattern earns its complexity only in domains with genuine command/query asymmetry.

## Commands and Command Handlers

### Summary

**What this topic covers**

The write side of a CQRS system: how commands are structured, validated, dispatched, and handled; the relationship between commands and domain aggregates; and how handlers interact with persistence. This is where business logic and invariant enforcement live.

**Mental model**

A command is a letter you send to the system asking it to do something. The command handler is the clerk who opens the letter, checks it's valid, decides whether to act on it, and if so makes the change and files it. The clerk has authority to say no — if the requested action violates business rules, the command is rejected with a domain error, not silently ignored. The caller gets back either a success acknowledgement or a domain exception.

**Key terms**

- **Command object** — a plain data structure carrying the intent and its parameters (`PlaceOrderCommand { customerId, items, shippingAddress }`).
- **Command bus** — a dispatcher that routes a command to its registered handler. May be in-process (simple method call) or out-of-process (message queue).
- **Command handler** — loads the relevant aggregate, calls domain logic, persists changes. One handler per command type.
- **Aggregate** — the consistency boundary that validates the command; the unit of transactional consistency.
- **Domain event** — what the aggregate emits when a command succeeds; consumed downstream to update read models.
- **Idempotency key** — a client-supplied ID that lets the handler deduplicate retried commands safely.

**Why interviewers ask this**

This is where theoretical CQRS meets implementation reality. Interviewers want to see that you understand: (1) commands can fail for domain reasons, not just technical ones; (2) the handler is a thin orchestrator — domain logic belongs in the aggregate, not the handler; (3) how you handle retries and idempotency; and (4) what the handler's transaction boundary looks like.

**Common confusions**

- "Put business logic in the command handler" — the handler loads the aggregate and delegates; the aggregate owns the rules. Handlers with `if`/`else` business logic are a smell.
- "Commands are always async" — a command bus can be fully synchronous in-process. Async is a deployment choice, not part of the pattern definition.
- "One command can update multiple aggregates in one transaction" — this breaks aggregate boundaries. Multi-aggregate workflows need sagas or process managers.
- "Validation belongs in the command handler" — surface/format validation (is this a valid email?) can live in the command; business invariant validation belongs in the aggregate.

**What follows from this topic**

Command handlers are the bridge between the application layer and the domain model. Understanding them well sets up: aggregate design and invariant enforcement, sagas for cross-aggregate workflows, event publishing pipelines, and idempotency patterns for distributed systems.

### Q5. What does a command handler do, and what should it not do?

A command handler:
1. Deserialises / receives the command
2. Validates input (format, required fields) — not business rules
3. Loads the relevant aggregate from the repository
4. Calls the appropriate aggregate method, passing command data
5. Persists the updated aggregate (or the emitted events, in Event Sourcing)
6. Publishes any domain events to the bus / outbox

It should **not**: contain `if`/`else` business logic, directly query read models, call other aggregates in the same transaction, or perform external HTTP calls inside the transaction boundary.

### Q6. How do you handle command failures?

Two categories:

**Domain failures** — the aggregate rejects the command because it violates a business rule (`InsufficientInventoryException`, `OrderAlreadyCancelledException`). These are expected, first-class outcomes. Return a domain error to the caller; do not throw a generic 500.

**Technical failures** — DB write failed, network timed out, message bus unavailable. Retry with exponential backoff + idempotency key. The idempotency key (a UUID the client generates) lets the handler detect and skip duplicate executions safely.

Pattern: store the idempotency key in the write DB atomically with the aggregate change. On retry, look up the key — if found, return the original result without re-executing.

### Q7. Can a command update more than one aggregate?

Not in a single transaction — that would violate aggregate boundaries (each aggregate is the consistency unit; spanning two aggregates in one transaction creates distributed transaction problems).

Multi-aggregate workflows use:
- **Sagas / process managers** — a long-running workflow that listens to domain events from one aggregate and issues commands to others in response. Each step is its own transaction.
- **Choreography** — aggregates publish events; other aggregates react autonomously (no central coordinator).
- **Orchestration** — a saga coordinator explicitly sequences commands to multiple aggregates, tracking state and handling failures.

The cost: eventual consistency between aggregates. The benefit: no distributed transactions, independent failure domains.

### Q8. What is the role of an outbox pattern with CQRS?

The dual-write problem: after the handler commits the aggregate to the DB, it needs to publish a domain event to the bus. If the publish fails after the commit, the event is lost — read models never update, downstream consumers never hear about it.

The outbox pattern solves this: persist the event to an `outbox` table **in the same transaction** as the aggregate change. A separate relay process (or CDC — Change Data Capture via Debezium/Postgres logical replication) reads the outbox and publishes to the bus, retrying until confirmed. At-least-once delivery; idempotent consumers handle duplicates.

Result: the DB commit is the single source of truth; the event publish is reliably eventual.

## Read Models and Projections

### Summary

**What this topic covers**

The read side of CQRS: how projections are built, kept in sync with the write side, what datastores are appropriate, how to handle eventual consistency in practice, and how to rebuild projections when they go stale or are newly created.

**Mental model**

The read model is a pre-computed answer to a question. Instead of running a complex SQL join at query time, you computed the answer when the data changed and stored it ready to serve. Think of a materialised view that rebuilds itself automatically every time a relevant domain event arrives. You can have many different read models from the same write-side events — one shaped for the UI, one for analytics, one for an external API — each rebuilt independently, each optimised for its consumer.

**Key terms**

- **Projection** — the process of transforming domain events (or write-side state changes) into a read model.
- **Projector** — the component that listens to events and updates the read model store.
- **Read model store** — any persistence technology suited to the query: Redis (key-value lookup), Elasticsearch (full-text / faceted search), a SQL read replica, a document store.
- **Eventual consistency lag** — the time between a command succeeding on the write side and the read model reflecting that change. Typically milliseconds in-process, seconds over a message bus.
- **Projection rebuild** — replaying all events from the beginning to reconstruct a read model from scratch (needed when you add a new projection or fix a bug in an existing one).
- **Snapshot** — a point-in-time capture of aggregate state used to avoid replaying all events from the beginning on every rebuild.

**Why interviewers ask this**

The read side is where CQRS pays its bills. Interviewers want to see that you understand: (1) projections are derived data — the event log is the source of truth; (2) eventual consistency is a real UX problem you need a strategy for; (3) projection rebuild is an operational necessity, not an afterthought; (4) you match the read store technology to the query pattern.

**Common confusions**

- "The read model and the write model must be the same technology" — they don't. Postgres write model + Redis read model is a completely normal combination.
- "Eventual consistency means users see stale data forever" — the lag is typically <1s for async projections and 0 for synchronous ones. The UX strategy is to show the user what they submitted optimistically, not to fix the lag.
- "You only need one read model" — you can have as many as consumers need, each independently shaped and stored.
- "Projection rebuild is a one-time thing" — you will rebuild projections whenever you fix a bug in a projector, change the shape of a read model, or add a new consumer. It must be operationally trivial.

**What follows from this topic**

Read models lead to: choosing read store technologies, handling UI consistency (optimistic updates, polling, WebSocket push), Event Sourcing (where the event log makes rebuild trivially correct), and CQRS in microservices (each service owning its own projections of events from other services).

### Q9. How do you keep the read model in sync with the write model?

Three approaches, in order of complexity:

1. **Synchronous in-process** — the command handler updates the read model table in the same DB transaction as the write. Strong consistency, no lag. Limits scalability (write transaction holds longer) and couples write and read stores to the same DB.

2. **Synchronous but separate** — the handler updates both stores in the same request (two-phase). Risk: partial failure. Mitigate with the outbox pattern — commit a domain event to the write DB, then a projector applies it to the read store. Near-synchronous if the relay is fast.

3. **Asynchronous via event bus** — the handler publishes a domain event; a projector subscribes and updates the read store. Fully decoupled, independently scalable, but introduces eventual consistency lag (typically 10ms–2s).

Most production CQRS systems use option 3 with the outbox pattern to guarantee at-least-once event delivery.

### Q10. How do you rebuild a projection?

1. Stop the projector (or route it to a shadow store)
2. Truncate / drop the read model store
3. Replay all events from the event log (or from a snapshot + delta) through the projector
4. Swap the read model to the rebuilt version (blue/green if zero-downtime required)
5. Restart live projection

Key requirements: the event log must be durable and replayable (this is why Event Sourcing pairs so well with CQRS — the log *is* the source of truth). The projector must be **idempotent** — replaying the same event twice should produce the same result.

For large systems: use snapshots to avoid replaying years of events. Snapshot every N events; on rebuild, load the latest snapshot and replay only the delta.

### Q11. What read store technology should you use for read models?

Match the technology to the access pattern:

| Query pattern | Good fit |
|---|---|
| Key-value lookup (`GET /orders/{id}`) | Redis, DynamoDB |
| Full-text / faceted search | Elasticsearch, OpenSearch |
| Complex relational queries | Postgres read replica, materialised views |
| Geospatial queries | PostGIS, MongoDB |
| Analytics / aggregation | ClickHouse, BigQuery, columnar store |
| Simple low-latency reads | Redis, Memcached |

The point: the read model is derived data; you can store it in whatever shape and technology best serves the query, independent of how the write side stores its authoritative state.

### Q12. How do you handle eventual consistency from a UX perspective?

Strategies in order of user-friendliness:

1. **Optimistic UI** — immediately show the user the result of their command locally; sync in the background. If the command fails, roll back the local state and show an error. Used by most modern SPAs.
2. **Poll until consistent** — after a command, the client polls the read model with a version check until the expected version appears. Simple but wasteful.
3. **Push via WebSocket / SSE** — the server pushes a "your projection is ready" message to the client after the projector updates. Best UX, more infrastructure.
4. **Synchronous projection** — update the read model in the same transaction as the write. Eliminates the problem but limits scalability.

In most cases: optimistic UI + a sensible polling fallback covers 95% of cases without WebSockets.

## CQRS and Event Sourcing

### Summary

**What this topic covers**

The relationship between CQRS and Event Sourcing: how they compose, why they are often discussed together but are independent patterns, and what you gain and lose when combining them.

**Mental model**

CQRS says "split reads and writes." Event Sourcing says "store state as a sequence of events, not as current state." They are independent — but they fit together almost perfectly. Event Sourcing gives you an immutable, replayable event log on the write side; CQRS gives you a purpose-built read model on the read side built from that log. Together they form a system where every state change is recorded, read models are always rebuildable from scratch, and read and write sides can evolve independently.

**Key terms**

- **Event store** — the append-only log of domain events; the source of truth in Event Sourcing.
- **Aggregate rehydration** — replaying an aggregate's event history to reconstruct its current state when handling a new command.
- **Event-driven projection** — a projector that subscribes to the event store's event stream and updates read models.
- **Temporal queries** — querying the state of the system at any point in the past by replaying events up to that timestamp. Only possible with Event Sourcing.
- **Event versioning** — managing changes to event schemas over time without breaking existing projections.

**Why interviewers ask this**

Interviewers often deliberately conflate CQRS and Event Sourcing to see if you push back. Knowing they're independent but composable signals senior-level architectural thinking. The combination also unlocks powerful capabilities (full audit trail, temporal queries, projection rebuild) that are worth articulating clearly.

**Common confusions**

- "CQRS requires Event Sourcing" — false. CQRS works with any write store. Event Sourcing just makes the read-model rebuild story much cleaner.
- "Event Sourcing requires CQRS" — false. You can have an event store without separate read models.
- "They're the same pattern" — they're complementary patterns that solve different problems at the same layer.
- "Event Sourcing is just an audit log" — the audit log is a side effect. The events *are* the state; current state is derived from them.

**What follows from this topic**

The combination of CQRS + Event Sourcing is the foundation for: temporal queries, full audit trails, event-driven microservices (services share events, not DB tables), GDPR "right to forget" via event redaction, and A/B testing via projection variants.

### Q13. Can you use CQRS without Event Sourcing?

Yes. CQRS just requires separate command and query models — the write model can be a standard mutable relational store. The command handler loads an aggregate from a `SELECT`, applies changes, and does an `UPDATE`. The read model is updated via a change-data-capture feed or a synchronous projection update.

The downside without Event Sourcing: projection rebuild requires reading current write-side state, not replaying a complete history. You can rebuild to "now" but can't reconstruct historical states. The audit trail must be built separately if needed.

### Q14. Why does Event Sourcing pair so well with CQRS?

Because the event log is the perfect source for projections:

- **Replay** — to rebuild any read model, replay all events from the beginning through the projector. The log is immutable so replay is always deterministic.
- **Multiple projections** — the same event stream feeds any number of read models, each shaped differently.
- **Temporal queries** — replay up to a timestamp to answer "what did this order look like on Tuesday?"
- **Decoupling** — projectors are consumers of the event log; they can be added, removed, or rewritten without touching the write side.

Without Event Sourcing, the write side stores only current state — there's nothing to replay, so projection rebuild requires a full scan of current state and loses historical fidelity.

### Q15. What are the downsides of combining CQRS with Event Sourcing?

- **Operational complexity** — event store, projectors, read stores, and synchronisation pipelines are a lot of moving parts.
- **Event schema evolution** — changing an event's structure without breaking existing projectors requires versioning strategies (upcasting, event migration). Non-trivial.
- **Aggregate rehydration cost** — loading an aggregate by replaying all its events gets slow as history grows. Mitigate with snapshots, but that's another operational concern.
- **Eventual consistency** — projections lag the event log; queries may return stale data.
- **Learning curve** — the mental model shift (state is derived, not stored) is significant for teams used to CRUD.

Correct use: long-lived, complex domains (financial transactions, order management, logistics) where auditability and rebuildable read models are worth the cost. Incorrect use: a settings CRUD screen.

## CQRS in Practice — Scaling, Microservices, and Tradeoffs

### Summary

**What this topic covers**

How CQRS is deployed in real systems: scaling patterns, microservice topologies, operational tradeoffs, and the failure modes that bite teams who adopt it without understanding the costs.

**Mental model**

CQRS in production is not a single architecture — it's a dial. At one end: two code paths, one database, strong consistency, minimal complexity. At the other: fully separate write and read stores, async event-driven projections, independent scaling, and a distributed systems problem everywhere you look. Most teams should start at the simple end and move right only when they have a specific, measured reason.

**Key terms**

- **Write-side scaling** — typically scale vertically or via sharding on the write store; command throughput is usually the smaller problem.
- **Read-side scaling** — scale horizontally by replicating the read store; stateless query handlers behind a load balancer.
- **Bounded context** — a DDD concept; each bounded context typically owns its own command model, event log, and projections. Services in a microservices architecture map to bounded contexts.
- **Anti-corruption layer** — a translation layer between bounded contexts so each context's command model isn't polluted by another context's vocabulary.
- **Polyglot persistence** — using different database technologies for write and read stores based on their respective access patterns.

**Why interviewers ask this**

System design interviews live here. "Design a booking system" or "design a financial ledger" — the correct answer for complex domains involves CQRS thinking even if you don't name it. Interviewers want to see that you can reason about: where consistency boundaries sit, what the failure modes are when the sync pipeline breaks, and how you'd handle a read model that gets out of sync.

**Common confusions**

- "CQRS scales everything" — it scales reads independently from writes; it doesn't make writes faster.
- "All microservices should use CQRS" — applies CQS method-level discipline everywhere, CQRS architecture only where domains are complex enough to warrant it.
- "If the projector falls behind, queries return wrong data" — they return *stale* data, not wrong data. The write side is still consistent. Design UX to tolerate this; don't paper over it.

**What follows from this topic**

The practical scaling and operations section connects to: database sharding, read replica topology, Kafka-based event streaming, circuit breakers and resilience in projection pipelines, and multi-region CQRS deployments.

### Q16. How does CQRS help with scaling?

Read and write workloads are independently scalable because they're separated:

- **Reads** — stateless query handlers read from a dedicated read store. Scale horizontally: add query handler instances behind a load balancer, replicate the read store (Redis cluster, Elasticsearch replicas, Postgres read replicas).
- **Writes** — command handlers write to the authoritative store. Typically lower volume; scale via connection pooling, vertical scaling, or horizontal sharding by aggregate ID.

The key insight: most systems are read-heavy (10:1 to 100:1 read/write ratio). CQRS lets you throw cheap horizontal read capacity at that problem without touching the write path.

### Q17. How do you use CQRS in a microservices architecture?

Each microservice owns its own bounded context — its command model, event log, and read models are private to that service. Cross-service reads use events, not shared databases:

- Service A publishes domain events to a shared event bus (Kafka topic)
- Service B subscribes, runs its own projector, and builds a local read model of the data it needs from A
- Service B queries its own local read model — no synchronous call to Service A at query time

Benefits: Services are loosely coupled, independently deployable, and can have different read store technologies. Service B's read model is shaped exactly for B's query needs, not for A's domain model.

Failure handling: if Service B's projector falls behind, B's read model is stale — but B is still operational. The write side (Service A) is unaffected.

### Q18. What happens when the read model gets out of sync?

Root causes: projector crashes, event bus backlog, DB write failure on the read store side.

Mitigation strategy:
1. **Dead letter queue** — failed projection events go to a DLQ; an alert fires; an operator inspects and replays.
2. **Idempotent projectors** — replaying an event that was already applied produces the same state; safe to replay on recovery.
3. **Lag monitoring** — track the delta between the latest write-side event sequence number and the latest event the projector has processed. Alert when lag exceeds threshold.
4. **Rebuild as recovery** — if the read model is unrecoverably corrupt, rebuild from the event log. This must be a routine, tested operation — not a panic measure.

Design principle: treat the read model as **disposable derived data**. The event log is the source of truth. If the read model dies, you rebuild it.

### Q19. What are the main failure modes of CQRS systems?

- **Projection lag under load** — async projectors fall behind during write spikes; queries return stale data. Mitigate: scale projector consumers (Kafka consumer groups), prioritise projection lag in SLOs.
- **Lost events** — event publish fails after DB commit (dual-write problem). Mitigate: outbox pattern.
- **Schema drift** — event schema changes break existing projectors silently. Mitigate: schema registry, explicit event versioning, consumer compatibility tests.
- **Command duplication** — retried commands execute twice. Mitigate: idempotency keys, check for prior execution before applying.
- **Read model corruption** — a bug in a projector writes bad data. Mitigate: rebuild from event log; fix the projector; re-project.
- **Over-engineering simple domains** — the most common failure mode. CQRS in a CRUD service adds complexity with zero benefit.

### Q20. How would you implement CQRS in a Spring Boot service?

Minimal structure:

```
// Command
record PlaceOrderCommand(UUID customerId, List<OrderItem> items) {}

// Command handler (application layer)
@Service
class PlaceOrderHandler {
    private final OrderRepository repo;
    private final ApplicationEventPublisher events;

    void handle(PlaceOrderCommand cmd) {
        var order = Order.place(cmd.customerId(), cmd.items()); // domain logic in aggregate
        repo.save(order);
        events.publishEvent(new OrderPlacedEvent(order.id(), order.items()));
    }
}

// Query handler (no domain logic)
@Service
class OrderQueryHandler {
    private final OrderReadRepository readRepo;

    OrderSummaryDto getOrderSummary(UUID orderId) {
        return readRepo.findSummaryById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}

// Projector (updates read model)
@EventListener
class OrderProjector {
    private final OrderReadRepository readRepo;

    void on(OrderPlacedEvent event) {
        readRepo.upsert(new OrderSummaryDto(event.orderId(), event.items(), "PLACED"));
    }
}
```

For a full async pipeline: replace `ApplicationEventPublisher` with a Kafka producer; deploy the projector as a separate Kafka consumer group. The command handler's transaction boundary covers only the aggregate write + outbox entry.
