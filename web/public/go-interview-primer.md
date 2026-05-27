# Go Interview Primer

Senior-level Q+A covering Go backend interviews. Each answer is interview-shaped: direct, concrete, real tradeoffs.

---

## Core Go

### Summary

**What this topic covers**

The fundamentals every Go developer is expected to own: the type system, interfaces, goroutines, channels, the memory model, error handling, and the module system. This topic underpins everything else — concurrency, performance, testing, and idiomatic API design all build directly on these primitives.

**Mental model**

Go is a compiled, statically typed, garbage-collected language designed for simplicity and concurrency. The key mental shift from Java/C#: **composition over inheritance** — Go has no classes, no inheritance hierarchy, no `extends`. You build behaviour by embedding types and implementing interfaces. Interfaces are satisfied *implicitly* — if your type has the right methods, it satisfies the interface, no declaration required. This is structural typing. The second key shift: **goroutines are cheap** (2KB initial stack vs MB for OS threads), managed by the Go runtime scheduler (M:N threading). The third: **errors are values** — `error` is just an interface with an `Error() string` method. No exceptions, no try/catch. You handle errors at the call site, explicitly.

**Key terms**

- **goroutine** — lightweight thread managed by the Go runtime; started with `go f()`. Thousands can run concurrently.
- **channel** — typed conduit for goroutine communication; `make(chan T)` unbuffered, `make(chan T, n)` buffered.
- **interface** — set of method signatures satisfied implicitly (structural typing). The `interface{}` / `any` type is the empty interface satisfied by everything.
- **defer** — schedules a function call to run when the surrounding function returns. LIFO order. Used for cleanup.
- **panic / recover** — unhandled fatal error / recovery mechanism inside a deferred function. Not for normal control flow.
- **slice** — dynamic view over an underlying array: header holds pointer, length, capacity. `append` may allocate a new backing array.
- **map** — unordered hash map. Not safe for concurrent reads + writes without synchronisation.
- **struct embedding** — composing types by including one as an unnamed field; promotes the embedded type's methods.
- **value vs pointer receiver** — method with `(t T)` gets a copy; `(t *T)` can mutate. Consistency matters for interface satisfaction.
- **go modules** — dependency management via `go.mod` / `go.sum`. `go get`, `go mod tidy`.

**Why interviewers ask this**

Two signals. (1) **Idiomatic Go** — candidates from Java/Python who haven't internalised Go idioms reach for patterns that don't fit: exception handling, inheritance, over-abstraction with interfaces. Senior signal is code that *looks* Go: explicit errors, small interfaces, goroutines for concurrency, no unnecessary abstraction. (2) **Concurrency correctness** — Go makes concurrent code easy to write and easy to get wrong. Interviewers probe data races, channel deadlocks, goroutine leaks. Senior candidates know the rules and reach for `sync.Mutex`, `sync/atomic`, or channel patterns appropriately.

**Common confusions**

- "Goroutines are threads" — no, goroutines are multiplexed onto OS threads by the runtime scheduler (GOMAXPROCS defaults to number of CPUs). Many goroutines share few threads.
- "nil interface and nil pointer are the same" — they're not. An interface value is nil only when both its type and value are nil. A non-nil interface holding a nil pointer is not nil.
- "Closing a channel sends a zero value" — reads from a closed channel drain buffered values then return the zero value; *sends* to a closed channel panic.
- "Slices are arrays" — a slice is a view (pointer + len + cap) over an underlying array. Appending may or may not allocate a new array depending on capacity. Two slices can share the same backing array.
- "Defer is slow" — it has some overhead but is negligible in practice. The correctness it buys (guaranteed cleanup) is worth it.
- "`interface{}` is like Object in Java" — functionally similar but different: no methods, type assertions needed to extract the concrete value.

**What follows from this topic**

Concurrency (channels, sync primitives, data race detection) builds directly on goroutines and the memory model. Error handling patterns (wrapping, `errors.Is/As`, sentinel errors) build on errors-as-values. Performance and profiling assumes understanding of GC, escape analysis, and slice/map internals. Testing idioms (table-driven tests, `testing.T`, benchmarks) are the natural next step.

### Q1. What is the difference between a goroutine and an OS thread?

