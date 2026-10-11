# Neo4j Infrastructure Interview Primer

Interview preparation based on the Go energy-estimator take-home assignment. The answers are deliberately opinionated: explain what the submitted code does, why the trade-off was reasonable for the assignment, and what would change in a production system.

---

## Take-home walkthrough

### Summary

**What this topic covers**

The repository is a small batch-oriented Go CLI. It reads timestamped light-bulb events from stdin, reconstructs the dimmer state, and estimates energy consumption in watt-hours. The implementation is intentionally local: there is no service, database, broker, HTTP client, or concurrent worker pool. The interesting engineering work is in defining semantics for an unreliable event stream with duplicates, missing messages, and arbitrary delivery order.

**Mental model**

The command has three layers. `cmd/energy-estimator/main.go` owns process behaviour and exit codes. `internal/cli/root.go` wires Cobra to injected stdin, stdout, and stderr. `internal/estimator` owns the domain: parsing, normalisation, and energy calculation. The flow is:

```text
stdin → Parse → EstimateEnergy → Normalise → sort/deduplicate → integrate → stdout
```

The program must read to EOF before producing output. If an event with timestamp 100 arrives after an event with timestamp 50, processing the first event immediately could produce the wrong interval. Buffering is therefore not accidental; it follows from the protocol contract.

**Key terms**

- **TurnOff** — sets the dimmer to `0.0`.
- **Delta** — adjusts the dimmer by a value from `-1.0` to `+1.0`.
- **Normalise** — removes duplicate parsed events, sorts by timestamp, and rejects mixed `TurnOff`/`Delta` groups at one timestamp.
- **Energy integration** — applies the state that existed before an event for the interval leading up to that event.
- **Batch boundary** — the stream starts and ends with `TurnOff`, and the result is emitted only after EOF.

**Why interviewers ask this**

This is a compact way to probe state-machine design, event ordering, idempotency, numerical reasoning, error handling, and resource trade-offs. The assignment explicitly allows different edge-case choices, so the quality of the explanation matters as much as the choice. The strongest answer is not “this handles every unreliable-network problem”; it is “these are the failure modes I can distinguish from this protocol, these are the policies I selected, and these are the protocol changes I would require for stronger guarantees.”

**Common confusions**

- Sorting events is not the same as recovering lost events. Sorting only fixes delivery order.
- Deduplicating identical fields is not a perfect retry protocol. Without a message ID, a legitimate repeated event is indistinguishable from a duplicate delivery.
- A same-timestamp event can affect the state after the timestamp even though it contributes no duration itself.
- The benchmark measures the estimator path, not complete stdin parsing, process startup, or an end-to-end load test.
- The assignment guarantees stream boundaries, but the implementation still validates them to fail clearly on bad input.

**What follows from this topic**

The natural next discussion is productionisation. A real event source would need event IDs or sequence numbers, durable replay, resource limits, cancellation, metrics, and a policy for partial failure. The current program is a good batch exercise, not a general-purpose distributed event processor.

### Q1. Give a two-minute explanation of the architecture.

The entry point constructs a Cobra command with injected standard I/O. The parser reads stdin with a buffered scanner and turns each line into an `Event` containing an int64 timestamp, event type, and Delta. `EstimateEnergy` normalises the events, validates stream boundaries, walks timestamp groups, integrates the previous dimmer state over the elapsed interval, and then applies the next state. The CLI formats the resulting watt-hours and writes one line to stdout.

The important trade-off is buffering. Arbitrary out-of-order input makes a correct constant-memory streaming calculation impossible without additional protocol guarantees. The implementation is therefore `O(n log n)` due to sorting and `O(n)` memory.

### Q2. Why is `EstimateEnergy` responsible for calling `Normalise`?

That keeps the main domain invariant inside the public calculation operation. A caller cannot accidentally calculate on unsorted or duplicate events merely because it forgot to call a preparatory function. The trade-off is that the API hides a potentially expensive operation and makes repeated estimation repeat normalisation. If the package grew, an explicit normalised representation could be useful, but for this small CLI the safe default is reasonable.

### Q3. Why reject malformed input instead of skipping it?

