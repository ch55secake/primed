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

### Summary

**What this topic covers**

How .NET actually executes your code — the layer between your C# source and the CPU instructions that run. Three concern areas: (1) the **execution model** — stack vs heap, value vs reference, the JIT pipeline (Tier 0, dynamic PGO, Tier 1, OSR), Native AOT as the alternative; (2) the **garbage collector** — Workstation vs Server, generations, LOH/POH, regions vs segments, DATAS, finalizers, the Dispose pattern, SafeHandle; (3) the **loader and isolation model** — `AssemblyLoadContext` (the post-AppDomain story), collectible ALCs for plugins and hot-reload. The 11 questions in this section are the surface; underneath sit the runtime mechanics that every later topic (Memory Management, Concurrency, ASP.NET Core under load, Native AOT) silently depends on. Get the CLR mental model right and topics like "p99 latency tripled after a deploy" stop being mysterious.

**Mental model**

Think of .NET in three layers. (1) **Source → IL**: `csc` (or Roslyn in modern toolchains) compiles `.cs` files into platform-independent IL inside assemblies. (2) **IL → native**: at runtime, the CLR loads assemblies via an `AssemblyLoadContext`, verifies IL, and the **tiered JIT** compiles methods — Tier 0 for fast startup, then Tier 1 with **dynamic PGO** for hot code. .NET 10's JIT pushes escape analysis, devirtualization, and inlining further so more allocations stay on the stack and more virtual calls collapse to direct ones. (3) **The GC** owns the managed heap — Server GC by default in ASP.NET Core, regions (not segments) since .NET 7, DATAS adapting heap count to actual workload size. The alternative branch is **Native AOT** — compile to native at publish time, no JIT, no IL at runtime, closed world. The other big mental shift is **value types live where they're declared**: a struct local sits on the stack; a struct field of a class lives on the heap inside that object. "Structs are stack-allocated" is the textbook lie that breaks the moment escape analysis or boxing enters the picture.

**Key terms**

- **JIT tiering** — Tier 0 (fast compile, unoptimised) → instrumented with **dynamic PGO** → Tier 1 (optimised, devirtualised, inlined). **OSR** swaps the running frame mid-loop.
- **Boxing** — wrapping a value type in a heap `object`; one Gen 0 allocation per box, fixed by generic constraints.
- **Escape analysis** — JIT optimisation that promotes provably-local heap allocations to the stack.
- **Generations** — Gen 0 (fresh), Gen 1 (survived once), Gen 2 (long-lived). **LOH** (≥85 KB) bypasses Gen 0/1 and collects only on full Gen 2.
- **Workstation vs Server GC** — single GC thread vs one per logical core; Server is default for ASP.NET Core.
- **Regions vs segments** — .NET 7+ uses 4 MB regions instead of 256 MB segments; returns memory to the OS properly.
- **DATAS** — .NET 8+ Server GC mode that adapts heap count to working set; critical for containers.
- **Dispose pattern** — `IDisposable` + optional finalizer + `GC.SuppressFinalize(this)`; prefer `SafeHandle` for native resources.
- **AssemblyLoadContext** — post-AppDomain isolation primitive; **collectible** ALCs unload for plugins and hot-reload.
- **Native AOT** — closed-world ahead-of-time compile; no JIT, no `Assembly.LoadFrom`, severely restricted reflection.

**Why interviewers ask this**

Three signals. (1) **Mechanical sympathy** — does the candidate know what *actually happens* when their code runs? Boxing, generations, JIT tiering — these aren't trivia, they explain why a hot path allocates, why p99 spikes after a Gen 2 collection, why a "tiny refactor" tanked throughput. (2) **Production diagnostic skill** — Q8 ("p99 tripled, isolate GC vs JIT vs locks") separates candidates who profile with `dotnet-counters` / `dotnet-trace` / `dotnet-gcdump` from candidates who guess. The discipline of "never guess, always measure" is the senior tell. (3) **.NET 10 currency** — DATAS, regions, post-.NET 8 PGO, .NET 10 escape analysis improvements — knowing what changed across .NET 6 → 10 separates candidates who've shipped current code from candidates who learned .NET on .NET Framework and stopped tracking.

**Common confusions**

- "Structs are stack-allocated" — only when they're locals. Struct fields of a class live on the heap inside the enclosing object; escape analysis can also stack-allocate small heap allocations.
- "Boxing is rare" — it's everywhere a value type meets an `object` parameter, a non-generic collection, or an interface call without devirtualization. `[MemoryDiagnoser]` reveals it.
- "Workstation GC is fine for our server" — wrong default; ASP.NET Core wants Server GC. Two-to-three-times throughput cost on the wrong setting.
- "LOH is just for big arrays" — and it's not compacted by default. Fragmentation = growing RSS with stable working set, the classic "memory leak that isn't a leak" symptom.
- "AppDomains exist in .NET Core" — they don't. `AssemblyLoadContext` is the replacement; collectible ALCs do what unloadable AppDomains used to.
- "Finalizers are good cleanup" — they're a last-resort safety net. `IDisposable` + `using` is the real pattern, with `SafeHandle` for native resources.
- "Native AOT just makes startup faster" — it also closes the world, breaks most reflection-based libraries, and forbids runtime IL emit. It's a different deployment model, not a free switch.

**What follows from this topic**

Every later topic builds on these primitives. Memory Management (`Span<T>`, `stackalloc`, `ArrayPool`) is the optimisation toolkit you reach for *because* you understand boxing and Gen 0 pressure. Concurrency & Async builds the async state-machine model that allocates only on suspension — directly downstream of the heap/stack story. Native AOT & Trimming weaponises the closed-world model from this section. Observability questions assume you can read a GC trace. If CLR fundamentals feel shaky, fix them first — drilling further topics on top of a vague runtime model doesn't compound.

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

### Summary

**What this topic covers**

The toolkit modern C# gives you to write low-allocation, high-throughput code without dropping to `unsafe`. Three concern areas: (1) the **span family** — `Span<T>`, `ReadOnlySpan<T>`, `Memory<T>`, `ref struct` semantics, `stackalloc`, the C# 13 `allows ref struct` constraint; (2) the **allocation-avoidance toolkit** — `ArrayPool<T>.Shared`, `CollectionsMarshal`, `string.Create`, source-generated serialisers, `FrozenDictionary`, `ValueTask`; (3) the **measurement discipline** — BenchmarkDotNet with `[MemoryDiagnoser]` + `[DisassemblyDiagnoser]`, the `System.IO.Pipelines` pattern for zero-allocation parsing, `[LibraryImport]` for AOT-friendly P/Invoke. The 8 questions in this section cover what every hot-path engineer reaches for: not "make this faster" but "make this allocate less so the GC doesn't spike p99". This is the toolkit Stephen Toub's *Performance Improvements in .NET* posts have been quietly handing the .NET community since 2017.

**Mental model**

There are three tiers of optimisation in .NET. (1) **Algorithmic** — pick the right data structure, the right query shape, the right caching layer. (2) **Allocation reduction** — use `Span<T>` slices instead of substring copies, `ArrayPool<T>` instead of `new byte[]`, source-generated serialisers instead of reflection, `ValueTask` for synchronous fast paths. (3) **Memory-layout-aware** — pinning, `stackalloc`, blittable structs, P/Invoke with `LibraryImport`. The middle tier is where most senior C# work happens — you stay in safe code, the compiler keeps you honest with `ref struct` rules, and the GC stops being the bottleneck. The mental shift versus textbook C# is that **a hot path is not measured in CPU cycles, it's measured in allocations per request**. A method that does the same work but allocates 2 KB per call will dominate any algorithmic win on a 10k-RPS endpoint because Gen 0 pressure builds → Gen 1 promotions → eventual Gen 2 collection → p99 spike. `Span<T>` and friends exist so you can write straightforward code that simply doesn't allocate. The other shift: `ref struct` is a *compile-time* enforcement — the compiler refuses to let `Span<T>` escape its stack frame, so memory safety is preserved without runtime checks.

**Key terms**

- **`Span<T>`** — stack-only `ref struct` wrapping arbitrary contiguous memory (array, string, `stackalloc`, native); zero-copy slicing.
- **`Memory<T>`** — heap-friendly counterpart that can cross await boundaries; `.Span` materialises a synchronous slice.
- **`ref struct`** — type constraint that lives on the stack only; can't be boxed, captured by a lambda, or held in a heap field. C# 13's **`allows ref struct`** opens generics to ref structs.
- **`stackalloc`** — allocate on the current stack frame; free on method return; bounded by ~1 MB stack size — guard against user-controlled sizes.
- **`ArrayPool<T>.Shared`** — rent/return bounded-scope buffers; `clearArray: true` when returning user data to prevent leakage.
- **`CollectionsMarshal`** — unsafe-but-safe accessors: `AsSpan(list)`, `GetValueRefOrAddDefault(dict, key)` — single-lookup upserts.
- **`ValueTask<T>`** — struct-wrapped task for often-synchronous methods; rules: await once, never `.Result`, never store in a field.
- **BenchmarkDotNet** — the only valid micro-benchmarking tool; `[MemoryDiagnoser]` + `[DisassemblyDiagnoser]` mandatory.
- **`[LibraryImport]`** — source-generated P/Invoke (.NET 7+); AOT-friendly, faster, replaces `[DllImport]` in new code.
- **`System.IO.Pipelines`** — zero-copy buffered I/O abstraction; the foundation of Kestrel; enables zero-allocation-per-line parsing.

**Why interviewers ask this**

Three signals. (1) **Have you written a real hot path?** Anyone who's profiled an ASP.NET Core endpoint at scale has reached for `Span<T>`, `ArrayPool`, or `[MemoryDiagnoser]`. Candidates who can't talk about these have written CRUD with EF only. (2) **Do you measure?** Q16 ("how do you benchmark .NET code?") and the implicit pattern across this section is the same — name the tool (BenchmarkDotNet), name the attributes, name the disassembly check. The senior tell is "I always check the emitted assembly because the JIT may not have vectorised what I expected." (3) **Closed-world fluency** — `ref struct` rules, `allows ref struct`, why `Span<T>` can't cross async — these test whether the candidate can reason about compile-time lifetime constraints. The interview filter: can you walk through Q18 (parse 1 GB of UTF-8 with zero allocation per line) end-to-end without prompting?

**Common confusions**

- "`Span<T>` is always faster" — only on the hot path. The allocation savings dominate at scale, but a one-time call doesn't care.
- "`Span<T>` can cross async" — no. It's a `ref struct`; the async state machine would have to heap-box it, which is forbidden by definition. Use `Memory<T>` across awaits.
- "`stackalloc` is unsafe" — not since C# 7.2 when assigned to `Span<T>`. It's bounded by stack size, which is the real risk.
- "`ArrayPool` is faster than `new`" — only for sizes the pool actually keeps. For tiny arrays (<64 bytes) it's often slower; for 4-32 KB buffers it's a clear win.
- "`ValueTask` is just a faster `Task`" — it's a constrained `Task` with strict usage rules. Break the rules and you get silent corruption. Default to `Task` unless the method *often* completes synchronously.
- "I'll just use `unsafe`" — modern C# rarely needs `unsafe`. `Span<T>` + `CollectionsMarshal` + `[LibraryImport]` cover almost every previously-unsafe scenario with compile-time safety.
- "BenchmarkDotNet results are the truth" — they're truth *for that micro-benchmark*. Always validate with an end-to-end load test; micro-benchmarks miss cache effects, GC pressure across a workload, and contention.

**What follows from this topic**

This is the toolkit you reach into for every later perf-sensitive topic. LINQ & Functional (Q39, Q41b) uses these techniques internally — .NET 9/10 LINQ got faster precisely because the BCL adopted `Span<T>` paths and SIMD. Strings & Text leans on `ReadOnlySpan<char>` for substring-free parsing. ASP.NET Core's middleware and Kestrel are built on `System.IO.Pipelines`. Native AOT & Trimming requires `[LibraryImport]` and source-gen everywhere — direct extension of this section. If you can't profile an allocation and pick the right tool to remove it, the rest of the senior-level performance conversation will stall.

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

### Summary

**What this topic covers**

How modern C# expresses concurrent and asynchronous work — and how to avoid the classic ways it goes wrong. Three concern areas: (1) the **async machinery** — what the compiler does to an `async` method, `Task` vs `ValueTask`, `ConfigureAwait`, `IAsyncEnumerable<T>`, `CancellationToken` discipline, the state-machine cost model; (2) the **primitives** — `lock` (and C# 13's `System.Threading.Lock`), `SemaphoreSlim`, `Monitor`, `Mutex`, `System.Threading.Channels`, `ConcurrentDictionary`, `Task.WhenAll/WhenAny/WhenEach`; (3) the **production patterns** — bounded concurrency with `Parallel.ForEachAsync`, linked `CancellationTokenSource`, the cancellation-flows-everywhere discipline, deadlock avoidance. The 13 questions in this section are the day-to-day reality of any ASP.NET Core service: every request handler is async, every downstream call is awaited, every background worker is a `BackgroundService` with a `CancellationToken`. Get the mental model right and senior interviewers stop probing; get it wrong and they'll find a `.Result` somewhere in your code.

**Mental model**

`async/await` is **cooperative multitasking on top of the thread pool**. The compiler rewrites an `async` method into a state machine; each `await` is a potential suspension point. If the awaited operation has already completed (cache hit, channel with buffered data), execution continues synchronously with **zero allocations**. If it hasn't, the state machine hoists to the heap (one allocation), the continuation is registered with the awaited source, and the method returns its `Task`/`ValueTask` to the caller. When the source completes, the continuation reschedules — on the captured `SynchronizationContext` if there is one, otherwise on the thread pool. This explains every async behaviour: why `ConfigureAwait(false)` matters in libraries (avoids capturing a UI context), why `.Result` deadlocks under a captured context (resume needs the thread holding the wait), why `ValueTask` exists (eliminate the allocation on synchronous fast paths), why `IAsyncEnumerable<T>` works (the iterator is itself an async state machine yielding values lazily). The second mental shift is **cancellation is a first-class concern, not an optional parameter**. Every async method that can take meaningful time accepts a `CancellationToken` and passes it down. ASP.NET Core wires `HttpContext.RequestAborted` automatically — when the client disconnects, every downstream call unwinds. Skip the token and your server burns CPU on dead requests.

**Key terms**

- **Async state machine** — compiler-generated struct/class implementing `IAsyncStateMachine`; sync fast path is zero-allocation, async path heap-boxes once.
- **`Task` vs `ValueTask`** — reference vs struct task; `ValueTask` for often-synchronous methods, with strict usage rules.
- **`ConfigureAwait(false)`** — don't capture the current `SynchronizationContext`. Matters in libraries; irrelevant in ASP.NET Core (no SyncContext).
- **`System.Threading.Lock`** — C# 13 dedicated lock type; faster than locking on arbitrary objects, explicit semantics.
- **`SemaphoreSlim`** — only in-process primitive with `WaitAsync`; use for async critical sections or bounded concurrency.
- **`System.Threading.Channels`** — modern producer/consumer primitive; bounded or unbounded; native async; replaces `BlockingCollection`.
- **`Task.WhenAll/WhenAny/WhenEach`** — parallel composition; `WhenEach` (.NET 9+) streams completion order.
- **`IAsyncEnumerable<T>`** — async sequence; `await foreach`; annotate `CancellationToken` with `[EnumeratorCancellation]`.
- **`ConcurrentDictionary.GetOrAdd`** — not atomic at the factory level; wrap with `Lazy<T>` if the factory has side effects.
- **Linked `CancellationTokenSource`** — combine request token with timeouts; first failure cancels the rest.
- **Deadlock pattern** — `.Result` on async code under a captured `SynchronizationContext`; never block on async.

**Why interviewers ask this**

Three signals. (1) **Do you understand what async actually does?** Q19 ("what does the compiler do?") sorts candidates instantly — junior answers say "creates a thread"; senior answers walk through the state machine, the sync fast path, the hoist-to-heap on suspension. (2) **Have you debugged production async bugs?** The `GetOrAdd` factory-twice trap (Q22), the captive `.Result` deadlock (Q26), the missing `[EnumeratorCancellation]` (Q28), the `WhenAll` exception swallowing (Q28c) — these are all things you only know because you've shipped or fixed them. (3) **Cancellation discipline** — Q28b is the production-readiness question. Candidates who flow `CancellationToken` through every layer and know why never to `Cancel()` from inside a chain awaiting the same token are operating at a senior level. The interview filter: can you explain why `await Task.WhenAll(tasks)` only rethrows the first exception, and how to see them all?

**Common confusions**