A goroutine is a lightweight unit of execution managed by the Go runtime, starting with ~2KB of stack (which grows dynamically). OS threads have a fixed stack (usually 1–8MB) and are managed by the kernel. The Go runtime multiplexes many goroutines onto a small pool of OS threads using an M:N scheduler (GOMAXPROCS threads by default). Goroutine creation and context switching are cheap — you can run hundreds of thousands concurrently without OS overhead.

### Q2. Explain how channels work and when to use buffered vs unbuffered.

A channel is a typed conduit: `ch := make(chan int)` (unbuffered) or `ch := make(chan int, 10)` (buffered). An unbuffered send blocks until a receiver is ready — it synchronises sender and receiver. A buffered channel decouples them: sends block only when the buffer is full, receives block only when empty. Use unbuffered when you need rendezvous semantics (sender hands off directly to receiver). Use buffered to absorb bursts or decouple producer/consumer throughput. Either way, always close channels from the sender side, never the receiver.

### Q3. What is the Go memory model and what guarantees does it provide?

The Go memory model defines when a write in one goroutine is guaranteed to be visible to a read in another. The rule: **a read of a variable in one goroutine is guaranteed to observe a write from another goroutine only if the write *happens before* the read** under the partial order defined by synchronisation events (channel ops, `sync.Mutex` lock/unlock, `sync/atomic` ops, `sync.Once`). Without synchronisation, concurrent reads/writes are a data race — undefined behaviour. The `go run -race` detector catches races at runtime.

### Q4. What is a nil interface and why is it a common footgun?

An interface value has two components: `(type, value)`. It is nil only when both are nil. A common mistake: returning a `*MyError` typed nil from a function with return type `error`. The interface is `(*MyError, nil)` — type is non-nil, so the interface itself is non-nil. The check `err != nil` returns true even though the pointer is nil. Fix: return a bare `nil` of type `error`, not a typed nil pointer.

### Q5. How does Go handle errors? What are sentinel errors and error wrapping?

Errors are values — functions return `(T, error)` and callers check explicitly. Sentinel errors are package-level `var` values compared with `==` (`io.EOF`, `sql.ErrNoRows`). Error wrapping (`fmt.Errorf("…: %w", err)`) chains errors; `errors.Is` unwraps the chain to check identity, `errors.As` unwraps to check type. Prefer wrapping over sentinel errors for library code; sentinels are fine for leaf values callers need to switch on.

### Q6. What is defer and what are its ordering and argument-evaluation semantics?

`defer f(args)` pushes a call onto a per-function stack; deferred calls run in LIFO order when the function returns (normally or via panic). **Arguments are evaluated immediately** when `defer` executes, not when the deferred call runs. Deferred closures capture variables by reference — `defer func() { fmt.Println(i) }()` prints `i`'s value at return time. Common use: `defer mu.Unlock()` immediately after `mu.Lock()`, `defer f.Close()` after `os.Open`.

### Q7. What is the difference between value and pointer receivers?

A value receiver `(t T)` gets a copy of the value — mutations don't affect the caller. A pointer receiver `(t *T)` works on the original — mutations are visible. Rules: if the method mutates `t`, use a pointer receiver. If `T` is large, use a pointer receiver to avoid copies. Be consistent within a type — mix is allowed but confuses interface satisfaction. A value of type `T` can call methods with pointer receivers only if `T` is addressable.

### Q8. Explain Go interfaces and structural typing.

An interface specifies a set of method signatures. Any type that implements those methods satisfies the interface — no `implements` declaration needed. This enables retroactive interface satisfaction: a type in package A satisfies an interface in package B without importing B. Keep interfaces small (often 1–2 methods — `io.Reader`, `io.Writer`, `fmt.Stringer`). Define interfaces where they're *used*, not where the type is defined. The empty interface `any` / `interface{}` is satisfied by all types.

### Q9. How do slices work internally? What happens when you append past capacity?

A slice header is `{ptr *T, len int, cap int}`. `append(s, x)` appends `x` at `s[s.len]` and increments len if cap allows. If `len == cap`, Go allocates a new larger backing array (approximately doubles for small slices, ~1.25x growth for large), copies existing elements, and returns a new slice header pointing to the new array. The original slice still points to the old array — this is a common source of bugs when multiple slices share a backing array and one is appended to.

### Q10. What is `sync.Mutex` and when do you use it vs channels?