Skipping a malformed event silently changes the timeline and can produce an apparently valid but incorrect energy value. The program fails fast, reports the input line for parser failures, writes the error to stderr, and exits non-zero. A production ingestion pipeline might route bad messages to a dead-letter stream instead, but a one-shot CLI should not silently invent a result.

### Q4. What is the exact energy calculation?

For each timestamp group, the code first calculates the energy between the previous timestamp and the current timestamp:

```text
energy += currentDimmer × 5 watts × elapsedSeconds / 3600
```

Only after charging that interval does it apply the events at the current timestamp. This models a state transition occurring at the timestamp rather than before it. Multiple Deltas at the same timestamp are summed before validation and application.

### Q5. What would you change if this became a production service?

I would start with the input contract rather than adding infrastructure immediately. I would add a unique event ID or sequence number, define replay and acknowledgement semantics, and decide whether ordering is per bulb or global. Then I would add a maximum input size, cancellation, structured error types, metrics, and a durable source. If arbitrary out-of-order streams could be very large, I would use external sorting or change the protocol to provide bounded lateness.

## Reliability and idempotency

### Summary

**What this topic covers**

The assignment describes an unreliable transport: messages can be duplicated, lost, or delivered out of order. The code handles two of those cases directly and makes an explicit statement about the third. Duplicates are removed with a map key derived from the parsed event. Out-of-order events are sorted after EOF. Lost messages are not reconstructed because stdin provides no evidence that a message ever existed.

**Mental model**

Treat each input line as an event observation, not as a command that can necessarily be replayed safely. The implementation's idempotency key is effectively:

```text
(timestamp, event type, delta)
```

That is enough to make the assignment's repeated `Delta -0.25` harmless. It is not enough to distinguish two legitimate identical events. A reliable distributed protocol needs a stable identity independent of the event payload, usually a producer-generated event ID or monotonically increasing sequence number.

**Key terms**

- **Idempotency key** — identity used to make repeated delivery safe.
- **At-least-once delivery** — duplicates are possible; consumers need deduplication.
- **At-most-once delivery** — messages may be lost, but duplicates are avoided.
- **Replay** — re-reading durable events after failure.
- **Dead-letter handling** — isolating messages that cannot be processed.
- **Partial failure** — only part of a distributed operation succeeds or is observed.

**Why interviewers ask this**

Infrastructure engineers are expected to separate transport guarantees from application behaviour. Saying “I used a map for duplicates” is incomplete: the next questions are what the key means, how long it is retained, what happens across restarts, and whether legitimate repeated operations are possible. The correct answer may be that the protocol is under-specified.

**Common confusions**

- A duplicate payload is not necessarily a duplicate event.
- A retry is not safe merely because the operation looks small.
- A dead-letter queue does not recover a message that was never emitted or persisted.
- Kafka can provide replay and offsets, but it does not solve event identity or producer-side loss automatically.
- Sorting does not establish causal order if device clocks are wrong or timestamps are not comparable.

**What follows from this topic**

With event IDs, the deduplication map could be keyed by ID and persisted or scoped to a replay window. With sequence numbers, the consumer could detect gaps rather than silently estimate through them. A production design would also decide whether a gap is fatal, tolerated, or repaired by replay.

### Q1. How does the current code identify duplicates?

`Normalise` uses `map[Event]struct{}`. Since `Event` contains comparable fields, the timestamp, type, and parsed floating-point Delta form the key. The map is built before sorting, so duplicates do not influence state or energy.

The important limitation is that the payload is being used as identity. If two real events have the same fields, one will be discarded. I would call that out rather than claim exactly-once processing.

### Q2. How would you change the protocol for robust retries?

I would add a producer-generated event ID:

```go
type Event struct {
	ID         string
	Timestamp  int64
	Type       EventType
	Delta      float64
	SourceLine int
}

type eventKey struct {
	ID string
}
```

The source line would remain diagnostic metadata and would not be part of identity. The consumer could persist processed IDs or offsets so a process restart does not reapply old events.

### Q3. What does the program do when a message is lost?

It cannot know that the message was lost. The program estimates from the received stream. A missing transition may cause an invalid dimmer value and therefore an error, but it may also result in a plausible yet incorrect estimate. Stronger guarantees require sequence numbers, replay, or a durable source.

### Q4. What would retries, acknowledgements, and a dead-letter queue look like in production?

