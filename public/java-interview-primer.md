---
created-on: "[[Journal/2026/May/06-May-Wednesday]]"
ctime: 2026-05-06 09:00:00
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# Java Interview Primer — 100 Questions

Comprehensive Q+A primer covering any Java backend interview. Sister note to [[Java Theory - Interview Reference]] (which is JPM-tuned). This one is general-purpose — FAANG, fintech, regulated banking, generic Spring shop.

Each answer is interview-shaped: 2–6 sentences, code where useful, no textbook padding. Skim by section, deep-dive on anything unfamiliar.

**Sections:**
1. [[#Core Java Fundamentals]] (15)
2. [[#Java 8+ Features]] (10)
3. [[#Collections Framework]] (10)
4. [[#Multithreading & Concurrency]] (15)
5. [[#Memory Management & Performance]] (10)
6. [[#Spring Framework]] (10)
7. [[#Database & JPA/Hibernate]] (8)
8. [[#Design Patterns & Architecture]] (8)
9. [[#Testing & Quality]] (5)
10. [[#System Design & Best Practices]] (9)
11. [[#Security]] (10)
12. [[#Kafka & Messaging]] (7)
13. [[#JPA & Spring Data Extras]] (6)
14. [[#Testing Deep Dive]] (6)
15. [[#Common Java Pitfalls]] (6)

---

## Core Java Fundamentals

### Q1. Explain the difference between JDK, JRE, and JVM.

**JVM (Java Virtual Machine)** — the runtime that executes bytecode. Per-platform implementation (HotSpot, OpenJ9), provides class loading, bytecode verification, JIT compilation, and garbage collection. The "write once, run anywhere" abstraction lives here.

**JRE (Java Runtime Environment)** — JVM + standard library + supporting files. What you need to *run* a Java app. Largely deprecated as a separate distribution since Java 11 — the JDK is now the standard download.

**JDK (Java Development Kit)** — JRE + compiler (`javac`) + tools (`jar`, `javadoc`, `jdb`, `jshell`). What you need to *develop* Java apps. Modern JDKs (Temurin, Corretto, Zulu) ship the runtime inside the JDK; no separate JRE.

### Q2. What are the main principles of OOP and how does Java implement them?

**Encapsulation** — bundle data + behaviour, hide internals via access modifiers (`private`, `package-private`, `protected`, `public`).

**Inheritance** — `extends` for single-class inheritance, `implements` for multiple interfaces. No multiple inheritance of state.

**Polymorphism** — compile-time (overloading: same name, different params) and runtime (overriding via dynamic dispatch).

**Abstraction** — interfaces and abstract classes hide implementation behind a contract. Default methods (Java 8) let interfaces evolve without breaking implementers.

### Q3. What is the difference between abstract classes and interfaces?

| | Abstract class | Interface |
|---|---|---|
| State | Yes (fields) | Constants only (`public static final`) |
| Constructors | Yes | No |
| Methods | Abstract + concrete | Abstract + default + static + private (since 9) |
| Inheritance | Single | Multiple |
| Use when | "is-a" + shared state/impl | Capability contract, no state |

Default to interface. Reach for abstract class when you need shared mutable state, a constructor, or template-method patterns. With Java 8+ default methods the gap narrowed considerably.

### Q4. Explain the concept of immutability in Java and its benefits.

An immutable object's state cannot change after construction. `String`, `Integer`, `LocalDate`, records — all immutable.

**Benefits:**
- Thread-safe by construction — no synchronisation needed
- Safe `HashMap` keys (hash never changes)
- Cacheable (e.g. `Integer.valueOf` cache for -128..127)
- Easier reasoning — no aliasing surprises
- Failure atomicity — partial mutation can't corrupt state

Cost: every "change" allocates a new object. Mitigated by structural sharing (persistent data structures) when needed.

### Q5. What are the different types of inner classes in Java?

```java
class Outer {
    class Inner { }                    // 1. Inner (non-static nested) — has implicit Outer reference
    static class Nested { }            // 2. Static nested — no implicit reference
    void m() {
        class Local { }                // 3. Local — declared inside a method
        Runnable r = new Runnable() {  // 4. Anonymous — single-use subclass/impl
            public void run() { }
        };
    }
}
```

**Inner** — captures enclosing instance; useful for tightly-coupled helpers but causes leaks if inner outlives outer.
**Static nested** — namespacing only, no implicit reference.
**Local** — scoped to a method; can capture effectively final locals.
**Anonymous** — mostly replaced by lambdas since Java 8 unless you need extra fields/methods.

### Q6. How does the String pool work in Java?

The string pool is a JVM-managed cache of String literals, stored in the heap (since Java 7; was in PermGen pre-7).

```java
String a = "hello";          // pooled — interned at class loading
String b = "hello";          // same pooled instance — a == b is true
String c = new String("hello"); // new heap object — a == c is false
String d = c.intern();       // returns the pooled "hello" — a == d is true
```

`intern()` adds a String to the pool (or returns the existing pooled instance). Saves memory when many duplicates exist; cost is hash lookup on every call. Modern advice: rarely needed — JIT and string deduplication (G1) handle most cases.

### Q7. What is the difference between `==` and `equals()`?

- `==` — reference equality for objects (same memory address), value equality for primitives
- `.equals()` — value equality, defined by the class. Default `Object.equals` is `==`; classes override to define meaningful equality.

Always use `.equals()` for objects. The `Integer.valueOf(127) == Integer.valueOf(127)` trap (true) vs `Integer.valueOf(128) == Integer.valueOf(128)` (false, outside cache range) bites people.

### Q8. Explain method overloading vs method overriding.

**Overloading** — same name, different parameter list, same class (or inherited). Resolved at **compile time** via static binding.

```java
void print(int x) { }
void print(String x) { }       // overload — different signature
```

**Overriding** — subclass redefines a parent method with the same signature. Resolved at **runtime** via dynamic dispatch (vtable lookup).

```java
class Animal { void speak() { } }
class Dog extends Animal {
    @Override void speak() { System.out.println("woof"); }
}
Animal a = new Dog();
a.speak();   // runtime resolves to Dog.speak — "woof"
```

Always annotate overrides with `@Override` — compiler catches typos.

### Q9. What are the access modifiers in Java and their scope?

| Modifier | Class | Package | Subclass | World |
|---|---|---|---|---|
| `private` | ✓ | | | |
| (default / package-private) | ✓ | ✓ | | |
| `protected` | ✓ | ✓ | ✓ | |
| `public` | ✓ | ✓ | ✓ | ✓ |

Top-level classes can only be `public` or package-private. Default to the most restrictive that works.

### Q10. What is the diamond problem and how does Java 8 address it?

The diamond problem: with multiple inheritance, two parents define the same method — which does the child inherit?

```
   A.greet()
   /      \
  B        C   (both override greet())
   \      /
    D            // ambiguous
```

Java avoids it for *classes* by allowing single inheritance only. For *interfaces* with default methods (Java 8+), Java applies these rules:

1. **Class wins over interface.** A method from a superclass takes precedence over an interface default.
2. **More specific interface wins.** If `B extends A`, `B`'s default beats `A`'s.
3. **Otherwise compile error.** You must explicitly resolve via `Interface.super.method()`.

```java
interface A { default String greet() { return "A"; } }
interface B { default String greet() { return "B"; } }
class C implements A, B {
    @Override public String greet() {
        return A.super.greet() + B.super.greet();   // explicit
    }
}
```

### Q11. Explain the difference between `final`, `finally`, and `finalize`.

**`final`** (keyword) — three meanings:
- `final` variable: assigned once
- `final` method: cannot be overridden
- `final` class: cannot be subclassed (e.g. `String`)

**`finally`** (block) — always runs after try/catch (except `System.exit`, JVM crash, daemon kill). Used for resource cleanup; superseded by try-with-resources.

**`finalize()`** (method) — called by GC before reclaiming an object. **Deprecated since Java 9, removed in Java 18+** for `java.lang.Object.finalize`. Unreliable timing, performance penalty, can resurrect objects. Use `AutoCloseable` + try-with-resources, or `Cleaner` API.

### Q12. What is type erasure in Java generics?

Generic type information exists at compile time only. At runtime, `List<String>` and `List<Integer>` are both just `List`. The compiler inserts casts at use sites.

**Consequences:**
- Can't `new T()` — no runtime class info
- Can't `T[]` arrays — array creation is reified
- Can't have `m(List<String>)` and `m(List<Integer>)` — same erased signature
- `instanceof List<String>` won't compile; only `instanceof List` (raw)
- Compiler synthesises **bridge methods** to preserve polymorphism

Trade-off: enables generics on existing collections without breaking JDK 1.4 binary compatibility, at the cost of expressiveness.

### Q13. How do you create a custom immutable class?

1. Mark class `final` (no subclassing, otherwise subclass could add mutable state)
2. Make all fields `private final`
3. No setters; only getters
4. Initialise everything in the constructor
5. Defensive-copy mutable inputs/outputs (e.g. `Date`, mutable collections)

```java
public final class Money {
    private final BigDecimal amount;
    private final Currency currency;

    public Money(BigDecimal amount, Currency currency) {
        if (amount == null || currency == null) throw new IllegalArgumentException();
        this.amount = amount;          // BigDecimal already immutable
        this.currency = currency;
    }

    public BigDecimal amount() { return amount; }
    public Currency currency() { return currency; }
}
```

Records (Java 16+) do all this for you:
```java
public record Money(BigDecimal amount, Currency currency) { }
```

### Q14. What is the difference between static and dynamic binding?

**Static binding (early binding)** — method to call resolved at compile time. Applies to: `static`, `private`, `final` methods, and overloaded methods. Faster.

**Dynamic binding (late binding)** — method resolved at runtime via the actual object's vtable. Applies to: instance method overrides. Enables polymorphism.

```java
Animal a = new Dog();
a.speak();    // dynamic — resolves to Dog.speak() at runtime
Animal.staticMethod();  // static — resolves to Animal.staticMethod() at compile time
```

### Q15. Explain the concept of pass-by-value in Java.

**Java is always pass-by-value.** No exceptions.

For primitives, the value is copied. For objects, the **reference value** is copied — both caller and callee point to the same object.

```java
void mutate(StringBuilder sb) {
    sb.append("X");          // mutates the shared object — caller sees it
    sb = new StringBuilder(); // reassigns the local copy — caller doesn't see it
}
```

This trips people up because mutations to the shared object are visible, but reassignment isn't. The phrase "pass-by-reference" is often used loosely but is technically wrong for Java — you cannot make the caller's variable point to a different object.

---

## Java 8+ Features

### Q16. What are the main features introduced in Java 8?

- **Lambdas** — `(x, y) -> x + y`
- **Streams** — declarative pipelines over collections
- **`Optional<T>`** — explicit absence
- **Default methods on interfaces** — interface evolution without breaking implementers
- **Method references** — `String∷length`, `System.out∷println` (see Q21 for full forms)
- **`java.time` API** — `LocalDate`, `Instant`, `Duration` (replaces `Date`/`Calendar`)
- **Functional interfaces** — `Predicate`, `Function`, `Consumer`, `Supplier`
- **Nashorn JS engine** (since removed in Java 15)

### Q17. Explain functional interfaces and give examples.

A functional interface has exactly one abstract method (SAM — single abstract method). Lambdas and method references can be used wherever one is expected.

Marked with `@FunctionalInterface` for compiler enforcement.

```java
@FunctionalInterface
interface Predicate<T> { boolean test(T t); }

Predicate<String> nonEmpty = s -> !s.isEmpty();
```

Built-in (`java.util.function`):
- `Predicate<T>` — `T → boolean`
- `Function<T, R>` — `T → R`
- `Consumer<T>` — `T → void`
- `Supplier<T>` — `() → T`
- `BiFunction<T, U, R>`, `BinaryOperator<T>`, etc.

### Q18. How do lambda expressions work internally?

Lambdas are **not** anonymous inner classes. The compiler emits an `invokedynamic` bytecode instruction that, on first call, asks the JVM to bootstrap a `CallSite` via `LambdaMetafactory`. The factory generates a class implementing the target functional interface and returns a method handle.

Benefits:
- No `.class` file per lambda (smaller artefacts)
- JVM can choose the most efficient strategy (e.g. cache the instance for stateless lambdas)
- Better JIT optimisation than anonymous classes

A stateless lambda (`s -> s.isEmpty()`) is typically a singleton. A stateful one (`s -> s.equals(prefix)`) creates a new instance per capture.

### Q19. What is the difference between `map()` and `flatMap()` in streams?

- **`map(Function<T, R>)`** — transforms each element. `Stream<T> → Stream<R>`.
- **`flatMap(Function<T, Stream<R>>)`** — transforms each element to a stream, then flattens. `Stream<T> → Stream<R>` (one level of unwrapping).

```java
List<List<Integer>> nested = List.of(List.of(1, 2), List.of(3, 4));
nested.stream().map(List::stream);      // Stream<Stream<Integer>> — wrong shape
nested.stream().flatMap(List::stream);  // Stream<Integer> — flattened
```

Same concept appears as `bind`/`>>=` in Haskell, `SelectMany` in LINQ. Use `flatMap` when each input maps to 0..N outputs and you want them all in one stream.

### Q20. Explain `Optional` and its proper usage patterns.

`Optional<T>` represents "value or absence" without using null. Three states: present, empty, never null.

**Use:**
- Return type when absence is meaningful (`Optional<User> findById(UUID id)`)
- Stream terminal ops (`findFirst`, `reduce`)

**Don't use:**
- Field type — adds `null`-of-`Optional` confusion, breaks JPA, not `Serializable`
- Method parameters — overload or accept nullable
- Inside collections — wrap the collection, not its elements

```java
Optional<User> user = repo.findById(id);
String name = user.map(User::name).orElse("unknown");
user.ifPresent(this::sendEmail);
User u = user.orElseThrow(() -> new NotFoundException(id));
```

Avoid `Optional.get()` without first checking — it's basically a glorified null deref.

### Q21. What are method references and their types?

Shorthand for lambdas that just call an existing method. Four forms:

| Form | Example | Equivalent lambda |
|---|---|---|
| Static method | `Integer∷parseInt` | `s -> Integer.parseInt(s)` |
| Bound instance | `System.out∷println` | `x -> System.out.println(x)` |
| Unbound instance | `String∷length` | `s -> s.length()` |
| Constructor | `ArrayList∷new` | `() -> new ArrayList<>()` |

Reads cleaner than the equivalent lambda, makes intent obvious.

### Q22. How do default and static methods in interfaces work?

**Default methods** — concrete implementations on interfaces, inherited by implementers.

```java
interface Greeter {
    default String greet() { return "Hello"; }
}
```

Purpose: let interfaces evolve (`Collection.stream()`, `Iterator.remove()`) without forcing every implementer to update. Diamond problem rules apply (Q10).

**Static methods on interfaces** (Java 8) — utility methods scoped to the interface, can't be inherited or overridden.

```java
interface Comparator<T> {
    static <T> Comparator<T> comparing(Function<T, ?> key) { ... }
}
```

Replaces utility classes like `Collections.unmodifiableList()` with members directly on the interface.

### Q23. What improvements were made to the Date/Time API?

`java.util.Date` and `java.util.Calendar` were broken: mutable, not thread-safe, confusing month indexing (0-based), `Date` confused instant with calendar date.

`java.time` (Java 8, JSR-310, inspired by Joda-Time) fixed it:

- **Immutable** — every operation returns a new object
- **Thread-safe** by construction
- **Type-precise**: `LocalDate` (no time, no zone), `LocalTime` (no date, no zone), `LocalDateTime` (no zone), `ZonedDateTime`, `OffsetDateTime`, `Instant` (UTC epoch), `Duration` (time span), `Period` (calendar span)
- **Fluent API** — `now.plusDays(7).withHour(9)`
- **Clock abstraction** — testable; inject `Clock` instead of using `now()` directly

```java
LocalDate dob = LocalDate.of(1990, 5, 6);
Period age = Period.between(dob, LocalDate.now());
Instant now = Instant.now();
ZonedDateTime london = now.atZone(ZoneId.of("Europe/London"));
```

### Q24. Explain the difference between intermediate and terminal operations in streams.

**Intermediate** — return a `Stream`, lazy. No work happens until a terminal operator runs. Examples: `filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`, `peek`.

**Terminal** — produce a result or side effect, eagerly run the pipeline. Examples: `collect`, `forEach`, `count`, `reduce`, `findFirst`, `anyMatch`, `toList()`.

```java
list.stream()
    .filter(x -> x > 0)        // intermediate — lazy
    .map(x -> x * 2)           // intermediate — lazy
    .toList();                 // terminal — runs the pipeline
```

A stream can only be consumed once — calling a second terminal op throws `IllegalStateException`.

### Q25. What are the key features introduced in Java 11, 14, 17, and 21?

**Java 11 (LTS, 2018)** — `HttpClient` (async, HTTP/2), `var` in lambda params, `String.isBlank/lines/repeat/strip`, `Files.readString`, removed Java EE modules.

**Java 14 (2020)** — switch expressions (final), records (preview), pattern matching for `instanceof` (preview), helpful NullPointerException, text blocks (final).

**Java 17 (LTS, 2021)** — sealed classes (final), pattern matching for `instanceof` (final), pattern matching for switch (preview), removed Applet API.

**Java 21 (LTS, 2023)** — virtual threads (final), pattern matching for switch (final), record patterns (final), sequenced collections (`getFirst`, `getLast`), structured concurrency (preview), generational ZGC.

---

## Collections Framework

### Q26. Explain the Java Collections hierarchy.

```
Iterable
 └─ Collection
     ├─ List   (ordered, indexed, allows duplicates)
     │   ├─ ArrayList, LinkedList, CopyOnWriteArrayList
     ├─ Set    (no duplicates)
     │   ├─ HashSet, LinkedHashSet, TreeSet, ConcurrentSkipListSet
     └─ Queue / Deque
         ├─ ArrayDeque, PriorityQueue, LinkedList
         ├─ BlockingQueue, ConcurrentLinkedQueue (concurrent)

Map (NOT a Collection)
 ├─ HashMap, LinkedHashMap, TreeMap
 ├─ Hashtable (legacy), ConcurrentHashMap
 └─ EnumMap, IdentityHashMap, WeakHashMap
```

`Collections` is a utility class (sort, unmodifiable, synchronized wrappers). `Map` deliberately not a `Collection` because key-value pairs aren't a single value.

### Q27. What is the difference between `ArrayList` and `LinkedList`?

| | ArrayList | LinkedList |
|---|---|---|
| Backing | `Object[]` | Doubly-linked nodes |
| Random access | O(1) | O(n) |
| Append | Amortised O(1) | O(1) |
| Insert middle | O(n) shift | O(n) walk + O(1) splice |
| Memory overhead | Low | High (prev + next per node) |
| Cache locality | Excellent | Poor |
| Implements | `List`, `RandomAccess` | `List`, `Deque` |

`ArrayList` wins ~99% of the time. `LinkedList` rarely justifies its memory and cache-miss cost. For deque/queue use, prefer `ArrayDeque` over `LinkedList`.

### Q28. How does HashMap work internally?

Array of buckets (`Node[] table`), each bucket is a linked list (or red-black tree if long).

**On put:**
1. Compute hash with high-bit XOR spreading: `hash = key.hashCode() ^ (key.hashCode() >>> 16)`
2. Index into bucket: `table[hash & (n-1)]`
3. Empty bucket → create node
4. Existing → walk list. Match on key (`equals`) → replace value. No match → append node.
5. List length ≥ 8 and table size ≥ 64 → treeify bucket (red-black tree)
6. After insert, if `size > capacity * 0.75` → resize (double + rehash)

**Constants:** initial capacity 16, load factor 0.75, treeify threshold 8, untreeify threshold 6, min tree capacity 64. Capacity must be a power of 2 so `hash & (n-1)` works as fast modulo.

### Q29. What happens during a HashMap collision?

A collision = two keys hash to the same bucket index. Two unrelated keys can do this even with perfect `hashCode` (pigeonhole).

**Java 8+ resolution:**
1. New entry appended to bucket's linked list (separate chaining)
2. Lookup walks the list, comparing each entry via `.equals()`
3. If list length ≥ 8 and table ≥ 64, list converts to red-black tree → O(log n) lookup

Treeification is a defence against pathological cases — bad `hashCode`, hash-flooding attacks, or unlucky distributions. With a well-spread hash, treeification almost never triggers.

### Q30. Explain the difference between `HashMap`, `LinkedHashMap`, and `TreeMap`.

| | HashMap | LinkedHashMap | TreeMap |
|---|---|---|---|
| Backing | Hash table | Hash table + linked list | Red-black tree |
| Iteration order | Unspecified | Insertion or access order | Sorted by key |
| `get`/`put`/`remove` | O(1) avg | O(1) avg | O(log n) |
| Null keys | One | One | No (uses `Comparator`) |
| Use case | Default | LRU caches, predictable iteration | Range queries, sorted iteration |

`LinkedHashMap` with access-order mode + `removeEldestEntry` = LRU cache in 5 lines. `TreeMap` is `NavigableMap` — `floorKey`, `ceilingKey`, `subMap` for range queries.

### Q31. What is the difference between `Comparable` and `Comparator`?

**`Comparable<T>`** — natural ordering, defined by the class. One per class. The class owns its order.

```java
class User implements Comparable<User> {
    public int compareTo(User other) { return id.compareTo(other.id); }
}
```

**`Comparator<T>`** — external ordering, multiple per class, composable.

```java
Comparator<User> byName = Comparator.comparing(User::name);
Comparator<User> byNameThenId = byName.thenComparing(User::id);
list.sort(byNameThenId.reversed());
```

Use `Comparable` when there's an obvious natural order (numbers, dates, IDs). Use `Comparator` when ordering is context-dependent or you need multiple orderings.

### Q32. How does ConcurrentHashMap achieve thread safety?

**Pre-Java 8 (segment locking):** 16 segments by default, each its own mini hash table with its own lock. Concurrent writers limited to 16. Reads mostly lock-free.

**Java 8+ (CAS + per-bin synchronization):**
- Empty bin: insert via `compareAndSwap` (CAS) — fully lock-free
- Non-empty bin: `synchronized` on the head node only
- Per-bin granularity instead of per-segment → much higher concurrency
- `compute`, `computeIfAbsent`, `merge` are atomic — critical for check-and-update patterns
- Treeification still applies

Reads: never blocked. Writers contend only on the same bin. Null keys/values rejected — would create the "absent vs null-mapped" race.

### Q33. What is the difference between fail-fast and fail-safe iterators?

**Fail-fast** (`ArrayList`, `HashMap`, `HashSet`): track a `modCount` counter. Iterator throws `ConcurrentModificationException` if the underlying collection mutates during iteration. Detection, not prevention. Fires even single-threaded if you mutate during for-each.

**Fail-safe** (`CopyOnWriteArrayList`, `ConcurrentHashMap`): iterate over a snapshot or with weak consistency. No exception; you may not see concurrent modifications.

```java
// fail-fast: throws CME
for (var e : list) { if (e.equals(target)) list.remove(e); }
// safe alternatives: iterator.remove() or list.removeIf(...)
```

### Q34. When would you use a TreeSet vs HashSet?

**`HashSet`** — default. O(1) avg add/contains/remove, unordered, allows one null. Use when you only care about membership and uniqueness.

**`TreeSet`** — O(log n) ops, sorted (`Comparable` or `Comparator`), `NavigableSet` for range/floor/ceiling queries. Use when you need ordered iteration, range queries, or "find next greater than X".

```java
TreeSet<Integer> sorted = new TreeSet<>(List.of(5, 1, 3, 2));
sorted.first();         // 1
sorted.ceiling(3);      // 3
sorted.headSet(3);      // [1, 2]
```

`LinkedHashSet` is the middle ground: O(1) ops + insertion-order iteration.

### Q35. Explain the difference between `Queue` and `Deque` interfaces.

**`Queue`** — FIFO. Operations: `offer` (add), `poll` (remove head), `peek` (read head). One end for adds, the other for removes.

**`Deque`** (double-ended queue) — operations on both ends: `offerFirst`/`offerLast`, `pollFirst`/`pollLast`, `peekFirst`/`peekLast`. Subtype of `Queue`.

`Deque` can act as a queue (FIFO) or a stack (LIFO via `push`/`pop`). Modern code uses `ArrayDeque` everywhere instead of `Stack` (which extends `Vector` and is a known mistake) or `LinkedList` (which is wasteful).

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
stack.pop();  // 2 — LIFO

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1); queue.offer(2);
queue.poll();  // 1 — FIFO
```

---

## Multithreading & Concurrency

### Q36. What is the difference between process and thread?

**Process** — independent execution unit with its own memory space, file handles, environment. Heavy to create. OS-level isolation.

**Thread** — execution flow within a process. Shares memory and resources with sibling threads. Cheap to create (KB-level stack vs MB-level process). Communication is just shared memory; coordination via locks, atomics, queues.

In Java: one JVM = one process; many threads inside. Virtual threads (Java 21) push the ratio further — millions of virtual threads per JVM.

### Q37. Explain different ways to create threads in Java.

```java
// 1. Extend Thread (rarely used — single-inheritance limit)
class MyThread extends Thread {
    public void run() { ... }
}
new MyThread().start();

// 2. Implement Runnable (preferred)
new Thread(() -> work()).start();

// 3. Implement Callable + ExecutorService (when you need a result)
ExecutorService exec = Executors.newFixedThreadPool(4);
Future<Integer> f = exec.submit(() -> compute());
Integer r = f.get();

// 4. CompletableFuture (composition, exception handling)
CompletableFuture.supplyAsync(this::work).thenApply(this::transform);

// 5. Virtual threads (Java 21)
Thread.startVirtualThread(() -> work());
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    exec.submit(() -> work());
}
```

Production: `ExecutorService` with explicit pool, or virtual threads for I/O-bound work. Avoid raw `new Thread()`.

### Q38. What is thread safety and how do you achieve it?

A class is thread-safe if its invariants hold under concurrent access from multiple threads, without external synchronisation.

**Strategies:**
1. **Immutability** — no state to corrupt (preferred)
2. **Confinement** — restrict state to a single thread (`ThreadLocal`, no sharing)
3. **Synchronisation** — `synchronized`, `ReentrantLock`, monitor locks
4. **Atomic primitives** — `AtomicInteger`, `AtomicReference` (lock-free CAS)
5. **Concurrent collections** — `ConcurrentHashMap`, `CopyOnWriteArrayList`
6. **Volatile** — visibility, not atomicity. Flag variables only.
7. **Thread-safe abstractions** — `BlockingQueue` for producer/consumer

Order of preference: immutability > confinement > concurrent collections > atomics > locks. Locks are last resort because they're easy to misuse.

### Q39. Explain the difference between synchronized method and synchronized block.

**Synchronized method:**
```java
public synchronized void m() { ... }    // locks `this`
public static synchronized void s() { } // locks `SomeClass.class`
```

**Synchronized block:**
```java
synchronized (lockObject) { ... }       // locks an explicit target
```

Differences:
- **Granularity** — method locks the entire body; block locks only the wrapped section
- **Lock target** — method always locks `this` (or `Class`); block lets you choose
- **Best practice** — prefer block on a private final lock object. Avoids hostile callers acquiring your `this` lock externally and causing deadlocks.

```java
private final Object lock = new Object();
synchronized (lock) { ... }    // safer than synchronized(this)
```

### Q40. What is deadlock and how do you prevent it?

Deadlock: two+ threads each holding a resource the other needs, blocking forever.

**Coffman's 4 necessary conditions** (all required):
1. Mutual exclusion — resources non-shareable
2. Hold-and-wait — thread holds one, waits for another
3. No preemption — can't forcibly take a held resource
4. Circular wait — cycle in the resource graph

**Prevention:**
- **Lock ordering** — acquire locks in a globally consistent order (e.g. by object id). Breaks circular wait.
- **`tryLock` with timeout** — back off and retry, breaks hold-and-wait
- **Single global lock** — coarse but eliminates the problem
- **Lock-free** — atomics, CAS, immutable data
- **Don't hold locks across external calls** — to other beans, network, callbacks

Diagnose with thread dump (`jstack`) — JVM detects deadlocks and reports them.

### Q41. What is the difference between `wait()` and `sleep()`?

| | `wait()` | `sleep()` |
|---|---|---|
| Defined on | `Object` | `Thread` |
| Releases monitor | Yes | No |
| Wakes via | `notify`/`notifyAll`/timeout/interrupt | Timeout/interrupt |
| Must hold monitor | Yes (`synchronized` block) | No |

```java
synchronized (lock) {
    while (!condition) lock.wait();  // releases lock, waits to be notified
}

Thread.sleep(1000);   // doesn't release any held lock
```

Modern equivalents: `Condition.await()` paired with `ReentrantLock`; or `BlockingQueue` for producer/consumer instead of raw `wait`/`notify`.

### Q42. Explain `volatile` keyword and its use cases.

`volatile` provides:
- **Visibility** — writes immediately visible to all threads (no per-CPU caching)
- **Ordering** — establishes happens-before; prevents reorder across the volatile op
- **NOT atomicity** — `volatile int x; x++` is still a race

**Use cases:**
- Flag variables — one writer, many readers (`volatile boolean shutdown`)
- Double-checked locking — required for the lazy-init field
- Publishing immutable references — make a fully-constructed object visible

```java
private volatile boolean running = true;
public void stop() { running = false; }
public void run() { while (running) { ... } }   // sees `false` immediately
```

For atomic increments use `AtomicInteger`. For richer state, use locks or atomic references.

### Q43. What are atomic classes and when do you use them?

Classes in `java.util.concurrent.atomic` providing **lock-free** atomic operations via CAS (compare-and-swap):

- `AtomicInteger`, `AtomicLong`, `AtomicBoolean`, `AtomicReference<T>`
- `AtomicIntegerArray`, `AtomicReferenceArray<T>`
- `LongAdder`, `LongAccumulator` — high-contention counters with per-thread cells

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();              // atomic
counter.compareAndSet(5, 10);           // CAS — only writes if current is 5
counter.updateAndGet(x -> x * 2);       // arbitrary atomic transform
```

Use when:
- Single-variable updates are the contention point
- You want lock-free for performance under contention

For high-volume counters (metrics, stats), prefer `LongAdder` — `AtomicLong` becomes a contention bottleneck because every CAS retries.

### Q44. How does ThreadLocal work?

`ThreadLocal<T>` provides per-thread storage. Each thread has its own copy of the variable; reads/writes never race.

```java
private static final ThreadLocal<DateFormat> FORMAT =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

FORMAT.get().format(date);   // each thread gets its own DateFormat
```

Internally, each `Thread` has a `ThreadLocalMap` (similar to `WeakHashMap`) mapping `ThreadLocal` instances to values.

**Use cases:**
- Non-thread-safe utilities (`SimpleDateFormat` historically)
- Request-scoped context (transaction id, security context, MDC for logging)

**Memory leak hazard:** in thread pools, threads survive forever. Values stored in `ThreadLocal` outlive the request. **Always `remove()` in a `finally` block** at the end of the request.

```java
try { CTX.set(value); doWork(); }
finally { CTX.remove(); }
```

Java 21 `ScopedValue` is the modern replacement — immutable, structured, no leak risk.

### Q45. What is the Fork/Join framework?

A work-stealing thread pool (`ForkJoinPool`) optimised for divide-and-conquer recursion. Submit `RecursiveTask<V>` (returns a result) or `RecursiveAction` (no result). Each task can `fork` subtasks and `join` their results.

```java
class SumTask extends RecursiveTask<Long> {
    final int[] arr; final int lo, hi;
    SumTask(int[] arr, int lo, int hi) { ... }

    protected Long compute() {
        if (hi - lo < THRESHOLD) {
            long sum = 0;
            for (int i = lo; i < hi; i++) sum += arr[i];
            return sum;
        }
        int mid = (lo + hi) >>> 1;
        SumTask left  = new SumTask(arr, lo, mid);
        SumTask right = new SumTask(arr, mid, hi);
        left.fork();                 // schedule async
        return right.compute() + left.join();
    }
}
```

**Work stealing:** idle worker threads steal tasks from busy workers' deques. Balances load automatically.

Backs `parallelStream()` via `ForkJoinPool.commonPool()`.

### Q46. Explain the Executor framework and thread pools.

The `java.util.concurrent` framework decouples task submission from execution.

- **`Executor`** — base, single `execute(Runnable)` method
- **`ExecutorService`** — adds `submit` (returning `Future`), `invokeAll`, `invokeAny`, lifecycle (`shutdown`, `awaitTermination`)
- **`ScheduledExecutorService`** — adds `schedule` and `scheduleAtFixedRate` for delayed/periodic tasks

**Factory methods (`Executors`):**
- `newFixedThreadPool(n)` — fixed pool, **unbounded queue** (DANGER under flood)
- `newCachedThreadPool()` — unbounded threads, 60s idle, synchronous handoff
- `newSingleThreadExecutor()` — serialised, unbounded queue
- `newScheduledThreadPool(n)` — for scheduling
- `newVirtualThreadPerTaskExecutor()` — Java 21, virtual threads

**Production:** construct `ThreadPoolExecutor` directly with bounded queue + `RejectedExecutionHandler`. Factory methods hide backpressure problems.

```java
new ThreadPoolExecutor(
    coreSize, maxSize,
    keepAliveTime, SECONDS,
    new ArrayBlockingQueue<>(queueCap),
    new ThreadPoolExecutor.CallerRunsPolicy()  // backpressure to caller
);
```

### Q47. What is the difference between CountDownLatch and CyclicBarrier?

Both coordinate a fixed number of threads at a synchronisation point.

**`CountDownLatch(n)`** — one-shot. Threads call `countDown()`; one thread calls `await()` and blocks until count reaches 0. Cannot be reset.

```java
CountDownLatch latch = new CountDownLatch(3);
// 3 worker threads call latch.countDown() when done
// main thread:
latch.await();   // unblocks when all 3 finished
```

**`CyclicBarrier(n)`** — reusable. All `n` threads call `await()`; barrier releases all of them simultaneously. Can run an optional `Runnable` action when the barrier trips. Resets after each trip — usable in iterations.

```java
CyclicBarrier barrier = new CyclicBarrier(4, () -> System.out.println("phase done"));
// each of 4 threads call barrier.await() at end of phase
// all 4 unblock together, then can do next phase
```

Use `CountDownLatch` for one-time fan-in (wait for N tasks to finish). Use `CyclicBarrier` for staged parallel computation (matrix processing, simulation rounds). Modern alternative for fan-in: `CompletableFuture.allOf()`.

### Q48. How do Semaphores work in Java?

`Semaphore(permits)` — counting semaphore. Limits the number of threads accessing a resource.

- `acquire()` — block until a permit is available, then consume one
- `release()` — return a permit
- `tryAcquire(timeout)` — non-blocking with timeout

```java
Semaphore connections = new Semaphore(10);  // max 10 concurrent DB connections

void useConnection() {
    connections.acquire();
    try { /* use connection */ }
    finally { connections.release(); }
}
```

**Use cases:** rate limiting (max concurrent requests), connection pools, bounded resource access. Unlike a lock, you can release a semaphore from a different thread that acquired it.

Fair mode (`new Semaphore(n, true)`) grants in FIFO order; default is non-fair (faster, can starve).

### Q49. What is the happens-before relationship?

The Java Memory Model's core guarantee. If action A happens-before action B, then A's writes are visible to B (and A is ordered before B).

**Established by:**
- Program order within a single thread
- Monitor exit (synchronized block) happens-before subsequent monitor enter on the same lock
- `volatile` write happens-before subsequent `volatile` read of the same variable
- `Thread.start()` happens-before any action in the started thread
- `Thread.join()` — actions in the joined thread happen-before `join()` returns
- `final` field initialisation happens-before any thread sees the constructed object (provided `this` doesn't escape the constructor)
- Action that releases a `Lock` happens-before subsequent acquire of the same lock
- `Atomic` updates: writes happen-before subsequent reads of the same atomic

Without happens-before, the JVM/CPU is free to reorder reads, writes, and instructions. Lock-free code must explicitly establish happens-before via volatile or atomic ops.

### Q50. Explain CompletableFuture and its advantages.

A composable, non-blocking future. Supports chaining transformations, exception handling, timeout, combining multiple futures.

```java
CompletableFuture.supplyAsync(this::fetchUser, exec)
    .thenApply(this::enrich)                    // sync transform
    .thenCompose(u -> loadOrders(u.id()))       // flatMap (async)
    .thenCombine(latestPriceFuture, this::merge)
    .exceptionally(ex -> fallback())            // catch
    .orTimeout(2, TimeUnit.SECONDS)
    .whenComplete((result, ex) -> log(result, ex));

CompletableFuture.allOf(f1, f2, f3).join();    // wait for all
CompletableFuture.anyOf(f1, f2, f3).join();    // wait for any
```

**Advantages over `Future`:**
- Non-blocking composition — no `.get()` blocking on intermediate results
- Functional pipeline — `map`, `flatMap`, `combine`
- Exception handling
- Timeout / cancellation
- Manually completable — `complete(value)` / `completeExceptionally(ex)`

**Gotcha:** default executor is `ForkJoinPool.commonPool()` — shared with parallel streams and other library code. Always pass an explicit executor in production.

---

## Memory Management & Performance

### Q51. How does garbage collection work in Java?

Automatic memory reclamation: GC identifies objects no longer reachable from GC roots and reclaims their memory.

**GC roots** include: local variables on thread stacks, static fields, JNI references, active threads.

**Modern algorithms (G1, ZGC, Shenandoah)** all variant of mark-and-sweep:
1. **Mark** — start from roots, traverse references, mark reachable objects
2. **Sweep** (or compact) — reclaim unmarked memory; sometimes compact to defragment

**Generational hypothesis** — most objects die young. Heap divided into young + old gens. Minor GC (young) is fast and frequent; major GC (old) is slower and rare. Survivors of N minor GCs get promoted (default `MaxTenuringThreshold=15`).

Stop-the-world phases pause Java threads briefly. Concurrent collectors do most work alongside the application.

### Q52. What are the different types of garbage collectors?

| Collector | When | Pause | Notes |
|---|---|---|---|
| **Serial** | Tiny heap, single thread | Long | Embedded, client mode |
| **Parallel (Throughput)** | CPU-bound batch jobs | Long, optimised for throughput | Pre-G1 default |
| **CMS** (Concurrent Mark Sweep) | Pre-G1 low-latency | Concurrent + brief STW | **Removed in Java 14** |
| **G1** (Garbage First) | **Default since Java 9** | Predictable, tunable (`MaxGCPauseMillis`) | Region-based, mixed collections |
| **ZGC** | Low-latency, huge heaps | Sub-millisecond, even at TB | Concurrent, production-ready since Java 15. Generational since Java 21. |
| **Shenandoah** | Low-latency alternative | Sub-millisecond | Red Hat origin, in OpenJDK |
| **Epsilon** | Testing / short-lived processes | N/A — no-op GC, leaks until OOM | Java 11+ |

Default to G1. Switch to ZGC or Shenandoah when pause time is the bottleneck. Use Parallel for batch jobs where total throughput matters more than latency.

### Q53. Explain the different memory areas in JVM.

```
Heap (shared, GC-managed)
 ├─ Young Gen
 │   ├─ Eden space         (most allocations)
 │   ├─ Survivor 0
 │   └─ Survivor 1
 └─ Old Gen                (long-lived objects)

Non-heap
 ├─ Metaspace              (class metadata, native memory since Java 8)
 ├─ Code cache             (JIT-compiled methods)
 └─ Direct buffers         (off-heap NIO ByteBuffers)

Per-thread
 ├─ Stack                  (frames, locals, operand stack)
 └─ PC register            (current instruction pointer)
```

Pre-Java 8 had **PermGen** (fixed-size heap area for class metadata) — replaced by Metaspace, which lives in native memory and grows automatically.

### Q54. What is memory leak in Java and how do you detect it?

Java has GC, but leaks happen when objects stay reachable unintentionally — GC can't reclaim them.

**Common causes:**
- Static collections never cleaned (`static Map cache`)
- Listeners/observers registered but never deregistered
- `ThreadLocal` values in thread pools (always `remove()` in `finally`)
- Inner classes / lambdas capturing outer references
- Class loader leaks (dynamic classes not unloaded)
- Unclosed resources holding native buffers

**Detection:**
- **Heap dump** — `-XX:+HeapDumpOnOutOfMemoryError` or `jmap -dump:format=b,file=heap.hprof <pid>`
- **Analyse** with Eclipse MAT or VisualVM — find dominator tree, retained size, suspicious GC roots
- **Monitor** — JConsole, JMX, JFR, Prometheus heap metrics. Look for sawtooth that doesn't return to baseline.
- **Profilers** — async-profiler, Java Flight Recorder. Continuous profiling in prod is now feasible.

### Q55. What are strong, weak, soft, and phantom references?

**Strong** (default) — `Object o = new Object()`. Object lives until reference is unreachable.

**Soft** — `SoftReference<T>`. Reclaimed when JVM is under memory pressure, before throwing OOM. Use for memory-sensitive caches.

```java
SoftReference<byte[]> ref = new SoftReference<>(bigArray);
byte[] arr = ref.get();   // null if GC has reclaimed
```

**Weak** — `WeakReference<T>`. Reclaimed at the next GC cycle if no strong references exist. Use for canonical maps (`WeakHashMap`) where the key is also strongly referenced elsewhere.

**Phantom** — `PhantomReference<T>`. `get()` always returns null. Used with a `ReferenceQueue` to perform cleanup just before the object is reclaimed. Replaces `finalize()`. Backs the `Cleaner` API (Java 9+).

```java
Cleaner cleaner = Cleaner.create();
cleaner.register(myObject, () -> closeNativeResource());
```

### Q56. How do you optimize Java application performance?

**Measure first.** Don't optimise without a profiler. Theoretical bottlenecks are rarely the actual ones.

**Common gains:**
- **Allocation reduction** — fewer short-lived objects → less GC pressure (use `StringBuilder`, primitive collections from Eclipse Collections, avoid boxing)
- **Pooling for expensive objects** — connections, threads, large buffers
- **Caching** — Caffeine for in-process; Redis for distributed
- **Algorithmic complexity** — O(n²) → O(n log n) usually beats micro-optimisation
- **Concurrency** — parallel streams, CompletableFuture, virtual threads for I/O
- **JIT-friendly code** — small hot methods, polymorphic call sites with limited types
- **GC tuning** — heap sizes, collector choice
- **DB layer** — indexes, query plans, connection pool sizing, batched inserts

**Avoid:**
- Premature `parallelStream()` — overhead can dominate
- Excessive use of streams in tight loops where for-loops are faster
- Excessive synchronisation — contention is a silent killer

### Q57. What tools do you use for profiling Java applications?

**Built-in:**
- **JFR (Java Flight Recorder)** — low-overhead production profiler, always available since Java 11
- **JConsole** — basic JMX dashboard
- **VisualVM** — heap dumps, thread dumps, sampling profiler
- **`jstack`, `jmap`, `jcmd`** — CLI introspection

**Third-party:**
- **async-profiler** — best-in-class CPU/lock/wall-clock profiler. Flame graphs.
- **YourKit / JProfiler** — commercial, deep IDE integration
- **Eclipse MAT** — heap dump analysis, retained size, dominator tree
- **GCEasy / GCViewer** — GC log analysis

**Production observability:**
- **Micrometer + Prometheus** — JVM metrics
- **OpenTelemetry** — tracing + metrics + logs
- **APM** — Datadog, New Relic, Dynatrace

### Q58. Explain JVM tuning parameters you've used.

Common parameters by category:

```bash
# Heap sizing — set equal in prod to avoid resize storms
-Xms2g -Xmx2g

# Collector
-XX:+UseG1GC                          # default since Java 9
-XX:+UseZGC                           # low-latency
-XX:MaxGCPauseMillis=200              # G1 target

# Direct memory
-XX:MaxDirectMemorySize=512m

# Metaspace
-XX:MaxMetaspaceSize=256m

# OOM handling
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/heap.hprof
-XX:+ExitOnOutOfMemoryError           # let orchestrator restart pod

# GC logging (Java 9+ unified)
-Xlog:gc*:file=gc.log:time,uptime:filecount=10,filesize=100m

# JIT
-XX:+TieredCompilation                # default; ramp through C1 → C2

# Container support (auto-set memory from cgroup)
-XX:+UseContainerSupport              # default since 10
-XX:MaxRAMPercentage=75
```

In containerised deployments, prefer `-XX:MaxRAMPercentage` over fixed `-Xmx` so the JVM scales with the cgroup limit.

### Q59. What is the difference between stack and heap memory?

**Stack** — per-thread, fixed size (default 512KB-1MB), LIFO. Holds method frames: local variables, operand stack, return address. Allocation/deallocation is bump-pointer fast — just adjust the stack pointer. `StackOverflowError` on overflow.

**Heap** — shared across threads, GC-managed. Holds all objects (including local-variable references that point into the heap). Allocations are slower than stack (require GC bookkeeping). `OutOfMemoryError: Java heap space` on exhaustion.

```java
void m() {
    int x = 5;                        // x on stack (primitive)
    Object o = new Object();          // o (reference) on stack, the Object on heap
}
```

JIT escape analysis can sometimes stack-allocate or scalarise objects that don't escape the method.

### Q60. How do you handle OutOfMemoryError?

**Don't catch it in business code.** OOM means the JVM is in a degraded state — recovering is unreliable.

**Diagnose:**
1. Heap dump on first occurrence: `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp`
2. Analyse with MAT — find the dominator tree, leak suspect report
3. Check GC logs — were heaps shrinking back? Long full GCs?
4. Identify the OOM type from message:
   - **Java heap space** — likely a leak or undersized heap
   - **GC overhead limit exceeded** — death spiral, > 98% GC time
   - **Metaspace** — class loader leak (frameworks creating classes)
   - **Direct buffer memory** — unclosed `ByteBuffer.allocateDirect`
   - **Unable to create new native thread** — OS thread limit
   - **Requested array size exceeds VM limit** — > `Integer.MAX_VALUE - 8`

**Mitigate:**
- Fix the leak (most common cause)
- Increase heap if genuinely undersized
- Switch to a more memory-friendly data structure
- Add bounded caches with eviction
- Crash + restart cleanly via orchestrator: `-XX:+ExitOnOutOfMemoryError`

---

## Spring Framework

### Q61. Explain dependency injection and inversion of control.

**Inversion of Control (IoC)** — a class doesn't construct its own dependencies; the framework provides them. The class declares what it needs, the framework figures out how to give it.

**Dependency Injection (DI)** — the mechanism that implements IoC. The framework injects dependencies via constructor, setter, or field.

```java
// Without DI: hard-wired, hard to test
class OrderService {
    private final EmailService email = new SmtpEmailService();
}

// With DI: framework injects
class OrderService {
    private final EmailService email;
    OrderService(EmailService email) { this.email = email; }   // any impl works
}
```

Benefits: testability (inject mocks), decoupling (swap implementations), clear dependency graph, easier configuration.

### Q62. What are the different types of dependency injection in Spring?

**Constructor injection** (preferred):
```java
@Component
class OrderService {
    private final EmailService email;
    OrderService(EmailService email) { this.email = email; }
}
```

**Setter injection** — used for optional dependencies:
```java
@Autowired void setEmail(EmailService email) { this.email = email; }
```

**Field injection** (avoid):
```java
@Autowired private EmailService email;
```

**Why constructor wins:**
- `final` fields → immutable, thread-safe
- Dependencies explicit in signature
- Fails at construction if missing
- Easy to test without Spring context
- No reflection magic on private fields
- Detects circular dependencies at construction time

### Q63. Explain Spring Bean lifecycle.

1. **Instantiation** — Spring calls the constructor
2. **Populate properties** — setter / field injection
3. **`*Aware` interfaces** — `BeanNameAware`, `BeanFactoryAware`, `ApplicationContextAware` callbacks
4. **`BeanPostProcessor.postProcessBeforeInitialization`** — pre-init hooks
5. **`@PostConstruct`** annotation
6. **`InitializingBean.afterPropertiesSet()`**
7. **Custom init method** (`@Bean(initMethod = "...")`)
8. **`BeanPostProcessor.postProcessAfterInitialization`** — post-init hooks (proxies wrap here)
9. **In use**
10. **`@PreDestroy`** annotation
11. **`DisposableBean.destroy()`**
12. **Custom destroy method**

In practice, use `@PostConstruct` and `@PreDestroy` for app-level lifecycle. The rest is framework plumbing.

### Q64. What are the different bean scopes in Spring?

- **`singleton`** (default) — one instance per Spring container. Most common. Singleton beans must be stateless or use thread-safe state.
- **`prototype`** — new instance every injection / `getBean` call. Spring doesn't manage destruction.
- **`request`** — one per HTTP request (web only)
- **`session`** — one per HTTP session (web only)
- **`application`** — one per `ServletContext`
- **`websocket`** — one per WebSocket session

```java
@Component
@Scope("prototype")
class StatefulHelper { ... }
```

Injecting a prototype into a singleton is a common trap — singleton holds the prototype reference forever. Use `ObjectProvider<T>`, `Provider<T>`, or method injection (`@Lookup`) to get a fresh instance per use.

### Q65. How does @Transactional work internally?

Spring AOP wraps the bean in a proxy. When you call an annotated method, the call goes:

```
caller → proxy.method() → start tx → bean.method() → commit/rollback → proxy returns
```

**Default behaviour:**
- Propagation: `REQUIRED` — joins existing tx or starts new
- Isolation: `DEFAULT` (DB-defined; usually `READ_COMMITTED`)
- Rollback: only `RuntimeException` and `Error`. Checked exceptions don't roll back unless `rollbackFor` is set.
- Read-only: `false`

**Self-invocation gotcha:** `this.helper()` bypasses the proxy → annotation does nothing. Fix: split into separate beans, or call through an injected self reference.

```java
@Transactional
public void doWork() {
    helper();           // ✗ self-invocation — no proxy, no transaction
    otherBean.helper(); // ✓ goes through proxy
}
```

**Other gotchas:**
- `@Transactional` on private/final methods — ignored (proxy can't intercept)
- Default propagation `REQUIRED` joins parent tx, inheriting its rollback rules

### Q66. Explain Spring Boot auto-configuration.

`@SpringBootApplication` includes `@EnableAutoConfiguration`. On startup, Spring Boot scans `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (Spring Boot 3+; previously `spring.factories`) and applies configurations conditionally.

Each auto-config class uses `@Conditional*` annotations:
- `@ConditionalOnClass` — apply if class is on classpath (e.g. `DataSourceAutoConfiguration` if Hikari is present)
- `@ConditionalOnMissingBean` — apply if user hasn't defined their own
- `@ConditionalOnProperty` — apply if property is set

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@ConditionalOnMissingBean(DataSource.class)
class MyDataSourceAutoConfiguration {
    @Bean DataSource dataSource() { ... }
}
```

Run with `--debug` to see what was auto-configured and why. Override by defining your own beans — `@ConditionalOnMissingBean` steps aside.

### Q67. What is AOP and how is it implemented in Spring?

**AOP (Aspect-Oriented Programming)** — separates cross-cutting concerns (logging, security, transactions, metrics) from business logic via aspects.

**Vocabulary:**
- **Aspect** — module of cross-cutting behaviour
- **Join point** — a point in execution (e.g. method call)
- **Pointcut** — expression matching join points
- **Advice** — code to run at a join point (`@Before`, `@After`, `@Around`)

**Spring AOP** uses runtime proxies:
- **JDK dynamic proxy** for interfaces
- **CGLIB** for classes (subclassing — `final` classes/methods can't be proxied)

```java
@Aspect @Component
class LoggingAspect {
    @Around("execution(* com.example.service.*.*(..))")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try { return pjp.proceed(); }
        finally { log.info("{} took {}ns", pjp.getSignature(), System.nanoTime() - start); }
    }
}
```

`@Transactional`, `@Cacheable`, `@PreAuthorize` are all implemented via AOP proxies. **Self-invocation bypasses the proxy** — common gotcha.

### Q68. How do you handle exceptions in Spring applications?

**`@RestControllerAdvice` + `@ExceptionHandler`** for centralised exception → response mapping:

```java
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Problem> notFound(NotFoundException e) {
        return ResponseEntity.status(404).body(Problem.of("not_found", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Problem> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Problem.of("validation", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Problem> generic(Exception e) {
        log.error("unhandled", e);
        return ResponseEntity.status(500).body(Problem.of("internal_error", "unexpected"));
    }
}
```

Use **RFC 7807 Problem Details** for structured error responses. Spring 6 has `ProblemDetail` built in.

For non-web code, throw domain exceptions (`InsufficientFundsException`, `BookingConflictException`) — let them propagate to the boundary. Don't catch and swallow.

### Q69. Explain the difference between @Component, @Service, @Repository, and @Controller.

All are `@Component`-derived, register a Spring bean. Differences:

- **`@Component`** — generic. Use when none of the others fit semantically.
- **`@Service`** — semantic only. "Holds business logic." No functional difference from `@Component`.
- **`@Repository`** — adds **exception translation**. DB exceptions (e.g. Hibernate's `JDBCException`) get converted to Spring's `DataAccessException` hierarchy. Auto-applied via `PersistenceExceptionTranslationPostProcessor`.
- **`@Controller`** — registers as MVC controller (handler-mapping). `@RestController` = `@Controller` + `@ResponseBody` (return values serialise to JSON).

So `@Repository` does something extra; the others are documentation only.

### Q70. How does Spring Security work?

A **filter chain** sits in front of your application, intercepting every request. Each filter handles one concern:

```
Request → SecurityContextHolderFilter → UsernamePasswordAuthenticationFilter
       → JwtAuthenticationFilter → AuthorizationFilter → ... → DispatcherServlet
```

**Core concepts:**
- **`Authentication`** — proof of identity (token, principal, credentials)
- **`SecurityContext`** — per-request authentication, held in `SecurityContextHolder` (thread-local)
- **`AuthenticationManager`** — verifies credentials; delegates to `AuthenticationProvider`s
- **`UserDetailsService`** — loads user data from your store
- **`PasswordEncoder`** — `BCryptPasswordEncoder` standard
- **`AccessDecisionManager`** / `AuthorizationManager` (Spring 6) — checks permissions

**Modern config (Spring Security 6):**
```java
@Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a
            .requestMatchers("/public/**").permitAll()
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .csrf(csrf -> csrf.disable())   // for stateless APIs
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .build();
}
```

For stateless APIs (typical microservices): JWT bearer tokens, no session. For server-rendered apps: form login + session cookie + CSRF protection.

---

## Database & JPA/Hibernate

### Q71. What is ORM and its advantages?

**ORM (Object-Relational Mapping)** maps relational tables ↔ object graphs. JPA is the spec; Hibernate, EclipseLink are implementations.

**Advantages:**
- Boilerplate elimination — no manual ResultSet → object mapping
- Cross-database portability — dialect handles vendor SQL
- Lazy loading — fetch related entities on demand
- Automatic dirty tracking — modify objects, ORM generates UPDATE
- Cache layers — first-level (session) + second-level (cross-session)

**Costs:**
- "Object-relational impedance mismatch" — graphs vs tables, inheritance, identity
- N+1 query trap (Q73)
- Surprising performance — generated SQL not always optimal
- Lazy loading exceptions outside session
- Steep learning curve at the boundary

For complex reads, drop to raw SQL or jOOQ. ORM shines for CRUD; struggles with heavy joins, aggregations, batch updates.

### Q72. Explain JPA entity lifecycle states.

```
new ──persist()──> managed ──remove()──> removed
                      ↓                     ↑
                  detach()/close()         persist()
                      ↓                     
                   detached ──merge()──> managed
```

- **New / transient** — Java object exists, not associated with persistence context, no DB row
- **Managed / persistent** — associated with persistence context, changes tracked, will be flushed
- **Detached** — was managed, persistence context closed/cleared. Changes not tracked. Re-attach with `merge`.
- **Removed** — scheduled for deletion at next flush

```java
User u = new User("alice");           // new
em.persist(u);                       // managed — tracked
em.flush();                          // SQL INSERT issued
em.detach(u);                        // detached — changes not tracked
u.setName("alice2");                  // no SQL
em.merge(u);                         // managed — changes flushed
em.remove(u);                        // removed
```

Manage lifecycle correctly to avoid `LazyInitializationException` (accessing lazy field on detached entity).

### Q73. What is the N+1 problem and how do you solve it?

Loading N entities, each triggering an additional query for a related entity → 1 + N queries instead of one join.

```java
List<Order> orders = em.createQuery("FROM Order").getResultList();   // 1 query
for (Order o : orders) { o.getCustomer().getName(); }                // N queries — one per order
```

**Solutions:**
- **`JOIN FETCH`** in JPQL: `SELECT o FROM Order o JOIN FETCH o.customer`
- **`@EntityGraph`** — declarative fetch hints
- **Batch fetching** — `@BatchSize(size = 50)` — Hibernate fetches in chunks instead of one-by-one
- **Avoid `EAGER` on collections** — eager joins multiply rows; default to `LAZY` and fetch when needed

```java
@EntityGraph(attributePaths = {"customer", "items"})
List<Order> findAll();
```

Detect with Hibernate statistics, p6spy, or Datadog SQL traces. Common cause of slow listing endpoints.

### Q74. Explain different fetching strategies in Hibernate.

**`FetchType.EAGER`** (default for `@ManyToOne`, `@OneToOne`) — fetched alongside the parent in one SELECT. Simple but causes N+1 over collections; pulls more than needed.

**`FetchType.LAZY`** (default for `@OneToMany`, `@ManyToMany`) — fetched on first access via proxy. Avoids unnecessary loads but throws `LazyInitializationException` if accessed after session close.

**Tactical fetches:**
- `JOIN FETCH` in JPQL — pull related entities in same query
- `@EntityGraph` — declarative override per query
- `@BatchSize` — load related entities in batches of N

**Best practice:** default everything to `LAZY`. Override per query with `JOIN FETCH` or `@EntityGraph`. Eager-by-default is the most common JPA performance trap.

### Q75. What is the difference between first-level and second-level cache?

**First-level (L1) cache** — per `EntityManager` / `Session`. Always on, can't be disabled. Same entity loaded twice in the same session returns the same instance from cache. Lifetime = session lifetime.

**Second-level (L2) cache** — shared across sessions, application-wide. Optional, requires provider (Ehcache, Hazelcast, Infinispan, Redis via Hibernate Hibernate-OGM/JCache).

```java
@Entity
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
class Country { ... }

// Application-level config
spring.jpa.properties.hibernate.cache.use_second_level_cache=true
spring.jpa.properties.hibernate.cache.region.factory_class=jcache
```

**Use L2 for:**
- Read-mostly reference data (countries, currencies, config)
- Entities accessed frequently across requests

**Don't use L2 for:**
- Write-heavy entities (cache invalidation overhead)
- Data with strict consistency requirements
- Multi-instance deployments without distributed cache (each node has its own cache, drift inevitable)

**Query cache** (separate) — caches result lists for parameterised queries. Generally not worth it.

### Q76. How do you handle database transactions in Spring?

`@Transactional` on service methods. Spring manages begin/commit/rollback via AOP proxy.

```java
@Service
class OrderService {
    @Transactional
    public Order place(OrderRequest req) {
        Order o = repo.save(new Order(req));
        inventory.reserve(o.items());
        payment.charge(o.total());
        return o;
    }
}
```

**Configuration knobs:**
- **`propagation`** — `REQUIRED` (default), `REQUIRES_NEW` (suspend parent, start new), `NESTED` (savepoints), `MANDATORY`, `SUPPORTS`, `NEVER`
- **`isolation`** — `READ_COMMITTED`, `REPEATABLE_READ`, `SERIALIZABLE`. Trade-off between consistency and contention.
- **`readOnly = true`** — hint to ORM, can skip dirty-checking
- **`rollbackFor`** — by default only `RuntimeException` and `Error`; set `Exception.class` to roll back checked
- **`timeout`** — abort if exceeded

**Don't:**
- Hold transactions across user input or external HTTP calls
- Self-invoke (`this.method()` bypasses proxy)
- Mix `JpaTransactionManager` with native JDBC tx in the same operation

For multi-resource transactions (DB + message broker), use the **transactional outbox pattern** rather than 2PC.

### Q77. What are the different inheritance mapping strategies in JPA?

```java
@Entity
@Inheritance(strategy = InheritanceType.X)
abstract class Vehicle { ... }
```

**1. `SINGLE_TABLE`** (default) — one table with discriminator column.
- Pros: fast (no joins), simple
- Cons: nullable columns for subclass-only fields, can get wide

**2. `JOINED`** — one table per class; child tables join parent for full row.
- Pros: normalised, no null columns
- Cons: every load needs a join

**3. `TABLE_PER_CLASS`** — one table per concrete class, parent columns duplicated.
- Pros: simple per-class
- Cons: polymorphic queries `UNION` across all child tables — expensive

**4. `MAPPED_SUPERCLASS`** (different mechanism — not `@Inheritance`) — parent provides fields/columns but isn't itself an entity. No polymorphism.

**Pragmatic default:** `SINGLE_TABLE` if subclass tree is small and stable. `JOINED` if you really need normalised tables. `TABLE_PER_CLASS` rarely.

### Q78. Explain optimistic vs pessimistic locking.

| | Optimistic | Pessimistic |
|---|---|---|
| Strategy | Try, check on commit, retry on conflict | Lock first, then act |
| DB | `@Version` column + `WHERE version=?` on update | `SELECT ... FOR UPDATE` |
| JPA | `@Version`, `LockModeType.OPTIMISTIC` | `LockModeType.PESSIMISTIC_READ`/`WRITE` |
| Best for | Low contention | High contention |
| Cost of conflict | `OptimisticLockException`, retry whole tx | Other threads block |
| Risk | Thundering herd on conflict | Deadlock, lock contention |

```java
@Entity
class Booking {
    @Id UUID id;
    @Version Long version;     // optimistic
}

// Pessimistic
em.find(Booking.class, id, LockModeType.PESSIMISTIC_WRITE);
```

**Restaurant booking case:** contention is bursty and concentrated on peak slots. Pessimistic safer — bounded blocking beats retry storms. For most CRUD: optimistic is the default — cheaper, no lock-induced contention.

---

## Design Patterns & Architecture

### Q79. Which design patterns have you used in your projects?

(Adapt to your CV — these are the reliable ones to mention.)

**Strategy** — pluggable algorithms behind a common interface. Used for pricing rules, validation policies, retry strategies. Clean way to satisfy Open/Closed Principle.

**Factory / Builder** — complex object construction. Builder for objects with many optional fields; Factory for choosing concrete type at runtime.

**Observer / Pub-Sub** — event-driven decoupling. Spring's `ApplicationEventPublisher`, Kafka topics, in-process listeners.

**Decorator** — layered behaviour without inheritance. Java's I/O streams, request interceptors, Spring's `BeanPostProcessor`.

**Singleton** — shared resource via DI container. Don't roll your own — Spring beans are singletons by default.

**Adapter** — bridging interfaces. Wrapping a third-party API to match your domain interface.

**CQRS + Event Sourcing** (architectural) — separate write/read models, append-only event log. Used at Amex for the configurable interest-charging platform and event-sourcing framework.

For interview: don't list patterns abstractly — pair each with a concrete project example.

### Q80. Explain Singleton pattern and its thread-safe implementations.

Ensures one instance per class. Several implementations:

**1. Eager initialisation:**
```java
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() { }
    public static Singleton get() { return INSTANCE; }
}
```
Simple, thread-safe (class loading is atomic). Wastes memory if rarely used.

**2. Lazy with `synchronized`:**
```java
public static synchronized Singleton get() {
    if (instance == null) instance = new Singleton();
    return instance;
}
```
Thread-safe but locks on every call.

**3. Double-checked locking** (requires `volatile`):
```java
private static volatile Singleton instance;
public static Singleton get() {
    if (instance == null) {
        synchronized (Singleton.class) {
            if (instance == null) instance = new Singleton();
        }
    }
    return instance;
}
```
Lazy, mostly lock-free. `volatile` mandatory — without it, the constructor can be reordered after the assignment, exposing a half-constructed object.

**4. Holder idiom** (best for lazy):
```java
public class Singleton {
    private Singleton() { }
    private static class Holder { static final Singleton INSTANCE = new Singleton(); }
    public static Singleton get() { return Holder.INSTANCE; }
}
```
Lazy (Holder loaded on first `get`), thread-safe (class initialisation is atomic), no synchronisation overhead.

**5. Enum** (Effective Java item 3):
```java
public enum Singleton {
    INSTANCE;
    public void doSomething() { }
}
```
Best for serialisation, reflection-attack resistance, clarity.

In real code: just use a Spring bean. The plumbing is solved.

### Q81. What is the difference between Factory and Abstract Factory patterns?

**Factory Method** — one factory method creates one product type. Subclasses decide which concrete class.

```java
abstract class Notifier {
    abstract Channel createChannel();   // factory method
    void send(Msg m) { createChannel().publish(m); }
}
class EmailNotifier extends Notifier { Channel createChannel() { return new SmtpChannel(); } }
class SmsNotifier extends Notifier { Channel createChannel() { return new TwilioChannel(); } }
```

**Abstract Factory** — a factory for *families of related objects*. Each concrete factory creates a coordinated set.

```java
interface UIFactory {
    Button createButton();
    Menu createMenu();
}
class MacUIFactory implements UIFactory { ... }
class WindowsUIFactory implements UIFactory { ... }
```

The product types are different (Button + Menu), and the factory ensures consistency (Mac button + Mac menu, never mixed).

In modern Java + Spring, you often skip both — use DI to inject the right implementation directly.

### Q82. How do you implement the Observer pattern in Java?

**Manual implementation:**
```java
interface Observer<T> { void onEvent(T event); }

class Publisher<T> {
    private final List<Observer<T>> observers = new CopyOnWriteArrayList<>();
    public void subscribe(Observer<T> o) { observers.add(o); }
    public void publish(T event) { observers.forEach(o -> o.onEvent(event)); }
}
```

`CopyOnWriteArrayList` is the typical backing — safe iteration during concurrent subscribe/unsubscribe.

**JDK built-in:** `java.util.Observable` and `Observer` were deprecated in Java 9. Use `PropertyChangeListener` for legacy or `Flow` API (Java 9+ Reactive Streams).

**Modern approaches:**
- **Spring `ApplicationEventPublisher`** — in-process event bus, sync or async (`@EventListener`)
- **Project Reactor `Flux` / `Sinks.Many`** — async push streams with backpressure
- **Kafka / RabbitMQ** — distributed observer pattern, decoupled producers and consumers

For new code: don't roll your own. Use Spring events for in-process or a message broker for cross-service.

### Q83. Explain microservices architecture principles.

Decompose a monolith into small, independently deployable services around **business capabilities**.

**Principles:**
- **Single responsibility** — one service, one bounded context
- **Independent deployability** — change and ship without coordinating others
- **Decentralised data** — each service owns its database; no shared schema
- **Smart endpoints, dumb pipes** — logic in services; messaging is plain transport
- **Design for failure** — services fail in isolation; circuit breakers, retries, timeouts
- **Decentralised governance** — teams pick their own tech stack within agreed standards
- **Automation** — CI/CD, infrastructure as code, observability are non-negotiable

**Communication:**
- Sync: REST or gRPC for request/response
- Async: Kafka or other broker for events

**Costs:**
- Distributed systems are hard — eventual consistency, network failures, partial outages
- Operational complexity multiplies — N services means N deployments, N alerts, N runbooks
- Local dev harder — running 50 services for one feature is painful (use Testcontainers, contract tests)

Don't go microservices for organisational signalling. Modular monolith first, split when team or scale demands it.

### Q84. What is Domain-Driven Design (DDD)?

Software design approach by Eric Evans focused on aligning code with the **business domain**.

**Tactical patterns:**
- **Entity** — has identity, mutable through its lifetime (`User`, `Order`)
- **Value object** — defined by attributes, immutable, equals by value (`Money`, `Address`, `TimeSlot`)
- **Aggregate** — cluster of entities with one root; the root is the only entry point; consistency boundary
- **Repository** — abstraction for retrieving aggregates by id
- **Domain service** — operations not naturally on a single entity
- **Domain event** — something happened that the domain cares about

**Strategic patterns:**
- **Bounded context** — explicit boundary inside which a model is consistent. Different contexts can have different "User" models without conflict.
- **Ubiquitous language** — code, docs, conversations all use the same terms. No translation layers.
- **Context map** — relationships between bounded contexts (anti-corruption layer, shared kernel, etc.)

**Why it matters:** complex domains (banking, insurance, healthcare) have inherent complexity. DDD attacks that complexity with explicit modelling rather than fighting it with technical patterns.

### Q85. How do you ensure SOLID principles in your code?

**S — Single Responsibility:** one reason to change. `OrderValidator` validates; `OrderRepository` persists. If a class has both, split it.

**O — Open/Closed:** open for extension, closed for modification. Strategy pattern lets you add new behaviour without editing existing code.

**L — Liskov Substitution:** subtypes must be usable in place of the base without breaking callers. `Square extends Rectangle` is the textbook violation.

**I — Interface Segregation:** clients shouldn't depend on methods they don't use. Many small interfaces beat one fat one. `Readable` + `Writable` over `Stream`.

**D — Dependency Inversion:** depend on abstractions, not concretions. Inject `OrderRepository` interface, not `JpaOrderRepository`.

**Practical enforcement:**
- Constructor injection for D
- Small classes, single responsibility (~150 lines is a smell threshold)
- Interfaces at module boundaries, not everywhere
- Code review focuses on these
- Static analysis (SonarQube, ArchUnit) catches violations

Don't worship them — SOLID is heuristics, not law. Sometimes a fat interface is fine; sometimes inheritance is the right answer. Use judgment.

### Q86. What is the difference between monolithic and microservices architecture?

| | Monolith | Microservices |
|---|---|---|
| Deployment | Single artefact | Many independent services |
| Database | Shared | One per service |
| Communication | In-process calls | Network (HTTP, gRPC, message broker) |
| Failure mode | All-or-nothing | Partial — design for it |
| Scalability | Scale the whole app | Scale individual services |
| Team coordination | Centralised | Per-service teams |
| Operational cost | Low | High (orchestration, monitoring, tracing) |
| Latency | In-process (ns) | Network (ms) |
| Consistency | ACID transactions | Eventual; saga / outbox |

**Modular monolith** sits between — single deployable but with strict module boundaries, internal interfaces, possibly per-module data ownership. Often the best choice early — gives you most of the discipline without the operational tax. Split into services when team size or scale forces it.

Don't choose microservices for technical CV reasons. Choose them when independent teams can't progress without them.

---

## Testing & Quality

### Q87. What is your approach to unit testing?

**Test behaviour, not implementation.** A test that breaks when refactoring without changing behaviour is brittle.

**AAA structure** — Arrange, Act, Assert. Each test does one thing.

```java
@Test
void rejects_overlapping_booking() {
    // Arrange
    var service = new InMemoryBookingService(List.of(new Table(1, 4)));
    service.book(2, SEVEN_PM, "Alice");

    // Act
    var result = service.book(2, SEVEN_PM_30, "Bob");

    // Assert
    assertThat(result).isEmpty();
}
```

**Rules I follow:**
- Test names describe the scenario in business terms (`rejects_overlapping_booking`, not `testBook2`)
- One assertion concept per test (multiple `assertThat` is fine if they verify the same thing)
- No shared mutable state between tests (`@BeforeEach` for fresh fixtures)
- Mock at architectural boundaries (HTTP, DB), not internal collaborators
- Fast (< 100ms) — slow tests don't get run
- Independent (any order, any subset)
- Use builders / factories for test data, not fixtures with magic numbers
- Property-based testing for invariants (jqwik) where domain has rules

**Coverage** is a side effect, not a goal. 100% line coverage with bad tests is worse than 70% with meaningful ones.

### Q88. Explain the difference between mocking and stubbing.

**Stub** — replaces a collaborator with a fixed response. Used when you don't care how it's called, only that it returns something.

```java
when(repo.findById(id)).thenReturn(Optional.of(user));
```

**Mock** — a stub that *also* records interactions for verification. Used when the test needs to assert behaviour ("did the service call repo.save with these args?").

```java
verify(repo).save(any(Order.class));
verify(emailService, times(1)).send(...);
```

**Spy** — a real object with selected methods stubbed. Useful for legacy code; avoid when possible — usually means the design is hard to test.

**Fake** — working implementation, simpler than the real thing (`InMemoryRepository`, in-memory cache). Often the cleanest option for collaborators across module boundaries.

**Mockist vs classicist debate:** mockist (London school) verifies interactions; classicist (Detroit school) tests state via fakes/real impls. Lean classicist — mocks are easy to overuse, leading to tests that mirror implementation.

### Q89. How do you write integration tests?

Test multiple components together — typically the system end-to-end within process boundaries.

**Tools:**
- **`@SpringBootTest`** — boots the full Spring context, real DB or H2/Testcontainers
- **Testcontainers** — real Postgres/Kafka/Redis in Docker for tests. Slower but realistic.
- **WireMock** — stub HTTP services
- **MockMvc / WebTestClient** — exercise controllers without a real HTTP server

**Pattern:**
```java
@SpringBootTest
@Testcontainers
@AutoConfigureMockMvc
class OrderApiTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;

    @Test
    void creates_order() throws Exception {
        mvc.perform(post("/orders").contentType(JSON).content(payload))
           .andExpect(status().isCreated());
    }
}
```

**Scope:** more than unit, less than full E2E. One Spring context, real DB, in-process HTTP. Slow per test (1-5s) — run separately from unit tests in CI.

### Q90. What is TDD and how do you practice it?

**Test-Driven Development** — write the test before the production code. Red → Green → Refactor.

1. **Red:** write a failing test for the next small increment of behaviour
2. **Green:** write the minimum code to make it pass — even ugly
3. **Refactor:** clean up, ensure tests still pass

**Why it works:**
- Forces you to design the interface (caller's perspective) before implementation
- Eliminates speculative code — only build what tests demand
- Fast feedback loop
- Tests are by construction valuable — they failed before they passed
- Refactoring confidence — green tests = behaviour preserved

**My practice:**
- TDD shines for complex logic with clear specs (parsers, calculators, domain rules)
- For exploratory work (UI tweaks, integration spikes), I write tests after — would be premature
- Don't religiously demand TDD — judgment over dogma
- Pair with property-based testing for invariants (jqwik) when the domain has algebraic laws

**Common kata practice:** Bowling Game, Roman Numerals, FizzBuzz, Supermarket Checkout. Build muscle memory for the rhythm.

### Q91. What code quality tools do you use?

**Static analysis:**
- **SonarQube / SonarCloud** — the standard. Bugs, vulnerabilities, code smells, coverage tracking, quality gates in CI.
- **Checkstyle** — code style enforcement (Google or custom config)
- **SpotBugs** (formerly FindBugs) — bytecode-level bug detection
- **PMD** — broader static rules
- **Error Prone** (Google) — compile-time checks for common mistakes
- **ArchUnit** — architectural rules in tests (no cycles, layered access)

**Build hooks:**
- **Maven enforcer** — version policy, banned dependencies
- **OWASP Dependency-Check** — known CVEs in dependencies
- **Spotless** — code formatter (Google Java Format) baked into the build

**Coverage:**
- **JaCoCo** — coverage reports, integrates with SonarQube

**Practices:**
- **Quality gate in CI** — coverage thresholds, SonarQube blockers fail the build
- **Pre-commit hooks** — fast formatters and linters before push
- **Code review** as the human layer — tools catch obvious; humans catch design

For new projects I bake in: Spotless (format), Error Prone (build-time checks), JaCoCo (coverage), SonarCloud (quality gate). Lower friction than retrofitting later.

---

## System Design & Best Practices

### Q92. How would you design a REST API?

**Resource-oriented URLs** — nouns, not verbs:
```
GET    /orders                  # list
POST   /orders                  # create
GET    /orders/{id}             # one
PUT    /orders/{id}             # replace
PATCH  /orders/{id}             # partial update
DELETE /orders/{id}             # delete
GET    /orders/{id}/items       # nested resource
```

**Status codes:**
- 200 OK, 201 Created (with `Location` header), 204 No Content
- 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity
- 500 Internal Server Error, 503 Service Unavailable

**Body conventions:**
- JSON, snake_case or camelCase (consistent within an API)
- Errors use RFC 7807 Problem Details:
  ```json
  { "type": "...", "title": "...", "status": 422, "detail": "...", "instance": "/orders/123" }
  ```
- Pagination: cursor-based (`?cursor=...&limit=...`) or page-based (`?page=2&size=20`); include total count when feasible

**Headers:**
- `Idempotency-Key` for non-idempotent ops (POST that creates)
- `If-Match` / `If-None-Match` with ETags for optimistic concurrency
- `Cache-Control` for cacheable resources

**Other:**
- Versioning (Q94)
- HATEOAS (rare in practice)
- OpenAPI / Swagger spec — single source of truth for clients
- Rate limiting headers (`X-RateLimit-Remaining`, `Retry-After`)

### Q93. Explain RESTful principles and HTTP methods.

**Roy Fielding's REST constraints:**
- **Client-server** — separation of concerns
- **Stateless** — each request carries all needed info; no server-side session
- **Cacheable** — responses indicate cacheability
- **Uniform interface** — resources identified by URIs, manipulated via standard methods, self-descriptive messages, HATEOAS
- **Layered system** — clients don't care if speaking to origin server, gateway, or proxy
- **Code on demand** (optional) — server can extend client with executable code (rarely used)

**HTTP methods semantics:**
| Method | Safe | Idempotent | Use |
|---|---|---|---|
| GET | ✓ | ✓ | Retrieve |
| HEAD | ✓ | ✓ | Retrieve headers only |
| OPTIONS | ✓ | ✓ | Capability discovery, CORS preflight |
| POST | ✗ | ✗ | Create / non-idempotent action |
| PUT | ✗ | ✓ | Replace (full update) |
| PATCH | ✗ | depends | Partial update (idempotent if structured carefully) |
| DELETE | ✗ | ✓ | Remove |

**Safe** = no side effects. **Idempotent** = same request N times has same effect as once.

In practice, full REST is rare. Most "REST APIs" are RPC-over-HTTP with REST-shaped URLs — and that's fine. Pragmatism over purity.

### Q94. How do you handle API versioning?

Three common strategies:

**1. URI path:** `/v1/orders`, `/v2/orders`
- Pros: visible, easy to test, browser-friendly
- Cons: violates "URI identifies a resource" purism — same resource has multiple URIs
- Most common in practice

**2. Header:** `Accept: application/vnd.example.v2+json`
- Pros: stays "RESTful"
- Cons: harder to test in browser, clients have to set headers correctly

**3. Query parameter:** `/orders?version=2`
- Pros: simple
- Cons: caching pitfalls; mixed semantics

**Versioning policy:**
- Support N and N-1 simultaneously during migrations
- Deprecate with `Deprecation` and `Sunset` headers (RFC 8594)
- Communicate timelines to consumers
- Internal services: contract tests catch breaks before deployment

**Avoid versioning when possible:**
- Add new optional fields without bumping version
- Default new behaviour off; opt-in via header or feature flag
- Keep responses additive — never remove fields, mark them deprecated and ignore

Best version is the one you don't have to make.

### Q95. What are your strategies for handling distributed transactions?

**Two-Phase Commit (2PC)** — coordinator asks participants to prepare, then commit. Strong consistency but: blocks on coordinator failure, performance cost, requires XA-compliant resources. Largely abandoned for microservices.

**Saga pattern** — long-running transaction split into local transactions per service, with compensating actions for rollback.

```
Place Order → Reserve Inventory → Charge Payment → Confirm Order
   ↓ fail        ↓ fail               ↓ fail            ✓
Compensate:  Release inventory ← Refund ← (no-op, never reached)
```

Two coordination styles:
- **Choreography** — services emit events, others react. Decoupled but harder to reason about end-to-end.
- **Orchestration** — central coordinator (Saga state machine) drives the flow. Easier to monitor and debug.

**Transactional Outbox** — for "save to DB AND publish event" atomically:
1. In one local DB transaction: write business state + insert event row in `outbox` table
2. Async dispatcher polls `outbox`, publishes to broker, marks row sent
3. At-least-once delivery; consumers must be idempotent

**Best practices:**
- Make all consumers **idempotent** (idempotency key + dedup table)
- Design for at-least-once, not exactly-once
- Embrace eventual consistency — UX needs to handle "in flight" state
- Use compensations, not technical rollbacks

For high-stakes ledgers (banking), pair with **double-entry bookkeeping** and reconciliation jobs to detect and correct drift.

### Q96. How do you implement caching in your applications?

**Layers:**
- **HTTP / CDN cache** — `Cache-Control`, ETags. CloudFront, Cloudflare. Best place to cache for static or rarely-changing GETs.
- **In-process** — Caffeine (replaces Guava cache; LRU, time + size based, async refresh). Lowest latency, but per-instance.
- **Distributed** — Redis, Memcached, Hazelcast. Cross-instance, persistent options.
- **DB query cache** — second-level cache in JPA/Hibernate (Q75). Use cautiously.

**Strategies:**
- **Cache-aside** — app reads cache first, falls back to DB on miss, populates cache. Most common.
- **Read-through** — cache layer fetches from DB on miss transparently
- **Write-through** — writes go to cache and DB synchronously
- **Write-behind / write-back** — writes to cache, flushed to DB async. Risky on crash.

**Spring abstractions:**
```java
@Cacheable("users") public User get(UUID id) { ... }
@CacheEvict("users") public void delete(UUID id) { ... }
@CachePut("users") public User update(User u) { ... }
```

**Invalidation** is the hard problem (Phil Karlton: "two hard things in CS"):
- TTL (simple, eventually consistent)
- Explicit invalidation on writes (correct but coupled)
- Versioned keys / cache-busting URLs
- Pub/sub invalidation across nodes

**Pitfalls:**
- Stampede on cache miss — use single-flight or probabilistic refresh
- Cache poisoning — validate before caching
- Memory pressure — cap size, use LRU/LFU
- Cache + DB inconsistency under writes — acknowledge it, design around it

### Q97. Explain your approach to logging and monitoring.

**Logging:**
- **Structured logs** — JSON output. Logstash / ELK / Loki / Datadog parse fields, not regex.
- **Levels** — DEBUG (dev), INFO (lifecycle), WARN (recoverable), ERROR (incident-worthy)
- **Correlation IDs** — trace id propagated via MDC (`Mapped Diagnostic Context`) and HTTP headers; OpenTelemetry baggage in microservices
- **No PII in logs** — emails, card numbers, full names. Redact at source, not in pipelines.
- **Don't log huge payloads** — sample, summarise, or hash
- **Logging frameworks** — SLF4J facade + Logback or Log4j2 binding

**Metrics:**
- **Micrometer** — metrics facade, exports to Prometheus, CloudWatch, Datadog, etc.
- **RED method** for services — Rate, Errors, Duration
- **USE method** for resources — Utilisation, Saturation, Errors
- **Custom domain metrics** — bookings created/sec, queue depth, cache hit ratio

**Tracing:**
- **OpenTelemetry** — vendor-neutral standard. Auto-instruments Spring, JDBC, HTTP clients, Kafka.
- Sampling strategies — head sampling for overhead, tail sampling for keeping interesting traces

**Alerts:**
- Page on user-facing impact (error rate, latency, availability)
- Don't page on infrastructure if user impact is masked (resilient)
- SLO-based alerting — alert on error budget burn rate

**Dashboards:**
- Service overview — RED metrics, version, recent deploys
- Resource panels — JVM heap/gc, threads, connection pools
- Log + trace links from metric anomalies

### Q98. How do you handle configuration management?

**Externalise config from code.** 12-factor: config in environment.

**Spring approach (preferred):**
- `application.yml` for defaults
- Profile-specific overrides (`application-prod.yml`, `application-dev.yml`)
- Environment variables override files
- `@ConfigurationProperties` for typed binding
- Spring Cloud Config Server or HashiCorp Consul / Vault for centralised + dynamic config

```java
@ConfigurationProperties(prefix = "booking")
record BookingProperties(
    int maxPartySize,
    Duration defaultDuration,
    @Valid Notifications notifications
) { }
```

**Secrets:**
- Never in repo (even encrypted)
- Vault, AWS Secrets Manager, GCP Secret Manager, k8s Secrets (with sealed-secrets / external-secrets)
- Rotate regularly
- Inject as env vars or via Vault Agent sidecar

**Feature flags:**
- LaunchDarkly, Unleash, or in-house
- Decouple deploy from release
- Kill switches for safe rollback

**Validation:**
- `@Validated` on `@ConfigurationProperties` — fail fast at startup if config invalid
- Document required env vars in README
- Health checks expose effective config (sanitised)

### Q99. What is your approach to code reviews?

**As author:**
- Small PRs (< 400 lines diff). Big PRs get rubber-stamped.
- Self-review first — many comments avoidable
- Clear PR description: context, what, why, alternatives considered, testing notes
- Separate "tidy" commits from behaviour-change commits
- Respond to every comment, even with "fixed in commit X"
- Ask for early feedback on big designs before writing the code

**As reviewer:**
- Read the description first; understand what they're trying to do
- Build mental model of design before commenting on lines
- Distinguish: blocker (must fix), suggestion (nice to have), question (curious), praise (good work)
- Comment on code quality and design, not personal style
- Ask questions when unclear — don't assume
- Praise good solutions explicitly
- Be specific: "consider extracting this into a method called X" beats "this is messy"
- No one-line "lgtm" without actually reading

**Cultural:**
- Reviews are for catching bugs, sharing knowledge, maintaining shared style. Not gatekeeping.
- Authors and reviewers both own quality
- Approve "with nits" if blocking changes are stylistic; let author decide
- Pair-program for complex/contentious changes — review costs less when discussed live

### Q100. How do you handle technical debt in your projects?

**Acknowledge debt is a tool, not a sin.** Some debt is intentional (ship faster, learn, refactor later). Some is unintentional (didn't know better at the time). Both need management.

**Tracking:**
- Issues in the same tracker as features. No separate "tech-debt list" that nobody reads.
- Tag with `tech-debt` for filtering
- Each item has a cost estimate and a value estimate
- Code-level: TODOs are low-signal; if it's worth fixing, file an issue

**Paying down:**
- **Boy Scout Rule** — leave code cleaner than you found it. Bake refactoring into feature work.
- **Reserved capacity** — 10-20% of every sprint for debt. Negotiated, not "if we have time."
- **Major refactors** — separate from feature work, with a clear hypothesis and rollback plan
- **Strangler fig pattern** for legacy migrations — wrap old, route new traffic to new, deprecate old gradually

**Prevention:**
- Code review catches bad patterns before they spread
- Static analysis (SonarQube quality gate) prevents regressions
- ArchUnit tests enforce architectural rules
- Architecture decision records (ADRs) capture *why* — future readers don't have to guess
- Refactor as you go (Tidy First — Kent Beck)

**When to repay urgently:**
- Debt is blocking new features
- Debt is causing production incidents
- Debt is making onboarding hard
- Debt is in a hot path for upcoming work

**When to leave it:**
- Code is stable, rarely changed
- Cost of fixing > cost of living with it
- Going to be deleted soon anyway

The discipline is honest accounting: track it, talk about it, allocate capacity, ship the right things.

---

---

## Security

### Q101. Explain the OWASP Top 10.

The standard list of most critical web application security risks (current 2021 edition; 2025 update in progress):

1. **Broken Access Control** — users can access resources they shouldn't (missing authorisation checks, IDOR — insecure direct object reference)
2. **Cryptographic Failures** — sensitive data exposed (plaintext passwords, weak algorithms, missing TLS)
3. **Injection** — SQL, NoSQL, OS command, LDAP injection
4. **Insecure Design** — flaws in design itself, not just implementation
5. **Security Misconfiguration** — default credentials, verbose errors, unnecessary features enabled
6. **Vulnerable and Outdated Components** — known-CVE dependencies (the Log4Shell era)
7. **Identification and Authentication Failures** — weak passwords, broken session management
8. **Software and Data Integrity Failures** — unsigned updates, deserialisation attacks
9. **Security Logging and Monitoring Failures** — can't detect or respond to incidents
10. **Server-Side Request Forgery (SSRF)** — server makes requests to attacker-controlled URLs

For a Java/Spring shop: OWASP dependency-check in CI, Spring Security configured properly, parameterised queries via JPA, structured logging, secrets out of code.

### Q102. How do you prevent SQL injection?

**Use parameterised queries.** Always. The DB driver substitutes parameters safely; the SQL string never contains user input.

```java
// VULNERABLE — string concatenation
String sql = "SELECT * FROM users WHERE name = '" + name + "'";

// SAFE — parameterised
String sql = "SELECT * FROM users WHERE name = ?";
PreparedStatement ps = conn.prepareStatement(sql);
ps.setString(1, name);

// SAFE — JPA / Spring Data
@Query("SELECT u FROM User u WHERE u.name = :name")
List<User> findByName(@Param("name") String name);
```

Other layers:
- **Input validation** — defence in depth. Whitelist allowed characters where the format is known.
- **Least-privilege DB user** — app user shouldn't have DDL or admin access
- **ORM defaults** — JPA / Hibernate parameterise by default. Don't drop to native SQL with concatenation.
- **Stored procedures** — only safe if they themselves use parameterised queries internally
- **Dynamic table/column names** — can't be parameterised; use a strict whitelist

### Q103. What's the difference between authentication and authorization?

**Authentication (AuthN)** — *who are you?* Verify identity. Username/password, JWT, certificate, biometrics.

**Authorization (AuthZ)** — *what can you do?* Check permissions. RBAC (role-based), ABAC (attribute-based), ACL (per-resource).

```java
// AuthN happens first — populates SecurityContext
@PreAuthorize("hasRole('ADMIN')")               // AuthZ — role check
@PostAuthorize("returnObject.owner == authentication.name")  // AuthZ — instance level
public Order getOrder(UUID id) { ... }
```

Common mistake: conflating them. A login endpoint is authentication. Allowing one user to access another's data is an authorization failure (and is OWASP #1).

### Q104. JWT vs session cookies — when each?

**Session cookies** — server-side session store, cookie holds opaque session id.
- Pros: revocation is trivial (delete server-side session); compact cookie
- Cons: requires session storage (sticky sessions or shared store like Redis); harder to scale across services

**JWT (JSON Web Token)** — self-contained signed token; claims encoded in token itself.
- Pros: stateless, no server lookup; works across services without shared store
- Cons: revocation is hard (token valid until expiry); larger size; can't change claims without re-issuing
- Common pitfalls: not validating signature; accepting `alg: none`; not validating expiry; storing in localStorage (XSS-vulnerable)

**Use sessions:** server-rendered apps, single domain, when revocation matters (banking).

**Use JWT:** stateless microservices, mobile/SPA APIs, where short expiry is acceptable. Pair with **refresh tokens** stored server-side for long sessions with revocation.

```java
// Spring Security JWT setup
http.oauth2ResourceServer(o -> o.jwt(jwt -> jwt.decoder(jwtDecoder())));
```

### Q105. Explain OAuth2 flows.

**OAuth2 = delegated authorisation.** A user grants a client app access to their resources hosted by another service, without sharing credentials. (OIDC = OAuth2 + identity layer for authentication.)

**Roles:** Resource Owner (user), Client (app), Authorization Server, Resource Server.

**Flows (grants):**
- **Authorization Code (with PKCE)** — standard for web/mobile apps. User redirects to auth server, logs in, returns with a code, client exchanges code for tokens. PKCE protects public clients (mobile/SPA).
- **Client Credentials** — service-to-service. No user. Client uses its own credentials to get a token.
- **Refresh Token** — exchange a refresh token for a new access token without user interaction.
- **Device Code** — devices without browsers (TVs, CLI). Show a code on device, user authorises on phone.
- **Implicit / Resource Owner Password** — *deprecated.* Use Authorization Code + PKCE instead.

**Tokens:**
- **Access token** — short-lived (minutes-hours), used to call resource server. Often JWT.
- **Refresh token** — long-lived (days-months), opaque, server-tracked, revocable.
- **ID token** (OIDC only) — JWT containing user identity claims.

### Q106. How should passwords be stored?

**Never plaintext. Never SHA-256 alone. Use a password-hashing function.**

**Use:** BCrypt (default), Argon2 (modern winner of password hashing competition), PBKDF2, scrypt. All use **salt + work factor** to resist brute-force.

```java
// Spring Security
PasswordEncoder encoder = new BCryptPasswordEncoder(12);   // cost 12 = ~250ms per hash
String hash = encoder.encode(rawPassword);
boolean matches = encoder.matches(rawPassword, storedHash);
```

**Why work factor matters:** GPUs can compute billions of SHA-256 per second. BCrypt at cost 12 takes ~250ms per attempt — billions become hundreds. Tune cost upward as hardware improves.

**Never roll your own.** Don't write the verification function — timing attacks leak info via comparison speed. `PasswordEncoder.matches` is constant-time.

**Beyond hashing:**
- Pepper — application-wide secret added to every hash. Stored separately from DB (HSM, env var).
- Rate limit + lockout — slow attackers
- Breached-password lists — reject known leaked passwords (HaveIBeenPwned API)
- MFA — defence in depth, weakens password reliance

### Q107. What is CSRF and how do you prevent it?

**Cross-Site Request Forgery** — attacker tricks an authenticated user's browser into making a state-changing request to your app. Browser sends session cookie automatically; the server can't distinguish from a legitimate request.

**Example:** user is logged into bank.com. Visits attacker.com which has `<form action="bank.com/transfer" method="POST">` auto-submitting on load. Browser sends bank.com cookies. Transfer happens.

**Prevention:**
- **CSRF token** — server-issued unguessable value, included in every state-changing request (form field or header). Server validates. Spring Security does this by default for browser sessions.
- **SameSite cookies** — `SameSite=Strict` or `Lax` prevents browsers sending cookies on cross-origin requests. Modern browsers default to `Lax`.
- **Double-submit cookie** — token in both cookie and header; server compares. Stateless alternative.
- **Don't use GET for state changes** — REST discipline already prevents most CSRF on API design alone

**Stateless APIs (JWT in Authorization header)** — not vulnerable to classic CSRF, because attacker can't make the browser attach a header it doesn't have access to. Spring Security disables CSRF protection automatically when no session is used.

### Q108. What is XSS and how do you prevent it?

**Cross-Site Scripting** — attacker injects script that runs in another user's browser, in the victim site's origin. Steals cookies, hijacks sessions, modifies DOM.

**Three flavours:**
- **Stored** — payload saved server-side (in a comment field), served to all viewers
- **Reflected** — payload in URL/query, echoed back in response
- **DOM-based** — JS reads attacker-controlled value (URL hash) and inserts into DOM unsafely

**Prevention:**
- **Output encoding** — escape HTML entities in *output*, not input. Thymeleaf, JSP, Mustache do this by default. Bypass only with explicit `[(...)]`/`th:utext` (use rarely, audit carefully).
- **Content Security Policy (CSP)** — `Content-Security-Policy: script-src 'self'` blocks inline scripts and external sources. Massively reduces XSS impact even if injection occurs.
- **HttpOnly cookies** — JavaScript can't read them. Token theft via XSS becomes impossible for that cookie.
- **Frameworks** — React, Vue, Angular escape by default in templates. The dangerous patterns are `dangerouslySetInnerHTML` and equivalents.
- **Input validation** — defence in depth, but encoding on output is the real fix

For APIs returning JSON: ensure `Content-Type: application/json` and don't reflect user input into HTML pages.

### Q109. How do you handle secrets in a Spring Boot app?

**Never in source.** Never in `application.yml` checked into git.

**Options ranked:**
1. **Vault (HashiCorp / AWS Secrets Manager / GCP Secret Manager / Azure Key Vault)** — purpose-built, auditable, rotatable. Inject via Vault Agent sidecar, Spring Cloud Vault, or env vars at deploy time.
2. **Kubernetes Secrets** — mount as files or env vars. Pair with sealed-secrets (Bitnami) or external-secrets-operator for safe git storage.
3. **Environment variables** — twelve-factor compliant. Set by deploy pipeline, not in repo.
4. **Encrypted properties** — Jasypt or Spring Cloud Config encrypted values. Better than plaintext, still has key-management problem.

```yaml
# Reads from env var DB_PASSWORD; defaults if absent
spring.datasource.password: ${DB_PASSWORD:}
```

**Best practices:**
- Rotate regularly (DB passwords, API keys, signing keys)
- Audit access logs
- Different secrets per environment
- Don't log secrets — sanitise dumps and exception messages
- Separate read access from write access (humans read; CI writes)
- For dev: `.env` file in `.gitignore`, dotenv-style loaders, or per-developer Vault

**Detection:** TruffleHog, gitleaks, GitHub secret scanning. Run in CI on every PR. Once a secret is committed, rotate immediately even after revert — git history persists.

### Q110. What's TLS and how does it work at a high level?

**TLS (Transport Layer Security)** — encrypts and authenticates network connections (HTTPS, gRPC, secure SMTP). Successor to SSL.

**Three guarantees:**
- **Confidentiality** — eavesdroppers can't read
- **Integrity** — tampering detected
- **Authentication** — server identity verified (and optionally client)

**Handshake (simplified TLS 1.3):**
1. Client sends ClientHello: supported versions, cipher suites, key share (ephemeral public key for ECDHE)
2. Server sends ServerHello + certificate + key share + signature over handshake
3. Client validates certificate (signed by trusted CA, hostname matches, not expired/revoked)
4. Both derive shared session key from key shares (Diffie-Hellman)
5. Encrypted data flows

**Java specifics:**
- TrustStore (CA certs) and KeyStore (own certs + keys), both `JKS` or `PKCS12`
- Java 8u261+ supports TLS 1.3
- HTTP/2 requires TLS in browsers
- Mutual TLS (mTLS) — client also presents a cert. Common for service-to-service auth in service meshes (Istio, Linkerd).

**Common Java problems:**
- Outdated CA bundle (`cacerts`) — update with new JDK or `keytool -import`
- Wrong hostname verification — production-grade libraries verify by default; don't disable
- TLS version negotiation — explicitly enable TLS 1.2/1.3, disable older
- Self-signed certs in dev — use proper trust store, don't disable validation

---

## Kafka & Messaging

### Q111. Explain Kafka's core concepts.

**Kafka** = distributed append-only log, partitioned, replicated.

**Concepts:**
- **Topic** — named log of messages
- **Partition** — ordered, immutable sequence within a topic. Each partition = independent log on disk.
- **Offset** — position of a message within a partition. Monotonically increasing.
- **Broker** — Kafka server holding partitions
- **Replica** — copy of a partition on another broker. One leader, N followers. Writes go to leader, replicate to followers.
- **Producer** — writes to topics. Picks partition by key hash (default), round-robin, or custom partitioner.
- **Consumer** — reads from topics, tracks own offset
- **Consumer group** — multiple consumers sharing the work of reading a topic; each partition assigned to exactly one consumer in the group

**Key properties:**
- Messages within a partition strictly ordered. Across partitions: no global order.
- Retention by time or size, not by consumption — messages stay until expiry
- Pull-based — consumers poll, brokers don't push
- Horizontally scalable: more partitions = more parallelism

### Q112. How do consumer groups work?

A consumer group is a set of consumers cooperating to consume a topic. **Each partition is read by exactly one consumer in the group.**

```
Topic with 6 partitions:
  Group A (3 consumers): each gets 2 partitions  → parallel processing
  Group B (1 consumer):  reads all 6 partitions  → independent stream
  Group A (8 consumers): 6 active, 2 idle        → consumers > partitions = waste
```

**Rebalancing** — when consumers join, leave, or crash, partitions reassign. During rebalance, all consumers in the group pause. Frequent rebalancing kills throughput.

**Strategies:**
- `range` (default in older versions) — assign contiguous partitions per consumer
- `roundrobin` — distributes evenly
- `sticky` — minimises movement during rebalances (current default)
- `cooperative-sticky` — incremental rebalances; only moving partitions pause

**Tuning:**
- Number of partitions = max parallelism. Choose at topic creation; can't easily reduce.
- Match consumer count to partition count for full utilisation
- Use static membership (`group.instance.id`) for stable consumers — survives restarts without rebalance

### Q113. How does Kafka guarantee message ordering?

**Within a partition: strict order.** Messages with the same key go to the same partition (default partitioner: `hash(key) % num_partitions`), so messages with the same key are strictly ordered.

**Across partitions: no order.** Two messages with different keys may be processed in any order across partitions.

**Implications:**
- Order matters → key by the entity id (`userId`, `orderId`)
- All events for one entity → one partition → ordered
- `null` key with default partitioner → round-robin across partitions → no order guarantee

**Producer-side gotchas:**
- `max.in.flight.requests.per.connection > 1` + retries can reorder. With idempotent producer (`enable.idempotence=true`, default since 3.0), Kafka guarantees order even with up to 5 in-flight + retries.
- `acks=all` + idempotence + min.insync.replicas ≥ 2 = the standard "safe" producer config

### Q114. What's the difference between at-least-once, at-most-once, and exactly-once delivery?

**At-most-once** — message may be lost, never duplicated. Consumer commits offset *before* processing. Crash → message skipped.

**At-least-once** (default) — message never lost, may be duplicated. Consumer processes *then* commits. Crash after process, before commit → reprocessed on restart.

**Exactly-once** — every message processed exactly one time. Hard. Two flavours:
- **Exactly-once delivery** — generally unsolvable across networks (FLP, two generals). Don't promise this.
- **Exactly-once processing** — solvable when you control producer + consumer + side effects. Kafka provides this for Kafka-to-Kafka (transactions + idempotent producer + read-committed consumer). For Kafka-to-DB: transactional outbox pattern or idempotent consumers.

**Practical advice:** assume at-least-once delivery, build idempotent consumers. Use idempotency keys + dedup tables. Don't pursue technical exactly-once unless the platform supports it natively for your specific path.

### Q115. How do you handle consumer offset management?

Offsets track "where each consumer group is up to" in each partition. Stored in Kafka's internal `__consumer_offsets` topic.

**Commit modes:**
- **Auto-commit** (`enable.auto.commit=true`, every 5s by default) — easy but unsafe. Commits offsets that may not have been processed if crash happens between poll and processing.
- **Manual commit** (preferred for production):
  ```java
  while (true) {
      ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
      for (var r : records) process(r);
      consumer.commitSync();   // or commitAsync()
  }
  ```
- **`commitSync`** — blocks until broker confirms. Safer.
- **`commitAsync`** — fire-and-forget; faster, can lose offsets if you don't commit-sync on shutdown.

**Best practice:**
- `enable.auto.commit=false`
- Commit after processing succeeds, not before
- On shutdown: `commitSync()` then close
- Use `Acknowledgment` in Spring Kafka with `MANUAL_IMMEDIATE` ack mode

**Reset modes:**
- `auto.offset.reset=earliest` — start from beginning if no offset stored (replay history)
- `auto.offset.reset=latest` — only new messages (skip backlog)
- `auto.offset.reset=none` — error if no offset (forces explicit decision)

### Q116. What patterns prevent duplicate message processing?

Kafka delivers at-least-once by default. Consumers must be idempotent.

**Patterns:**

**1. Idempotent operations.** If processing the same message twice has the same effect as once, no special handling needed.
```java
// Idempotent: setting state
db.update("UPDATE order SET status = ? WHERE id = ?", APPROVED, orderId);

// Not idempotent: incrementing
db.update("UPDATE counter SET value = value + 1 WHERE id = ?", id);
```

**2. Idempotency key + dedup table.** Each message has a unique key. Consumer checks dedup table before processing.
```java
@Transactional
void handle(Event e) {
    if (dedup.exists(e.id())) return;       // already processed
    process(e);
    dedup.insert(e.id());                   // mark processed
}
```

**3. Transactional outbox / log-trailing.** When the consumer's effect is "write to another DB", use the same DB transaction for both processing and offset record. Either both happen or neither.

**4. Conditional updates.** `UPDATE ... WHERE version = ?` — second attempt is a no-op because version no longer matches.

**5. CDC tools (Debezium)** — guarantee exactly-once semantics for Kafka-to-DB pipelines via offset coordination.

### Q117. When would you choose Kafka vs RabbitMQ vs SQS?

| Property | Kafka | RabbitMQ | SQS |
|---|---|---|---|
| Model | Distributed log (replay) | Broker (queue/exchange) | Managed queue (AWS) |
| Throughput | Very high (millions/sec) | High (hundreds of thousands) | Moderate (thousands per queue) |
| Ordering | Per partition | Per queue | FIFO queue (slower) or none (Standard) |
| Retention | Time/size (replay) | Until consumed | Up to 14 days |
| Routing | Simple (key → partition) | Rich (exchanges, bindings, RPC) | Simple |
| Operational | Run + tune (or Confluent Cloud) | Run + tune (or CloudAMQP) | Fully managed |
| Use cases | Event streaming, audit logs, replay, analytics pipelines | Task queues, RPC, complex routing, workflows | AWS-native simple async work |

**Kafka:** when you want event sourcing, replay, high throughput, or pub-sub fan-out where multiple independent consumers need the same stream.

**RabbitMQ:** when you want a true work queue with acks, complex routing (topic/header/fanout exchanges), or RPC patterns.

**SQS:** when you're on AWS and want zero ops. Pair with SNS for fan-out.

**Honest secondary choice for Java shops:** Kafka. RabbitMQ is great but losing ground; Kafka has won the events/streaming category.

---

## JPA & Spring Data Extras

### Q118. What's the difference between save, persist, merge, update, and saveOrUpdate?

JPA spec defines `persist` and `merge`. Hibernate adds `update` and `saveOrUpdate`. Spring Data adds `save`. People mix them up constantly.

| Method | Source | Use |
|---|---|---|
| `persist(entity)` | JPA | New entity → managed. Throws if entity already persistent. Returns void. ID assigned eagerly (sequence) or on flush (identity). |
| `merge(entity)` | JPA | Detached → managed. Copies state from passed entity into a managed instance and returns the managed instance. **Original passed object remains detached.** |
| `update(entity)` | Hibernate | Forces detached → managed. Throws if there's already a managed instance with same id. Use rarely. |
| `saveOrUpdate(entity)` | Hibernate | `update` if has id, `save` (persist) otherwise. Legacy. |
| `save(entity)` | Spring Data | If id null → `persist`. If id non-null → `merge`. Returns the managed entity. |

**Common bugs:**

```java
User u = new User("alice");
em.persist(u);
u.setName("alice2");          // ✓ tracked, flushed on commit

User detached = ...;
em.merge(detached);          // detached unchanged
detached.setName("oops");    // ✗ not tracked — change lost

User u = em.merge(detached); // capture the returned managed instance
u.setName("ok");             // ✓ tracked
```

**Spring Data's `save`** is the safe default in Spring apps — handles new vs detached correctly. The trap: it returns the managed instance, which you must use thereafter.

### Q119. Explain JPA cascade types.

`@OneToMany`, `@ManyToOne`, etc. take a `cascade` attribute. Operations on the parent propagate to the child.

```java
@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
private List<OrderItem> items;
```

| Cascade type | Propagates |
|---|---|
| `PERSIST` | `em.persist(parent)` → also persists children |
| `MERGE` | `em.merge(parent)` → merges children |
| `REMOVE` | `em.remove(parent)` → removes children |
| `REFRESH` | `em.refresh(parent)` → refreshes children |
| `DETACH` | `em.detach(parent)` → detaches children |
| `ALL` | All of the above |

**`orphanRemoval = true`** (separate from cascade) — when a child is removed from the parent's collection, automatically delete it from DB. Without it, orphan stays in DB with null FK.

```java
order.items().remove(item);   // with orphanRemoval — DELETE issued on next flush
                              // without — UPDATE item SET order_id = null
```

**Trap:** `CascadeType.ALL` on `@ManyToOne` is almost always wrong — removing a single order shouldn't remove the customer. Cascade only on parent → child relationships you genuinely own.

### Q120. What causes LazyInitializationException and how do you fix it?

Lazy collections / associations are loaded via Hibernate proxies that need an active session. Accessing them after the session closes throws `LazyInitializationException`.

```java
User u = userRepo.findById(id).orElseThrow();   // session opens, finds user, session closes
return u.orders();                              // BOOM — LazyInitializationException
```

**Fixes (best to worst):**

1. **Fetch what you need in the query.** `JOIN FETCH` or `@EntityGraph`:
```java
@Query("SELECT u FROM User u JOIN FETCH u.orders WHERE u.id = :id")
Optional<User> findWithOrders(@Param("id") UUID id);

@EntityGraph(attributePaths = {"orders"})
Optional<User> findById(UUID id);
```

2. **DTO projection at query time.** Best for read-heavy code — bypasses entity graph entirely.

3. **Open Session in View (`spring.jpa.open-in-view=true`)** — keeps session open through HTTP response. Convenient but **massively dangerous** — encourages N+1 queries hidden in view rendering. Default is on; recommend turning off.

4. **`Hibernate.initialize(u.orders())`** — force-load before session close. Works but feels hacky.

The right answer is almost always #1: explicit fetch graphs. Lazy is the JPA default for good reason; fetch only what you need.

### Q121. Explain Spring Data JPA derived queries.

Spring Data parses repository method names and generates queries automatically.

```java
interface UserRepo extends JpaRepository<User, UUID> {
    List<User> findByEmail(String email);
    List<User> findByEmailAndStatus(String email, Status status);
    List<User> findByAgeGreaterThanEqual(int age);
    List<User> findByNameContainingIgnoreCase(String name);
    List<User> findTop5ByOrderByCreatedAtDesc();
    Page<User> findByStatus(Status status, Pageable pageable);
    long countByStatus(Status status);
    boolean existsByEmail(String email);
    void deleteByEmail(String email);
}
```

**Keywords:** `find`, `read`, `query`, `count`, `exists`, `delete`. Plus criteria: `By`, `And`, `Or`, `Between`, `LessThan`, `GreaterThan`, `Like`, `In`, `IsNull`, `OrderBy`, `IgnoreCase`, `True`, `False`.

**When derived queries get unwieldy:**

```java
@Query("SELECT u FROM User u WHERE u.status = :status AND u.lastLogin < :before")
List<User> findStaleByStatus(@Param("status") Status status, @Param("before") Instant before);

@Query(value = "SELECT * FROM users WHERE ...", nativeQuery = true)
List<User> findCustomNative(...);
```

For really complex dynamic queries, use **Specifications** (criteria API wrapper) or **QueryDSL**.

### Q122. How do you implement pagination with Spring Data?

```java
interface OrderRepo extends JpaRepository<Order, UUID> {
    Page<Order> findByStatus(Status status, Pageable pageable);
    Slice<Order> findByCustomerId(UUID id, Pageable pageable);
    List<Order> findByCustomerId(UUID id, Pageable pageable);
}

// Caller
Pageable page = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<Order> result = repo.findByStatus(ACTIVE, page);
result.getContent();        // List<Order>
result.getTotalElements();  // expensive — extra count query
result.getTotalPages();
result.hasNext();
```

**Three return types:**
- `Page<T>` — content + total count + page metadata. **Issues a separate `COUNT(*)` query** — expensive on large tables.
- `Slice<T>` — content + `hasNext()` (fetched LIMIT+1 internally). No count query. Use when you don't need total.
- `List<T>` — content only

**Cursor-based (keyset) pagination** for large datasets — much faster than offset:

```java
@Query("SELECT o FROM Order o WHERE o.id > :lastId ORDER BY o.id")
List<Order> findAfter(@Param("lastId") UUID lastId, Pageable limit);
```

Offset gets slow at deep pages (`OFFSET 100000` reads and discards 100k rows). Keyset stays O(log n) via index seek.

### Q123. What are JPA Specifications and Criteria API?

For complex dynamic queries — when method names won't cut it.

**Criteria API** (raw JPA) — verbose, type-safe-ish:

```java
CriteriaBuilder cb = em.getCriteriaBuilder();
CriteriaQuery<User> cq = cb.createQuery(User.class);
Root<User> u = cq.from(User.class);
cq.where(cb.and(
    cb.equal(u.get("status"), Status.ACTIVE),
    cb.greaterThan(u.get("createdAt"), since)
));
List<User> results = em.createQuery(cq).getResultList();
```

**Spring Data Specifications** — composable wrapper:

```java
interface UserRepo extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> { }

class UserSpecs {
    static Specification<User> hasStatus(Status s) {
        return (root, q, cb) -> cb.equal(root.get("status"), s);
    }
    static Specification<User> createdAfter(Instant t) {
        return (root, q, cb) -> cb.greaterThan(root.get("createdAt"), t);
    }
}

repo.findAll(hasStatus(ACTIVE).and(createdAfter(since)));
```

**QueryDSL** — third-party alternative, much cleaner:

```java
QUser u = QUser.user;
queryFactory.selectFrom(u)
    .where(u.status.eq(ACTIVE).and(u.createdAt.gt(since)))
    .fetch();
```

**Pragmatic choice:** start with derived methods. Move to Specifications for dynamic combinations of filters (e.g. search forms with optional fields). Move to QueryDSL or jOOQ if Specifications get painful.

---

## Testing Deep Dive

### Q124. JUnit 4 vs JUnit 5 — key differences?

| | JUnit 4 | JUnit 5 |
|---|---|---|
| Architecture | Monolithic | Modular: Platform + Jupiter + Vintage |
| Annotations package | `org.junit.*` | `org.junit.jupiter.api.*` |
| Test class visibility | `public` required | Default visibility OK |
| Lifecycle | `@Before`, `@After`, `@BeforeClass`, `@AfterClass` | `@BeforeEach`, `@AfterEach`, `@BeforeAll`, `@AfterAll` |
| Expected exception | `@Test(expected = X.class)` | `assertThrows(X.class, () -> ...)` |
| Runners | `@RunWith(...)` (one) | `@ExtendWith(...)` (multiple, composable) |
| Parameterised | External `@RunWith(Parameterized.class)` | Native `@ParameterizedTest` |
| Display name | Not supported | `@DisplayName("...")` |
| Conditional execution | Limited | `@EnabledOnOs`, `@EnabledIfSystemProperty`, etc. |
| Java version | 8 minimum (5+) | 8 minimum (current) |

**Vintage engine** runs JUnit 3/4 tests in JUnit 5 — gradual migration possible. New code: always JUnit 5.

### Q125. How do you write parameterised tests in JUnit 5?

Source the parameters from various providers:

```java
@ParameterizedTest
@ValueSource(strings = {"alice", "bob", "carol"})
void name_is_lowercase(String name) {
    assertEquals(name, name.toLowerCase());
}

@ParameterizedTest
@CsvSource({
    "1, 2, 3",
    "5, 5, 10",
    "0, 0, 0"
})
void add(int a, int b, int expected) {
    assertEquals(expected, a + b);
}

@ParameterizedTest
@CsvFileSource(resources = "/test-data.csv", numLinesToSkip = 1)
void from_file(int input, String expected) { ... }

@ParameterizedTest
@MethodSource("provideArgs")
void from_method(String input, int expected) { ... }

static Stream<Arguments> provideArgs() {
    return Stream.of(
        Arguments.of("hello", 5),
        Arguments.of("world", 5)
    );
}

@ParameterizedTest
@EnumSource(Status.class)
void all_statuses_have_label(Status s) { ... }

@ParameterizedTest
@NullAndEmptySource
@ValueSource(strings = {" ", "\t"})
void blank_input_rejected(String input) { ... }
```

**Custom display:**
```java
@ParameterizedTest(name = "{0} + {1} = {2}")
@CsvSource({"1, 2, 3"})
```

### Q126. Explain Mockito's ArgumentCaptor and argThat.

When you need to assert on the *arguments* a mocked method was called with — beyond simple equality.

**`ArgumentCaptor`** — capture the arg for later assertion:

```java
ArgumentCaptor<Email> captor = ArgumentCaptor.forClass(Email.class);
verify(emailService).send(captor.capture());

Email sent = captor.getValue();
assertThat(sent.subject()).contains("Order");
assertThat(sent.to()).isEqualTo("alice@example.com");

// Multiple invocations
verify(emailService, times(3)).send(captor.capture());
List<Email> all = captor.getAllValues();
```

**`argThat`** — match arg against a predicate inline:

```java
verify(emailService).send(argThat(e -> e.to().endsWith("@example.com")));

when(repo.find(argThat(s -> s.startsWith("user_"))))
    .thenReturn(Optional.of(user));
```

**Use `ArgumentCaptor` when you want to assert with rich error messages.** AssertJ on the captured value gives clean failure output. `argThat` is fine for simple boolean predicates but produces poor messages on failure.

**Other matchers:**
- `eq(value)` — exact match (needed if mixing matchers and literals)
- `any()`, `anyString()`, `anyInt()` — wildcards
- `isNull()`, `notNull()`
- `same(obj)` — same reference, not just equal

### Q127. AssertJ vs Hamcrest vs JUnit assertions — when each?

**JUnit built-in (`Assertions.*`)** — basic. Good enough for trivial tests.

```java
assertEquals(expected, actual);
assertTrue(condition);
assertThrows(IllegalArgumentException.class, () -> service.fail());
```

**Hamcrest** — older, BDD-style with `assertThat` matchers.

```java
assertThat(name, is("alice"));
assertThat(list, hasItem("apple"));
assertThat(map, hasEntry("k", "v"));
```

**AssertJ** — modern, fluent, IDE-discoverable. **The standard for new code.**

```java
assertThat(name).isEqualTo("alice").hasSize(5);
assertThat(list).hasSize(3).contains("apple").doesNotContain("banana");
assertThat(map).containsEntry("k", "v").hasSizeGreaterThan(2);
assertThat(order.items()).extracting(OrderItem::sku).contains("ABC", "DEF");

assertThatThrownBy(() -> service.fail())
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("invalid");
```

**Why AssertJ wins:**
- Fluent chaining → expressive
- Type-aware assertions discovered by autocomplete
- Rich collection / map / exception assertions
- Soft assertions (collect failures) via `SoftAssertions`
- Better failure messages

Stick to AssertJ. Drop JUnit's built-ins for anything beyond `assertThrows`. Hamcrest is mostly legacy at this point.

### Q128. What's contract testing and when would you use it?

Verifies that **producer** and **consumer** of an API agree on the contract — without running both together.

**Problem:** integration tests with real services are slow, brittle, and don't scale to many service pairs. Mocks drift from reality.

**Solution (consumer-driven contracts):**
1. Consumer writes a test specifying expected interactions: "if I send `GET /orders/123`, I expect `{id: 123, total: 99.99}`"
2. Tool generates a contract file (Pact JSON, Spring Cloud Contract groovy)
3. Producer's CI runs against the contract — its tests must satisfy every consumer's expectations
4. If producer breaks the contract, CI fails before deploy

**Tools:**
- **Pact** — most popular, multi-language. Pact Broker stores contracts.
- **Spring Cloud Contract** — Spring-native, generates stubs and tests

```java
// Consumer side (Pact JVM)
@Pact(consumer = "order-service")
RequestResponsePact pact(PactDslWithProvider builder) {
    return builder
        .uponReceiving("get order")
        .path("/orders/123")
        .willRespondWith()
        .status(200)
        .body("{ \"id\": 123, \"total\": 99.99 }")
        .toPact();
}
```

**Use when:**
- Multiple services in different repos with separate teams
- Slow / fragile end-to-end suites
- You need to catch breaking changes before production

**Don't use when:**
- Monorepo with everything tested together
- Tiny system, just one consumer

### Q129. Explain mutation testing.

Measures **test quality**, not just coverage. Coverage tells you tests *executed* a line. Mutation testing tells you whether tests would *catch a bug* in that line.

**How it works:**
1. Tool introduces small mutations in production code (`+` → `-`, `<` → `<=`, `true` → `false`, removed conditional, etc.)
2. Run the test suite for each mutant
3. **Killed mutant** — at least one test failed. Good — bug would have been caught.
4. **Survived mutant** — all tests passed. Bad — your tests don't actually verify this code path.
5. **Mutation score** = killed / total

**Tools:**
- **PIT (Pitest)** — best-in-class JVM mutation tester. Fast, IntelliJ plugin, Maven/Gradle plugins.

```bash
mvn pitest:mutationCoverage
# generates HTML report: red = survived, green = killed
```

**Why useful:**
- Catches "vanity tests" that exercise code without verifying it
- Forces meaningful assertions
- Aim for > 70% mutation score on critical logic; 100% is unrealistic and expensive

**Cost:** slow — runs the test suite once per mutant (hundreds-thousands of times). Use selectively (critical modules, scheduled CI runs), not on every PR.

---

## Common Java Pitfalls

### Q130. Why use BigDecimal for money?

Floating-point types (`double`, `float`) cannot represent most decimal fractions exactly. They use binary fractions internally.

```java
double a = 0.1 + 0.2;   // 0.30000000000000004
double b = 1.0 - 0.9;   // 0.09999999999999998
```

For money, this is unacceptable — fractional pennies accumulate, audit checks fail, customer disputes. **Always use `BigDecimal` or pence-as-`long`.**

```java
BigDecimal a = new BigDecimal("0.1");
BigDecimal b = new BigDecimal("0.2");
a.add(b);                       // exactly 0.3

// Constructing from double is also wrong — captures the float imprecision
new BigDecimal(0.1);            // 0.1000000000000000055511151231257827021181583404541015625
new BigDecimal("0.1");          // 0.1 exactly — string constructor

// Always specify scale and rounding for division
a.divide(b, 2, RoundingMode.HALF_UP);
```

**Pence-as-`long`** alternative — store integer minor units (£12.34 = `1234L`). Faster than `BigDecimal`, no rounding choices, but you must remember the scale convention everywhere.

### Q131. What's wrong with `double a = 0.1 + 0.2`?

Same root cause as Q130. The result is `0.30000000000000004`, not `0.3`. Comparison with `==` fails.

```java
System.out.println(0.1 + 0.2 == 0.3);   // false
```

**Why:** decimal numbers like `0.1` are repeating fractions in binary (like `1/3 = 0.333...` in decimal). `double` has 52 bits of mantissa — has to round. Errors compound through arithmetic.

**Comparison:** never use `==` on doubles. Use a tolerance:

```java
Math.abs(a - b) < 1e-9
```

Or better, use `BigDecimal` and `compareTo`.

**Special floating-point values:**
- `Double.NaN != Double.NaN` — `NaN` is unequal to everything, including itself. Use `Double.isNaN(x)`.
- `1.0 / 0.0 == Double.POSITIVE_INFINITY` — no `ArithmeticException` for double division.
- `0.0 == -0.0` is `true`, but `Double.compare(0.0, -0.0)` returns 1.

### Q132. How does autoboxing cause performance problems?

Java auto-converts between primitives (`int`) and wrappers (`Integer`). Cheap individually, lethal in tight loops.

```java
// 100x slower than primitive — boxes every iteration
Long sum = 0L;
for (long i = 0; i < 1_000_000; i++) {
    sum += i;       // unbox sum, add, box result, assign to sum
}

// Fast
long sum = 0L;
for (long i = 0; i < 1_000_000; i++) sum += i;
```

**Other autoboxing traps:**

```java
// Collections of primitives — every element boxed
List<Integer> nums = new ArrayList<>();
nums.add(5);    // boxes 5 → Integer

// Map<K, Integer> counter — boxes every read/write
Map<String, Integer> count = new HashMap<>();
count.merge(key, 1, Integer::sum);

// NPE on autoboxing of null wrapper
Integer i = map.get("missing");  // null
int x = i;                        // NullPointerException
```

**Mitigation:**
- Primitive loops where possible
- For maps, use Eclipse Collections (`ObjectIntHashMap`) for primitive keys/values
- Streams: `IntStream`/`LongStream` instead of `Stream<Integer>`/`Stream<Long>` for numeric work

**Integer cache:** `-128..127` are cached, so `Integer.valueOf(127) == Integer.valueOf(127)` is true. Outside this range, false. Yet another reason to never `==` boxed numbers.

### Q133. Why is SimpleDateFormat dangerous?

**`SimpleDateFormat` is mutable and not thread-safe.** Sharing an instance across threads causes corrupted output, exceptions, and intermittent bugs.

```java
// BUG — shared static, used by many threads
private static final SimpleDateFormat FORMAT = new SimpleDateFormat("yyyy-MM-dd");

// Concurrent calls produce wrong dates or NumberFormatException
FORMAT.format(new Date());
FORMAT.parse("2026-05-06");
```

**Reproducible:** load test the class above with parallel calls — you'll see corrupted dates within seconds.

**Fixes (best to worst):**

1. **Use `java.time` (`DateTimeFormatter`)** — immutable, thread-safe by design. Always.
   ```java
   private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd");
   F.format(LocalDate.now());          // safe, parallel-friendly
   ```

2. **`ThreadLocal<SimpleDateFormat>`** if stuck on `Date` API — one instance per thread.

3. **New instance per use** — wasteful but correct.

The wider lesson: prefer `java.time` for everything. `java.util.Date`/`Calendar` are broken by design. Many libraries still take `Date`; convert at the boundary.

### Q134. What's wrong with concatenating strings in a loop?

Each `+=` allocates a new `String` (Strings are immutable). Quadratic complexity for `n` concatenations: O(n²).

```java
// BAD — O(n²)
String s = "";
for (int i = 0; i < n; i++) s += i;     // each iter: copy entire current s, append i

// GOOD — O(n)
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) sb.append(i);
String s = sb.toString();
```

**For 10,000 iterations:** `+=` takes seconds, `StringBuilder` takes microseconds.

**Single-line concatenation is fine** — Java 9+ compiles `s1 + s2 + s3` via `invokedynamic` + `StringConcatFactory`, which produces equivalent or better code than `StringBuilder`. Only loops are the problem.

```java
String s = a + b + c;                   // ✓ JIT handles efficiently
String s = "user=" + name + ", id=" + id;   // ✓ same — single concat expression
```

**Multi-thread** version: `StringBuilder` is not thread-safe; `StringBuffer` is (synchronized). In practice you almost never share a builder across threads, so prefer `StringBuilder` and confine to one thread.

### Q135. Why does `String.getBytes()` without a charset fail?

```java
byte[] bytes = "café".getBytes();
```

Uses the **platform default charset** — depends on OS, locale, JVM startup config. Different on developer's Mac vs the Linux server. Output bytes differ between environments → silent corruption when bytes cross machines.

**Always specify the charset:**

```java
byte[] bytes = "café".getBytes(StandardCharsets.UTF_8);
String s = new String(bytes, StandardCharsets.UTF_8);
```

Same for:
- `new String(byte[])` — uses platform default
- `FileReader` / `FileWriter` — wraps `InputStreamReader` with platform default. Use `Files.readString(path, UTF_8)` or `BufferedReader` constructed explicitly with charset.
- `PrintStream`, `Scanner`, `Properties.load(InputStream)` — platform-default land mines

**Java 18+ change:** the platform default charset is now UTF-8 by default (JEP 400) — long overdue. But code that runs on older JDKs or with `-Dfile.encoding=...` overrides still bites. Be explicit anyway.

**Rule:** if your code does any I/O with text, always pass `StandardCharsets.UTF_8` (or whatever you actually need). Never rely on platform default.

---

## Related Notes

- [[Java Theory - Interview Reference]] — JPM-tuned cram sheet (overlap is intentional)
- [[Algorithm Patterns]]
- [[System-Design-Patterns]]
- [[System Design Practice]]
- [[Neet-150-Pattens]]