`sync.Mutex` protects shared mutable state: `mu.Lock()` / `mu.Unlock()` (use `defer mu.Unlock()`). Use a mutex when you have shared state multiple goroutines read/write. Use channels when goroutines communicate data or signal events. The Go slogan is "share memory by communicating" — channels are idiomatic for work distribution, pipelines, and fan-out/fan-in. Mutexes are pragmatic for protecting a struct's fields or a cache. `sync.RWMutex` allows concurrent readers.

---

## Concurrency Patterns

### Summary

**What this topic covers**

Go's concurrency model in practice: goroutine lifecycle management, common patterns (fan-out, fan-in, pipelines, worker pools, timeouts), and the sync package primitives. Also covers data race detection, goroutine leaks, and the `context` package for cancellation.

**Mental model**

Think of goroutines as cheap workers and channels as conveyor belts. The patterns emerge from connecting them: fan-out (one source, many workers), fan-in (many sources, one sink), pipelines (stages connected by channels), worker pools (bounded concurrency). The hard problems are lifecycle: who starts goroutines, who stops them, how do you propagate cancellation and timeouts? The `context.Context` package is the standard answer — pass it as the first argument, check `ctx.Done()`, respect cancellation. Goroutine leaks (goroutines that block forever) are the most common concurrency bug in Go services.

**Key terms**

- **select** — waits on multiple channel operations; takes the first ready case (random if multiple ready). `default` makes it non-blocking.
- **context.Context** — carries deadlines, cancellation signals, and request-scoped values across API boundaries.
- **sync.WaitGroup** — waits for a collection of goroutines to finish. `Add(n)`, `Done()` (deferred), `Wait()`.
- **sync.Once** — runs a function exactly once regardless of how many goroutines call it. Used for lazy initialisation.
- **goroutine leak** — goroutine blocked forever on a channel or lock with no way to unblock. Causes steady memory growth.
- **data race** — concurrent unsynchronised read + write of the same memory. Detected by `go run -race`.
- **worker pool** — bounded set of goroutines pulling from a shared job channel; limits concurrency and resource use.
- **fan-out** — distribute work from one channel to multiple goroutines.
- **fan-in** — merge outputs from multiple channels into one.

**Why interviewers ask this**

Concurrency bugs are subtle and expensive. Interviewers want to see you reason about goroutine lifetimes (who owns the goroutine, how does it stop?), know when to use select for timeouts, and understand why goroutine leaks happen. Senior signal: reaching for `context.WithTimeout` / `context.WithCancel` automatically for any IO operation.

**Common confusions**

- "Closing a channel cancels all receivers" — yes, but only if receivers check the second return value `v, ok := <-ch` or range over the channel. A bare receive on a closed channel returns the zero value immediately.
- "WaitGroup.Add should be inside the goroutine" — no, `Add` must be called before the goroutine starts or there's a race where `Wait` returns before all goroutines are counted.
- "select with no cases blocks forever" — `select {}` blocks forever, sometimes used to keep main alive. A `select` with only a `default` is a non-blocking poll.
- "Buffered channels prevent goroutine leaks" — buffering can mask leaks, not prevent them. If nothing drains the channel, the sender still leaks.

**What follows from this topic**

HTTP server design (request context propagation), testing concurrent code, performance profiling (goroutine dumps via `pprof`), and distributed tracing all build on these primitives.

### Q11. How do you prevent goroutine leaks?

A goroutine leaks when it blocks indefinitely on a channel receive, send, or lock with no mechanism to unblock it. Prevention: (1) always pass a `context.Context` to goroutines doing IO or waiting on channels; (2) check `ctx.Done()` in select; (3) ensure every goroutine has a clear exit condition. Detect leaks with `goleak` in tests or by inspecting `runtime.NumGoroutine()` over time. The `pprof` goroutine profile shows all live goroutines and their stack traces.

### Q12. What is the select statement and how does it work?

`select` waits on multiple channel operations and executes the first one that's ready. If multiple are ready simultaneously, Go picks one at random — useful to avoid starvation. `default` makes select non-blocking (polls without waiting). Common patterns: timeout with `time.After`, cancellation with `ctx.Done()`, draining a channel with a default.

```go
select {
case v := <-ch:
    process(v)
case <-ctx.Done():
    return ctx.Err()
case <-time.After(5 * time.Second):
    return errors.New("timeout")
}
```