The consumer would read a message, validate and persist its processing decision, then acknowledge it only after the result was durably recorded. Transient failures would use bounded retries with backoff and jitter. Permanently invalid messages would be sent to a dead-letter stream with the original payload and failure reason. The idempotency key would be checked before applying the event so a retry after an acknowledgement boundary could not double-apply it.

### Q5. Are same-timestamp events safe?

Multiple Deltas are additive, so their order does not matter. `TurnOff` and `Delta` are not commutative, so the current code rejects a group containing both. That is a deterministic choice. An alternative product decision could be “TurnOff wins,” but it must be implemented explicitly rather than relying on stable sort or input order.

For a “TurnOff wins” policy, I would reduce the whole timestamp group in one place:

```go
func applyTimestampGroup(dimmer float64, events []Event) (float64, error) {
	var delta float64
	hasTurnOff := false

	for _, event := range events {
		switch event.Type {
		case EventTurnOff:
			hasTurnOff = true
		case EventDelta:
			delta += event.Delta
		}
	}

	if hasTurnOff {
		return 0, nil
	}

	next := dimmer + delta
	if next < 0 || next > 1 {
		return 0, fmt.Errorf("dimmer outside [0.0, 1.0]")
	}
	return next, nil
}
```

The important design point is that the policy is explicit and independent of input order.

## Performance and production review

### Summary

**What this topic covers**

The implementation is designed for a finite stdin stream. It uses a `bufio.Scanner`, an event slice, a deduplication map, and a stable sort. The main resource trade-off is deliberate: arbitrary out-of-order delivery requires retaining enough data to reorder the stream. The code has a 1 MiB per-line scanner limit but no total input limit.

**Mental model**

The cost profile is:

```text
parse                 O(n)
deduplicate           O(n) expected
sort                  O(n log n)
energy walk           O(n)
memory                O(n)
```

The benchmark creates 10,000 reversed `Event` values and exercises normalisation plus estimation. It is useful evidence that the chosen approach is comfortable at that size, but it is not a complete load test. It does not include scanner parsing, process startup, stdout, or an arbitrarily large input.

**Key terms**

- **Backpressure** — slowing or rejecting producers when consumers cannot keep up.
- **External sort** — sorting chunks on disk and merging them to bound memory.
- **Resource limit** — explicit cap on events, bytes, duration, or memory.
- **Tail latency** — the slowest request or batch completion times, often p95/p99.
- **Static binary** — the Linux build uses `CGO_ENABLED=0`, simplifying distribution.
- **Reproducibility** — the same source and toolchain produce verifiable artifacts.

**Why interviewers ask this**

Infrastructure work is often about failure under scale rather than the happy path. The interesting question is not whether 10,000 events work; it is what happens at 10 million, when stdin never closes, when memory pressure starts, or when a container receives SIGTERM halfway through a batch.

**Common confusions**

- A fast benchmark is not proof of bounded memory.
- Adding goroutines would not remove the need to order events.
- Kafka is not automatically a solution to arbitrary batch sorting.
- A 1 MiB line limit is not a total memory limit.
- Cross-compiling a binary is not the same as validating a production image.

**What follows from this topic**

The next practical improvements are a configurable event or byte limit, a benchmark through the parser and CLI boundary, CI with race and vet checks, and a deployment artifact with explicit architecture and version metadata. If the workload genuinely grows, revisit the event protocol before adding a distributed system.

### Q1. How would you prevent unbounded memory usage?

First I would add a configurable maximum event count and fail clearly when it is exceeded:

```go
type ParserOptions struct {
	MaxEvents int
}

if options.MaxEvents > 0 && len(events) >= options.MaxEvents {
	return nil, fmt.Errorf("input exceeds maximum of %d events", options.MaxEvents)
}
```

That is a protection, not a scalability solution. For larger valid streams, I would use external merge sorting or require sequence/bounded-lateness information from the producer.

### Q2. How would you add cancellation?

The parser could check a context between lines:

```go
func Parse(ctx context.Context, input io.Reader) ([]Event, error) {
	scanner := bufio.NewScanner(input)
	var events []Event

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		event, err := parseLine(scanner.Text())
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, scanner.Err()
}
```

