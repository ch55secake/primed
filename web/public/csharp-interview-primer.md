---
type: interview-prep
---

# C# / .NET Interview Primer — 130 Questions

> Pass 2 added gap-fill from Stephen Toub's *Performance Improvements in .NET 10* and current senior interview banks. Look for `Q…b` / `Q…c` insertions across sections.

Senior backend interview prep for **.NET 10 LTS** (shipped Nov 11 2025, supported until Nov 10 2028) and **C# 14**. Each answer is 2–6 sentences shaped for an interview — failure modes, tradeoffs, "what fails under load" — not textbook trivia. Pair with the vault's `C Sharp Path.md` curriculum.

1. [[#CLR Internals & Runtime]]
2. [[#Memory Management & High-Performance Code]]
3. [[#Concurrency & Async]]
4. [[#Modern C# Language Features]]
5. [[#LINQ & Functional]]
6. [[#Generics & Type System]]
7. [[#Collections & Data Structures]]
8. [[#Strings & Text]]
9. [[#Exceptions]]
10. [[#I/O, Streams & Networking]]
11. [[#Serialization]]
12. [[#ASP.NET Core]]
13. [[#Entity Framework Core]]
14. [[#Testing]]
15. [[#Build, Tooling & Deployment]]
16. [[#Observability]]
17. [[#Security]]
18. [[#Architecture Patterns]]
19. [[#Native AOT & Trimming]]
20. [[#Interop]]

---

## CLR Internals & Runtime

### Q1. What lives on the stack vs the heap in .NET — and what's the catch?

Value types live where they're declared: a `struct` local sits on the stack; a `struct` field of a class lives **on the heap** as part of the enclosing object. Reference types always allocate on the heap; the reference itself sits wherever it's declared. The catch: the JIT can promote heap allocations to the stack via **escape analysis** (when an object provably doesn't outlive the method), and `Span<T>` can wrap stack memory directly. So "structs are stack-allocated" is the textbook lie — accurate enough until someone asks why `new T()` inside a tight loop doesn't allocate.

### Q2. What's boxing and what triggers it?

Boxing wraps a value type in a heap-allocated `object` so it can be treated as a reference. Triggers: assigning a value type to `object`, calling a non-overridden virtual method on a struct via an interface (`IList list = new ValueTypeList()`), passing a value type to a method taking `object`, and (subtly) **constraining a generic to an interface and calling the interface method on a value type without devirtualisation**. Detect with BenchmarkDotNet `[MemoryDiagnoser]` — every boxed value is one Gen 0 allocation. The fix is usually a generic constraint to `struct` plus the concrete interface.

### Q3. Walk me through the JIT pipeline.

(1) **Tier 0** — fast, unoptimised compile so code starts running quickly. (2) **Dynamic PGO** (default in .NET 8+) instruments Tier 0 code, observing types at virtual dispatch sites and branch directions. (3) Hot methods get re-jitted to **Tier 1** — optimised, with guarded devirtualisation, inlining decisions, branch hints, and SIMD where applicable, all informed by PGO. (4) **OSR (On-Stack Replacement)** — for long-running methods stuck at Tier 0 (e.g. `while (true)` loops), the JIT can swap the running frame to a Tier 1 compile mid-loop without restarting the method.

### Q4. Workstation GC vs Server GC — and what's the practical impact?

**Workstation GC**: a single GC thread, lower pause times per collection, smaller heaps. Default for desktop / WinForms / WPF / console apps. **Server GC**: one heap and one GC thread per logical core, much higher throughput, larger heaps, more aggressive parallelism. Default for ASP.NET Core. The wrong choice can cost 2-3× throughput either way. Toggle with `<ServerGarbageCollection>true</ServerGarbageCollection>` in csproj or `DOTNET_GCServer=1`. On containers with constrained CPU, set `DOTNET_GCHeapCount` to match the container's CPU quota or you'll get one heap per *host* core (huge over-allocation).

### Q5. What are GC generations and what's special about the LOH?

Three generations: Gen 0 (fresh allocations), Gen 1 (survived one collection), Gen 2 (long-lived). Plus the **Large Object Heap (LOH)** — objects ≥ 85,000 bytes go there directly, bypass Gen 0/1, and are **only collected on a full Gen 2 GC**. The LOH is *not* compacted by default (because moving big objects is expensive), so fragmentation accumulates — the classic "growing RSS with stable working set" symptom. Force a one-shot compact with `GCSettings.LargeObjectHeapCompactionMode = LargeObjectHeapCompactionMode.CompactOnce` before the next full GC. The **POH (Pinned Object Heap)**, added in .NET 5, separates pinned interop buffers so they don't fragment SOH.

### Q6. What is DATAS and when does it matter?

**Dynamically Adapting To Application Sizes**, .NET 8+ Server GC mode. Instead of statically allocating one heap per CPU at startup, DATAS starts with a small number of heaps and adapts heap count based on working set and allocation pressure. Massive win for containerised workloads with variable load — you no longer pay 32-heap GC overhead on a 32-CPU host when the app's working set is 200 MB. Enable with `DOTNET_GCDynamicAdaptationMode=1` (off by default through .NET 9; default-on direction in .NET 10 for some configurations).

### Q7. What's the difference between regions and segments in modern GC?

Pre-.NET 7, the GC managed memory in large segments (typically 256 MB SOH, 16 MB LOH). Returning memory to the OS required draining a whole segment. .NET 7+ replaced segments with **regions** (default 4 MB SOH, 32 MB UOH) — smaller granularity, much better OS memory return, easier load balancing across heaps. Visible effect: working-set spikes after bursty allocation now decay properly, where on .NET 6 the process would hold onto peak memory for hours.

### Q8. Senior angle: p99 latency tripled after a deploy — how do you isolate GC vs JIT vs lock contention?

Step 1: **`dotnet-counters monitor`** on the running process — `System.Runtime` reports Gen 0/1/2 counts, `% Time in GC`, pause times. If `% Time in GC` jumped, capture **`dotnet-gcdump`** and compare to the prior build's gcdump. Step 2: if GC is innocent, **`dotnet-trace collect --profile cpu-sampling`** for a CPU flame graph — look for new hot methods (JIT regression, missed inlining) or sync primitives in the top 10 (`Monitor.ReliableEnter`, `SemaphoreSlim.WaitAsync`). Step 3: lock contention — `dotnet-trace --providers Microsoft-Windows-DotNETRuntime:0x1000` (contention events). The discipline is: never guess, always measure.

### Q9. Finalizers and `IDisposable` — what's the correct pattern?

Implement `IDisposable` for any class owning unmanaged resources OR managed disposables. If you also have unmanaged direct (rare), implement a finalizer too and use the **Dispose pattern**: `protected virtual void Dispose(bool disposing)` where `disposing=true` is from `Dispose()` (clean managed + unmanaged) and `false` is from finalizer (unmanaged only — managed peers may already be collected). Always call `GC.SuppressFinalize(this)` in `Dispose()` so the finalizer doesn't promote the object to the next generation needlessly. **Prefer `SafeHandle`** for any native resource — it handles the finalization + thread safety + GC interaction correctly without bespoke code.

### Q10. What's `AssemblyLoadContext` and where do collectible ALCs come in?

The .NET Core+ replacement for AppDomains. Loads assemblies in isolated graphs with their own dependency resolution. **Collectible ALCs** allow unloading: useful for plugin scenarios, hot-reload, test runners that load and discard hundreds of test assemblies. Classic leak: a delegate or static field in the host assembly captures a type from the plugin ALC — the plugin can never unload because the host roots it. Diagnose with `dotnet-gcdump` + `clrmd` to find the GC root of a "should-be-unloaded" type.

### Q10b. What does .NET 10 actually change for the JIT?

Per Stephen Toub's *Performance Improvements in .NET 10*: (1) **better escape analysis** — more heap allocations get rewritten as stack allocations automatically, no source change needed. (2) **More aggressive devirtualization** beyond what PGO already delivered — interface calls inlined where the JIT can prove the concrete type. (3) **Improved struct argument codegen** — wide structs passed by value cost less. (4) **Better inlining heuristics** — fewer methods get rejected for inlining because of trivial size cliffs. (5) **AVX10.2** support on bleeding-edge Intel + **Arm64 SVE** for vectorised hot loops. (6) **Improved code layout** — hot code is grouped to fit in L1 instruction cache. Net effect: many apps see 5-15% throughput improvement on `net10.0` with zero code changes.

---

## Memory Management & High-Performance Code

### Q11. What is `Span<T>` and why can't it live in async methods or class fields?

`Span<T>` is a **ref struct** — a stack-only type that can wrap arrays, strings, native memory, or `stackalloc` regions, providing zero-copy slicing and indexing. It can't be a field of a heap object or a local in an async method because async methods box their state machine onto the heap when they suspend, and a `Span<T>` on the heap could outlive the stack frame it points into — instant memory safety violation. Use `Memory<T>` (heap-friendly) across await boundaries, then call `.Span` to get a slice for synchronous work.

### Q12. What is `stackalloc` and what's the gotcha?

Allocate memory on the current stack frame: `Span<int> buf = stackalloc int[256];`. Free at zero cost when the method returns. Allowed outside `unsafe` since C# 7.2 when assigned to a `Span<T>`. **Gotcha**: stack size is small (~1 MB default per thread on Windows, less on Linux). `stackalloc` inside a loop or on user-controlled sizes is a stack-overflow waiting to happen. Pattern: `Span<T> buf = size <= 256 ? stackalloc T[size] : new T[size];` for safe size-bounded variants.

### Q13. When do you reach for `ArrayPool<T>.Shared`?

When you need a buffer for a bounded scope and don't care about exact size (the pool returns *at least* what you asked for). Always `Rent`/`Return` in `try/finally`. Pattern: `var arr = ArrayPool<byte>.Shared.Rent(size); try { … } finally { ArrayPool<byte>.Shared.Return(arr, clearArray: true); }`. The `clearArray: true` matters when returning user data — otherwise the next renter sees your leftover bytes (data leak). Big wins on hot paths that previously allocated 4-32 KB arrays per request. Beware: pooled arrays survive GC, so they count toward Gen 2.

### Q14. What's `ref struct` and what does C# 13 add?

A `ref struct` (e.g. `Span<T>`, `ReadOnlySpan<T>`, `ValueTask` is *not* one — common myth) is constrained to live on the stack: can't be boxed, can't be a field of a heap type, can't be captured by a lambda or used in async/iterator state machines. C# 13 added **`ref struct` interfaces** (with `allows ref struct` constraint on generics) — finally letting `Span<T>` participate in generic algorithms. Also `scoped` parameter modifier limits a ref's lifetime, enabling more aggressive optimisations.

### Q15. P/Invoke: `[LibraryImport]` vs `[DllImport]` — when does it matter?

`[DllImport]` is the classic — runtime generates the marshalling stub via reflection; works everywhere but isn't AOT-friendly. **`[LibraryImport]`** (.NET 7+) is **source-generated** — the marshalling code is emitted at compile time, AOT-compatible, often faster, gives better diagnostics on bad marshalling. Always use `LibraryImport` in new code; migrate `DllImport` opportunistically. For ultra-short native calls, add `[SuppressGCTransition]` to skip the GC transition (no managed-to-native frame switch) — only safe for fast, non-blocking native calls.

### Q16. How do you actually benchmark .NET code?

**BenchmarkDotNet**, always. Release config, fresh process per benchmark, JIT warmup, statistical iteration. Mandatory attributes: `[MemoryDiagnoser]` (allocations per op), `[ThreadingDiagnoser]` (contention/lock waits), `[DisassemblyDiagnoser]` (the actual emitted assembly — invaluable for "did the JIT vectorise this"). **Always return the computed value** from the benchmark method, or assign to a `[Benchmark]` field — dead-code elimination will silently optimise your work away otherwise. Don't trust micro-benchmarks under 100 ns without checking the disassembly.

### Q17. Walk me through avoiding allocation on a hot path.

(1) `StringBuilder` → interpolated string handlers / `string.Create` for known-size builds. (2) `Newtonsoft.Json` → `System.Text.Json` with **source-generated serialisers** (`[JsonSerializable]`). (3) `HashSet<T>`/`Dictionary` loaded once → **`FrozenDictionary` / `FrozenSet`** (one-time expensive build, fastest reads). (4) `List<T>` enumeration → `CollectionsMarshal.AsSpan(list)` + `for` loop. (5) Async returns that often complete synchronously → `ValueTask<T>`. (6) Per-request short arrays → `ArrayPool<T>.Shared`. Measure with `[MemoryDiagnoser]`; report Gen 0 / Gen 1 / Gen 2 allocation rates separately.

### Q18. Senior angle: parse a 1 GB UTF-8 log file with zero allocation per line.

Open `FileStream` with `FileOptions.SequentialScan`, read into a pooled `byte[]` from `ArrayPool<byte>.Shared`. Use **`System.IO.Pipelines`** (`PipeReader.Create(stream)`) — `pipe.ReadAsync()` returns a `ReadResult` containing a `ReadOnlySequence<byte>`. Find newlines with `seq.PositionOf((byte)'\n')`, slice, parse the line directly off the byte span (no `string` allocation) — `Utf8Parser.TryParse`, `Ascii.EqualsIgnoreCase`, etc. Advance the pipe past the consumed bytes. Allocation count: zero per line, modulo any string interning you do for keys.

---

## Concurrency & Async

### Q19. What does the C# compiler actually do to an `async` method?

Generates a **state machine** — a struct (or class if debugger experience requires) implementing `IAsyncStateMachine`, with fields for every awaited expression and every local that crosses an await boundary. Each `await` becomes a state transition: if the awaited value is already complete, continue synchronously (no allocation); if not, hoist the state machine to the heap, register a continuation, and return the `Task`/`ValueTask` to the caller. `AsyncTaskMethodBuilder<T>` orchestrates the state transitions. **Synchronous fast-path costs zero allocations**; suspension costs one allocation (or zero with `PoolingAsyncValueTaskMethodBuilder`, .NET 6+).

### Q20. `Task` vs `ValueTask` — when do I choose `ValueTask`?

`Task<T>` is a reference type — always allocates. `ValueTask<T>` is a struct wrapping *either* a synchronous result (no allocation) *or* an `IValueTaskSource<T>` (often pooled). **Rules**: (1) await at most once, (2) never call `.Result`, (3) never store in a field, (4) never `WhenAll` directly (use `.AsTask()`). Use `ValueTask<T>` when the method **often** completes synchronously: cache-hit IO, `Channel<T>` reads from a non-empty channel, custom awaitables. For everything else, `Task` is simpler and the allocation is negligible.

### Q21. When does `ConfigureAwait(false)` matter and when doesn't it?

In **library code** (NuGet packages, shared layers): always, to avoid capturing a UI/legacy SynchronizationContext that a caller might be on. In **ASP.NET Core app code**: doesn't matter — ASP.NET Core has no SynchronizationContext, so there's nothing to capture. In **WPF/WinForms/MAUI**: only on calls that **don't** need the UI thread; you want to capture for UI updates. .NET 8 added `ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing)` for explicit "I don't care about exceptions from this await" semantics.

### Q22. Why does `ConcurrentDictionary.GetOrAdd(key, factory)` sometimes call `factory` twice?

`ConcurrentDictionary` uses lock striping for performance — multiple threads can update different buckets in parallel without coordinating. `GetOrAdd` is **not atomic at the factory level**: two threads with the same key see no existing entry, both call `factory`, both try to insert — only one wins, the other's factory result is discarded. Fix when the factory has side effects: pre-compute the value, use the overload `GetOrAdd(key, value)`, or wrap in `Lazy<T>`: `dict.GetOrAdd(key, k => new Lazy<T>(() => factory(k))).Value` — only one `Lazy` survives, so the inner factory runs once.

### Q23. What's `System.Threading.Channels` and when does it beat `BlockingCollection`?

Modern producer/consumer primitive. `Channel.CreateBounded<T>(capacity)` or `Channel.CreateUnbounded<T>()`; producers `WriteAsync`, consumers `ReadAsync` or `await foreach (var item in channel.Reader.ReadAllAsync())`. Bounded channels support `BoundedChannelFullMode`: `Wait` (default), `DropOldest`, `DropNewest`, `DropWrite`. Beats `BlockingCollection` on: native async (no thread blocking), single-reader/single-writer optimisations, lower allocation, modern API. Default to channels in any new producer/consumer code.

### Q24. What's the difference between `Task.WhenAll`, `WhenAny`, and `WhenEach`?

`WhenAll(tasks)`: completes when all complete; returns `Task<T[]>` with results; **rethrows only the first exception** by default (others available via the AggregateException on the result `Task`). `WhenAny(tasks)`: completes when any one finishes; returns the first-done task. `WhenEach(tasks)` (.NET 9+): returns an `IAsyncEnumerable<Task<T>>` that yields tasks as they complete — `await foreach (var done in Task.WhenEach(tasks))` lets you process results in completion order without polling.

### Q25. C# 13's new `System.Threading.Lock` — what does it improve?

Pre-C# 13, `lock(obj)` locked on an arbitrary object via its sync block — a heavy mechanism with monitor overhead. C# 13's `System.Threading.Lock` is a dedicated type: `private readonly Lock _lock = new(); lock (_lock) { … }`. Faster acquire/release (less indirection, no boxing in the typical path), explicit semantics, no risk of someone else locking on the same object externally. New code should prefer `Lock` over locking on arbitrary objects.

### Q26. What's a classic .NET deadlock and how do you avoid it?

The canonical one: `.Result` or `.Wait()` on an async method from a UI/legacy ASP.NET (Framework) SynchronizationContext that the awaited method captured. The async method's continuation needs to resume on the captured context — but the context is blocked waiting for the result. Deadlock. Modern fix: never block on async; if forced, **`ConfigureAwait(false)` in the library** breaks the cycle. The other classic: nested locks acquired in inconsistent order → always lock in a globally consistent order (sort by some stable id).

### Q27. `SemaphoreSlim` vs `Mutex` vs `Monitor` — when do you reach for which?

**`Monitor`** (and `lock` keyword): in-process, fast, supports `Wait`/`Pulse` for thread coordination. **`SemaphoreSlim`**: in-process, supports **async** (`WaitAsync`) — the only of these primitives that's await-friendly. **`Mutex`**: named, cross-process, slow (kernel object). **`Semaphore`**: same as Mutex but with a count. In modern code: `lock`/`Lock` for short critical sections, `SemaphoreSlim` for async or limiting concurrency (e.g. "max 8 concurrent HTTP calls"), avoid named primitives unless cross-process is the actual requirement.

### Q28. Walk me through `IAsyncEnumerable<T>` and `await foreach`.

`IAsyncEnumerable<T>` — sequences whose elements arrive asynchronously. Implemented either by an async iterator method (`async IAsyncEnumerable<T> Foo()` with `yield return`) or hand-rolled `IAsyncEnumerator<T>`. Consume with `await foreach (var x in source.WithCancellation(ct).ConfigureAwait(false)) { … }`. **Critical**: inside an async iterator, annotate the `CancellationToken` parameter with `[EnumeratorCancellation]` so `WithCancellation(ct)` actually wires through. Use case: streaming EF Core results, paged API responses, file-tailing — anywhere a "list" is materialised in chunks.

### Q28b. CancellationToken — what's the actual production pattern?

Every async method that can take meaningful time accepts a `CancellationToken` and **passes it down**. ASP.NET Core gives you `HttpContext.RequestAborted` — flows automatically into model binding / endpoint handlers if you accept a parameter named `cancellationToken`. The non-negotiable rules: (1) never swallow `OperationCanceledException` without rethrowing — it's the signal that the caller gave up. (2) Never `cts.Cancel()` from a code path that also `await`s on a token from the same source — deadlock waiting on yourself. (3) For "first of N completes wins", use `CancellationTokenSource.CreateLinkedTokenSource` and cancel the rest. **Production payoff**: a disconnected client (browser tab closed) cancels the request token; downstream EF queries, HTTP calls, and CPU work all unwind — server doesn't burn cycles on dead requests.

### Q28c. Parallelising independent I/O — when is `Task.WhenAll` the answer, and what's the trap?

If three downstream HTTP calls are independent, `var (a, b, c) = await (CallA(ct), CallB(ct), CallC(ct)).WhenAll();` cuts wall-clock from sum-of-latencies to max-of-latencies. **Trap 1**: if any task throws, the others keep running until they complete or hit their own cancellation. Fix: pass a linked `CancellationTokenSource` so the first failure cancels the rest. **Trap 2**: `WhenAll` rethrows only the first exception — to see all, await the returned `Task<T[]>` and inspect `.Exception` (an AggregateException). **Trap 3**: don't `WhenAll` over N=1000 independent tasks — you'll saturate the thread pool and the downstream. Chunk to a bounded concurrency level via `SemaphoreSlim` or `Parallel.ForEachAsync(items, new() { MaxDegreeOfParallelism = 16 }, async (item, ct) => …)`.

---

## Modern C# Language Features

### Q29. Records — class vs struct, and when do you use each?

`record class` (or just `record`): reference type with value-based equality, `with`-expressions for non-destructive mutation, auto-generated `ToString`. `record struct`: value type with the same equality + `with` semantics. **`readonly record struct`**: immutable value type — first choice for value objects in DDD (`Money`, `OrderId`, `Coordinates`). Records can inherit from records only; the equality contract requires it. Use `record class` for transferred data (DTOs, immutable models), `readonly record struct` for small (<16 byte) value objects, plain `class` when you need inheritance hierarchies that don't fit the equality model.

### Q30. Pattern matching — show me when it earns its keep.

Beyond `is X x`: **property patterns** (`obj is { Status: "active", Amount: > 100 }`), **positional patterns** on records (`order is (var id, "shipped", _)`), **list patterns** (`arr is [1, _, .., var last]`), **relational patterns** (`x is > 0 and < 100`), **type pattern combinators** (`is not null`, `is X or Y`). Combined in switch expressions with exhaustiveness analysis, they replace dozens of `if`-chains with declarative branching. The win is in domain modelling: `Result<T>` sums, state-machine transitions, command dispatch — code that previously needed visitor pattern collapses to one switch expression.

### Q31. What are required members and how do they interact with NRT?

`required` modifier (C# 11) marks a property/field that *must* be set in the object initialiser — the compiler errors if it's missing. Combines with `init`-only setters for "immutable but constructable" objects without bloating constructors. Replaces the "constructor with 12 parameters" pattern. Plays well with nullable reference types: a `required string Name { get; init; }` doesn't need a `= null!` initialiser because the compiler knows the initialiser is mandatory.

### Q32. Collection expressions (C# 12) — what changed?

`int[] x = [1, 2, 3];` — target-typed literal that works for arrays, `List<T>`, `Span<T>`, `ReadOnlySpan<T>`, `ImmutableArray<T>`, any type with a `[CollectionBuilder]` attribute. Spread with `..`: `int[] combined = [..a, ..b, 42];`. The compiler picks the optimal allocation strategy — `Span<int> s = [1,2,3]` may stackalloc. Replaces the awkward `new[] { 1, 2, 3 }` / `new List<int> { 1, 2, 3 }` divergence with one uniform syntax.

### Q33. Walk me through Nullable Reference Types (NRT) in practice.

`#nullable enable` (or `<Nullable>enable</Nullable>` repo-wide) treats `string` as non-null and `string?` as possibly-null. The compiler does flow analysis (`if (x != null) { x.Length }` understood). Annotations for cases the compiler can't see: `[NotNull]`, `[MaybeNull]`, `[NotNullWhen(true)]` (for `TryGet`-style methods), `[MemberNotNull(nameof(_field))]` (for constructors/init methods). `!` is the null-forgiving operator — escape hatch when you know better than the compiler. **Treat NRT warnings as errors** in new projects: it changes "occasional NullReferenceException" from a runtime bug to a compile-time one.

### Q34. What does C# 14 add — and what's "extension everything"?

C# 14 (with .NET 10) — biggest features: (1) **Extension members ("extension everything")** — `extension(ref Account account) { public void Deposit(decimal amount) {…} public decimal Balance => … }` lets you write extension *properties*, *static methods*, *operators*, grouped per receiver. Old `this`-parameter extension methods still work. (2) **`field` contextual keyword** — auto-generated backing field accessible inside the getter/setter without manually declaring `_foo`. (3) **Null-conditional assignment**: `customer?.Order = GetOrder();` only assigns when non-null. (4) Partial constructors and partial events (for source generators). (5) User-defined compound assignment operators. (6) Implicit span conversions giving the JIT more inlining opportunities.

### Q35. What are static abstract members in interfaces and what's "generic math"?

C# 11. Interfaces can declare `static abstract` members — methods, properties, operators — that implementers provide statically. Backbone of **generic math**: `INumber<T>`, `IAdditionOperators<TSelf, TOther, TResult>`, `IComparisonOperators<...>`. Write `T Sum<T>(IEnumerable<T> xs) where T : INumber<T> => xs.Aggregate(T.Zero, (a, b) => a + b);` — works for `int`, `double`, `decimal`, `BigInteger`, even your own `Money` type if it implements the right interfaces. Doesn't allocate (the JIT specialises per value type).

### Q36. Source generators — how do they replace reflection?

A source generator is a Roslyn analyzer that emits C# source into the build before compilation. `IIncrementalGenerator` (modern API) builds a pipeline of transformations: select syntax nodes → transform to a model → emit source — caching at each stage so unchanged inputs don't re-execute. Use cases that previously used runtime reflection: JSON serialisation (`[JsonSerializable]`), regex (`[GeneratedRegex]`), logging (`[LoggerMessage]`), `INotifyPropertyChanged`, mediator dispatch. Wins: faster startup (no reflection emit), AOT-compatible, compile-time validation, better IDE experience.

---

## LINQ & Functional

### Q37. Deferred vs immediate execution — what bug does this cause?

`Where`/`Select`/`OrderBy` return lazy enumerables; nothing executes until a terminal operator (`ToList`, `Count`, `First`, `foreach`). Classic bug: a method returns `IEnumerable<T>` built from a deferred chain over a stateful source (a stream, a `DbContext` that's about to be disposed, a generator with side effects); the caller enumerates after the source is gone or sees inconsistent state. The fix: materialise (`ToList`) before crossing a lifetime boundary, OR document return type as `IReadOnlyList<T>` to signal materialised.

### Q38. LINQ to Objects vs LINQ to SQL — what goes wrong when you mix them?

`IEnumerable<T>` operates on in-process delegates; `IQueryable<T>` produces expression trees translated to SQL by EF / LINQ-to-X provider. **Mixing**: calling a method the provider can't translate (custom helper, an arbitrary instance method) silently falls back to client evaluation — the provider materialises the source table into memory and runs the rest in-process. A 50-million-row table just got SELECT * to your app server. EF Core 3.0+ throws by default instead of falling back, which is what saves you.

### Q39. What did .NET 9 do to LINQ performance?

Stephen Toub's perf work — many operators now use `Span<T>` internally, take fast paths for `T[]` and `List<T>` sources, and short-circuit empty enumerables. `Take(0)`, `DefaultIfEmpty` on empty, `Append`/`Prepend` chains, `Count`, `Any` — measurably faster, often by ~10×. Doesn't change semantics, but means "rewrite this LINQ to a for-loop for perf" is much rarer on .NET 9+. Verify with BenchmarkDotNet before assuming you need to roll your own.

### Q40. Show me the LINQ methods you reach for that juniors don't know.

`MaxBy`/`MinBy` (no manual `OrderByDescending().First()`), `DistinctBy`/`UnionBy`/`IntersectBy`/`ExceptBy` (set ops with a key selector), `Chunk(size)` (batch into arrays — replaces `GroupBy(i => i / size)`), `Index()` (.NET 9 — yields `(index, value)`), `CountBy`/`AggregateBy` (group-and-aggregate without materialising groups). The senior signal: knowing the .NET 9 additions exist and reaching for them where a junior would chain three older operators.

### Q41. Expression trees — when do they actually come up?

`Expression<Func<T, bool>>` is an AST representing a lambda — visit/build/transform/compile at runtime. EF Core uses them to translate `x => x.Status == "active"` to SQL. AutoMapper, Moq, MediatR, FluentValidation — all expression-tree-based. You'll hit them when (1) writing a custom EF query, (2) building dynamic search filters from user input, (3) writing a `IsValid<T>` rule engine. Walk with `ExpressionVisitor`; compile with `expr.Compile()`. Compiled delegates are cached because compilation is slow.

### Q41b. What did .NET 10 do to LINQ and collection perf specifically?

Per Toub's post: collection operations (`AddRange`, `CopyTo`, `Contains` on `List<T>`/`HashSet<T>`) reached 65%+ improvements on common paths via internal `Span<T>` use and SIMD where applicable. JSON serialise/deserialise got faster again (after .NET 9's gains). Compression (`GZipStream`, `BrotliStream`) and crypto (AES-GCM, SHA-256) also saw 60%+ on some workloads thanks to vectorisation and `LibraryImport` migrations. Senior signal: when asked "would you rewrite this hot loop in raw `for`?", the right answer in 2026 is *measure on .NET 10 first* — many "obvious" rewrites are no longer wins.

---

## Generics & Type System

### Q42. Explain variance: `in` vs `out`.

**Covariance (`out`)**: a type parameter used only in *output* position can be substituted for a subtype. `IEnumerable<string>` is assignable to `IEnumerable<object>` because `IEnumerable<out T>` declares `T` covariant. **Contravariance (`in`)**: only used in *input* position, allows substituting for a supertype. `Action<object>` is assignable to `Action<string>` — give it any object including a string. Reference types only: `IEnumerable<int>` is **not** `IEnumerable<object>` because that would require boxing each int. `IList<T>` is invariant because it has T in both input (`Add`) and output (`this[i]`) positions.

### Q43. What are generic constraints, and what's the deal with `allows ref struct`?

Constraints narrow the type parameter: `where T : class` (reference), `struct` (value), `unmanaged` (blittable value), `notnull` (NRT-aware non-null), `new()` (has parameterless ctor), `Enum`, `Delegate`, an interface, a class, or another type parameter. **`allows ref struct`** (C# 13+) lets the constraint accept ref structs like `Span<T>` — previously generics couldn't take ref structs at all. Enables generic algorithms over spans without losing zero-allocation properties.

### Q44. How does generic specialisation differ for value types vs reference types in the CLR?

The CLR generates **one method body per value-type instantiation** — `List<int>` and `List<long>` have separate JITted code, with the int/long inlined. All reference-type instantiations share a single code body (`__Canon`) because they're all the same size (pointer-sized) and the methods only touch the references. Implication: many generic value types in your binary bloat code size; reference generics are cheap. Native AOT shows this clearly — generic value-type explosion can balloon the binary.

### Q45. Reflection vs AOT — what breaks?

Reflection breaks because AOT compiles a closed world — only types/members reachable statically are kept; the trimmer removes everything else. `Activator.CreateInstance(type)` for a type that's only constructed reflectively will throw at runtime because the constructor was trimmed. `Assembly.LoadFrom` doesn't work at all (no JIT). Fix: annotate with `[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)]` so the trimmer keeps them, OR use source generators to replace reflection (the modern answer). Frameworks that lean on reflection (older AutoMapper, classic Newtonsoft.Json) are AOT-hostile; source-generator alternatives exist.

---

## Collections & Data Structures

### Q46. How does `Dictionary<TKey, TValue>` work internally?

Open addressing with chaining: an array of buckets (prime-sized for hash distribution), each bucket points to a chain of `Entry` records storing `(hashCode, key, value, next)`. Lookup: hash the key, mod by bucket count, walk the chain comparing `hashCode` then `key`. Strings use **Marvin hash** since .NET Core 2.1 (mitigates algorithmic complexity attacks where a malicious key set causes O(n) chains). Grow at load factor 1.0, doubling capacity. **`CollectionsMarshal.GetValueRefOrAddDefault`** lets you do a single-lookup upsert returning a `ref` to the slot — replaces "TryGetValue then Add" two-lookup pattern.

### Q47. When do you use `FrozenDictionary` / `FrozenSet`?

.NET 8+. **Read-only**, optimised for the fastest possible lookup — picks an internal layout (perfect hash, integer-key specialisations) based on the data at build time. Pay heavy cost in `ToFrozenDictionary()` — much slower than building a normal `Dictionary`. Use case: config tables / lookup tables loaded once at startup and queried millions of times. Don't use for short-lived dictionaries or anything that mutates.

### Q48. `ImmutableList<T>` vs `ImmutableArray<T>` — practical difference?

`ImmutableArray<T>` is a thin readonly wrapper around `T[]`: O(1) read, O(n) for "create modified copy". Best when you read often and rarely mutate; "mutations" allocate a new array. `ImmutableList<T>` is a balanced binary tree (AVL): O(log n) reads, O(log n) "mutations" via structural sharing — the new list shares most of its tree with the old. Use `ImmutableList` for large collections with frequent versioning (undo/redo, persistent state); `ImmutableArray` for snapshot-style data.

### Q49. `PriorityQueue<TElement, TPriority>` — what's the surprise?

.NET 6+. A min-heap by default: lowest-priority dequeued first. **No `Update` or `Remove`** — once enqueued, you can't change an element's priority. The standard workaround: keep a "stale" set; pop and discard until you get a non-stale entry. Use case: Dijkstra, A*, scheduled-event queues. For workloads needing priority updates, fall back to a sorted structure or a custom heap supporting decrease-key.

### Q50. What's the gotcha with `ConcurrentBag<T>`?

It's **thread-affine** — each thread has its own local stack, and `TryTake` steals from another thread's stack only when its own is empty. Fast when producers and consumers run on the same thread (each producer pulls back what it pushed); slow with cross-thread work-stealing. For general producer/consumer, use `ConcurrentQueue<T>` or a `Channel<T>` — `ConcurrentBag` is a niche tool that looks generic.

---

## Strings & Text

### Q51. Why must you always specify `StringComparison`?

Default `string.Equals`/`Contains`/`StartsWith` (without overload) uses `StringComparison.CurrentCulture` — a Turkish locale will treat `"i".Equals("I")` as **false** because Turkish has separate dotted/dotless i's. Locale-dependent bugs are the worst kind: green on developer machines, fail on user devices. Always pass `StringComparison.Ordinal` (byte-exact, fastest) or `OrdinalIgnoreCase` (byte-exact, case-folded). The CA1310 analyzer flags missing comparisons — enable it as an error.

### Q52. What does source-generated regex give you?

`[GeneratedRegex("...")]` (.NET 7+) generates the matching code at compile time as an `IsMatch`/`Match`/`Matches` partial method. Wins: AOT-compatible (no runtime IL emit), faster than `RegexOptions.Compiled` for cold-path patterns (no JIT cost on first use), enables compile-time pattern validation. Always prefer over the runtime-compiled `new Regex(..., RegexOptions.Compiled)` form for known-at-compile-time patterns.

### Q53. `System.Text.Json` vs Newtonsoft — what changes when you migrate?

`System.Text.Json` is faster, AOT-friendly, stricter — and behaves differently in subtle ways: case-sensitive by default (Newtonsoft is case-insensitive), no comments by default, polymorphism opt-in via `[JsonDerivedType]`, null handling stricter, no built-in DataContract attributes. Source-generated mode (`[JsonSerializable(typeof(MyType))]`) is the AOT-mandatory path. Migration pain points: dictionary keys (S.T.Json was string-only until .NET 7+), polymorphic deserialisation, `MissingMemberHandling` (use `JsonUnmappedMemberHandling`). For new projects: always `System.Text.Json`. For legacy: schedule the migration; don't rip-and-replace.

### Q54. What's `Rune` and when do you reach for it?

A `Rune` is a Unicode scalar value (a code point, surrogate-pair-aware). Iterating a `string` with `foreach` yields `char` — broken for emoji and astral-plane characters (multi-code-unit). `string.EnumerateRunes()` yields proper code points. For grapheme clusters (user-perceived characters: emoji with skin tone modifiers, combining accents), use `StringInfo.GetTextElementEnumerator`. Senior signal: knowing that `"👨‍👩‍👧".Length == 8` and what to use instead.

---

## Exceptions

### Q55. What's an exception filter and when do you use it?

`catch (Exception ex) when (someCondition)` — the filter expression runs in the **first pass** of exception handling, *before* the stack unwinds. If it returns false, the catch is skipped and the search continues up the call stack. Use case: log everything matching a predicate without actually handling: `catch (Exception ex) when (LogAndReturn(ex, false))`. Also useful for "catch only ExceptionType when SubProperty matches" without the overhead of catching, rethrowing, and losing the original stack.

### Q56. Why is exception throw/catch slow, and what changed in .NET 9?

Pre-.NET 9: throwing an exception captures the stack trace (expensive — walks frames, resolves PDB metadata), marshals across managed/native boundaries, runs handlers searching for a matching catch. Often 10-100× slower than a regular function return. .NET 9 aligned the exception model with Native AOT, removing some legacy overhead — **roughly 50% faster** throw/catch. Still: don't use exceptions for control flow. The `Result<T, E>` pattern (OneOf, ErrorOr, FluentResults) is the alternative when exceptions are too expensive.

### Q57. `ExceptionDispatchInfo` — what does it solve?

When you catch an exception on one thread and want to rethrow it on another (or after the original frame is gone), `throw ex;` loses the original stack trace. `ExceptionDispatchInfo.Capture(ex)` snapshots the original stack; `.Throw()` rethrows preserving everything. Used internally by `async`/`await` — when an awaited task threw, the framework captures + throws to give you the original exception state on the awaiter's frame. You'll need it manually only in custom thread-bridging code.

---

## I/O, Streams & Networking

### Q58. Why is `new HttpClient()` per request dangerous, and what does `IHttpClientFactory` solve?

Each `HttpClient` instance owns a connection pool via `SocketsHttpHandler`. Creating one per request leaks sockets (the handler holds them in TIME_WAIT for ~4 minutes); high-throughput services exhaust ephemeral ports. The opposite extreme — one static `HttpClient` for the app lifetime — caches DNS forever (stale records persist after DNS changes). **`IHttpClientFactory`** solves both: rotates the underlying `HttpMessageHandler` periodically (default 2 minutes via `SetHandlerLifetime`), pools handlers across requests, integrates with DI. Typed clients (`AddHttpClient<MyApi>()`) give you a class with `HttpClient` injected.

### Q59. What's `System.IO.Pipelines` and why is it different from `Stream`?

`Pipe` / `PipeReader` / `PipeWriter` — a zero-copy, backpressure-aware buffer between a producer and a consumer. Producer writes into a `Memory<byte>` it gets from the pipe; consumer reads `ReadOnlySequence<byte>` (possibly non-contiguous), consumes a portion, advances the read position. The pipe manages buffer allocation, slicing, and recycling. Foundation of Kestrel and SignalR. Beats `Stream` for high-throughput parsing because you don't allocate per-read buffers and don't copy data between layers — slice and parse in-place.

### Q60. Async file I/O — what's the correct setup?

`new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true)` or use `FileOptions.Asynchronous`. Without it, "async" reads block a thread-pool thread on the synchronous kernel call — defeats the purpose. .NET 6+ added `RandomAccess`: static helpers (`RandomAccess.ReadAsync(SafeFileHandle, ...)`) for scatter/gather I/O without constructing a `FileStream`, friendlier for hot loops doing many small reads at known offsets.

### Q61. Polly / `Microsoft.Extensions.Resilience` — what's the modern pattern?

Polly v8 introduced **resilience pipelines**: declarative `.AddRetry`, `.AddCircuitBreaker`, `.AddTimeout`, `.AddBulkhead`, `.AddFallback`. `Microsoft.Extensions.Resilience` wraps Polly v8 and integrates with `IHttpClientFactory` + Microsoft.Extensions.* ecosystem. Pattern: `services.AddHttpClient<MyApi>().AddResilienceHandler("standard", builder => builder.AddRetry(...).AddCircuitBreaker(...))`. Senior angle: know when *not* to retry — non-idempotent POSTs, 4xx client errors, anything where retry compounds the failure (downstream is overloaded → retry storm).

---

## Serialization

### Q62. JSON polymorphism in `System.Text.Json` — how does it work?

.NET 7+. Annotate the base type: `[JsonDerivedType(typeof(Dog), typeDiscriminator: "dog")] [JsonDerivedType(typeof(Cat), typeDiscriminator: "cat")] abstract class Animal {}`. Serialise emits `{ "$type": "dog", … }`; deserialise reads the discriminator to instantiate the right subtype. Configurable discriminator property name via `JsonPolymorphicAttribute`. Replaces the Newtonsoft `TypeNameHandling` pattern (which had deserialisation gadget vulnerabilities). Doesn't work for arbitrary types — must enumerate the closed set.

### Q63. Why use source-generated JSON?

`[JsonSerializable(typeof(MyDto))]` partial class produces compile-time serialisers. Wins: (1) **AOT compatibility** — no runtime reflection, works under trimming and Native AOT, (2) faster (~30-50% on serialise/deserialise vs reflection), (3) smaller binary (no reflection metadata), (4) compile-time validation. Required for any AOT scenario. Set `JsonSerializerContext` in `JsonSerializerOptions.TypeInfoResolver` to wire up.

### Q64. Why was `BinaryFormatter` removed in .NET 9?

Years of accumulated **deserialisation gadget** vulnerabilities — attackers craft a binary payload that, when deserialised, instantiates an `IDeserializationCallback` chain executing arbitrary code. Microsoft tried to harden it, then deprecated it, finally **removed entirely in .NET 9**. If you encounter it in legacy code, migrate to `System.Text.Json` (or MessagePack for binary efficiency). Never use it; never bring it back via a NuGet shim.

---

## ASP.NET Core

### Q65. Walk me through the middleware pipeline.

A linear chain of `RequestDelegate`s — each middleware gets `(HttpContext context, RequestDelegate next)`, does pre-work, calls `await next(context)`, does post-work. Registered via `app.Use(...)`, `app.UseMiddleware<T>()`, `app.Map`. **Order matters**: exception handler first (catches downstream throws), HSTS, HTTPS redirect, static files, routing, CORS, authentication, **then** authorization, endpoint execution. A misplaced `UseAuthentication` after `UseAuthorization` means authorize sees an unauthenticated user. Terminal middleware (no `await next`) short-circuits.

### Q66. Singleton vs Scoped vs Transient — what's the captive dependency trap?

**Singleton** — one instance per app. **Scoped** — one per request (per `IServiceScope`). **Transient** — new every resolve. The trap: a Singleton injecting a Scoped service — the Scoped is captured for the Singleton's lifetime, defeating "per-request" semantics and often holding a `DbContext` open forever. Enable `ValidateScopes` and `ValidateOnBuild` in development (default in dev, enable explicitly in CI): the DI container throws at startup if a captive dependency is detected.

### Q67. `IOptions<T>` vs `IOptionsSnapshot<T>` vs `IOptionsMonitor<T>` — when do you use each?

**`IOptions<T>`**: singleton, captured at app start, never refreshes. Use for config that's static for the lifetime. **`IOptionsSnapshot<T>`**: scoped — one snapshot per request, reflects config reload between requests. Use when config can change at runtime via file watching / Key Vault / etc., and per-request consistency is fine. **`IOptionsMonitor<T>`**: singleton with `OnChange` callbacks. Use in singleton services that need to react to config changes. Validate with `services.AddOptions<MyConfig>().ValidateDataAnnotations().ValidateOnStart()` — fail at boot, not at first use.

### Q68. Minimal APIs vs MVC controllers — what's the modern choice?

Both are first-class on modern .NET. Minimal APIs: `app.MapGet("/orders/{id}", async (int id, IOrderService svc) => …)` — less ceremony, better source generators, more AOT-friendly, route groups (`app.MapGroup("/api/v1")`), endpoint filters. MVC controllers: model binding attributes, action filters, `[Authorize]` per controller, view rendering (Razor). For pure JSON APIs in 2026 — **default to Minimal APIs** unless you need the MVC features (filters, conventions, model state). Controllers are still fine and well-supported; not deprecated.

### Q69. How does the .NET 7+ rate limiter work?

`builder.Services.AddRateLimiter(o => o.AddFixedWindowLimiter("api", w => { w.PermitLimit = 100; w.Window = TimeSpan.FromMinutes(1); }))`. Algorithms: fixed window, sliding window, token bucket, concurrency. Apply per endpoint: `app.MapGet("...").RequireRateLimiting("api")`. Key by IP, user, tenant — `o.AddPolicy("by-user", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.User.Identity?.Name ?? "anon", _ => …))`. Combine with auth so authenticated and anonymous users get different buckets. Returns 429 with `Retry-After`.

### Q70. `HybridCache` (.NET 9+) — what does it solve?

`IMemoryCache` is L1 (in-process, fast, single-instance). `IDistributedCache` (Redis) is L2 (shared across instances, slower). Hand-rolled "check L1, miss → check L2, miss → fetch from source" code is error-prone and prone to **cache stampedes** (many concurrent requests for the same missing key all hit the source). `HybridCache` is the official two-tier with **per-key stampede protection** — concurrent requests for the same key wait on a single in-flight fetch. Replaces FusionCache as the framework primitive (though FusionCache still has more features).

### Q71. What changed in ASP.NET Core for .NET 10?

(1) `WithOpenApi` deprecated — superseded by improved `Microsoft.AspNetCore.OpenApi` defaults. (2) `WebHostBuilder` / `IWebHost` / `WebHost` obsolete — use `WebApplicationBuilder`. (3) `IActionContextAccessor` obsolete. (4) Razor runtime compilation obsolete. (5) `IPNetwork` and `KnownNetworks` removed. (6) `ExecuteUpdateAsync` / `ExecuteDeleteAsync` get new delegate form in EF Core 10. (7) Server-Sent Events helpers in Minimal APIs. (8) Better OpenAPI document transformers.

### Q72. Hosted services and `BackgroundService` — what's the right pattern?

Implement `BackgroundService.ExecuteAsync(CancellationToken stoppingToken)`. Pass the token to every async call so graceful shutdown actually terminates the loop. **Never block in `StartAsync`** — `StartAsync` runs as part of host startup, blocking it stalls the whole app boot. For long-init work, kick off the work *from inside `ExecuteAsync`* and let `StartAsync` return immediately. For per-message work, combine with `Channel<T>` for the input queue.

### Q73. Problem Details (RFC 7807) — what's the modern setup?

`AddProblemDetails()` in DI; `app.UseExceptionHandler(...)` writes a Problem Details JSON for unhandled exceptions; `Results.Problem(...)` / `TypedResults.Problem(...)` for handler-emitted errors. Provides a uniform error contract: `type`, `title`, `status`, `detail`, `instance`, plus extension members. Replaces ad-hoc `{ error: "..." }` shapes that vary across endpoints. Customise via `ProblemDetailsService` or `IProblemDetailsWriter` for response-shape conventions.

### Q73b. Middleware vs endpoint filters — when do you reach for which?

**Middleware** runs in the global pipeline before/after routing — affects every (or matched-prefix) request, has access to the raw `HttpContext` early. Use for cross-cutting concerns: auth, logging, request ID assignment, CORS, exception handling. **Endpoint filters** (`MapGet(...).AddEndpointFilter(...)`) run per-endpoint after model binding — get typed parameter access (`EndpointFilterInvocationContext.GetArgument<T>(0)`), can short-circuit individual endpoints. Use for endpoint-specific concerns: per-route validation, per-route rate limit decoration, audit logging on mutating endpoints. Rule of thumb: middleware for pipeline-wide; filters for "this set of endpoints only".

### Q73c. `TypedResults` vs `Results` in Minimal APIs — and why does it matter for OpenAPI?

`Results.Ok(...)` returns `IResult` — runtime-typed; OpenAPI generation can't infer the response shape, you must annotate `.Produces<MyDto>(200)`. **`TypedResults.Ok(...)`** returns `Ok<MyDto>` — a concrete result type — and the OpenAPI generator reads the type to auto-document response shape and status. Also AOT-friendlier (no runtime type discovery). Pattern: return `Results<Ok<T>, NotFound, BadRequest<ProblemDetails>>` from a handler — union return types tell OpenAPI the full set of responses without attributes.

### Q73d. Built-in OpenAPI in .NET 9+ — what replaced Swashbuckle?

`Microsoft.AspNetCore.OpenApi` is now the framework default. `services.AddOpenApi(); app.MapOpenApi();` produces `/openapi/v1.json`. Faster than Swashbuckle (source-gen friendly), AOT-compatible, owned by the ASP.NET team. **Doesn't include a UI** — for Swagger UI / Scalar / Redoc, add a separate package. Migration: replace `AddSwaggerGen()` + `UseSwagger()` with the above; OpenAPI documents are mostly compatible. Note: `.WithOpenApi()` is deprecated in .NET 10 — defaults are now inferred from `TypedResults` and parameter attributes.

### Q73e. Configuring `ForwardedHeaders` behind a reverse proxy — what breaks if you don't?

Behind Nginx / Cloudflare / ALB / API Gateway, the `HttpContext.Connection.RemoteIpAddress` is the proxy's IP and `Request.Scheme` is `http` (proxy did TLS termination). Without `app.UseForwardedHeaders(...)`, you can't rate-limit by client IP, log the real source IP, or generate correct `https://` absolute URLs. Setup: `services.Configure<ForwardedHeadersOptions>(o => { o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto; o.KnownProxies.Add(IPAddress.Parse("…")); });` then `app.UseForwardedHeaders()` **before** anything that reads `RemoteIpAddress` or builds URLs. Set `KnownProxies` / `KnownNetworks` properly — otherwise an attacker can spoof `X-Forwarded-For` to look like any IP.

### Q73f. CORS — what's the one config that bites everyone?

`AllowAnyOrigin()` + `AllowCredentials()` = **rejected by the spec**, browsers refuse. Credentialed CORS requires an explicit origin allowlist or a dynamic origin policy that echoes the validated `Origin` header. Pattern: `AddCors(o => o.AddPolicy("default", b => b.WithOrigins("https://app.example.com").AllowAnyHeader().AllowAnyMethod().AllowCredentials()))`. Senior signal: knowing the spec restriction (credentialed requests demand a specific origin) without having to look it up.

### Q73g. Health checks — what's the difference between liveness and readiness?

**Liveness**: "is the process alive?" — should fail only when the process is truly broken (deadlocked, OOM-ed) and needs a restart. Kubernetes restarts the pod on failure. **Readiness**: "can this instance serve traffic right now?" — should fail when the instance is alive but temporarily unable to serve (DB unreachable, dependency degraded, warming up). Kubernetes removes the pod from the service load balancer but doesn't restart. `app.MapHealthChecks("/health/live", new() { Predicate = c => c.Tags.Contains("live") })` + `MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") })`. Tag checks accordingly. **Don't** check downstream services from liveness — a 5-minute DB blip shouldn't cycle every pod simultaneously.

### Q73h. What's the right ASP.NET Core Identity story in 2026?

For B2C apps with self-managed users: **ASP.NET Core Identity** (built-in, free, integrates with EF Core). For OAuth/OIDC server (issuing tokens for clients): **OpenIddict** (free, OSS, well-maintained) or **Duende IdentityServer** (commercial, was IdentityServer4 OSS). For managed identity: **Microsoft Entra ID** (formerly Azure AD), **Auth0**, **Okta**, **AWS Cognito** — outsource the auth surface entirely. Senior signal: knowing that IdentityServer4 went commercial as Duende; teams that need OSS now pick OpenIddict.

---

## Entity Framework Core

### Q74. Why is `DbContext` not thread-safe, and what's the workaround?

`DbContext` holds a connection (during a query), a change tracker, and per-instance state — concurrent use from multiple threads corrupts the change tracker. Designed as **scoped** (one per request) — fine for ASP.NET Core. For multi-threaded scenarios (parallel queries, Blazor Server with overlapping renders, background services that spawn parallel work), inject **`IDbContextFactory<TContext>`** and create a fresh context per unit of work: `using var ctx = factory.CreateDbContext();`. Each factory-produced context is short-lived and not shared.

### Q75. `AsNoTracking` — when, and what's the tradeoff?

By default EF tracks every entity returned by a query so it can detect changes for `SaveChanges`. **Tracking overhead**: ~3-10× slower per row, growing with entity graph size. `AsNoTracking()` returns plain objects with no change tracking — pure reads, no `SaveChanges` round-trip. Use for read-only queries returning to a controller or DTO. **`AsNoTrackingWithIdentityResolution()`** is the middle ground: no tracking, but ensures multiple references to the same row in one result deserialise to the same object instance.

### Q76. What's an N+1 query and how do you fix it?

You query for N parents (one query) and then access a child collection in a loop, causing N additional queries (one per parent). Total: N+1. The fix: `Include` the children in the parent query so EF generates a `JOIN`. But large `Include` chains cause **Cartesian explosion** — joining 1000 orders to 100 line-items each returns 100,000 rows of duplicated order data. **`AsSplitQuery()`** issues separate queries per `Include` and EF stitches them in memory — usually faster on wide aggregates. The third option: **project to a DTO** in the query — `Select(o => new OrderDto { ... })` translates fully to SQL and never materialises entities.

### Q77. `ExecuteUpdateAsync` / `ExecuteDeleteAsync` — what do they replace?

Pre-EF 7, bulk updates required loading the entities, mutating, `SaveChanges` — N round-trips and full change tracking. `ExecuteUpdateAsync` and `ExecuteDeleteAsync` emit set-based SQL: `UPDATE … SET … WHERE …` or `DELETE FROM … WHERE …` in one round-trip with **no change tracking**. `await ctx.Orders.Where(o => o.Status == "stale").ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, "archived"));`. Use for cleanup jobs, mass updates, batch deletes. .NET 10 changes the delegate form for cleaner syntax.

### Q78. Compiled queries — what's the win?

EF compiles every LINQ query into a SQL string + result materialiser; for a query hit in a tight loop, that compilation cost adds up. `EF.CompileAsyncQuery((MyContext ctx, int id) => ctx.Orders.FirstOrDefault(o => o.Id == id))` produces a delegate that skips the query-build step on each call. Wins ~10-30% on hot queries. Cache the delegate (it has the query plan); don't recompile per request.

### Q79. EF Core 10 — what's new for senior interviews?

(1) **SQL Server 2025 vector type** + `VECTOR_DISTANCE` — native embeddings storage and similarity search in EF without raw SQL. (2) Native `json` column type integration. (3) Full-text search functions exposed via LINQ for SQL Server. (4) Improved `ExecuteUpdate`/`ExecuteDelete` delegate form. (5) Better AOT compatibility (logically complete for most providers in 10). Senior angle: vector-in-database removes the "do I need Pinecone for RAG?" question for many SQL Server shops.

### Q80. Why does my query return entities that don't exist in the DB?

The **identity map** / change tracker. If you've previously loaded an entity in the same `DbContext`, then `Remove`d it without `SaveChanges`, then queried again — EF can return the cached in-memory entity (marked `Deleted`) instead of hitting the DB. Or: an entity tracked as `Added` but not yet persisted shows up in a `LINQ` query. Cause: long-lived `DbContext` accumulating state. Fix: short-lived contexts via `IDbContextFactory`, or `AsNoTracking` queries when you want database truth.

### Q80b. Optimistic concurrency control — how does it work in EF Core?

Add a `[Timestamp] byte[] RowVersion { get; set; }` (SQL Server) or `[ConcurrencyCheck] DateTimeOffset UpdatedAt { get; set; }` (any provider). On `SaveChanges`, EF includes the original `RowVersion` value in the UPDATE's WHERE clause; if zero rows are affected (someone else changed it first), EF throws `DbUpdateConcurrencyException`. Catch it, decide your strategy: client-wins (re-fetch, retry the update), store-wins (discard user's edit), merge (interactive UI). Without this, concurrent edits silently overwrite. **Senior production-readiness flag**: every entity exposed via a multi-user UI should have either optimistic concurrency or an explicit "single writer per row" architecture.

### Q80c. EF Core migrations in a multi-instance production deployment — what's the danger?

If two app instances start simultaneously and both try `dbContext.Database.MigrateAsync()`, you get a race: one acquires the migration lock (PG: advisory lock; SQL Server: app lock), the other waits, sometimes the wait times out leaving the DB in a partial state. Mitigations: (1) **never** call `MigrateAsync()` on app start in production — run `dotnet ef database update` (or generate an idempotent SQL script via `dotnet ef migrations script --idempotent`) as a **separate CI/CD step before the deploy rollout**. (2) Use the EF Core migration history table for state, not application code. (3) For zero-downtime deploys, write **expand-then-contract** migrations: add new columns nullable, deploy app reading old+new, then remove old in a second migration after rollout.

### Q80d. Cursor-based pagination vs offset — when do you switch?

Offset (`Skip(N).Take(M)`) is easy but performs terribly past a few thousand rows: the DB still scans-and-skips the first N rows. **Cursor-based**: `WHERE id < lastSeenId ORDER BY id DESC LIMIT M` — O(log N + M) on a sorted index, regardless of page depth. Trade-off: can't jump to "page 42", only forward/backward navigation. **Cursor encodes the sort key** (not just `id` — if sorting by `created_at`, cursor is `(created_at, id)` tuple). For any list expected to grow beyond ~10k rows, design cursor-first. Bonus: cursors are stable under inserts (offset shifts everything by one when new rows arrive at the top).

---

## Testing

### Q81. xUnit — what's the modern test class shape?

`[Fact]` for parameterless tests; `[Theory] + [InlineData]` for parameterised; `[MemberData]` / `[ClassData]` for richer fixtures. Shared expensive setup: `IClassFixture<TFixture>` (one fixture instance per test class), `ICollectionFixture<TFixture>` (across multiple classes via `[Collection]`). Async setup/teardown: `IAsyncLifetime` (`InitializeAsync` / `DisposeAsync`). Don't share state between tests in a class beyond fixtures — xUnit parallelises tests across classes by default.

### Q82. NSubstitute, Moq, FakeItEasy — which and why?

**Moq** had a sponsorship telemetry incident in 2023 (it phoned home on each test run); many teams moved off. **NSubstitute** is the current pragmatic choice — cleaner API (`sub.GetOrder(1).Returns(myOrder)` vs `mock.Setup(m => m.GetOrder(1)).Returns(myOrder)`), no licensing drama, fully maintained. **FakeItEasy** is the third option, similar quality. For most new code: NSubstitute. Don't mix mocking libraries in one project.

### Q83. What's `WebApplicationFactory<TEntryPoint>` for?

In-process integration test against the real ASP.NET Core pipeline — boots your app, swaps out specific services (override DB to in-memory or a Testcontainer), gets a `HttpClient` you can hit with real requests. `factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IClock>(_fakeClock)))`. Tests the full pipeline (routing, model binding, filters, middleware) without spinning up a process. Pair with **Testcontainers for .NET** (`Testcontainers.PostgreSql`) for real database integration — the gold standard for "does it work end-to-end".

### Q84. What happened to FluentAssertions and what do you use instead?

FluentAssertions v8 (early 2025) moved to a commercial license — free for personal/OSS, paid for commercial use above a certain employee threshold. The community forked v7 as **AwesomeAssertions** under the original Apache license. Plain `Assert.Equal` / `Assert.True` from xUnit is also fine and lighter. **Shouldly** is the other clean option (`actual.ShouldBe(expected)`). New projects: AwesomeAssertions or Shouldly; legacy: stay on FluentAssertions v7 or evaluate the license.

### Q85. Property-based testing — when does FsCheck earn it?

When invariants matter more than individual examples. Example: "a sorted list is sorted" — FsCheck generates 1000 random lists, asserts `sort(input) is sorted`. Finds edge cases (empty list, duplicates, max-int values) you'd never hand-write. Use cases: parsers (roundtrip property: `parse(format(x)) == x`), state machines, mathematical functions. Doesn't replace example-based tests — augments them. Worth the learning curve on critical algorithmic code.

---

## Build, Tooling & Deployment

### Q86. What's Central Package Management?

`Directory.Packages.props` in the repo root with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` and a `<PackageVersion>` per dependency. Individual projects then `<PackageReference Include="Pkg" />` without a version. Single source of truth across the solution — no more "OrderApi uses Serilog 4.0.1, UserApi uses 4.0.3" drift. Combine with `Directory.Build.props` for repo-wide MSBuild settings (target framework, langversion, nullable, treat-warnings-as-errors). Essential for monorepos.

### Q87. Self-contained vs framework-dependent vs single-file vs Native AOT — what do I pick?

**Framework-dependent**: smallest output, requires .NET runtime on the host. Default for server apps where you control the host. **Self-contained**: includes the runtime, ~80 MB output, no host dependency. For sealed appliances and containers. **Single-file publish**: bundles into one executable; combine with self-contained for true portability. **R2R (ReadyToRun)**: precompiled native code alongside IL for faster startup; bigger output. **Native AOT**: full AOT, no JIT, smallest startup + working set, big restrictions. Default: framework-dependent. For CLI tools or serverless cold-starts: Native AOT.

### Q88. The new `dnx` (.NET 10) — what is it?

A tool to execute .NET tools directly without `dotnet tool install -g`. `dnx my-tool@1.2.3 -- args` resolves the NuGet package, runs the tool, caches it. Replaces the old "install globally, hope it doesn't conflict, remember to update" flow. Particularly useful in CI pipelines and one-off invocations. Older `dotnet tool install/run` still works.

---

## Observability

### Q89. Why is structured logging via message templates better than string interpolation?

`logger.LogInformation("Order {OrderId} processed in {Elapsed}ms", id, ms)` — the template is preserved as the *message ID*, and `OrderId` + `Elapsed` are emitted as structured fields. Sinks (Seq, Elasticsearch, Datadog) index those fields — search "all logs where OrderId=42" trivially. **String interpolation (`$"Order {id} processed in {ms}ms"`)** loses all structure — the message becomes one opaque string with no searchable fields. Worse: it formats *every time*, even at log levels that drop the message.

### Q90. What does `[LoggerMessage]` source-generated logging give you?

`[LoggerMessage(EventId = 1, Level = LogLevel.Information, Message = "Order {OrderId} processed in {Elapsed}ms")] static partial void LogOrderProcessed(ILogger logger, int orderId, long elapsed);` — generates a strongly-typed, zero-allocation call site. Wins: (1) no boxing of value types, (2) compile-time validation of placeholder names match parameters, (3) faster than `LogInformation(string, params object[])`, (4) AOT-friendly. Adopt in any high-throughput code path.

### Q91. OpenTelemetry .NET — walk me through tracing across a service boundary.

Inbound: ASP.NET Core's OpenTelemetry instrumentation reads the `traceparent` header, creates an `Activity` rooted in the upstream context. Internal: any `ActivitySource.StartActivity("op-name")` creates child `Activity`s; baggage propagates via `Activity.Baggage`. Outbound: `HttpClient` instrumentation injects `traceparent` on the outgoing request. Export via OTLP to any backend (Jaeger, Tempo, Honeycomb, Datadog). Add `services.AddOpenTelemetry().WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddEntityFrameworkCoreInstrumentation().AddOtlpExporter())`.

### Q92. `System.Diagnostics.Metrics` — what replaced EventCounters?

`Meter` factory creates `Counter<T>`, `Histogram<T>`, `ObservableGauge<T>`, `UpDownCounter<T>`. OpenTelemetry-compatible by design (the same Meter feeds OTLP). Replaces the older EventCounters pattern — same low-allocation philosophy, better instrument types (especially `Histogram` for latency distributions), portable to non-Microsoft backends. `var meter = new Meter("MyApp"); var orderCount = meter.CreateCounter<long>("orders.processed");`. Wire to OpenTelemetry: `.AddMeter("MyApp")`.

### Q93. Propagate trace context from an HTTP request into a background `Channel<T>` worker.

The trace context lives in `Activity.Current` — it doesn't auto-propagate across `Channel<T>` boundaries because the worker is a separate task with its own `ExecutionContext`. Capture the parent context when enqueuing: `var ctx = Activity.Current?.Context;`. Worker dequeues, starts its own activity with the parent context: `using var activity = ActivitySource.StartActivity("worker", ActivityKind.Internal, parentContext: ctx);`. Now the worker's spans show up as children of the original request in your tracing UI.

---

## Security

### Q94. Password hashing — what's the right choice in 2026?

`PasswordHasher<TUser>` from ASP.NET Core Identity uses PBKDF2-SHA256 with ~100k iterations — adequate but no longer best-in-class. For new systems, **Argon2id** via `Konscious.Security.Cryptography.Argon2` — memory-hard (resistant to GPU/ASIC attacks). Parameters: memory cost 64MB, time cost 3, parallelism 4 are reasonable defaults; tune to ~250ms on your hardware. Never roll your own (no MD5, SHA, single-pass anything). Never store passwords in plaintext, never reuse salts.

### Q95. Data Protection API — when do you actually need to configure it?

ASP.NET Core uses `IDataProtector` (under the hood: AES-GCM-based) for cookie encryption, antiforgery tokens, OAuth state — anything that needs to round-trip through the client. By default it persists the key ring to `%LOCALAPPDATA%` (user-local). **In multi-instance deployments**: the key ring must be shared across instances or users get logged out after a load-balancer flip. Configure with `services.AddDataProtection().PersistKeysToAzureBlobStorage(...)` / `PersistKeysToRedis(...)` / `PersistKeysToFileSystem(...)` (with a shared mount). Forgetting this is the most common "intermittent auth failure in prod" cause.

### Q96. Common ASP.NET Core security mistakes?

(1) `FromSqlRaw($"SELECT … WHERE name = '{name}'")` — string interpolation in raw SQL **is SQL injection**. Use `FromSqlInterpolated` (auto-parameterises) instead. (2) `@Html.Raw(userInput)` in Razor — XSS hole. (3) Disabling antiforgery for "convenience" — opens CSRF. (4) Exposing `IUrlHelper.Content("~/...")` without validating user-supplied paths — open redirect. (5) Logging passwords/tokens via `LogInformation("Login attempt: {Request}", request)` if `request` includes credentials. Add structured-log filters or use redacting types.

### Q97. Post-quantum cryptography in .NET 10 — what's there?

.NET 10 added .NET surface for **ML-KEM** (key encapsulation), **ML-DSA** (digital signatures), **SLH-DSA** (stateless hash-based signatures) — the NIST-standardised PQC algorithms. Awareness-only at most levels: production crypto agility for the post-quantum transition is a 5-10 year roadmap; most current systems should stay on AES-GCM + ECDSA P-256 with a migration plan. Senior interviews: know the API exists, know which algos NIST selected, know "harvest now decrypt later" is the threat.

### Q97b. JWT token revocation — short-lived tokens still contain stale claims, what's the play?

The problem: an admin demotes user X to non-admin, but X's JWT is valid for another 15 minutes and still claims `role=admin`. Three patterns: (1) **Short-lived access tokens + refresh tokens** — issue 5-15min access tokens; the refresh flow re-reads claims from the DB. Standard OAuth pattern. (2) **Revocation list** in fast cache (Redis) — middleware checks every request against `revoked:{jti}` set; constant-time lookup, fails-closed on cache outage. (3) **Stateful sessions** — JWT acts as a session ID, not a credential; every request rehydrates claims from a server-side store. (4) For impossible-to-be-stale data (account suspension), accept the 5-15min window and design UX around it. Senior signal: knowing all four trade-offs and picking based on the threat model.

### Q97c. Mass assignment in ASP.NET Core — how do you prevent it?

If your controller takes `[FromBody] Order order` and binds directly to your EF entity, an attacker can set fields you never exposed in the UI — `order.Status = "paid"`, `order.UserId = 999`. **DTO pattern**: bind to `CreateOrderRequest` (only the fields a client may set), then map to the entity in code. Don't expose entities at API boundaries. **`[Bind(nameof(Order.Description), nameof(Order.Quantity))]`** attribute exists but is fragile — every new safe field requires a code change. Strong-typed DTOs + a mapping step (manual or Mapperly) is the senior answer.

---

## Architecture Patterns

### Q98. MediatR went commercial in 2025 — what's the replacement?

MediatR moved to a paid license for commercial use early 2025. Replacements: **Mediator** (martinothamar — source-generated, near-zero overhead, free, very fast), **Wolverine** (Jeremy D. Miller — broader scope: mediator + messaging + sagas + outbox), **Brighter** (similar to Wolverine), or **hand-rolled handlers** (a `Dictionary<Type, Func<IRequest, Task>>` is ~30 lines). Senior signal: knowing the licensing situation and picking based on team scale — for a single-service API, hand-rolled handlers beat any framework on simplicity.

### Q99. What's MassTransit and when do you reach for it?

A messaging abstraction over RabbitMQ, Azure Service Bus, Amazon SQS, Kafka. Consumer model: implement `IConsumer<TMessage>`, register with DI, MassTransit wires the broker, deserialisation, retries, error handling, saga state. Wins over raw broker clients: portability, sagas (stateful workflows persisted in DB), outbox pattern, observability via OpenTelemetry. Reach for it when: multi-broker support matters, sagas/long-running workflows are core, or the team wants a unified messaging vocabulary across services. Avoid if a single broker with simple producer/consumer is all you need — adds significant complexity.

### Q100. Domain-Driven Design tactical patterns — what maps to what in C#?

**Entities** — classes with identity that persists across mutations; identity via `Id`. **Value Objects** — `readonly record struct` is the perfect fit (immutable, value-equality, small). **Aggregates** — entity clusters with one root; the root is the only externally-referenced entity; invariants enforced at root. **Domain events** — `record` types raised from aggregates and published via a mediator. **Repositories** — interfaces in the domain layer, implementations in infrastructure. **Specifications** — composable `Expression<Func<T, bool>>` predicates passed to repositories. Senior signal: knowing when DDD's complexity is worth it (rich domain rules) vs anaemic CRUD (just use EF and DTOs).

### Q100b. Vertical slice vs clean / onion / hexagonal — what do you pick for a new API?

**Clean / Onion / Hexagonal**: organise by technical layer (Domain / Application / Infrastructure / Presentation). Wins on enforcing dependency direction (domain depends on nothing); costs ceremony — every feature touches every layer. **Vertical slice**: organise by feature — each endpoint is a folder with its own request, handler, validator, response. Wins: each feature self-contained, easy to add/remove, low cognitive load. Costs: cross-cutting concerns need explicit shared utilities. Modern preference for greenfield APIs: **vertical slices**, with a thin "shared kernel" for true cross-feature primitives. Reach for clean architecture only when the domain logic is complex enough to warrant the layer separation.

### Q100c. Repository pattern over EF Core — when does it add value, when is it just noise?

The case **against**: EF's `DbContext` *is* a unit of work, `DbSet<T>` *is* a repository; wrapping it in `IGenericRepository<T> { Get(id); Add(e); }` is leaky (you'll add `IncludeMany` and `QueryWithSpec` and now it's EF-shaped). The case **for**: (1) testability if you can't use a real DB in tests (Testcontainers is the modern alternative), (2) swapping providers (rare), (3) **collecting domain-specific queries on the aggregate root**: `IOrderRepository.GetActiveByCustomer(id)`. The middle path: domain-specific repositories that expose business-shaped methods (not generic CRUD); no repository if the entity is just a DTO over a table.

### Q100d. CQRS — when does the read/write split actually pay off?

You need CQRS when (1) reads dominate writes by 10×+ and (2) the read model differs enough from the write model that you'd denormalise. Then: write side uses your aggregates + EF Core; read side hits a denormalised view (a materialised view, ElasticSearch index, Redis cache, or a separate read-only DB). Updated via domain events or CDC. Don't reach for CQRS in a CRUD app — it's pure overhead. Senior signal: knowing the trigger is **divergent read/write models**, not "we want our API to be modern".

### Q100e. Monolith → microservices — what's the seasoned answer?

"Start with a **modular monolith** with clear bounded contexts; extract services only when team/scale/independence pain justifies the operational cost." The honest hierarchy: (1) one well-structured monolith with internal modules beats badly-bounded microservices. (2) Extract a service when its team needs independent deploy cadence or scale profile. (3) Distributed transactions are a tax — minimise cross-service writes via outbox + eventual consistency. The anti-pattern: extracting microservices early to "future-proof" without the deployment, observability, and team structure to support them.

### Q100f. Event sourcing — what's the .NET stack and when is it the right call?

**Marten** (Postgres-backed, document + event store, very ergonomic in .NET) or **EventStoreDB / KurrentDB** (purpose-built event store, multi-language). Event sourcing pays off when (1) you genuinely need full audit history of every state change ("show me what the order looked like at 14:23 last Tuesday"), (2) you need replay-based projections (different read models built from the same event stream), (3) the domain is reactive (every command produces events others care about). Costs: snapshotting strategy, schema evolution of events (you can't change history), eventual consistency for projections. Don't event-source CRUD; the trigger is genuine temporal/auditing needs.

---

## Native AOT & Trimming

### Q101. What is Native AOT, in one paragraph?

Ahead-of-time compilation to a native binary — no JIT at runtime, no IL, no dynamic codegen. `<PublishAot>true</PublishAot>` in csproj. Wins: ~3× smaller binary, ~10× faster cold start, ~50% less working set, no JIT warmup. Costs: closed-world (no `Assembly.LoadFrom`, no runtime IL emit, very restricted reflection), trimming required (unreachable code is removed), most reflection-based libraries need source-gen alternatives. Use cases: CLI tools, serverless / Lambda, sidecars, gRPC services, ASP.NET Core minimal APIs with source-gen JSON.

### Q102. What does the trimmer do and what's a trim warning?

The IL trimmer removes types and members that aren't statically reachable from the entry point — dramatically reduces binary size for AOT. **Trim warnings** (`IL2026`, `IL2070`, ...) flag code patterns the trimmer can't analyse safely — typically reflection (`Type.GetMethod("Foo")` — the trimmer can't see the string), generics with reflection. Annotate: `[RequiresUnreferencedCode("Reason")]` to mark "this method uses reflection, callers beware", `[DynamicallyAccessedMembers(...)]` on a `Type` parameter to tell the trimmer to preserve members. Zero trim warnings is the AOT-ready bar.

### Q103. What's AOT-incompatible in 2026?

Older AutoMapper (reflection-based mapping) — use `Mapperly` (source-gen). Newtonsoft.Json with reflection — switch to `System.Text.Json` source generation. Any library that emits IL at runtime (`Castle.DynamicProxy`, older Moq versions) — find a non-emit alternative or source-gen replacement. **EF Core**: partial AOT support in 8/9, **fully AOT-compatible in 10**. Validate by adding `<PublishAot>true</PublishAot>` and reading trim warnings — they tell you exactly what's not AOT-safe.

### Q103b. Container publishing without a Dockerfile — what's the pitch?

`dotnet publish -t:PublishContainer -p:ContainerRepository=myorg/myapp -p:ContainerImageTag=1.2.3` builds and pushes an OCI image directly — no Dockerfile, no `docker build` step. Uses base images defined in csproj (`<ContainerBaseImage>mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled</ContainerBaseImage>`). Default in .NET 10 is **Ubuntu chiseled** (distroless equivalent — no shell, no package manager, minimal attack surface). Wins: reproducible images, faster CI (no Docker daemon needed), proper layer caching driven by build output. Use for greenfield deploys; legacy Dockerfiles are fine if they already work.

---

## Interop

### Q104. P/Invoke marshalling — what's "blittable" and why does it matter?

Blittable types have identical representations in managed and native memory — `int`, `long`, `float`, `double`, `IntPtr`, structs containing only blittable fields with `LayoutKind.Sequential`. Marshalling a blittable type is **free** — the runtime just hands the native side a pointer. Non-blittable types (`string`, `bool` until recently, complex structs) require **stub-generated conversion** — copy/transform/free. For hot interop paths, design your structs to be blittable; use `byte` instead of `bool`; pass strings as `byte*` + length when feasible.

### Q105. Function pointers (`delegate*<T>`) — when?

C# 9+. `delegate* unmanaged<int, int>` is a typed function pointer to a native function. Compared to `Marshal.GetDelegateForFunctionPointer` (creates a delegate object): no allocation, no managed-to-native stub, direct call. Pair with `[UnmanagedCallersOnly]` on managed functions that you want to expose to native (callback from C library). Niche but transformative when you need them — interop hot loops, custom JITs, FFI for high-throughput systems.

---

## War Stories — Bring Receipts

Senior C#/.NET interviews care less about trivia and more about whether you've measured your way through real problems. Prepare *one production war story per topic area*. The shape:

> *"At &lt;company&gt;, our &lt;symptom&gt; alert fired at &lt;time&gt;. We profiled with &lt;tool&gt;, found &lt;root cause&gt;, mitigated with &lt;action&gt;, permanent fix was &lt;change&gt;. The lesson was &lt;takeaway&gt;."*

Have one ready for: a Gen 2 promotion crisis caused by accidental boxing in a hot loop; a `HttpClient` socket exhaustion outage from `new HttpClient()` per request; a `ConcurrentDictionary.GetOrAdd` factory side-effect bug; a captive-dependency scoped/singleton mix; an N+1 EF query found via Application Insights / OpenTelemetry; an idle-in-transaction equivalent in C# (e.g. a forgotten `DbContext` in a static field); a Native AOT publish that revealed every reflection-based library you depended on. These are the questions that separate "read about .NET" from "ran .NET in production".

---

*End of primer. ~105 questions across 20 senior-interview topic areas, derived from the vault's `C Sharp Path.md` curriculum and aligned to .NET 10 LTS (released 2025-11-11) / C# 14. Coverage hits ~90% of what shows up in senior backend .NET interviews; the remaining 10% is whichever niche the role specialises in (Blazor, MAUI, gRPC at scale, game-engine-style native interop) — pick one based on the JD and study deep.*