### Q13. Explain the context package and when to use WithTimeout vs WithCancel vs WithDeadline.

`context.Context` carries a deadline, cancellation signal, and key-value pairs. Pass it as the first argument to every function that does IO, blocks, or spawns goroutines. `WithCancel(ctx)` returns a child context and a `cancel()` function — call `cancel()` to signal done. `WithTimeout(ctx, d)` cancels after duration `d`. `WithDeadline(ctx, t)` cancels at absolute time `t`. `WithTimeout` = `WithDeadline(ctx, time.Now().Add(d))` — just a convenience wrapper. Always `defer cancel()` to avoid context leaks.

### Q14. Implement a simple worker pool.

```go
func workerPool(jobs <-chan Job, results chan<- Result, n int) {
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

Close `jobs` to signal workers to exit (range over channel exits when closed). Workers run until jobs is drained and closed.

### Q15. What is sync.Once and what problem does it solve?

`sync.Once` guarantees a function runs exactly once, even if called from multiple goroutines concurrently. Used for lazy initialisation of expensive resources (DB connections, config parsing). Safer than double-checked locking — the Once implementation uses atomic ops internally.

```go
var once sync.Once
var db *sql.DB

func getDB() *sql.DB {
    once.Do(func() { db = initDB() })
    return db
}
```

---

## Error Handling & Testing

### Summary

**What this topic covers**

Go's explicit error handling pattern, error wrapping and inspection (`errors.Is`, `errors.As`, `fmt.Errorf %w`), custom error types, and Go's testing conventions: table-driven tests, subtests, benchmarks, `testify`, and the `httptest` package.

**Mental model**

Errors are values — they can be wrapped, unwrapped, compared, and logged. The wrapping chain `errors.Is` / `errors.As` replaces exception hierarchies. Design: return errors from all failure paths; don't panic in library code; use `fmt.Errorf("operation: %w", err)` to add context without losing the original. For testing: Go's `testing` package is intentionally minimal — `t.Fatal`, `t.Error`, `t.Run` for subtests. Table-driven tests (`for _, tc := range cases`) are the idiomatic Go pattern for parameterised tests.

**Key terms**

- **`errors.Is(err, target)`** — reports whether `err` or any error in its chain matches `target`. Works with sentinel errors.
- **`errors.As(err, &target)`** — finds the first error in chain assignable to `target`'s type.
- **`fmt.Errorf("%w", err)`** — wraps `err`, making it available to `errors.Is/As`.
- **`t.Fatal`** — marks test failed and stops the current test immediately.
- **`t.Run`** — creates a named subtest.
- **`testing.B`** — benchmark type; `b.N` is the number of iterations.
- **`httptest.NewRecorder()`** — captures HTTP handler responses in tests.
- **table-driven test** — slice of test cases iterated in a loop; idiomatic Go test pattern.

**Why interviewers ask this**

Error handling is where Go codebases diverge: some wrap properly, some swallow errors, some panic. Senior signal: adding context at each layer with `%w`, not just returning raw errors or logging-and-returning. For testing: writing table-driven tests, knowing how to mock with interfaces (not reflection magic), and using `httptest` for HTTP handlers.

**Common confusions**

- "Always use `errors.New` for new errors" — fine for sentinels. For dynamic messages, `fmt.Errorf` is idiomatic.
- "Panic is acceptable in library code" — only for programmer errors (nil pointer from misuse). IO failures, validation — return errors.
- "Test helpers should call `t.Fatal` directly" — only if they accept `*testing.T` as a param. Otherwise they exit the helper, not the test.

**What follows from this topic**

HTTP middleware error propagation, structured logging patterns (`log/slog`), and integration testing with Docker-based test fixtures.

### Q16. How do you add context to errors without losing the original?

Use `fmt.Errorf("doing X: %w", err)` — the `%w` verb wraps the error. Callers can use `errors.Is(err, io.EOF)` to check the original cause through the chain, or `errors.As` to extract a typed error. This replaces Java's `throw new RuntimeException("doing X", cause)`. Every layer in the call stack should add its own context so stack traces in logs are human-readable.

### Q17. When would you use a custom error type?

When callers need to inspect error fields, not just identity. Define a struct implementing `error`, with fields for the relevant data:

```go
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}
```

Callers use `errors.As(err, &ve)` to extract the `*ValidationError` and inspect `ve.Field`. Use sentinel errors for "no such thing" signals (`sql.ErrNoRows`), custom types when callers need structured data.

### Q18. What is a table-driven test and why does Go favour it?

```go
func TestAdd(t *testing.T) {
    cases := []struct {
        a, b, want int
    }{
        {1, 2, 3},
        {0, 0, 0},
        {-1, 1, 0},
    }
    for _, tc := range cases {
        t.Run(fmt.Sprintf("%d+%d", tc.a, tc.b), func(t *testing.T) {
            got := Add(tc.a, tc.b)
            if got != tc.want {
                t.Errorf("got %d, want %d", got, tc.want)
            }
        })
    }
}
```

Table-driven tests minimise boilerplate, make it easy to add cases, and `t.Run` subtests run in parallel with `t.Parallel()` and give clear failure output.

### Q19. How do you test HTTP handlers in Go?

Use `net/http/httptest`: `httptest.NewRecorder()` captures the response, `httptest.NewRequest` builds a request.

```go
req := httptest.NewRequest(http.MethodGet, "/health", nil)
w := httptest.NewRecorder()
handler(w, req)
resp := w.Result()
// assert resp.StatusCode, body, etc.
```

No real server needed. For integration tests, `httptest.NewServer(handler)` starts a real TCP server on a random port.

---

## Performance & Internals

### Summary

**What this topic covers**

Go's garbage collector, escape analysis, profiling with `pprof`, memory allocation patterns, and common optimisations (pre-allocated slices, sync.Pool, avoiding allocations in hot paths).

**Mental model**

Go's GC is a concurrent, tri-colour mark-and-sweep with short stop-the-world pauses (typically < 1ms). It runs concurrently with the program. The key lever is **allocation rate** — fewer allocations = less GC pressure. Escape analysis determines whether a value lives on the stack (free, collected on return) or the heap (GC-managed). Variables that escape to the heap are anything whose address is returned, stored in an interface, or sent on a channel. `pprof` is the standard profiler — CPU profiles show where time is spent, heap profiles show where allocations happen.

**Key terms**

- **escape analysis** — compiler analysis deciding stack vs heap allocation. `go build -gcflags="-m"` shows escape decisions.
- **sync.Pool** — reusable object pool; reduces GC pressure for short-lived objects (e.g., buffers, request objects).
- **pprof** — built-in profiling. `net/http/pprof` exposes `/debug/pprof/` endpoints. `go tool pprof` analyses profiles.
- **GOMAXPROCS** — number of OS threads running Go code simultaneously. Default: number of CPUs.
- **GC tuning** — `GOGC` env var sets the GC trigger (default 100 = double heap before GC). `GOMEMLIMIT` (Go 1.19+) hard caps heap.
- **inlining** — compiler inlines small functions to eliminate call overhead.

**Why interviewers ask this**

For backend services handling real load, allocation rate and GC behaviour matter. Senior signal: knowing to check `pprof` before optimising, understanding that premature micro-optimisation is wasteful, but knowing the levers when it counts.

**Common confusions**

- "Go's GC is stop-the-world" — historically true, modern Go GC runs mostly concurrently. STW pauses are very short.
- "sync.Pool is a cache" — Pool objects may be collected at any GC cycle. Don't use it for things that must persist; use it for things that are expensive to allocate but OK to recreate.
- "Interfaces are free" — interface dispatch has small overhead (one indirection); not free in extremely tight loops but negligible in most code.

**What follows from this topic**

Database connection pool tuning, HTTP server tuning (`ReadTimeout`, `WriteTimeout`, `MaxHeaderBytes`), and cloud deployment sizing.

### Q20. How do you profile a Go service in production?

Import `net/http/pprof` (blank import registers handlers) and hit `/debug/pprof/`. Capture a 30s CPU profile: `curl http://host/debug/pprof/profile?seconds=30 > cpu.prof`. Analyse: `go tool pprof -http=:8080 cpu.prof`. For heap allocations: `/debug/pprof/heap`. For goroutine leaks: `/debug/pprof/goroutine`. In Kubernetes: `kubectl port-forward pod/xxx 6060:6060` then profile locally.