That does not interrupt a reader blocked inside `Scan`. For OS stdin, signal handling may need to close the reader or allow the process to terminate. I would define ownership and cleanup before adding a goroutine.

### Q3. Is the current benchmark complete?

No. It benchmarks `EstimateEnergy` with an in-memory reversed event slice. I would add a second benchmark that generates or reads 10,000 textual lines and calls `Parse`, and a separate subprocess test if startup and output are relevant. I would report allocations and peak memory separately from latency.

### Q4. How would you deploy this in Kubernetes?

As a batch job with finite input, an explicit resource request/limit, an external deadline, and stdout captured as the result. The static Linux binary is a good base for a small image. I would add CI-built artifacts, architecture labels, checksums, structured failure output, and SIGTERM handling. I would not present the current code as a long-running service because it has no readiness, liveness, metrics, checkpointing, or cancellation model.

### Q5. What observability would you add?

For a batch run I would emit structured metadata such as input event count, unique event count, duplicate count, timestamp range, duration, peak memory if available, and failure category. I would keep the final numeric result on stdout if that is the contract, and send diagnostics to stderr or a structured log stream.

## Go code review and reliability snippets

### Summary

**What this topic covers**

The code is mostly idiomatic for a small Go program: domain logic uses the standard library, `io.Reader` and `io.Writer` are injected at the CLI boundary, tests are table-driven, and there is no unnecessary concurrency. The main Go-specific discussion points are context, error classification, floating-point boundaries, and process exit behaviour.

**Mental model**

Keep the domain package independent from Cobra. Use small interfaces where the code consumes them, not interfaces for every concrete type. Return errors rather than logging deep inside the library. Preserve useful context with `%w`, and make the process boundary responsible for formatting errors and selecting an exit code.

**Key terms**

- **Dependency injection** — passing readers, writers, or configuration into a function rather than using globals.
- **Error wrapping** — retaining a causal error chain with `%w`.
- **Typed error** — an error carrying structured fields callers can inspect with `errors.As`.
- **Context cancellation** — cooperative cancellation for blocking work.
- **Race detector** — runtime instrumentation enabled with `go test -race`.
- **Table-driven test** — one test body exercised by a set of named cases.

**Why interviewers ask this**

Small Go programs reveal whether a candidate reaches for simple language conventions or imports patterns from larger frameworks. This repository gives good examples of useful injection and table tests, but also exposes a few places where production code would need stronger error and lifecycle contracts.

**Common confusions**

- A context does not magically interrupt every `io.Reader`.
- A race-free program can still have incorrect distributed semantics.
- `go test` passing does not prove cross-platform build or resource behaviour.
- A benchmark that allocates input before `ResetTimer` is measuring the intended operation, but not input generation.
- Cobra is a CLI dependency, not a message-processing framework, but it is still optional here.

**What follows from this topic**

The best refactor would improve explicit contracts without introducing abstractions the assignment does not need: typed parse/state errors, a formatting policy, parser limits, and a clean process boundary. Concurrency should only be added if a measurable requirement demands it.

### Q1. How would you fix the process error path?

The process boundary can be simplified:

```go
func main() {
	command := cli.NewCommand(os.Stdin, os.Stdout, os.Stderr)
	if err := command.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
```

The important point is to keep a non-zero exit code even if writing the diagnostic itself fails. The command should not log and exit in multiple layers.

The output contract should also be explicit rather than relying on `%g`'s default precision:

```go
func formatEnergy(energyWh float64) string {
	const decimalPlaces = 6

	rounded := math.Round(energyWh*1_000_000) / 1_000_000
	return strconv.FormatFloat(rounded, 'f', -1, 64)
}
```

That preserves concise values such as `2.5` and `5.625` while limiting floating-point noise. The number of decimal places is a product decision and should be covered by output tests.

### Q2. How would you preserve source line numbers through sorting?

Add diagnostic metadata to `Event`, but exclude it from the deduplication key:

```go
type Event struct {
	Timestamp int64
	Type      EventType
	Delta     float64
	Line      int
}

type eventKey struct {
	Timestamp int64
	Type      EventType
	Delta     float64
}
```

The line number travels with the event. For a same-timestamp failure, the error can report the timestamp and all source lines in the group.

### Q3. What is missing from the error model?

Errors are currently plain formatted strings. I would introduce a small set of categories only if callers need to branch on them:

```go
var (
	ErrInvalidInput = errors.New("invalid input")
	ErrInvalidState = errors.New("invalid dimmer state")
)

return fmt.Errorf("line %d: %w: %s", line, ErrInvalidInput, detail)
```

Then tests or callers could use `errors.Is`. I would avoid creating a large error hierarchy for a one-shot CLI.

### Q4. Why is dependency injection useful here?

`NewCommand` accepts `io.Reader` and `io.Writer`, so tests do not need to mutate global stdin/stdout. That makes the command deterministic and allows in-process tests. The subprocess tests complement this by checking the real executable, exit code, and stream boundaries.

### Q5. Would you add goroutines to speed this up?

Not initially. Parsing one input stream and sorting the resulting slice are already simple and fast at the tested size. Parallel parsing would complicate line numbering and ordering, and parallel state transitions are not naturally independent. I would profile first and only parallelise independent work such as chunk sorting as part of an external-sort design.

## Pair-programming drills

### Summary

**What this topic covers**

The most likely collaborative tasks are small policy or reliability changes rather than a complete redesign. The interviewers may give a failing test, ask for a new edge case, or ask you to make one production concern explicit. The winning approach is to clarify semantics before editing code, write the smallest failing test, implement the narrow change, and run focused plus full checks.

**Mental model**

Start from the state machine and invariants. Ask: what is the identity of an event, what ordering is guaranteed, what happens at a timestamp boundary, and what should happen on malformed input? Do not start by adding a goroutine, broker, or abstraction. Identify whether the requested change is a protocol change, a domain-policy change, or only a CLI concern.

**Key terms**

- **Red-green-refactor** — reproduce the failure, make it pass, then improve structure.
- **Invariant** — a condition that must remain true, such as dimmer in `[0, 1]`.
- **Regression test** — a test that preserves a discovered bug fix.
- **Policy boundary** — the place where ambiguous input is given deterministic meaning.
- **Minimal change** — the smallest implementation that satisfies the clarified requirement.
- **Acceptance criteria** — observable behaviour agreed before coding.

**Why interviewers ask this**

Pair programming tests communication, not just typing speed. Interviewers want to see whether you inspect existing abstractions, ask about ambiguity, preserve existing behaviour, and use tests as executable design. This repository is small enough that an unnecessary refactor is easy to spot.

**Common confusions**

- Do not change same-timestamp semantics without updating both normalisation and energy tests.
- Do not include source-line metadata in an idempotency key.
- Do not claim a context cancels a blocked scanner without addressing reader ownership.
- Do not add a maximum event count without deciding whether it is a CLI flag or library option.
- Do not use a benchmark result as a universal capacity promise.

**What follows from this topic**

The safest interview workflow is: restate the requirement, identify the invariant it changes, add a focused test, implement the smallest change, run `go test`, then discuss production extensions separately. If time runs out, leave a clear next step rather than a half-designed distributed system.

### Q1. Change the same-timestamp policy to “TurnOff wins”.

Likely files: `normaliser.go`, `energy.go`, and their tests. First clarify whether Deltas are ignored or accumulated before being discarded. Then make timestamp-group reduction explicit and test both input orders. Do not rely on stable sorting to implement the policy.

The core reduction could look like this:

```go
func applyTimestampGroup(dimmer float64, events []Event) (float64, error) {
	var delta float64
	hasTurnOff := false

	for _, event := range events {
		switch event.Type {
		case EventTurnOff:
			hasTurnOff = true
		case EventDelta:
			delta += event.Delta
		}
	}

	if hasTurnOff {
		return 0, nil
	}

	next := dimmer + delta
	if next < 0 || next > 1 {
		return 0, fmt.Errorf("dimmer outside [0.0, 1.0]")
	}
	return next, nil
}
```

### Q2. Add a maximum event count.

Likely files: `parser.go`, `root.go`, and CLI tests. Decide whether the limit is a parser option or a Cobra flag. Test exactly at the limit and one over it. Explain that this protects the process but does not solve large valid out-of-order streams; external sorting or a stronger protocol would address that.

For a parser-level option:

```go
type ParserOptions struct {
	MaxEvents int
}

if options.MaxEvents > 0 && len(events) >= options.MaxEvents {
	return nil, fmt.Errorf("input exceeds maximum of %d events", options.MaxEvents)
}
```