- "Async creates a thread" — it doesn't. Async releases the current thread back to the pool; resumption uses a (possibly different) pool thread, or the captured context.
- "`ConfigureAwait(false)` always helps" — irrelevant in ASP.NET Core (no SyncContext). Mandatory in library code that might be called from WPF/WinForms/MAUI.
- "`ValueTask` is always faster" — only when the method often completes synchronously. Break the usage rules (await twice, store in field) and you corrupt state.
- "`lock` is fine for async" — no. `lock` blocks; async methods that need critical sections use `SemaphoreSlim.WaitAsync`. Locking around `await` deadlocks.
- "`ConcurrentDictionary` is atomic" — its reads/writes are, but `GetOrAdd(key, factory)` can call `factory` multiple times under contention. Use `Lazy<T>` for side-effecting factories.
- "Cancellation is optional" — it's the difference between cancelling dead work in 10ms and burning a thread for 30 seconds. Production-grade code threads tokens everywhere.
- "Just `Task.Run` everything" — `Task.Run` on an already-async method is wasteful; on a CPU-bound method inside an async handler it can help, but only if the caller actually wants to offload.

**What follows from this topic**

Concurrency primitives recur everywhere. ASP.NET Core (Q72 `BackgroundService`, Q70 `HybridCache` stampede protection) builds directly on these patterns. Entity Framework Core (Q74 — `DbContext` not thread-safe) explains why `IDbContextFactory` exists in concurrent scenarios. Observability (Q93 — propagating trace context into a `Channel<T>` worker) requires you to understand `ExecutionContext` flow. Architecture Patterns (Q99 MassTransit, Q100f event sourcing) build whole systems on async messaging. If async semantics feel shaky, fix them first — every later topic assumes them.

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

### Summary

**What this topic covers**

The C# language has moved fast since C# 8 in 2019 — records, pattern matching, nullable reference types, required members, collection expressions, static abstract members, generic math, source generators, and now C# 14's extension everything. Three concern areas: (1) the **immutability + equality shift** — records (class and struct), `with`-expressions, value-equality semantics, required members and `init` setters; (2) the **expressive control flow** — pattern matching (property, positional, list, relational, type patterns), switch expressions, NRT flow analysis; (3) the **type-system frontier** — static abstract interface members, generic math via `INumber<T>`, source generators replacing reflection, C# 14's extension members ("extension everything"), `field` keyword, null-conditional assignment. The 8 questions in this section are how modern C# looks in 2026 — DTOs are `record` types, value objects are `readonly record struct`, validation is pattern matching on a switch expression, JSON serialisation is source-generated, and the compiler tracks nullability across the codebase. Knowing these features separates "I learned C# in 2018" from "I ship C# 14 daily".

**Mental model**

Modern C# has two design directions pulling in the same direction. (1) **Make immutable data ergonomic**: records collapse the boilerplate that made immutable DTOs miserable — auto-generated equality, `with`-expressions for non-destructive updates, deconstruction, `ToString` — and `readonly record struct` makes value objects (Money, OrderId, Coordinates) a one-liner. The 12-parameter constructor disappears under `required` + `init`. (2) **Push more validity into the compiler**: NRT turns "NullReferenceException at runtime" into a build error; static abstract members let `Sum<T>(IEnumerable<T>) where T : INumber<T>` work for `int`, `decimal`, `Money`, all without boxing; source generators replace reflection with compile-time-emitted code that's AOT-safe and 30-50% faster. Pattern matching ties these together: a switch expression on a discriminated union of records, with exhaustiveness analysis, replaces the visitor pattern in ~6 lines. The mental shift versus "Java with semicolons" is that C# 14 expects you to lean on the compiler for correctness — NRT, required, switch exhaustiveness, source generators — rather than tests and runtime checks.

**Key terms**