### Q21. What is escape analysis and why does it matter?

The compiler determines at compile time whether a value's lifetime is bounded by its stack frame (stack allocation — free) or must outlive it (heap allocation — GC-managed). Values escape when: their address is returned, they're stored in an interface, they're sent to a channel, or they're too large for the stack. Fewer heap allocations = less GC pressure = lower latency. See escape decisions with `go build -gcflags="-m" ./...`. Common optimisation: avoid returning pointers to small structs where the caller can pass a pointer in.

### Q22. When and how do you use sync.Pool?

`sync.Pool` is for reusing objects that are expensive to allocate and short-lived. Classic use: byte buffers for JSON encoding/decoding or HTTP response writing.

```go
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func handle(w http.ResponseWriter, r *http.Request) {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer bufPool.Put(buf)
    // use buf
}
```

Pool objects may be collected between GC cycles — never use Pool for objects that must survive.

---

## HTTP & Standard Library

### Summary

**What this topic covers**

`net/http` server and client, middleware patterns, JSON encoding/decoding, the `database/sql` interface, and idiomatic use of the standard library.

**Mental model**

Go's `net/http` is production-ready out of the box — no framework required for most services. `http.Handler` is an interface with one method: `ServeHTTP(ResponseWriter, *Request)`. Middleware is a function `func(http.Handler) http.Handler` — a higher-order function wrapping the original handler. The standard JSON encoder/decoder uses struct tags for mapping. `database/sql` is a generic interface over SQL databases; the actual driver is injected via blank import.