### Q3. Improve invalid-state errors with line numbers.

Likely files: `event.go`, `parser.go`, `normaliser.go`, `energy.go`, and tests. Preserve source metadata through sorting and keep it out of the deduplication key. Report one or more lines for the offending timestamp group.

The diagnostic line should not change event identity:

```go
type Event struct {
	Timestamp int64
	Type      EventType
	Delta     float64
	Line      int
}

type eventKey struct {
	Timestamp int64
	Type      EventType
	Delta     float64
}
```

### Q4. Fix output precision.

Likely files: `internal/cli/root.go` and CLI tests. Define a visible output contract first, then add cases for zero, the assignment examples, small values, and values exposing `%g` rounding.

For trimmed output with six decimal places of precision:

```go
func formatEnergy(energyWh float64) string {
	rounded := math.Round(energyWh*1_000_000) / 1_000_000
	return strconv.FormatFloat(rounded, 'f', -1, 64)
}
```

### Q5. Add cancellation.

Likely files: `main.go`, `root.go`, and `parser.go`. Clarify whether cancellation must interrupt blocked stdin. Add `signal.NotifyContext`, pass context explicitly, and define how the input reader is closed. Avoid a goroutine leak.

The parser can check cancellation between lines:

```go
func Parse(ctx context.Context, input io.Reader) ([]Event, error) {
	scanner := bufio.NewScanner(input)
	var events []Event

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		event, err := parseLine(scanner.Text())
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, scanner.Err()
}
```

### Q6. Add CI validation.

Likely files: a workflow file and `Makefile`. Run tests, race detection, vet, and the Linux build. Keep benchmarks separate from normal CI unless a stable threshold is required.

The local Makefile target should make the same checks easy to reproduce in CI:

```make
test:
	go test ./...

race:
	go test -race ./...

vet:
	go vet ./...

build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build ./cmd/energy-estimator
```

## Night-before checklist

### Summary

**What this topic covers**

Use this as the final rehearsal list before the interview. The goal is not to memorise every line; it is to be able to explain the current behaviour, defend the deliberate trade-offs, and name the first production changes without pretending they are already implemented.

**Mental model**

The core story is: one finite input stream, explicit event semantics, deduplication by the only identity available, batch sorting because delivery order is unreliable, deterministic rejection of ambiguous state, and step-function energy integration. Everything else follows from those choices.

**Key terms**

- event identity
- at-least-once delivery
- missing-message ambiguity
- timestamp grouping
- `O(n log n)` sorting
- `O(n)` memory
- context and resource limits
- typed errors and observability

**Why interviewers ask this**

The follow-up interview is explicitly interested in edge cases, technical decisions, and what would change in production. A concise, honest answer is stronger than claiming the assignment is a complete distributed system.

**Common confusions**

- The implementation is not concurrent, and that is deliberate.
- The benchmark does not prove unlimited scalability.
- Kafka would require event IDs, offsets, replay, and idempotency semantics.
- Passing tests does not remove the need to discuss floating-point precision and resource exhaustion.

**What follows from this topic**

Practise explaining the code aloud, then practise making one small change while narrating assumptions and tests. The interviewers are likely to reward clear reasoning, good failure boundaries, and a willingness to change the design when the requirement changes.

### Q1. Commands to know

```bash
go test ./...
go test -race ./...
go vet ./...
make perf-test
make build
```

### Q2. The most important limitations to volunteer

The biggest ones are payload-based deduplication without event IDs, inability to reconstruct lost messages, unbounded total memory, no cancellation or timeout, implicit floating-point output precision, and no CI/deployment observability.

### Q3. The strongest production answer

Start by improving the event contract: add IDs or sequence numbers and durable replay. Then add resource limits, cancellation, typed errors, metrics, structured logs, reproducible builds, and a bounded-memory ordering strategy. Only after those requirements are clear should you introduce a broker or distributed deployment.

### Q4. The strongest pair-programming workflow

Restate the requirement, identify the invariant it changes, write a failing test, implement the smallest change, run the focused test, then run the full suite. Explain trade-offs while coding and leave any larger production redesign as a follow-up unless the interviewer explicitly asks for it.