- **`record` (class)** — reference type with value-equality, `with`-expressions, auto-`ToString`; DTOs and immutable models.
- **`readonly record struct`** — immutable value type with value-equality; DDD value objects (<16 bytes).
- **`required` modifier** — must be set in the object initialiser; replaces 12-parameter constructors; plays well with NRT.
- **`init` setters** — settable only during initialisation; "immutable after construction".
- **Pattern matching** — property patterns (`{ Status: "active" }`), positional, list (`[1, _, .., var last]`), relational (`> 0 and < 100`), type combinators.
- **NRT** — `string` vs `string?`; flow analysis; `[NotNullWhen]`, `[MemberNotNull]`, `!` null-forgiving operator.
- **Collection expressions** — `[1, 2, 3]` target-typed; works for arrays, `List<T>`, `Span<T>`, `ImmutableArray<T>`; spread with `..`.
- **Static abstract members** — interface members implementers provide statically; enables `INumber<T>` generic math.
- **Source generators** — Roslyn analyzers emitting source at build; replace reflection for JSON, regex, logging, MVVM, mediators.
- **Extension everything (C# 14)** — `extension(Receiver) { … }` blocks declaring extension properties, static methods, operators.
- **`field` keyword (C# 14)** — auto-backing-field access inside getters/setters without declaring `_foo`.

**Why interviewers ask this**

Three signals. (1) **Currency** — Q34 ("what does C# 14 add?") and the C# 13 questions (`Lock`, `allows ref struct`, list patterns) directly test whether the candidate has read release notes since 2023. The .NET 10 / C# 14 cycle (Nov 2025) is fresh; senior interviews expect awareness. (2) **Modelling fluency** — Q29 (records) and Q30 (pattern matching) test whether the candidate uses these features to *model the domain*, not just to write fewer lines. `readonly record struct Money(decimal Amount, string Currency)` + a switch expression dispatching on `Result<T, E>` is the senior C# idiom; the junior idiom is a plain class with mutable getters and `if/else` chains. (3) **AOT readiness** — source generators (Q36) replace reflection, which is the precondition for Native AOT. Candidates who reflexively reach for `[JsonSerializable]` and `[LoggerMessage]` are already AOT-ready; candidates who reach for runtime reflection aren't.

**Common confusions**

- "Records are immutable" — `record class` allows mutable properties unless you mark them `init`. The immutability is *opt-in via syntax*, not automatic.
- "`record` is just a class with equality" — also `with`-expressions, auto-`ToString`, deconstruction, primary constructors. The bundle is the point.
- "NRT prevents null at runtime" — no, it's compile-time analysis. The runtime still allows `null` to slip through (reflection, `default`, library boundaries without annotations). Treat warnings as errors.
- "Pattern matching is just nicer `if`" — list patterns + exhaustiveness analysis enable whole-program correctness checks that `if` cannot.
- "Source generators are magic" — they're Roslyn analyzers emitting plain C# source at build time. You can read the emitted code; debugging is normal.
- "Extension everything replaces extension methods" — old `this`-parameter extension methods still work. C# 14's syntax is the new way for *new* code; existing extensions don't need rewriting.
- "Required is just `[Required]`" — `[Required]` is a runtime validation attribute; `required` is a compiler-enforced initialisation constraint. Different things, same word.

**What follows from this topic**

These features cascade everywhere. LINQ & Functional uses pattern matching and records for `Result<T, E>` style return types. Generics & Type System (Q42-45) builds on static abstract members and `allows ref struct`. Collections & Data Structures uses collection expressions ergonomically. Serialization (Q63) uses source generators for AOT-safe JSON. Architecture Patterns (Q100 DDD) maps value objects to `readonly record struct` directly. Native AOT & Trimming requires source generators throughout. If modern C# feels foreign, this section is the prerequisite for everything that follows.

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

### Summary

**What this topic covers**

LINQ is the query language at the heart of every .NET codebase — and a place where senior engineers separate themselves by knowing not just the syntax but the *semantics, performance, and translation rules*. Three concern areas: (1) the **execution model** — deferred vs immediate, `IEnumerable<T>` vs `IQueryable<T>`, expression trees, client vs server evaluation; (2) the **modern operator vocabulary** — `MaxBy`/`MinBy`, `DistinctBy` family, `Chunk`, `Index`, `CountBy`/`AggregateBy`, separating senior C# from junior; (3) the **performance reality post-.NET 9/10** — Stephen Toub's perf passes, internal `Span<T>` adoption, fast paths for arrays and `List<T>`, SIMD vectorisation. The 6 questions in this section cover what every LINQ-using engineer must know in 2026: when to `ToList`, why the EF query exploded into client-side evaluation, why .NET 10 makes "rewrite this LINQ as a `for` loop" obsolete for most cases. LINQ is also the bridge into expression trees — the foundation of EF Core, AutoMapper, FluentValidation, and any library that introspects lambdas.

**Mental model**

LINQ has two universes. (1) **LINQ to Objects** — extension methods on `IEnumerable<T>` that compile to plain delegate calls; `Where`/`Select` build a lazy pipeline; nothing executes until a terminal operator (`ToList`, `Count`, `First`, `foreach`). The whole thing is just in-process function composition. (2) **LINQ to Providers** (EF Core, Linq2DB, MongoDB driver) — methods on `IQueryable<T>` that build an **expression tree** the provider translates to its native query language (SQL, MQL, etc.). The provider sees `x => x.Status == "active"` not as a delegate but as an AST it can walk and rewrite. The bug magnet is the boundary: when the provider encounters something it can't translate (a custom helper method, an instance call on a non-mapped property), older EF silently fell back to **client evaluation** — pull the whole table into memory and run the rest in-process. EF Core 3.0+ throws by default. The other mental shift since .NET 9 is that **LINQ is no longer slow**. Toub's perf work added internal `Span<T>` paths, SIMD vectorisation, fast paths for `T[]` / `List<T>` sources, and short-circuits for empty enumerables. .NET 10 pushed it further — `AddRange`, `CopyTo`, `Contains` got 65%+ improvements. The 2020 reflex "rewrite this LINQ to `for`" is now usually wrong; measure first.

**Key terms**

- **Deferred execution** — lazy pipeline; nothing runs until a terminal operator pulls.
- **Immediate execution** — `ToList`, `ToArray`, `Count`, `First`, `Sum` — terminal operators.
- **`IEnumerable<T>` vs `IQueryable<T>`** — in-process delegates vs expression trees translated by a provider.
- **Expression trees** — `Expression<Func<T, bool>>`; AST of a lambda; visit, build, transform, compile; foundation of EF, Moq, AutoMapper.
- **Client vs server evaluation** — if the provider can't translate a node, it (historically) materialised the source and continued in-process; modern EF throws.
- **`MaxBy` / `MinBy`** — .NET 6+; no manual `OrderByDescending().First()`.
- **`DistinctBy` / `UnionBy` / `IntersectBy` / `ExceptBy`** — .NET 6+; set ops with a key selector.
- **`Chunk(size)`** — .NET 6+; batch into arrays; replaces `GroupBy(i => i / size)`.
- **`Index()`** — .NET 9+; yields `(index, value)` tuples.
- **`CountBy` / `AggregateBy`** — .NET 9+; group-and-aggregate without materialising groups.
- **.NET 9 LINQ perf** — internal `Span<T>` adoption, fast paths for arrays/`List<T>`, ~10× on common operators.

**Why interviewers ask this**

Three signals. (1) **Production debug skill** — Q37 (deferred execution biting a stateful source) and Q38 (LINQ-to-SQL falling back to in-process) are the two classic LINQ production bugs every senior engineer has shipped or hunted. Naming them shows real exposure. (2) **Modern operator awareness** — Q40 sorts candidates instantly: a junior reaches for `OrderByDescending().First()`, a senior reaches for `MaxBy`. The same senior knows .NET 9 added `CountBy`/`Index`/`AggregateBy`. (3) **Performance currency** — Q39 and Q41b test whether the candidate knows the BCL has been doing the perf work for them. The right 2026 answer to "should I rewrite this hot LINQ in `for`?" is "measure on .NET 10 first" — many former rewrites are no longer wins. Candidates who still default to "LINQ is slow" are running on 2018 mental models.

**Common confusions**

- "LINQ always allocates" — not in .NET 9/10. Many operators use internal `Span<T>` paths and short-circuit. Verify with `[MemoryDiagnoser]`.
- "Deferred and lazy are different" — they're the same here. Each `.Where`/`.Select` builds an iterator; terminal operators pull.
- "`IQueryable` and `IEnumerable` are interchangeable" — assigning `IQueryable` to `IEnumerable` *materialises the query* at that point (client evaluation begins). A subtle perf cliff.
- "Expression trees are just lambdas" — a lambda assigned to a delegate compiles to IL; assigned to `Expression<>` it compiles to an AST. The compiler chooses based on the target type.
- "EF client evaluation is fine for small tables" — fine until production has 50M rows and someone calls `.Where(x => MyHelper(x.Name))`. Throw-on-fallback is the safe default.
- "`Chunk` is the same as `GroupBy`" — `Chunk(size)` is much faster, doesn't allocate intermediate groups, and preserves order.
- "I should rewrite all LINQ as `for` loops" — measure first. On .NET 10 the rewrite often loses to BCL's vectorised path.

**What follows from this topic**

LINQ semantics flow into Entity Framework Core (Q74-80 — `IQueryable` translation, N+1, projections, `AsNoTracking`) where the rubber meets SQL. Expression trees underpin most metaprogramming libraries you'll touch (Q98 mediator alternatives like Mediator and Wolverine, Q100 DDD specifications). Pattern matching in switch expressions composes with LINQ in functional pipelines. If LINQ feels like opaque magic, you'll struggle with the EF section especially — fix LINQ first.

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

### Summary

**What this topic covers**

C# generics, unlike Java's type-erased generics, are **reified** — they exist at runtime, and the CLR generates specialised code per value-type instantiation. This section probes the consequences: how variance works, how constraints shape what you can do with a `T`, how generic specialisation differs between value types and reference types, and how reflection-heavy generics break under Native AOT. Three concern areas: (1) **variance** — `in` (contravariant input position), `out` (covariant output position), and the invariance default; (2) **constraints** — `where T : class/struct/unmanaged/notnull/new()/Enum/Delegate`, interface constraints, and C# 13's `allows ref struct` enabling generics over `Span<T>`; (3) **runtime mechanics** — per-value-type code generation vs the shared `__Canon` body for reference types, and the AOT compatibility story for reflection-based generic patterns. The 4 questions in this section are foundational — they don't show up as standalone interview topics often, but they underpin every senior conversation about LINQ, collections, performance, and AOT.

**Mental model**

Generics in C# are **a contract between you, the compiler, and the JIT**. (1) The **compiler** uses constraints to know what operations are legal on a `T` — without `where T : INumber<T>`, the compiler refuses `a + b`; with it, the addition compiles and works for `int`, `decimal`, `BigInteger`, your `Money` type. (2) The **CLR** specialises at JIT time. For value types — `List<int>`, `List<long>`, `List<Money>` — each gets its own JITted method body with the int/long/struct inlined; no boxing, full layout optimisation. For reference types, all instantiations share a single body (`__Canon`) because every reference is pointer-sized — the methods only manipulate references. This explains the perf characteristics: generic value types are fast but bloat code; generic reference types are slim but pay the indirection cost of pointer-equality checks. (3) **Variance** is the type-system permission slip for substituting subtypes. `IEnumerable<out T>` says `T` only appears in *output* position, so `IEnumerable<string>` is safely substitutable for `IEnumerable<object>` — the consumer reads, never writes. `Action<in T>` says `T` only appears in *input* position, so `Action<object>` is safely substitutable for `Action<string>` — the consumer writes, never reads back. Variance applies only to reference types; `IEnumerable<int>` is not `IEnumerable<object>` because boxing every int would change runtime semantics. The fourth mental shift: **AOT closes the world**. Reflection-driven generic patterns (`Activator.CreateInstance(typeof(T))`, runtime `MakeGenericType` calls) require annotations or break entirely.

**Key terms**

- **Reified generics** — type arguments exist at runtime; `typeof(T)` works; no Java-style erasure.
- **Covariance (`out`)** — output-only position; `IEnumerable<string>` → `IEnumerable<object>`.
- **Contravariance (`in`)** — input-only position; `Action<object>` → `Action<string>`.
- **Invariance** — default; `IList<T>` is invariant because `T` is in both input and output positions.
- **`where T : class`** — reference type constraint.
- **`where T : struct`** — value type constraint; non-nullable.
- **`where T : unmanaged`** — blittable value type; useful for P/Invoke generic helpers.
- **`where T : notnull`** — NRT-aware non-null constraint.
- **`where T : new()`** — has a public parameterless constructor.
- **`allows ref struct`** — C# 13+; generic can accept `Span<T>`, `ReadOnlySpan<T>`, other ref structs.
- **`__Canon`** — internal CLR token for the shared body of reference-type generic instantiations.
- **Static abstract members** — enable `INumber<T>`-style generic math without runtime dispatch overhead.

**Why interviewers ask this**

Three signals. (1) **Type-system fluency** — Q42 (variance) is a tradition in C# interviews; the right answer ("`out` is covariant for output position, `in` is contravariant for input position, invariant when both") is fast and confident, the wrong answer is hand-wavy. (2) **Performance reasoning** — Q44 (per-value-type specialisation) sorts candidates who understand *why* `List<int>` is fast from candidates who just know it is. The "code bloat in AOT" implication is the senior follow-up. (3) **AOT readiness** — Q45 ties this section to Native AOT & Trimming. A candidate who automatically reaches for `[DynamicallyAccessedMembers]` when generics meet reflection has worked through the AOT transition; a candidate who's never seen a trim warning hasn't. (4) Bonus signal: Q43's `allows ref struct` shows whether the candidate has read C# 13 release notes — generic algorithms over `Span<T>` is a recent capability with real implications.

**Common confusions**

- "Variance applies to all generics" — only to interfaces and delegates, and only on reference types in the relevant position. `List<T>` is not covariant for safety.
- "`IEnumerable<int>` is `IEnumerable<object>`" — no. Covariance only works for reference types; boxing each int would be a runtime semantic change.
- "Generics are like templates" — C++ templates expand at compile time per use; C# generics specialise at JIT time per value type but share code for reference types. Different model.
- "Type erasure" — that's Java. C# has reified generics; `typeof(T)` works at runtime.
- "`where T : struct` allows nullable" — it doesn't. `where T : struct` excludes nullable value types; use `where T : struct?` (rare) or design around it.
- "Reflection-based factories work under AOT" — only if you annotate with `[DynamicallyAccessedMembers]` to tell the trimmer to keep the constructor. Otherwise the type's members get trimmed and the factory throws at runtime.
- "`allows ref struct` is a niche feature" — it unblocks generic algorithms over `Span<T>` (e.g. `Sort<T>(Span<T> data) where T : IComparable<T>, allows ref struct`), which previously forced you to write non-generic overloads.

**What follows from this topic**

Generics underpin Collections & Data Structures (Q46-50 — `Dictionary<TKey, TValue>`, `FrozenDictionary`, `ImmutableArray<T>`), LINQ (every operator is generic), Concurrency (`Task<T>`, `ValueTask<T>`, `Channel<T>`), and Modern Language Features (`INumber<T>` generic math). Native AOT & Trimming (Q101-103) builds directly on the reflection-vs-generics interplay here. If variance and constraints feel hand-wavy, expect senior interviews to keep probing — they're load-bearing for most of the rest of the conversation.

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

### Summary

**What this topic covers**

The data structures every .NET engineer uses daily, and the specialised ones that separate seniors from juniors. Three concern areas: (1) the **workhorses and how they work** — `Dictionary<TKey, TValue>` internals (open addressing with chaining, Marvin hash for string keys, load factor 1.0 doubling), and the `CollectionsMarshal` accessors that let you avoid double-lookups; (2) the **read-optimised specialists** — `FrozenDictionary` / `FrozenSet` (perfect-hash-internal layouts, expensive build, fastest reads), `ImmutableArray<T>` (O(1) read, O(n) "mutate") vs `ImmutableList<T>` (AVL tree, structural sharing, O(log n) versioned mutations); (3) the **niche tools** — `PriorityQueue<TElement, TPriority>` (.NET 6+ min-heap with no priority-update support), `ConcurrentBag<T>` (thread-affine and surprisingly slow cross-thread). The 5 questions in this section probe whether the candidate has *read* the BCL and *measured* alternatives, not just defaulted to `Dictionary` and `List` for everything. Modern .NET added a meaningful collection vocabulary post-.NET 6 — knowing it is a senior signal.

**Mental model**

Pick a collection by access pattern, not by familiarity. (1) **Mutable, growing, random-access by key** — `Dictionary<TKey, TValue>`. Internally an array of buckets prime-sized for hash distribution; each bucket chains entries storing `(hashCode, key, value, next)`. Strings hash via Marvin (since .NET Core 2.1) to prevent hash-flood attacks. Grow at load factor 1.0, doubling capacity. The senior trick: `CollectionsMarshal.GetValueRefOrAddDefault` gives you a `ref` to the slot in one lookup — replaces "TryGetValue then Add". (2) **Read-only after build, accessed millions of times** — `FrozenDictionary` / `FrozenSet`. The `.ToFrozenDictionary()` call is slow (it picks an optimal internal layout — perfect hash for small key sets, integer-keyed specialisations), but reads are the fastest in .NET. Config tables, lookup tables, route maps loaded at startup. (3) **Immutable with versioning** — `ImmutableArray<T>` for small collections you read often (thin wrapper around `T[]`, O(1) reads, O(n) on "modify"), `ImmutableList<T>` for large collections with frequent versioning (AVL tree with structural sharing — the new list shares most of its tree with the old, O(log n) for both reads and "mutations"). (4) **Niche** — `PriorityQueue` for Dijkstra and scheduled events (no priority-update; workaround is the "stale entry" pattern). `ConcurrentBag` only when producers consume what they pushed on the same thread.

**Key terms**

- **`Dictionary<TKey, TValue>`** — open addressing with chaining; Marvin hash for strings; load factor 1.0; doubling growth.
- **`CollectionsMarshal.GetValueRefOrAddDefault`** — single-lookup upsert returning `ref`; replaces TryGetValue+Add.
- **`CollectionsMarshal.AsSpan(list)`** — view a `List<T>`'s backing array as `Span<T>` for zero-allocation iteration.
- **`FrozenDictionary` / `FrozenSet`** — .NET 8+; read-only; expensive build, fastest reads; for startup-built lookup tables.
- **`ImmutableArray<T>`** — thin readonly array wrapper; O(1) reads, O(n) versioned mutations.
- **`ImmutableList<T>`** — AVL tree with structural sharing; O(log n) reads and versioned mutations; large collections with many versions.
- **`PriorityQueue<TElement, TPriority>`** — .NET 6+ min-heap; no `Update`/`Remove`; workaround via stale-entry pattern.
- **`ConcurrentBag<T>`** — thread-affine local stacks; fast same-thread, slow cross-thread; niche tool.
- **`ConcurrentQueue<T>`** — lock-free FIFO; general-purpose producer/consumer when ordered.
- **`ConcurrentDictionary<TKey, TValue>`** — lock striping for parallel updates; `GetOrAdd` is not atomic at the factory level.
- **Marvin hash** — randomized string hash; mitigates algorithmic-complexity attacks where malicious keys cause O(n) chains.

**Why interviewers ask this**

Three signals. (1) **BCL fluency** — Q47 (`FrozenDictionary`) and Q49 (`PriorityQueue` quirks) test whether the candidate has actually read about post-.NET 6 collection additions. The senior tell is reaching for `FrozenDictionary` when describing a startup-loaded lookup table without prompting. (2) **Internals understanding** — Q46 (Dictionary internals) probes whether the candidate can reason about hash collisions, the difference between hash-flood mitigation and a deterministic hash, and why `GetValueRefOrAddDefault` is faster than the naive two-call pattern. (3) **Avoiding the obvious wrong defaults** — Q50 (`ConcurrentBag`) is a trap question; junior candidates reach for it because the name sounds right, senior candidates know it's thread-affine and reach for `ConcurrentQueue` or `Channel<T>` instead. (4) **Tradeoff vocabulary** — Q48 (`ImmutableList` vs `ImmutableArray`) tests whether the candidate can pick based on read/write profile rather than name similarity.

**Common confusions**

- "`ConcurrentBag` is the obvious choice for thread-safe collections" — it's thread-affine. Use `ConcurrentQueue<T>` or `Channel<T>` for general producer/consumer.
- "`ImmutableArray` and `ImmutableList` are interchangeable" — completely different internals; pick by read/versioning profile.
- "`FrozenDictionary` is always faster" — only after construction. Building it is slower than a regular `Dictionary`. Use only when the build cost amortises.
- "Dictionary is O(1) always" — amortised, with a good hash. Pathological key sets without Marvin would degrade to O(n) chains; Marvin prevents adversarial inputs.
- "`PriorityQueue` supports priority updates" — it doesn't. Implementations need the stale-entry pattern or a custom heap with decrease-key.
- "Use `ImmutableList` for thread safety" — it gives you snapshot-immutability, not concurrent updates. For shared mutable state, you want `ConcurrentDictionary` or `Channel<T>`.
- "`List<T>` iteration is allocation-free" — `foreach` on a `List<T>` allocates a struct enumerator (not heap) but `CollectionsMarshal.AsSpan(list)` + `for` is cleaner on a hot path.

**What follows from this topic**

Collections sit under almost every later topic. EF Core (Q76 — N+1, projections, `AsSplitQuery`) ultimately materialises into collections. ASP.NET Core uses `FrozenDictionary` internally for route tables. Concurrency (Q23 — Channels) is the modern replacement for several `Concurrent*` collections. Performance-sensitive code (Q17 — avoid allocations on hot paths) reaches for `CollectionsMarshal.AsSpan` and `FrozenDictionary` as core moves. If you default to `List` and `Dictionary` for everything, expect senior interviewers to ask why you didn't reach for the specialised tool.

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

### Summary

**What this topic covers**

String handling is where well-meaning code meets the messy reality of Unicode, locale, performance, and security. Four concern areas in this short section: (1) **culture and comparison** — why `StringComparison` is non-optional; the Turkish-i trap; ordinal vs culture-aware semantics; (2) **regex modernisation** — source-generated regex via `[GeneratedRegex]` replacing runtime-compiled `Regex(..., RegexOptions.Compiled)`, with AOT and cold-path advantages; (3) **JSON migration** — `System.Text.Json` vs Newtonsoft.Json semantic differences (case sensitivity, polymorphism, dictionary keys, missing-member handling), source-generated mode; (4) **Unicode literacy** — `Rune` for code points, `StringInfo` for grapheme clusters, why `string.Length` lies about emoji and combining characters. The 4 questions in this section are small but high-signal — they catch candidates who copy-paste `Regex` calls without considering AOT, who never thought about Turkish locale, who think `"👨‍👩‍👧".Length` is 1.

**Mental model**

Strings in C# are **UTF-16 sequences of `char` (16-bit code units)**, not characters. Three layers of "character" abstraction matter. (1) **`char`** — a single UTF-16 code unit. Iterating `string` with `foreach` yields `char`s, which means surrogate-pair characters (anything in the astral planes — most emoji) are *split* into two `char`s. (2) **`Rune`** — a Unicode scalar value (a code point). `string.EnumerateRunes()` yields proper code points, handling surrogate pairs. (3) **Grapheme cluster** — a user-perceived character, which may consist of multiple code points (emoji with skin tone modifier, combining accents, ZWJ-joined family emoji). `StringInfo.GetTextElementEnumerator` yields graphemes. `"👨‍👩‍👧".Length == 8` because it's 8 UTF-16 code units; the rune count is 5; the grapheme count is 1. Knowing which abstraction your code needs is the senior signal. The second mental shift is **always specify `StringComparison`**. The default `string.Equals`/`Contains`/`StartsWith` (without overload) uses `CurrentCulture` — a Turkish locale will treat `"i".Equals("I", StringComparison.CurrentCulture)` as **false** because Turkish has dotted and dotless i's as separate letters. Locale-dependent bugs are the worst kind: green on developer machines, fail on user devices. The CA1310 analyzer flags missing comparisons — enable it as an error. The third mental shift is **regex is a build-time concern in modern C#** — `[GeneratedRegex(...)]` produces a `partial` method with the matching code emitted at compile time, AOT-compatible, faster cold start than `RegexOptions.Compiled`.

**Key terms**

- **`StringComparison.Ordinal`** — byte-exact comparison; fastest; no locale awareness.
- **`StringComparison.OrdinalIgnoreCase`** — byte-exact, case-folded via Unicode tables; safe and fast for code-internal comparisons.
- **`StringComparison.CurrentCulture` / `InvariantCulture`** — locale-aware sort order; for user-facing comparisons (display sort).
- **Turkish-i trap** — `"i".Equals("I", CurrentCulture)` is false in Turkish locale.
- **CA1310** — analyzer flagging missing `StringComparison`; enable as error.
- **`[GeneratedRegex("...")]`** — .NET 7+; source-generated regex; AOT-compatible; faster cold path.
- **`RegexOptions.Compiled`** — runtime IL emit; faster than interpreted but not AOT-compatible.
- **`System.Text.Json`** — case-sensitive default, AOT-friendly, source-gen mode via `[JsonSerializable]`; standard since .NET Core 3.
- **`JsonUnmappedMemberHandling`** — STJ equivalent of Newtonsoft's `MissingMemberHandling`.
- **`Rune`** — Unicode scalar value (code point); `string.EnumerateRunes()` handles surrogate pairs.
- **`StringInfo.GetTextElementEnumerator`** — grapheme cluster iteration; for user-perceived character counts.
- **UTF-16 code unit vs code point vs grapheme** — three layers; `string.Length` is code units, not characters.

**Why interviewers ask this**

Three signals. (1) **Defensive coding** — Q51 (`StringComparison`) tests whether the candidate's reflex on every comparison is "which `StringComparison` is right here?" Junior candidates write `s.Contains("foo")`; senior candidates write `s.Contains("foo", StringComparison.OrdinalIgnoreCase)`. The CA1310 mention is a bonus senior signal. (2) **AOT awareness** — Q52 (source-gen regex) ties into the broader source-generator story. A candidate who reaches for `[GeneratedRegex]` without prompting has internalised the "no runtime IL emit" rule for AOT. (3) **Migration scars** — Q53 (System.Text.Json vs Newtonsoft) probes whether the candidate has actually done a real migration. The right answer lists the *semantic differences* — case sensitivity, polymorphism opt-in, dictionary key restrictions — not just "STJ is faster". (4) **Unicode literacy** — Q54 (`Rune` and grapheme clusters) is a senior filter; it catches candidates who've never thought about emoji and combining marks, which matters the moment your product ships internationally.

**Common confusions**

- "Default `string.Equals` is ordinal" — no, it's `CurrentCulture` without an overload. The trap question.
- "`string.Length` is the character count" — it's UTF-16 code unit count. Emoji and astral characters count as 2.
- "`RegexOptions.Compiled` is the fastest" — only after JIT warmup, and not AOT-compatible. `[GeneratedRegex]` wins on cold start and AOT.
- "`System.Text.Json` is a drop-in for Newtonsoft" — it isn't. Case sensitivity, polymorphism, comments, dictionary keys, missing members all differ.
- "`Rune` is just `char`" — `char` is 16 bits (one UTF-16 code unit); `Rune` is a code point (up to 21 bits) that handles surrogate pairs.
- "Grapheme clusters are the same as code points" — no. `"👨‍👩‍👧"` is one grapheme but 5 code points and 8 UTF-16 code units.
- "Use `string.IndexOf` for substring search" — fine, but pass `StringComparison.Ordinal` (or `OrdinalIgnoreCase`) explicitly. The implicit overload is a locale trap.

**What follows from this topic**

String handling shows up everywhere downstream. Serialization (Q62-64) builds on the System.Text.Json migration story. ASP.NET Core (Q73d — built-in OpenAPI) relies on STJ defaults. Security (Q96 — common mistakes) calls out string interpolation in raw SQL and Razor as XSS/SQLi vectors. Performance topics (Q17 — `string.Create`, interpolated string handlers) extend the string-allocation discussion. Internationalisation work — currency formatting, sort order, search — depends on understanding the three layers of "character".

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

### Summary

**What this topic covers**

Exception handling in C# is straightforward at the surface — `try`/`catch`/`finally` — and surprisingly nuanced underneath. Three concern areas in this short section: (1) **exception filters** — `catch (Exception ex) when (predicate)` running in the first pass before stack unwinding, with logging and selective-catch use cases; (2) **the perf cost of throw/catch** — why exceptions used to be 10-100× slower than function returns, what .NET 9's overhaul changed (Native AOT alignment, ~50% faster throw/catch), and why "don't use exceptions for control flow" remains the rule; (3) **`ExceptionDispatchInfo`** — capturing and rethrowing exceptions across thread/frame boundaries without losing the original stack trace, and why async/await uses it internally. The 3 questions in this section are tight but cover the senior interview territory: knowing exception filters exist (not standard library code), knowing the .NET 9 perf delta (currency check), and knowing that `throw ex;` is the wrong rethrow pattern.

**Mental model**

Exceptions in .NET are **structured exception handling on top of a two-pass model**. (1) **First pass**: when an exception is thrown, the runtime walks the stack looking for a matching `catch`. **Exception filters** (`when (condition)`) run during this pass — *before* the stack unwinds. If a filter returns false, the search continues up the call stack as if the catch wasn't there. This means a filter can inspect the exception, log it, and decline to catch — keeping the original stack trace intact. (2) **Second pass**: the runtime unwinds the stack to the chosen handler, running `finally` blocks along the way. The perf cost lives in the first pass — walking frames, resolving PDB metadata for the stack trace, crossing managed/native boundaries. .NET 9 aligned the exception model with Native AOT and removed legacy overhead, roughly halving throw/catch cost. But "don't use exceptions for control flow" is still the rule — even at half the cost, exceptions are dramatically slower than a `Result<T, E>` return. The third mental shift is **`throw;` vs `throw ex;`**. `throw;` rethrows the current exception preserving its stack; `throw ex;` is treated as a new throw and overwrites the stack trace at the rethrow site, losing diagnostic information. For cross-thread/cross-frame rethrows, `ExceptionDispatchInfo.Capture(ex).Throw()` is the correct pattern — it preserves the original stack across the boundary. This is exactly what `async/await` does internally: when an awaited task fails, the awaiter sees the *original* exception with the *original* stack, not a new exception originating from the await machinery.

**Key terms**

- **Exception filter** — `catch (Exception ex) when (predicate)`; runs in the first pass, before stack unwinding; if false, search continues.
- **First-pass vs second-pass** — first pass finds the handler; second pass unwinds the stack to it, running `finally` blocks.
- **Stack trace capture** — happens on throw; walks frames and resolves PDB metadata; the main perf cost.
- **`throw;`** — rethrow preserving the stack trace.
- **`throw ex;`** — treated as a new throw, *overwrites* the stack trace at the rethrow point. Anti-pattern.
- **`ExceptionDispatchInfo.Capture(ex)`** — snapshot the exception's state; `.Throw()` rethrows preserving the original stack across thread/frame boundaries.
- **`.NET 9 exception perf`** — alignment with Native AOT model; ~50% faster throw/catch.
- **`Result<T, E>` pattern** — OneOf, ErrorOr, FluentResults; expected-failure return types; alternative when exceptions are too expensive.
- **`AggregateException`** — wraps multiple inner exceptions; produced by `Task.WhenAll` and parallel APIs.
- **`AppDomain.UnhandledException` / `TaskScheduler.UnobservedTaskException`** — last-resort hooks for unhandled exception logging.

**Why interviewers ask this**

Three signals. (1) **Exception filters as a senior signal** — Q55 catches whether the candidate has read C# 6 release notes (filters were added in C# 6, 2015). The "log everything matching a predicate without actually handling" pattern is a senior diagnostic trick — `catch (Exception ex) when (LogAndReturn(ex, false))` lets you observe exceptions in flight without changing their propagation. (2) **Currency check** — Q56 (.NET 9 throw/catch improvement) is a recency probe. Candidates who know about the .NET 9 perf delta have read Toub's posts or release notes; candidates who say "exceptions are always 100× slower" are running on old mental models. The senior answer ends with "but `Result<T, E>` is still the right pattern when failure is expected, not exceptional." (3) **`ExceptionDispatchInfo` as a thread-bridging tool** — Q57 sorts candidates who've written async infrastructure code from candidates who've only consumed it. The connection to async/await internals ("this is what the await machinery uses") is the senior follow-up. (4) Bonus signal: the candidate's reflex on rethrow — `throw;` vs `throw ex;` — separates engineers who care about stack traces from engineers who copy-paste without thinking.

**Common confusions**

- "`throw ex;` and `throw;` are equivalent" — they're not. `throw ex;` overwrites the stack; `throw;` preserves it. Always use `throw;` for rethrow.
- "Exception filters are just `if` inside catch" — an `if` inside catch runs *after* the stack has unwound; a filter runs *before*, so declining a filter keeps the original frame on the stack.
- "Exceptions are always 100× slower than normal returns" — pre-.NET 9, yes. Post-.NET 9, roughly 50× and improving. Still don't use them for control flow.
- "Catching `Exception` is fine" — fine for top-level handlers (logging, returning a 500); harmful inside library code (swallows everything, makes debugging impossible).
- "`AggregateException` is what `Task.WhenAll` rethrows" — `await Task.WhenAll(tasks)` rethrows only the *first* exception; access `.Exception` on the returned task for the full `AggregateException`.
- "Finally always runs" — almost always. Process-level termination (`Environment.FailFast`, stack overflow, OOM in some scenarios) can skip `finally`. Don't put critical cleanup *only* in `finally`.
- "Filters can have side effects" — they can, but they run in the first pass *before* the unwind. Side effects in filters are tricky: they may run during exception search for handlers higher up the stack.

**What follows from this topic**

Exception handling threads through every other topic. Concurrency (Q24, Q28c — `Task.WhenAll` and partial failure) builds on `AggregateException` semantics. Observability (Q89-93 — structured logging) requires capturing exceptions in a way that preserves their context. ASP.NET Core (Q73 — Problem Details) is the standardised way to translate exceptions to HTTP responses. Resilience (Q61 — Polly retries) needs to know which exceptions are retriable. If exception semantics feel hand-wavy — especially the rethrow pattern — fix this section first.

### Q55. What's an exception filter and when do you use it?

`catch (Exception ex) when (someCondition)` — the filter expression runs in the **first pass** of exception handling, *before* the stack unwinds. If it returns false, the catch is skipped and the search continues up the call stack. Use case: log everything matching a predicate without actually handling: `catch (Exception ex) when (LogAndReturn(ex, false))`. Also useful for "catch only ExceptionType when SubProperty matches" without the overhead of catching, rethrowing, and losing the original stack.

### Q56. Why is exception throw/catch slow, and what changed in .NET 9?

Pre-.NET 9: throwing an exception captures the stack trace (expensive — walks frames, resolves PDB metadata), marshals across managed/native boundaries, runs handlers searching for a matching catch. Often 10-100× slower than a regular function return. .NET 9 aligned the exception model with Native AOT, removing some legacy overhead — **roughly 50% faster** throw/catch. Still: don't use exceptions for control flow. The `Result<T, E>` pattern (OneOf, ErrorOr, FluentResults) is the alternative when exceptions are too expensive.

### Q57. `ExceptionDispatchInfo` — what does it solve?

When you catch an exception on one thread and want to rethrow it on another (or after the original frame is gone), `throw ex;` loses the original stack trace. `ExceptionDispatchInfo.Capture(ex)` snapshots the original stack; `.Throw()` rethrows preserving everything. Used internally by `async`/`await` — when an awaited task threw, the framework captures + throws to give you the original exception state on the awaiter's frame. You'll need it manually only in custom thread-bridging code.

---

## I/O, Streams & Networking

### Summary

**What this topic covers**

Modern .NET I/O is built around three primitives — `Stream`, `System.IO.Pipelines`, and `HttpClient` — plus a resilience layer (Polly) for handling failure. Four concern areas: (1) **HTTP client lifecycle** — why `new HttpClient()` per request leaks sockets, why a static singleton leaks DNS, why `IHttpClientFactory` (and typed clients) is the right answer; (2) **high-throughput stream processing** — `System.IO.Pipelines` as zero-copy backpressure-aware buffer, contrasted with `Stream` for parsing-heavy workloads; (3) **async file I/O** — `FileOptions.Asynchronous` (without it, "async" reads block a thread-pool thread), `RandomAccess` for hot-loop scatter/gather; (4) **resilience patterns** — Polly v8 resilience pipelines, `Microsoft.Extensions.Resilience`, and the senior knowledge of *when not to retry*. The 4 questions in this section are foundational for any networked .NET service in production — the wrong `HttpClient` lifecycle has caused more outages than almost any other anti-pattern.

**Mental model**

Three patterns frame this section. (1) **Connection pool ownership**: every `HttpClient` instance owns a `SocketsHttpHandler` and its connection pool. Creating one per request leaks sockets into TIME_WAIT (4 minutes on most kernels), and a high-throughput service exhausts ephemeral ports — the canonical "1 hour of healthy traffic, then 500s start" outage. A single static `HttpClient` for the app lifetime fixes the leak but caches DNS forever — stale records persist after DNS changes (failover, blue/green deploys). `IHttpClientFactory` solves both by rotating the underlying `HttpMessageHandler` periodically (default 2 minutes via `SetHandlerLifetime`), pooling handlers across requests, and integrating with DI. Typed clients (`services.AddHttpClient<MyApi>()`) give you a class with `HttpClient` injected and DI-managed lifetime. (2) **Zero-copy pipelines**: `System.IO.Pipelines` is Kestrel's internal buffer abstraction made public. Producer writes into a `Memory<byte>` provided by the pipe; consumer reads `ReadOnlySequence<byte>` (possibly non-contiguous), consumes a portion, advances. The pipe manages buffer allocation, slicing, and recycling. Beats `Stream` for parsing — you don't allocate per-read buffers, you don't copy between layers, you slice and parse in-place. (3) **Async file I/O is opt-in**: without `useAsync: true` or `FileOptions.Asynchronous`, "async" file reads block a thread-pool thread on the synchronous kernel call. The flag is non-negotiable for high-throughput file processing. (4) **Retries are dangerous when wrong**: Polly v8 makes retries, circuit breakers, timeouts, bulkheads, and fallbacks declarative. The senior discipline is *not* "retry everything" — never retry non-idempotent POSTs, never retry 4xx client errors, never retry into a downstream that's already overloaded (retry storm = cascading failure).

**Key terms**

- **`HttpClient`** — owns a connection pool via `SocketsHttpHandler`; creating per request leaks sockets.
- **`SocketsHttpHandler`** — the modern HTTP message handler; replaces legacy `HttpClientHandler`; rich configuration.
- **`IHttpClientFactory`** — rotates handlers, pools across requests, DI-integrated; the right `HttpClient` lifecycle.
- **Typed clients** — `services.AddHttpClient<MyApi>()`; class with `HttpClient` injected and lifetime managed.
- **`SetHandlerLifetime`** — default 2 minutes; how often the factory rotates handlers to refresh DNS.
- **`System.IO.Pipelines`** — `Pipe` / `PipeReader` / `PipeWriter`; zero-copy backpressure-aware buffer; foundation of Kestrel and SignalR.
- **`ReadOnlySequence<byte>`** — possibly non-contiguous read view; the pipeline read primitive.
- **`FileOptions.Asynchronous`** — opt-in async file I/O; without it, "async" file reads block a thread-pool thread.
- **`RandomAccess`** — .NET 6+; static scatter/gather file helpers on `SafeFileHandle`; no `FileStream` construction.
- **Polly v8 resilience pipelines** — declarative `.AddRetry/.AddCircuitBreaker/.AddTimeout/.AddBulkhead/.AddFallback`.
- **`Microsoft.Extensions.Resilience`** — Polly v8 + MEC integration; wraps `IHttpClientFactory` cleanly.
- **Retry storm** — naive retries amplifying downstream load during partial failure; cascading failure pattern.

**Why interviewers ask this**

Three signals. (1) **Production scars** — Q58 (`HttpClient` lifecycle) is the single most common .NET production outage. A candidate who can explain both failure modes (per-request socket leak, singleton DNS cache) and the `IHttpClientFactory` fix without prompting has either shipped a service at scale or read the right blog post. The "typed clients" follow-up is the senior signal. (2) **Performance ceiling** — Q59 (`Pipelines`) sorts candidates who've written high-throughput parsing code from candidates who've only used `StreamReader`. The right context is "Kestrel uses it internally" — Pipelines isn't exotic, it's the modern primitive. (3) **Resilience maturity** — Q61 (Polly v8) tests whether the candidate has built circuit breakers in anger. The crucial follow-up is *when not to retry* — non-idempotent POSTs, 4xx errors, downstreams already overloaded. Candidates who say "always retry 3 times" haven't been on call during a retry storm. (4) Bonus: Q60 (async file I/O) catches candidates who don't know `useAsync: true` is the magic flag.

**Common confusions**

- "One static `HttpClient` is the right pattern" — only if you accept stale DNS. `IHttpClientFactory` is the right answer.
- "`IHttpClientFactory` creates a new `HttpClient` per request" — it pools handlers; the `HttpClient` is cheap, the handler is what matters.
- "`Stream` and `PipeReader` are interchangeable" — different models. `Stream` is sequential bytes; `PipeReader` is buffered, zero-copy, backpressure-aware.
- "Async file I/O is automatic" — only with `FileOptions.Asynchronous` or `useAsync: true`. Without the flag, "async" reads block a pool thread.
- "Retry everything 3 times" — never retry non-idempotent POSTs, 4xx client errors, or downstreams already overloaded. Retry storms are real.
- "Circuit breakers are optional" — for any service with downstream dependencies, they're the difference between graceful degradation and cascading failure.
- "`HttpClient.SendAsync` is thread-safe" — yes, but configuration (headers, base address) isn't. Use typed clients to avoid cross-thread config races.

**What follows from this topic**

I/O patterns underpin almost every networked topic. ASP.NET Core (Q65 middleware pipeline, Q70 `HybridCache`) builds on the same primitives. Observability (Q91 — propagating trace context across HTTP boundaries) requires understanding the `HttpClient` instrumentation flow. Security (Q97b — JWT token revocation) interacts with the resilience layer (cache lookups on every request). Performance (Q18 — parse 1 GB of UTF-8 zero-allocation) is essentially "use Pipelines correctly". If `IHttpClientFactory` and the right async file I/O setup aren't reflexes, expect senior interviewers to keep probing.

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

### Summary

**What this topic covers**

JSON serialisation is the universal API contract format, and in .NET 2026 it lives in `System.Text.Json`. Three concern areas in this short section: (1) **polymorphism** — how `System.Text.Json` handles inheritance hierarchies via `[JsonDerivedType]` and discriminator properties, replacing Newtonsoft's vulnerability-prone `TypeNameHandling`; (2) **source-generated JSON** — `[JsonSerializable]` partial contexts producing compile-time serialisers, AOT-compatible, 30-50% faster, mandatory for Native AOT; (3) **the `BinaryFormatter` removal** — why .NET 9 removed it entirely (years of deserialisation gadget vulnerabilities), what to migrate to (`System.Text.Json` for text, MessagePack for compact binary). The 3 questions in this section are short because the modern answer is consistent: `System.Text.Json` with source generators for almost everything, MessagePack when you need compact binary, and *never* `BinaryFormatter` again.

**Mental model**

Two design pressures shape modern .NET serialisation. (1) **Performance + AOT** — runtime reflection over types is slow (it walks the type graph, resolves properties, allocates) and incompatible with Native AOT (the trimmer removes "unused" type information). The source-generator path solves both: at build time, you annotate a partial class with `[JsonSerializable(typeof(MyDto))]`, and the generator emits dedicated `JsonTypeInfo<MyDto>` with hard-coded property access, hard-coded converters, and no reflection. Wire it via `JsonSerializerOptions.TypeInfoResolver = MyJsonContext.Default;`. Wins: 30-50% faster, smaller binary, AOT-compatible, compile-time validation of the type graph. (2) **Security** — Newtonsoft's `TypeNameHandling` (auto-emit `$type` discriminators for arbitrary types) was the vector for many deserialisation gadget chains: an attacker crafts a payload that, when deserialised, instantiates a chain of `IDeserializationCallback` handlers executing arbitrary code. `BinaryFormatter` had the same problem in worse form — its design *requires* type instantiation by name during deserialisation, which made it impossible to fix without abandoning the format. Microsoft tried hardening it, deprecated it, and finally **removed it entirely in .NET 9**. `System.Text.Json` polymorphism takes the opposite approach: you must enumerate the closed set of derived types with `[JsonDerivedType(typeof(Dog), "dog")]`, and the discriminator is a property name you control. An attacker can't trick the deserialiser into instantiating an arbitrary type because the deserialiser only knows the types you declared. The senior mental model: **serialisation is an attack surface**; closed-world by default, source-gen for perf and AOT, never trust arbitrary type names from the wire.

**Key terms**

- **`System.Text.Json` (STJ)** — the modern JSON serialiser; case-sensitive default, strict, AOT-friendly.
- **`[JsonSerializable(typeof(T))]`** — declares a type for source generation; sits on a partial `JsonSerializerContext`.
- **`JsonSerializerContext`** — the source-generated context; pass via `JsonSerializerOptions.TypeInfoResolver`.
- **`[JsonDerivedType(typeof(Sub), "discriminator")]`** — polymorphism declaration on the base type.
- **`[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]`** — configure the discriminator property name.
- **`JsonUnmappedMemberHandling`** — STJ's equivalent of Newtonsoft's `MissingMemberHandling`.
- **`BinaryFormatter`** — legacy `IFormatter` for binary serialisation; removed in .NET 9 due to deserialisation gadgets.
- **Deserialisation gadget** — attack pattern where deserialising untrusted input instantiates a chain of objects whose constructors/callbacks execute arbitrary code.
- **`TypeNameHandling`** — Newtonsoft setting auto-emitting `$type`; security hole, do not enable.
- **MessagePack / MemoryPack** — compact binary alternatives; AOT-friendly, schema-evolution support.
- **Source-generated converter** — emitted at build time, hard-coded property access, no runtime reflection.

**Why interviewers ask this**

Three signals. (1) **Migration competence** — Q62 (polymorphism) and Q63 (source-gen) test whether the candidate has actually migrated from Newtonsoft to STJ. The right answer covers the *semantic gaps*: case sensitivity, `TypeNameHandling` → `[JsonDerivedType]`, `MissingMemberHandling` → `JsonUnmappedMemberHandling`, polymorphic deserialisation is opt-in and closed-set. (2) **Security literacy** — Q64 (`BinaryFormatter` removal) is a senior security question disguised as a serialisation question. The candidate who can explain *why* it was removed (gadget chains), what it implies for any "legacy binary serialiser" patterns elsewhere, and the modern alternatives (`System.Text.Json` for text, MessagePack/MemoryPack for binary), is operating at a senior level. The wrong answer is "they just wanted to clean up the framework." (3) **AOT readiness** — Q63 (source-gen JSON) ties into the broader source-generator story. A candidate who reaches for `[JsonSerializable]` reflexively, without prompting, has internalised the no-runtime-reflection rule for AOT. (4) Bonus signal: knowing that `System.Text.Json` polymorphism still doesn't handle *arbitrary open* type sets — you must enumerate derived types — separates candidates who've tried it from candidates who've only read about it.

**Common confusions**

- "STJ is a drop-in for Newtonsoft" — it isn't. Case-sensitive default, comments off by default, polymorphism opt-in, no `DataContract` attributes, stricter null handling.
- "Source-gen JSON is optional" — for AOT it's mandatory. For non-AOT it's optional but recommended for any high-throughput endpoint.
- "Polymorphic deserialisation just works" — only with explicit `[JsonDerivedType]` declarations. STJ does not auto-resolve arbitrary type names — that's the security win.
- "MessagePack is faster than STJ for everything" — for compact binary payloads yes; for JSON-over-HTTP no (your client probably wants JSON anyway).
- "BinaryFormatter is fine for trusted internal data" — Microsoft disagrees enough to remove it. Even "trusted" sources get compromised; the format has no defence in depth.
- "STJ doesn't support dictionary keys other than string" — fixed in .NET 7+. `Dictionary<int, T>` and other primitive keys now serialise.
- "Source generators slow down builds" — incremental generators (`IIncrementalGenerator`) cache aggressively; rebuild impact is usually negligible.

**What follows from this topic**

Serialisation feeds ASP.NET Core (Q68 — Minimal APIs default to STJ), OpenAPI generation (Q73d — STJ types drive schema), and Native AOT (Q103 — STJ source-gen is non-negotiable). Security (Q96 — common mistakes) overlaps with the deserialisation gadget topic. Performance (Q17 — avoid allocations) lists STJ source-gen as a core technique. If `[JsonSerializable]` and `[JsonDerivedType]` aren't muscle memory, expect senior interviewers to push on AOT readiness.

### Q62. JSON polymorphism in `System.Text.Json` — how does it work?

.NET 7+. Annotate the base type: `[JsonDerivedType(typeof(Dog), typeDiscriminator: "dog")] [JsonDerivedType(typeof(Cat), typeDiscriminator: "cat")] abstract class Animal {}`. Serialise emits `{ "$type": "dog", … }`; deserialise reads the discriminator to instantiate the right subtype. Configurable discriminator property name via `JsonPolymorphicAttribute`. Replaces the Newtonsoft `TypeNameHandling` pattern (which had deserialisation gadget vulnerabilities). Doesn't work for arbitrary types — must enumerate the closed set.

### Q63. Why use source-generated JSON?

`[JsonSerializable(typeof(MyDto))]` partial class produces compile-time serialisers. Wins: (1) **AOT compatibility** — no runtime reflection, works under trimming and Native AOT, (2) faster (~30-50% on serialise/deserialise vs reflection), (3) smaller binary (no reflection metadata), (4) compile-time validation. Required for any AOT scenario. Set `JsonSerializerContext` in `JsonSerializerOptions.TypeInfoResolver` to wire up.

### Q64. Why was `BinaryFormatter` removed in .NET 9?

Years of accumulated **deserialisation gadget** vulnerabilities — attackers craft a binary payload that, when deserialised, instantiates an `IDeserializationCallback` chain executing arbitrary code. Microsoft tried to harden it, then deprecated it, finally **removed entirely in .NET 9**. If you encounter it in legacy code, migrate to `System.Text.Json` (or MessagePack for binary efficiency). Never use it; never bring it back via a NuGet shim.

---

## ASP.NET Core

### Summary

**What this topic covers**

ASP.NET Core is the framework most senior .NET interviews probe deepest — it's where production .NET lives. The 14 questions in this section span almost everything you'll be asked about a real service. Four concern areas: (1) the **pipeline and DI** — middleware vs endpoint filters, request lifecycle, `Singleton`/`Scoped`/`Transient` with the captive-dependency trap, the `IOptions<T>`/`IOptionsSnapshot<T>`/`IOptionsMonitor<T>` triad; (2) the **API surface** — Minimal APIs vs MVC, `TypedResults` for OpenAPI, built-in OpenAPI replacing Swashbuckle, Problem Details (RFC 7807), CORS gotchas, `ForwardedHeaders` behind a reverse proxy; (3) the **production-readiness layer** — rate limiting, `HybridCache` with stampede protection, `BackgroundService` for hosted workers, health checks split into liveness vs readiness, ASP.NET Core Identity choices; (4) the **.NET 10 currency** — deprecations (`WithOpenApi`, `WebHostBuilder`, `IActionContextAccessor`), SSE helpers, new OpenAPI defaults. The 14 questions cover the day-to-day reality of building, deploying, and operating a .NET 10 service in 2026.

**Mental model**

ASP.NET Core is **a pipeline of `RequestDelegate`s sitting on top of Kestrel and the generic host**. Each request flows through middleware (cross-cutting concerns: exception handling, HSTS, HTTPS redirect, static files, routing, CORS, auth, authorization) and lands at an endpoint — either a Minimal API handler or an MVC controller action. Order matters: exception handler first, then security, then routing, then auth, then authorization, then the endpoint. A misplaced `UseAuthentication` after `UseAuthorization` means the authorize check sees an unauthenticated user. The DI container manages object lifetimes — Singleton (one per app), Scoped (one per request via `IServiceScope`), Transient (new every resolve) — and the captive-dependency trap (Singleton holding a Scoped) is the single most common DI bug. Enable `ValidateScopes` and `ValidateOnBuild` to catch it at startup, not at 3am. The configuration layer has three flavours of `IOptions`: plain `IOptions<T>` (singleton, captured at start), `IOptionsSnapshot<T>` (scoped, refreshes between requests — for file-watched config), `IOptionsMonitor<T>` (singleton with `OnChange` callbacks — for singletons reacting to changes). Always pair with `.ValidateDataAnnotations().ValidateOnStart()` so misconfiguration fails at boot, not at first use. The 2026 default for new APIs is **Minimal APIs** with `TypedResults` returning union types (`Results<Ok<T>, NotFound, BadRequest<ProblemDetails>>`) — better source generators, more AOT-friendly, OpenAPI auto-documented. The production stack adds `HybridCache` (L1+L2 with per-key stampede protection), `BackgroundService` for long-running work, `MapHealthChecks` split into liveness (`/health/live` — restart pod) and readiness (`/health/ready` — remove from LB), rate limiting per endpoint, and `ForwardedHeaders` configured before anything reads `RemoteIpAddress`.

**Key terms**

- **Middleware pipeline** — linear `RequestDelegate` chain; `app.Use(...)` / `UseMiddleware<T>` / `Map`; order matters.
- **Endpoint filters** — per-endpoint `AddEndpointFilter(...)`; typed parameter access; runs after model binding.
- **Singleton / Scoped / Transient** — DI lifetimes; captive dependency = Singleton holds Scoped, defeats per-request semantics.
- **`ValidateScopes` / `ValidateOnBuild`** — catch captive dependencies at startup.
- **`IOptions<T>` / `IOptionsSnapshot<T>` / `IOptionsMonitor<T>`** — static, per-request, change-callback; pick by refresh semantics.
- **Minimal APIs** — `app.MapGet(...)`; less ceremony, AOT-friendly, source-gen friendly; default for new APIs.
- **MVC controllers** — model binding attributes, action filters, `[Authorize]`; still first-class.
- **`TypedResults`** — typed result builders; OpenAPI infers shape; pair with `Results<Ok<T>, NotFound, …>` union returns.
- **`Microsoft.AspNetCore.OpenApi`** — .NET 9+ replacement for Swashbuckle; framework-owned; no UI bundled.
- **`HybridCache`** — .NET 9+ L1+L2 cache with per-key stampede protection; replaces hand-rolled two-tier caches.
- **`BackgroundService`** — base class for long-running hosted services; `ExecuteAsync(stoppingToken)`.
- **Liveness vs readiness** — "is the process alive" (restart on fail) vs "can it serve traffic now" (remove from LB).
- **Rate limiter** — .NET 7+; fixed window, sliding window, token bucket, concurrency; per-endpoint via `RequireRateLimiting`.
- **Problem Details (RFC 7807)** — uniform error contract; `AddProblemDetails()` + `UseExceptionHandler(...)`.
- **`ForwardedHeaders`** — behind a reverse proxy, configures real client IP / scheme; must be called before anything reads `RemoteIpAddress`.
- **CORS credentialed restriction** — `AllowAnyOrigin()` + `AllowCredentials()` is rejected by the spec.

**Why interviewers ask this**

Three signals. (1) **Production maturity** — every question in this section maps to a real production concern. The captive-dependency trap (Q66), the `IOptions` triad (Q67), liveness vs readiness (Q73g), `ForwardedHeaders` (Q73e), the credentialed-CORS spec restriction (Q73f) — these are 3am-pager-call topics. Candidates who answer fluently have operated the framework; candidates who hedge have only built dev-loop apps. (2) **API design taste** — Q68 (Minimal APIs vs MVC), Q73c (`TypedResults` vs `Results`), Q73 (Problem Details) test whether the candidate has opinions about what makes a clean API surface. The senior answer is "Minimal APIs with `TypedResults` for greenfield, MVC when you need filters / conventions / model state, Problem Details everywhere for errors." (3) **Currency** — Q71 (.NET 10 deprecations), Q73d (OpenAPI replacing Swashbuckle), Q70 (`HybridCache`), Q73h (IdentityServer4 → Duende commercial, OpenIddict as the OSS replacement) test whether the candidate has tracked the framework across the last three releases. The senior tell is volunteering "and `WithOpenApi` is deprecated in .NET 10" without prompting.

**Common confusions**

- "Middleware order doesn't matter much" — it controls correctness. `UseRouting` before `UseAuthentication` matters; `UseAuthentication` before `UseAuthorization` matters.
- "Scoped is always per-HTTP-request" — it's per `IServiceScope`. ASP.NET Core creates one per request; manual scopes (e.g. background workers) create their own.
- "`IOptions<T>` reloads on config change" — it doesn't; it's singleton-captured. Use `IOptionsSnapshot` or `IOptionsMonitor` for reload semantics.
- "`Results.Ok` and `TypedResults.Ok` are interchangeable" — for the runtime yes; for OpenAPI inference no. Use `TypedResults` to auto-document response shape.
- "Liveness and readiness are the same" — they're not. Liveness failure restarts the pod; readiness failure removes it from the LB. Mixing them causes cascading restarts.
- "`HybridCache` is just two-tier MemoryCache + Redis" — and per-key stampede protection. The stampede protection is the actual feature.
- "Captive dependencies only matter in dev" — they fail silently in prod (Singleton holds DbContext forever, "intermittent stale data" tickets). Enable `ValidateScopes` everywhere.
- "Configure middleware then add it once" — `UseForwardedHeaders` specifically must come *before* anything that reads `RemoteIpAddress` or builds absolute URLs.

**What follows from this topic**

ASP.NET Core ties together almost every other section. Concurrency (Q72 `BackgroundService`, Q70 stampede protection) builds on async primitives. Entity Framework Core (Q74 `DbContext` is Scoped by design) maps to the DI lifetimes here. Observability (Q91-93 — tracing across HTTP boundaries) plugs into the middleware pipeline. Security (Q94-97c) is mostly ASP.NET Core configuration. Architecture Patterns (Q100b vertical slice vs clean) is about how you organise the endpoints this section defines. If ASP.NET Core fundamentals are shaky, half the senior interview will be a recovery operation.

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

### Summary

**What this topic covers**

EF Core is the .NET ORM senior interviews probe most aggressively — because it's the layer where ORM convenience meets database reality, and where most performance / correctness disasters live. The 10 questions in this section cover the senior territory. Four concern areas: (1) the **lifetime model** — `DbContext` is not thread-safe; Scoped by design; `IDbContextFactory<TContext>` for concurrent scenarios; (2) **query and tracking** — `AsNoTracking` for reads, the N+1 problem and its three fixes (`Include`, `AsSplitQuery`, project to DTO), Cartesian explosion, compiled queries, the identity-map gotcha where queries return entities that "don't exist"; (3) **bulk and bulkless operations** — `ExecuteUpdateAsync`/`ExecuteDeleteAsync` for set-based mass updates without change tracking; (4) **production-hardening** — optimistic concurrency via `[Timestamp]`, multi-instance migration safety (run as a separate CI step, not on app start), cursor-based pagination for deep lists, EF Core 10 additions (SQL Server 2025 vector type, native JSON, full-text via LINQ). The 10 questions are the day-to-day reality of a senior .NET engineer working against a relational DB.

**Mental model**

EF Core is **a change tracker, a query translator, and a unit of work, bundled into `DbContext`**. (1) The **change tracker** observes every entity returned by a tracking query and detects mutations on `SaveChanges`. Tracking overhead is 3-10× slower per row than `AsNoTracking()` — for read-only queries going straight to a controller or DTO, always disable tracking. (2) The **query translator** walks the `IQueryable<T>` expression tree and emits SQL. Three failure modes: client evaluation (a method the provider can't translate falls back to in-process — EF Core 3.0+ throws by default), Cartesian explosion (large `Include` chains produce one massive joined result), and inefficient SQL from poorly shaped LINQ. The three fixes for N+1 are `Include` (joins, may explode), `AsSplitQuery` (separate queries per `Include`, EF stitches in memory — usually faster on wide aggregates), and projection to DTO (`Select(o => new OrderDto { ... })` — translates fully to SQL, never materialises entities). (3) The **unit of work** is `DbContext` itself — `DbSet<T>` *is* a repository. Wrapping it in `IGenericRepository<T>` is usually leaky abstraction; domain-specific repositories with business-shaped methods (`IOrderRepository.GetActiveByCustomer(id)`) are the senior compromise. The fourth mental shift is **production hardening lives outside the ORM**: optimistic concurrency via `RowVersion`, migration runs as a separate CI/CD step before deploy rollout (never on app start — race condition), cursor-based pagination over offset for any list that grows past a few thousand rows. EF Core 10 closes long-standing gaps — vector columns for embeddings, native JSON, full AOT compatibility for most providers.

**Key terms**

- **`DbContext`** — change tracker + query translator + unit of work; **not thread-safe**; Scoped by design.
- **`IDbContextFactory<TContext>`** — for parallel / background work; produces fresh short-lived contexts.
- **`AsNoTracking`** — read-only queries; no change tracking; 3-10× faster.
- **`AsNoTrackingWithIdentityResolution`** — no tracking, but deduplicate references to the same row in one result.
- **N+1** — one parent query plus N child queries; fix with `Include`, `AsSplitQuery`, or projection.
- **`Include`** — eager-load related entities via JOIN; can cause Cartesian explosion on wide aggregates.
- **`AsSplitQuery`** — separate queries per `Include`; EF stitches in memory; safer for wide aggregates.
- **Projection to DTO** — `Select(o => new OrderDto { … })`; full SQL translation, no entity materialisation.
- **`ExecuteUpdateAsync` / `ExecuteDeleteAsync`** — set-based SQL; no tracking; single round-trip; .NET 10 has new delegate form.
- **Compiled queries** — `EF.CompileAsyncQuery(...)`; ~10-30% on hot queries by skipping query-build.
- **Identity map** — `DbContext` caches loaded entities; queries can return cached entities including `Deleted`/`Added` not yet persisted.
- **Optimistic concurrency** — `[Timestamp] byte[] RowVersion` (SQL Server) or `[ConcurrencyCheck]`; `DbUpdateConcurrencyException` on conflict.
- **Multi-instance migration race** — two app instances calling `MigrateAsync()` simultaneously; fix: run as separate CI step.
- **Expand-then-contract migrations** — add nullable columns, deploy reading both, drop old in second migration; zero-downtime.
- **Cursor pagination** — `WHERE id < lastSeen ORDER BY id DESC LIMIT N`; O(log N + M) on indexed sort key; stable under inserts.
- **EF Core 10** — SQL Server 2025 vector type, native JSON, full-text via LINQ, improved `ExecuteUpdate`, full AOT.

**Why interviewers ask this**

Three signals. (1) **Production scars** — Q74 (`DbContext` thread safety), Q76 (N+1 + Cartesian explosion), Q80 (entities that don't exist from the identity map), Q80c (multi-instance migration race) are all questions a senior has been bitten by. Naming the symptom and the fix without prompting is the senior tell. (2) **Modern EF currency** — Q77 (`ExecuteUpdateAsync`), Q79 (EF Core 10 vector type, native JSON), Q80b (optimistic concurrency), Q80d (cursor pagination) test whether the candidate tracks EF Core releases. Many production EF codebases still pre-load and mutate entities for bulk updates — knowing the set-based API is the senior signal. (3) **Architectural taste** — Q75 (`AsNoTracking` tradeoff) and Q76 (which fix for N+1) probe whether the candidate picks based on the data shape, not on a default reflex. The right answers depend on read/write profile, aggregate width, and how the entities flow to the caller.

**Common confusions**

- "`DbContext` is thread-safe if I only read" — it isn't. The change tracker maintains per-instance state regardless of read/write.
- "`Include` always fixes N+1" — and may cause Cartesian explosion. For wide aggregates, `AsSplitQuery` or projection often wins.
- "`AsNoTracking` is always faster" — for tracked-then-`SaveChanges` flows you actually need tracking. Use it only for read-only queries.
- "Compiled queries are obsolete now that EF caches plans" — EF caches the SQL string; compiled queries skip the entire query-build step. Still wins on hot paths.
- "Run migrations on app startup" — race condition in multi-instance deploys. Run as a separate CI step against the DB before the rollout.
- "Optimistic concurrency is automatic" — only with `RowVersion` or `[ConcurrencyCheck]` declared. Otherwise concurrent edits silently overwrite.
- "Offset pagination scales fine" — past a few thousand rows it degrades badly because the DB scans-and-skips. Use cursor pagination for deep lists.
- "Repository pattern is always good practice" — over EF Core it's often a leaky abstraction. Domain-specific repositories yes; generic CRUD wrappers no.

**What follows from this topic**

EF Core ties into ASP.NET Core (Scoped lifetime per request), Concurrency (`IDbContextFactory` for parallel work), Architecture Patterns (Q100c — repository pattern over EF), Native AOT (Q103 — EF Core 10 fully AOT), Observability (EF instrumentation via OpenTelemetry), and Performance (compiled queries, projections). If query semantics and the identity map feel opaque, expect senior interviewers to keep pulling on the thread.

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

### Summary

**What this topic covers**

The .NET testing ecosystem in 2026 looks different from 2020 — sponsorship drama hit Moq, FluentAssertions went commercial, and the modern stack has converged. The 5 questions in this section cover the converged stack. Four concern areas: (1) **the test framework** — xUnit as the dominant choice, modern test class shape with `IClassFixture<T>`, `ICollectionFixture<T>`, `IAsyncLifetime`, `[Theory]` data sources; (2) **mocking choices** — NSubstitute as the post-Moq pragmatic default, FakeItEasy as alternative, why teams moved off Moq; (3) **integration testing** — `WebApplicationFactory<TEntryPoint>` for in-process ASP.NET Core testing, Testcontainers for .NET for real-database integration; (4) **assertions and property-based** — FluentAssertions v8 going commercial and the AwesomeAssertions / Shouldly forks; FsCheck for property-based testing when invariants matter more than examples. The 5 questions cover the senior territory: knowing the licensing landscape, knowing why `WebApplicationFactory<T>` + Testcontainers is the gold standard, and knowing when to reach beyond example-based tests.

**Mental model**

Testing in .NET 2026 has three layers. (1) **Unit tests** — xUnit with `[Fact]` and `[Theory]`, NSubstitute for mocks, run fast, run on every commit. The modern test class shape uses `IClassFixture<T>` for expensive shared setup (one fixture instance per class), `ICollectionFixture<T>` for cross-class sharing via `[Collection]`, and `IAsyncLifetime` for async setup/teardown. Tests in the same class don't share state beyond fixtures because xUnit parallelises across classes by default. (2) **Integration tests** — `WebApplicationFactory<TEntryPoint>` boots the real ASP.NET Core pipeline in-process, lets you override specific services (swap the DB to in-memory or a Testcontainer), and gives you a `HttpClient` to hit. Routing, model binding, filters, middleware, auth — all exercised end-to-end without a process boundary. Pair with **Testcontainers for .NET** (`Testcontainers.PostgreSql`, `Testcontainers.MsSql`) for real database integration: spin up a container per test fixture, run migrations, run the test, tear down. This is the gold standard for "does it work end-to-end" — the EF-Core-with-real-SQL question that in-memory providers can't answer (different SQL dialect, no real constraint enforcement, no concurrency). (3) **Property-based tests** — FsCheck generates random inputs to verify *invariants* rather than specific examples. The classic: "a sorted list is sorted" — 1000 random lists, assert `sort(input)` is sorted. Catches edge cases (empty, duplicates, max-int) you'd never hand-write. Worth the learning curve on parsers (roundtrip property: `parse(format(x)) == x`), state machines, and mathematical functions. Doesn't replace example-based tests — augments them. The 2025 ecosystem shifts: **Moq** had a telemetry sponsorship incident (phoned home on each test run) and many teams moved to **NSubstitute**. **FluentAssertions v8** went commercial; the community forked v7 as **AwesomeAssertions** under Apache; **Shouldly** is the other clean option. Plain xUnit assertions are also fine.

**Key terms**

- **xUnit** — dominant .NET test framework; `[Fact]`, `[Theory] + [InlineData]`, `[MemberData]`, `[ClassData]`.
- **`IClassFixture<TFixture>`** — one fixture instance per test class; for expensive shared setup.
- **`ICollectionFixture<TFixture>`** — fixture shared across classes via `[Collection]`.
- **`IAsyncLifetime`** — async setup/teardown via `InitializeAsync` / `DisposeAsync`.
- **NSubstitute** — modern mocking library; cleaner API than Moq; no licensing drama.
- **Moq sponsorship incident (2023)** — telemetry phoned home; many teams migrated off.
- **FakeItEasy** — third mocking option; similar quality to NSubstitute.
- **`WebApplicationFactory<TEntryPoint>`** — in-process ASP.NET Core integration test; real pipeline, swappable services.
- **`WithWebHostBuilder(b => b.ConfigureTestServices(...))`** — override services for test setup.
- **Testcontainers for .NET** — real ephemeral containers (Postgres, SQL Server, Redis) for integration tests.
- **FluentAssertions v8** — commercial license; community forked v7 as **AwesomeAssertions** (Apache).
- **Shouldly** — clean assertion library; `actual.ShouldBe(expected)` style.
- **FsCheck** — property-based testing; generates random inputs to verify invariants.
- **Roundtrip property** — `parse(format(x)) == x`; classic property-based test for serialisation.

**Why interviewers ask this**

Three signals. (1) **Ecosystem currency** — Q82 (Moq sponsorship) and Q84 (FluentAssertions licensing) test whether the candidate has tracked the 2023-2025 churn. A candidate who reaches for NSubstitute and AwesomeAssertions reflexively has been paying attention; a candidate still defaulting to Moq + FluentAssertions hasn't. (2) **Integration test maturity** — Q83 (`WebApplicationFactory<T>` + Testcontainers) is the senior tell. Candidates who only write unit tests against mocks have shipped bugs that real-database integration would have caught; candidates who reach for Testcontainers know that. (3) **When property-based earns it** — Q85 (FsCheck) tests whether the candidate understands the *category* of tests where property-based wins: parsers, state machines, mathematical functions. The wrong answer is "always" or "never"; the right answer is "for invariant-driven domains where example coverage is insufficient." (4) Bonus signal: the candidate's test pyramid — heavy on integration with Testcontainers, lighter on unit tests with NSubstitute, sprinkled with property-based where invariants matter — versus the anti-pattern of 95% mocked unit tests that never catch a real bug.

**Common confusions**

- "xUnit tests in the same class run in parallel" — they don't. xUnit parallelises across test *classes*, not within a class. Inside a class, tests share fixtures, ordering is unspecified.
- "`IClassFixture` and `ICollectionFixture` are interchangeable" — `IClassFixture` is per class; `ICollectionFixture` is shared across classes in the same `[Collection]`.
- "EF in-memory provider is enough for integration tests" — it isn't. Different SQL dialect, no constraint enforcement, no concurrency. Use Testcontainers for real DB.
- "Mocking the `DbContext` is the right unit test" — usually a code smell. Test against a real `DbContext` (in-memory or Testcontainer); save mocks for true external dependencies.
- "`WebApplicationFactory<T>` spins up a process" — it doesn't. It runs the host in-process; the HttpClient is wired without sockets.
- "FluentAssertions v7 is still fine for commercial use" — under the original Apache license yes; v8 is when the licensing changed. Use AwesomeAssertions (v7 fork) going forward.
- "FsCheck replaces example-based tests" — it augments them. Use both: examples for documentation and well-known cases, properties for invariants.

**What follows from this topic**

Testing depends on every other section. ASP.NET Core (Q65-73) is what `WebApplicationFactory` exercises. EF Core (Q74-80) is what Testcontainers makes real. Concurrency (Q19-28c) is what property-based tests stress. Architecture Patterns (Q100b vertical slice) maps neatly to test organisation — each slice has its own test file. If a candidate's testing story stops at "I write unit tests with mocks," expect senior interviewers to push on integration coverage and the production bugs that mocks didn't catch.

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

### Summary

**What this topic covers**

How modern .NET 10 projects are built, packaged, and shipped. The 3 questions in this section are short but cover the senior tooling vocabulary. Three concern areas: (1) **dependency management at scale** — Central Package Management (`Directory.Packages.props`) plus `Directory.Build.props` for repo-wide MSBuild settings; the monorepo-friendly story that ends "Serilog 4.0.1 in OrderApi, 4.0.3 in UserApi" drift; (2) **publishing modes** — framework-dependent vs self-contained vs single-file vs R2R (ReadyToRun) vs Native AOT, and when each makes sense; (3) **new in .NET 10** — the `dnx` tool runner that replaces `dotnet tool install -g` for one-off and CI usage. The 3 questions are tight but tested often — a senior engineer is expected to pick the right publishing mode reflexively and to know that Central Package Management is the modern default for any multi-project repo.

**Mental model**

Two design pressures shape modern .NET build: (1) **monorepos and dependency drift** — multiple projects in one repo end up with subtly different package versions, leading to runtime conflicts and "works in OrderApi, breaks in UserApi" bugs. Central Package Management solves this with a single `Directory.Packages.props` at the repo root listing every `<PackageVersion>`, and project files using `<PackageReference Include="Pkg" />` without versions. One source of truth. Combine with `Directory.Build.props` for repo-wide MSBuild settings — target framework, langversion, nullable enable, treat warnings as errors — and you get a consistent build profile across every project without copy-pasting csproj fragments. Essential for any solution with more than ~3 projects. (2) **Publishing as a continuum**, not a binary. **Framework-dependent** (default, smallest output, requires runtime on host) for server apps where you control the host environment. **Self-contained** (~80 MB output, includes runtime) for sealed appliances and containers where you want zero host dependencies. **Single-file** bundles into one executable; combine with self-contained for true portability. **R2R (ReadyToRun)** precompiles native code alongside IL — bigger output, faster startup. **Native AOT** is the extreme — full AOT compile, no JIT, smallest startup and working set, but a closed-world model that breaks most reflection. The 2026 default: framework-dependent for typical server apps; Native AOT for CLI tools, serverless cold-starts, and minimal-reflection ASP.NET Core APIs. The third mental shift is **`dnx`** (.NET 10) — execute .NET tools directly without `dotnet tool install -g my-tool`. `dnx my-tool@1.2.3 -- args` resolves the NuGet package, runs the tool, caches it. Particularly useful in CI pipelines and one-off invocations where global installs clutter the environment.

**Key terms**

- **`Directory.Packages.props`** — repo-root file with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` and `<PackageVersion>` entries.
- **`Directory.Build.props`** — repo-wide MSBuild settings; target framework, langversion, NRT, treat warnings as errors.
- **Central Package Management (CPM)** — the dependency-version-drift-elimination pattern.
- **Framework-dependent publish** — default; smallest output; requires .NET runtime on host.
- **Self-contained publish** — includes the runtime; ~80 MB; no host dependency.
- **Single-file publish** — bundles output into one executable; combine with self-contained for portability.
- **R2R (ReadyToRun)** — precompiled native code alongside IL; faster startup, bigger output.
- **Native AOT** — full AOT compile; no JIT, no IL at runtime; smallest startup; closed-world restrictions.
- **`dnx` (.NET 10)** — tool runner; `dnx tool@version -- args`; replaces global install for one-offs.
- **`dotnet publish -t:PublishContainer`** — build and push OCI image without Dockerfile; .NET 10 default base is Ubuntu chiseled.
- **Chiseled images** — distroless equivalent; no shell, no package manager, minimal attack surface.
- **TargetFramework moniker (TFM)** — `net10.0`, `net10.0-android`, `net10.0-ios`; controls API surface.

**Why interviewers ask this**

Three signals. (1) **Repo hygiene** — Q86 (CPM) tests whether the candidate has worked in a real multi-project solution. Anyone who's debugged "Serilog 4.0.1 vs 4.0.3" drift reaches for Central Package Management reflexively. Pairing with `Directory.Build.props` is the senior tell. (2) **Deployment fluency** — Q87 (publishing modes) probes whether the candidate can pick the right packaging for the workload. The senior answer doesn't say "Native AOT for everything" — it picks based on workload: framework-dependent for typical servers, Native AOT for CLI/serverless/minimal-API hot paths, self-contained-single-file for sealed appliances. (3) **Currency** — Q88 (`dnx`) and the implicit `dotnet publish -t:PublishContainer` knowledge (from Q103b in the AOT section) test whether the candidate has read .NET 10 release notes. A candidate still installing tools globally in CI pipelines hasn't tracked the changes.

**Common confusions**

- "Central Package Management is just for monorepos" — useful even in single-repo, multi-project solutions. Anywhere you have ≥2 projects sharing dependencies.
- "Self-contained is always safer" — bigger output, more disk, more bandwidth. Use only when you can't guarantee the runtime on the host.
- "Single-file publish is AOT" — it isn't. Single-file is a packaging optimisation; AOT is a compilation model. They compose but are independent.
- "R2R is the same as AOT" — R2R precompiles IL to native *alongside* IL; the JIT still runs for non-R2R'd methods. AOT removes the JIT entirely.
- "Native AOT just makes startup faster" — it also closes the world (no `Assembly.LoadFrom`, restricted reflection, source-gen required for serialisers). It's a different deployment model.
- "`dnx` replaces `dotnet tool install`" — for one-offs yes; for tools you use daily, global install is still fine.
- "`Directory.Build.props` is automatic" — it's auto-discovered by MSBuild walking up from each project. The convention is implicit; the file must exist for the convention to apply.

**What follows from this topic**

Build/tooling sits under everything that ships. Native AOT & Trimming (Q101-103b) is the deepest dive into AOT publishing — direct extension of Q87. ASP.NET Core deployment patterns (containerised, minimal APIs with AOT, OpenAPI without Swashbuckle) all interact with the publishing model picked here. Observability (Q91 — OpenTelemetry export) is configured at build/deploy time. Security (data protection key persistence — Q95) interacts with how you deploy. If the candidate's deployment story stops at "I run `dotnet publish`," expect senior interviewers to probe the actual configuration.

### Q86. What's Central Package Management?

`Directory.Packages.props` in the repo root with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` and a `<PackageVersion>` per dependency. Individual projects then `<PackageReference Include="Pkg" />` without a version. Single source of truth across the solution — no more "OrderApi uses Serilog 4.0.1, UserApi uses 4.0.3" drift. Combine with `Directory.Build.props` for repo-wide MSBuild settings (target framework, langversion, nullable, treat-warnings-as-errors). Essential for monorepos.

### Q87. Self-contained vs framework-dependent vs single-file vs Native AOT — what do I pick?

**Framework-dependent**: smallest output, requires .NET runtime on the host. Default for server apps where you control the host. **Self-contained**: includes the runtime, ~80 MB output, no host dependency. For sealed appliances and containers. **Single-file publish**: bundles into one executable; combine with self-contained for true portability. **R2R (ReadyToRun)**: precompiled native code alongside IL for faster startup; bigger output. **Native AOT**: full AOT, no JIT, smallest startup + working set, big restrictions. Default: framework-dependent. For CLI tools or serverless cold-starts: Native AOT.

### Q88. The new `dnx` (.NET 10) — what is it?

A tool to execute .NET tools directly without `dotnet tool install -g`. `dnx my-tool@1.2.3 -- args` resolves the NuGet package, runs the tool, caches it. Replaces the old "install globally, hope it doesn't conflict, remember to update" flow. Particularly useful in CI pipelines and one-off invocations. Older `dotnet tool install/run` still works.

---

## Observability

### Summary

**What this topic covers**

Logging, metrics, and tracing — the three pillars of observability — in their modern .NET shape. The 5 questions in this section cover what every senior .NET engineer should reflexively reach for. Three concern areas: (1) **structured logging** — message templates (`{OrderId}` placeholders) over string interpolation, and `[LoggerMessage]` source-generated logging for zero-allocation hot paths; (2) **metrics and tracing** — `System.Diagnostics.Metrics` replacing EventCounters with OpenTelemetry-compatible instruments (Counter, Histogram, ObservableGauge), OpenTelemetry .NET as the cross-service tracing fabric; (3) **context propagation** — propagating trace context from an HTTP request into a background `Channel<T>` worker, manually carrying `Activity.Current.Context` across async boundaries where `ExecutionContext` doesn't auto-flow. The 5 questions are the observability minimum bar for a production .NET service in 2026: structured logs go to Seq/Datadog/Elastic with indexed fields, metrics export OTLP to Prometheus/Grafana, traces show end-to-end request flow across services.

**Mental model**

Observability is **the difference between "the service is broken" and "the service is broken because X is at fault at line Y"**. Three layers. (1) **Logging** — every line your code emits to a sink. Use **structured message templates**: `logger.LogInformation("Order {OrderId} processed in {Elapsed}ms", id, ms)` — the template is preserved as a *message ID*, and `OrderId` + `Elapsed` are emitted as searchable fields. Sinks (Seq, Elasticsearch, Datadog) index those fields. Search "all logs where OrderId=42" trivially. String interpolation (`$"Order {id} processed in {ms}ms"`) loses all structure and formats every time even at filtered-out levels — actively harmful. `[LoggerMessage]` source-generated logging takes it further: compile-time-emitted strongly-typed call sites with no boxing, no allocation, AOT-friendly. Adopt for any high-throughput log call. (2) **Metrics** — counts, gauges, histograms. `System.Diagnostics.Metrics`'s `Meter` factory produces OpenTelemetry-compatible instruments: `Counter<long>` for monotonic counts, `Histogram<double>` for latency distributions, `ObservableGauge<T>` for sampled values, `UpDownCounter<T>` for non-monotonic. Wire to OpenTelemetry exporter; ship OTLP to Prometheus/Grafana/Datadog. Replaces the older EventCounters pattern — same low-allocation philosophy, more instrument types, portable. (3) **Distributed tracing** — `Activity` (System.Diagnostics) is .NET's span primitive. ASP.NET Core's instrumentation reads the `traceparent` header inbound, creates the root `Activity`, and propagates it through `ExecutionContext`. `ActivitySource.StartActivity("op-name")` creates child spans for internal work. `HttpClient` instrumentation injects `traceparent` on outbound calls. Across `Channel<T>` workers and `Task.Run` boundaries — where the worker runs on a separate `ExecutionContext` — you must manually capture `Activity.Current?.Context` at enqueue and pass it as `parentContext` to the worker's `StartActivity`. Otherwise the worker's spans look orphaned.

**Key terms**

- **Structured logging** — message templates with `{Placeholders}`; fields indexed by sink.
- **Message template** — the format string itself acts as a stable message ID across instances.
- **`[LoggerMessage]`** — source-generated, strongly-typed, zero-allocation log call sites.
- **`Meter`** — `System.Diagnostics.Metrics` factory; produces Counter, Histogram, Gauge, UpDownCounter.
- **`Counter<T>`** — monotonic count instrument (orders processed).
- **`Histogram<T>`** — latency distribution (request duration ms).
- **`ObservableGauge<T>`** — sampled value (queue depth).
- **`Activity` / `ActivitySource`** — .NET's span / tracer primitives; OpenTelemetry-compatible.
- **`traceparent`** — W3C trace context header propagated across HTTP boundaries.
- **`Activity.Baggage`** — key/value pairs propagating with the trace context.
- **OTLP** — OpenTelemetry Protocol; standard export format to Prometheus, Jaeger, Tempo, Honeycomb, Datadog.
- **`AddOpenTelemetry().WithTracing(...)` / `.WithMetrics(...)`** — DI registration for OTel.
- **Context propagation across `Channel<T>`** — capture `Activity.Current?.Context` at enqueue, pass `parentContext` at worker `StartActivity`.

**Why interviewers ask this**

Three signals. (1) **Production diagnosability** — Q89 (structured templates) catches whether the candidate has ever debugged a real outage. Anyone who's needed to search logs by `OrderId=42` knows why string interpolation is malpractice. (2) **Modernity** — Q90 (`[LoggerMessage]`) and Q92 (`System.Diagnostics.Metrics`) test whether the candidate has adopted the post-2022 idioms. `[LoggerMessage]` is a 2-line change that gives zero-allocation logging; reflexively reaching for it is the senior tell. (3) **Distributed-system reality** — Q91 (OpenTelemetry across services) and Q93 (manual context propagation across `Channel<T>`) sort candidates who've operated multi-service systems from candidates who've only built single-service apps. The right answer to Q93 includes the *why* — `ExecutionContext` flows automatically across `await`s but not across the producer/consumer boundary of a `Channel<T>`, because the worker task is its own root. Knowing the mechanism is the senior signal.

**Common confusions**

- "`$"Order {id}"` and `"Order {OrderId}", id` are the same" — completely different. Interpolation produces one opaque string; templates produce a stable message ID + structured fields.
- "Logging at `Information` is fine in hot paths" — formatting cost happens regardless of level unless you use templates or `[LoggerMessage]`. Hot paths need the source-generated form.
- "EventCounters are the way to expose metrics" — `System.Diagnostics.Metrics` is the modern replacement; OTel-compatible, more instrument types.
- "`Activity.Current` flows everywhere" — it flows via `ExecutionContext`, which flows across `await` boundaries automatically. It does *not* flow across `Channel<T>` producer/consumer or manual `Task.Run` without capture.
- "OpenTelemetry only works with Jaeger" — OTLP is the protocol; backends include Prometheus, Tempo, Honeycomb, Datadog, New Relic, AWS X-Ray. Backend-agnostic.
- "Tracing is just for microservices" — single-service apps benefit from tracing too (DB calls, HTTP calls, background work all become spans). Visible value even at small scale.
- "Sampling traces means losing data" — sampling at the producer reduces volume; tail-based sampling at the collector keeps traces with errors or slow operations. Both are standard practice at scale.

**What follows from this topic**

Observability touches almost every other topic. Concurrency (Q19-28 — `ExecutionContext` flow rules underpin Q93's manual context propagation). ASP.NET Core (Q65-73 — middleware is where ASP.NET Core's OTel instrumentation hooks in). Entity Framework Core (Q74-80 — the EF OTel instrumentation emits a span per query, often the only way to find N+1 problems in production). Architecture Patterns (Q99 MassTransit, Q100f event sourcing — both depend on tracing across async boundaries). If observability is "I write `Console.WriteLine`", expect senior interviewers to push hard.

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

### Summary

**What this topic covers**

Security in ASP.NET Core is a wide topic; this section covers the senior bar in 6 questions. Four concern areas: (1) **password hashing** — Argon2id as the 2026 standard, ASP.NET Core Identity's PBKDF2 as adequate-but-not-best, never roll your own; (2) **Data Protection API** — `IDataProtector` underlies cookie encryption, antiforgery, OAuth state; key persistence in multi-instance deployments is the most common cause of intermittent auth failures; (3) **common mistakes** — SQL injection via `FromSqlRaw` interpolation, XSS via `@Html.Raw(userInput)`, CSRF via disabled antiforgery, open redirect via untrusted paths, credential logging via structured-log capture; (4) **modern and frontier topics** — post-quantum cryptography (ML-KEM, ML-DSA, SLH-DSA in .NET 10), JWT token revocation patterns when access tokens contain stale claims, mass-assignment prevention via DTOs. The 6 questions are the security minimum for any .NET service handling user data — and the ones a senior interviewer probes when the candidate's resume mentions "built an auth system."

**Mental model**

Two design principles frame .NET security. (1) **Defence in depth** — every layer adds protection independent of others, so a single mistake doesn't end the game. Password hashing uses memory-hard Argon2id (resistant to GPU/ASIC attacks); cookies are encrypted via Data Protection API (so stealing the cookie file doesn't yield credentials); CSRF tokens are validated on every state-changing request (so cookie theft alone doesn't authorise actions); input validation rejects malformed data before it hits the database; DTOs at the API boundary prevent mass assignment from setting fields the client shouldn't touch. Every layer is independent. (2) **Closed defaults** — modern ASP.NET Core defaults are secure: HTTPS enforced, antiforgery on for cookie-based auth, HSTS on, password validators sane. Most security bugs come from *opening* the closed default — `[IgnoreAntiforgeryToken]` for "convenience," `FromSqlRaw($"...{userInput}...")` for "speed," `@Html.Raw(userInput)` for "rich text." The Data Protection API specifically is the most-forgotten security configuration: by default the key ring persists to `%LOCALAPPDATA%` (user-local), which means in a multi-instance deployment behind a load balancer, every instance has its own key ring → cookies issued on instance A can't be decrypted on instance B → users get logged out after a load-balancer flip. Fix: `services.AddDataProtection().PersistKeysToAzureBlobStorage(...) / Redis / FileSystem(shared mount)`. The frontier mental shift is **post-quantum crypto agility**. .NET 10 surfaces ML-KEM (key encapsulation), ML-DSA (signatures), and SLH-DSA (hash-based signatures) — the NIST PQC algorithms. Production today still stays on AES-GCM + ECDSA P-256, but design for crypto agility so the eventual migration (5-10 years) is a configuration change, not a rewrite. Threat: "harvest now, decrypt later" — adversaries record encrypted traffic now to decrypt once quantum hardware matures.

**Key terms**

- **Argon2id** — memory-hard password hashing; resistant to GPU/ASIC; NIST + OWASP recommendation in 2026.
- **PBKDF2-SHA256** — ASP.NET Core Identity's `PasswordHasher<TUser>` default; ~100k iterations; adequate but not best.
- **Konscious.Security.Cryptography.Argon2** — the .NET Argon2id library; tune to ~250ms on your hardware.
- **Data Protection API (`IDataProtector`)** — AES-GCM under the hood; used for cookies, antiforgery, OAuth state.
- **Key ring persistence** — must be shared across instances; persist to Azure Blob, Redis, or shared filesystem.
- **`FromSqlRaw` vs `FromSqlInterpolated`** — `Raw` does not parameterise (SQL injection); `Interpolated` auto-parameterises.
- **`@Html.Raw(userInput)`** — bypasses Razor encoding; classic XSS hole.
- **CSRF / antiforgery** — ASP.NET Core enables by default for cookie auth; do not disable.
- **Open redirect** — accepting untrusted return URLs; validate via `Url.IsLocalUrl` before redirecting.
- **Mass assignment** — binding `[FromBody]` directly to an EF entity; attacker sets fields not exposed in UI. Fix: DTOs.
- **ML-KEM / ML-DSA / SLH-DSA** — NIST post-quantum algorithms surfaced in .NET 10.
- **JWT revocation** — short-lived access + refresh tokens; revocation list in Redis; or stateful sessions.
- **Mapperly** — source-generated mapping library; AOT-friendly DTO ↔ entity mapping without reflection.

**Why interviewers ask this**

Three signals. (1) **Bread-and-butter security** — Q94 (password hashing) and Q96 (common mistakes) test whether the candidate's reflexes are right. A candidate who reaches for Argon2id, knows `FromSqlRaw` is SQL injection, and uses DTOs instead of binding to entities directly is operating at a senior level. (2) **Production scars** — Q95 (Data Protection key persistence) is *the* canonical "intermittent auth failure in prod" question. A candidate who's seen the bug — users randomly logged out after a deploy or LB flip — names the cause without prompting. (3) **Threat-model fluency** — Q97 (PQC), Q97b (JWT revocation patterns), Q97c (mass assignment) test whether the candidate can reason about adversary capabilities. The senior answer to Q97b lists all four revocation patterns and picks based on the threat model — short-lived access tokens for typical apps, stateful sessions for ultra-sensitive (banking), revocation lists for the middle ground.

**Common confusions**

- "ASP.NET Core Identity is enough — PBKDF2 is fine" — adequate but not best-in-class. For new systems, Argon2id; for existing Identity users, evaluate upgrade.
- "Data Protection works out of the box" — only in single-instance deployments. Multi-instance needs explicit shared persistence.
- "`FromSqlInterpolated` is just `FromSqlRaw` with prettier syntax" — no, it auto-parameterises. The difference is SQL injection vs not.
- "Disable antiforgery for APIs" — fine for token-auth APIs that don't use cookies; harmful for cookie-auth (which is what browser sessions use).
- "JWTs can be revoked by deleting them on the server" — they can't; that's the point of JWT being stateless. You revoke by short lifetimes + a separate revocation list, or by going stateful.
- "Mass assignment is only a Ruby/Rails problem" — exactly the same problem in ASP.NET Core when binding to entities directly. DTOs are non-negotiable at API boundaries.
- "PQC is needed today" — not yet in production. Awareness today, migration plan within 5-10 years.
- "Logging the request object is fine for debugging" — if the request includes credentials / tokens, you've just leaked them to your logging sink. Add structured-log filters or use redacting types.

**What follows from this topic**

Security ties into ASP.NET Core (Q66 — captive dependencies in auth services), Entity Framework Core (Q76 — DTOs to prevent mass assignment via projection), Serialization (Q64 — `BinaryFormatter` removal was a security action), Architecture Patterns (Q100b — vertical slice with feature-local DTOs), Native AOT (Q103 — Mapperly is AOT-friendly mapping). If a candidate's security story is "we have HTTPS," expect senior interviewers to keep probing until they hit something the candidate hasn't thought about.

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

### Summary

**What this topic covers**

The big-picture design choices senior .NET interviews probe — and the 2025-2026 ecosystem churn that changed the default answers. The 7 questions in this section span the senior architectural vocabulary. Four concern areas: (1) **mediator and messaging** — MediatR going commercial in 2025 and the OSS replacements (Mediator, Wolverine, Brighter, or hand-rolled handlers); MassTransit as the broker abstraction layer over RabbitMQ / Azure Service Bus / SQS / Kafka; (2) **domain modelling** — DDD tactical patterns mapped to C# (Entities, Value Objects, Aggregates, Domain Events, Repositories, Specifications); the senior judgement of when DDD's complexity pays off; (3) **architectural style** — vertical slice vs clean/onion/hexagonal for greenfield APIs; repository pattern over EF Core (often noise); CQRS (only when read/write models diverge); the monolith-vs-microservices seasoned answer; (4) **event sourcing** — Marten (Postgres-backed) and EventStoreDB/KurrentDB as the .NET stack; when full audit history justifies the cost. The 7 questions are exactly the territory a senior interviewer probes when the candidate says "I architected a system" on their resume.

**Mental model**

Three principles frame modern .NET architecture. (1) **Pick complexity that matches the domain**. Clean architecture, CQRS, event sourcing, microservices — all costly. Each pays off only when the domain has the corresponding pressure: clean architecture for genuinely rich domain logic; CQRS when reads dominate writes 10×+ *and* the models diverge; event sourcing when audit history is a real requirement; microservices when team-independence pressure justifies the operational cost. The seasoned answer to "monolith vs microservices" is **start with a modular monolith with clear bounded contexts; extract services when team/scale/independence pain justifies the cost.** Extracting early "to future-proof" without the deployment/observability/team structure to support distributed systems is the canonical mistake. (2) **Vertical slices beat layered architecture for greenfield APIs**. Each endpoint is a folder with its own request, handler, validator, response — self-contained, easy to add/remove, low cognitive load. Clean architecture's layered model (Domain / Application / Infrastructure / Presentation) wins on enforcing dependency direction but costs ceremony — every feature touches every layer. Reach for clean only when domain logic is rich enough to warrant the separation. (3) **Watch the ecosystem licensing**. MediatR moved to commercial in 2025; replacements are **Mediator** (source-generated, near-zero overhead, free), **Wolverine** (mediator + messaging + sagas + outbox, broader scope), or hand-rolled handlers (~30 lines for a single service). The senior signal is knowing the licensing situation and picking based on team scale — for a single-service API, hand-rolled handlers beat any framework. **MassTransit** is the abstraction layer when you want broker portability + sagas + outbox + OTel observability across services. The fourth shift: **DDD tactical patterns map cleanly to C#** — Value Objects are `readonly record struct`, Entities are classes with identity, Aggregates are entity clusters with one root enforcing invariants, Domain Events are `record` types published via a mediator, Specifications are composable `Expression<Func<T, bool>>` predicates. Knowing the mapping is the senior tell.

**Key terms**

- **MediatR (commercial 2025)** — moved to paid license; OSS replacements: **Mediator** (source-gen, free), **Wolverine** (broader scope), **Brighter**.
- **MassTransit** — messaging abstraction over RabbitMQ / Azure Service Bus / SQS / Kafka; sagas, outbox, OTel.
- **Saga** — stateful workflow persisted in DB; coordinates long-running, multi-step processes across services.
- **Outbox pattern** — write message-to-publish into the same transaction as the domain change; separate worker publishes; eventual consistency without lost messages.
- **DDD tactical patterns** — Entity, Value Object, Aggregate (Root), Domain Event, Repository, Specification.
- **Aggregate Root** — only externally-referenced entity in an aggregate; invariants enforced here.
- **Vertical slice** — feature-oriented folder structure; each endpoint self-contained.
- **Clean / Onion / Hexagonal** — layered architecture enforcing inward dependency direction; ceremony-heavy.
- **Repository pattern over EF Core** — often leaky; useful when collecting domain queries on an aggregate root.
- **CQRS** — separate read and write models; pays off when reads dominate and models diverge.
- **Modular monolith** — bounded contexts as internal modules; the seasoned starting point.
- **Event sourcing** — store events as the source of truth, project read models from the event stream.
- **Marten** — Postgres-backed document + event store; very ergonomic in .NET.
- **EventStoreDB / KurrentDB** — purpose-built event store; multi-language; KurrentDB is the OSS continuation.
- **Mapperly** — source-generated DTO ↔ entity mapping; AOT-friendly AutoMapper replacement.

**Why interviewers ask this**

Three signals. (1) **Ecosystem currency** — Q98 (MediatR commercial) and Q103 reference to AutoMapper-style reflection libraries being AOT-hostile test whether the candidate has tracked the 2024-2025 licensing and AOT-readiness churn. A candidate still defaulting to MediatR + AutoMapper hasn't been paying attention. (2) **Architectural taste** — Q100b (vertical slice vs clean), Q100c (repository pattern over EF), Q100d (CQRS), Q100e (monolith → microservices) probe whether the candidate has *opinions* shaped by production experience. The senior answer to each is "it depends, here's the trigger that flips my default" — not "always X." The wrong answer is reflexive clean architecture for every greenfield API, or reflexive microservices for "scalability." (3) **DDD fluency** — Q100 (tactical patterns mapped to C#) sorts candidates who've read *Implementing Domain-Driven Design* from candidates who've heard the term. The mapping to `readonly record struct` for Value Objects is a recent senior idiom. The wrong answer is "DDD just means rich models" or "we use DDD everywhere."

**Common confusions**

- "Always use clean architecture" — only for genuinely rich domain logic. Vertical slice + thin shared kernel beats clean for typical CRUD-with-business-rules APIs.
- "Repository pattern is always good practice" — over EF Core it's often noise. EF's `DbContext` *is* a unit of work; `DbSet<T>` *is* a repository.
- "CQRS just means MediatR commands and queries" — it isn't. Real CQRS means *different read and write models*, often different databases. Using MediatR doesn't make you CQRS.
- "Microservices are inherently scalable" — they shift complexity from in-process method calls to network calls. Without the operational stack (observability, deploy automation, on-call), they make things worse.
- "Event sourcing is just an audit log" — it's the source of truth. Snapshotting, schema evolution of events, replayability of projections all become first-class concerns.
- "MediatR is a hard dependency for clean architecture" — it isn't. You can hand-roll a mediator in ~30 lines. The pattern matters, not the library.
- "MassTransit is required for any messaging" — for simple single-broker producer/consumer, raw client + a thin wrapper is often clearer. MassTransit shines on sagas and multi-broker portability.

**What follows from this topic**

Architecture patterns sit on top of everything else. ASP.NET Core (Q65-73 — Minimal APIs make vertical slice trivial). Entity Framework Core (Q74-80 — the repository-over-EF debate). Concurrency (Q19-28 — MassTransit consumers are async handlers). Observability (Q91-93 — tracing across MassTransit and saga boundaries). Native AOT (Q103 — Mapperly replaces AutoMapper, source-gen mediator replaces MediatR). If a candidate's architecture story is "we use clean architecture," expect senior interviewers to ask *why* — what triggered that choice over vertical slice, what alternatives were considered, what would make them change.

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

### Summary

**What this topic covers**

Native AOT is the deployment model that brings .NET into territory previously owned by Go and Rust — small native binaries, fast cold start, no JIT, no runtime IL. The 4 questions in this section cover the senior territory. Four concern areas: (1) **the model** — what Native AOT is (closed-world compilation, no JIT, severe reflection restrictions), and its tradeoffs (3× smaller binary, 10× faster cold start, 50% less working set vs reduced reflection capability); (2) **the trimmer** — IL trimming removes statically-unreachable code; trim warnings (`IL2026`, `IL2070`) flag reflection patterns the trimmer can't analyse; annotations (`[RequiresUnreferencedCode]`, `[DynamicallyAccessedMembers]`) tell the trimmer what to preserve; (3) **the AOT-compatibility landscape in 2026** — older AutoMapper / Newtonsoft / Castle.DynamicProxy / older Moq are AOT-hostile; modern alternatives are Mapperly, System.Text.Json source-gen, source generators broadly, EF Core 10 (fully AOT-compatible); (4) **container publishing** — `dotnet publish -t:PublishContainer` builds and pushes OCI images without a Dockerfile; .NET 10 default base is Ubuntu chiseled (distroless). The 4 questions are the AOT readiness assessment a senior interviewer applies to candidates targeting serverless, CLI tools, or minimal-footprint container deploys.

**Mental model**

Native AOT is **closing the world at compile time**. Standard .NET is open-world: at runtime, the CLR can load any assembly via `Assembly.LoadFrom`, instantiate any type via `Activator.CreateInstance(type)`, emit IL via `Reflection.Emit`, and JIT-compile new code as needed. AOT removes all of this — the publish step walks every statically-reachable type and method from the entry point, compiles them to native code, and discards the rest. The result: a single native executable, no JIT, no IL at runtime, no dynamic assembly loading. Benefits: ~3× smaller binary, ~10× faster cold start (no JIT warmup), ~50% smaller working set, ahead-of-time error detection of dependency issues. Costs: a closed-world model that breaks any library relying on runtime reflection or IL emit. The trimmer is the enforcement mechanism — it analyses the call graph, removes unreachable code, and emits **trim warnings** for patterns it can't analyse safely (typically reflection over `Type.GetMethod("Foo")` where the string is opaque to static analysis). You respond to warnings either with annotations (`[DynamicallyAccessedMembers(...)]` to preserve specific members, `[RequiresUnreferencedCode("Reason")]` to mark a method as "this uses reflection, callers beware") or by replacing reflection with source generators. **Zero trim warnings is the AOT-ready bar.** The 2026 AOT-compatibility landscape has matured: System.Text.Json source-gen, `[LoggerMessage]`, `[GeneratedRegex]`, Mapperly, EF Core 10, ASP.NET Core Minimal APIs with `TypedResults`, `[LibraryImport]` for P/Invoke — all AOT-friendly. The remaining AOT-hostile libraries are mostly the runtime-reflection-heavy classics (older AutoMapper, Newtonsoft with reflection, Castle.DynamicProxy used by older Moq) — find a non-emit alternative or skip AOT. **`dotnet publish -t:PublishContainer`** is the .NET 10 default container publish — no Dockerfile, picks Ubuntu chiseled (distroless) as the base, proper layer caching driven by build output.

**Key terms**

- **Native AOT** — `<PublishAot>true</PublishAot>`; closed-world compile to native binary; no JIT, no IL at runtime.
- **Closed world** — every reachable type/method known statically; no runtime assembly loading or type discovery.
- **IL trimmer** — removes statically-unreachable code; emits trim warnings when reflection patterns can't be analysed.
- **Trim warning (`IL2026`, `IL2070`, ...)** — code patterns that may break under trimming; address with annotations or source-gen alternative.
- **`[RequiresUnreferencedCode("Reason")]`** — marks method as "uses reflection, callers beware"; propagates warnings up.
- **`[DynamicallyAccessedMembers(...)]`** — annotation on a `Type` parameter telling the trimmer to preserve specific members.
- **R2R (ReadyToRun)** — different from AOT; precompiled native alongside IL; JIT still active.
- **Mapperly** — source-generated mapping; AOT-friendly AutoMapper replacement.
- **`[LibraryImport]`** — source-generated P/Invoke; AOT-compatible; replaces `[DllImport]` in new code.
- **EF Core 10 AOT** — fully AOT-compatible for most providers; the long-standing gap is closed.
- **`PublishContainer`** — `dotnet publish -t:PublishContainer`; build and push OCI image without Dockerfile.
- **`<ContainerBaseImage>`** — csproj property setting base image; .NET 10 default is `mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled`.
- **Chiseled / distroless** — minimal base image with no shell or package manager; reduced attack surface.

**Why interviewers ask this**

Three signals. (1) **AOT-readiness assessment** — Q101 (one-paragraph AOT) and Q102 (trim warnings) test whether the candidate has actually shipped an AOT app. Anyone who's published with `<PublishAot>true</PublishAot>` has dealt with trim warnings and knows the workflow: read the warning, find the reflection pattern, replace with source-gen or annotate. (2) **Library taste** — Q103 (AOT-incompatible in 2026) probes whether the candidate has internalised the source-generator-everywhere worldview. The right answer lists the AOT-hostile classics (older AutoMapper, Newtonsoft reflection, older Moq via Castle.DynamicProxy) and their modern replacements (Mapperly, STJ source-gen, NSubstitute). (3) **Deployment fluency** — Q103b (container publishing) tests whether the candidate has tracked the .NET 10 deployment story. `PublishContainer` without a Dockerfile, chiseled base image, reproducible builds — these are 2026 idioms.

**Common confusions**

- "Native AOT just makes startup faster" — it also closes the world. Source-gen everywhere, restricted reflection, no runtime IL emit.
- "AOT and R2R are the same" — R2R precompiles IL to native alongside IL; the JIT still runs. AOT removes the JIT entirely.
- "All libraries work under AOT" — no. Anything relying on runtime reflection or IL emit (older AutoMapper, Newtonsoft, Castle.DynamicProxy) breaks unless it has a source-gen alternative.
- "Trim warnings are advisory" — they're indicators of code that *may break at runtime*. Treat them as errors for AOT-ready builds.
- "EF Core can't be used with AOT" — pre-.NET 10 only partially; **EF Core 10 is fully AOT-compatible** for most providers.
- "AOT is only for CLI tools" — also serverless (Lambda cold starts), sidecars, gRPC services, minimal APIs with source-gen JSON.
- "Container publishing requires a Dockerfile" — not in .NET 10. `dotnet publish -t:PublishContainer` builds and pushes directly.
- "Chiseled images are exotic" — they're the .NET 10 *default* base. Distroless equivalent with no shell, minimal attack surface.

**What follows from this topic**

Native AOT is the integration topic that touches everything. Generics & Type System (Q45 — reflection vs AOT). Serialization (Q63 — source-gen JSON is AOT-mandatory). ASP.NET Core (Q68 — Minimal APIs with `TypedResults` are AOT-friendly). Entity Framework Core (Q79 — EF Core 10 fully AOT). Observability (Q90 — `[LoggerMessage]` is AOT-friendly). Architecture Patterns (Q98 — source-gen mediator like Mediator over MediatR; Q100 — Mapperly over AutoMapper). If a candidate says "we want AOT" without addressing the library implications, expect senior interviewers to probe the dependency list.

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

### Summary

**What this topic covers**

Native interop — calling C/C++ libraries from C# and exposing C# functions to native callers. The 2 questions in this section are short but cover the senior P/Invoke vocabulary. Two concern areas: (1) **marshalling and blittability** — the runtime cost difference between blittable types (identical managed/native layout, zero-copy) and non-blittable types (stub-generated conversion), and how to design interop structs for the fast path; (2) **function pointers** — `delegate*<T>` (C# 9+) as the typed, allocation-free alternative to `Marshal.GetDelegateForFunctionPointer`, paired with `[UnmanagedCallersOnly]` for exposing managed callbacks to native callers. The 2 questions are tight but they're the senior interview filter for any role that touches native libraries: video/audio processing, OS integration, hardware drivers, FFI to C++ libraries, custom JITs, game engines.

**Mental model**

Two principles frame modern .NET interop. (1) **Blittable means free**. A blittable type has identical representation in managed and native memory — `int`, `long`, `float`, `double`, `IntPtr`, `byte`, `nuint`, structs containing only blittable fields with `LayoutKind.Sequential`. When you call a P/Invoke with a blittable struct, the runtime hands the native side a pointer — no copy, no conversion, no allocation. Non-blittable types (`string`, `bool` historically, complex structs with managed references) require **stub-generated conversion** — copy/transform/free. Hot interop paths are designed around blittable types: use `byte` instead of `bool`, pass strings as `byte*` + length or `ReadOnlySpan<byte>` when feasible, prefer fixed-size struct fields over object references, mark structs `[StructLayout(LayoutKind.Sequential, Pack = N)]` to match the native layout exactly. The second mental shift is the **`[LibraryImport]` modernisation** (covered in Memory Management Q15) — source-generated marshalling stubs that are faster than runtime-emitted ones, AOT-friendly, and give compile-time diagnostics on bad marshalling. Always prefer in new code. (2) **Function pointers replace delegate marshalling on the hot path**. `Marshal.GetDelegateForFunctionPointer<TDelegate>(ptr)` allocates a delegate object and creates a managed-to-native stub on every call. `delegate* unmanaged<int, int>` is a typed function pointer — direct call, no allocation, no stub, lowest possible interop overhead. Pair with `[UnmanagedCallersOnly]` on managed functions you want to expose to native callers (callbacks from a C library, vtable entries) — the runtime emits an unmanaged entry point that native code can call directly. Niche but transformative: custom JITs, FFI to high-throughput C++ libraries (graphics, audio, video codecs), embedding .NET runtimes in native hosts. For ultra-short native calls (microseconds), add `[SuppressGCTransition]` to skip the GC transition (no managed-to-native frame switch) — only safe for fast, non-blocking native calls because the runtime can't interrupt the call for a GC.

**Key terms**

- **Blittable** — type with identical managed/native layout; zero-copy marshalling.
- **Non-blittable** — type requiring conversion (e.g. `string`, complex structs); stub-generated copy/transform.
- **`[StructLayout(LayoutKind.Sequential)]`** — fields laid out in declaration order; default for structs.
- **`[StructLayout(LayoutKind.Explicit)]` + `[FieldOffset(N)]`** — manual layout for unions and exact native binding.
- **`[LibraryImport]`** — .NET 7+; source-generated P/Invoke; AOT-friendly; replaces `[DllImport]`.
- **`[DllImport]`** — legacy P/Invoke; runtime-emitted stub via reflection; works everywhere but not AOT-friendly.
- **`[UnmanagedCallersOnly]`** — marks a managed method as a native entry point; callable from native code as a function pointer.
- **`delegate*<T>`** — C# 9+; typed function pointer; no allocation, no delegate wrapper.
- **`delegate* unmanaged<T>`** — function pointer with the unmanaged calling convention.
- **`Marshal.GetDelegateForFunctionPointer<T>`** — legacy bridge; allocates a delegate; slower than `delegate*<T>`.
- **`[SuppressGCTransition]`** — skip GC transition for ultra-short native calls; only for fast, non-blocking native code.
- **`SafeHandle`** — wraps a native resource; handles finalization, thread safety, ref counting; the safe interop primitive.
- **Pinning** — `fixed` statement or `GCHandle.Alloc(obj, GCHandleType.Pinned)`; prevents GC from moving the object while native code holds the pointer.

**Why interviewers ask this**

Three signals. (1) **Specialty filter** — interop is a senior-specialty topic. Most candidates have never written P/Invoke; the ones who have are valuable for roles touching native libraries (media, hardware, OS integration, game tooling). The Q104 blittability question separates "I've called a single LibraryImport once" from "I design interop structs for the hot path." (2) **Performance reasoning** — Q105 (function pointers) tests whether the candidate has profiled an interop hot path. Anyone who's discovered `Marshal.GetDelegateForFunctionPointer` is the bottleneck and switched to `delegate*<T>` has lived the issue. The senior tell includes `[UnmanagedCallersOnly]` for the callback direction. (3) **AOT alignment** — `[LibraryImport]` over `[DllImport]` is the AOT-friendly choice. Candidates who reflexively reach for `[LibraryImport]` have internalised the AOT story across the codebase. (4) Bonus signal: knowing `[SuppressGCTransition]` exists and what its safety conditions are — a niche optimisation only seasoned interop engineers have applied.

**Common confusions**

- "Strings are blittable" — they're not. `string` is a managed reference type with a UTF-16 layout; marshalling to `char*` or `byte*` requires copy/conversion.
- "`bool` is blittable" — historically not (Win32 `BOOL` is 4 bytes, .NET `bool` is 1 byte). Use `[MarshalAs(UnmanagedType.U1)]` or `byte` for predictable layout.
- "`[LibraryImport]` and `[DllImport]` are interchangeable" — `[LibraryImport]` is source-generated and AOT-friendly; `[DllImport]` is runtime-emitted. Prefer LibraryImport in new code.
- "Function pointers are unsafe" — `delegate*<T>` requires `unsafe` context, but it's not categorically more dangerous than a `[DllImport]` — both call native code.
- "Pinning is automatic" — only with `fixed` for the duration of the statement, or `GCHandle.Alloc(..., Pinned)` explicitly. Crossing async boundaries with pinned objects breaks; use `Memory<T>` with a pinned slice and pass the pointer synchronously.
- "`[SuppressGCTransition]` always helps" — only for very short native calls (microseconds). The transition cost matters most when amortised across many calls; for long-running native code it's harmful (blocks GC).
- "`Marshal.GetDelegateForFunctionPointer` is fine" — for cold-path interop yes; for hot loops it allocates a delegate and adds a stub call. Use `delegate*<T>` on the hot path.

**What follows from this topic**

Interop ties into Memory Management (Q15 `[LibraryImport]` — same family of techniques), Native AOT & Trimming (Q103 — AOT-friendly P/Invoke is `[LibraryImport]`), CLR Internals (Q9 `SafeHandle` for native resource lifetimes). For most senior interviews this is a "if it comes up" topic — but for specialty roles (media, gaming, OS integration, hardware drivers, game engines) it's a deep-dive area where the candidate's depth determines the role-fit.

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