**Key terms**

- **`http.Handler`** — interface: `ServeHTTP(ResponseWriter, *Request)`.
- **`http.HandlerFunc`** — adapter turning a function with the right signature into an `http.Handler`.
- **middleware** — `func(http.Handler) http.Handler` — wraps a handler with cross-cutting concerns (logging, auth, tracing).
- **`json.Marshal` / `json.Unmarshal`** — encode/decode JSON. `json.NewEncoder(w).Encode(v)` streams to a writer.
- **`database/sql`** — stdlib SQL interface. `db.QueryContext`, `db.ExecContext`, `db.BeginTx`.
- **`http.ServeMux`** — standard router (enhanced in Go 1.22 with method/path pattern matching).

**Why interviewers ask this**

Most Go backend roles involve HTTP services and SQL databases. Knowing `net/http` without a framework and being able to write middleware from scratch is the senior baseline.

**Common confusions**

- "You need a framework like Gin for production" — Go's standard library is sufficient for most services. Gin/Chi/Echo add routing ergonomics; they don't add production-readiness.
- "`http.DefaultClient` is fine for production" — no. DefaultClient has no timeouts. Always construct `&http.Client{Timeout: ...}`.

**What follows from this topic**

gRPC and Protobuf for internal APIs, OpenTelemetry for distributed tracing, and service mesh integration.

### Q23. How do you write middleware in Go?

```go
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

// Wire it:
mux := http.NewServeMux()
mux.HandleFunc("GET /api/v1/health", healthHandler)
http.ListenAndServe(":8080", LoggingMiddleware(mux))
```

Chain multiple middleware by nesting: `AuthMiddleware(LoggingMiddleware(mux))`. Or use a helper that applies a slice of middleware left-to-right.

### Q24. Why should you never use http.DefaultClient in production?

`http.DefaultClient` has no timeout. A slow upstream will hold the connection open indefinitely, exhausting goroutines and file descriptors. Always configure timeouts:

```go
client := &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        DialContext:           (&net.Dialer{Timeout: 3 * time.Second}).DialContext,
        TLSHandshakeTimeout:   5 * time.Second,
        ResponseHeaderTimeout: 5 * time.Second,
        MaxIdleConns:          100,
        MaxIdleConnsPerHost:   10,
    },
}
```

`Timeout` covers the full request. `ResponseHeaderTimeout` covers just the header read. Use both.

### Q25. How does database/sql connection pooling work?

`sql.Open` returns a `*sql.DB` which is a connection pool, not a single connection. Configure it: `db.SetMaxOpenConns(25)`, `db.SetMaxIdleConns(25)`, `db.SetConnMaxLifetime(5 * time.Minute)`. Always use `QueryContext` / `ExecContext` with a context for cancellation. Call `rows.Close()` (or `defer rows.Close()`) to return the connection to the pool. Failing to close rows leaks connections.
