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

Each answer is interview-shaped: 2–6 sentences, code where useful, no textbook padding.

1. [[#Core Java]]
2. [[#Modern Java (Java 8+)]]
3. [[#Collections]]
4. [[#Concurrency]]
5. [[#JVM, Memory & Performance]]
6. [[#Spring]]
7. [[#Database, JPA & Hibernate]]
8. [[#Design Patterns & Architecture]]
9. [[#Testing]]
10. [[#System Design & Best Practices]]
11. [[#Security]]
12. [[#Messaging (Kafka)]]
13. [[#Common Pitfalls & Spot-the-Bug]]
14. [[#Build Tools]]
15. [[#Cloud-Native Java]]
16. [[#Networking & Protocols]]
17. [[#Resilience Patterns]]
18. [[#Java Module System (JPMS)]]
19. [[#Related Notes]]

---

## Core Java

### Summary

**What this topic covers**

The language fundamentals every Java developer is expected to have at their fingertips — and that every Java interview opens with as a warm-up before going deeper. Three concern areas live here: (1) the **platform model** — the JDK / JRE / JVM stack and how Java source actually becomes a running program; (2) the **object model** — OOP principles, classes vs interfaces, immutability, inner classes, the Object contract, generics (with type erasure), reflection, annotations; and (3) the **semantic primitives** — pass-by-value, primitive vs reference, static vs dynamic binding, equals/hashCode, access modifiers, static initialisation order, the `final`/`finally`/`finalize` triad. The 23 questions in this topic are the surface; the principles underneath are what every later topic (Collections, Concurrency, Generics, Memory Management) silently builds on.

**Mental model**

Think of Java in three layers. (1) **Source → bytecode**: `javac` compiles `.java` files into platform-independent `.class` files of JVM bytecode. (2) **Bytecode → runtime**: a JVM (HotSpot, OpenJ9, GraalVM, Azul) loads classes, verifies bytecode, JIT-compiles hot methods to native machine code, and runs them inside the managed heap. (3) **The standard library + tooling**: collections, IO, concurrency primitives, the compiler itself — all distributed as the JDK. "Write once, run anywhere" really means "compile once, run wherever a JVM exists" — the JVM is the abstraction barrier. The other mental shift is **everything is an object except primitives**. The eight primitive types (`int`, `long`, `double`, etc.) live as raw values on the stack or inside objects; every other identifier is a *reference* to a heap-allocated object. Pass-by-value applies to *both* — primitives copy the value, references copy the pointer. That single rule explains why mutating an object through a parameter affects the caller but reassigning the parameter doesn't.

**Key terms**

- **JVM** — runtime executing bytecode, providing class loading + JIT + GC.
- **JRE** — JVM + standard libraries; largely deprecated as a separate distribution since Java 11.
- **JDK** — JRE + `javac` + tooling; the default download today.
- **OOP principles** — encapsulation, inheritance, polymorphism, abstraction.
- **Class vs interface** — single inheritance of state vs multiple inheritance of behaviour-only contracts (with default and static methods since Java 8, and private methods since Java 9).
- **Immutability** — state cannot change after construction; thread-safe by default, safe as `HashMap` keys, cacheable.
- **Inner classes** — non-static inner (captures enclosing instance), static nested (no capture), local (method-scoped), anonymous (single-use, now mostly replaced by lambdas).
- **Type erasure** — generics are compile-time only; `List<String>` and `List<Integer>` are the same `List` at runtime. Drives the no-array-of-generics rule and the PECS (`producer extends, consumer super`) wildcard convention.
- **`equals` / `hashCode` contract** — equal objects must have equal hash codes; a class overriding one must override the other.
- **Static vs dynamic binding** — overloading resolves at compile time on the declared type; overriding resolves at runtime on the actual object's class.
- **Pass-by-value** — Java has *only* pass-by-value; references happen to be values that point at objects.

**Why interviewers ask this**

Three signals. (1) **Foundations check** — can you explain JVM vs JRE vs JDK without hedging? Junior candidates often slur them; senior candidates know the differences and the operational implication (you ship a JDK, not a JRE, in 2026 containers). (2) **Reasoning under semantics** — questions about immutability, pass-by-value, and equals/hashCode test whether you can reason about *what the runtime actually does*, not just write working code. Get the pass-by-value question right and the interviewer relaxes; get it wrong and the rest of the interview is a recovery operation. (3) **Modern Java awareness** — the diamond problem, default methods, records (Java 14+), pattern matching — knowing what changed in Java 8 / 11 / 17 / 21 / 25 separates candidates who've shipped recent code from candidates who haven't touched the language since Java 8.

**Common confusions**

- "JVM and JRE are the same thing" — they're not; the JRE is the JVM *plus* the runtime libraries. The distinction matters for size and tooling decisions.
- "Abstract classes are interfaces with state" — closer to right than wrong, but ignores that interfaces have had default methods (Java 8), static methods (Java 8), and private methods (Java 9) for years; the gap is narrower than it used to be.
- "Immutability means `final`" — `final` prevents *re-assignment* of a reference; it does **not** prevent mutation of the referenced object. `final List<String> xs = new ArrayList<>(); xs.add("hi");` compiles and runs.
- "Java is pass-by-reference for objects" — it isn't. Java is **pass-by-value for everything**; the value of an object variable is a reference. That's why reassigning a parameter doesn't affect the caller but mutating through it does.
- "Inner classes and nested classes are the same" — only the *non-static* nested ones are "inner" classes that capture the enclosing instance; static nested classes are just namespaced. Mixing the terms in an interview is a junior tell.
- "Type erasure means generics are useless" — type erasure means generics are *compile-time* useful; the type checker enforces them, runtime just sees raw types. Drives the no-`new T()`, no-array-of-generics constraints.

**What follows from this topic**

Every later topic in this primer assumes you can think in these primitives. The immutability question previews the entire Concurrency section (thread-safe by construction is the easiest concurrency story). The JDK / JRE / JVM layering previews JVM Internals, Memory Management, and Performance. Abstract-vs-interface previews Design Patterns and Architecture. Generics + type erasure previews how Collections and Reactive APIs are typed. If Core Java feels shaky, fix it first — drilling further topics on top of weak foundations doesn't compound.

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

### Q7. == vs `.equals()`, and the `hashCode()`/`equals()` contract.

- The `==` Operator
    - **Compares references** for objects (memory addresses)
    - **Compares values** for primitives
    - Cannot be overridden — it's a JVM-level operation
- The `.equals()` Method
    - **Compares logical equality** (content/value equality)
    - Inherited from `Object` class (default implementation uses `==`)
    - Can and should be overridden for meaningful comparison
- When to Override `equals()` and `hashCode()`
    - You should override both when:
        1. **Objects need logical equality** rather than reference equality
        2. **Objects will be used in hash-based collections** (`HashMap`, `HashSet`, `Hashtable`)
        3. **You're creating a value class** (like `Address`, `Money`, `Point`)
        4. **Business logic requires equality comparison**
- Why `equals()` and `hashCode()` Must Be Consistent
    - This is absolutely critical for hash-based collections to work correctly.
    - The Contract:
        - **The fundamental rule:** if two objects are equal according to `equals()`, they MUST have the same `hashCode()`.
        - `a.equals(b) == true` → `a.hashCode() == b.hashCode()` (MUST be true)
        - `a.hashCode() == b.hashCode()` → `a.equals(b)` (MAY be true or false)
    - The two-step process in hash collections:
        1. `hashCode()` determines which bucket to look in (fast)
        2. `equals()` finds the exact match within that bucket

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

### Q136. What is reflection and when should you use it?

Reflection is the API for inspecting and manipulating classes/methods/fields at runtime — `Class.forName`, `getDeclaredMethods`, `Method.invoke`, `Field.set`. Frameworks use it pervasively: Spring DI, JPA, Jackson, JUnit. They have to — they don't know your classes at compile time.

Application code: avoid except for narrow cases (dynamic plugin loading, generic frameworks, working around library limits). Costs:
- 10-100x slower than direct calls
- Compile-time type safety lost
- Refactor-hostile (renamed field → runtime crash, no compiler warning)
- Module system blocks reflection without explicit `opens`

Modern alternatives: `MethodHandle` (faster, type-safe via signatures), `LambdaMetafactory` (used internally by lambdas), compile-time annotation processors (Lombok, MapStruct, Immutables, Dagger) — generate plain Java rather than reflect at runtime.

### Q137. Explain Java annotations and retention policies.

Annotations attach metadata to code elements. Three retention policies (`@Retention`):

- **`SOURCE`** — discarded after compile (`@Override`, `@SuppressWarnings`)
- **`CLASS`** — in `.class` file, not loaded at runtime (default)
- **`RUNTIME`** — available via reflection (`@Component`, `@Test`, `@JsonProperty`)

`@Target` restricts where they apply (`METHOD`, `TYPE`, `FIELD`, `PARAMETER`, `ANNOTATION_TYPE`, etc.). `@Repeatable` allows multiple of the same annotation on one element.

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {
    String value() default "";
}
```

**Annotation processors** run at compile time (`javax.annotation.processing.Processor`). Lombok, MapStruct, Immutables, Dagger generate code rather than reflect at runtime — much faster, fully type-checked.

### Q138. Why is Java's serialization considered dangerous?

`Serializable` lets the JVM convert object graphs to bytes via `ObjectOutputStream`. Sounds great. Real-world problems:

- **Security** — deserialisation invokes constructors of arbitrary classes on the classpath. Attacker-controlled bytes → remote code execution. The Apache Commons Collections RCE was this. Don't deserialise untrusted input.
- **Coupling** — wire format is tied to class shape. Rename a field → deserialisation fails. `serialVersionUID` only partially helps.
- **Bypasses constructors** — invariants checked in your constructor are skipped. Need defensive `readObject` to compensate.
- **Surprises** — `transient` fields not serialised; statics not serialised; non-`Serializable` fields cause runtime errors; `enum` and `record` deserialisation has special rules.

**Alternatives:** Jackson/Gson (JSON), Protobuf/Avro (schema-evolved binary), Kryo (fast Java-only). Java now ships serialisation filters (`-Djdk.serialFilter`) — serious shops disable native serialisation entirely.

### Q139. Why is `clone()` and `Cloneable` considered broken?

`Cloneable` is a marker interface that doesn't define `clone()`; `clone()` lives on `Object` as `protected` and `native`. To use it: implement `Cloneable`, override `clone()` as public, call `super.clone()`, suffer.

Problems (Effective Java item 13 — "the clone method is generally considered broken"):
- Bypasses constructors → invariants skipped
- Default is shallow → references shared with original; deep copies need manual override (easy to forget)
- Throws checked `CloneNotSupportedException`
- Inheritance + `clone` is a minefield — subclass may not implement `Cloneable`
- Conflicts with `final` fields (can't reassign in `clone()`)

**Alternatives:** copy constructors (`new Person(other)`), copy factory methods (`Person.copyOf(other)`), immutability + `with*` methods, serialisation roundtrip for deep copies. Records get a free shallow copy via the canonical constructor; for variations, write a `with*` style factory.

### Q140. What are the methods on `java.lang.Object` and when should you override them?

Eleven public methods. Three you should consider overriding:
- **`equals(Object)`** — value equality
- **`hashCode()`** — must be consistent with equals
- **`toString()`** — debug aid, log/exception messages improve

Three you can't:
- `getClass()` — final
- `wait`/`notify`/`notifyAll` — final, concurrency primitives

Two you shouldn't:
- `clone()` — broken (Q139)
- `finalize()` — deprecated since Java 9, removed for `Object` in Java 18; use `Cleaner` or try-with-resources

Records auto-generate `equals`, `hashCode`, and `toString` correctly. Use them for value types instead of writing these by hand.

### Q141. Explain bounded wildcards and the PECS rule.

Bounded wildcards constrain generic type parameters:
- `<? extends T>` — upper bound; T or any subtype
- `<? super T>` — lower bound; T or any supertype

**PECS** (Producer Extends, Consumer Super) — Joshua Bloch's mnemonic:
- If the structure **produces** T's (you read them out), use `<? extends T>`
- If the structure **consumes** T's (you write them in), use `<? super T>`

```java
// Producer — reads Numbers out
public static double sum(List<? extends Number> nums) {
    double s = 0;
    for (Number n : nums) s += n.doubleValue();
    return s;
}

// Consumer — writes Integers in
public static void addInts(List<? super Integer> dst) {
    dst.add(42);
}

// Both — Collections.copy
public static <T> void copy(List<? super T> dst, List<? extends T> src) { ... }
```

Without bounded wildcards, `List<Integer>` isn't a `List<Number>` (generics are invariant). PECS gives flexibility without sacrificing type safety. Trade-off: a `<? extends T>` list can't have anything added (the compiler doesn't know which subtype it actually holds).

### Q142. What's the static initialisation order in Java?

For a class hierarchy `Parent` → `Child`, when something first triggers `Child` to load:

1. Parent class loaded first
2. Parent's `static` fields initialised in declaration order
3. Parent's `static` initialiser blocks run in source order (interleaved with field initialisers)
4. Child class loaded
5. Child's `static` fields initialised
6. Child's `static` initialiser blocks run

When an instance is then created (`new Child()`):

7. Parent's instance fields initialised
8. Parent's instance initialiser blocks run
9. Parent's constructor body runs
10. Child's instance fields initialised
11. Child's instance initialiser blocks run
12. Child's constructor body runs

**Key gotcha:** a `static final` field initialised by a constant expression is **inlined into callers at compile time**. References from other classes don't trigger class loading — useful for interface constants (no init), surprising when you change a constant's value and a stale class isn't recompiled.

```java
class A {
    static final int X = 5;          // inlined into other classes
    static final int Y = compute();  // forces class init when accessed
}
```

### Q309. Primitive vs object references.

- The fundamental difference is **how they store and handle data**:
    - **Primitives**: store the **actual value** directly
    - **Object References**: store the **memory address** pointing to where the object lives
- **Primitives** → usually stored in **Stack** (when local variables)
- **Objects** → always stored in **Heap** (only references can be in stack)
- Passing semantics:
    - Primitives are passed by value (copy)
    - References are passed by value (the address is copied) — callee sees the same object but reassignment inside doesn't affect the caller
- Wrapper types (`Integer`, `Double`) box primitives: same value but heap-allocated, cache-sensitive, nullable. Costs: allocation, indirection, GC pressure. Use primitives in hot paths.

---

## Modern Java (Java 8+)

### Summary

**What this topic covers**

Everything that arrived in the language after the long Java-7 freeze, and everything that's arrived since under the six-month release cadence (Java 9 onwards). Three concern areas: (1) the **functional turn** — lambdas, method references, `Optional`, streams, functional interfaces, the `java.util.function` package; (2) the **data and pattern modernisation** — records, sealed types, pattern matching for `instanceof` and `switch`, switch expressions, text blocks, `var` inference; and (3) the **runtime and concurrency modernisation** — virtual threads (Loom), `StructuredTaskScope`, the new `HttpClient`, sequenced collections, and the previews still cooking (Valhalla value types, Leyden AOT, Panama FFM, Vector API). The 26 questions cover the surface; what an interviewer is really probing is whether you've shipped code on a recent LTS (17 or 21) or whether your Java is frozen at 8.

**Mental model**

Pre-Java-8 Java was an OO language with verbose anonymous-inner-class boilerplate everywhere collections needed transformation. Java 8 grafted a functional layer onto that core — lambdas are syntactic sugar for `invokedynamic` + `LambdaMetafactory` calls that synthesise instances of single-abstract-method interfaces at runtime, streams are a pipeline DSL on top of `Spliterator`. From Java 9 onwards the language has accreted *features designed to make data modelling cheap*: records collapse 60 lines of equals/hashCode/toString into one, sealed types make exhaustiveness checking possible, pattern matching turns nested `instanceof` casts into expressions. The third evolution — Loom — quietly upended the JVM concurrency story: a virtual thread is a continuation parked on a *carrier* platform thread, so you can write blocking, sequential code and get reactive-grade scalability without callbacks. The unifying theme: Java is gradually closing the gap with Kotlin/Scala without breaking source compatibility.

**Key terms**

- **Functional interface** — interface with exactly one abstract method; the type of a lambda. `Function`, `Predicate`, `Consumer`, `Supplier`, `Runnable`, `Callable`.
- **Lambda** — `(x) -> x + 1`; compiled to an `invokedynamic` site that lazily creates an implementing class.
- **Stream** — lazy pipeline over a source; intermediate ops are deferred until a terminal op fires.
- **`Optional<T>`** — explicit absence; an API return type, not a field type, not a parameter type.
- **Record** — final, immutable data carrier; canonical / compact / custom constructors; gets equals/hashCode/toString for free.
- **Sealed type** — `sealed interface` / `sealed class` with a `permits` clause; enables exhaustive pattern matching.
- **Pattern matching** — `if (x instanceof Foo f)`, `switch` with type patterns and record deconstruction patterns (Java 21).
- **Switch expression** — `switch` that *returns a value*; `->` arms; no fall-through.
- **Text block** — `"""..."""` multi-line literal with smart indentation stripping.
- **`var`** — local-variable type inference; not `dynamic`, still statically typed.
- **Virtual thread** — lightweight thread scheduled by the JVM onto carrier threads; cheap to create millions of.
- **`StructuredTaskScope`** — Java 21+ API for treating concurrent subtasks as a single unit with shared lifetime and cancellation.

**Why interviewers ask this**

Three signals. (1) **Recency** — anyone can list Java 8 features; only a candidate writing modern Java this year talks fluently about records, sealed types, pattern matching, virtual threads. The gap between "I know Java 8" and "I ship on Java 21" is huge. (2) **Idiom mastery** — `Optional` as a return type is fine; `Optional` fields and `Optional` parameters are anti-patterns. `flatMap` vs `map`, intermediate vs terminal ops, why `Stream.peek` is for debugging only — these are everyday correctness questions. Stream misuse turns up in code review every week. (3) **Concurrency direction of travel** — if you ask a senior candidate whether to use reactive or virtual threads for a new I/O-bound service in 2026 and they don't have an opinion, that's a red flag. Loom changes the answer for most non-streaming workloads and the candidate should know it.

**Common confusions**

- "Lambdas are anonymous inner classes" — they're not; `invokedynamic` + `LambdaMetafactory` produces a *different* bytecode shape with no captured `this` unless required.
- "`Optional` should be used everywhere" — no. Return types yes, fields and parameters no. Don't serialise `Optional` over the wire.
- "Streams are always faster" — they're often *slower* than a plain `for` loop for small collections; the win is readability and parallelisation, not raw throughput.
- "`var` is dynamic typing" — it isn't. The compiler infers a single static type at the declaration site.
- "Virtual threads make `synchronized` safe again" — they don't. `synchronized` *pins* the virtual thread to its carrier, defeating the scalability win; use `ReentrantLock` instead.
- "Records are just data classes" — they're more: canonical equality, exhaustive deconstruction in patterns, and a contract that the components *are* the state.

**What follows from this topic**

Modern Java sets the idiom baseline for everything later in the primer. Streams + `Optional` show up in Collections. Virtual threads + `StructuredTaskScope` reshape Concurrency. Records + sealed types are the building blocks of Design Patterns (algebraic data types, state machines). Pattern matching changes how you write defensive code in Common Pitfalls. If your Java mental model is frozen at 8, modernise here before going further — interviewers can tell within two minutes.

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

- A **functional interface** is an interface that contains **exactly one abstract method**. It's the foundation of lambda expressions and functional programming in Java 8+.
- Marked optionally with `@FunctionalInterface` for compiler enforcement. Default and static methods don't count toward the SAM rule.
- Built-ins live in `java.util.function`: `Predicate<T>`, `Function<T,R>`, `Consumer<T>`, `Supplier<T>`, `BiFunction<T,U,R>`.

```java
@FunctionalInterface
interface Predicate<T> { boolean test(T t); }

Predicate<String> nonEmpty = s -> !s.isEmpty();
```

### Q18. How do lambda expressions work internally?

Lambdas are **not** anonymous inner classes. The compiler emits an `invokedynamic` bytecode instruction that, on first call, asks the JVM to bootstrap a `CallSite` via `LambdaMetafactory`. The factory generates a class implementing the target functional interface and returns a method handle.

Benefits:
- No `.class` file per lambda (smaller artefacts)
- JVM can choose the most efficient strategy (e.g. cache the instance for stateless lambdas)
- Better JIT optimisation than anonymous classes

A stateless lambda (`s -> s.isEmpty()`) is typically a singleton. A stateful one (`s -> s.equals(prefix)`) creates a new instance per capture.

### Q19. What is the difference between `map()` and `flatMap()` in streams?

- **`map`**: Transforms each element and **preserves the nesting**
    - Simple transformation (1-to-1 mapping)
    - Converting types
    - Applying a function to each element
- **`flatMap`**: Transforms each element and **flattens one level** of nesting
    - One-to-many transformations
    - Dealing with nested collections
    - Removing empty results
    - Combining multiple streams

```java
List<List<Integer>> nested = List.of(List.of(1, 2), List.of(3, 4));
nested.stream().map(List::stream);      // Stream<Stream<Integer>> — wrong shape
nested.stream().flatMap(List::stream);  // Stream<Integer> — flattened
```

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

### Q143. How do records use compact constructors for validation?

A **compact constructor** is special syntax for a record's canonical constructor — no parameter list, the parameters are implicit, field assignments happen automatically at the end.

```java
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        if (amount == null) throw new IllegalArgumentException("amount required");
        if (currency == null) throw new IllegalArgumentException("currency required");
        amount = amount.setScale(currency.getDefaultFractionDigits(), HALF_UP);
        // No explicit `this.amount = amount` — it's implicit at end
    }
}
```

Inside the compact body you can:
- Validate inputs (`throw`)
- Normalise inputs (reassign the *parameter* — not the field — and the implicit assignment captures the normalised value)

You can also write a **full canonical constructor** (matching component types) when you need to do something the compact form can't — but the compact form is preferred. Records can additionally have static factory methods, instance methods, custom accessors that override the default.

### Q144. Show a worked example of sealed types for state machines.

```java
public sealed interface PaymentResult
    permits Approved, Declined, Pending, Failed {}

public record Approved(String authCode, Instant authorisedAt) implements PaymentResult {}
public record Declined(String reason) implements PaymentResult {}
public record Pending(String trackingId) implements PaymentResult {}
public record Failed(Throwable cause) implements PaymentResult {}

// Exhaustive matching — compiler enforces every variant handled
String summary = switch (result) {
    case Approved(var code, var at) -> "auth %s at %s".formatted(code, at);
    case Declined(var reason)       -> "declined: " + reason;
    case Pending(var id)            -> "pending: " + id;
    case Failed(var cause)          -> "failed: " + cause.getMessage();
    // No default needed — compiler sees the closed set via `permits`
};
```

`permits` can be omitted if all subtypes are in the same compilation unit. Sealed + records + pattern matching = **algebraic data types in Java**. The single best modern way to model finite domain states (booking outcomes, order events, payment results, parser tokens).

### Q145. Pattern matching for switch + record patterns — what changed?

Java 21 finalised both. Switch dispatches on type with binding; records can be deconstructed inside patterns:

```java
sealed interface Shape permits Circle, Square, Triangle {}
record Circle(double radius) implements Shape {}
record Square(double side) implements Shape {}
record Triangle(double base, double height) implements Shape {}

double area = switch (shape) {
    case Circle(double r)              -> Math.PI * r * r;
    case Square(double s)              -> s * s;
    case Triangle(double b, double h)  -> 0.5 * b * h;
    case null                          -> 0;
};
```

**`when` clauses** add boolean guards:
```java
String desc = switch (n) {
    case Integer i when i < 0  -> "negative";
    case Integer i when i == 0 -> "zero";
    case Integer i             -> "positive: " + i;
    case null                  -> "no value";
};
```

**Nested record patterns:**
```java
case Box(Point(var x, var y), var width, var height) -> ...;
```

Replaces visitor pattern. Combined with sealed types, gives exhaustive checking. Replaces N hand-rolled `instanceof` chains.

### Q146. Switch expressions vs switch statements — what's the difference?

Switch expressions (Java 14+) **return values** and force exhaustiveness; statements don't.

```java
// Statement (legacy) — fall-through, breaks, side effects
int days;
switch (month) {
    case JAN: case MAR: case MAY: days = 31; break;
    case APR: case JUN: ... days = 30; break;
    default: throw new IllegalStateException();
}

// Expression (modern) — exhaustive, no fall-through, returns
int days = switch (month) {
    case JAN, MAR, MAY, JUL, AUG, OCT, DEC -> 31;
    case APR, JUN, SEP, NOV                -> 30;
    case FEB                                -> isLeap ? 29 : 28;
};
```

**Arrow form** (`->`) means no fall-through, scoped to a single branch. **Yield** lets a multi-statement block return a value:

```java
int x = switch (s) {
    case "a" -> 1;
    case "b" -> {
        int n = compute();
        yield n * 2;     // yield, not return
    }
};
```

Switch expressions on enum or sealed types must be exhaustive — compiler enforces. For `int`/`String`, you still need `default`.

### Q147. How do text blocks handle escaping and indentation?

Java 15. Triple-double-quote multi-line strings:

```java
String json = """
    {
        "name": "Alice",
        "active": true
    }
    """;
```

**Indentation handling:** the compiler finds the minimum leading whitespace across all non-empty lines (including the line with the closing `"""`) and strips that much from every line. So the JSON above has zero leading whitespace per line — 4 spaces stripped. Move the closing `"""` left to keep more leading whitespace; right to strip more.

**Escape rules:**
- `\n`, `\t`, `\\`, `\"` — same as regular strings
- Triple-quote inside a text block: `\"""`
- `\` at end of line: line continuation (no newline added)
- `\s` — escape a single space (defends against trailing-whitespace stripping)

**`String.formatted()`** (Java 15+) replaces `String.format(template, args)` boilerplate:

```java
String greeting = """
    Hello, %s.
    You have %d messages.
    """.formatted(name, count);
```

### Q148. `var`, diamond operator, and target typing — how does Java infer types?

**`var`** (Java 10) — local-variable type inference. Compiler infers the static type from the initialiser expression:

```java
var list = new ArrayList<String>();   // ArrayList<String>
var map  = Map.of("k", 1);             // Map<String, Integer>
for (var entry : map.entrySet()) ...   // Map.Entry<String, Integer>
```

Restrictions: locals only (not fields, parameters, return types — except lambda params since 11), must have initialiser, can't be null without explicit type, can't be array initialiser shorthand.

**Diamond operator** (Java 7) — infers generic type args from context:

```java
List<String> list = new ArrayList<>();         // <> infers <String>
Map<String, List<Integer>> m = new HashMap<>(); // works for nested too
```

**Target typing** — the expected type on the left drives inference on the right:

```java
Predicate<String> p = s -> s.isEmpty();   // s inferred as String from Predicate<String>
List<String> sorted = stream
    .sorted()
    .collect(Collectors.toList());        // toList<>() inferred from List<String>
```

`var` + target typing collide — without a target type, the compiler can't infer a lambda's interface:

```java
var p = s -> s.isEmpty();                       // ✗ no target type
var p = (Predicate<String>) s -> s.isEmpty();   // ✓ explicit cast restores it
```

### Q149. What's the virtual thread pinning gotcha?

Virtual threads (Java 21) usually **unmount** from their carrier OS thread on blocking I/O — that's the whole point. The carrier runs other virtual threads while the original waits for I/O.

**`synchronized` blocks pin** the virtual thread to its carrier. The carrier can't run other virtual threads during the synchronized region. Defeats the optimisation.

```java
// BAD — pins virtual thread to carrier across blocking I/O
synchronized (lock) {
    blockingIoCall();
}

// GOOD — ReentrantLock doesn't pin
lock.lock();
try { blockingIoCall(); }
finally { lock.unlock(); }
```

Other pinning sources in Java 21:
- Native frames (`native` methods, JNI calls)
- Class initialisers running on this thread
- File I/O before NIO.2 / `Files.newInputStream`

**Detect** with `-Djdk.tracePinnedThreads=full` — JVM logs every pin event with stack trace.

**Java 24 (JEP 491)** removes the `synchronized` pinning hazard — most code becomes safe automatically. Until then, audit `synchronized` blocks that wrap I/O and migrate hot paths to `ReentrantLock`.

### Q150. Explain `StructuredTaskScope`.

Structured concurrency for Java — mirror of Kotlin's `coroutineScope`. Concurrent tasks share a parent scope; either all complete or all cancel.

```java
// Java 21+ preview API
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User>    userTask    = scope.fork(() -> userService.fetch(id));
    Subtask<Profile> profileTask = scope.fork(() -> profileService.fetch(id));

    scope.join();              // wait for all
    scope.throwIfFailed();     // propagate first failure

    return new UserView(userTask.get(), profileTask.get());
}
```

Scope flavours:
- **`ShutdownOnFailure`** — first failure cancels siblings (like `coroutineScope`)
- **`ShutdownOnSuccess`** — first success cancels siblings (like `Promise.race`)

Compared to `CompletableFuture.allOf`:
- Cleaner cancellation semantics
- Structured lifetime — scope can't outlive the try block
- Exceptions propagate naturally rather than being wrapped in `CompletionException`
- Works beautifully with virtual threads

Going final (with API tweaks) in a future LTS.

### Q151. Sequenced collections (Java 21) — what problem do they solve?

Pre-21, "first" and "last" were inconsistent across collections. `LinkedList.getFirst()`, `Deque.peekFirst()`, `LinkedHashMap` had no clean first/last API. Java 21 added a unified hierarchy:

- **`SequencedCollection<T>`** extends `Collection<T>` — `getFirst`, `getLast`, `addFirst`, `addLast`, `removeFirst`, `removeLast`, `reversed()`
- **`SequencedSet<T>`** extends `Set<T>`
- **`SequencedMap<K,V>`** extends `Map<K,V>` — `firstEntry`, `lastEntry`, `putFirst`, `putLast`, `reversed()`

Backfilled into `List`, `Deque`, `LinkedHashSet`, `LinkedHashMap`, `TreeSet`, `TreeMap`, `SortedSet`. `HashSet` / `HashMap` deliberately don't get these — they have no defined order.

```java
List<Integer> xs = List.of(1, 2, 3);
xs.getFirst();        // 1
xs.getLast();         // 3
xs.reversed();        // [3, 2, 1] — reversed view, not a copy

LinkedHashMap<String, Integer> m = new LinkedHashMap<>();
m.put("a", 1); m.put("b", 2);
m.firstEntry();       // a=1
m.reversed();         // SequencedMap with reversed iteration
```

Replaces decade-old workarounds (`list.get(list.size() - 1)`, `iterator().next()`, etc.).

### Q152. Java's `HttpClient` — sync vs async usage?

Java 11 final API. Replaces `URLConnection` and the historic Apache HttpClient dependency for most cases. HTTP/2 by default; HTTP/3 in newer versions (preview).

**Sync (blocking):**
```java
HttpClient client = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder(URI.create("https://api.example.com/users/42"))
    .header("Accept", "application/json")
    .timeout(Duration.ofSeconds(5))
    .GET()
    .build();
HttpResponse<String> resp = client.send(req, BodyHandlers.ofString());
String body = resp.body();
int status = resp.statusCode();
```

**Async (non-blocking):**
```java
client.sendAsync(req, BodyHandlers.ofString())
    .thenApply(HttpResponse::body)
    .thenApply(this::parseJson)
    .exceptionally(ex -> fallback())
    .orTimeout(2, TimeUnit.SECONDS);
```

**Body handlers:** `ofString`, `ofByteArray`, `ofInputStream`, `ofFile(path)`, `ofPublisher` (reactive), `discarding`. Custom via `BodyHandlers.fromSubscriber`.

Java 21+: prefer **virtual threads** + sync calls over async chains for concurrent I/O. Avoids callback complexity while keeping scalability.

### Q277. Project Loom internals — how do virtual threads work mechanically?

Virtual threads are Java-managed (not OS-managed) threads multiplexed onto a small pool of **carrier** OS threads.

**Lifecycle:**
1. Virtual thread created — JVM allocates a small stack-frame region (~kB, not MB)
2. Submitted to scheduler (default: a `ForkJoinPool` of carrier threads)
3. Scheduler **mounts** virtual thread onto a free carrier
4. Code runs on the carrier
5. Blocking call (sleep, socket read, sync I/O) — JVM **unmounts** the virtual thread, parks it
6. Carrier runs another virtual thread
7. When the blocking operation completes, the virtual thread is rescheduled
8. Eventually mounted again, possibly on a different carrier

**Continuation:** the runtime mechanism that captures a paused virtual thread's stack and restores it on resume. Implemented in the JVM (`jdk.internal.vm.Continuation`).

**Pinning:** when a virtual thread can't be unmounted from its carrier:
- `synchronized` blocks (Java 21 — fixed in 24 via JEP 491)
- Native frames (JNI calls)
- Class initialisers running on this thread

**Key insight:** virtual threads are **cheap to create** but the carrier pool is bounded. Many virtual threads → few carriers → unmounting must work for the model to scale.

### Q278. Project Valhalla — value types coming.

Long-running JEP. Aim: add **value types** to Java — objects without identity, can be inlined into containers.

**Today's box-vs-primitive split:**
```java
List<Integer> list = ...;   // each Integer = object header + payload, scattered in heap
int[] arr = ...;             // contiguous primitives, no headers
```

**With Valhalla (preview Java 22+):**
```java
value class Point { int x; int y; }
Point[] points = new Point[1000];   // contiguous, no per-element header
List<Point> list = ...;             // potentially flattened
```

**Benefits:**
- Cache-friendly — no pointer chase
- Lower memory — no headers (~12-16 bytes per object saved)
- Allows generic specialisation — `List<int>` would be a real thing

**Status (May 2026):** in active preview, expected GA Java 25-26. Worth knowing because it changes how you'll model value types — fewer reasons to use primitives over value classes.

### Q279. Project Leyden — ahead-of-time compilation roadmap.

Aim: improve Java startup time and predictability. Less radical than GraalVM native image, more incremental.

**Phases:**
- **AppCDS** (already in JDK) — share class metadata across runs
- **JIT cache** — persist compiled methods between runs
- **Static images** (long-term) — fully ahead-of-time-compiled binaries

**Trade-off vs GraalVM native image:** Leyden keeps the dynamic language features (reflection, dynamic class loading) but improves startup; GraalVM gives up dynamism for the smallest, fastest binaries.

**Practical:** as of Java 24-25, Leyden is in active development. Watch JEPs 483 (Ahead-of-Time Class Loading), 514 (Ahead-of-Time Method Profiling).

### Q280. Vector API (incubator) — SIMD in Java.

Lets Java code emit SIMD (Single Instruction Multiple Data) CPU instructions explicitly.

```java
import jdk.incubator.vector.*;

static final VectorSpecies<Float> SPECIES = FloatVector.SPECIES_PREFERRED;

void multiplyAdd(float[] a, float[] b, float[] c, float[] out) {
    int i = 0;
    int upperBound = SPECIES.loopBound(a.length);
    for (; i < upperBound; i += SPECIES.length()) {
        FloatVector va = FloatVector.fromArray(SPECIES, a, i);
        FloatVector vb = FloatVector.fromArray(SPECIES, b, i);
        FloatVector vc = FloatVector.fromArray(SPECIES, c, i);
        va.fma(vb, vc).intoArray(out, i);
    }
    for (; i < a.length; i++) out[i] = Math.fma(a[i], b[i], c[i]);   // tail
}
```

**Use cases:** numerical libraries, ML inference, image/audio processing, hashing/checksums.

**Status (May 2026):** still incubator. Likely promoted to standard around Java 26.

### Q281. Project Panama / Foreign Function & Memory API.

Replaces JNI for calling native code. Final in Java 22.

```java
Linker linker = Linker.nativeLinker();
SymbolLookup libc = linker.defaultLookup();

MemorySegment strlenAddr = libc.find("strlen").orElseThrow();
MethodHandle strlen = linker.downcallHandle(
    strlenAddr,
    FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS)
);

try (Arena arena = Arena.ofConfined()) {
    MemorySegment cString = arena.allocateUtf8String("Hello, world!");
    long len = (long) strlen.invoke(cString);
    System.out.println(len);   // 13
}
```

**Vs JNI:**
- No `.h` files, no native compilation step
- Type-safe via `MemoryLayout` and `MethodHandle`
- Memory automatically freed when `Arena` closed
- ~10x faster for FFI calls

**Use cases:** native library integration (image codecs, crypto, ML), legacy C API access, embedded systems.

### Q310. What is an Observable? (Reactor vs RxJava in the Spring world)

- An **Observable** is a data structure that represents a **stream of data or events over time** that can be observed. Think of it as a **"data pipeline"** that pushes values to subscribers as they become available — like a YouTube channel that notifies subscribers when new videos arrive.
- **Project Reactor** is Spring's reactive library, using **`Flux`** (0 to N elements) and **`Mono`** (0 or 1 element) instead of `Observable`. It's the foundation of Spring WebFlux.
- Reactor's `Flux`/`Mono` are the Spring ecosystem's answer to reactive programming, offering similar capabilities to RxJava's `Observable` but optimized for Spring WebFlux and reactive Spring applications.

---

## Collections

### Summary

**What this topic covers**

The Java Collections Framework — the day-to-day data structures every backend service runs on, plus the iteration, comparison, and concurrency machinery wrapped around them. Three concern areas live here: (1) the **hierarchy** — `Collection` (`List`, `Set`, `Queue`, `Deque`) and `Map` and how the implementations differ; (2) the **performance characteristics** — Big-O of each operation, when `ArrayList` beats `LinkedList`, what `HashMap` actually does on collision, what `ConcurrentHashMap` does differently, when initial capacity matters; and (3) the **idioms** — `Comparable` vs `Comparator`, fail-fast vs fail-safe iterators, immutable collection flavours, advanced stream collectors (`groupingBy`, `partitioningBy`, `toMap`), the three forms of `reduce`. The 23 questions cluster around picking the right structure, knowing why it's fast, and writing the idiomatic Java that uses it well.

**Mental model**

Think of collections as a two-axis matrix. One axis is **shape**: ordered list, unordered set, key-value map, FIFO queue, LIFO stack, double-ended deque, priority queue. The other axis is **implementation tradeoff**: hash-based (O(1) average, no order) vs tree-based (O(log n), sorted) vs array-backed (O(1) indexed, O(n) insert mid) vs linked-node (O(1) insert at ends, O(n) indexed). Then a third dimension overlays: **concurrency model** — unsynchronised (`ArrayList`, `HashMap`), externally-synchronised wrappers (`Collections.synchronizedList`), or built-for-concurrency (`ConcurrentHashMap`, `CopyOnWriteArrayList`, `ConcurrentLinkedQueue`). Default choices in 2026: `ArrayList` for lists, `HashMap` for maps, `HashSet` for sets, `ArrayDeque` for stacks and queues. Reach for the alternatives when you have a specific reason — predictable iteration order (`LinkedHashMap`), sorted iteration (`TreeMap`), thread safety (`ConcurrentHashMap`), bounded blocking queue (`LinkedBlockingQueue`). Knowing the matrix lets you justify every choice; not knowing it leads to `LinkedList` ending up in production where `ArrayList` belonged.

**Key terms**

- **`ArrayList`** — array-backed list; O(1) indexed access, amortised O(1) append, O(n) middle insert.
- **`LinkedList`** — doubly-linked list and `Deque`; O(1) ends, O(n) indexed. Almost always wrong; `ArrayDeque` is better for queue/stack uses.
- **`HashMap`** — open-addressed hash table since Java 8; converts long collision chains to red-black trees at threshold 8.
- **`LinkedHashMap`** — `HashMap` + doubly-linked list of entries for predictable iteration; powers LRU caches via `removeEldestEntry`.
- **`TreeMap`** — red-black tree, sorted by natural order or `Comparator`; O(log n) ops.
- **`ConcurrentHashMap`** — lock-striped (Java 7) / CAS + synchronised-bucket (Java 8+) thread-safe map; `compute`/`merge` for atomic check-and-act.
- **`Comparable` vs `Comparator`** — natural order on the class vs external ordering strategy.
- **Fail-fast vs fail-safe iterator** — `ArrayList`/`HashMap` iterators throw `ConcurrentModificationException` on structural change; `ConcurrentHashMap` iterators are weakly consistent.
- **PECS** — `producer extends, consumer super`; the wildcard rule for generic collections.
- **Three immutable flavours** — `Collections.unmodifiableXxx` (view, source still mutable), `List.of` / `Set.of` (truly immutable, null-hostile), `Collectors.toUnmodifiableList` (stream terminal).
- **`groupingBy` / `partitioningBy` / `toMap`** — the three collectors you reach for daily; `toMap` blows up on duplicate keys unless you pass a merger.

**Why interviewers ask this**

Three signals. (1) **Defaults and tradeoffs** — pick the wrong collection and you'll pay 100× in cache misses, allocation, or contention. A candidate who picks `LinkedList` for "fast inserts" without thinking about cache locality is signalling textbook knowledge, not production experience. (2) **HashMap internals** — every Java interview asks about HashMap because it tests three things at once: hashing, equality contract, and the Java-8 treeification optimisation. Get the contract right and your `equals`/`hashCode` answers in Core Java pay off here. (3) **Stream collectors** — `groupingBy`/`partitioningBy`/`toMap` are the daily-bread of data transformation in modern Java services. If you can't write a `Map<Customer, List<Order>>` reduction with `groupingBy(Order::customer)` on a whiteboard, you don't write modern Java. Senior candidates also know the *failure modes*: duplicate keys in `toMap`, ordering loss in `groupingBy` without a downstream `LinkedHashMap` supplier.

**Common confusions**

- "`LinkedList` is faster than `ArrayList` for inserts" — only at the ends, and `ArrayDeque` beats both. In the middle, `ArrayList`'s `System.arraycopy` is faster than walking node pointers because of cache locality.
- "`HashMap` is O(1)" — *amortised average*; O(n) worst case on adversarial keys before Java 8 treeification, O(log n) worst case after.
- "`Collections.synchronizedMap` is the same as `ConcurrentHashMap`" — it isn't. `synchronizedMap` locks the entire map; `ConcurrentHashMap` locks per bucket and supports concurrent iteration.
- "Iterating a `HashMap` while removing is fine if you call `map.remove`" — it isn't; only `iterator.remove()` is safe.
- "`Optional<T>` belongs in collections" — don't put `Optional` into a `Map`; use `containsKey`/`getOrDefault`.
- "Initial capacity doesn't matter" — it does for hot-path maps with known size; resize-and-rehash is expensive. Use `Maps.newHashMapWithExpectedSize(n)` or `new HashMap<>((int)(n / 0.75f) + 1)`.

**What follows from this topic**

Collections is the spine of every later topic. `ConcurrentHashMap` previews Concurrency primitives. The fail-fast / fail-safe distinction previews thread-safety reasoning. `equals`/`hashCode` here pays off in JPA entity design (Database). Stream collectors recur in System Design (aggregations) and Common Pitfalls (the `toMap` duplicate-key bug). If a candidate can't reason about Collections fluently, every later answer will leak.

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

### Q153. Big-O reference for Java collections.

Memorise this — interviewers ask "which collection?" expecting you to reason from Big-O.

| Collection | Add | Get/Contains | Remove | Notes |
|---|---|---|---|---|
| `ArrayList` | O(1) amortised end / O(n) middle | O(1) get index, O(n) contains | O(n) | Random access, cache-friendly |
| `LinkedList` | O(1) ends | O(n) | O(1) given iterator | Rarely the right answer |
| `ArrayDeque` | O(1) ends | O(1) ends | O(1) ends | Best deque/stack default |
| `HashMap` | O(1) avg | O(1) avg | O(1) avg | Unordered |
| `LinkedHashMap` | O(1) | O(1) | O(1) | Insertion or access order |
| `TreeMap` | O(log n) | O(log n) | O(log n) | Sorted by key |
| `HashSet` | O(1) avg | O(1) avg | O(1) avg | Wraps HashMap |
| `LinkedHashSet` | O(1) | O(1) | O(1) | Insertion ordered |
| `TreeSet` | O(log n) | O(log n) | O(log n) | Sorted |
| `PriorityQueue` | O(log n) | O(1) peek, O(n) contains | O(log n) min, O(n) arbitrary | Binary heap |
| `ConcurrentHashMap` | O(1) avg | O(1) avg | O(1) avg | Per-bin synchronisation |
| `CopyOnWriteArrayList` | O(n) | O(1) | O(n) | Read-heavy only |

`HashMap` worst case is O(log n) since Java 8 (treeified buckets), not O(n).

### Q154. When to use `WeakHashMap`, `IdentityHashMap`, `EnumMap`, `EnumSet`?

**`WeakHashMap`** — keys held by weak references; entries auto-evicted when key is garbage-collected. Use for memoisation/canonical-instance maps where you don't want the cache to prevent GC. Common in framework code (e.g. `ClassValue`).

```java
WeakHashMap<Class<?>, Metadata> cache = new WeakHashMap<>();
// Class unloaded → entry vanishes automatically
```

**`IdentityHashMap`** — uses `==` for key comparison instead of `equals`. Use when objects with equal content must be treated as distinct (graph traversal where you track visited *instances*, deep-copy frameworks, JVM-internal stuff).

**`EnumMap`** — `Map` keyed by an enum. Backed by an array indexed by `ordinal()`. Faster + smaller than `HashMap<Enum, V>`. Always prefer when keys are enum.

```java
EnumMap<DayOfWeek, Integer> hours = new EnumMap<>(DayOfWeek.class);
hours.put(DayOfWeek.MONDAY, 9);
```

**`EnumSet`** — `Set` of enum values. Backed by a `long` bitmap (single `long` for ≤64 enum values, otherwise `long[]`). Massively faster than `HashSet<Enum>`. Always prefer for enum sets.

```java
EnumSet<DayOfWeek> weekdays = EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);
```

### Q155. How does `PriorityQueue` work internally?

Backed by a **binary heap** stored in an array. `add` and `poll` are O(log n); `peek` is O(1). `contains` and arbitrary `remove` are O(n) — heap structure doesn't help for those.

By default it's a **min-heap** ordered by natural order or supplied `Comparator`:

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();   // smallest first
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());

PriorityQueue<Job> byPriority = new PriorityQueue<>(Comparator.comparingInt(Job::priority));
```

Iteration order is **not sorted** — it's heap order. To consume sorted, drain via `poll`:

```java
while (!pq.isEmpty()) System.out.println(pq.poll());
```

**Not thread-safe.** Concurrent equivalent: `PriorityBlockingQueue`.

**Common use cases:** Dijkstra/A* (priority by distance), top-K problems (bounded-size max-heap), event simulation, scheduling.

### Q156. `ArrayDeque` vs `Stack` vs `LinkedList` — which to use?

**Use `ArrayDeque`** for stacks and queues. It's faster, has lower memory overhead, and doesn't have the design flaws of `Stack` / `LinkedList`.

| | ArrayDeque | Stack | LinkedList |
|---|---|---|---|
| Backing | Resizable circular array | Array (extends `Vector`) | Doubly-linked nodes |
| Thread-safe | No | Yes (synchronized) — slow | No |
| Stack ops | `push`/`pop`/`peek` | Same names | `addFirst`/`removeFirst` |
| Memory | Compact array | Compact | Heavy (prev + next per node) |
| Cache locality | Good | Good | Poor |

`Stack` extends `Vector` — a known design mistake that exposes random-access methods (`set(int, E)`, `add(int, E)`) that violate stack semantics. Avoid.

`LinkedList` implements `Deque` but has poor cache locality and per-node memory overhead. `ArrayDeque` beats it on every realistic stack/queue benchmark.

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
stack.pop();       // 2 — LIFO

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1); queue.offer(2);
queue.poll();      // 1 — FIFO
```

### Q157. Iterator vs ListIterator vs Spliterator — when each?

**`Iterator<T>`** — basic forward-only traversal. `hasNext`, `next`, `remove` (optional). All `Collection`s give one via `iterator()`.

**`ListIterator<T>`** — extends `Iterator`; bi-directional + indexed. `hasPrevious`, `previous`, `add`, `set`, `nextIndex`. Only `List`s provide it.

```java
ListIterator<String> it = list.listIterator();
while (it.hasNext()) {
    String s = it.next();
    if (s.equals("REMOVE")) it.remove();          // safe in-place removal
    if (s.equals("UPDATE")) it.set("REPLACED");   // safe replace
}
```

**`Spliterator<T>`** — Java 8, designed for parallel splitting. `tryAdvance` (single element), `trySplit` (split into two). Drives `Stream`/`parallelStream` decomposition. Has characteristics: `ORDERED`, `DISTINCT`, `SORTED`, `SIZED`, `NONNULL`, `IMMUTABLE`, `CONCURRENT`, `SUBSIZED`.

For application code: rarely use `Spliterator` directly — use streams. Implement one only when authoring a custom collection that wants to participate in parallel streams effectively.

### Q158. Three flavours of immutable collection — `Collections.unmodifiableXxx`, `List.of`, `Collectors.toUnmodifiableList`?

| | `unmodifiableList(orig)` | `List.of(...)` | `toUnmodifiableList()` |
|---|---|---|---|
| Java | 1.2 | 9 | 10 |
| Backed by original | Yes — view | No — own storage | No |
| Mutation visible if original mutates | Yes | N/A | N/A |
| Allows null | Yes | **No** — throws NPE | No |
| Allows duplicate (Set) | N/A | **No** — throws IAE | N/A |
| Memory overhead | Lower (view) | Specialised compact for ≤2 | Compact |

`List.of(a, b, c)` and friends (`Set.of`, `Map.of`) are the modern default for compile-time-known immutable collections. They reject nulls — sometimes a feature, sometimes a footgun if you might have nullable values.

`Collectors.toUnmodifiableList()` is the streams equivalent for collected results (Java 10). Java 16+ also has `Stream.toList()` which is faster and also immutable — prefer it.

**`Collections.unmodifiableList(orig)`** is a wrapper, not a copy. The original is still mutable — caller can still change it through the original reference. Not great for true immutability, but cheap.

### Q159. Stream collectors deep — `groupingBy`, `partitioningBy`, `toMap`.

**`groupingBy`** — group elements by a key:

```java
Map<Department, List<Employee>> byDept = staff.stream()
    .collect(Collectors.groupingBy(Employee::department));

// With downstream collector — count per department
Map<Department, Long> countByDept = staff.stream()
    .collect(Collectors.groupingBy(Employee::department, Collectors.counting()));

// Multi-level — by department, then by role
Map<Department, Map<Role, List<Employee>>> nested = staff.stream()
    .collect(Collectors.groupingBy(Employee::department,
             Collectors.groupingBy(Employee::role)));

// Custom Map type (TreeMap for sorted keys)
Map<Department, List<Employee>> sorted = staff.stream()
    .collect(Collectors.groupingBy(Employee::department, TreeMap::new, Collectors.toList()));
```

**`partitioningBy`** — special case of grouping by a boolean. Returns `Map<Boolean, List<T>>`:

```java
Map<Boolean, List<Employee>> seniorVsJunior = staff.stream()
    .collect(Collectors.partitioningBy(e -> e.years() >= 10));

seniorVsJunior.get(true);   // seniors
seniorVsJunior.get(false);  // juniors
```

**`toMap`** — to a flat key→value map. Always pass a merge function for safety (default behaviour throws on duplicate keys):

```java
Map<String, Employee> byEmail = staff.stream()
    .collect(Collectors.toMap(Employee::email, e -> e, (a, b) -> a));   // keep first

// Sum salaries per name
Map<String, BigDecimal> salaryByName = staff.stream()
    .collect(Collectors.toMap(Employee::name, Employee::salary, BigDecimal::add));
```

### Q160. Stream `reduce` — explain the three forms.

**Form 1 — identity + accumulator:** returns `T`, never empty.
```java
int sum = ints.stream().reduce(0, Integer::sum);
String concat = strs.stream().reduce("", String::concat);
```

**Form 2 — accumulator only:** returns `Optional<T>` (empty stream → empty Optional).
```java
Optional<Integer> max = ints.stream().reduce(Integer::max);
max.orElse(0);
```

**Form 3 — identity + accumulator + combiner:** for parallel streams. Accumulator merges T+U→U, combiner merges U+U→U.
```java
int totalLength = strs.parallelStream().reduce(
    0,
    (acc, s) -> acc + s.length(),   // accumulator
    Integer::sum                     // combiner
);
```

The combiner is the parallel reduce step — it merges partial results from worker threads. Required for `parallelStream` correctness.

**Don't use reduce when a built-in collector exists:** `count`, `min`, `max`, `sum`, `average`, `joining` are all clearer than the equivalent reduce.

### Q161. How do you write a good `hashCode`?

Effective Java item 11. The contract: equal objects (`equals == true`) must have equal hash codes. Reverse not required (collisions allowed).

**Modern approach — `Objects.hash`:**
```java
@Override
public int hashCode() {
    return Objects.hash(firstName, lastName, dob);
}
```

Internally calls `Arrays.hashCode(varargs)`, which iterates with the prime-31 multiplier. Slight allocation overhead from varargs array — fine for most code.

**Performance-sensitive — manual prime-multiplier:**
```java
@Override
public int hashCode() {
    int result = firstName.hashCode();
    result = 31 * result + lastName.hashCode();
    result = 31 * result + dob.hashCode();
    return result;
}
```

Why prime 31? Cheap multiply (`x << 5 - x`), avoids hash collisions for common inputs better than 2 or 32.

**Rules:**
- Include only fields used by `equals` (consistency)
- Include only **immutable** fields (mutating a hash-relevant field corrupts `HashMap` entries)
- Don't use `==` on object fields — use `.hashCode()`
- For `null` fields, treat as 0 (`Objects.hash` does this)

**For records:** auto-generated correctly. Don't write your own.

### Q162. Why must `compareTo` be consistent with `equals`?

`compareTo == 0` should imply `equals == true`, otherwise sorted collections (`TreeMap`, `TreeSet`) misbehave.

```java
record Money(BigDecimal amount, Currency currency) implements Comparable<Money> {
    public int compareTo(Money other) {
        return amount.compareTo(other.amount);   // ✗ inconsistent with equals
    }
}

new BigDecimal("1.0").equals(new BigDecimal("1.00"));        // false (different scale)
new BigDecimal("1.0").compareTo(new BigDecimal("1.00"));     // 0 (equal numerically)

TreeSet<Money> set = new TreeSet<>();
set.add(new Money(new BigDecimal("1.0"), USD));
set.contains(new Money(new BigDecimal("1.00"), USD));   // ??? depends on TreeSet's
                                                         // use of compareTo not equals
```

`TreeSet` and `TreeMap` use `compareTo` (or the supplied `Comparator`) for everything — `contains`, `equals`, ordering. So inconsistency means equal-by-equals objects can't be deduplicated, or deduplicated objects aren't equal-by-equals.

**Fix:** make `compareTo` agree with `equals`, or document the inconsistency clearly (Joshua Bloch flagged that `BigDecimal` itself violates this and warns about it).

### Q163. When does specifying initial capacity for `HashMap` actually matter?

`new HashMap<>(expectedSize)` matters when:
- You're inserting many entries and want to skip resize() copies (each resize is O(n))
- You know the size in advance — avoid pointless `2 → 4 → 8 → 16 → 32 → 64...` doublings

**Sizing formula:** to hold `N` entries without resize, set capacity to `N / loadFactor`. Default load factor is 0.75. So:

```java
// To safely hold 100 entries:
new HashMap<>(100 / 0.75 + 1);   // ~134
// Or, idiomatic:
new HashMap<>((int) Math.ceil(100 / 0.75));
```

JDK provides `Map.Entry[] table = new Node[tableSize]` only as a power of 2; the constructor rounds up. If you pass `134`, you get `256` internally.

**Doesn't matter** for tiny maps (<10 entries) or maps assembled lazily. The default 16 is fine.

### Q164. `Collections.synchronizedXxx` vs `ConcurrentHashMap`?

**`Collections.synchronizedMap(map)`** — wraps any `Map` with a single lock (`synchronized` on `mutex`). Every operation acquires the lock. **Iteration is NOT safe** — you must hold the lock manually:

```java
Map<K, V> sync = Collections.synchronizedMap(new HashMap<>());
synchronized (sync) {
    for (var e : sync.entrySet()) ...   // safe only inside synchronized block
}
```

Single global lock = poor concurrency, single point of contention. Legacy.

**`ConcurrentHashMap`** — purpose-built for concurrency:
- Java 8+: per-bin locking + CAS for empty bins
- Reads never block
- `compute`, `computeIfAbsent`, `merge` are atomic
- Iteration is weakly consistent — safe but you may not see concurrent updates

**Use `ConcurrentHashMap` for new code.** `synchronizedMap` is for retrofitting an existing non-concurrent class without changing its identity. Forgetting to manually synchronise around iteration is the classic concurrent-collections bug — `ConcurrentHashMap` removes that footgun.

---

## Concurrency

### Summary

**What this topic covers**

Multi-threaded programming on the JVM — the hardest part of Java to interview well on, and the part where senior candidates separate themselves most clearly. Four concern areas: (1) the **primitives** — `Thread`, `Runnable`, `Callable`, `synchronized`, `volatile`, `wait`/`notify`, atomic classes, `Lock` interface, `ReadWriteLock`, `StampedLock`; (2) the **abstractions** — `ExecutorService`, thread pools, `Fork/Join`, `CompletableFuture`, `CountDownLatch`, `CyclicBarrier`, `Phaser`, `Semaphore`; (3) the **memory model** — happens-before, release-acquire, memory barriers, `volatile` semantics, false sharing, ABA, `VarHandle`; and (4) the **modern picture** — virtual threads, structured concurrency, reactive vs Loom, lock-free data structures (Treiber stack, Michael-Scott queue, LMAX Disruptor). The 38 questions are the most numerous in the primer for a reason: this is where bugs hide and where senior judgment shows.

**Mental model**

Concurrency in Java is three stacked layers. (1) The **JVM Memory Model (JMM)** — a specification, not a thing in the runtime — that defines which writes by thread A are guaranteed visible to thread B. The happens-before relation is the *only* tool for reasoning about visibility; `volatile`, `synchronized`, `Lock`, `Thread.start`/`join`, and `final` field freezes are the constructs that establish it. (2) The **synchronisation primitives** built on top — intrinsic locks (`synchronized`), explicit locks (`ReentrantLock`, `ReadWriteLock`, `StampedLock`), atomics (`AtomicLong`, `AtomicReference`, `LongAdder`), CAS via `VarHandle`. Pick wrong and you get either deadlock or sluggishness. (3) The **task abstractions** — `ExecutorService` pools, `CompletableFuture` for async composition, virtual threads (Java 21+) for blocking-style I/O at scale. The unifying principle: never share mutable state without a memory-model story. Either don't share (thread confinement, immutability), or share through a synchronisation primitive that establishes happens-before, or use a concurrent data structure that wraps the synchronisation for you. Anything else is a bug waiting for production.

**Key terms**

- **Thread vs process** — threads share heap and method area; processes don't.
- **`synchronized`** — intrinsic lock on the object monitor; reentrant; establishes happens-before on entry/exit.
- **`volatile`** — single-variable visibility guarantee; reads/writes establish happens-before but don't provide atomicity for compound actions.
- **Atomic classes** — `AtomicInteger`/`AtomicLong`/`AtomicReference`; CAS-based, lock-free; `LongAdder` better under high contention.
- **`ThreadLocal`** — per-thread storage; leaks if not `remove()`-d in pool threads.
- **`ExecutorService`** — task submission API; `Executors.newFixedThreadPool`, `newCachedThreadPool`, `newScheduledThreadPool`, `newVirtualThreadPerTaskExecutor`.
- **`CompletableFuture`** — async composition; `thenApply`, `thenCompose`, `handle`, `exceptionally`.
- **Happens-before** — the JMM ordering relation; if A happens-before B, A's writes are visible to B.
- **Virtual thread** — JVM-scheduled lightweight thread; cheap; pinned by `synchronized` and JNI.
- **`StructuredTaskScope`** — Java 21+ scoped concurrent tasks with shared lifetime.
- **False sharing** — two threads writing different fields in the same cache line, ping-ponging the line; fixed with `@Contended` or padding.
- **ABA problem** — CAS sees the same value but state changed in between; `AtomicStampedReference` carries a version stamp.

**Why interviewers ask this**

Three signals. (1) **Do you understand the JMM?** — junior candidates write `synchronized` reflexively; senior candidates can explain *why* it works (happens-before on monitor exit/enter), what `volatile` alone does and doesn't guarantee, and why double-checked locking needs `volatile`. The `wait`/`sleep` distinction, the `volatile` flag idiom, the `synchronized(boxedBoolean)` bug — all probe this. (2) **Do you reach for the right tool?** — `ConcurrentHashMap` over `Collections.synchronizedMap`; `LongAdder` over `AtomicLong` under contention; `ReentrantLock` over `synchronized` when you need `tryLock` or fairness; `CompletableFuture` over manual `Future`. (3) **Where are you on the Loom transition?** — in 2026, a senior Java engineer should be able to articulate when to use virtual threads vs reactive vs platform-thread pools. "We're rewriting our reactive code on Loom because the team can't debug `Flux` chains" is a credible 2026 answer.

**Common confusions**

- "`volatile` makes operations atomic" — it doesn't; `i++` on a `volatile int` is still a race.
- "`synchronized` and `Lock` are interchangeable" — they aren't; `Lock` gives `tryLock`, fairness, interruptible acquisition, multiple condition variables, and (crucially in 2026) doesn't pin virtual threads.
- "Double-checked locking works without `volatile`" — it doesn't; the JMM allows reordering of the construction.
- "More threads = faster" — true only up to the bottleneck (CPU cores for compute, connection pool size for I/O); beyond that, contention dominates.
- "`CompletableFuture.get()` is fine in a controller" — it blocks a request thread; with virtual threads this is now acceptable, with platform threads it isn't.
- "Virtual threads make all blocking calls cheap" — they make most cheap; `synchronized` and JNI still pin, so virtual-thread code should prefer `ReentrantLock` and avoid native calls in hot paths.

**What follows from this topic**

Concurrency is where every later topic stress-tests itself. The JMM underpins JVM Memory & Performance. Thread pools size against HikariCP and Tomcat connector pools in Database and Spring. Virtual threads change the answer to System Design's "how do we scale this service" question. `CompletableFuture` patterns recur in Resilience (timeout, retry, circuit breaker). If concurrency feels shaky, this is the highest-leverage section to drill — interviewers spend disproportionate time here because it's where production bugs come from.

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

- **CompletableFuture** is Java's powerful asynchronous programming tool (Java 8+) that represents a **future result of an asynchronous computation** that can be manually completed. Think of it as a **"Promise"** in Java that lets you chain operations, combine results, and handle async workflows elegantly.
- It's like **Future on steroids** — you can complete it manually, chain operations, combine multiple futures, and handle exceptions elegantly.

Key capabilities:
- Chain transforms (`thenApply`, `thenCompose`, `thenAccept`)
- Combine multiple futures (`thenCombine`, `allOf`, `anyOf`)
- Async dispatch on a custom `Executor`
- Error handling (`exceptionally`, `handle`, `whenComplete`)
- Manual completion via `complete()` / `completeExceptionally()`

```java
CompletableFuture<String> f = CompletableFuture
    .supplyAsync(this::fetchUser, executor)
    .thenApply(User::name)
    .exceptionally(ex -> "anonymous");
```

### Q165. Walk through `Thread.State` and the transitions.

```
       Thread.start()
NEW ────────────────► RUNNABLE  ◄────────►  BLOCKED      (waiting for monitor lock)
                          │   ▲
                          │   │
                          │   │
                          ▼   │
                       WAITING            (Object.wait, Thread.join, LockSupport.park — no timeout)
                          │   ▲
                          ▼   │
                    TIMED_WAITING         (sleep, wait(t), join(t), parkNanos)
                          │
                          ▼
                      TERMINATED          (run completes or throws)
```

- **`NEW`** — created, not yet started
- **`RUNNABLE`** — running OR ready-to-run (Java doesn't distinguish; OS scheduler decides)
- **`BLOCKED`** — waiting to acquire a monitor lock (entering a `synchronized` block)
- **`WAITING`** — `wait()`, `join()`, `LockSupport.park()` — no timeout
- **`TIMED_WAITING`** — same with a timeout
- **`TERMINATED`** — done

A thread's life is many cycles between `RUNNABLE` and other states; only `NEW` → `RUNNABLE` and `* → TERMINATED` are one-way. Inspect with `Thread.currentThread().getState()` or thread dumps (`jstack`).

### Q166. `ReadWriteLock` and `StampedLock` — when each?

**`ReentrantReadWriteLock`** — multiple concurrent readers, exclusive writer. Use when reads dominate writes (typical 10:1 or higher). API mirrors `ReentrantLock` but with `readLock()` / `writeLock()`:

```java
ReadWriteLock rw = new ReentrantReadWriteLock();
Lock r = rw.readLock();
Lock w = rw.writeLock();

r.lock();
try { return cache.get(key); }
finally { r.unlock(); }

w.lock();
try { cache.put(key, value); }
finally { w.unlock(); }
```

**`StampedLock`** (Java 8) — adds **optimistic read** mode. No lock taken; you validate a stamp before consuming the read:

```java
StampedLock sl = new StampedLock();
long stamp = sl.tryOptimisticRead();
double currentX = x;                // read without locking
if (!sl.validate(stamp)) {          // was there a write since we got the stamp?
    stamp = sl.readLock();
    try { currentX = x; }
    finally { sl.unlockRead(stamp); }
}
```

Faster on read-heavy workloads (no atomic write to the lock state). **Not reentrant** — a thread that already holds the lock and tries again deadlocks. Easy to misuse for lock upgrades.

**Default:** `synchronized` or `ReentrantLock`. Reach for `ReadWriteLock` only when you have a measured read-heavy bottleneck. `StampedLock` only for high-frequency reads where atomic-write contention is the bottleneck.

### Q167. What does `LockSupport.park` / `unpark` do?

`LockSupport` is the low-level building block under `ReentrantLock`, `Condition`, and other concurrency primitives. Direct access to thread parking.

- **`park()`** — block the current thread until `unpark` is called or the thread is interrupted
- **`unpark(thread)`** — wake `thread` if parked, OR record a permit so the next `park()` returns immediately

Each thread has a **permit** that's at most 1. `unpark` sets it; `park` consumes it (or blocks). **Order doesn't matter** — `unpark` followed by `park` returns immediately.

```java
Thread worker = Thread.currentThread();

// In another thread when work arrives
LockSupport.unpark(worker);

// Worker thread
while (running) {
    LockSupport.park();
    processWork();
}
```

Use directly only when building lock primitives. For app code, `BlockingQueue`, `Phaser`, `CountDownLatch`, `Condition` give better abstractions.

### Q168. `CompletableFuture` exception handling — `handle` vs `exceptionally` vs `whenComplete`.

Three exception-aware terminal-ish methods. Different signatures, different intent:

| | Sees value? | Sees throwable? | Returns |
|---|---|---|---|
| `exceptionally` | No | Yes | Recovery value, same type |
| `handle` | Yes (or null on failure) | Yes (or null on success) | Transformed value, possibly different type |
| `whenComplete` | Yes (or null) | Yes (or null) | Original value (side-effect only) |

```java
// exceptionally — recover from failure
CompletableFuture<Integer> recovered = future
    .exceptionally(ex -> 0);   // returns 0 on failure, original value on success

// handle — transform success or failure
CompletableFuture<String> handled = future
    .handle((value, ex) -> {
        if (ex != null) return "error: " + ex.getMessage();
        return "ok: " + value;
    });

// whenComplete — observe without changing
CompletableFuture<Integer> observed = future
    .whenComplete((value, ex) -> {
        if (ex != null) log.error("failed", ex);
        else log.info("ok: {}", value);
    });
```

Pitfalls:
- `whenComplete` returns the original future's value, but if the consumer throws, that exception replaces the original
- `exceptionally` only fires for failure; `handle` and `whenComplete` always fire
- All three return new stages — chain them, don't expect mutation

### Q169. What's the ABA problem and how do you avoid it?

In CAS-based lock-free code, a value goes A → B → A while you weren't looking. Your CAS sees A, succeeds, but the *meaning* changed.

Classic example — lock-free stack with `head`:
```
T1 reads head = NodeA
T1 prepares to CAS(head, NodeA, NodeA.next)
T2 pops NodeA, pops NodeB, pushes NodeA again — head is back to NodeA
T1's CAS succeeds (head still == NodeA reference) — but NodeA.next now points to garbage
```

**Fix — `AtomicStampedReference`:** pair the reference with a counter. CAS on both. The counter increments on every write, so even if the reference returns to A, the stamp differs:

```java
AtomicStampedReference<Node> head = new AtomicStampedReference<>(initial, 0);

int[] stampHolder = new int[1];
Node oldHead = head.get(stampHolder);
Node newHead = oldHead.next;
head.compareAndSet(oldHead, newHead, stampHolder[0], stampHolder[0] + 1);
```

Most app code never hits this — the JDK's lock-free collections (`ConcurrentLinkedQueue`, `ConcurrentSkipListMap`) handle it internally. Encounter it only when writing custom lock-free data structures or working with hand-rolled atomic state machines.

### Q170. What is false sharing?

CPU caches operate on **cache lines** (typically 64 bytes). When two threads write to *different* variables that happen to live on the same cache line, the cache line bounces between cores — every write invalidates the other core's copy. The threads aren't logically sharing data, but the cache thinks they are. Performance dies.

```java
class Counters {
    long a;   // mutated by thread 1
    long b;   // mutated by thread 2
    // both a and b sit in the same cache line — false sharing
}
```

**Fix:** pad the fields, or use `@Contended`:

```java
@jdk.internal.vm.annotation.Contended
class Counters {
    long a;
    @jdk.internal.vm.annotation.Contended
    long b;
    // JVM pads each marked field to its own cache line
}
```

Requires `-XX:-RestrictContended` to use `@Contended` outside `java.base`. Modern alternative: `LongAdder` uses internal padding for high-contention counters and beats `AtomicLong` because of false-sharing avoidance.

Detect with `perf c2c` (Linux) or async-profiler's lock + cache-miss profiling.

### Q171. What's lock striping?

Splitting a single lock into N independent locks, each guarding a partition of the data. Threads accessing different partitions don't contend.

```java
class StripedCounter {
    private final long[] counts;
    private final ReentrantLock[] locks;

    StripedCounter(int stripes) {
        counts = new long[stripes];
        locks = new ReentrantLock[stripes];
        for (int i = 0; i < stripes; i++) locks[i] = new ReentrantLock();
    }

    void increment(int key) {
        int stripe = Math.floorMod(key, locks.length);
        locks[stripe].lock();
        try { counts[stripe]++; }
        finally { locks[stripe].unlock(); }
    }
}
```

`ConcurrentHashMap` does this implicitly — bin-level synchronisation. The restaurant booking concurrency extension uses it too: per-table `ReentrantLock`s mean bookings on different tables don't contend. **Pattern:** when you have N independent objects (tables, accounts, devices) and need fine-grained synchronisation, stripe by id hash.

Trade-off: more memory (N locks), and operations across stripes need careful ordering to avoid deadlock — acquire locks in consistent order (e.g. ascending stripe index).

### Q172. Virtual threads vs reactive — which wins for I/O concurrency?

**Both solve the same problem:** running many concurrent I/O operations without spinning up many OS threads. They take opposite approaches.

**Reactive (Project Reactor, RxJava):**
- Build callback-style pipelines: `mono.flatMap(this::loadUser).flatMap(this::loadOrders)...`
- Tiny event-loop pool (cores-sized, e.g. 8 threads)
- Blocking calls poison the loop — every operator must be non-blocking
- Backpressure built-in (`request(n)`)
- Steep learning curve, hard debugging (stack traces shredded by async hops)

**Virtual threads (Java 21):**
- Imperative code: blocking calls are fine
- Millions of virtual threads on a small carrier-thread pool
- Standard `try`/`catch`, standard stack traces
- Backpressure must be added explicitly (semaphores, bounded queues)
- Pinning hazard with `synchronized` (Java 21; fixed in 24)

**Which wins:**
- New code with mostly blocking I/O → virtual threads
- Existing reactive code → keep it
- Streaming / SSE / fan-out aggregation → reactive's operators still excel
- Heavy backpressure requirements → reactive natively supports it

**Migration trend:** post-Java 21, many shops are deprecating new reactive adoption for plain virtual threads. WebFlux remains for streaming use cases.

### Q173. `Phaser` vs `CyclicBarrier` vs `CountDownLatch`?

Three coordination primitives, increasing flexibility:

**`CountDownLatch(n)`** — one-shot. Wait for N events. Cannot be reset.
```java
CountDownLatch ready = new CountDownLatch(3);
// 3 worker threads call ready.countDown() when initialised
ready.await();   // main thread unblocks when all 3 done
```

**`CyclicBarrier(n)`** — reusable. Wait for N parties to all call `await`, then release them all. Can run an action when the barrier trips. Reusable.
```java
CyclicBarrier barrier = new CyclicBarrier(4, () -> log.info("phase done"));
// each of 4 threads: barrier.await() at end of phase
// all 4 unblock together, then can do next phase
```

**`Phaser`** — like `CyclicBarrier` but parties can be **dynamic** (register/deregister at runtime), unlimited phases, and you can `arriveAndDeregister` when done. More flexible but heavier API.

```java
Phaser phaser = new Phaser(1);   // main is registered

for (int i = 0; i < workerCount; i++) {
    phaser.register();
    new Thread(() -> {
        doWork();
        phaser.arriveAndAwaitAdvance();   // join the phase
        moreWork();
        phaser.arriveAndDeregister();
    }).start();
}

phaser.arriveAndAwaitAdvance();   // main waits with workers
```

**Choose:**
- One-time fan-in → `CountDownLatch`
- Reusable parallel phases, fixed party count → `CyclicBarrier`
- Dynamic parties or many phases → `Phaser`
- Modern fan-in alternative → `CompletableFuture.allOf` (cleaner if results are needed)

### Q174. `ScheduledExecutorService` — schedule vs scheduleAtFixedRate vs scheduleWithFixedDelay?

Three scheduling modes; pick based on what "every N seconds" means to you:

```java
ScheduledExecutorService exec = Executors.newScheduledThreadPool(2);

// One-shot delay
exec.schedule(this::work, 5, SECONDS);

// Fixed RATE — runs every N seconds REGARDLESS of how long the task takes
// If task takes 2s and rate is 1s, it'll run back-to-back with no gap
exec.scheduleAtFixedRate(this::work, 0, 1, SECONDS);

// Fixed DELAY — waits N seconds AFTER each task completes
// If task takes 2s and delay is 1s, total cycle is 3s
exec.scheduleWithFixedDelay(this::work, 0, 1, SECONDS);
```

Critical distinction: `fixedRate` can pile up if the task runs longer than the period — multiple invocations queue, then storm when the slow one finishes. `fixedDelay` is self-throttling.

**Default for periodic work:** `scheduleWithFixedDelay`. Use `fixedRate` only when you genuinely want clock-accurate firing (e.g. metrics emission every minute, regardless of duration).

**Exception handling gotcha:** if a scheduled task throws, scheduling **stops silently**. Always wrap in try/catch:

```java
exec.scheduleWithFixedDelay(() -> {
    try { doWork(); }
    catch (Throwable t) { log.error("scheduled task failed", t); }
}, 0, 1, SECONDS);
```

### Q241. How do you make atomic check-and-act with `ConcurrentHashMap.compute()`?

The classic concurrent bug — `if (!map.containsKey(k)) map.put(k, v)` — is two operations with a race in between. Two threads both see `containsKey == false`, both put, second clobbers first.

`ConcurrentHashMap.compute(key, BiFunction)` runs the lambda **atomically** while holding the bin's lock — no other thread can interleave on that key:

```java
Map<Integer, List<Booking>> store = new ConcurrentHashMap<>();

// Atomic check-then-add per table
store.compute(tableId, (k, existing) -> {
    var current = existing == null ? List.<Booking>of() : existing;
    if (current.stream().anyMatch(b -> b.slot().overlaps(slot))) {
        return current;        // overlap detected, no insert, return unchanged
    }
    return append(current, newBooking);
});
```

**Pros vs `ReentrantLock`:**
- Atomic by construction — no `try/finally` discipline needed
- No explicit lock objects to manage
- Per-key granularity built in

**Cons:**
- **Signalling success/failure out** of the lambda is awkward — needs a side channel like `AtomicReference<Optional<Booking>>` outside the call:
  ```java
  AtomicReference<Optional<Booking>> result = new AtomicReference<>(Optional.empty());
  store.compute(tableId, (k, existing) -> { ... result.set(Optional.of(b)); ... });
  return result.get();
  ```
- Holds the bin lock for the entire BiFunction — long-running logic blocks readers of that key
- Function must be **deterministic** in `equals` sense — re-running it must produce the same result if the JVM retries

**Variants:**
- `computeIfAbsent` — only runs lambda if key missing; perfect for memoisation caches
- `computeIfPresent` — only runs if key present; in-place mutation
- `merge(k, v, BiFunction)` — combine new value with existing (e.g. `merge(k, 1, Integer::sum)` for atomic counters)

### Q242. Locking primitive cheat sheet — when NOT to use each.

Choosing the right primitive matters more than knowing all of them. Common picks ranked from "default" to "specialist":

| Primitive | Use it when | **Don't** use it when |
|---|---|---|
| **`synchronized`** | Quick mutex, no extras needed | Need `tryLock` / fairness / timeout / multiple condition vars |
| **`ReentrantLock`** | Per-resource fine-grained mutex; want flexibility | A shorter `synchronized` would do — pay-for-what-you-use |
| **`ReadWriteLock`** | Reads vastly outnumber writes (~10:1+) and write must be exclusive | Check + insert is one atomic unit — readers can't see in-flight write |
| **`StampedLock`** | Read-heavy with optimistic fast path on hot fields | Need reentrancy (it's not reentrant — easy deadlock); business code (3 modes are too many) |
| **`Semaphore(1)`** | "Limit N concurrent users" semantics | Mutex — semaphore has no owner, no reentrancy. Different thread can release. Footgun. |
| **`AtomicReference` + CAS** | Lock-free, predictable low contention | Bursty contention — retry storms allocate per attempt and waste CPU |
| **`ConcurrentHashMap.compute()`** | Atomic per-key mutation (Q241) | Need to signal a value out — awkward without `AtomicReference` side channel |

**Default trio:** start with `synchronized` (or `ReentrantLock` if you need fairness/timeout), reach for `ConcurrentHashMap.compute()` for per-key atomicity, escalate to `ReadWriteLock` only if profiling shows reader contention.

### Q243. Concrete example — reactive vs virtual threads for aggregation.

**Scenario:** API gateway endpoint that aggregates 5 downstream calls per request to build a user dashboard.

**Reactive (Project Reactor):**
```java
public Mono<UserDashboard> dashboard(UUID userId) {
    return Mono.zip(
        userClient.getUser(userId),
        ordersClient.getOrders(userId),
        notificationsClient.getUnread(userId),
        billingClient.getBalance(userId),
        recommendationsClient.getRecommended(userId)
    ).map(t -> new UserDashboard(
        t.getT1(), t.getT2(), t.getT3(), t.getT4(), t.getT5()
    ));
}
```
5 parallel HTTP calls, **no thread blocked**, results assembled when all complete. A handful of Netty event-loop threads handle thousands of concurrent dashboards.

**Virtual threads (Java 21+):**
```java
public UserDashboard dashboard(UUID userId) throws Exception {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var user    = executor.submit(() -> userClient.getUser(userId));
        var orders  = executor.submit(() -> ordersClient.getOrders(userId));
        var notifs  = executor.submit(() -> notificationsClient.getUnread(userId));
        var balance = executor.submit(() -> billingClient.getBalance(userId));
        var recs    = executor.submit(() -> recommendationsClient.getRecommended(userId));

        return new UserDashboard(
            user.get(), orders.get(), notifs.get(), balance.get(), recs.get()
        );
    }
}
```
Same parallelism. Virtual threads unmount from carriers during blocking I/O; carriers serve other virtual threads. Synchronous-looking code, debuggable stack traces.

**Better with `StructuredTaskScope` (Java 21+ preview):**
```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var user    = scope.fork(() -> userClient.getUser(userId));
    var orders  = scope.fork(() -> ordersClient.getOrders(userId));
    // ...
    scope.join();
    scope.throwIfFailed();
    return new UserDashboard(user.get(), orders.get(), ...);
}
```
First failure cancels siblings — equivalent to `Mono.zip`'s "fail fast" behaviour, with cleaner exception propagation.

**Comparison summary:**

| | Reactive | Virtual threads |
|---|---|---|
| Code shape | Functional, operator chaining | Imperative, sync-style |
| Stack traces | Reactor's machinery in every frame | Your code only |
| Backpressure | First-class (`request(n)`, operators) | Manual (semaphores, bounded queues) |
| Composition | Rich (`zip`, `merge`, `switchMap`, `retryWhen`) | Plain Java |
| Streaming | Native `Flux<T>` | Awkward — no first-class push stream |
| Existing blocking SDKs | Must wrap (`Mono.fromCallable` + `subscribeOn(boundedElastic)`) | Just call them |

**Senior take:** for request/response aggregation, virtual threads now usually win — same scalability, simpler code. Reactive remains the right pick for streaming pipelines (SSE, Kafka, websocket fan-out) where `Flux` operators earn their cost.

### Q256. What's the Treiber stack and how does it work?

Lock-free LIFO stack using compare-and-swap.

```java
public class TreiberStack<T> {
    private final AtomicReference<Node<T>> top = new AtomicReference<>();

    public void push(T value) {
        Node<T> newTop = new Node<>(value);
        Node<T> currentTop;
        do {
            currentTop = top.get();
            newTop.next = currentTop;
        } while (!top.compareAndSet(currentTop, newTop));
    }

    public T pop() {
        Node<T> currentTop, newTop;
        do {
            currentTop = top.get();
            if (currentTop == null) return null;
            newTop = currentTop.next;
        } while (!top.compareAndSet(currentTop, newTop));
        return currentTop.value;
    }

    private static class Node<T> {
        final T value;
        volatile Node<T> next;
        Node(T v) { value = v; }
    }
}
```

**Pros:** lock-free, scales to many concurrent writers, no thread parking.

**Cons:**
- **ABA problem** if nodes are recycled
- Allocates a `Node` per push (GC pressure)
- No progress guarantee for any individual thread (only system-wide progress)

Production-ready: `ConcurrentLinkedDeque` in JDK uses related techniques.

### Q257. Michael-Scott queue — the lock-free FIFO standard.

Most non-blocking concurrent queues use the Michael-Scott algorithm (1996). FIFO with two pointers (head, tail), each updated independently with CAS.

Key idea: each enqueue requires **two CAS operations** — one to link the new node, one to swing tail forward. If either fails, retry. Other threads can **help** advance the tail on behalf of slow predecessors — that's the lock-free progress property.

```java
public void enqueue(T value) {
    Node<T> node = new Node<>(value);
    while (true) {
        Node<T> currentTail = tail.get();
        Node<T> nextOfTail = currentTail.next.get();
        if (currentTail == tail.get()) {
            if (nextOfTail == null) {
                if (currentTail.next.compareAndSet(null, node)) {
                    tail.compareAndSet(currentTail, node);   // best-effort
                    return;
                }
            } else {
                tail.compareAndSet(currentTail, nextOfTail); // help advance
            }
        }
    }
}
```

**`ConcurrentLinkedQueue`** in `java.util.concurrent` is a Michael-Scott queue.

### Q258. What's the LMAX Disruptor and when do you use it?

Disruptor (LMAX, ~2010): single-producer / single-consumer (or multi-cons) **ring buffer** designed for ultra-low-latency financial trading. Sub-microsecond message passing.

**Key innovations:**
- **Pre-allocated ring buffer** — no per-message allocation, no GC pressure
- **Sequence numbers** as cursors instead of locks
- **Memory padding** to prevent false sharing between producer and consumer cursors
- **Mechanical sympathy** — designed for CPU cache layout, branch prediction, modern memory ordering

```java
Disruptor<MyEvent> disruptor = new Disruptor<>(MyEvent::new, 1024, ...);
disruptor.handleEventsWith((event, sequence, endOfBatch) -> process(event));
disruptor.start();

RingBuffer<MyEvent> ring = disruptor.getRingBuffer();
long seq = ring.next();
try {
    MyEvent event = ring.get(seq);
    event.set(payload);
} finally {
    ring.publish(seq);
}
```

**When it earns its keep:**
- Sub-microsecond message-passing requirements (HFT, exchange matching engines)
- Predictable allocation profile (no GC interference)
- SPSC / SPMC scenarios where the pattern shines

For typical app code, `BlockingQueue` is fine. Disruptor wins when nanoseconds matter.

### Q259. What's the Java Memory Model's "release-acquire" semantics?

Underlying CPU memory ordering primitives, exposed in Java via `volatile`, `final`, and `VarHandle`.

**Release semantics (write side):** all writes before the volatile write are visible to threads that observe the volatile write.

**Acquire semantics (read side):** all reads after the volatile read see writes that were visible to whoever did the matching release.

```java
class State {
    int data;                // plain
    volatile boolean ready;  // release on write, acquire on read

    void publish() {
        data = 42;        // (1) plain write
        ready = true;     // (2) release write — guarantees (1) visible to any acquire reader
    }

    int read() {
        if (ready) {       // (3) acquire read — pairs with (2)
            return data;   // (4) sees 42, guaranteed
        }
        return -1;
    }
}
```

**`VarHandle`** (Java 9+) gives explicit access to memory ordering modes:

```java
private static final VarHandle DATA = MethodHandles.lookup()
    .findVarHandle(State.class, "data", int.class);

DATA.setRelease(this, 42);            // weaker than volatile, faster
DATA.getAcquire(this);                // weaker than volatile read
DATA.compareAndSet(this, 42, 43);    // CAS with full barrier
```

**Why VarHandle?** `volatile` always uses sequential consistency (most expensive). `setRelease` / `getAcquire` are weaker but cheaper, sufficient for many lock-free patterns. Used in JDK internals (e.g. `ConcurrentHashMap`).

### Q260. What's a memory barrier and what kinds exist?

CPU instruction that prevents reordering of memory operations across it.

**Four kinds (per JMM):**
- **`LoadLoad`** — prevents reordering of two loads
- **`LoadStore`** — load before store
- **`StoreStore`** — store before store (used after volatile writes for release semantics)
- **`StoreLoad`** — store before load (the most expensive — full memory fence)

**On x86:** `LoadLoad`, `LoadStore`, `StoreStore` are mostly free (Total Store Ordering). Only `StoreLoad` requires an explicit `MFENCE` or locked instruction. ARM and POWER are weaker — need explicit barriers more often.

**Java surfaces these via:**
- `volatile` writes emit `StoreStore` + `StoreLoad`
- `volatile` reads emit `LoadLoad` + `LoadStore`
- `synchronized` exit emits `StoreStore` + `StoreLoad`
- `Unsafe.fullFence`, `loadFence`, `storeFence`
- `VarHandle.fullFence`, `releaseFence`, `acquireFence`

**Why interviewers ask:** at low-latency level, you need to know that `volatile` is more expensive than necessary for many patterns. `VarHandle` weaker modes win for tight inner loops.

### Q261. ABA problem deep — how does `AtomicStampedReference` solve it?

Classic ABA: thread T1 reads value `A`, prepares CAS to update. T2 changes A→B→A in the meantime. T1's CAS sees `A`, succeeds — but the meaning has changed.

```
T1 reads head = NodeA
T1 prepares CAS(head, NodeA, NodeA.next)
T2 pops NodeA, pops NodeB, recycles NodeA, pushes NodeA again
T1 CAS succeeds — but NodeA.next now points elsewhere
```

**`AtomicStampedReference`** pairs the reference with a counter. CAS on both:

```java
AtomicStampedReference<Node> head = new AtomicStampedReference<>(initial, 0);

int[] stampHolder = new int[1];
Node oldHead = head.get(stampHolder);
int oldStamp = stampHolder[0];
Node newHead = oldHead.next;

// CAS only succeeds if BOTH reference and stamp match
head.compareAndSet(oldHead, newHead, oldStamp, oldStamp + 1);
```

Counter increments on every write. Even if reference returns to original, stamp differs.

**Alternative — Hazard pointers** (Maged Michael, 2004): readers register what they're reading; reclaimers check before recycling. Used in C++ concurrent collections; rare in Java because GC eliminates most ABA risk for object references.

**Most app code never hits ABA** — JDK's lock-free collections (`ConcurrentLinkedQueue`, `ConcurrentSkipListMap`) handle it internally. Encounter only when writing custom lock-free data structures or atomic state machines that recycle references.

### Q262. False sharing in detail — how to identify and fix?

Two threads writing to **different variables that share a CPU cache line** (typically 64 bytes) cause the cache line to ping-pong between cores. Threads aren't logically sharing anything, but the cache thinks they are.

**Detection:**
- `perf c2c` (Linux) — cache-to-cache load latency analysis
- `async-profiler` with `-e LLC-load-misses`
- Symptom: parallel benchmarks scale linearly until N cores, then collapse

**Fix 1 — manual padding:**
```java
class PaddedCounter {
    long p1, p2, p3, p4, p5, p6, p7;        // 56 bytes padding before
    volatile long value;                      // 8 bytes
    long p8, p9, p10, p11, p12, p13, p14;    // padding after
}
```

**Fix 2 — `@Contended` annotation:**
```java
import jdk.internal.vm.annotation.Contended;

@Contended
class Counter {
    volatile long value;
}
```

Requires `--add-opens java.base/jdk.internal.vm.annotation=ALL-UNNAMED` or `-XX:-RestrictContended` flag.

**`LongAdder`** uses internal padding for high-contention counters — beats `AtomicLong` because each thread updates its own padded cell, no false sharing across threads.

### Q263. What are `VarHandle` and `MethodHandle`?

**`MethodHandle`** (Java 7) — typed reference to a method, faster than reflection:

```java
MethodHandle hello = MethodHandles.lookup()
    .findStatic(String.class, "valueOf", MethodType.methodType(String.class, int.class));
String result = (String) hello.invokeExact(42);
```

Used internally by `invokedynamic`, lambda metafactory, dynamic linking. Can be combined (`bind`, `dropArguments`, `insertArguments`, `asType`) into call site adapters — flexibility close to reflection without runtime cost.

**`VarHandle`** (Java 9) — typed reference to a variable (field, array element, off-heap address):

```java
private static final VarHandle COUNT = MethodHandles.lookup()
    .findVarHandle(MyClass.class, "count", int.class);

COUNT.set(this, 5);                              // plain write
COUNT.setVolatile(this, 5);                      // volatile semantics
COUNT.setRelease(this, 5);                       // release-only
COUNT.compareAndSet(this, 4, 5);                 // CAS
COUNT.getAndAdd(this, 1);                        // atomic increment
COUNT.compareAndExchangeRelease(this, 4, 5);     // release CAS
```

Replaces `sun.misc.Unsafe` for atomic field access. Modern lock-free code uses VarHandle, not `AtomicInteger` (which has wrapper allocation overhead in some patterns).

### Q297. How do you make an existing HashMap thread-safe without ConcurrentHashMap?

Wrap with `Collections.synchronizedMap()`, guard accesses with manual `synchronized` blocks, use a `ReentrantLock`, or swap for an immutable copy-on-write strategy. The catch: `synchronizedMap` synchronizes each call individually, not compound ops — `if (!map.containsKey(k)) map.put(k, v)` is still racy unless the whole block is wrapped. The interview signal is atomicity awareness and coarse vs fine-grained locking, not naming an API. `ConcurrentHashMap` exists because these patterns are easy to get wrong; if you must do without it, encode the invariants in code, not comments.

```java
Map<String, String> map = Collections.synchronizedMap(new HashMap<>());
synchronized (map) {                           // compound op needs explicit lock
    if (!map.containsKey(key)) map.put(key, value);
}
```

### Q311. Callable vs Runnable.

- **Runnable**: returns **nothing (`void`)** and **cannot throw checked exceptions**
- **Callable**: returns a **value** and **can throw checked exceptions**

```java
Future<Integer> f = executor.submit(() -> fetchUserId());  // Callable
executor.execute(() -> log.info("done"));                  // Runnable
```

Use `Callable` when you need the result or expect failures you want to surface to the caller. `Runnable` for fire-and-forget tasks.

### Q312. The Lock interface — when and why over `synchronized`.

- The **Lock interface** is Java's advanced synchronization mechanism that provides more flexibility and control than the traditional `synchronized` keyword. It's part of the `java.util.concurrent.locks` package.
- Key capabilities over `synchronized`:
    - `lock()` / `unlock()` — explicit acquire/release (always in try/finally)
    - `tryLock(timeout)` — non-blocking or time-bounded acquisition
    - `lockInterruptibly()` — responsive to thread interruption while waiting
    - Fairness option
    - Multiple `Condition` objects per lock (vs one wait set on `synchronized`)
- Main implementation: `ReentrantLock`. Sister types: `ReentrantReadWriteLock` (separate read/write locks), `StampedLock` (optimistic reads).
- Use `synchronized` by default; reach for `Lock` when you need timeout, interruptibility, fairness, or multiple condition variables.

---

## JVM, Memory & Performance

### Summary

**What this topic covers**

How the JVM actually runs the code — and how to make it run faster, leak less, and crash less. Four concern areas: (1) **garbage collection** — generational GC, the collectors (Serial, Parallel, G1, ZGC, Shenandoah), tuning knobs, and what each generation costs; (2) **memory** — heap vs stack, the JVM memory areas (heap, metaspace, code cache, native, direct), reference types (strong/soft/weak/phantom), memory leaks, OOM diagnosis; (3) **JIT and execution** — class loading, parent delegation, C1/C2 tiered compilation, escape analysis, scalar replacement, compressed OOPs, TLABs, intrinsics, deoptimisation; and (4) **tooling** — JFR, jcmd, jdeps, jlink, jpackage, async-profiler, heap dumps, JMH. The 33 questions span "what does GC do" entry-level material through tuning G1 for a 16GB low-latency service.

**Mental model**

The JVM is a *virtual* machine in the literal sense: a runtime that translates bytecode into native instructions and manages memory for you, hiding both behind tunable abstractions. Memory is split into **young generation** (Eden + two survivor spaces, where most objects die quickly), **old generation** (long-lived objects), **metaspace** (class metadata, native memory since Java 8), and **off-heap** (direct buffers, native libs, code cache, thread stacks). GC runs **minor** collections on the young gen (cheap, frequent) and **full/concurrent** collections that touch the old gen (expensive, rare). G1 is the default since Java 9, splitting the heap into regions and tracking which ones are mostly garbage; ZGC and Shenandoah are concurrent collectors with sub-millisecond pauses for very large heaps. Execution starts interpreted, then the JIT promotes hot methods to **C1** (fast compile, basic optimisation), then **C2** (slow compile, aggressive optimisation: inlining, escape analysis, scalar replacement, intrinsics). If profiling assumptions are violated, C2 **deoptimises** back down. Most performance "problems" are allocation rate, GC pauses, or contention; tooling (JFR + async-profiler) tells you which.

**Key terms**

- **Generational GC** — weak generational hypothesis: most objects die young, so collect young gen frequently and cheaply.
- **G1 (Garbage First)** — region-based, default since Java 9; targets pause goals via `-XX:MaxGCPauseMillis`.
- **ZGC / Shenandoah** — concurrent collectors; sub-ms pauses on heaps from 8GB to multi-TB.
- **Metaspace** — native memory holding class metadata; replaced PermGen in Java 8; can leak via classloader leaks.
- **TLAB (Thread-Local Allocation Buffer)** — per-thread slab of Eden; allocation is a pointer bump, no synchronisation.
- **Reference types** — strong (default), soft (cleared on memory pressure), weak (cleared on next GC), phantom (post-mortem hook).
- **JIT (C1/C2)** — tiered compilation: interpret → C1 quick compile → C2 full optimisation.
- **Escape analysis** — compiler determines if an object can escape its allocating method; if not, scalar replace it on the stack.
- **Compressed OOPs** — 32-bit object pointers on 64-bit JVMs up to ~32GB heaps; halves pointer overhead.
- **JFR (Java Flight Recorder)** — built-in profiler; near-zero overhead; events for allocation, GC, locks, I/O.
- **async-profiler** — sampling profiler that avoids the safepoint bias of `jstack`-based tools.
- **jcmd / jlink / jpackage** — diagnostic commands, custom runtime images, native installers.

**Why interviewers ask this**

Three signals. (1) **Operational maturity** — anyone can recite "Eden, Survivor, Old"; only operational engineers have actually tuned a G1 collector, read GC logs, and diagnosed a `Metaspace` OOM. A candidate who has shipped JVM services to production has done this; a candidate who hasn't can't fake it. (2) **Diagnostic instinct** — when interviewers ask "how would you debug a memory leak", they want to hear *a sequence*: enable JFR or take a heap dump, load it in Eclipse MAT, find the dominator tree, find the GC roots holding the leaked object. Junior candidates say "look at logs"; senior candidates name the tools and the steps. (3) **Performance literacy** — escape analysis, scalar replacement, biased locking (and why it was removed), compressed OOPs, intrinsics — these are how senior engineers reason about *why* their micro-benchmark looks weird. JMH gotchas (`@State`, `Blackhole`, dead-code elimination) catch out candidates who think benchmarking is `System.nanoTime()`.

**Common confusions**

- "GC tuning means messing with `-Xmx`" — that's heap sizing; tuning is collector choice, pause goal, region size, concurrent thread counts.
- "OutOfMemoryError means raise the heap" — sometimes; often it's a leak, a misconfigured cache, an unbounded collection, or a classloader leak in a redeployed app.
- "WeakReference and SoftReference are similar" — they aren't; weak refs clear on next GC, soft refs hang on until memory pressure. Use soft for memory-sensitive caches, weak for canonical-instance maps.
- "Stack stores primitives, heap stores objects" — closer to right than wrong, but escape analysis can scalarise objects onto the stack; method-local primitives may live in registers, never touching the stack.
- "Metaspace can't OOM" — it can. Classloader leaks (every reload of a webapp without cleanup) accumulate metadata indefinitely.
- "JIT compiles everything to native at startup" — it doesn't; it warms up. Use AOT (Leyden, GraalVM native-image) if startup matters more than peak throughput.

**What follows from this topic**

JVM internals underpin every operational answer in the primer. GC pauses feed System Design (p99 latency budgets). Class loaders feed Spring (devtools restart leaks) and Build Tools (shaded jars). JFR and async-profiler are the tools you reach for in Cloud-Native Java (production diagnostics on Kubernetes). Memory model knowledge crosses straight back into Concurrency. If JVM tuning feels mystical, drill the diagnostic workflow first: most production "performance problems" turn out to be one of allocation, contention, or pause time.

### Q51. How does garbage collection work in Java?

Automatic memory reclamation: GC identifies objects no longer reachable from GC roots and reclaims their memory.

**GC roots** include: local variables on thread stacks, static fields, JNI references, active threads.

**Modern algorithms (G1, ZGC, Shenandoah)** all variant of mark-and-sweep:
1. **Mark** — start from roots, traverse references, mark reachable objects
2. **Sweep** (or compact) — reclaim unmarked memory; sometimes compact to defragment

**Generational hypothesis** — most objects die young. Heap divided into young + old gens. Minor GC (young) is fast and frequent; major GC (old) is slower and rare. Survivors of N minor GCs get promoted (default `MaxTenuringThreshold=15`).

Stop-the-world phases pause Java threads briefly. Concurrent collectors do most work alongside the application.

### Q52. What are the different types of garbage collectors?

- What is Garbage Collection?
    - **Automatic memory management** that reclaims memory from objects no longer reachable.
- **GC Roots** (starting points for reachability):
    - Local variables in active threads
    - Static fields of loaded classes
    - JNI references
    - Active threads themselves

**Mark and Sweep** — the fundamental algorithm most GCs build upon:
1. **Mark Phase**: Traverse from GC roots, marking all reachable objects
2. **Sweep Phase**: Reclaim memory from unmarked objects
3. **Compact Phase** (optional): Defragment memory to prevent fragmentation

**Serial GC**
- **How it works**: Single-threaded, stop-the-world
- **Use case**: Small applications, single-core systems
- **Characteristics**: Low overhead, long pauses

**Parallel GC**
- **How it works**: Multiple GC threads, still stop-the-world
- **Use case**: Batch processing, where throughput > latency
- **Tuning**: `-XX:ParallelGCThreads=N`

**G1GC — Garbage First** (default since JDK 9)
- **Region-based**: Heap divided into ~2048 regions
- **Predictable pauses**: `-XX:MaxGCPauseMillis=200`
- **Concurrent marking**: Marks while application runs
- **Incremental collection**: Collects regions with most garbage first

**ZGC**
- **Colored pointers**: Metadata in 64-bit pointers
- **Load barriers**: Concurrent relocation
- **Pause times < 1ms** regardless of heap size

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

### Q175. Walk through Java's ClassLoader hierarchy and parent delegation.

Three built-in loaders form a chain:

1. **Bootstrap class loader** — written in C/C++, loads `java.base` modules (`java.lang`, `java.util`, etc.). Returned as `null` from `getClassLoader()`.
2. **Platform class loader** (formerly Extension, since Java 9) — loads platform classes (`java.sql`, `java.xml`, etc.) outside `java.base`.
3. **System / Application class loader** — loads classpath / module path. Default for application code.

**Parent delegation:** when a class loader is asked to load a class, it first asks its parent. Only if the parent fails does it try itself. Walks up to bootstrap, then comes back down.

```
load("com.example.Foo") on AppClassLoader
  → delegates to PlatformClassLoader
      → delegates to BootstrapClassLoader
          → "no, not me"
      → "no, not me"
  → AppClassLoader tries: finds com.example.Foo on classpath, loads it
```

**Why parent delegation matters:**
- Prevents user code from shadowing JDK classes — you can't define a `java.lang.String` and have it loaded
- Each class is uniquely identified by `(class loader, fully qualified name)` — same class loaded by two loaders is treated as different types

**Custom class loaders** are used by app servers (Tomcat, JBoss) for hot-deploy/redeploy of webapps, and by frameworks like OSGi for module isolation. Each webapp has its own loader, so two webapps can use different versions of the same library without conflict.

### Q176. What causes class loader leaks?

Class loaders themselves are objects. They're reachable via:
- Their loaded classes' `Class<?>` objects
- Instances of those classes (each instance keeps its class alive)
- Any thread's `contextClassLoader`
- `ThreadLocal`s holding instances

**Leak scenario** (classic in app servers):
1. Webapp A is deployed → app server creates `WebappClassLoaderA`
2. Webapp A code stores something in a `ThreadLocal` on a thread-pool thread (e.g. JDBC connection wrapper, MDC value)
3. Webapp A is undeployed → app server abandons `WebappClassLoaderA` and recreates it
4. The thread-pool thread still has the `ThreadLocal` → still references the old class via the wrapper class → old `WebappClassLoaderA` can't be GC'd
5. Every redeploy leaks a full class loader → eventually `OutOfMemoryError: Metaspace`

**Causes:**
- `ThreadLocal`s on pool threads not removed
- JDBC drivers registered in `DriverManager` (static field outside the webapp)
- Static fields holding webapp objects
- Timers / scheduled threads created inside the webapp that aren't shut down
- Custom logging configurations
- JNDI / RMI registrations

**Detection:** heap dump, look at retained-size of class loaders. Eclipse MAT has a "leak suspect" report that flags classloader chains.

**Mitigation:** always `remove()` `ThreadLocal`s, deregister JDBC drivers in `contextDestroyed`, prefer dependency injection over global registries.

### Q177. JIT compilation — what are C1, C2, and tiered compilation?

HotSpot ships two JIT compilers:
- **C1 (client compiler)** — fast compile, basic optimisations. Inlining, simple devirtualisation, on-stack replacement.
- **C2 (server compiler)** — slower compile, aggressive optimisations. Inlining heuristics, escape analysis, lock elision, dead-code elimination, loop unrolling, intrinsics for known math/collection methods.

**Tiered compilation** (default since Java 8) — start interpreted, ramp through C1 → C2 as methods get hot:

```
LEVEL 0: Interpreted (no JIT)
LEVEL 1: C1, no profiling     (very fast compile, used when not enough info)
LEVEL 2: C1, simple profiling
LEVEL 3: C1, full profiling   (gather data for C2)
LEVEL 4: C2 with profile data (most aggressive)
```

Methods rise through tiers based on invocation counters and back-edge counters (loops). Hot loops can be replaced mid-execution via **OSR (on-stack replacement)** — the interpreter frame is swapped with a compiled frame at a safepoint.

**Deoptimization** — if C2's speculative optimisation turns out wrong (e.g. assumed call site is monomorphic but a new subclass shows up), the method is decompiled and falls back to C1 or interpreter.

Java 11+ optionally uses **Graal** as an alternative JIT (`-XX:+UseJVMCICompiler`, experimental) and as the AOT compiler in GraalVM native image.

### Q178. What's escape analysis and scalar replacement?

Two C2 optimisations that eliminate allocation overhead.

**Escape analysis:** the compiler proves that an object never escapes the method that created it. "Escape" means:
- Stored in a static field, instance field of another object, or array
- Passed to a method that might store it
- Returned from the method
- Thrown as exception

If proven non-escaping, two big optimisations open up:

**Scalar replacement:** decompose the object into its fields, store them in registers (or stack), don't allocate a heap object at all.

```java
public int distanceSq(int x, int y) {
    Point p = new Point(x, y);   // C2 may eliminate this allocation
    return p.x * p.x + p.y * p.y;
}
```

If `p` doesn't escape, C2 stores `x` and `y` in registers. No heap allocation, no GC pressure.

**Lock elision:** if an object is provably non-escaping, no other thread can see it, so synchronisation is pointless. C2 removes the lock acquire/release.

```java
public String build() {
    StringBuilder sb = new StringBuilder();   // synchronized? StringBuffer was
    sb.append("hello");                        // locks elided if proven non-escaping
    return sb.toString();
}
```

`StringBuilder` itself is unsynchronised, but the same logic applied to `StringBuffer` decades ago. Modern code uses `StringBuilder` and never sees the lock cost anyway.

### Q179. What was biased locking and why was it removed?

**Biased locking** (deprecated in Java 15, removed/disabled by default in Java 18) was an optimisation for `synchronized` where the JVM tracked the *last thread* to acquire a monitor and made re-acquisition by that same thread nearly free. Common case: locks acquired only by one thread (legacy code adding superfluous synchronisation).

Removed because:
- Cost of bias revocation was high when contention happened
- Modern code uses fine-grained `ReentrantLock` and concurrent collections — biased locking helped less and less
- The complexity slowed down JVM development

`-XX:+UseBiasedLocking` still exists as an emergency flag in 18+ for legacy workloads, but expect it to disappear.

Modern uncontended `synchronized` is still cheap — CAS on the object header, no kernel calls. Just no longer free.

### Q180. What are compressed OOPs?

On 64-bit JVMs, object references would be 8 bytes each. **Compressed OOPs** (`-XX:+UseCompressedOops`, default) store them as 32-bit values, doubling the effective heap range to 32 GB.

**How it works:** all Java heap allocations are 8-byte aligned. So the bottom 3 bits of any heap address are zero. Shift right by 3, store the upper 32 bits. When dereferencing, shift left 3 and add a base. JVM does this transparently.

**Implications:**
- Heap < 32 GB: refs are 4 bytes, lower memory usage, better cache locality
- Heap > 32 GB: must use full 64-bit refs, higher memory usage and worse cache locality
- Common surprise: heap of 31 GB uses ~30% less memory than heap of 32 GB

**Scaling alternative — Compressed Class Pointers + Compressed OOPs + Class Data Sharing** all reduce overhead. ZGC supports compressed OOPs since Java 15.

When heap size matters, sizing just under the 32GB threshold can be more efficient than a slightly larger heap.

### Q181. What's a TLAB (Thread-Local Allocation Buffer)?

Each thread gets its own slab of Eden memory called a TLAB. Allocations are **bump-pointer** within the TLAB — a single increment of the local pointer, no synchronisation. When the TLAB fills, the thread gets a new one (synchronised allocation from Eden).

Why it matters:
- Allocation cost in Java is ~5-10 ns — competitive with C/C++ stack allocation, faster than `malloc` for small objects
- No contention on Eden's bump-pointer for small allocations
- Default behaviour; usually invisible

Tuning flags (rarely needed):
- `-XX:+UseTLAB` (default on)
- `-XX:TLABSize=...`
- `-XX:+PrintTLAB` (debug)

When threads have wildly different allocation patterns, TLAB sizing can matter. JVM auto-tunes TLAB sizes based on thread allocation rate. Almost always a non-issue.

### Q182. What's the card table and write barrier in generational GC?

Problem: the young gen GC only scans the young gen. If an old-gen object holds a reference to a young-gen object, scanning only young would miss the old reference and incorrectly free the young object.

Solution: track every old → young reference. The **card table** is a byte array with one byte per ~512-byte region of old gen. When a write happens that creates a cross-gen reference, the **write barrier** (compiler-inserted code on every reference store) marks the corresponding card as "dirty".

```
Old gen:    [block1][block2][block3][block4]...
Card table: [  0  ][  1  ][  0  ][  0  ]    (1 = dirty)
```

During young-gen GC, the collector:
1. Scans GC roots (stacks, statics)
2. **Scans all dirty cards** in old gen, treating their references as additional roots
3. Skips clean cards entirely

Cost: every reference write executes a few extra instructions for the barrier. Saves enormous time on minor GCs by not scanning all of old gen.

G1 uses a more sophisticated scheme — **Remembered Set** per region, tracking which other regions reference into this one. ZGC uses **load barriers** (read-side, not write-side) for its colored pointers approach.

### Q244. Walk me through what happens at the byte-level when you do `new MyClass()`.

Five phases. Worth knowing for senior interviews because it ties together class loading, memory, GC, and constructors.

**Phase 1 — Class loading (if not already loaded):**
- ClassLoader finds `MyClass.class` (filesystem, JAR, network, generated)
- Bytecode verifier checks the class is well-formed and safe
- Class linked: prepare static fields with default values (0/null), resolve symbolic references
- **Static initialisation:** static fields assigned, static blocks run — **once per class loader**

**Phase 2 — Memory allocation:**
- JVM computes object size: object header + instance fields + padding (8-byte alignment)
- **Object header** ~12-16 bytes: mark word (hashCode, GC age, lock state) + class pointer (compressed if `-XX:+UseCompressedOops`)
- Allocation: bump-pointer in the current thread's **TLAB** (Thread-Local Allocation Buffer) in Eden — typically a single increment of a pointer
- If TLAB exhausted, allocate a new TLAB or fall back to slow-path allocation in shared Eden

**Phase 3 — Field defaults:**
- All instance fields zeroed: numeric → 0, boolean → false, references → null
- This guarantees no leaked memory from previous occupants

**Phase 4 — Constructor chain:**
- `super()` resolves and runs first (recursing up to `Object` constructor)
- Then this class's instance initialiser blocks (in source order, interleaved with field initialisers)
- Then this class's constructor body
- If the constructor throws, the partially-constructed object is unreachable → garbage collected on next GC

**Phase 5 — Reference returned:**
- The reference (an indirect pointer in compressed-OOPs mode) is returned to the caller
- Object lives in Eden until the next minor GC; if still reachable, copied to a survivor space; eventually promoted to old gen after surviving N collections (default `MaxTenuringThreshold=15`)

**Why this matters in interviews:**
- TLAB allocation explains why allocation is ~5-10ns in Java — competitive with C `malloc`
- Object header explains why every Java object has a memory floor of 16+ bytes
- The constructor chain explains why `final` fields can't be reassigned and why escaped `this` references can break thread-safety

### Q246. JMH benchmark gotchas — what does `Blackhole`, `@Setup`, `@State` do?

JMH (Java Microbenchmark Harness) requires explicit machinery to defeat JIT optimisations.

- **`@State(Scope.X)`** — declares state lifetime: `Benchmark` (one per benchmark), `Group` (shared per group of threads), `Thread` (per thread)
- **`@Setup` / `@TearDown`** — fixture methods, with `Trial` / `Iteration` / `Invocation` levels
- **`@Param`** — parameterised runs across multiple values
- **`Blackhole.consume(x)`** — prevents dead-code elimination. Without it, JIT may delete the entire benchmark.

```java
@State(Scope.Benchmark)
public class HashMapBench {
    @Param({"100", "10000", "1000000"})
    int size;
    Map<Integer, Integer> map;

    @Setup public void setup() {
        map = new HashMap<>();
        for (int i = 0; i < size; i++) map.put(i, i);
    }

    @Benchmark
    public void get(Blackhole bh) {
        bh.consume(map.get(size / 2));
    }
}
```

**Common JMH mistakes:**
- Returning a value instead of `Blackhole.consume()` — JIT eliminates the call
- Using `System.currentTimeMillis()` instead of JMH's high-res timing
- Insufficient warmup — JIT needs ~5-10 iterations to stabilise
- `@Fork(0)` — runs in same JVM as previous tests, contaminates results
- Forgetting `@OutputTimeUnit(TimeUnit.NANOSECONDS)` — unreadable units

### Q247. How does the JIT decide what to inline?

C2 inlining heuristics, controllable via `-XX:CompileCommand`:

- **Hot method** detected (high invocation count or large back-edge counter)
- **Size budget:** `MaxInlineSize` (default 35 bytes) for cold callees, `FreqInlineSize` (default 325 bytes) for hot callees
- **Inlining depth limit:** `MaxInlineLevel` (default 9-15 depending on tier)
- **Polymorphic call sites:** monomorphic (single concrete type) inlines easily; bimorphic (2 types) sometimes; **megamorphic** (3+ types) goes through vtable, no inline
- **Calling convention:** `final` / `static` / `private` inlines best; virtual calls need type profile data

**Useful flags:**
```
-XX:+PrintInlining               # log every inlining decision
-XX:+UnlockDiagnosticVMOptions
-XX:+PrintCompilation            # compilation log
-XX:CompileCommand="exclude,com/example/Foo.bar"   # block inlining
```

**Senior signal:** know that **fewer, smaller methods often outperform one large one** because of inlining cascades. Hot loops with deeply-nested small calls inline beautifully; one giant method exceeds size budgets and stops.

### Q248. What's the difference between escape analysis and scalar replacement?

Both are C2 optimisations.

**Escape analysis (EA):** prove an object never escapes its creating method. "Escape" means stored in a static/instance field, in an array, returned, or thrown.

**Scalar replacement:** if EA proves no escape, decompose the object into its fields, store them in registers/stack, **don't allocate the heap object at all**.

```java
public int distSq(int x, int y) {
    Point p = new Point(x, y);   // allocation may be eliminated
    return p.x * p.x + p.y * p.y;
}
```

If `p` doesn't escape, C2 stores `x` and `y` in registers. No heap object, no GC pressure, no constructor cost.

**Verify:**
```
-XX:+UnlockDiagnosticVMOptions
-XX:+PrintEscapeAnalysis
-XX:+PrintEliminateAllocations
```

**Why it matters in interviews:** explains why writing "many small short-lived objects" in modern Java is often free at runtime — the JIT inlines the methods, proves non-escape, scalarises the objects out of existence.

### Q249. What are JVM intrinsics and why do they matter?

**Intrinsics** are method implementations the JIT replaces with hand-written assembly or specialised IR. The Java method body is ignored; the JIT emits optimal machine code.

Examples of intrinsified methods:
- `Math.sqrt`, `Math.sin`, `Math.cos` — single CPU instructions
- `String.compareTo`, `String.indexOf` — vectorised with SIMD
- `System.arraycopy` — `memcpy` / SIMD
- `Thread.currentThread()` — register read
- `Object.hashCode()` — special path
- `Unsafe.compareAndSwapInt` — single CAS instruction
- Vector API operations — direct SIMD

List active intrinsics with `-XX:+PrintIntrinsics`. Reference: `c2_intrinsics.cpp` in OpenJDK source.

**Practical implication:** rewriting hot loops in raw arithmetic vs `Math.fma` etc. is sometimes worse — intrinsics already use the optimal CPU instruction. **Trust the JIT first; benchmark before "optimising."**

### Q250. How would you tune G1GC for a 16GB heap, low-latency service?

Default G1 ergonomics target 200ms pauses. Tuning levers:

```bash
-Xms16g -Xmx16g                        # set equal — no resize storms
-XX:+UseG1GC                           # explicit
-XX:MaxGCPauseMillis=100               # target 100ms
-XX:G1HeapRegionSize=16m               # default auto, 1-32MB; larger for huge heaps
-XX:InitiatingHeapOccupancyPercent=45  # trigger concurrent mark earlier
-XX:G1NewSizePercent=20                # min young gen %
-XX:G1MaxNewSizePercent=40             # max young gen %
-XX:G1MixedGCLiveThresholdPercent=85   # skip regions >85% live during mixed GC
-XX:G1HeapWastePercent=5               # acceptable waste before mixed GC
-XX:ParallelGCThreads=8                # explicit (default = CPU count)
-XX:ConcGCThreads=2                    # background mark threads
```

**Diagnose first** with `-Xlog:gc*:file=gc.log:time,uptime:filecount=10,filesize=100m`, analyse with GCEasy.

**Common patterns:**
- Pause spikes during concurrent mark → increase `ConcGCThreads`
- Frequent old-gen pauses → increase heap or reduce promotion
- Mixed GC pauses too long → tighten `G1MixedGCLiveThresholdPercent`

**For truly low-latency** (~10ms target), G1 hits a wall. Switch to ZGC: `-XX:+UseZGC -XX:SoftMaxHeapSize=14g`.

### Q251. When and how do you use `-XX:+PrintCompilation` and JIT logs?

`-XX:+PrintCompilation` shows what's being compiled, when, and at what tier:

```
123  45    3  com.example.Foo::bar (35 bytes)
```

Columns: timestamp (ms since start), compile id, **tier** (0=interpreted, 1-3=C1, 4=C2), method, size.

**Common use:**
- See if a hot method is reaching tier 4 (C2)
- Spot **deoptimizations** — `made not entrant` log entries
- Detect compilation queue saturation under load

**Deeper analysis** with **JITWatch** — visualises compilation log + bytecode + assembly:
```bash
-XX:+UnlockDiagnosticVMOptions
-XX:+LogCompilation
-XX:+PrintAssembly                # requires hsdis disassembler
-XX:LogFile=jit.log
```

**Practical tip:** if a critical method shows up as `made not entrant` repeatedly, your code's behaviour is changing in ways that defeat C2's speculative optimisations. Look for `instanceof` checks against many types, or polymorphic call sites becoming megamorphic.

### Q252. What's the difference between sampling and instrumenting profilers?

**Sampling profiler:** periodically pauses each thread (or uses Linux signals) and records the stack. Aggregates samples into flame graphs.
- Low overhead (~1-3%)
- Statistical — accurate trends, less precise on individual methods
- Doesn't see methods that ran but never sampled
- Used by: async-profiler, JFR, VisualVM sampler

**Instrumenting profiler:** modifies bytecode at load time (or runtime via agent) to record entry/exit of every method.
- High overhead (10-100%) — can change application behaviour and timings
- Exact counts and timings
- Heavy for production
- Used by: YourKit, JProfiler, JaCoCo coverage

**For production: always sampling** (JFR or async-profiler). Instrumentation is dev/debugging only.

**`async-profiler`** is the gold standard for JVM CPU/lock/wall-clock profiling — uses Linux `perf_events`, very low overhead, generates flame graphs:

```bash
asprof -d 30 -e cpu -f profile.html <pid>
asprof -d 30 -e alloc -f alloc.html <pid>      # allocation profiling
asprof -d 30 -e lock -f lock.html <pid>         # contention profiling
asprof -d 30 -e wall -f wall.html <pid>         # wall-clock incl. blocked
```

### Q253. How do you detect and fix allocation hotspots?

**Detect:**
1. JFR allocation event sampling: `jcmd <pid> JFR.start name=alloc settings=profile filename=alloc.jfr`
2. async-profiler `-e alloc` — generates allocation flame graph
3. `-XX:+UnlockDiagnosticVMOptions -XX:+TraceClassResolution` for class-loading hot paths

**Common allocation hotspots in Java code:**
- **Boxing in tight loops** — `Long sum` instead of `long`
- **Stream creation** in hot path — streams allocate per pipeline
- **String concatenation** in loops
- **Lambdas capturing locals** — capturing lambdas allocate per invocation (stateless ones are singletons)
- **Iterator allocation** — for-each on a collection allocates an Iterator
- **`HashMap.entrySet()`** — entry objects allocated per iteration in older JDKs
- **Defensive copies** — `Collections.unmodifiableList(new ArrayList<>(input))`
- **Exception construction** — stack traces are expensive; never use exceptions for control flow
- **Date / DateTime parsing** — repeated `DateTimeFormatter` parsing creates intermediate objects

**Fix:**
- Reuse objects (pool expensive ones like `Pattern`, `DateTimeFormatter`)
- Primitive-specialised collections (Eclipse Collections, fastutil, Koloboke)
- Avoid streams in hot loops; for-loops are still fastest
- `StringBuilder.setLength(0)` to reuse
- Capture-free lambdas (use method references when possible)

### Q254. What's "deoptimization" in the JVM?

C2 makes speculative optimisations based on type profiles and class hierarchies. When those assumptions break, it falls back to interpreter or C1 — that's **deoptimization**.

**Common triggers:**
- New subclass of a previously-monomorphic type appears (megamorphic call site)
- `Class.forName` loads a class C2 assumed wouldn't appear
- A null check fails on a path C2 had optimised assuming non-null
- Integer overflow not seen in profile happens
- `instanceof` outcome changes from observed pattern
- BiasedLocking revocation (pre-Java 18)

**See deoptimizations:**
```
-XX:+UnlockDiagnosticVMOptions
-XX:+PrintDeoptimization
-XX:+TraceDeoptimization
```

Frequent deopts on a critical path = perf bug. Possible fixes:
- Make types `final` / sealed to enforce monomorphism
- Avoid runtime class loading on hot paths
- Initialise classes eagerly to prevent runtime first-use
- Don't throw exceptions on hot paths

### Q255. What does `-XX:+UseStringDeduplication` do?

G1GC option (Java 8u20+, also ZGC). During concurrent marking, GC detects `String` objects whose backing array is identical to another's — merges them to share the array.

**Typical savings:** 10-25% heap reduction on services with many duplicate strings (HTTP headers, JSON keys, log messages, status codes, enum values stringified).

**Cost:** small CPU overhead during GC concurrent mark phase. Negligible in practice.

```bash
-XX:+UseG1GC
-XX:+UseStringDeduplication
-XX:StringDeduplicationAgeThreshold=3   # only dedupe Strings that survived 3 GCs
```

**Different from `String.intern()`:** `intern()` is application-level, blocking, uses a hash table. Deduplication is GC-managed, async, transparent — strings remain distinct objects but share the underlying `char[]` / `byte[]`.

### Q264. Java Flight Recorder (JFR) — what is it and how do you use it?

JFR is a low-overhead production-grade profiler built into the JVM. Records events: GC, allocation, locks, JIT compilation, I/O, custom application events.

**Start a recording:**
```bash
# At launch
java -XX:StartFlightRecording=duration=60s,filename=app.jfr,settings=profile MyApp

# Attach to running JVM
jcmd <pid> JFR.start name=app duration=60s filename=app.jfr settings=profile
jcmd <pid> JFR.dump name=app filename=app.jfr
jcmd <pid> JFR.stop name=app
```

**Analyse:** JDK Mission Control (JMC) — free GUI from Oracle. Or `jfr summary app.jfr` for CLI summary.

**Settings:**
- `default.jfc` — minimal overhead (~1%), suitable for production always-on
- `profile.jfc` — more detail, ~3-5% overhead

**Custom events:**
```java
@Name("com.example.RequestEvent")
@Category("Application")
class RequestEvent extends Event {
    String endpoint;
    long durationMs;
}

RequestEvent ev = new RequestEvent();
ev.begin();
processRequest();
ev.endpoint = "/api/users";
ev.commit();
```

Visible in JMC alongside JVM events — correlate app performance with GC pauses, lock contention, allocation rates.

### Q265. JFR streaming — recording continuously without files.

JFR streaming (Java 14+) lets you consume events live without writing files.

```java
try (RecordingStream rs = new RecordingStream()) {
    rs.enable("jdk.GarbageCollection").withoutThreshold();
    rs.enable("jdk.ExceptionStatistics").withPeriod(Duration.ofSeconds(1));

    rs.onEvent("jdk.GarbageCollection", event -> {
        long durationMs = event.getDuration().toMillis();
        if (durationMs > 50) log.warn("Long GC: {}ms", durationMs);
    });

    rs.startAsync();
    Thread.sleep(Duration.ofSeconds(60));
}
```

**Use cases:**
- In-process anomaly detection (long GC, deadlocks, hot CPU)
- Custom metrics export to Prometheus/CloudWatch
- Adaptive instrumentation — turn on detailed events only when latency spikes

Production-ready, supported in major Java versions, ~1% overhead.

### Q266. `jcmd` — what can it do?

`jcmd` is the swiss-army knife for live JVM diagnostics. Replaces `jstack`, `jmap`, `jinfo`, parts of `jhat`.

```bash
# List all running JVMs
jcmd

# Thread dump
jcmd <pid> Thread.print

# Heap dump
jcmd <pid> GC.heap_dump /tmp/heap.hprof

# Heap histogram (lighter than full dump)
jcmd <pid> GC.class_histogram

# Trigger GC (avoid in prod — disturbs measurement)
jcmd <pid> GC.run

# JFR control
jcmd <pid> JFR.start
jcmd <pid> JFR.dump filename=...
jcmd <pid> JFR.stop

# Native memory tracking (must enable at startup with -XX:NativeMemoryTracking=summary)
jcmd <pid> VM.native_memory summary

# JVM flags
jcmd <pid> VM.flags

# Set a flag at runtime (only manageable flags)
jcmd <pid> VM.set_flag MaxHeapFreeRatio 70
```

**Pre-Java 9 equivalents:** `jstack` (threads), `jmap` (heap dumps), `jinfo` (flags). Modern code uses `jcmd` for everything.

### Q267. How do you analyse a heap dump for a memory leak?

**Tool:** Eclipse MAT (Memory Analyzer Tool) — free, gold standard.

**Workflow:**
1. Capture: `jcmd <pid> GC.heap_dump /tmp/heap.hprof` or `-XX:+HeapDumpOnOutOfMemoryError`
2. Open in MAT
3. **Leak Suspect Report** — auto-generated, identifies dominant objects
4. **Histogram view** — class instance counts and retained sizes
5. **Dominator tree** — what objects keep what alive
6. **Path to GC roots** — for any object, what references prevent it from being collected

**Common leak patterns to look for:**
- A `HashMap` holding millions of entries
- A `ThreadLocal` referenced via thread-pool threads
- A static collection growing unbounded
- Many class loaders in old gen (class loader leak)
- One huge `byte[]` (off-heap or buffer)

**MAT Object Query Language (OQL):**
```sql
SELECT * FROM java.util.HashMap WHERE size > 10000
SELECT t.name, t FROM java.lang.Thread t WHERE t.contextClassLoader != null
```

For **off-heap leaks** (DirectByteBuffer, native memory): MAT won't help. Use `-XX:NativeMemoryTracking=summary` + `jcmd VM.native_memory` and OS tools (`pmap`, `valgrind`).

### Q268. What's `jlink` and when do you use it?

`jlink` (Java 9+) builds custom modular Java runtime images — a stripped-down JRE containing only modules your app needs.

```bash
jlink --module-path $JAVA_HOME/jmods:mods \
      --add-modules com.example.app \
      --launcher app=com.example.app/com.example.Main \
      --output dist/myapp-runtime \
      --strip-debug \
      --compress=2 \
      --no-header-files \
      --no-man-pages
```

**Result:** `dist/myapp-runtime/` is a self-contained JRE + your app. Run with `dist/myapp-runtime/bin/app`.

**Benefits:**
- Smaller distribution — typically 30-80MB vs 300+MB full JDK
- Faster startup
- Simpler deployment — no separate JRE required

**Requires** your app to be modular (or use `jdeps` to discover required modules of a non-modular app).

### Q269. `jdeps` — analysing dependencies.

`jdeps` (Java 8+) reports class-level and module-level dependencies.

```bash
# What modules does my JAR need?
jdeps --list-deps myapp.jar

# Check for use of internal APIs (sun.*, jdk.internal.*)
jdeps --jdk-internals myapp.jar

# Generate module-info.java for a non-modular JAR
jdeps --generate-module-info ./out myapp.jar

# Class-level dependency graph
jdeps -verbose:class myapp.jar
```

**Use cases:**
- Migrating to JPMS — what `requires` clauses do I need?
- Finding usages of deprecated/internal APIs before upgrading Java
- Dependency analysis for security review (catches use of internal APIs that may break in future versions)

### Q270. `jpackage` — building native installers.

`jpackage` (Java 14+) creates native installers (.dmg, .msi, .deb, .rpm) bundling your app + a runtime image.

```bash
jpackage --name MyApp \
         --input lib \
         --main-jar myapp.jar \
         --main-class com.example.Main \
         --runtime-image dist/myapp-runtime \
         --type dmg \
         --icon app.icns
```

**Output:** `MyApp.dmg` — drag to Applications, runs natively. No separate Java required.

Combined with `jlink`: distribute desktop apps without users installing Java. Used for IDE installers (IntelliJ, NetBeans), regulated-environment deployments where pre-installed Java isn't allowed.

### Q271. `async-profiler` — when and how?

Best-in-class JVM profiler. Sampling-based, very low overhead, generates flame graphs.

```bash
# CPU profile, 30 seconds
asprof -d 30 -e cpu -f cpu.html <pid>

# Allocation profile
asprof -d 30 -e alloc -f alloc.html <pid>

# Lock contention
asprof -d 30 -e lock -f lock.html <pid>

# Wall-clock (includes time blocked, not just on-CPU)
asprof -d 30 -e wall -f wall.html <pid>

# Multiple events
asprof -d 30 --all-user -f profile.html <pid>
```

**Why it's better than alternatives:**
- ~1% overhead — usable in production
- Doesn't suffer from JVM "safepoint bias" that older sampling profilers do
- Full mixed Java + native + kernel stacks (when permissions allow)
- Open source, single binary

**Read the flame graph:** width = total time spent in stack frames at that level. A wide tower at the top = hot leaf method. A wide stack starting low = expensive caller chain. Look for unexpected wide bars where your mental model says "this should be fast."

### Q316. What happens when you create a new object — memory allocation, init, constructor order.

- The JVM allocates memory on the heap for the new object.
- The size is determined by the class's instance variables (fields), object header, and padding.
- The object header contains metadata like the class reference (type information) and synchronization state (for monitors/locks).
- Memory is allocated as a contiguous block.

**Step 1: Static Initialization (if needed)**
- If the class hasn't been loaded yet, static fields and static blocks are initialized first.
- This only happens once per class, not per instance.

**Step 2: Instance Initializers and Field Initialization**
- All fields zeroed (`0`, `null`, `false`).
- Instance initializer blocks and field initializers run in textual order.

**Step 3: Constructor Execution**
- The constructor body runs after all field initializations.
- If there's constructor chaining (`this()` or `super()`), the chain resolves first.
- The parent constructor always completes before the child constructor.
- Never leak `this` from a constructor: if construction is aborted (constructor throws), any side effects already performed are not undone.

---

## Low-Latency Java

### Summary

**What this topic covers**

Writing Java that runs in the **single-digit microsecond** (or tighter) latency budget — the domain of high-frequency trading, exchanges, market-data handlers, and real-time risk. This is a distinct discipline from "fast" Java: the enemy isn't average throughput, it's the **tail** (p99.9, p99.99, max). Three concern areas: (1) the **JVM tax** — GC pauses, JIT warmup, safepoints, biased locking — and how to eliminate or hide each; (2) **mechanical sympathy** — writing code that works *with* the CPU (cache lines, branch prediction, memory ordering) rather than against it; and (3) the **toolkit** — the Real Logic stack (Aeron, SBE, Agrona), the LMAX Disruptor, off-heap buffers, thread affinity, and proper latency measurement. If you're interviewing at a trading shop, this section is the whole interview.

**Mental model**

Coined by Martin Thompson: **mechanical sympathy** — you don't have to be a hardware engineer, but you must understand enough about the machine to not fight it. The latency hierarchy drives everything: L1 ~1ns, L2 ~4ns, L3 ~12ns, main memory ~70-100ns, a GC pause ~milliseconds (a million times worse). So the entire game is: **(1) never allocate on the hot path** (no allocation → no GC → no pause), **(2) keep your working set in cache** (compact data, sequential access, no pointer-chasing), **(3) never block or context-switch** (busy-spin a pinned thread instead), and **(4) never coordinate** (single-writer principle, lock-free). A low-latency Java app is steady-state **zero-garbage**, runs hot threads pinned to isolated cores, talks over shared memory or kernel-bypass UDP, and is measured in nanoseconds with a histogram that captures the tail honestly.

**Key terms**

- **Mechanical sympathy** — writing software aware of how the CPU/cache/memory actually behave.
- **Zero-allocation / zero-GC** — no object allocation in steady state; reuse, pool, or go off-heap so the collector never runs.
- **Off-heap** — `DirectByteBuffer` / `Unsafe` / `MemorySegment` (Panama) memory outside the GC's reach.
- **False sharing** — two hot variables on the same 64-byte cache line, causing cores to ping-pong ownership. Fixed with padding / `@Contended` / `jdk.internal.vm.annotation.Contended`.
- **Single-writer principle** — only one thread mutates a given piece of state; removes the need for locks (Thompson).
- **Ring buffer / Disruptor** — pre-allocated circular array for inter-thread handoff with no per-message allocation.
- **Aeron** — Real Logic's ultra-low-latency, high-throughput messaging transport (UDP unicast/multicast + shared-memory IPC, same API).
- **SBE (Simple Binary Encoding)** — zero-copy binary codec generator; the wire format that rides on Aeron in trading systems.
- **Agrona** — the foundational data-structure + buffer library Aeron and SBE are built on.
- **IdleStrategy** — how a polling thread waits when there's no work: busy-spin, yield, backoff, sleep.
- **Coordinated omission** — the measurement bug (Tene) where a stalled system stops *sending* requests, so the stall is under-counted; HdrHistogram + a fixed schedule fixes it.
- **Thread affinity** — pinning a thread to a specific isolated core (`isolcpus`, `taskset`, OpenHFT Affinity) so the OS scheduler never migrates or preempts it.

**Why interviewers ask this**

Almost exclusively for HFT / market-making / exchange / low-latency-infra roles, where it's the *entire* technical bar. They probe whether you genuinely understand the JVM at the metal — "what causes a 200µs spike in an otherwise 5µs path?" separates people who've actually run these systems (answer: a safepoint, a GC, a page fault, a cache miss storm, a TLB miss, a CPU frequency scaling event, an IRQ on your pinned core) from people who've read about them. A weak answer talks about `-Xmx`; a strong answer talks about Epsilon GC for a bounded run, `-XX:+AlwaysPreTouch`, huge pages, `isolcpus` + `nohz_full`, and measuring with HdrHistogram against coordinated omission.

**Common confusions**

- "Low latency = high throughput" — no. They often trade off; busy-spinning a core burns throughput-per-watt to win tail latency. You optimise for the percentile that matters, not the mean.
- "A faster GC (ZGC/Shenandoah) makes Java low-latency" — it bounds *pause* time (sub-millisecond), which is huge, but the lowest-latency systems still aim for **zero garbage** so the collector never runs at all (Epsilon GC = no-op collector for bounded workloads).
- "Aeron is a message broker like Kafka" — no. Aeron is a *transport* — no broker, no persistence by default (that's Aeron Archive), no consumer groups. It's the wire, not the post office.
- "`volatile` is free" — it's a memory barrier; in a tight inner loop a `VarHandle` with weaker (acquire/release/opaque) ordering can be materially cheaper.
- "JIT-compiled Java is always fast" — the *first* thousand calls run interpreted/Tier-0; cold-path code never warms up. Hence warmup harnesses, `-XX:+TieredCompilation` tuning, and increasingly AOT (CRaC, Leyden).

**What follows from this topic**

This builds directly on **Concurrency** (memory model, lock-free, Disruptor, `VarHandle`, false sharing) and **JVM, Memory & Performance** (GC, JIT, safepoints) — read those first; this topic composes them under a hard latency budget. It connects outward to **System Design** (a matching engine, an order gateway) and to **Networking** (kernel bypass, UDP, multicast). If you can explain why a hot path allocates zero objects, runs on a pinned isolated core, hands off via a ring buffer, talks SBE-over-Aeron, and is measured with HdrHistogram — you can hold a low-latency interview.

### Q317. What does "low-latency Java" actually mean, and what's the governing principle?

It means engineering for the **tail of the latency distribution** — p99.9 / p99.99 / max — in the microsecond-or-tighter range, not for average throughput. The governing principle is Martin Thompson's **mechanical sympathy**: write code that cooperates with the CPU, cache hierarchy, and memory subsystem instead of fighting them. Concretely, four rules dominate: **don't allocate** (no garbage → no GC pause), **stay in cache** (compact, sequential, no pointer-chasing), **don't block or context-switch** (busy-spin a pinned thread), and **don't coordinate** (single-writer, lock-free). Everything else is detail under those four.

### Q318. Why is the garbage collector the enemy, and how do you eliminate it from the hot path?

A GC pause is measured in milliseconds — three to six orders of magnitude worse than your microsecond budget — and it strikes unpredictably, so it shows up as the *max* and p99.99 spikes. The fix is **zero allocation in steady state**: pre-allocate and reuse objects (object pools, flyweights), keep mutable data **off-heap** in `DirectByteBuffer` / `Unsafe` / Panama `MemorySegment` so it's invisible to the collector, and use primitive-specialised collections (Agrona's `Int2ObjectHashMap`, Eclipse Collections, fastutil) to avoid autoboxing garbage. For a bounded run you can deploy **Epsilon GC** (a no-op collector — it never reclaims, so it never pauses; the JVM exits when the heap is exhausted, which by design never happens if you're truly zero-garbage). Where some allocation is unavoidable, **ZGC / Shenandoah** bound pauses to sub-millisecond, but the lowest-latency systems still target zero garbage so even that bound never bites.

### Q319. What is false sharing and how do you fix it?

CPUs move memory in 64-byte **cache lines**. If two threads write two *different* variables that happen to sit on the *same* cache line, every write invalidates the other core's copy — the line ping-pongs between cores over the coherence bus, and you pay ~100ns per "sharing" event even though the threads never logically touch the same data. The fix is **padding** so each hot variable owns its own line: historically manual `long p1..p7` padding fields, now the `@Contended` annotation (`jdk.internal.vm.annotation.Contended`, needs `-XX:-RestrictContended`) which the JVM honours by inserting padding. The Disruptor's sequence counters and Aeron's position counters are all `@Contended`/padded. Diagnose with `perf c2c` on Linux.

### Q320. Busy-spin vs blocking, and why pin threads to cores?

A blocking wait (`park`/`wait`/blocking queue) hands the core back to the OS — which means when work arrives you pay the **context-switch + scheduler wakeup** cost (single-digit microseconds, plus cache pollution from whatever ran in the meantime). A low-latency consumer instead **busy-spins** (or yields/backs off via an `IdleStrategy`), keeping the thread hot and the working set in cache so it reacts in nanoseconds. That only works if the OS doesn't preempt or migrate the thread, so you **pin** it: `isolcpus` + `nohz_full` + `rcu_nocbs` to evict the kernel from those cores, `taskset`/affinity to bind the thread, disable C-states and frequency scaling so the core stays at full clock. OpenHFT's Java Thread Affinity library is the usual binding tool. The cost: a spinning core is 100% busy doing nothing while idle — you trade power and a core for tail latency.

### Q321. Explain the single-writer principle and why lock-free matters here.

**Single-writer principle** (Thompson): if only one thread ever mutates a given piece of state, you need *no locks* for that state — no contention, no cache-line bouncing on a lock word, no kernel arbitration. You architect the system as a pipeline of single-writer stages handing off via ring buffers, rather than many threads contending on shared structures. Where you genuinely need concurrent access, go **lock-free** (CAS-based, e.g. `VarHandle.compareAndSet`) or **wait-free** so a stalled thread can't block others — a lock holder that gets descheduled (or hits a page fault) would otherwise stall every waiter, which is exactly the unbounded tail you're trying to kill. Locks also risk priority inversion and convoying. The senior framing: design the threading model so the *fast path never coordinates*; push any necessary coordination to setup/config, not the per-message path.

### Q322. What's the LMAX Disruptor and where does it fit?

A pre-allocated **ring buffer** for inter-thread message passing with zero per-message allocation, designed by LMAX (Thompson, Barker) for their trading exchange. Producers claim a slot by incrementing a sequence (CAS or single-writer), write into the *pre-existing* event object in place, and publish; consumers track their own sequence and batch-process whatever's available. It beats `ArrayBlockingQueue` because: no locks (sequence CAS / single-writer), no allocation (slots are reused), mechanical-sympathy layout (`@Contended` sequences, power-of-two size for masking instead of modulo), and natural batching that amortises cache misses. Use it for the handoff between stages inside one process — e.g. network-receive thread → business-logic thread → journalling thread. For *inter-process* or *inter-host* handoff, that's where Aeron comes in.

### Q323. What is Aeron and when would you reach for it?

**Aeron** (Real Logic — Martin Thompson, Todd Montgomery) is an ultra-low-latency, high-throughput **messaging transport**. One API spans three media: **UDP unicast**, **UDP multicast**, and **IPC** (shared-memory between processes on the same host) — you change the channel URI, not your code. It delivers reliable, ordered, flow-controlled message streams over unreliable UDP, with publish latencies in the low single-digit microseconds and the ability to saturate a 10/40GbE link. Reach for it when you've outgrown a single process (the Disruptor's domain) and need to move messages **between processes or hosts** under a hard latency budget — market-data fan-out (multicast), order gateways, inter-service buses in a trading stack. It is **not** a broker: no persistence (that's Aeron Archive), no consumer groups, no topic management — it's the wire, not Kafka. The mental model is "the Disruptor, but the ring buffer is a memory-mapped log the media driver replicates across the network."

### Q324. How does Aeron work under the hood — media driver, log buffers, publications?

A separate **Media Driver** process (or an embedded one) owns the transport and the **log buffers** — memory-mapped files (typically in `/dev/shm`) divided into **terms** (triple-buffered: one active, one being cleaned, one clean-ahead, so there's never a stall rotating terms). Application processes are thin **clients** that map the same buffers and communicate with the driver via a **command-and-control (CnC)** file. A **Publication** (identified by a channel URI + stream ID) appends messages into the active term; a **Subscription** reads from it. Because publisher and subscriber share the mapped log, IPC is genuinely **zero-copy** — `Publication.tryClaim()` hands you a slice of the log buffer to write your message directly into, no intermediate copy. Over UDP, the driver handles fragmentation, reassembly, and retransmission. Positions are tracked as monotonic 64-bit counters (the same mechanical-sympathy, `@Contended` counter design as the Disruptor's sequences).

### Q325. How does Aeron handle flow control, back pressure, and loss over UDP?

**Loss recovery**: UDP can drop/reorder, so Aeron detects gaps in the term (a missing range of positions) and the subscriber sends a **NAK**; the publisher retransmits from its still-mapped log. There's no head-of-line-blocking ACK storm — it's negative acknowledgement only. **Flow control**: the *receiver* paces the sender — the publisher can't advance past what receivers have consumed (a sliding window over the term). For multicast, you choose **min** flow control (pace to the slowest receiver — reliable but one slow consumer throttles all) or **max/tagged** flow control (pace to the fastest / a tagged subset — fast consumers stay fast, slow ones may drop and recover). **Back pressure**: `Publication.offer()` is non-blocking — it returns a negative status code (`BACK_PRESSURED`, `NOT_CONNECTED`, `ADMIN_ACTION`, `CLOSED`) and the caller decides what to do (retry via an `IdleStrategy`, drop, or escalate). You never block a hot thread on a full buffer; you handle the signal explicitly.

### Q326. What are SBE and Agrona, and how do they relate to Aeron?

They're the rest of the Real Logic stack. **SBE (Simple Binary Encoding)** is a code generator for **zero-copy binary message codecs** — you write a message schema (XML), it generates flyweight encoders/decoders that read/write fields *directly* on a buffer with no intermediate objects and no parsing step (fixed-layout, native-endian). It's an FIX-community standard and the usual **wire format** carried over Aeron in trading systems (SBE-encoded messages → Aeron transport). **Agrona** is the foundation both are built on: off-heap buffer abstractions (`UnsafeBuffer`, `DirectBuffer`, `MutableDirectBuffer`), primitive-specialised collections (`Int2ObjectHashMap`, `Object2ObjectHashMap`), concurrent structures (`ManyToOneRingBuffer`, `OneToOneRingBuffer`, broadcast buffers), `IdleStrategy` implementations, and `UnsafeAccess`. The trio composes: **Agrona** gives you the zero-garbage primitives, **SBE** gives you the zero-copy wire format, **Aeron** moves it between processes/hosts at microsecond latency.

### Q327. What do Aeron Archive and Aeron Cluster add?

**Aeron Archive** is durable **recording + replay** of streams — it persists publications to disk and lets a subscriber replay from any position, turning the ephemeral transport into something you can journal and recover from (event sourcing, audit, crash recovery). **Aeron Cluster** is **fault-tolerant state-machine replication** built on Archive + a **Raft**-style consensus protocol: you write your business logic as a *deterministic* state machine, Cluster replicates the input log across an odd number of nodes (typically 3 or 5), and on failover a follower replays the log to reach identical state. This is how you build a **fault-tolerant low-latency service** — e.g. an exchange matching engine — that survives node loss without losing or reordering messages and without a database in the hot path. The determinism requirement is the catch: no wall-clock reads, no random, no map-iteration-order dependence, no allocation-address dependence — the state machine must produce identical output from identical input on every replica.

### Q328. How do you measure low-latency correctly, and what is coordinated omission?

Never use a mean — it hides the tail that matters. Use **HdrHistogram** (Gil Tene): it records the full distribution in fixed memory at constant cost and reports any percentile (p99, p99.9, p99.99, max) accurately across a huge dynamic range. The trap it guards against is **coordinated omission**: if your load generator sends a request, waits for the response, *then* sends the next — and the system stalls for 100ms — you record *one* slow sample instead of the ~hundreds of requests that *would* have been sent and *would* have been slow during the stall. The stall is massively under-counted and your p99.9 looks great while production is on fire. Fixes: drive load on a **fixed schedule** (intended send time, not actual), measure **service time vs response time** separately, and use HdrHistogram's coordinated-omission correction. Also: measure on warmed-up code (discard the JIT-warmup phase), pin the measurement thread, and account for the JVM safepoint and GC events explicitly rather than averaging them away.

### Q329. What causes a sudden latency spike in an otherwise flat microsecond path?

The interview's favourite question — it tests whether you've actually operated these systems. Suspects, roughly in order: (1) a **GC pause** (even a young GC), or for zero-garbage systems, (2) a **safepoint** — the JVM stopping all threads for a biased-lock revoke, a deopt, a `Thread.getStackTrace`, or even a poorly-placed counted-loop safepoint poll; (3) a **page fault** — first-touch of memory not pre-touched (`-XX:+AlwaysPreTouch`, huge pages, `mlockall` to avoid swapping); (4) a **cache/TLB miss storm** from a working set that spilled L3; (5) **JIT recompilation / deoptimisation** on the hot path; (6) an **OS interrupt (IRQ)** landing on your pinned core (move IRQs off isolated cores), or the scheduler migrating the thread (didn't pin / `nohz_full` not set); (7) **CPU frequency scaling / C-state** wakeup latency (pin to performance governor, disable deep C-states); (8) **NUMA** — memory allocated on a remote node. A strong answer names the diagnostic for each (`jHiccup` / `-Xlog:safepoint` / `perf` / `async-profiler` wall-clock mode) rather than just listing causes.

### Q330. Senior interview angle: sketch the architecture of a low-latency order matching engine in Java.

Single deterministic **matching-engine thread**, pinned to an isolated core, busy-spinning on its input — **zero allocation** in the matching loop (pre-allocated order objects in an object pool, primitive-keyed `Long2ObjectHashMap` order books from Agrona, off-heap price levels). Inbound orders arrive **SBE-encoded over Aeron** (UDP from gateways, or IPC if co-located); the gateway thread (a separate pinned core) decodes onto a **Disruptor ring buffer** that hands off to the matcher with no lock and no copy. The matcher is wrapped in **Aeron Cluster** for fault tolerance — its input log is Raft-replicated across 3+ nodes, and because the engine is a deterministic state machine, any replica replays to identical state on failover (no DB in the hot path). Outbound fills go back out over Aeron to the gateways; everything durable is journalled via **Aeron Archive**, not a database. Latency is measured end-to-end with **HdrHistogram** against coordinated omission, the JVM runs zero-garbage (Epsilon or a tightly-tuned ZGC as a safety net), with `-XX:+AlwaysPreTouch`, huge pages, `isolcpus`/`nohz_full`, and IRQs steered off the trading cores. The headline: *the hot path allocates nothing, coordinates nothing, blocks on nothing, and is replicated for free by determinism.*

---

## Spring

### Summary

**What this topic covers**

The framework most Java backend interviews assume you know cold. Three concern areas live here: (1) **the core IoC container** — dependency injection, bean lifecycle, scopes, configuration, profiles, `@ConfigurationProperties` vs `@Value`, application context layering, circular-dependency resolution; (2) **the Spring Boot value proposition** — auto-configuration, starters, Actuator endpoints, conditional beans, `META-INF/spring.factories` (or `AutoConfiguration.imports` in 2.7+), embedded servers; and (3) **the cross-cutting layer** — Spring AOP, `@Transactional`, `@Async`, event publishing, Bean Validation, Spring Security (sketch). Plus the modern members of the ecosystem: Spring Modulith for modular monoliths, Spring Batch for ETL, Spring Cloud Stream for messaging, the migration from Sleuth to OpenTelemetry. The 29 questions are about whether you understand *what Spring is doing for you*, not just what annotations to sprinkle.

**Mental model**

Spring is, at its core, a *bean container with cross-cutting hooks*. The `ApplicationContext` boots, scans for `@Component`/`@Service`/`@Repository`/`@Controller` (or processes `@Bean` methods in `@Configuration` classes), resolves dependencies between them, wires them together, then offers them up for use. Around that core sit two transformative ideas. (1) **Auto-configuration** — Spring Boot ships hundreds of `@AutoConfiguration` classes guarded by `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`; the effect is "if Hibernate is on the classpath and the user hasn't defined their own `DataSource`, configure one". This is what makes a Spring Boot app start with three lines of code. (2) **AOP proxies** — `@Transactional`, `@Async`, `@Cacheable`, security annotations are all implemented by *wrapping the bean in a proxy* (CGLIB subclass for concrete classes, JDK dynamic proxy for interface beans). The proxy intercepts calls, opens the transaction / submits to executor / checks permission, then delegates. Everything weird about `@Transactional` — why it doesn't work on private methods, why self-invocation is broken — comes from this proxy mechanism. Internalise these two and Spring stops being magic.

**Key terms**

- **IoC / DI** — Inversion of Control: the framework calls your code, not vice versa. DI is the most common form.
- **Bean** — an object whose lifecycle the container manages.
- **`ApplicationContext`** — the IoC container; configuration metadata + bean registry + event publisher.
- **Bean scope** — singleton (default, one per context), prototype (new on each lookup), request, session, application, websocket.
- **Constructor vs setter vs field injection** — constructor preferred (immutability, fail-fast, testability).
- **Bean lifecycle** — instantiate → populate → `BeanNameAware`/`BeanFactoryAware` callbacks → `BeanPostProcessor.postProcessBeforeInitialization` → `@PostConstruct` → `afterPropertiesSet` → custom init → `postProcessAfterInitialization` → ready → `@PreDestroy` → custom destroy.
- **Auto-configuration** — conditional `@Configuration` classes triggered by classpath/property presence.
- **`@Transactional`** — proxy-based transaction boundary; honours propagation and isolation; rolls back on unchecked exceptions by default.
- **Spring AOP** — proxy-based aspect weaving; method-only, no field/constructor pointcuts; AspectJ for those.
- **Profiles** — `@Profile("dev")` / `application-dev.yml`; activated via `SPRING_PROFILES_ACTIVE`.
- **`@MockBean` vs `@SpyBean`** — replace bean with mock vs wrap real bean with spy; Spring-specific, slower than `@Mock`.
- **Actuator** — `/health`, `/metrics`, `/info`, `/env`, `/loggers`, `/threaddump`, `/heapdump`.

**Why interviewers ask this**

Three signals. (1) **Do you understand the proxy mechanism?** — every Spring "gotcha" question (`@Transactional` self-invocation, `@Async` not async, `@Cacheable` not cached) reduces to "the call didn't go through the proxy". Senior candidates know this immediately; junior candidates flail. (2) **Have you operated Spring services?** — Actuator endpoints, profile-based config, layered jars for Docker, graceful shutdown, `@ConfigurationProperties` over `@Value` — these are the muscle memory of someone who's shipped Spring to production. (3) **Do you know the ecosystem in 2026?** — Spring Boot 3 (Jakarta EE 9, Java 17 baseline), Spring Modulith for the post-microservices "modular monolith" trend, native-image with AOT processing, OpenTelemetry over Sleuth. "I haven't touched Spring Cloud Sleuth since 2022" is a *good* answer.

**Common confusions**

- "Field injection is fine" — it isn't; can't be `final`, hides dependencies, hostile to testing without a Spring context.
- "`@Transactional` on a private method works" — it doesn't; the proxy can't intercept private calls.
- "Calling `@Transactional` from another method in the same class works" — no; self-invocation bypasses the proxy. Inject `self` or refactor.
- "`@Component` is for services, `@Service` is for business logic" — they're functionally identical; `@Service` is a stereotype for clarity.
- "Spring Boot is Spring" — Boot is Spring's opinionated auto-configuration layer on top; you can use Spring without Boot, just rarely should.
- "`@Async` works without `@EnableAsync`" — it doesn't; same with `@Scheduled` and `@EnableScheduling`.

**What follows from this topic**

Spring is the glue layer for the rest of the primer. `@Transactional` semantics extend into Database & JPA. Spring Security extends into Security. Spring Cloud Stream extends into Messaging (Kafka). Actuator + Micrometer underpin Cloud-Native operability. AOP returns in Design Patterns. If a candidate can't articulate the proxy mechanism, every later "why doesn't this work" question becomes a stumbling block.

### Q61. Explain dependency injection and inversion of control.

- IoC is a design principle where **the control flow of a program is inverted** compared to traditional programming. Instead of your code controlling the flow and creating dependencies, a framework or container takes control.
- IoC follows the **"Don't call us, we'll call you"** principle:
    - Your components don't create or look up dependencies
    - The framework calls your components with dependencies already provided
- Spring's IoC container (`ApplicationContext`) is responsible for:
    1. **Creating objects** (beans)
    2. **Configuring objects** (setting properties)
    3. **Assembling objects** (wiring dependencies)
    4. **Managing lifecycle** (initialization, destruction)
- Dependency Injection is the mechanism: constructor (preferred), setter, or field. Benefits: testability (inject mocks), loose coupling, declarative wiring.

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

**Phase 1: Bean Instantiation and Population**
- When Spring decides to create a bean:
    1. **Constructor is called** — the object is born
    2. **Dependencies are injected** — through fields or setters
    3. **Aware interfaces are invoked** — bean becomes "aware" of its environment

**Phase 2: Post-Processing Before Initialization**
- Called before any initialization methods
- Can modify the bean instance
- Can return a completely different object (proxies!)
- Called for EVERY bean in the container

**Phase 3: Initialization**
- After dependencies are injected, initialization happens in this exact order:
    1. **`@PostConstruct` methods**
        - Standard Java annotation
        - Most commonly used
        - Clear and simple
    2. **`InitializingBean.afterPropertiesSet()`**
        - Spring-specific interface
        - Couples code to Spring
        - Useful for framework code
    3. **Custom `init-method`**
        - Configured in `@Bean` or XML
        - No coupling to Spring
        - Good for third-party classes

**Phase 4: Post-Processing After Initialization**
- `postProcessAfterInitialization()` — last chance to modify the bean
    - Often returns proxies
    - Where AOP magic happens
    - Transaction support added here
- This is where Spring wraps your beans with:
    - Transaction management
    - Security checks
    - Caching behavior
    - Async execution

**Phase 5: Bean Ready for Use**
- At this point, your bean is:
    - Fully constructed
    - Dependencies injected
    - Initialized
    - Post-processed
    - Ready to serve requests

**Phase 6: Destruction**
- Beans are destroyed when:
    - Application context is closed
    - Bean goes out of scope (prototype, request, session)
    - Explicitly removed from context
- Order: `@PreDestroy` → `DisposableBean.destroy()` → custom `destroy-method`. Prototype scope is NOT destroyed by Spring (caller's responsibility).

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

- All four annotations are **specializations of `@Component`**. Functionally, they all do the same basic thing: **mark a class as a Spring bean**. But each carries semantic meaning and enables specific features.

**When to use `@Component`:**
- Utility classes
- Helper components
- Generic beans that don't fit other categories
- Third-party integrations without specific layer responsibility

**What `@Service` indicates:**
- Contains business logic
- Typically transactional
- Coordinates between multiple components
- Layer between controllers and repositories

**What `@Repository` provides:**
- **Exception translation** to Spring's `DataAccessException`
- Marks persistence layer for clarity
- Can be targeted by AOP for monitoring/logging

**When to use `@Controller`:**
- MVC controllers returning views
- Handling form submissions
- Server-side rendering (Thymeleaf, JSP)

**When to use `@RestController`:**
- RESTful web services
- API endpoints returning JSON/XML
- Microservices communication

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

### Q183. How do Spring profiles work?

Profiles let you activate different beans / config in different environments.

**Define profiled beans:**
```java
@Configuration
@Profile("prod")
class ProdDataSourceConfig { ... }

@Component
@Profile({"dev", "test"})
class StubEmailService implements EmailService { ... }
```

**Activate profiles** (one or more):
- `spring.profiles.active=prod,monitoring` in `application.properties`
- `-Dspring.profiles.active=prod` JVM arg
- `SPRING_PROFILES_ACTIVE=prod` env var
- Programmatically: `app.setAdditionalProfiles("prod")`

**Profile-specific config:**
```
application.properties           # base
application-dev.properties       # only when 'dev' active
application-prod.properties      # only when 'prod' active
```

**Default profiles:** `spring.profiles.default=dev` runs `dev` profile if no explicit profile is set.

**Profile expressions** (Spring 5.1+): `@Profile("prod & monitoring")`, `@Profile("!dev")`.

Common pattern: `dev` for local with H2 + mock services, `test` for CI with Testcontainers, `prod` for production with real DB + real services.

### Q184. `@ConfigurationProperties` vs `@Value` — when each?

**`@Value`** — single property injection. Good for one-off lookups:

```java
@Value("${app.timeout:5}") private int timeout;
@Value("${SECRET_KEY}") private String secret;   // env var or config
```

Pros: simple. Cons: stringly-typed, no validation, no IDE refactor support, nested config awkward.

**`@ConfigurationProperties`** — typed binding for groups of properties. Strongly preferred for non-trivial config:

```java
@ConfigurationProperties(prefix = "booking")
@Validated
public record BookingProperties(
    @NotNull Duration defaultDuration,
    @Min(1) int maxPartySize,
    @Valid Notifications notifications
) {
    public record Notifications(boolean email, boolean sms) {}
}

// application.yml
booking:
  default-duration: PT2H
  max-party-size: 10
  notifications:
    email: true
    sms: false
```

Enable with `@EnableConfigurationProperties(BookingProperties.class)` on a `@Configuration` class, or use `@ConfigurationPropertiesScan`. Inject like any bean.

**Why prefer `@ConfigurationProperties`:**
- Type-safe (records, enums, `Duration`, etc.)
- Bean Validation hooks (`@Validated`, `@NotNull`, `@Min`)
- IDE autocomplete via `spring-boot-configuration-processor`
- Refactor-safe — rename a property in code, the binding still finds it via the prefix
- Nested config naturally

### Q185. What does Spring Boot Actuator give you?

Production-ready endpoints exposed over HTTP and JMX. Add `spring-boot-starter-actuator` and you get:

- **`/actuator/health`** — liveness + readiness, custom contributors
- **`/actuator/info`** — git commit, build version, custom static info
- **`/actuator/metrics`** — Micrometer metrics (JVM, HTTP, datasource)
- **`/actuator/prometheus`** — Prometheus scrape endpoint (with `micrometer-registry-prometheus`)
- **`/actuator/loggers`** — runtime log level changes (massive for prod debugging)
- **`/actuator/threaddump`** — thread dump
- **`/actuator/heapdump`** — heap dump file
- **`/actuator/env`** — config values (sanitised)
- **`/actuator/configprops`** — bound `@ConfigurationProperties`

Most are disabled by default in 3.x — enable selectively:
```yaml
management:
  endpoints.web.exposure.include: health, info, metrics, prometheus
  endpoint.health.show-details: when-authorized
```

**Health checks** for K8s:
```yaml
management.endpoint.health.probes.enabled: true
# /actuator/health/liveness  — restart pod if fails
# /actuator/health/readiness — remove from load balancer if fails
```

**Custom metrics** via Micrometer:
```java
@Component
class BookingMetrics {
    Counter bookings = Counter.builder("bookings.created").register(registry);
    void recorded() { bookings.increment(); }
}
```

### Q186. How does Spring's Bean Validation work?

JSR-380 / Bean Validation 2.0 (Hibernate Validator implementation). Add `spring-boot-starter-validation` and use annotations on fields, parameters, return values:

```java
public record CreateBookingRequest(
    @NotBlank @Size(max = 100) String customer,
    @NotNull @Future LocalDateTime startsAt,
    @Min(1) @Max(20) int partySize
) {}

@RestController
class BookingController {
    @PostMapping("/bookings")
    public Booking create(@Valid @RequestBody CreateBookingRequest req) {
        return service.book(req);
    }
}
```

`@Valid` on the parameter triggers validation. Failures throw `MethodArgumentNotValidException` (Spring MVC) or `ConstraintViolationException` (programmatic). Wire a `@RestControllerAdvice` to translate to nice 400 responses.

**Common annotations:** `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Past`, `@Future`, `@Positive`, `@Negative`, `@Digits`.

**Custom validators:**
```java
@Constraint(validatedBy = SkuValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidSku {
    String message() default "invalid SKU";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

class SkuValidator implements ConstraintValidator<ValidSku, String> {
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        return value != null && value.matches("[A-Z]{3}-\\d{4}");
    }
}
```

**Validation groups** for context-specific rules:
```java
@NotNull(groups = OnUpdate.class) UUID id;
controller.method(@Validated(OnCreate.class) Request r)
```

### Q187. How does `@Async` work in Spring?

Mark a method `@Async` and Spring runs it on a separate thread. Implementation: an AOP proxy intercepts the call and submits the work to a `TaskExecutor`.

```java
@Configuration
@EnableAsync
class AsyncConfig {
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(8);
        exec.setMaxPoolSize(16);
        exec.setQueueCapacity(100);
        exec.setThreadNamePrefix("async-");
        exec.initialize();
        return exec;
    }
}

@Service
class NotificationService {
    @Async
    public CompletableFuture<Void> notify(String email) {
        sendEmail(email);
        return CompletableFuture.completedFuture(null);
    }
}
```

**Critical gotchas:**
- **Self-invocation bypass** — `this.async()` skips the proxy. Same as `@Transactional`. Call via injected dependency.
- **Default executor** is `SimpleAsyncTaskExecutor` (creates a new thread per call!). Always provide a configured `ThreadPoolTaskExecutor`.
- **Return types** must be `void`, `Future<T>`, `CompletableFuture<T>`, or `ListenableFuture<T>`. `void` swallows exceptions — register an `AsyncUncaughtExceptionHandler`.
- Doesn't work on `private` or `final` methods (proxy can't intercept).

**Java 21 alternative:** virtual threads via `Executors.newVirtualThreadPerTaskExecutor()` configured as the `taskExecutor` bean. Or just use them directly without `@Async`.

### Q188. How does Spring's event publishing work?

In-process pub-sub via `ApplicationEventPublisher` and `@EventListener`. Decouples emitter from receivers without a message broker.

```java
// Define event
public record BookingConfirmed(UUID id, String customer) {}

// Publish
@Service
class BookingService {
    private final ApplicationEventPublisher events;
    BookingService(ApplicationEventPublisher events) { this.events = events; }

    public Booking book(...) {
        Booking b = ...;
        events.publishEvent(new BookingConfirmed(b.id(), b.customer()));
        return b;
    }
}

// Listen
@Component
class BookingListeners {
    @EventListener
    public void onConfirmed(BookingConfirmed event) {
        emailService.send(event.customer(), ...);
    }

    @Async                                   // run on async executor
    @EventListener(condition = "#event.partySize() > 10")  // SpEL filter
    public void onLargeBooking(BookingConfirmed event) { ... }
}

// Transactional listeners — fire only after the surrounding transaction commits
@TransactionalEventListener(phase = AFTER_COMMIT)
public void onCommitted(BookingConfirmed event) { ... }
```

**Sync by default** — listener runs on the publisher's thread inside the publisher's transaction. Add `@Async` for off-thread.

**Use cases:**
- Triggering side effects (notifications, audit logs) without coupling
- Decomposing a transactional service into smaller listeners
- `@TransactionalEventListener(AFTER_COMMIT)` is the cleanest way to "do this after the DB commits"

**Don't use** as a substitute for a real message broker — events are in-process only and lost on JVM restart.

### Q189. Spring Test types — `@SpringBootTest` vs `@WebMvcTest` vs `@DataJpaTest` vs `@JsonTest`?

Each loads a **slice** of the app context — faster than booting everything.

**`@SpringBootTest`** — full context. Used for integration tests touching multiple layers.
```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
class BookingApiIntegrationTest { ... }
```

**`@WebMvcTest(BookingController.class)`** — MVC layer only. Loads the controller, `MockMvc`, validation, `@ControllerAdvice`. Mocks dependencies (services, repos must be `@MockBean`). Fast.
```java
@WebMvcTest(BookingController.class)
class BookingControllerTest {
    @Autowired MockMvc mvc;
    @MockBean BookingService service;
    @Test void creates() throws Exception {
        when(service.book(any())).thenReturn(booking);
        mvc.perform(post("/bookings").contentType(JSON).content(payload))
           .andExpect(status().isCreated());
    }
}
```

**`@DataJpaTest`** — JPA slice. Configures in-memory DB, `EntityManager`, `TestEntityManager`, transaction rollback per test. No services, no controllers.
```java
@DataJpaTest
class BookingRepoTest {
    @Autowired TestEntityManager em;
    @Autowired BookingRepo repo;
}
```

**`@JsonTest`** — Jackson slice. Tests serialisation/deserialisation of DTOs.

**Other slices:** `@WebFluxTest`, `@DataMongoTest`, `@RestClientTest`, `@JdbcTest`.

**TestContainers integration** — combine with `@DynamicPropertySource` for real DB:
```java
@SpringBootTest @Testcontainers
class IntegrationTest {
    @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
}
```

### Q190. What's `@MockBean` vs `@SpyBean` vs `@Mock`?

- A **mock bean** is a complete replacement of an existing bean in the Spring context with a mock object:
    - **Complete replacement**: The original bean is entirely replaced with a mock that has no real implementation
    - **Default behavior**: All methods return default values (`null`, `0`, `false`, empty collections) unless explicitly stubbed
    - **Use case**: When you want to completely isolate the component under test from its dependencies
    - **No real code execution**: The actual implementation is never called
- A **spy bean** is a partial mock that wraps the real bean:
    - **Wraps real object**: The actual bean implementation is used by default
    - **Default behavior**: All methods call the real implementation unless explicitly stubbed
    - **Use case**: When you want to use the real implementation but override specific methods or verify interactions
    - **Real code execution**: The actual implementation runs unless you override specific methods

**Choose `@MockBean` when:**
- You want complete isolation from dependencies
- The real implementation is complex, slow, or has external dependencies
- You're testing error scenarios that are hard to reproduce with real objects

**Choose `@SpyBean` when:**
- You need most of the real implementation but want to override specific methods
- You want to verify that certain methods were called on a real object
- You're doing integration testing where partial real behavior is desired

### Q240. How does Spring resolve circular dependencies?

- Circular dependencies occur when two or more beans depend on each other, creating a cycle.
- Spring uses a sophisticated caching mechanism for singleton beans:
    - **Level 1 — Fully Initialized Beans**: complete, ready-to-use beans that have gone through their entire lifecycle.
    - **Level 2 — Early Bean References**: partially constructed beans that exist but aren't fully initialized yet. Like a house with walls but no furniture.
    - **Level 3 — Bean Factories**: instructions for creating a bean reference when needed. Like having the blueprint ready.
- Resolution flow:
    1. Create an empty instance of Bean A (just allocate memory)
    2. Register it as "being created"
    3. Start creating Bean B
    4. When Bean B needs Bean A, provide the "empty shell" of A
    5. Finish creating B
    6. Inject B into A
    7. Both are now complete
- Works only for **setter/field injection** of singletons. Constructor cycles fail at startup with `BeanCurrentlyInCreationException`.
- Avoid them: redesign for a one-way dependency, extract shared logic into a third bean, or use `ApplicationEventPublisher` for decoupled communication.

### Q292. Spring Modulith — what problem does it solve?

`spring-modulith` (Spring 6.1+) adds **modular monolith** support to Spring Boot. Forces explicit module boundaries within a single deployable.

**Concepts:**
- Each top-level package = a module
- Modules can declare APIs (public types) and internals (`internal` sub-package)
- Modules communicate via Spring events or explicitly-exposed APIs
- Cross-module access to internals fails the build via ArchUnit-style verification

**Test** with `@ApplicationModuleTest` — boots only one module's Spring context, integration testing per module.

**Use case:** medium-sized teams that want microservices' isolation without microservices' operational cost. Strangler-fig friendly — split modules into services later if scale forces it.

### Q293. Spring Batch — when does it earn its weight?

Heavy-duty batch processing framework: chunk-oriented step processing, restart from checkpoint, parallel partitioning, transaction management per chunk.

**Anatomy:**
```java
@Bean
public Step processOrders(JobRepository repo, PlatformTransactionManager tx,
                          ItemReader<Order> reader, ItemWriter<Order> writer) {
    return new StepBuilder("processOrders", repo)
        .<Order, Order>chunk(100, tx)
        .reader(reader)
        .processor(this::transform)
        .writer(writer)
        .faultTolerant()
        .skipLimit(10).skip(ParseException.class)
        .retryLimit(3).retry(TransientException.class)
        .build();
}
```

**Wins:**
- Restart from last successful chunk after failure
- Chunk-level transactions — failure rolls back only that chunk
- Skip / retry policies per exception type
- Parallel step partitioning across nodes
- Job repository tracks history, status, parameters

**Use cases:** ETL pipelines, nightly reconciliation jobs, bulk data imports, regulatory reports. Overkill for one-shot scripts.

### Q294. Spring Integration vs Spring Cloud Stream — which when?

**Spring Integration** — Enterprise Integration Patterns (EIP) framework. Channels, transformers, routers, aggregators, splitters. Synchronous or async.

```java
@Bean
public IntegrationFlow flow() {
    return IntegrationFlow.from("inputChannel")
        .filter(this::isValid)
        .transform(this::enrich)
        .route(MyMessage::type, r -> r
            .subFlowMapping("ORDER",  sf -> sf.handle(orderHandler))
            .subFlowMapping("REFUND", sf -> sf.handle(refundHandler)))
        .get();
}
```

**Spring Cloud Stream** — abstraction over message brokers (Kafka, RabbitMQ, Pulsar). Auto-configures bindings, partitioning, dead-letter queues.

```java
@Bean
public Function<KStream<String, Order>, KStream<String, EnrichedOrder>> process() {
    return stream -> stream.map((k, o) -> KeyValue.pair(k, enrich(o)));
}
```

**When each:**
- Integration — complex routing within one app, multiple sources/sinks (file, JMS, FTP, HTTP)
- Cloud Stream — event-driven microservices on a message broker, less plumbing

### Q295. Spring Cloud Sleuth → OpenTelemetry migration.

Spring Cloud Sleuth (auto-tracing library) **deprecated in Spring Boot 3** in favour of native OpenTelemetry support via Micrometer Tracing.

**New stack:**
```yaml
management:
  tracing:
    sampling.probability: 1.0
  otlp:
    tracing.endpoint: http://collector:4318/v1/traces
```

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

Auto-instruments: HTTP clients (`RestTemplate`, `WebClient`), Spring MVC, Reactor, DataSource, Kafka. Trace context propagated via W3C `traceparent` header.

**Manual spans:**
```java
@Autowired Tracer tracer;

Span span = tracer.spanBuilder("compute-totals").startSpan();
try (Scope scope = span.makeCurrent()) {
    return computeTotals();
} finally {
    span.end();
}
```

Backwards-compatible with B3 propagation if you have legacy services still on Sleuth.

### Q296. AspectJ vs Spring AOP — when does Spring AOP fall short?

**Spring AOP** (proxy-based):
- Only intercepts public methods on Spring beans
- Doesn't work for self-invocation (covered in Q65)
- Doesn't intercept fields, constructors, internal calls
- Relies on the Spring container — only managed objects

**AspectJ** (compile-time or load-time weaving):
- Intercepts everything: private methods, field access, constructors, static methods
- Works for non-Spring objects
- Compile-time weaving — zero runtime overhead vs proxy
- Load-time weaving via Java agent

```java
@Aspect
public class FieldAccessAspect {
    @Before("get(* com.example.entity..*) && !within(FieldAccessAspect)")
    public void onFieldRead(JoinPoint jp) {
        // intercept every field read in the entity package
    }
}
```

**When AspectJ wins:**
- Cross-cutting concerns Spring AOP can't reach (self-invocation, field access)
- Performance-sensitive (no proxy indirection)
- Frameworks like Hibernate's lazy loading use AspectJ-style bytecode enhancement

**Cost:** more complex build (weaver plugin), longer compile times, harder debugging. Rare in app code; common in framework code (Spring itself uses AspectJ for some annotations like `@Configurable`).

### Q298. Why doesn't `@Transactional` work on private/protected methods or self-invocation?

Spring `@Transactional` is implemented via runtime proxies (JDK dynamic or CGLIB). The proxy intercepts calls coming in from outside the bean — calls that go through the proxy reference. Private methods aren't proxyable at all; protected works only with CGLIB (not JDK proxies). Self-invocation (`this.foo()`) bypasses the proxy because it calls the underlying instance directly, so the interceptor never fires and no transaction starts. Fix: extract the transactional method into a separate bean, inject `self` via `ApplicationContext`, or use `AopContext.currentProxy()`.

### Q299. Walk through what `@Transactional` actually does at runtime.

Spring AOP creates a proxy around the bean. On a `@Transactional` method call, `TransactionInterceptor` runs: it asks a `PlatformTransactionManager` to begin a transaction (or join an existing one per the propagation setting), invokes the target method, then commits on normal return or rolls back on a runtime exception (checked exceptions don't trigger rollback by default — configure `rollbackFor`). The transaction is bound to the thread via `TransactionSynchronizationManager` and tied to a JDBC `Connection` or JPA `EntityManager`. `@Transactional` is three things glued together: proxy interception, a transaction manager, and thread-local resource binding — not magic.

### Q300. How would you log every `@Transactional` method using AOP?

Write an aspect with `@Around` advice on `@annotation(...Transactional)`; Spring wires it into the existing proxy chain. Keep the advice cheap (logging only) and don't swallow exceptions — `proceed()` and rethrow.

```java
@Aspect @Component
class TxLoggingAspect {
    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        String m = pjp.getSignature().toShortString();
        log.debug("→ tx {}", m);
        try { return pjp.proceed(); }
        finally { log.debug("← tx {}", m); }
    }
}
```

Caveat: self-invocation still won't be intercepted (same proxy limitation). For exhaustive coverage use AspectJ load-time weaving.

### Q313. What is the Spring ApplicationContext?

- The **Spring context** (formally known as the **Application Context**) is the core container in the Spring Framework that manages the lifecycle and configuration of application objects (beans). Think of it as a sophisticated factory that creates, configures, and manages all the components of your application.
- The Spring context is responsible for:
    1. **Bean Management**: creating and managing the lifecycle of beans (objects)
    2. **Dependency Injection**: wiring beans together by injecting dependencies
    3. **Configuration**: loading and processing configuration from various sources
    4. **Resource Management**: managing resources like database connections, message listeners, etc.
- When your Spring application starts:
    1. **Context Initialization**: Spring creates the application context
    2. **Component Scanning**: finds classes annotated with `@Component`, `@Service`, `@Repository`, etc.
    3. **Bean Creation**: instantiates beans based on configuration
    4. **Dependency Resolution**: injects dependencies between beans
    5. **Initialization**: runs any initialization methods
    6. **Ready State**: application is ready to serve requests

### Q314. Prototype vs Singleton bean scope.

- **Singleton**: **ONE instance** shared across the entire application
- **Prototype**: **NEW instance** created every time it's requested
- Singleton is Spring's default scope. Lifecycle fully managed by Spring.
- Prototype: Spring instantiates and wires it, then hands it off — Spring does NOT call destroy callbacks.
- Trap: a singleton holding a prototype dependency gets the prototype once at injection time (still effectively singleton). Fix with `@Lookup`, `ObjectProvider<T>`, or `Provider<T>` to get a fresh instance per call.
- Other scopes: `request`, `session`, `application`, `websocket` (web only).

### Q315. What is `@ControllerAdvice`?

- **`@ControllerAdvice`** is a specialization of `@Component` that allows you to handle exceptions, bind data, and add model attributes **globally across all controllers** in your Spring application. Think of it as a **global interceptor** for your controllers.
- Makes it easier to handle errors centrally.

```java
@ControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ApiError> notFound(EntityNotFoundException e) {
        return ResponseEntity.status(404).body(new ApiError(e.getMessage()));
    }
}
```

- Scope with `@ControllerAdvice(basePackages = "...")` or `assignableTypes = ...` to restrict to a subset of controllers.
- Use `@RestControllerAdvice` to combine with `@ResponseBody` for API error responses.

---

## Database, JPA & Hibernate

### Summary

**What this topic covers**

The persistence layer — JPA as a specification, Hibernate as the dominant implementation, Spring Data JPA as the productivity layer on top, and the underlying relational database concerns that leak through. Four concern areas: (1) **JPA core** — entity lifecycle states (new, managed, detached, removed), the persistence context, `EntityManager`, save/persist/merge/update semantics, cascade types, fetch types; (2) **performance traps** — the N+1 problem, LazyInitializationException, fetch joins, flush modes, first- and second-level cache; (3) **transactions and locking** — `@Transactional` propagation, isolation levels, optimistic (`@Version`) vs pessimistic locking, MVCC, deadlock detection; and (4) **the SQL underneath** — index types (B-tree, hash, GIN, partial, covering), query plans, schema migrations (Flyway vs Liquibase), connection pooling (HikariCP sizing). The 22 questions are where senior backend engineers either shine or expose that "Spring Data does it for me" hasn't been enough.

**Mental model**

JPA is a *unit-of-work pattern* draped over JDBC. Inside a transaction, the `EntityManager` maintains a **persistence context** — a first-level cache mapping entity IDs to managed instances. Entities transition between four states: **new** (not yet associated), **managed** (in the context, changes auto-flushed), **detached** (was managed but the context closed), **removed** (scheduled for delete). On flush, Hibernate dirty-checks managed entities and emits the minimal SQL to sync the database — this is the source of "magic" (`entity.setName("x")` causes an UPDATE) and the source of pain (a stale managed entity quietly clobbers concurrent writes). Lazy loading is implemented by proxies that fetch on first access; if the session is closed by then, you get `LazyInitializationException`. The N+1 problem arises because lazy associations look like field access but emit one SELECT per parent. The fix is to think in *SQL* — every JPA operation has a SQL outcome, and you need to know what it is. Spring Data JPA sits on top, generating `Repository` implementations from method-name conventions and offering derived queries, JPQL, native queries, Specifications, and the Criteria API. The 2026 answer is "use JPA for CRUD, escape to jOOQ or plain JDBC for the gnarly read paths".

**Key terms**

- **JPA** — Jakarta Persistence API (formerly Java Persistence); spec, not implementation.
- **Hibernate** — the dominant JPA implementation; predates the spec.
- **Persistence context / first-level cache** — per-transaction identity map of managed entities.
- **Second-level cache** — cross-transaction cache (Ehcache, Caffeine, Infinispan); read-mostly entities only.
- **Entity states** — new, managed, detached, removed.
- **`persist` vs `merge` vs `save`** — `persist` requires new entity, `merge` copies a detached entity's state into a managed copy, `save` (Spring Data) decides between them.
- **Cascade types** — `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`, `ALL`. `REMOVE` is the foot-gun.
- **Fetch type** — `EAGER` (load with parent) vs `LAZY` (load on access); default LAZY for `@OneToMany`/`@ManyToMany`, EAGER for `@ManyToOne`/`@OneToOne`.
- **N+1** — 1 query for parents, N queries for children; fix with `JOIN FETCH`, entity graphs, `@BatchSize`.
- **LazyInitializationException** — accessing a lazy association outside an open session.
- **Optimistic vs pessimistic locking** — `@Version` retry-on-conflict vs `SELECT ... FOR UPDATE` block-others.
- **Transaction propagation** — REQUIRED (default), REQUIRES_NEW, NESTED, SUPPORTS, NOT_SUPPORTED, NEVER, MANDATORY.
- **Isolation levels** — READ_UNCOMMITTED, READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE; what each prevents (dirty/non-repeatable/phantom reads).
- **HikariCP** — the de-facto connection pool; sized as `cores * 2 + spindles` typically; lower than people think.
- **Flyway / Liquibase** — schema migration tools; Flyway is SQL-first, Liquibase is changelog-DSL-first.

**Why interviewers ask this**

Three signals. (1) **Production scars** — the N+1 question is universal because everyone hits it in production once and never forgets. A candidate who solves it with `JOIN FETCH` and warns about pagination interaction is signalling experience; "use EAGER everywhere" is signalling the opposite. (2) **Transactional thinking** — propagation modes, isolation levels, optimistic vs pessimistic locking are how senior engineers reason about concurrent updates. The `@Transactional(propagation = REQUIRES_NEW)` to checkpoint an audit log during a failed business transaction is everyday knowledge. (3) **SQL fluency** — can you read a query plan? Do you know when an index helps and when it doesn't? Do you understand MVCC well enough to explain why Postgres' `SELECT` doesn't block writers? The senior candidate has thought below the ORM line.

**Common confusions**

- "`save()` and `persist()` are the same" — they aren't; `persist` is JPA spec (new entities only, returns void); `save` is Spring Data (decides between persist and merge, returns the persisted entity).
- "Lazy is always better than eager" — lazy is the better *default*, but always-lazy + access patterns = N+1. Use entity graphs or fetch joins for the actual access shape.
- "`@Transactional(readOnly = true)` makes queries read-only" — it's a *hint* to Hibernate (skip dirty checks) and to the database (route to read replica); it doesn't physically prevent writes.
- "Cascade ALL is a sensible default" — it isn't; `CascadeType.REMOVE` on a `@ManyToOne` can delete a shared parent.
- "Bigger Hikari pool = more throughput" — past the database's parallel-query capacity, more connections hurt; saturated DBs perform worse.
- "Optimistic locking is for low-contention; pessimistic for high" — closer to right than wrong, but optimistic is *almost always* the better choice; you only reach for pessimistic when retry cost is prohibitive.

**What follows from this topic**

JPA is where Spring (`@Transactional`), Concurrency (isolation, locking), and Performance (N+1, query plans) intersect in the day-to-day. Outbox pattern (Design Patterns) plus exactly-once semantics (Messaging/Kafka) build on this transactional foundation. Sharded databases and read replicas (System Design) inherit the connection-pool sizing question. If JPA feels mystical, the cure is to log SQL (`spring.jpa.show-sql=true`, plus `org.hibernate.SQL=DEBUG`) and read what your code actually emits.

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

### Q191. How does HikariCP work and how should you size it?

**HikariCP** is the de facto standard JDBC connection pool. Default in Spring Boot 2+. Wins on speed, low overhead, and correctness around edge cases (connection leaks, validation, fast failover).

**How it works:**
- Maintains a pool of physical DB connections
- `getConnection()` borrows one (instant if idle, otherwise blocks up to `connectionTimeout`)
- `close()` returns it to the pool (`Connection.close()` is intercepted by the proxy)
- Background eviction of idle and stale connections (`idleTimeout`, `maxLifetime`)
- Validation via lightweight `connectionTestQuery` or driver-native `Connection.isValid()`

**Key config:**
```yaml
spring.datasource.hikari:
  maximum-pool-size: 20         # cap
  minimum-idle: 5               # keep at least N alive
  connection-timeout: 30000     # ms to wait for a connection
  idle-timeout: 600000          # 10 min before evicting idle
  max-lifetime: 1800000         # 30 min max age — recycle to dodge stale connections / DB restarts
  validation-timeout: 5000
```

**Sizing formula** (Brett Wooldridge, HikariCP author):
```
connections = ((cores * 2) + effective_spindles)
```

For most modern systems: `cores * 2`. **Smaller pools usually outperform larger ones** — counter-intuitive but well-evidenced. Larger pools hit DB contention and OS context-switch cost; smaller pools keep the DB happy and queue at the application instead.

**Pool exhaustion symptoms:** threads stuck in `getConnection()`, `connectionTimeout` errors, slow API responses despite healthy DB. Almost always a leaking connection (forgot try-with-resources) or a long-running transaction.

### Q192. Transaction propagation deep — all 7 modes.

Spring's `@Transactional(propagation = ...)` controls how a transactional method behaves when called within an existing transaction.

| Propagation | If existing tx | If no existing tx |
|---|---|---|
| **`REQUIRED`** (default) | Join | Start new |
| **`REQUIRES_NEW`** | **Suspend** outer, start inner | Start new |
| **`NESTED`** | Savepoint within outer | Start new |
| **`MANDATORY`** | Join | Throw `IllegalTransactionStateException` |
| **`SUPPORTS`** | Join | Run without tx |
| **`NOT_SUPPORTED`** | **Suspend** outer, run without tx | Run without tx |
| **`NEVER`** | Throw | Run without tx |

**`REQUIRES_NEW`** use cases: audit logs that must commit even if outer rolls back; isolating a slow operation from the outer tx's lock scope. Cost: the outer connection is suspended (held but not used) — risks pool exhaustion with deep nesting.

**`NESTED`** uses JDBC savepoints. Inner can roll back to a savepoint without affecting outer. Useful for "best-effort" sub-operations. Not supported by all DBs; Postgres yes, Oracle yes, some older MySQL configurations no.

**`SUPPORTS`** is the read-only default for query repositories that should join an existing tx but not start one for standalone reads.

**`MANDATORY`** is a documentation/safety mechanism — "this method MUST be called from within a transaction."

### Q193. Isolation levels deep — what does each prevent?

Four ANSI isolation levels, each preventing a specific set of read anomalies:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| `READ_UNCOMMITTED` | Allows | Allows | Allows |
| `READ_COMMITTED` (Postgres default) | Prevents | Allows | Allows |
| `REPEATABLE_READ` (MySQL default) | Prevents | Prevents | Prevents in MySQL InnoDB; allows in standard SQL |
| `SERIALIZABLE` | Prevents | Prevents | Prevents |

**Anomalies explained:**

- **Dirty read** — reading data another tx wrote but hasn't committed. The other tx might roll back; you saw a value that never existed.
- **Non-repeatable read** — reading the same row twice in one tx and getting different values (another tx committed an update in between).
- **Phantom read** — a query returning different rows in the same tx because another tx inserted/deleted matching rows.

**Lost update** — two txs read a value, both update based on it, second commit overwrites first. Prevented by SERIALIZABLE or by optimistic locking with `@Version` (Q78).

**Defaults vary by DB:**
- Postgres: `READ_COMMITTED`
- MySQL/InnoDB: `REPEATABLE_READ`
- Oracle: `READ_COMMITTED`
- SQL Server: `READ_COMMITTED`

**`SERIALIZABLE`** is correct but expensive — implementations either acquire range locks (lock contention) or use serializable snapshot isolation (retry on conflict, Postgres). Pay the cost only when you genuinely need it (financial ledgers, certain inventory operations).

### Q194. MVCC vs locking — how do databases handle concurrent reads?

Two strategies for concurrent reads of data being modified:

**Locking-based (older systems, MS SQL default before snapshot isolation):**
- Reader acquires a shared lock; writer needs exclusive
- Writers block readers, readers block writers
- Simple but contention-prone

**MVCC (Multi-Version Concurrency Control)** — Postgres, Oracle, MySQL InnoDB, SQL Server (with snapshot iso enabled):
- Each row has versions tagged with the transaction ID that created it
- Readers see a consistent snapshot from when their tx started
- Writers create a new version; old version still visible to other txs
- Garbage collection ("VACUUM" in Postgres) removes versions no other tx can see

**Implications:**
- Readers don't block writers, writers don't block readers — much better concurrency
- "Snapshot" means your tx can't see another tx's changes mid-flight, even if you re-read
- Long-running tx prevents VACUUM → table bloat in Postgres
- Dead tuple cleanup is async; very write-heavy tables need autovacuum tuning

**Postgres** uses MVCC for everything; the lock-based isolation is layered on top. **MySQL InnoDB** uses MVCC for SELECT but uses row-level locks for UPDATE/DELETE.

### Q195. DB index types — when to use which.

**B-tree** (default everywhere) — sorted tree, supports `=`, `<`, `>`, `BETWEEN`, `IN`, `ORDER BY`, `LIKE 'prefix%'`. Default for almost all queries.

**Hash index** (Postgres, occasionally MySQL Memory engine) — only `=`. Faster than B-tree for pure equality but no range support. Rarely worth the extra structure unless you've measured.

**GIN (Generalized Inverted Index)** (Postgres) — for arrays, JSONB, full-text search. Each value indexed against the rows containing it.
```sql
CREATE INDEX idx_tags ON articles USING GIN (tags);
SELECT * FROM articles WHERE tags @> ARRAY['java'];   -- fast
```

**GiST (Generalized Search Tree)** (Postgres) — geometric, range, custom types. Foundation for PostGIS spatial indexes.

**Partial index** — index only rows matching a predicate. Saves space when you frequently query a subset:
```sql
CREATE INDEX idx_active_users ON users (email) WHERE status = 'ACTIVE';
```

**Covering index** — includes extra columns so the query can answer from the index alone, skipping a heap lookup:
```sql
CREATE INDEX idx_orders ON orders (customer_id) INCLUDE (status, total);
```

**Composite index column ordering matters:**
```sql
CREATE INDEX idx_user_status ON orders (customer_id, status, created_at);
-- Helps:    WHERE customer_id = ? AND status = ?
-- Helps:    WHERE customer_id = ?
-- Helps:    WHERE customer_id = ? AND status = ? AND created_at > ?
-- Doesn't:  WHERE status = ? (skips first column)
```

Rule: most-selective column first (or the one that's always in WHERE).

### Q196. How do you read a query plan?

Running `EXPLAIN SELECT ...` in Postgres shows the executor's plan. `EXPLAIN ANALYZE` actually runs and reports timings.

```
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42 AND status = 'ACTIVE';

Index Scan using idx_orders_customer_status on orders  (cost=0.43..8.45 rows=1 width=128)
  Index Cond: ((customer_id = 42) AND (status = 'ACTIVE'::order_status))
Planning Time: 0.123 ms
Execution Time: 0.034 ms
```

**Key things to look for:**
- **`Seq Scan`** on a big table → missing index. Add one.
- **`Index Scan` / `Bitmap Heap Scan`** → using an index. Good.
- **`Filter:`** vs **`Index Cond:`** — `Filter` means rows fetched then filtered (slow); `Index Cond` means filtered at the index (fast).
- **`rows=N actual rows=M`** — large discrepancy means the planner has bad statistics. Run `ANALYZE`.
- **`Hash Join` vs `Merge Join` vs `Nested Loop`** — pick depends on table sizes and indexes.
- **`Sort` for ORDER BY without an index** that matches.

**MySQL** equivalent: `EXPLAIN`. Different output but same concepts (key, rows, type, Extra).

**Slow query log** + tools like pgBadger, pt-query-digest, or PMM aggregate slow queries — fix the top offenders.

### Q197. Schema migrations — Flyway vs Liquibase?

Both manage versioned schema changes in a repo, run on app startup or via CLI.

**Flyway** — SQL-first. Migrations are plain SQL files named `V{version}__{description}.sql`:

```
db/migration/
  V1__init_schema.sql
  V2__add_users_table.sql
  V3__index_users_email.sql
```

Flyway tracks applied migrations in `flyway_schema_history` table. On startup it runs anything new in version order.

Pros: simple, SQL-native, easy to read, easy to debug. Cons: SQL is per-DB (Postgres ≠ MySQL); Java-based migrations possible but less idiomatic.

**Liquibase** — DSL-first. Migrations are XML/YAML/JSON/SQL changelogs:

```yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: alice
      changes:
        - createTable:
            tableName: users
            columns:
              - column: { name: id, type: uuid, constraints: { primaryKey: true } }
              - column: { name: email, type: varchar(255) }
```

Pros: DB-agnostic DSL (it generates the right SQL per dialect); built-in rollback support; preconditions for conditional migrations. Cons: more complex; learning curve; debugging the abstraction.

**Default for Spring Boot:** Flyway (auto-configures with `spring-boot-starter-data-jpa` + `flyway-core` on classpath). Use Liquibase if you genuinely need rollbacks or multi-DB support.

**Both:** never edit a committed migration. Add a new one to fix problems.

### Q198. JPA flush modes and the bulk-update gotcha.

JPA's persistence context (the `EntityManager`'s session-level cache) holds managed entities. Changes are tracked but not always flushed (sent as SQL) immediately.

**Flush modes:**
- **`AUTO`** (default) — flush before queries that might see uncommitted changes, and on commit
- **`COMMIT`** — flush only on transaction commit
- **`MANUAL`** — never auto; you call `em.flush()`

```java
em.setFlushMode(FlushModeType.COMMIT);   // batch all writes until commit
```

**Bulk update gotcha:**
```java
// JPQL bulk update — bypasses persistence context!
em.createQuery("UPDATE Booking b SET b.status = 'CANCELLED' WHERE b.date < :d")
  .setParameter("d", yesterday)
  .executeUpdate();

// Persistence context still holds OLD versions of these entities
Booking b = em.find(Booking.class, id);
b.getStatus();   // might still be 'CONFIRMED' — stale!
```

**Fix:** call `em.clear()` after bulk updates, or use a dedicated repository method that doesn't share the persistence context. Spring Data's `@Modifying(clearAutomatically = true)` does this for you:

```java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("UPDATE Booking b SET b.status = 'CANCELLED' WHERE b.date < :d")
int cancelOldBookings(@Param("d") LocalDate d);
```

---

## Design Patterns & Architecture

### Summary

**What this topic covers**

The structural vocabulary senior engineers use to discuss systems above the method level. Three concern areas: (1) **GoF patterns** — Singleton (and its thread-safe forms), Factory and Abstract Factory, Observer, Decorator, Adapter, Proxy, Chain of Responsibility, Strategy, Template Method, Builder; (2) **architectural styles** — Hexagonal / Ports & Adapters, Clean / Onion Architecture, Domain-Driven Design (DDD), microservices vs modular monoliths, the Strangler Fig migration pattern, Backend for Frontend (BFF); and (3) **anti-patterns and distributed patterns** — God class, anemic domain model, primitive obsession, feature envy, plus the Outbox pattern, event-driven architecture, and when those earn their complexity. The 16 questions are less about reciting GoF and more about whether you reach for the right *shape* for the problem.

**Mental model**

Design patterns are not a checklist; they're a *shared vocabulary* for tradeoffs. Junior engineers learn GoF and start sprinkling Singletons; senior engineers internalise that every pattern is a tradeoff between flexibility, performance, and cognitive load — and the right answer most of the time is "no pattern, just a function or a class". The valuable patterns in 2026 Java are the ones that survive contact with frameworks: **Strategy** (often expressed as a lambda or `Function<T,R>` field), **Decorator** (filters, interceptors, Spring AOP), **Builder** (Lombok `@Builder`, records' wither-style copies), **Adapter** (the gateway between hexagonal "ports" and external systems), **Observer** (Spring's `ApplicationEvent`, reactive `Publisher`/`Subscriber`). At the architecture tier the story is similar: Hexagonal/Clean/Onion are *the same idea* — push domain logic to the centre, push frameworks and I/O to the edges, depend inwards only. DDD gives you the language for that centre (aggregates, value objects, domain events, bounded contexts). Microservices give you organisational scaling — at the cost of distributed-system complexity that most teams underestimate. The 2026 backlash is the **modular monolith** (Spring Modulith, well-bounded packages) — the productivity of a monolith with most of the structural discipline of services. Knowing when to *not* split is the senior judgment call.

**Key terms**

- **Singleton** — exactly one instance; in Spring, every bean is a singleton by default, so don't write it manually.
- **Factory / Abstract Factory** — encapsulate construction; Abstract Factory creates *families* of related products.
- **Observer** — pub-sub; Java's `Observable` is deprecated, use `ApplicationEvent`, `Flow.Publisher`, or Reactor.
- **Strategy** — interchangeable algorithm; in 2026 Java, often just a `Function` field.
- **Decorator** — wraps a component to add behaviour; Spring AOP, Servlet filters, `BufferedReader`.
- **Proxy** — stand-in that controls access; CGLIB/JDK dynamic proxies power Spring AOP and JPA lazy loading.
- **Chain of Responsibility** — request flows down a chain; Spring Security filter chain is the canonical example.
- **Builder** — fluent construction for objects with many optional fields; Lombok, records with companion builders.
- **Hexagonal / Ports & Adapters** — domain at the centre, adapters at the edges (controllers, repositories, message handlers).
- **Clean / Onion Architecture** — same shape as hexagonal; concentric dependency rule (inward only).
- **DDD** — bounded contexts, aggregates, value objects, domain events, ubiquitous language.
- **Strangler Fig** — incremental migration by intercepting traffic and gradually replacing the old system.
- **BFF** — backend tailored to a specific client (web, mobile, partner); avoids one fat API trying to serve everyone.
- **Outbox** — persist outgoing events in the same DB transaction as the state change; relay them to the broker asynchronously.

**Why interviewers ask this**

Three signals. (1) **Vocabulary for tradeoffs** — senior engineers should be able to say "I'd use Strategy here, not inheritance, because the algorithms vary independently of the data". Junior candidates name the pattern; senior candidates explain *why this pattern over that one*. (2) **Architectural maturity** — given a system design problem, do you reach for microservices reflexively or do you ask whether a modular monolith would do the job? Do you know when *not* to apply DDD (a CRUD app with no real domain doesn't need aggregates)? Patterns over-applied are noise. (3) **Anti-pattern recognition** — recognising the anemic domain model (entities are bags of getters/setters, all behaviour in services), the primitive-obsession smell (`String customerId` everywhere instead of a `CustomerId` value object), the God service that's accumulated half the codebase — these are the smells that distinguish senior code review from junior.

**Common confusions**

- "Use Singleton for shared state" — in Spring you already have singleton beans; writing the GoF singleton is reinventing the wheel.
- "Factory pattern means a class with `static create()` methods" — that's a static factory *method*; the Factory *pattern* is about decoupling construction from use, often with polymorphism.
- "Hexagonal and Clean and Onion are different architectures" — they're the same idea with different vocabularies; the principle is "domain doesn't depend on infrastructure".
- "Microservices solve coupling" — they distribute coupling. Bad boundaries become network calls.
- "DDD means using `@Entity` everywhere" — DDD is a modelling discipline; JPA entities are a persistence mechanism. They can align but the latter is not the former.
- "Anemic domain model is bad" — it's bad when you *meant* to have a rich domain. For a transactional script over CRUD, anemic is fine.

**What follows from this topic**

Patterns and architecture are the lens through which later topics make sense. Outbox + Strangler Fig connect to Messaging (Kafka) and migration in System Design. Hexagonal architecture frames Testing (it's easier to test pure domain logic than tangled service layers). DDD framing recurs in Database (aggregate boundaries = transaction boundaries). Senior candidates don't quote GoF chapter and verse — they recognise the *shape* of a problem and know which tools have worked for it before.

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

### Q199. More GoF patterns — Decorator, Adapter, Proxy, Chain of Responsibility.

**Decorator** — wrap an object to add behaviour without subclassing. Java I/O streams are the canonical example: `BufferedInputStream(FileInputStream(...))`.

```java
interface Coffee { int cost(); }
class Espresso implements Coffee { public int cost() { return 200; } }
class WithMilk implements Coffee {
    private final Coffee wrapped;
    WithMilk(Coffee c) { this.wrapped = c; }
    public int cost() { return wrapped.cost() + 30; }
}
new WithMilk(new Espresso()).cost();   // 230
```

Stack arbitrarily deep. Each decorator focuses on one orthogonal concern.

**Adapter** — translate between two incompatible interfaces. Common when integrating third-party libraries with your domain interface:

```java
class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient stripe;
    public ChargeResult charge(Money amount) {
        StripeCharge c = stripe.charges().create(toStripeRequest(amount));
        return mapToDomain(c);
    }
}
```

**Proxy** — same interface as the wrapped object, intercepts calls. Spring uses dynamic proxies for `@Transactional`, `@Async`, `@Cacheable`. Lazy-loading proxies in Hibernate. JDK `Proxy` class for runtime interface implementations.

**Chain of Responsibility** — chain of handlers, each decides to handle or pass on. HTTP filters/middleware are exactly this:

```java
interface Handler {
    void handle(Request req, HandlerChain chain);
}
class AuthHandler implements Handler {
    public void handle(Request req, HandlerChain chain) {
        if (req.token() == null) throw new Unauthorized();
        chain.next(req);
    }
}
```

### Q200. Hexagonal Architecture / Ports & Adapters.

Alistair Cockburn's pattern. Core idea: the **domain** lives at the centre, isolated from infrastructure (DB, HTTP, message brokers) by **ports** (interfaces) and **adapters** (implementations).

```
            [HTTP Adapter]   [CLI Adapter]
                 │                │
                 └──── port ──────┘
                         │
                  ┌──────┴──────┐
                  │   Domain    │  (no Spring, no JPA, no HTTP)
                  │   (core)    │
                  └──────┬──────┘
                         │
                 ┌─── port ──────┐
                 │               │
          [DB Adapter]    [Kafka Adapter]
```

**Ports** are interfaces defined by the domain: `BookingRepository`, `EmailNotifier`, `PaymentGateway`. **Adapters** implement them: `JpaBookingRepository`, `SmtpEmailNotifier`.

**Benefits:**
- Domain depends on nothing infrastructural — testable without Spring/DB/HTTP
- Swap infrastructure (Postgres → DynamoDB) without touching domain logic
- Forces explicit dependencies — no service reaching into Spring magic
- Multiple drivers possible (HTTP + CLI + scheduled job all hit the same domain)

**In Java/Spring:** keep domain in a `domain` package with no Spring imports. Adapters in `adapters/inbound/...` (controllers, listeners) and `adapters/outbound/...` (repositories, clients). Spring wires them together at the application boundary.

**Trade-off:** more interfaces, more files, more ceremony. Pays off in long-lived domains that outlive specific tech choices.

### Q201. Clean Architecture / Onion Architecture — same thing?

Both are Cockburn-descended patterns with concentric layers; differences are mostly emphasis.

**Onion Architecture** (Jeffrey Palermo): inner = domain entities, surrounded by domain services, then application services, then infrastructure. Dependencies point inward only.

**Clean Architecture** (Robert C. Martin): four layers — Entities, Use Cases, Interface Adapters, Frameworks & Drivers. Dependency rule: source code dependencies point inward only.

```
┌─────────────────────────────────────┐
│  Frameworks & Drivers (Spring,       │
│      Postgres, Kafka)                │
│  ┌─────────────────────────────────┐ │
│  │  Interface Adapters             │ │
│  │  (controllers, gateways, DTOs)  │ │
│  │  ┌───────────────────────────┐  │ │
│  │  │  Use Cases                │  │ │
│  │  │  (application services)   │  │ │
│  │  │  ┌─────────────────────┐  │  │ │
│  │  │  │  Entities (domain)  │  │  │ │
│  │  │  └─────────────────────┘  │  │ │
│  │  └───────────────────────────┘  │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Both share:**
- Domain at the centre
- Dependencies go inward (frameworks know domain, domain doesn't know frameworks)
- DTO mapping at boundaries
- Testability without infrastructure

**Practical reality:** the differences are mostly diagrams. For a team, pick one terminology and stick with it. Hexagonal/Ports & Adapters is the same family with the simplest mental model. **Don't over-layer for small services** — the ceremony costs more than it saves.

### Q202. Anti-patterns — God class, anemic domain model, primitive obsession, feature envy.

**God class** — one class doing far too much. Hundreds of methods, thousands of lines, every team member edits it. Symptom: every PR touches it. Fix: split by responsibility (SRP).

**Anemic domain model** — entities are bags of getters/setters with no behaviour; logic lives in `*Service` classes that operate on them. Common in Spring/JPA shops because JPA likes plain data. Loses the OO win — you can't enforce invariants at the entity level.

```java
// Anemic
class Account { Long id; BigDecimal balance; /* getters/setters */ }
class AccountService {
    void withdraw(Account a, BigDecimal amt) {
        if (a.balance < amt) throw new InsufficientFundsException();
        a.balance -= amt;
    }
}

// Rich
class Account {
    private BigDecimal balance;
    void withdraw(BigDecimal amt) {
        if (balance.compareTo(amt) < 0) throw new InsufficientFundsException();
        balance = balance.subtract(amt);
    }
}
```

**Primitive obsession** — using built-in types (`String`, `int`, `BigDecimal`) for things that have meaning (`UserId`, `Money`, `Email`). Errors aren't caught at the type level: `transfer(toUserId, fromUserId)` compiles even if you swap them.

```java
// Obsessive
void transfer(String fromAccount, String toAccount, BigDecimal amount) {}

// Typed
void transfer(AccountId from, AccountId to, Money amount) {}
record AccountId(UUID value) {}
record Money(BigDecimal amount, Currency currency) {}
```

Records make this cheap. Use them.

**Feature envy** — a method that uses another class's data more than its own. Sign that the method should live on the other class.

### Q203. Strangler Fig pattern — what's it for?

Migration pattern from Martin Fowler. Named after the strangler fig tree, which grows around a host tree until eventually it stands on its own and the host dies.

**Use case:** legacy monolith you can't rewrite in one go. Need to migrate to new architecture incrementally without big-bang risk.

**Steps:**
1. Put a routing layer (proxy/gateway) in front of the monolith
2. Build new functionality as new services
3. Route specific URLs / features to the new services
4. As more features migrate, the monolith shrinks
5. Eventually, the monolith is empty or dies; new services stand alone

```
Step 1:           Step 3:                    Step 5:
[Client]          [Client]                   [Client]
   │                │                            │
   ▼                ▼                            ▼
[Monolith]      [Gateway]                   [Gateway]
                /  │  \                     /  │  \
       [Mono] [New A] [New B]       [New A] [New B] [New C]
```

**Practical tips:**
- Pick the right routing seam (URL prefix, header, feature flag)
- Keep the monolith and new services using the same DB initially; migrate data later
- Have a rollback plan per migrated feature
- Track migration progress as a metric

### Q204. Backend for Frontend (BFF) pattern.

Each client (web, iOS, Android) gets its own dedicated backend service tailored to its UX needs. Sits between the client and downstream microservices.

```
[Web Client]      [iOS Client]     [Android Client]
     │                │                  │
     ▼                ▼                  ▼
[Web BFF]        [iOS BFF]        [Android BFF]
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   [User Service] [Order Service] [Catalog Service]
```

**Why:**
- Each client has different data shapes and aggregation needs (mobile wants compact responses, web can handle richer)
- Authentication / session management differs per client
- Shielding clients from backend service evolution
- Each client team owns their BFF — fewer cross-team coordination headaches

**Trade-off:** one more service per client, more code to maintain. Pays off when client teams genuinely need different aggregations or experiences. For small apps with one client, just one general API is fine.

### Q205. Outbox pattern — what problem does it solve?

**Problem:** "save to DB AND publish to Kafka" needs to be atomic. Either both happen or neither. Two-phase commit is heavy and broker-specific. What if you crash between the two?

**Outbox pattern:** atomic write of business state + an event row in the same DB transaction. Async dispatcher polls/streams the outbox table, publishes to Kafka, marks rows sent.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
INSERT INTO outbox (id, aggregate_id, event_type, payload, created_at)
       VALUES (uuid(), 1, 'AccountDebited', '{...}', now());
COMMIT;

-- Async dispatcher:
SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 100;
-- Publish to Kafka
UPDATE outbox SET sent_at = now() WHERE id IN (...);
```

**Variants:**
- **Polling outbox** — dispatcher polls the outbox table on a timer. Simple, lag = poll interval.
- **CDC outbox** (Debezium, Maxwell) — DB write-ahead log streamed to Kafka. Lower latency, no polling.

**Guarantees:** at-least-once delivery (publish might succeed but `UPDATE outbox SET sent_at` might fail → retry → duplicate). Consumers must be idempotent.

**Why not 2PC:** XA across DB + Kafka exists but is operationally fragile. Outbox keeps the atomicity in one resource (the DB) and pushes the cross-resource coordination async.

### Q206. Event-driven architecture — when does it earn the complexity?

Communication via events rather than synchronous request/response. Producer emits an event; one or more consumers react.

**Earns the complexity when:**
- Multiple downstream services react to the same business event (one fact, many side effects)
- You want loose temporal coupling — producer doesn't wait, consumer can be down without breaking the producer
- Audit log / event sourcing is part of the design
- You need to evolve consumers independently (add a new consumer without touching the producer)

**Costs:**
- Eventual consistency by default — reads might lag writes
- Harder to reason about end-to-end flow (no single stack trace)
- Schema evolution is hard (consumers might be on old versions)
- Debugging is harder; need distributed tracing
- More moving parts (broker, schema registry, dead letter queues)

**Don't go event-driven for:** simple CRUD, request/response with a single consumer, anything where you need synchronous confirmation.

**Real-world hybrid:** sync REST for command path (return 202 Accepted with idempotency key), events for downstream side effects. Best of both.

---

## Testing

### Summary

**What this topic covers**

How senior Java engineers think about correctness and confidence. Three concern areas: (1) **the testing tier** — unit vs integration vs end-to-end, the testing trophy/pyramid, what each tier is for, and where the boundaries belong; (2) **the JVM-specific tooling** — JUnit 4 vs JUnit 5 (Jupiter), parameterised tests, Mockito (`ArgumentCaptor`, `argThat`, `@Mock` vs `@Spy` vs `@MockBean` vs `@SpyBean`), AssertJ vs Hamcrest vs vanilla, Testcontainers, JMH for benchmarks; and (3) **the discipline** — TDD, the test-double taxonomy (dummy, stub, fake, spy, mock), mutation testing (Pitest), contract testing (Pact), property-based testing (jqwik), and quality gates (JaCoCo coverage thresholds). The 17 questions test whether you can articulate *why* you test what you test, and recognise when more tests would buy you less confidence.

**Mental model**

Tests exist to give you the confidence to change code. Every test costs to write, maintain, and run; the return is the cost it saves you in production bugs or fearful changes. Senior engineers think about that ROI explicitly. The classic **testing pyramid** (many fast unit tests, fewer integration tests, fewer still E2E) was the 2010s consensus; Kent C. Dodds' **testing trophy** rebalanced it toward integration tests, arguing that unit tests are cheap but give little confidence about *systems*. The 2026 Java equivalent: unit tests for pure domain logic, **`@SpringBootTest` + Testcontainers** for the integration surface (real DB, real broker, no mocks of your own code), and a thin end-to-end smoke layer. Mocks belong at *I/O boundaries* (HTTP clients, brokers) — not at your service-to-service boundaries inside the app, where they bind tests to implementation. Test doubles have a precise taxonomy (dummy, stub, fake, spy, mock); using "mock" for all of them is sloppy. The discipline questions — TDD, mutation testing, property-based testing, contract testing — are about whether you've actually shipped under those disciplines or merely heard the words.

**Key terms**

- **Unit test** — exercises a single unit (class, function) in isolation. Fast, no I/O.
- **Integration test** — exercises a slice of the system including real dependencies (DB, broker, HTTP).
- **End-to-end** — exercises the full system from outside; slow, brittle, high-confidence.
- **JUnit 5 (Jupiter)** — `@ExtendWith`, `@ParameterizedTest`, `@Nested`, `@DisplayName`; replaces JUnit 4's `@RunWith` model.
- **Mockito** — mocking framework; `mock()`, `when().thenReturn()`, `verify()`, `ArgumentCaptor`, `@MockBean` for Spring.
- **AssertJ** — fluent assertion library; `assertThat(x).isEqualTo(y).hasSize(3)`. Strictly better than JUnit assertions.
- **Testcontainers** — Docker-managed throwaway dependencies for integration tests; Postgres, Kafka, Redis, etc.
- **TDD** — red, green, refactor; tests drive design.
- **Test double taxonomy** — dummy (passed but unused), stub (canned response), fake (working in-memory impl), spy (real + recording), mock (verified expectations).
- **JaCoCo** — coverage tool; useful as a *floor* (don't drop below X%), not a *goal*.
- **Mutation testing (Pitest)** — mutate code, see if tests catch the mutation; measures test *quality* not coverage.
- **Property-based testing (jqwik)** — declare properties, library generates inputs; finds edge cases humans miss.
- **Contract testing (Pact)** — consumer publishes expectations, provider verifies them; catches API drift across services.

**Why interviewers ask this**

Three signals. (1) **What do you mock?** — a candidate who says "I mock the repository in service tests" reveals they're testing implementation. A candidate who says "I use Testcontainers for the DB so I'm testing what production runs" reveals operational maturity. The mock-everything style produces high coverage and low confidence; senior engineers know this. (2) **Do you use JUnit 5 idioms?** — `@ParameterizedTest` with `@CsvSource`, `@Nested` classes for context-grouping, `assertThrows` for exception assertions. Code stuck on JUnit 4 idioms reveals a legacy codebase that hasn't been refactored. (3) **Test discipline beyond unit tests** — mutation testing, contract testing, property-based testing, JMH. Most candidates have heard the words; few have used them. The candidate who can describe a mutation-test-discovered bug or a Pact-caught regression has done the work.

**Common confusions**

- "100% coverage means well-tested" — coverage measures *executed lines*, not *asserted behaviour*. Mutation testing exposes the gap.
- "Mock everything for unit tests" — over-mocking makes tests brittle and meaningless. Mock at the I/O boundary, not the service boundary.
- "Integration tests are slow, avoid them" — Testcontainers + parallel execution makes a 200-test integration suite run in 30s. The "slow" excuse is mostly outdated.
- "`@SpyBean` and `@SpySpring` and `@Spy` are the same" — they aren't; Spring spies wrap the bean in the context (heavy), Mockito spies are standalone (light).
- "TDD slows you down" — TDD changes *when* the design work happens, not how much. Done badly it slows you; done well it accelerates because you catch design problems before writing the implementation.
- "Coverage gates fix quality" — they prevent regression in coverage, not in quality. Mutation gates fix quality.

**What follows from this topic**

Testing discipline underpins every later claim about correctness. Integration testing with Testcontainers feeds Database (real Postgres) and Messaging (real Kafka). `@SpringBootTest` slices show up in Spring topic gotchas. JMH connects to JVM Performance. If a candidate's testing answers are vague, treat their production-readiness claims with the same skepticism — untested code that "works" is a debt position, not an asset.

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

- Parameterized test or cucumber data table — parameterized test because it's more of a unit test (method).
- Instead of writing multiple test methods with similar logic, parameterized tests let you **write one test method and run it multiple times with different inputs**. JUnit creates a separate test execution for each parameter set.

```java
@ParameterizedTest
@CsvSource({
    "apple, 5",         // First test: input="apple", expected=5
    "strawberry, 10",   // Second test: input="strawberry", expected=10
    "pear, 4",          // Third test: input="pear", expected=4
    "'', 0",            // Empty string case (note the quotes)
    "' ', 2"            // String with spaces
})
void length(String input, int expected) {
    assertEquals(expected, input.length());
}
```

Sources: `@ValueSource`, `@CsvSource`, `@CsvFileSource`, `@MethodSource` (returns `Stream<Arguments>`), `@EnumSource`.

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

### Q207. JMH for micro-benchmarks — why and how?

Measuring Java performance in a `main()` method gives misleading numbers. JIT warm-up, dead code elimination, escape analysis can all skew results unpredictably.

**JMH (Java Microbenchmark Harness)** — OpenJDK's official benchmarking tool. Handles:
- Warmup iterations (let JIT stabilise)
- Measurement iterations
- Forking (separate JVM per benchmark — clean state)
- Dead-code elimination via `Blackhole`
- Branch prediction effects

```java
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Warmup(iterations = 5)
@Measurement(iterations = 10)
@Fork(1)
public class StringConcatBench {
    String a = "hello";
    String b = "world";

    @Benchmark
    public String plus() {
        return a + " " + b;
    }

    @Benchmark
    public String stringBuilder() {
        return new StringBuilder().append(a).append(" ").append(b).toString();
    }

    @Benchmark
    public void blackholedConcat(Blackhole bh) {
        bh.consume(a + " " + b);   // prevent dead-code elimination
    }
}
```

Run: `mvn clean install` then `java -jar target/benchmarks.jar`.

**Don't use** for application-level perf — JMH is for measuring nanoseconds of specific methods. For end-to-end, use load testing (Gatling, k6, JMeter).

### Q208. Property-based testing — what's the idea?

Instead of writing example-based tests (specific inputs, specific outputs), declare **properties** that should hold for all valid inputs. The framework generates many random inputs and finds counterexamples.

**Tools:** **jqwik** (idiomatic JUnit 5 integration), QuickTheories.

```java
import net.jqwik.api.*;

class StringPropertiesTest {

    @Property
    boolean reverseTwiceYieldsOriginal(@ForAll String input) {
        return new StringBuilder(input).reverse().reverse().toString().equals(input);
    }

    @Property
    boolean concatLengthIsSumOfLengths(@ForAll String a, @ForAll String b) {
        return (a + b).length() == a.length() + b.length();
    }

    @Property
    boolean sortingIsIdempotent(@ForAll List<@WithNull Integer> xs) {
        var once = xs.stream().sorted().toList();
        var twice = once.stream().sorted().toList();
        return once.equals(twice);
    }
}
```

**On failure**, jqwik shrinks the input — finds the minimal failing case. So instead of "fails on `[3, -7, 12, 0, -1, 5]`" you get "fails on `[-1]`" or whatever the smallest failing input is.

**Use for:** functions with algebraic properties (commutativity, associativity, idempotence, identity), parsers (`parse(format(x)) == x`), comparators, hash functions, any pure function with invariants.

**Don't use for:** interaction-heavy code (it's example-based by nature), business workflows with many side effects.

### Q209. The full taxonomy of test doubles.

Gerard Meszaros's classification (*xUnit Test Patterns*):

**Dummy** — passed but never used. Just to satisfy a parameter list.
```java
service.methodTakingLogger(new DummyLogger());
```

**Stub** — provides canned answers. Doesn't verify calls.
```java
when(repo.findById(id)).thenReturn(Optional.of(user));
```

**Spy** — wraps a real implementation, records call info for later verification.
```java
@Spy AuditService audit;   // real audit, but records all calls
audit.log(event);
verify(audit).log(any(Event.class));
```

**Mock** — pre-programmed expectations + verification. Test fails if expectations not met.
```java
@Mock EmailService email;
when(email.send(...)).thenReturn(true);
service.confirmBooking(id);
verify(email).send(eq(customer), contains("confirmed"));
```

**Fake** — working implementation, simpler than the real thing. In-memory DB, Map-backed repo, in-memory message broker. Often the cleanest choice.
```java
class InMemoryBookingRepo implements BookingRepository {
    private final Map<UUID, Booking> store = new ConcurrentHashMap<>();
    public Optional<Booking> findById(UUID id) { return Optional.ofNullable(store.get(id)); }
    public Booking save(Booking b) { store.put(b.id(), b); return b; }
}
```

**Choosing:**
- Dummy / Stub for collaborators whose specific calls aren't being tested
- Spy when you want to verify side effects but keep real behaviour
- Mock when verifying interaction is the test's purpose
- Fake when the dependency has rich behaviour and you want realistic interactions across modules

**Mockist (London) vs Classicist (Detroit)** schools differ on overuse of mocks. Lean classicist — mocks coupled to implementation make tests brittle. Use fakes where reasonable.

### Q210. Mockito limitations and workarounds.

**Default Mockito (mockito-core 3.4+):**
- Can mock interfaces, abstract classes, concrete classes
- **Cannot** mock final classes, final methods, static methods, constructors, private methods, native methods (without help)

**`mockito-inline`** — adds bytecode instrumentation to handle:
- Final classes / methods (most useful — Java records, immutable wrappers)
- Static methods (`mockStatic(Files.class)`)
- Constructors (`mockConstruction(MyClass.class)`)

```java
try (MockedStatic<Files> mocked = Mockito.mockStatic(Files.class)) {
    mocked.when(() -> Files.readString(any(Path.class))).thenReturn("stub");
    assertEquals("stub", service.loadConfig());
}
```

**Still cannot:** mock `final` methods on `java.*` classes (sealed by JDK), capture lambdas (mock the SAM interface instead).

**`@InjectMocks` gotchas:**
- Constructor injection preferred — works most reliably
- Field injection by reflection — fragile if the class has multiple constructors
- Doesn't inject `@Spy`-annotated fields automatically; verify via `verifyNoMoreInteractions` if testing strictly

**PowerMock** historically handled what Mockito couldn't — but it's largely obsolete with mockito-inline. Avoid PowerMock for new code; it slows tests massively and breaks with new Java versions.

**Mockito limitations are often a design smell.** If you need to mock a final class, ask: should that class have an interface? If you need to mock a static method, ask: should it be an injectable service? Resist mocking everything; reach for fakes for cleaner tests.

### Q211. JaCoCo coverage and quality gates — how do you set them up?

**JaCoCo** (Java Code Coverage) — bytecode-instrumented coverage tool. Default in Spring Boot, Gradle, and Maven projects.

**Maven setup:**
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
        <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

`mvn test` produces `target/site/jacoco/index.html` — drill-down HTML report with line/branch/method coverage.

**Quality gate integration:**
- **Sonar** consumes JaCoCo reports for trend tracking
- **Codecov / Coveralls** show coverage diff per PR
- **CI failure** if coverage drops below threshold (the `check` execution above)

**Coverage isn't quality.** A 100% covered codebase with weak assertions is worse than 70% with strong tests. Use coverage as a *floor* (catch huge drops) not a target.

**Branch coverage** is more valuable than line coverage for `if`/`switch`-heavy code. Configure JaCoCo to require branch coverage too.

**Mutation testing (PIT)** complements coverage by measuring whether tests would catch mutations — far more meaningful than coverage alone.

### Q245. `MockitoExtension` vs `SpringExtension` — when each?

Both are JUnit 5 extensions (`@ExtendWith(...)` or via the `*Test` slice annotations).

**`MockitoExtension`** — wires up Mockito, no Spring context.
- Initialises `@Mock`, `@Spy`, `@Captor` annotated fields
- Enables strict stubbing (warns about unused stubs)
- Validates framework usage (catches misuse like missing `Mockito.verify` calls)
- **Fast** — no Spring context, no application boot
- Use for **pure unit tests** of services / domain classes

```java
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {
    @Mock BookingRepository repo;
    @InjectMocks BookingService service;

    @Test
    void rejects_when_no_table() {
        when(repo.findAvailable(any())).thenReturn(List.of());
        assertThrows(NoTableException.class, () -> service.book(...));
    }
}
```

**`SpringExtension`** — boots a Spring `TestContext`. Brings real bean wiring, profiles, properties.
- Used **indirectly** via `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`, etc.
- Slower — application context startup typically 2-5s, cached across tests in the same suite
- Use for integration tests where you genuinely need Spring

```java
@SpringBootTest
class BookingApiIntegrationTest {
    @Autowired BookingService service;       // real bean
    @MockBean PaymentClient payments;        // replaced in context
}
```

**Combine when needed:**
```java
@ExtendWith({SpringExtension.class, MockitoExtension.class})
```

**Rule of thumb:**
- Plain class with constructor-injectable deps → `MockitoExtension`
- Spring features (validation, AOP, transactions, autowiring) being tested → `SpringExtension` via a slice
- Avoid `@SpringBootTest` for unit tests — it's expensive and dirties the cached context if you use `@MockBean`

---

## System Design & Best Practices

### Summary

**What this topic covers**

The "design a system on a whiteboard" tier of the interview, plus the standing best practices that apply to any service you build. Three concern areas: (1) **API design** — REST principles, HTTP method semantics, status codes, versioning, pagination, idempotency, HATEOAS (rarely earned); (2) **distributed concerns** — distributed transactions (Saga, 2PC), caching layers (in-process, distributed, write-through vs write-behind), idempotency for payments and other side-effecting calls, cache invalidation across JVMs, zero-data-loss requirements; and (3) **operational discipline** — logging, monitoring, configuration management, code review process, technical debt management, scaling to 10× traffic. The 13 questions are the open-ended ones interviewers reach for after the fundamentals to see how you think under ambiguity.

**Mental model**

System design at this level is *constrained design* — picking the smallest set of moving parts that satisfies the requirements you can elicit, plus the next 6-12 months of growth. The senior signal isn't knowing every distributed-systems pattern; it's asking the *right clarifying questions first*. What's the read:write ratio? What's the latency budget? What's the consistency requirement — eventual is fine, or strong only? What happens if a request is duplicated? What's the failure mode the business cares about most — wrong data or no data? Then design from constraints to architecture rather than reaching for microservices, Kafka, Redis, and Kubernetes reflexively. For payments and money flows the answer is **idempotency keys + outbox pattern + at-least-once with deduplication** — exactly-once is a marketing word; reality is at-least-once-plus-idempotent-consumer. For caching across JVMs the answer is *don't try to keep in-process caches consistent* — use a distributed cache (Redis) or accept eventual consistency with a TTL. For scaling, find the bottleneck before adding infrastructure: 90% of 10×-traffic answers start with "horizontal scaling and connection pool sizing", not "rewrite in Go".

**Key terms**

- **REST** — Resource-oriented, stateless, cacheable, uniform interface; URIs name resources, methods act on them.
- **HTTP methods** — GET (safe, idempotent), POST (not idempotent), PUT (idempotent), DELETE (idempotent), PATCH.
- **Status codes** — 2xx success, 3xx redirect, 4xx client error, 5xx server error; 422 vs 400 vs 409 are the senior distinctions.
- **API versioning** — URI (`/v1/...`), header (`Accept: application/vnd.foo.v1+json`), query param. URI is simplest and most common.
- **Idempotency key** — client-supplied unique key the server uses to deduplicate retries.
- **Outbox pattern** — write events to a DB table in the same transaction as state; relay to broker asynchronously.
- **Saga** — long-running distributed transaction as a series of compensatable local transactions.
- **2PC (two-phase commit)** — prepare + commit; blocks resources, doesn't survive coordinator failure cleanly. Avoid in microservices.
- **Cache invalidation strategies** — TTL, write-through, write-behind, explicit invalidation on update, event-driven.
- **CAP theorem** — pick two of consistency, availability, partition-tolerance; in practice partition-tolerance is non-negotiable, so it's CP or AP.
- **Horizontal vs vertical scaling** — more instances vs bigger instances; horizontal preferred for resilience.
- **SLO / SLI / SLA** — measurable indicators, objectives you target, contracts you sign.
- **Twelve-factor app** — config in env, stateless processes, disposability, dev/prod parity, etc.

**Why interviewers ask this**

Three signals. (1) **Do you ask first?** — the candidate who launches into a microservices + Kafka + Redis architecture without asking the latency budget is failing the senior bar. The candidate who asks "what's the read:write ratio?" before drawing a box is passing it. (2) **Idempotency reasoning** — the "stop a payment from being processed twice" question is a litmus test. The full answer involves a client-supplied idempotency key, a uniqueness constraint on the DB, a deduplication window, and reasoning about what to do on conflict. Junior candidates say "check if it exists first" (the classic check-then-act race). (3) **Operational pragmatism** — when asked how to handle 10× traffic, the senior answer is profile, find the bottleneck, scale the bottleneck. The junior answer is "rewrite in Rust". Operational maturity is the most undervalued senior signal.

**Common confusions**

- "Exactly-once delivery exists" — it doesn't on a network; you can get exactly-once *processing* via idempotent consumers + at-least-once delivery.
- "REST means JSON over HTTP with `/api/...` URLs" — that's REST-ish. Actual REST is constraints (stateless, cacheable, uniform interface); HATEOAS is the part everyone skips.
- "Cache invalidation is solved by TTL" — TTL bounds staleness but doesn't help correctness; for write-heavy data you need invalidation events.
- "Microservices fix coupling" — they distribute coupling and add latency, partial failure modes, and observability complexity. Use only when you've earned it.
- "2PC is the way to do distributed transactions" — it isn't in 2026; Saga + outbox is the practical answer.
- "Idempotency means safe to retry" — only if the *server* is idempotent for that operation. GET is naturally idempotent; POST needs an idempotency key.

**What follows from this topic**

System design is the cross-cutting topic — it pulls on JPA (transactions), Messaging (exactly-once, outbox), Resilience (retries, timeouts, circuit breakers), Security (auth at the edge), Cloud-Native (12-factor, probes). The senior signal in this topic is *restraint*: choose the simplest architecture that satisfies the constraints, and reach for distributed-systems complexity only when forced. If a candidate over-architects everything, they'll over-architect the actual job.

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

### Q303. Two JVM instances each cache the same value. App1 updates it. How does App2 see the change?

In-process caches aren't a source of truth across instances. Promote a single source — DB or a distributed cache — and invalidate everywhere on change. Common patterns: shared Redis with TTL + write-through; a Kafka/SNS event on update with each instance subscribing to evict its local copy (cache-aside); or no local cache at all (Redis-only reads). For strong consistency read from the DB; for eventual consistency the event-bus pattern scales best. Single-JVM thinking — "I'll just put it in a `ConcurrentHashMap`" — breaks the moment you scale horizontally.

### Q304. How do you handle 10× traffic in production?

Scale in layers: (1) horizontal — more replicas behind a load balancer, stateless instances; (2) application — tune thread pools and DB connection pools, cache hot reads, rate-limit abusive clients, circuit-break slow dependencies; (3) data — read replicas for read-heavy load, partitioning/sharding for write-heavy; (4) edge — CDN for static assets, response caching at the gateway. Auto-scaling handles the spike; capacity planning + load tests prevent the cliff. The signal is layered thinking, not naming one trick.

### Q305. How do you stop a payment from being processed twice?

Idempotency key: the client generates a unique transaction ID per logical attempt and sends it as a header. The server stores `(key, status, response)` with a unique constraint on `key`, so the second insert fails; the handler returns the original response. For coordination during the in-flight window use a Redis lock keyed on the idempotency key with a short TTL. Combine with at-most-once side-effects: write the ledger entry inside the same DB transaction as the idempotency record. Stripe, PSP gateways, and every serious payments system work this way.

### Q306. How do you achieve zero data loss?

Strict zero is impossible — what you target is RPO≈0 within a fault domain. Mechanisms: synchronous DB replication (or quorum writes), Kafka with `acks=all`, `min.insync.replicas≥2`, replication factor ≥3, transactional producers, durable WAL flushed before ack, and graceful shutdown that drains in-flight work. Cross-region requires synchronous cross-region replication (latency cost) or accepting some RPO. In finance you trade throughput for durability — `acks=all` is mandatory, not "if performance allows". Honest answer: list the trade-offs, pick the SLO, design to it.

---

---

## Security

### Summary

**What this topic covers**

The application-security baseline every backend engineer is expected to clear, plus the protocol-level cryptography you should be able to sketch. Three concern areas: (1) **the threat catalogue** — OWASP Top 10 (injection, broken access control, cryptographic failures, SSRF, etc.), SQL injection prevention, XSS, CSRF; (2) **identity** — authentication vs authorization, JWT vs session cookies, OAuth2 flows (authorization code with PKCE, client credentials, device code, refresh tokens), password storage (Argon2, bcrypt, PBKDF2 — never SHA-256 alone, never MD5); and (3) **transport and secrets** — TLS at a high level (handshake, certificate validation, mutual TLS), secrets handling in Spring Boot (Vault, Kubernetes secrets, externalised config). The 10 questions are about whether you have the security reflexes that prevent the most common breaches.

**Mental model**

Security at the application layer is not "do we have HTTPS" — it's a *layered defence in depth*. The mental model has three tiers. (1) **Don't write the bug** — parameterised queries, not string concatenation; output encoding, not raw HTML interpolation; bound types, not stringly-typed IDs across trust boundaries. Most of the OWASP Top 10 reduces to this. (2) **Authenticate then authorize** — authentication answers "who are you", authorization answers "what can you do". Conflating them is the source of broken access control. JWT solves stateless authentication but introduces revocation problems (no server-side session to invalidate); session cookies solve revocation but require a session store. The 2026 default for web apps is *still session cookies* with same-site flags; JWT is for service-to-service and mobile-to-API. (3) **Defence in depth** — assume each layer fails. WAF + input validation + parameterised queries + least-privilege DB user + TLS + audit logging + monitoring + intrusion detection. The OWASP framing is useful because it forces you to think across all of these.

**Key terms**

- **OWASP Top 10** — the canonical web-app vulnerability list; 2021 update emphasises insecure design and SSRF.
- **SQL injection** — fixed by *parameterised queries / prepared statements*; never string-concatenate user input into SQL.
- **XSS (Cross-Site Scripting)** — injection of attacker-controlled script into the response; fix with output encoding (`<` → `&lt;`), CSP headers.
- **CSRF (Cross-Site Request Forgery)** — tricking a logged-in user's browser into making a request; fix with CSRF tokens, SameSite cookies.
- **SSRF (Server-Side Request Forgery)** — server fetches an attacker-controlled URL; fix with allowlist, block private IP ranges.
- **Authentication** — proving identity (password, JWT, certificate).
- **Authorization** — checking permission (RBAC, ABAC, policy-as-code).
- **JWT** — JSON Web Token; signed (and optionally encrypted) claims; stateless; hard to revoke before expiry.
- **OAuth2 flows** — Authorization Code (with PKCE for public clients), Client Credentials (service-to-service), Device Code (TVs), Refresh Token.
- **Password hashing** — Argon2id (current best), bcrypt (still fine), PBKDF2 (acceptable). With salt. Never plain hash.
- **TLS handshake** — ClientHello → ServerHello + cert → key exchange → finished; TLS 1.3 collapses to one round trip.
- **mTLS (mutual TLS)** — both sides present certificates; common for service-to-service in zero-trust networks.
- **Secrets management** — Vault, Kubernetes Secrets, AWS Secrets Manager / Parameter Store; never in source control.

**Why interviewers ask this**

Three signals. (1) **Do you have the reflexes?** — when asked "how do you prevent SQL injection?", the senior answer is "parameterised queries everywhere; ORM defaults handle it; validate inputs as well but that's belt-and-braces". The junior answer is "escape special characters" (the historic, wrong, approach). (2) **JWT vs session cookies** — this question filters out candidates who repeat "JWT is stateless and scales better" without understanding the revocation cost. Senior candidates discuss when each fits and the hybrid (JWT access token + opaque refresh token in HttpOnly cookie). (3) **OWASP literacy** — naming SQL injection and XSS is junior; naming broken access control, insecure deserialization, SSRF, and security misconfiguration is senior. The candidate who has actually had a pentest finding talks differently from the candidate who has only read about them.

**Common confusions**

- "HTTPS makes my app secure" — TLS protects data in transit; it does nothing for input validation, authorization, or storage security.
- "Hashing passwords with SHA-256 is fine" — it isn't; SHA-256 is fast, so it's vulnerable to brute force. Use Argon2id, bcrypt, or PBKDF2 with a high work factor.
- "JWTs are encrypted" — they aren't by default; JWS (signed) is the common case, JWE (encrypted) is rare. Anyone can decode a JWT's payload.
- "Stateless JWTs are universally better than sessions" — they're harder to revoke and force you to choose between long expiry (revocation risk) and short expiry (refresh complexity).
- "Disabling CSRF is fine for REST APIs" — only if you're not using cookie-based auth. If your API auths via session cookies, you still need CSRF protection.
- "I'll add security later" — security retrofitted is more expensive than security designed in; threat-modelling the design is cheap.

**What follows from this topic**

Security cross-cuts every layer. Spring Security (Spring topic) implements much of this. Database (parameterised queries, least-privilege user) implements injection prevention. Messaging (Kafka topic) needs mTLS and ACLs. Cloud-Native (12-factor secrets) inherits the secrets-management story. The candidate who can articulate the OWASP framing fluently has typically also done threat modelling on at least one production system.

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

## Messaging (Kafka)

### Summary

**What this topic covers**

Kafka as the dominant Java-ecosystem message log, and the patterns built around it for reliable async processing. Three concern areas: (1) **core concepts** — topics, partitions, offsets, brokers, replicas, ISR (in-sync replicas), producer acks, consumer groups, rebalancing; (2) **delivery semantics** — at-most-once, at-least-once, exactly-once (and what exactly-once actually means in Kafka), idempotent producers, transactional producers, consumer offset management (auto-commit vs manual commit vs commit-after-processing); and (3) **operational patterns** — dead-letter queues for failed messages, retries with backoff, deduplication for idempotent consumers, Kafka vs RabbitMQ vs SQS tradeoffs, partition key choice for ordering, and the financial-system "must not lose a message" pattern. The 9 questions are about whether you've actually run Kafka in production or just seen the slides.

**Mental model**

Kafka is a *distributed, partitioned, replicated, append-only log*. Each topic is split into **partitions**; each partition is an ordered, immutable sequence of messages identified by **offset**. Producers append to partitions; consumers read at their own pace, tracking their position via committed offsets. The unit of parallelism is the partition: within a partition, ordering is preserved; across partitions, it isn't. A **consumer group** distributes partitions across its members — one partition per consumer at most, so adding more consumers than partitions wastes them. This shapes everything: pick your **partition key** for the *ordering guarantee you need*. Order by `customerId`? Hash by customer ID. Need global ordering? You need a single partition (and lose horizontal scaling for that topic). **Delivery semantics** are configurable: `acks=0` (fire-and-forget, fastest, loses on broker failure), `acks=1` (leader ack, may lose on leader failure), `acks=all` (full ISR ack, durable). Kafka transactions plus idempotent producers give *transactional exactly-once* across producer→broker→consumer, but only within Kafka's boundaries — sending to Kafka *and* writing to your DB atomically requires the **outbox pattern**. Two phrases that should be in every senior answer: "**at-least-once + idempotent consumer**" and "**outbox pattern**".

**Key terms**

- **Topic** — a named stream; logically grouped messages.
- **Partition** — the unit of parallelism and ordering within a topic.
- **Offset** — per-partition position; consumers track their own.
- **Broker** — a Kafka server; cluster has multiple brokers.
- **Replication factor** — number of broker copies per partition; 3 is typical.
- **ISR (In-Sync Replicas)** — replicas caught up to the leader; `acks=all` waits for these.
- **Consumer group** — a set of consumers sharing the load on a topic; each partition goes to one consumer in the group.
- **Rebalancing** — when group membership changes, partitions are reassigned; pauses processing briefly.
- **Producer acks** — 0, 1, all (-1); the durability dial.
- **Idempotent producer** — `enable.idempotence=true`; deduplicates retries within a producer session.
- **Transactional producer** — `transactional.id`; enables atomic writes across multiple partitions and exactly-once with consumers in the same transaction.
- **Consumer offset commit** — auto (every N ms, risk of duplicates or losses on crash), manual sync (slow but precise), manual async (fast, eventual consistency).
- **DLQ (Dead Letter Queue)** — topic for messages that failed processing after retries.
- **Outbox pattern** — write events to a DB table in the same transaction; relay process publishes to Kafka.

**Why interviewers ask this**

Three signals. (1) **Do you understand the delivery-semantics tradeoff?** — exactly-once is the universal interview trap. The wrong answer is "Kafka supports exactly-once, enable it". The right answer is "exactly-once requires idempotent producers + transactional writes + transactional consumer offsets — and it only holds inside Kafka, not across a DB write, where you need the outbox pattern". (2) **Partition-key reasoning** — every Kafka system gets the partition key wrong at least once. The senior signal is articulating why you chose `customerId` over `orderId` (preserve ordering per customer) and what happens when one customer's traffic spikes (hot partition). (3) **Failure handling** — "a consumer throws on message #500; what do you do?" The mature answer talks about retry with backoff, a DLQ for poisonous messages, and *what business outcome* should occur (block the partition for ordering-critical events, skip and continue for fire-and-forget events). The junior answer is "retry forever".

**Common confusions**

- "Kafka guarantees exactly-once delivery" — it guarantees exactly-once *processing within Kafka boundaries* if configured correctly. Crossing into a DB requires outbox.
- "More partitions = better throughput" — only up to broker capacity; partitions cost open file handles, memory, and rebalance time.
- "Kafka and RabbitMQ are interchangeable" — Kafka is a *log* (retain, replay, multiple independent consumers); RabbitMQ is a *queue* (delete on consume, low-latency, complex routing). Different shapes.
- "`acks=1` is fine" — it loses messages on leader failover. Use `acks=all` for anything important.
- "Auto-commit is fine" — auto-commit fires on a timer regardless of whether processing succeeded; for at-least-once you must commit *after* successful processing.
- "Consumer groups give you load balancing" — they do, *up to the partition count*. More consumers than partitions sit idle.

**What follows from this topic**

Messaging connects directly to Database (outbox pattern uses the DB transaction), System Design (idempotency keys), and Resilience (retries, DLQs, backpressure). The "exactly-once" line is the single most common Kafka interview gotcha; a candidate who articulates *what's guaranteed and where* in one breath has done the work. If Kafka is in the JD, expect at least one question about it.

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

### Q301. In Kafka, how do you guarantee a message is processed by exactly one consumer instance?

Use a consumer group: all instances share the same `group.id`. Kafka assigns each partition to exactly one consumer in the group at a time, so two instances never read the same partition concurrently. If you also need strict global ordering, the topic must have a single partition (which caps throughput). Caveat: "one delivery" ≠ "exactly-once processing" — rebalances can replay uncommitted offsets, so the handler must be idempotent, or use the transactional producer + `isolation.level=read_committed` for end-to-end exactly-once.

### Q302. How do you handle Kafka consumption failures in a financial system?

Disable auto-commit; commit offsets only after the handler succeeds. Retry transient errors with backoff; on poison messages send to a dead-letter topic preserving the original key + headers so they can be replayed after a fix. Keep handlers idempotent — rebalances and retries cause redelivery. For strict guarantees use Kafka transactions (`isolation.level=read_committed`, transactional producer) so the offset commit and any downstream write are atomic. Never "commit then process" — you'll lose messages on a crash between the two.

---

## Common Pitfalls & Spot-the-Bug

### Summary

**What this topic covers**

The recurring bugs every senior Java engineer has seen, fixed, and now spots in a code review without reading the comment first. Two concern areas: (1) **language-level traps** — `BigDecimal` for money (and why `double` loses cents), `SimpleDateFormat` not being thread-safe, `String.getBytes()` without a charset depending on platform default, autoboxing performance pitfalls, string concatenation in loops creating O(n²) garbage; and (2) **concurrency and pattern bugs** — non-atomic counters, broken double-checked locking, `ConcurrentModificationException` from iteration-with-mutation, `Integer` caching surprises around the -128..127 boundary, `HashMap` with mutable keys, swallowed exceptions, `Optional` misuse, `BigDecimal` equality via `equals` vs `compareTo`, `synchronized` on a `Boolean` (locking the same boxed `Boolean.TRUE` everywhere). The 16 questions are the *interview pattern recognition* category — when you spot the bug in three seconds it signals years of production debugging.

**Mental model**

This topic is less about new concepts and more about *production-scarred instincts*. Every bug here has crashed someone's service at 3am at some point. The common thread is that they all look fine in code review until you know what to look for. Three meta-patterns: (1) **defaults are dangerous** — platform default charset, default locale, default time zone, default scale on `BigDecimal` arithmetic, default cascade on JPA relations. Anywhere Java picks a default for you, that default will eventually be wrong in some environment. (2) **mutability + sharing = bugs** — `HashMap` with a mutable key, `SimpleDateFormat` shared across threads, mutable static state. The fix is almost always immutability or thread-confinement. (3) **boxing has costs** — `Integer` equality (`==` vs `equals`), `Long` autoboxing in a tight loop allocating millions of boxed objects, `synchronized` on a `Boolean` accidentally creating a shared lock across unrelated code paths. Senior engineers internalise that *primitives and boxed types have different identity semantics*, and the bugs from confusing them are subtle. The spot-the-bug questions are an interview shortcut: a candidate who immediately points at `double money = 0.1 + 0.2` and says "not 0.3" without further prompting has seen the dragon.

**Key terms**

- **`BigDecimal` for money** — exact decimal arithmetic; never use `double`/`float` for currency.
- **`BigDecimal.equals` vs `compareTo`** — `equals` requires same scale; `2.0` ≠ `2.00`. Use `compareTo(other) == 0` for value equality.
- **`SimpleDateFormat` is not thread-safe** — keeps state in a `Calendar` field; use `DateTimeFormatter` (immutable) instead.
- **`String.getBytes()`** — uses platform default charset; **always pass `StandardCharsets.UTF_8`**.
- **String concatenation in a loop** — creates an intermediate `String` each iteration; use `StringBuilder`.
- **Autoboxing in tight loops** — `Long sum = 0L; for (long x : xs) sum += x;` boxes per iteration; declare `long sum`.
- **Integer cache** — `Integer.valueOf(127) == Integer.valueOf(127)` true; `Integer.valueOf(128) == Integer.valueOf(128)` false. Use `.equals()`.
- **`HashMap` with mutable key** — mutating after `put` corrupts the bucket lookup; you can never retrieve it again.
- **Concurrent modification** — iterating a `HashMap` or `ArrayList` while another thread (or the same iteration) mutates it.
- **Double-checked locking without `volatile`** — JMM allows reordering; the half-constructed object can be visible.
- **`synchronized` on `Boolean`** — `Boolean.TRUE` is shared across the JVM; you accidentally serialise *everything*.
- **`Optional.get()` without `isPresent()` check** — throws `NoSuchElementException`; defeats the point of `Optional`.
- **Exception swallowing** — `catch (Exception e) { /* nothing */ }`; the production lights go out and no one knows why.
- **`try-with-resources` chained** — `new ZipOutputStream(new FileOutputStream(...))` — if the outer constructor throws, the inner isn't closed; declare both in the resource clause.

**Why interviewers ask this**

Three signals. (1) **Have you been on call?** — these bugs are the production stories. A candidate who says "yes, I once had a production incident where `SimpleDateFormat` shared across threads corrupted parsed dates" has the scars; a candidate who recites the rule from a blog post doesn't. (2) **Code-review instincts** — spot-the-bug questions test the *speed* of recognition. Senior engineers see `synchronized(this.isReady)` and immediately think "you're locking on a `Boolean` autobox — every place in the codebase that locks on `Boolean.TRUE` is now serialised with this". (3) **Defensive habits** — does the candidate reach for `UTF_8.name()` explicitly, `BigDecimal.compareTo` for equality, `DateTimeFormatter` over `SimpleDateFormat`, `StringBuilder` in loops, immutable keys? These are the small habits that prevent the bug class entirely.

**Common confusions**

- "`BigDecimal(0.1)` is precise" — no; the constructor takes a `double` that's already imprecise. Use `new BigDecimal("0.1")` (String constructor).
- "`Integer` caching is only an optimisation, can be ignored" — until your `==` accidentally works in dev (small numbers) and fails in prod (large IDs).
- "Double-checked locking works in modern Java" — it works *with `volatile`* (since Java 5). Without `volatile` it's still broken.
- "`Optional` solves null safety" — only if you don't `.get()` it without checking. And don't pass `Optional` parameters. And don't store `Optional` fields. And don't put `Optional` in a `Map`.
- "`String.intern()` saves memory" — sometimes, but the pool sits in heap and degrades GC. JIT and G1 string dedup handle most cases.
- "Catching `Exception` is fine if I rethrow" — fine *if* you rethrow with the cause. `catch (Exception e) { throw new RuntimeException(e.getMessage()); }` destroys the stack trace.

**What follows from this topic**

Common Pitfalls is the litmus test: a candidate who spots all the bugs has years of production muscle. The bug catalogue connects to Core Java (Integer caching, autoboxing), Concurrency (double-checked locking, `synchronized` on boxed Booleans), Modern Java (`Optional` misuse), and Database (BigDecimal scale in entity columns). Senior engineers spot these patterns at code-review time, before they ship.

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

### Q282. Spot the bug — concurrent counter.

```java
public class Counter {
    private int count = 0;
    public synchronized int increment() { return ++count; }
    public int get() { return count; }
}
```

**Bug:** `get()` is not synchronised — readers can see stale values from CPU caches. The `++count` write is published only on `synchronized` exit; `get()` may read from a different thread's cache.

**Fix:** synchronise `get()`, or make `count` volatile, or use `AtomicInteger`.

### Q283. Spot the bug — double-checked locking.

```java
public class Singleton {
    private static Singleton instance;
    public static Singleton get() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) instance = new Singleton();
            }
        }
        return instance;
    }
}
```

**Bug:** `instance` not declared `volatile`. JVM may reorder constructor execution (assign reference before fields are fully initialised). Other threads doing the no-lock first check see a non-null reference but may read a partially-constructed object.

**Fix:** `private static volatile Singleton instance;` — or use the holder idiom.

### Q284. Spot the bug — `ConcurrentModificationException`.

```java
List<String> list = new ArrayList<>(List.of("a", "b", "c"));
for (String s : list) {
    if (s.equals("b")) list.remove(s);
}
```

**Bug:** for-each uses an `Iterator`; modifying the list during iteration throws `ConcurrentModificationException` even single-threaded.

**Fix:**
```java
list.removeIf("b"::equals);                          // best
// or
Iterator<String> it = list.iterator();
while (it.hasNext()) if ("b".equals(it.next())) it.remove();
```

### Q285. Spot the bug — `Integer` comparison.

```java
Integer a = 200;
Integer b = 200;
if (a == b) System.out.println("equal");
```

**Bug:** `==` compares references. `Integer` cache covers `-128..127`. Outside that range, `valueOf` returns new objects, so `a == b` is false even when values match.

**Fix:** `if (a.equals(b))` — or use `int` if values are guaranteed primitive.

### Q286. Spot the bug — `HashMap` with mutable key.

```java
class Point {
    int x, y;
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public boolean equals(Object o) { /* by x,y */ }
}

Map<Point, String> map = new HashMap<>();
Point p = new Point(1, 2);
map.put(p, "hello");
p.x = 10;
map.get(p);   // null — entry "lost"
```

**Bug:** mutating a key after insertion changes its hash code. The entry is in a bucket determined by the OLD hash; lookups use the NEW hash → wrong bucket → not found.

**Fix:** make keys immutable. Records solve this — fields are final.

### Q287. Spot the bug — `try-with-resources` chained.

```java
try (Connection c = ds.getConnection()) {
    PreparedStatement s = c.prepareStatement("SELECT 1");
    ResultSet r = s.executeQuery();
    while (r.next()) { ... }
}
```

**Bug:** `PreparedStatement` and `ResultSet` are NOT in the try-with-resources. They never close. Connection pool may eventually leak handles even though the connection itself returns to the pool.

**Fix:**
```java
try (Connection c = ds.getConnection();
     PreparedStatement s = c.prepareStatement("SELECT 1");
     ResultSet r = s.executeQuery()) {
    while (r.next()) { ... }
}
```

### Q288. Spot the bug — exception swallowing.

```java
try {
    doWork();
} catch (Exception e) {
    log.error("Failed");
}
```

**Bug:** exception's stack trace and message lost — only "Failed" logged. Debugging nightmare.

**Fix:** `log.error("Failed", e);` — pass the exception so the framework logs the stack trace.

### Q289. Spot the bug — `Optional` usage.

```java
public Optional<User> findUser(String email) {
    User u = repo.findByEmail(email);
    return Optional.of(u);
}
```

**Bug:** `Optional.of(null)` throws `NullPointerException`. If `repo.findByEmail` can return null, this fails.

**Fix:** `return Optional.ofNullable(u);`

### Q290. Spot the bug — `BigDecimal` equality.

```java
BigDecimal a = new BigDecimal("1.0");
BigDecimal b = new BigDecimal("1.00");
if (a.equals(b)) System.out.println("equal");
```

**Bug:** `BigDecimal.equals` requires same scale. `1.0` and `1.00` have different scales — `equals` returns false even though numerically equal.

**Fix:** `a.compareTo(b) == 0` for value equality; `a.equals(b)` only for scale-strict equality.

### Q291. Spot the bug — `synchronized` on `Boolean`.

```java
class Cache {
    private Boolean ready = false;
    public synchronized void init() { ... }
    public void use() {
        synchronized (ready) { /* critical section */ }
    }
}
```

**Bug:** `synchronized (ready)` locks on the cached `Boolean.FALSE` (or `Boolean.TRUE`) instance, which is shared across the entire JVM. Different `Cache` instances all lock the same monitor. Massive contention; not what you want.

**Fix:** lock on a private final `Object` field:
```java
private final Object lock = new Object();
synchronized (lock) { ... }
```

---

## Build Tools

### Summary

**What this topic covers**

Maven and Gradle — the two build tools that compile, package, test, and ship every Java project. Three concern areas: (1) **Maven mechanics** — the build lifecycle phases (validate, compile, test, package, verify, install, deploy), dependency scopes (compile, provided, runtime, test, system, import), how Maven resolves dependency conflicts (nearest-wins, with override via `<dependencyManagement>`), BOM imports, multi-module projects with parent POMs; (2) **Gradle and the comparison** — Groovy/Kotlin DSL, task graph vs phase model, incremental builds, build cache, when each tool wins; and (3) **modern supply-chain concerns** — SBOM (Software Bill of Materials) generation with CycloneDX or SPDX, reproducible builds (deterministic outputs from identical inputs), dependency vulnerability scanning. The 8 questions are about whether you understand what's actually happening when you type `mvn clean install`.

**Mental model**

Maven and Gradle are both *dependency-resolving build orchestrators* — they fetch your transitive dependency graph, compile your code against it, run your tests, package the result, and (in a CI pipeline) publish artifacts to a repository. The mental models differ. **Maven** is *declarative + convention-over-configuration*: you tell it *what* (POM declares dependencies, packaging, plugins), it knows *how* via the standard lifecycle. Phases run in fixed order, each phase binds standard goals. The strength is uniformity — any Maven project looks the same. The weakness is rigidity — anything off the convention path is painful. **Gradle** is *imperative + task graph*: you build a graph of tasks with explicit dependencies, Gradle figures out execution order and runs in parallel where possible. Strengths: incremental builds, build cache (local + remote), Kotlin DSL with IDE autocomplete, fast on large multi-module projects. Weaknesses: less standardised, Groovy DSL is dynamic and error-prone, easy to write build logic that's hard to maintain. The 2026 reality: **Gradle wins on large multi-module Android/Kotlin projects; Maven still dominates Spring shops and most JVM library publishing because of its uniformity and tooling integration**. The dependency-management story is the same idea in both: BOMs (Bills of Materials) declare versions, downstream projects import the BOM and omit versions. The new supply-chain concerns (SBOM, reproducible builds, vulnerability scanning) layer on top and are increasingly mandatory in regulated industries.

**Key terms**

- **Maven lifecycle** — `validate` → `compile` → `test` → `package` → `verify` → `install` → `deploy`. Each phase binds standard plugin goals.
- **Maven dependency scopes** — `compile` (default, everywhere), `provided` (compile but not runtime, e.g. servlet API), `runtime` (not compile, e.g. JDBC driver), `test` (test only), `system` (local jar path, deprecated), `import` (BOM only).
- **Nearest-wins conflict resolution** — Maven picks the version closest to the root of the dependency tree.
- **`<dependencyManagement>`** — declares versions centrally; child dependencies pick them up without specifying versions.
- **BOM (Bill of Materials)** — POM with only `<dependencyManagement>`; imported with scope `import`.
- **Multi-module project** — parent POM with `<modules>`; children inherit configuration and have a single build command.
- **Gradle task** — a unit of work with inputs and outputs; the build is a DAG of tasks.
- **Gradle Kotlin DSL** — `build.gradle.kts`; statically typed, IDE-friendly.
- **Build cache** — Gradle (and Maven extensions like `maven-build-cache`) cache task outputs across builds and machines.
- **SBOM** — machine-readable list of every dependency, version, and license in your artifact; CycloneDX or SPDX format.
- **Reproducible build** — building the same source twice produces byte-identical artifacts; requires stable timestamps, sorted entries, deterministic dependency versions.
- **Maven Shade plugin / Gradle Shadow plugin** — produce a "fat jar" with all dependencies repackaged.

**Why interviewers ask this**

Three signals. (1) **Operational fluency** — every Java engineer has run `mvn clean install` a thousand times; few can explain what each phase does or why `clean install` is heavier than `install`. The candidate who knows the lifecycle has read the docs once. (2) **Dependency hygiene** — "how does Maven resolve when two transitive deps want different log4j versions?" The senior answer talks about nearest-wins, the dependency tree (`mvn dependency:tree`), `<dependencyManagement>` to force a version, and using BOMs (Spring Boot dependencies, Jackson BOM) to keep families aligned. (3) **Modern supply chain** — SBOM, vulnerability scanning (OWASP dependency-check, Snyk, Dependabot), and reproducible builds are increasingly compliance requirements. A candidate who has implemented these has felt the regulator/security-team pressure.

**Common confusions**

- "Maven and Gradle do the same thing" — same broad goal, very different mental models. You don't write a Gradle build like a Maven POM.
- "`mvn clean` is mandatory" — it deletes `target/`; useful when you suspect stale state, wasteful otherwise. Incremental Maven builds work fine without it.
- "`<dependency>` and `<dependencyManagement>` are the same" — `<dependencies>` declares a dependency; `<dependencyManagement>` declares the version *if used*. The latter doesn't force inclusion.
- "Fat jars are best practice" — they're often necessary (Spring Boot, AWS Lambda) but layered Docker images and `jlink` runtimes can be better.
- "Reproducible builds are a nice-to-have" — increasingly a compliance requirement (SLSA, supply-chain attacks); table stakes in regulated industries.
- "Maven is dead" — it isn't; Spring publishes BOMs in Maven format, most JVM libraries publish to Maven Central, and most enterprise Java still uses Maven.

**What follows from this topic**

Build tools cross-cut every later operational topic. Multi-module projects support Design Patterns (hexagonal architecture maps cleanly onto modules). BOMs avoid the dependency-hell side of Spring (Spring Boot Dependencies BOM is the canonical case). Reproducible builds and SBOMs feed Cloud-Native (Docker layers, supply-chain attestation) and Security (vulnerability scanning). A candidate who hand-waves through Maven phases usually hand-waves through CI/CD too.

### Q212. Maven lifecycle phases — what runs in what order?

Maven has three built-in lifecycles: **default**, **clean**, **site**. The default lifecycle has 23 phases, but you'll mostly care about these:

```
validate → compile → test → package → verify → install → deploy
```

- **`validate`** — project structure correct, all info available
- **`compile`** — `src/main/java` → `target/classes`
- **`test-compile`** — `src/test/java` → `target/test-classes`
- **`test`** — runs unit tests via Surefire
- **`package`** — creates the JAR/WAR in `target/`
- **`verify`** — runs integration tests via Failsafe; quality gates run here (JaCoCo check, Spotless check, dependency-check)
- **`install`** — installs to local `~/.m2/repository`
- **`deploy`** — uploads to remote artifact repo (Nexus, Artifactory)

Running a phase runs **all preceding phases**. `mvn package` runs validate→compile→test→package.

**Surefire vs Failsafe:**
- Surefire — `*Test.java`, runs in `test` phase
- Failsafe — `*IT.java`, runs in `verify` phase. Failsafe doesn't fail the build immediately on test failure; it lets `post-integration-test` (e.g. teardown of containers) run first

**`clean` lifecycle:** `pre-clean` → `clean` (deletes `target/`) → `post-clean`.

### Q213. Maven dependency scopes — when to use each.

Six scopes determine when a dependency is on the classpath:

| Scope | Compile | Test | Runtime | Packaged in JAR |
|---|---|---|---|---|
| `compile` (default) | ✓ | ✓ | ✓ | ✓ |
| `provided` | ✓ | ✓ | ✗ (provided by container) | ✗ |
| `runtime` | ✗ | ✓ | ✓ | ✓ |
| `test` | ✗ | ✓ | ✗ | ✗ |
| `system` | ✓ | ✓ | ✓ | ✗ (use `<systemPath>`) |
| `import` | (BOM only) | | | |

**Examples:**
- `spring-boot-starter-web` — `compile` (default)
- `javax.servlet-api` — `provided` (Tomcat provides at runtime)
- `mysql-connector-j` — `runtime` (driver loaded reflectively, no compile-time refs)
- `junit-jupiter` — `test`
- `spring-boot-dependencies` BOM — `import` (provides versions but no JARs)

**`system` scope** is legacy — links to a JAR by file path. Avoid; use a local Maven repository instead.

### Q214. How does Maven resolve dependency conflicts?

Maven's resolution rule: **nearest wins** (shortest path from the root).

```
your-app
├── A
│   └── lib-X 1.0
└── B
    └── C
        └── lib-X 2.0
```

`A → lib-X 1.0` is depth 2; `B → C → lib-X 2.0` is depth 3. Maven picks **lib-X 1.0**.

If both are at the same depth, **first declaration wins** (order in `<dependencies>`).

**Inspect:**
```bash
mvn dependency:tree
mvn dependency:tree -Dverbose -Dincludes=org.example:lib-x   # shows what got excluded
```

**Force a specific version** — declare it explicitly in your top-level `<dependencyManagement>`:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.example</groupId>
            <artifactId>lib-x</artifactId>
            <version>2.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

This pins the version regardless of where it's transitively pulled in. Used by Spring Boot's parent POM and BOMs to enforce coherent version sets.

**Dependency convergence enforcement** — `maven-enforcer-plugin` rule `dependencyConvergence` fails the build if two transitives need different versions, forcing you to make an explicit decision.

### Q215. BOM imports — what problem do they solve?

**Bill of Materials (BOM)** — a POM that declares versions for a coherent set of libraries that work together. Imported via `<scope>import</scope>` in `<dependencyManagement>`.

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.4.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- No version needed — BOM provides it -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

**Why:**
- One source of truth for versions across hundreds of artifacts
- Spring Boot publishes a BOM that pins ~500 libraries to versions tested to work together
- Multiple BOMs can coexist; later imports override earlier (use cautiously)

**Common BOMs:**
- `spring-boot-dependencies` — Spring Boot ecosystem
- `spring-cloud-dependencies` — Spring Cloud
- `junit-bom` — JUnit 5 modules
- `testcontainers-bom` — Testcontainers modules
- AWS SDK BOM, Azure SDK BOM

**Without BOM:** you manually pin every library version → version skew → runtime `NoSuchMethodError`. With BOM: one version property to bump.

### Q216. Multi-module Maven projects — how do they work?

Parent POM with `<modules>`, each module is a sub-directory with its own POM.

```
my-project/
├── pom.xml                      (parent — packaging: pom)
├── api/
│   └── pom.xml                  (packaging: jar)
├── domain/
│   └── pom.xml
└── infrastructure/
    └── pom.xml
```

**Parent POM:**
```xml
<groupId>com.example</groupId>
<artifactId>my-project</artifactId>
<version>1.0-SNAPSHOT</version>
<packaging>pom</packaging>

<modules>
    <module>api</module>
    <module>domain</module>
    <module>infrastructure</module>
</modules>
```

**Child POM:**
```xml
<parent>
    <groupId>com.example</groupId>
    <artifactId>my-project</artifactId>
    <version>1.0-SNAPSHOT</version>
</parent>
<artifactId>api</artifactId>
```

**Benefits:**
- Single `mvn install` from parent builds everything in dependency order
- Common config (Java version, plugin versions, dependency BOMs) defined once in parent
- Easy module isolation — `infrastructure` depends on `domain`, `api` depends on both, but `domain` has no infra dependencies (enforce hexagonal architecture)

**Reactor:** Maven's term for the ordered build of all modules. `-pl module-name -am` builds a single module and its dependencies.

### Q217. Gradle vs Maven — trade-offs.

**Maven:**
- XML-based POM
- Convention over configuration
- Massive ecosystem, every CI tool understands it
- Build is declarative; non-trivial customisation is painful
- Slow on large projects (no incremental compilation by default)

**Gradle:**
- Groovy or Kotlin DSL
- Programmatic build script
- Incremental compilation, build cache, daemon — much faster on large projects
- More flexibility, more rope to hang yourself
- Steeper learning curve; build scripts can become unmaintainable

**When to pick Maven:**
- Standard Spring Boot / library project
- Team unfamiliar with Gradle
- Strong preference for declarative

**When to pick Gradle:**
- Large multi-module project where build time matters
- Android (Gradle is the default)
- Need build customisation that Maven plugins make awkward
- Kotlin shop (Kotlin DSL is type-safe and IDE-discoverable)

**Build performance** is Gradle's main edge. Build cache (`~/.gradle/caches`) shares compiled outputs across CI runs and developers — massive for large monorepos.

**Reproducibility:** both can be made reproducible (same input → same output bytes). Gradle has built-in support; Maven needs the `reproducible-build-maven-plugin`.

### Q218. SBOM — what is it and why does it matter?

**Software Bill of Materials.** A machine-readable inventory of every dependency in your build, including versions and licences.

**Standards:**
- **CycloneDX** — OWASP-led, JSON/XML/Protobuf
- **SPDX** — Linux Foundation, broader scope (includes file-level)

**Generate:**
- Maven: `cyclonedx-maven-plugin` produces `bom.xml` in `target/`
- Gradle: `cyclonedx-gradle-plugin`
- Spring Boot 3.5+ has built-in SBOM support
- GitHub: dependency graph + Dependabot effectively maintain a live SBOM

**Why it matters:**
- **Vulnerability tracking** — when CVE-2024-XYZ drops on `commons-text` 1.10, you grep your SBOMs to find affected services in seconds
- **Licence compliance** — flag GPL or AGPL deps slipping into a closed-source product
- **Supply chain attacks** — Log4Shell hit hard partly because nobody had a clean inventory of what was deployed
- **Regulation** — US Executive Order 14028, EU Cyber Resilience Act mandate SBOMs for federal/regulated software
- **Customers** — increasingly required by enterprise procurement

**In practice:** generate during CI, attach to releases, ingest into Dependency-Track / Snyk / GitHub Dependency Graph for continuous monitoring.

### Q219. Reproducible builds — what's required?

**Reproducible build** = same source + same toolchain → byte-identical output. Lets you verify a binary matches its claimed source.

**Java specifics:**
- JAR files contain timestamps in entries — must be normalised. Maven plugin `reproducible-build-maven-plugin` or `maven-jar-plugin` 3.x with `<archive><manifestEntries><Built-By>` config.
- Manifest order matters — sort entries deterministically.
- File order in the JAR — sort entries.
- `Class-Path` and other manifest entries must be deterministic.
- JDK version + OS shouldn't affect output (mostly fine for plain Java).

**Maven flags:**
```xml
<properties>
    <project.build.outputTimestamp>2026-01-01T00:00:00Z</project.build.outputTimestamp>
</properties>
```

**Why reproducibility matters:**
- Supply chain trust — Reproducible Builds project verifies popular Linux packages match upstream source
- Distroless / scratch container images often verify reproducibility
- Required for some regulated sectors

**Gradle** has built-in reproducible builds support: `tasks.withType<Jar> { isReproducibleFileOrder = true; isPreserveFileTimestamps = false }`.

---

## Cloud-Native Java

### Summary

**What this topic covers**

Running Java in containers and Kubernetes — the operational story for every modern Java service. Three concern areas: (1) **the JVM in containers** — container-aware ergonomics (memory and CPU detection from cgroups since Java 10), `-XX:MaxRAMPercentage`, GraalVM native-image and when its small footprint earns its cold-start tradeoff, Spring Boot 3's AOT processing for native images; (2) **Docker mechanics** — multi-stage builds (build stage with JDK, runtime stage with JRE), Spring Boot layered jars (`spring-boot:build-image` or layered Dockerfile for cached dependency layers); and (3) **Kubernetes integration** — liveness probes (am I deadlocked?), readiness probes (am I ready for traffic?), startup probes (am I done warming up?), graceful shutdown (`SIGTERM` → drain in-flight requests → close → exit), and the 12-factor application principles applied to JVM services. The 9 questions are about whether you ship Java to production in 2026, not 2015.

**Mental model**

The mental shift required for cloud-native Java is from "long-lived JVM with stable memory" to "potentially short-lived process in a constrained box". (1) **The container is the unit**, not the host. Pre-Java-10 JVMs would read host RAM and host CPU count, ignoring cgroup limits, then OOM-kill themselves; modern JVMs respect the container. But you still need `-XX:MaxRAMPercentage=75.0` (or similar) so the JVM leaves headroom for native memory, metaspace, and the OS. (2) **Startup matters now.** Traditional JVMs warm up over seconds-to-minutes via the JIT; that's fine for long-lived services and terrible for scale-to-zero, FaaS, or aggressive autoscaling. The 2026 answers: GraalVM native-image (millisecond cold starts, smaller memory, lower peak throughput), Project Leyden (AOT compilation roadmap inside the JVM), checkpoint/restore (CRaC). Spring Boot 3 + AOT lets you build a native image from a normal Spring Boot app with minimal config changes. (3) **Kubernetes is a control plane**, and your service needs to play nice with it. Liveness probe failure restarts the pod; readiness probe failure pulls it from the service mesh. Graceful shutdown via `SIGTERM` handling drains in-flight requests, returns 5xx-quietly for new ones, then exits — done badly, you get dropped requests on every deployment. **12-factor** is the unifying framework: config from env, stateless processes, port binding, disposability, dev/prod parity.

**Key terms**

- **Container-aware JVM** — reads CPU and memory from cgroups; default since Java 10 (with `-XX:+UseContainerSupport`).
- **`-XX:MaxRAMPercentage`** — heap as percentage of *container* RAM; replaces hardcoded `-Xmx`.
- **GraalVM native-image** — compiles a Java program to a native executable; closed-world assumption, slow to build, fast to start, smaller memory, lower peak throughput.
- **Spring Boot 3 AOT** — `spring-boot:process-aot` generates reflection/proxy hints for native-image compatibility.
- **Multi-stage Docker build** — `FROM eclipse-temurin:21 AS build` … `FROM eclipse-temurin:21-jre` — separate build and runtime stages keep the final image small.
- **Layered jar** — Spring Boot 2.3+ feature; splits dependencies, snapshots, resources, and application classes into separate Docker layers for cache efficiency.
- **Liveness probe** — Kubernetes restarts the pod if it fails; for "is the JVM still alive and not deadlocked".
- **Readiness probe** — Kubernetes removes the pod from service endpoints if it fails; for "am I ready to serve traffic right now".
- **Startup probe** — first-stage probe that disables liveness/readiness until startup completes; for slow-starting JVMs.
- **Graceful shutdown** — on `SIGTERM`: stop accepting new requests, drain in-flight, close resources, exit.
- **12-factor app** — config in env, stateless, disposable, port-binding, log to stdout, etc.
- **Sidecar / init container** — auxiliary containers in the same pod; Envoy proxy, secrets fetcher, log shipper.

**Why interviewers ask this**

Three signals. (1) **Operational currency** — a 2026 Java engineer should know that pre-Java-10 JVMs in containers without `-XX:+UseContainerSupport` would OOM-kill themselves. The candidate who still hardcodes `-Xmx512m` instead of `-XX:MaxRAMPercentage=75.0` is signalling outdated practice. (2) **Native-image positioning** — when does GraalVM native-image earn its keep? Cold start matters (Lambda, scale-to-zero, CLIs), memory-constrained edges, short-running batch jobs. When doesn't it? Long-lived high-throughput services where peak JIT-optimised throughput beats native-image's static optimisation. Senior candidates have an opinion. (3) **Graceful shutdown** — most candidates have never implemented it. The ones who have can explain the `SIGTERM` flow, the Spring Boot `server.shutdown=graceful` setting, the `preStop` hook coordination with Kubernetes' `terminationGracePeriodSeconds`. This is the difference between "we drop requests on deploy" and "we don't".

**Common confusions**

- "JVM ignores container memory limits" — true until Java 10; respected by default since Java 11.
- "GraalVM native-image is always faster" — *starts* faster, *uses less memory*; peak throughput is often *lower* than JIT-optimised HotSpot.
- "Liveness and readiness probes are the same" — they're not; liveness failure restarts, readiness failure isolates. Most pods need both, with different criteria.
- "Just hit `/health` for both probes" — Spring Boot Actuator exposes `/actuator/health/liveness` and `/actuator/health/readiness` distinctly for a reason.
- "Containers should be stateless" — closer to right than wrong, but "stateless processes" means *the process holds no state across restarts*, not "the app has no state". State lives in DBs, caches, object stores.
- "Layered jars are only for Docker" — they're useful in any caching context; even CI build caches benefit.

**What follows from this topic**

Cloud-Native ties together JVM (container ergonomics, native image), Build Tools (multi-stage Docker, layered jars), Spring (Actuator endpoints, graceful shutdown), and Resilience (probes coordinate with circuit breakers). It also previews the operational dimension of System Design — "how do you ship this" is as important as "how do you design this". The candidate who can articulate the SIGTERM-drain-shutdown sequence has shipped at least once.

### Q220. JVM in containers — what's special?

**Pre-Java 10:** the JVM saw the *host* CPU and memory, ignoring container limits. A 16-core, 64GB host with a 2-core, 4GB cgroup → JVM thought it had 16 cores, set thread pools accordingly, OOM-killed by the kernel for using too much memory.

**Java 10+:** `-XX:+UseContainerSupport` (default on) reads cgroup limits. JVM:
- Sees container CPU limit → sizes default thread pools accordingly
- Sees container memory limit → sizes heap as a fraction (default 25% before Java 19, since Java 19 it's based on `MaxRAMPercentage` defaulting to 25%)

**Tuning:**
```bash
# Old way
-Xmx2g

# Container-aware way (preferred)
-XX:MaxRAMPercentage=75       # 75% of cgroup memory limit
-XX:InitialRAMPercentage=75
```

Set RAM percentage so heap + native memory + container overhead fits in the limit. Typical: 75% on a 2GB container leaves ~512MB for native (JIT cache, Metaspace, threads, off-heap buffers).

**Other knobs:**
- `-XX:ActiveProcessorCount=N` to override detected CPUs
- `-XX:+ExitOnOutOfMemoryError` so K8s restarts the pod cleanly
- `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/heap.hprof` for postmortems

### Q221. GraalVM native image — when does it earn its keep?

**GraalVM native image** AOT-compiles a Java app to a self-contained native binary. No JVM at runtime; everything resolved at build time.

**Wins:**
- **Cold start** ~10-100x faster than JVM (50ms vs 5s for a typical Spring Boot app)
- **Memory** ~50-75% lower at idle (no JIT, no Metaspace overhead)
- **Distribution** — single binary, no JRE needed

**Costs:**
- **Build time** — minutes (vs seconds for normal JVM build)
- **Reflection / dynamic class loading** must be configured (manual `reflect-config.json` or framework-generated)
- **No JIT** — peak throughput typically 20-40% lower than warmed JVM
- **No agent-based monitoring** (some APM tools work, others don't)
- **Library compatibility** — frameworks must support native; many do now (Spring Boot 3 + Spring AOT, Quarkus, Micronaut)

**Best for:**
- Serverless (cold start matters most)
- CLI tools (start, do work, exit)
- Highly-replicated services where idle cost dominates

**Bad for:**
- Long-running services where JIT optimisation matters more than startup time
- Heavy reflection-using apps without first-class native support
- Apps with frequent code reload (dev workflows)

**Build:**
```bash
mvn -Pnative native:compile
# or
gradle nativeCompile
```

### Q222. Spring Boot 3 + AOT processing for native image.

Spring Boot 3 introduced **AOT processing** to make Spring apps native-image-friendly.

**At build time:**
- AOT processor analyses the app context: scanned components, configurations, conditional beans
- Generates Java source code reflecting the determined bean graph (`*.aot.java`)
- Generates native-image config: `reflect-config.json`, `resource-config.json`, `proxy-config.json`, `serialization-config.json`
- These tell GraalVM what to keep in the binary (otherwise GraalVM eliminates "unused" code that's actually used reflectively)

**Build:**
```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```
Then `mvn -Pnative native:compile` (with the GraalVM Maven plugin).

**Limitations:**
- Conditional bean activation is **frozen at build time** — no runtime profile switching that changes the bean graph
- `@ConfigurationProperties` binding paths are scanned ahead of time
- Some third-party libraries need explicit hints (`@RegisterReflectionForBinding`, `@TypeHint`)

**Runtime tracing:** if your app uses something native-image doesn't auto-detect, run the JVM version with the native-image-agent attached:
```bash
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image -jar app.jar
```
The agent records reflection / resource access, generates configs you commit.

### Q223. Multi-stage Docker builds for Java.

A naive `Dockerfile` ships the entire build environment + JDK + dependencies in the image — bloated and slow.

**Multi-stage** uses one stage to build, another to run:

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline    # cache layer for deps
COPY src ./src
RUN mvn package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
COPY --from=build /app/target/app.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**Optimisations:**
- **Cache deps separately from source** — copy `pom.xml`, run `dependency:go-offline`, *then* copy source. Source changes don't invalidate the dependency layer.
- **JRE image, not JDK** — runtime doesn't need the compiler
- **Distroless base** (`gcr.io/distroless/java21`) — minimal attack surface, ~80MB vs Alpine's ~220MB
- **Non-root user:**
  ```dockerfile
  RUN adduser -D appuser
  USER appuser
  ```

### Q224. Spring Boot layered jars for Docker.

Spring Boot 2.3+ supports layered JARs — splits the fat JAR into stable layers (dependencies, snapshots, app) so Docker can cache them separately.

**Configure in pom:**
```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <layers><enabled>true</enabled></layers>
    </configuration>
</plugin>
```

**Multi-stage Dockerfile using layers:**
```dockerfile
FROM eclipse-temurin:21 AS extract
WORKDIR /app
COPY target/app.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=extract /app/dependencies/ ./
COPY --from=extract /app/spring-boot-loader/ ./
COPY --from=extract /app/snapshot-dependencies/ ./
COPY --from=extract /app/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Each `COPY` is a Docker layer. When you change app code, only the `application/` layer rebuilds — saves minutes on CI rebuilds and speeds up registry pushes.

**Alternative — Buildpacks:** `mvn spring-boot:build-image` produces an OCI image directly using Paketo buildpacks. No Dockerfile needed. Layers automatically.

```bash
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=interview-prep:latest
```

### Q225. Kubernetes liveness vs readiness vs startup probes.

Three probes, three jobs.

**Liveness probe** — "is the container alive?" K8s restarts it if this fails. Use for catching deadlocks or wedged states.

**Readiness probe** — "is it ready to serve traffic?" K8s removes from load balancer if it fails. Use for "still warming up", "DB connection lost, can't serve", etc.

**Startup probe** — "has it finished starting?" Disables liveness/readiness until it succeeds. Use for slow-starting apps where liveness might falsely restart them during startup.

**Spring Boot 2.3+** built-in probes via Actuator:
```yaml
management.endpoint.health.probes.enabled: true
# Endpoints:
#   /actuator/health/liveness
#   /actuator/health/readiness
```

**K8s manifest:**
```yaml
livenessProbe:
  httpGet: { path: /actuator/health/liveness, port: 8080 }
  initialDelaySeconds: 60
  periodSeconds: 10
  failureThreshold: 3
readinessProbe:
  httpGet: { path: /actuator/health/readiness, port: 8080 }
  periodSeconds: 5
startupProbe:
  httpGet: { path: /actuator/health/liveness, port: 8080 }
  failureThreshold: 30      # 30 * 5s = 150s grace
  periodSeconds: 5
```

**Custom health indicators** — implement `HealthIndicator` for app-specific checks (DB query, external API ping):
```java
@Component
class DatabaseHealthIndicator implements HealthIndicator {
    public Health health() {
        try (Connection c = dataSource.getConnection()) {
            return c.isValid(2) ? Health.up().build() : Health.down().build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

### Q226. Graceful shutdown for Java services.

When a pod terminates, K8s sends SIGTERM, then waits `terminationGracePeriodSeconds` (default 30s), then SIGKILL.

**Spring Boot 2.3+** built-in:
```yaml
server.shutdown: graceful
spring.lifecycle.timeout-per-shutdown-phase: 30s
```

What it does:
- Stop accepting new HTTP requests
- Let in-flight requests complete (up to timeout)
- Run `@PreDestroy` and `DisposableBean#destroy`
- Close `EntityManager`, message consumers, thread pools

**Manual hooks** (for non-Spring or custom logic):
```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    log.info("Shutdown signal received");
    kafkaConsumer.close(Duration.ofSeconds(10));
    executor.shutdown();
    if (!executor.awaitTermination(10, TimeUnit.SECONDS)) executor.shutdownNow();
}));
```

**For K8s:** ensure `terminationGracePeriodSeconds >= shutdown-phase-timeout`. Otherwise SIGKILL fires mid-shutdown.

**For Kafka consumers:** call `consumer.close()` to commit offsets and leave the consumer group cleanly. Without it, you wait for `session.timeout.ms` before partitions rebalance — clients lag.

### Q227. 12-factor app applied to Java services.

Heroku's 12 factors, the foundation of cloud-native design.

1. **Codebase** — one repo, many deploys. ✓ Standard.
2. **Dependencies** — explicitly declare. Maven/Gradle do this.
3. **Config** — store in environment, not code. `@ConfigurationProperties` reading env vars / mounted secrets.
4. **Backing services** — DB, Redis, Kafka are attached resources. Configurable via env. Swap dev DB for prod via config alone.
5. **Build, release, run** — separate stages. CI builds artifact, deploy combines artifact + config, run executes. Don't build in production.
6. **Processes** — stateless. Use external session store (Redis), no local files persistent across restarts.
7. **Port binding** — service exposes via port (Spring Boot auto). No external web server needed.
8. **Concurrency** — scale via processes (more pods), not threads. Each pod stateless.
9. **Disposability** — fast startup, graceful shutdown. Spring Boot is fast enough for normal cases; native image for cold-start sensitivity.
10. **Dev/prod parity** — same DB engine in dev and prod. Use Testcontainers locally, not H2 (which has different SQL semantics from Postgres).
11. **Logs** — write to stdout/stderr, let the platform handle aggregation. Don't write log files inside the container.
12. **Admin processes** — one-off jobs (DB migrations, batch imports) run as separate processes/pods, not within the running app.

Spring Boot defaults align well; the harder factors are #4 (truly external services) and #6 (stateless) — they require discipline.

### Q307. Alert when the 500-error rate exceeds threshold for 5 minutes.

Emit request metrics (Micrometer `http.server.requests` → Prometheus). Alert on *rate*, not raw count — counter alerts fire forever during sustained load. Example PromQL:

```promql
sum(rate(http_server_requests_seconds_count{status="500"}[5m]))
  / sum(rate(http_server_requests_seconds_count[5m])) > 0.01
```

Wire to Alertmanager → PagerDuty/Slack. Add a `for: 5m` clause so transient spikes don't page. Pair with a dashboard (Grafana) and correlate alerts with deploys — most spikes follow a release.

---

## Networking & Protocols

### Summary

**What this topic covers**

The protocol-level fluency expected of a senior backend engineer who has to make IPC decisions and debug network issues. Three concern areas: (1) **HTTP evolution** — HTTP/1.1's pipelining and head-of-line blocking, HTTP/2's multiplexing over a single TCP connection with binary framing and header compression (HPACK), HTTP/3's move to QUIC over UDP to escape TCP's head-of-line blocking; (2) **TLS** — the handshake (TLS 1.2 took two round trips, TLS 1.3 collapses to one), certificate validation, mutual TLS for service-to-service identity; and (3) **service-to-service options** — REST vs gRPC tradeoffs (HTTP/JSON vs HTTP/2/protobuf, broad client support vs strict typing and streaming), WebSocket vs SSE vs long-polling for real-time push, HTTP caching primitives (`Cache-Control`, `ETag`, `Last-Modified`, `If-None-Match`), and what a reverse proxy (Nginx, Envoy, Traefik) does. The 6 questions probe whether you understand the wire, not just the framework.

**Mental model**

Think of network protocols as a *layered stack with tradeoffs*. At the transport layer, TCP gives ordered reliable bytes (with head-of-line blocking — if packet N is lost, packets N+1, N+2 wait), while UDP gives best-effort packets (no order, no reliability, no congestion control). HTTP/3's QUIC builds reliability *back on top of UDP* — same guarantees as TCP but per-stream, so a lost packet on stream 1 doesn't stall stream 2. At the application layer, HTTP/1.1 was simple but inefficient (one request at a time per connection, browsers open six per origin); HTTP/2 multiplexes many streams over one connection with binary framing and HPACK header compression — huge wins for browsers, modest wins for service-to-service; HTTP/3 then fixes the remaining TCP-level head-of-line blocking. TLS sits between transport and application; TLS 1.3 is the modern default, faster, with weak ciphers removed. **gRPC** rides on HTTP/2 with protobuf payloads, giving you bidirectional streaming, strict schemas, and lower wire overhead — at the cost of weaker browser support and a steeper debugging curve. **REST over HTTP/1.1 or 2 with JSON** is still the right default for internet-facing APIs because of tooling and language support. **WebSocket / SSE / long-polling** address real-time push: WebSocket is full-duplex but heavyweight, SSE is server-to-client only but simple and works over HTTP, long-polling is the fallback for ancient clients. **HTTP caching** with `Cache-Control` + `ETag` is wildly underused; correctly cached responses are the cheapest performance win available.

**Key terms**

- **HTTP/1.1** — text protocol, one in-flight request per connection (pipelining never deployed widely due to head-of-line blocking).
- **HTTP/2** — binary framing, multiplexed streams over a single TCP connection, HPACK header compression, server push (mostly deprecated in practice).
- **HTTP/3** — HTTP over QUIC (UDP); independent streams, faster handshake, no TCP head-of-line blocking.
- **TLS 1.3** — modern TLS; one round trip handshake, weak ciphers removed, forward secrecy by default.
- **mTLS** — both sides present certificates; common in service meshes (Istio, Linkerd) for service identity.
- **gRPC** — HTTP/2 + protobuf; supports unary, server-streaming, client-streaming, bidirectional streaming.
- **REST** — resource-oriented HTTP API; usually JSON; broadly tooled.
- **WebSocket** — full-duplex bidirectional channel over a long-lived TCP connection upgraded from HTTP.
- **SSE (Server-Sent Events)** — server-to-client stream over HTTP/1.1 (or 2); browsers auto-reconnect.
- **`Cache-Control`** — directives for HTTP caches (`public`, `private`, `max-age`, `s-maxage`, `no-cache`, `no-store`).
- **`ETag` / `If-None-Match`** — opaque revalidation tokens; server returns 304 Not Modified if matched.
- **Reverse proxy** — TLS termination, load balancing, routing, header rewriting; Nginx, Envoy, Traefik, HAProxy.

**Why interviewers ask this**

Three signals. (1) **Protocol literacy** — senior engineers can articulate *why* HTTP/2 is faster than HTTP/1.1 (multiplexing, binary framing, header compression) without hand-waving. The candidate who confuses pipelining with multiplexing is signalling shallow knowledge. (2) **gRPC vs REST tradeoff** — gRPC is the right answer for internal service-to-service when teams own both ends; REST is the right answer for public APIs and polyglot environments. A candidate who picks gRPC for an external partner API is missing the tooling-and-debugging cost. (3) **HTTP caching** — the "make the API faster" question is often best answered with `Cache-Control` + `ETag` rather than infrastructure. Senior candidates reach for caching primitives first. The 304 Not Modified response is free bandwidth.

**Common confusions**

- "HTTP/2 makes everything faster" — for browsers yes; for service-to-service over a LAN with HTTPS and persistent connections, often marginal.
- "HTTP/2 server push is great" — was theoretically great, in practice browsers struggled to use it well; Chrome removed support in 2022.
- "TLS is encryption" — TLS is also *authentication* (server identity via certificate) and *integrity* (MAC); encryption is one of three guarantees.
- "gRPC is always more efficient than REST" — at the wire yes (binary vs text, smaller headers); at the developer-time level, REST often wins on debuggability and tooling.
- "WebSocket is the only way to do real-time" — SSE is simpler when you only need server-to-client; long-polling is a fallback. Pick the simplest that works.
- "Reverse proxies just load-balance" — they also terminate TLS, rewrite headers, enforce rate limits, do canary routing, and run authn/authz at the edge.

**What follows from this topic**

Networking underpins System Design (latency budgets across hops), Security (TLS, mTLS), Cloud-Native (service mesh sidecars), and Messaging (Kafka's protocol is its own TCP-based wire format). Reverse proxies are the gateway between Kubernetes services and the outside world; their behaviour affects every observability and routing question. A candidate who can sketch an HTTP/2 frame layout and explain HPACK has the protocol literacy senior systems need.

### Q228. HTTP/1.1 vs HTTP/2 vs HTTP/3 — what changed?

**HTTP/1.1 (1997, still everywhere)**
- Text-based
- One request per TCP connection (head-of-line blocking)
- Solved partially by pipelining (buggy, mostly disabled) and 6 parallel connections per origin
- Keep-alive reduces TCP handshake cost

**HTTP/2 (2015)**
- Binary framing
- **Multiplexing** — multiple requests on one TCP connection, no head-of-line blocking at the HTTP level
- **Header compression** (HPACK) — repeated headers cost almost nothing
- **Server push** (deprecated, never widely used)
- Mandates TLS in browsers
- Still uses TCP — head-of-line blocking at the **TCP** level remains

**HTTP/3 (2022)**
- Replaces TCP with **QUIC** (UDP-based, multiplexed transport)
- No TCP head-of-line blocking
- Connection migration (keep connection alive across IP changes — moving from WiFi to mobile)
- Faster handshake (TLS 1.3 baked in, 1-RTT for new, 0-RTT for resumed)
- Encrypted by default

**Java support:**
- HTTP/2: Java 9+ via `HttpClient`. Servers via Jetty, Undertow, Tomcat.
- HTTP/3: Java 22+ preview in `HttpClient`; servers via Netty + JCQUIC

### Q229. TLS handshake — what happens?

TLS 1.3 (the modern default since 2018) simplified the handshake to **1-RTT**.

```
Client                                          Server

1. ClientHello —————————————————————————————→
   - supported TLS versions
   - cipher suites
   - random
   - key share (ephemeral DH public)
   - SNI (server name)

                                               2. ServerHello ←—————
                                                  - chosen version
                                                  - chosen cipher
                                                  - random
                                                  - key share
                                                  - certificate (encrypted)
                                                  - signature over handshake

3. Certificate verified
4. Derive shared session keys via DH
5. Finished —————————————————————————————→

                                               6. Finished ←—————

Encrypted application data flows
```

**TLS 1.3 simplifications vs 1.2:**
- 1 round trip vs 2
- 0-RTT for resumed sessions (with replay risk for non-idempotent ops)
- Mandatory ECDHE (forward secrecy by default)
- Removed legacy cipher suites (RSA key exchange, RC4, SHA-1, etc.)

**Java specifics:**
- Java 8u261+ supports TLS 1.3
- TrustStore (`cacerts`) holds CA certificates — keep updated
- KeyStore holds your own certs + keys (server-side)
- `-Djavax.net.debug=ssl,handshake` for handshake debugging

### Q230. gRPC vs REST — when each?

**REST:**
- HTTP/JSON, human-readable
- Universal client support (browser, curl, Postman)
- Cacheable via HTTP semantics
- Schema is informal (OpenAPI documents but doesn't enforce)
- Streaming via SSE / WebSocket / long-polling — bolted on

**gRPC:**
- HTTP/2 + Protobuf (binary)
- Strongly-typed schema (.proto files), code generation in any language
- Bidirectional streaming first-class
- Built-in features: deadlines, cancellation, metadata, interceptors
- Smaller payloads (binary), faster serialisation
- No browser support without gRPC-web proxy

**Use REST when:**
- Public API consumed by browsers / curl / Postman
- Caching matters (HTTP caching is well-supported)
- Simple request/response, JSON is fine
- Polyglot consumers without code-gen tooling

**Use gRPC when:**
- Internal service-to-service in a microservices estate
- Strict schema discipline + version evolution matters
- Streaming (chat, real-time updates, file transfer)
- Performance-sensitive (binary serialisation, HTTP/2 multiplexing)
- Code generation across languages is welcome

**Hybrid:** REST at the public edge, gRPC internally. Common at scale.

### Q231. WebSocket vs SSE vs long-polling.

Three ways to push data from server to client over HTTP.

**Long-polling:**
- Client makes HTTP request; server holds it open until data arrives or timeout
- On data, server responds; client immediately re-requests
- Works everywhere; high overhead per message (full HTTP request/response cycle)
- Use only when stuck on legacy infrastructure

**Server-Sent Events (SSE):**
- One-way (server → client) over HTTP
- Single long-lived HTTP response, server writes events: `data: {...}\n\n`
- Auto-reconnect, last-event-id resumption built in
- Browser support: `new EventSource('/events')`
- Use for: notifications, live feeds, dashboards, anything one-way

**WebSocket:**
- Full bidirectional over a single TCP connection (upgraded from HTTP)
- Binary or text frames
- Use for: chat, multiplayer games, real-time collaboration, anything two-way

**Java support:**
- Spring WebFlux: `Flux<ServerSentEvent>` for SSE
- Spring MVC: `SseEmitter`
- WebSocket: `@MessageMapping` + STOMP, or raw `@OnMessage` JSR-356
- Reactor Netty / Undertow handle both natively

### Q232. HTTP caching — `Cache-Control`, ETag, Last-Modified.

Three mechanisms layered together.

**`Cache-Control`** — directive header controlling cacheability:
```
Cache-Control: public, max-age=3600
Cache-Control: private, no-cache
Cache-Control: no-store
Cache-Control: max-age=600, stale-while-revalidate=60, stale-if-error=3600
```

- `public` / `private` — shared (CDN) or per-user
- `max-age=N` — fresh for N seconds
- `no-cache` — must revalidate every time (still cacheable, just verified)
- `no-store` — never cache (sensitive data)
- `stale-while-revalidate` — serve stale while fetching fresh (great UX)

**ETag** — opaque version identifier:
```
Server: ETag: "abc123"
Client: If-None-Match: "abc123"
Server: 304 Not Modified  (saves the body)
```

**Last-Modified** — timestamp-based version:
```
Server: Last-Modified: Tue, 01 May 2026 10:00:00 GMT
Client: If-Modified-Since: Tue, 01 May 2026 10:00:00 GMT
Server: 304 Not Modified
```

ETag is more precise (millisecond changes); Last-Modified relies on second-precision clocks. Most CDNs prefer ETag.

**Spring Boot:**
```java
@GetMapping("/items/{id}")
public ResponseEntity<Item> get(@PathVariable UUID id) {
    Item item = service.find(id);
    return ResponseEntity.ok()
        .eTag("\"" + item.version() + "\"")
        .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS))
        .body(item);
}
```

Or auto via `ShallowEtagHeaderFilter` for any response (computes ETag from response body hash).

### Q233. Reverse proxy basics — what does Nginx / Envoy / Traefik do?

A **reverse proxy** sits in front of your services, terminating client connections and forwarding to backends.

**What they handle:**
- TLS termination — proxy speaks HTTPS to clients, plain HTTP to backends (often)
- Load balancing — round-robin, least-connections, weighted, IP-hash
- HTTP/2, HTTP/3 to clients while backends still run HTTP/1.1
- Caching — cache GET responses with appropriate headers
- Rate limiting — per IP, per token
- Routing — by path, host, header
- Authentication offload — JWT validation before request reaches backend
- gzip / Brotli compression
- Header rewriting

**Common choices:**
- **Nginx** — battle-tested, ubiquitous, config-file-based
- **HAProxy** — pure load balancer, very fast
- **Traefik** — auto-discovers services from Docker / K8s labels, popular in cloud-native
- **Envoy** — modern, used by Istio service mesh, gRPC-first
- **AWS ALB / GCP LB / Cloudflare** — managed equivalents

**In K8s:** an **Ingress controller** (typically Nginx-based, Traefik, or Envoy) handles all this declaratively via `Ingress` resources. Service mesh (Istio, Linkerd) puts an Envoy sidecar next to every pod for finer control.

---

## Resilience Patterns

### Summary

**What this topic covers**

The patterns that keep a Java service alive when its downstream dependencies fail — the daily reality of distributed systems. Three concern areas: (1) **failure containment** — circuit breakers (closed/open/half-open) to stop hammering a failing dependency, bulkheads to isolate failure domains (separate thread pools per downstream so one slow callee doesn't drown the others), timeouts at every boundary (connect, read, total), fallbacks to degrade gracefully; (2) **retry strategy** — exponential backoff with jitter (full jitter is the standard in 2026), retry budgets, retrying only on idempotent operations, distinguishing transient errors (network blip, 503, timeout) from permanent (400, 401, 422); and (3) **rate limiting** — token bucket (allows bursts up to bucket size), leaky bucket (smooth output rate), sliding window (precise per-time-period limits). The 7 questions are about whether you've built a service that survives a downstream brown-out, not just one that works on the happy path.

**Mental model**

Resilience patterns are the *production-engineering* counterpart to system design. A correct happy-path implementation will still take down your service when the database has a slow night, when a downstream API starts returning 503s, when one customer DOSes you accidentally. The mental model is **"hope is not a strategy"** — every external call is a potential failure, and your service must have an answer for each. (1) **Timeouts everywhere** — no I/O without a deadline. The HikariCP connection acquire, the JDBC statement, the HTTP client connect, the HTTP client read — every one of these has a default of "infinity" if you don't set it, and infinity means "your thread is gone until the OS gives up". Reasonable defaults: 1-3 seconds for inter-service calls in a datacenter, longer for external APIs. (2) **Circuit breakers + bulkheads** — once a downstream is unhealthy, *stop calling it* (open the breaker) so you don't queue up requests that will time out. Bulkhead each downstream into its own thread pool (Resilience4j or Hystrix style) so slow callee A can't exhaust the pool callee B needs. (3) **Retries with backoff + jitter** — retries are dangerous; thundering herds amplify a brief outage into a sustained one. Always exponential backoff (2x per attempt), always with jitter (randomise the delay), always bounded retry count. Only retry idempotent operations or operations behind an idempotency key. (4) **Fallbacks** — what's the answer when the downstream is unavailable? Cached value, default value, partial response, 503 with retry-after — anything but propagating a 5xx blindly.

**Key terms**

- **Circuit breaker** — three states: closed (calls pass through), open (calls fail fast), half-open (probe to see if it's healthy again).
- **Bulkhead** — isolate resources (threads, connections) per dependency so one failure doesn't drown the system.
- **Timeout** — fail an operation after a deadline; never `Thread.sleep(infinity)`.
- **Connect timeout** — time to establish the TCP/TLS connection.
- **Read timeout** — time between bytes; doesn't bound total request time.
- **Total / request timeout** — time to complete the whole call; the one you actually want.
- **Exponential backoff** — wait 2^attempt seconds (capped); doubles delay per retry.
- **Jitter** — randomise the backoff to avoid synchronised retries (thundering herd).
- **Full jitter** — `random(0, backoff)` (AWS-recommended) vs equal jitter (`backoff/2 + random(0, backoff/2)`).
- **Retry budget** — max retries per request *and* a global rate cap on retries to prevent retry storms.
- **Fallback** — degrade-gracefully behaviour when the primary fails (cached value, default, partial response).
- **Token bucket** — N tokens added per second to a bucket of size B; each request consumes one. Allows bursts.
- **Leaky bucket** — fixed-rate output; bursts queue and drain at the rate.
- **Sliding window** — count requests in a moving time window; precise but stateful.
- **Resilience4j** — the modern Java library; replaced Hystrix (Netflix archived it). Lightweight, composable decorators.

**Why interviewers ask this**

Three signals. (1) **"How do you stop one slow downstream from killing the whole service?"** — this is the resilience question. The senior answer is bulkhead (isolated thread pool or virtual-thread group per dependency) + circuit breaker (fail fast when error rate exceeds threshold) + timeout (fail in seconds, not minutes) + fallback (degrade to cached data). Junior answer is "scale up". (2) **Retry discipline** — naive retries amplify outages. The senior answer always includes (a) exponential backoff, (b) jitter, (c) bounded attempts, (d) retry-only-idempotent. A candidate who says "just retry until it works" has caused at least one production outage. (3) **Knowing the modern library** — in 2026 you should reach for Resilience4j (or Spring Cloud Circuit Breaker abstraction). Mentioning Hystrix without acknowledging it's archived is dated.

**Common confusions**

- "Retries fix transient failures" — only if they're truly transient *and* idempotent *and* with backoff. Otherwise they amplify.
- "Circuit breakers are for catastrophes" — they're for *any* dependency with elevated error rate; trip thresholds are tunable.
- "Timeouts should be long to avoid false positives" — they should be tight; long timeouts make your service slow to fail and drain capacity into a black hole.
- "Bulkheads are over-engineering" — until one slow caller eats all your threads. Then they're not.
- "Exponential backoff is enough" — without jitter, all retrying clients re-fire at the same moment. Always add jitter.
- "Rate limit per IP" — usually wrong; rate limit per identity (API key, user, tenant). IP is a poor proxy in NAT'd environments.

**What follows from this topic**

Resilience cross-cuts every other system topic. Timeouts feed Concurrency (don't block forever). Circuit breakers wrap downstream calls in Messaging and Networking. Rate limits live at the reverse proxy (Networking) and in the application (Spring filter). Resilience is also the diagnostic lens: most production incidents involve a downstream getting slow, retries piling on, thread pool exhaustion, cascading failure. Knowing the patterns means knowing how to *prevent* the cascade.

### Q234. Circuit breaker — what does it do and when?

Trips open after N consecutive failures, immediately rejecting calls until the dependency recovers. Prevents cascading failures and gives the failing service time to recover.

**Three states:**
- **Closed** (normal) — calls pass through, failures counted
- **Open** (tripped) — calls fail immediately without hitting the backend
- **Half-Open** (probing) — after a wait period, allow a few test calls; succeed → close, fail → open again

**Resilience4j (Java standard):**
```java
CircuitBreaker breaker = CircuitBreaker.of("payment", CircuitBreakerConfig.custom()
    .failureRateThreshold(50)              // 50% failures triggers open
    .slidingWindowSize(10)                 // over last 10 calls
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .permittedNumberOfCallsInHalfOpenState(3)
    .build());

// Wrap a call
Supplier<Result> wrapped = CircuitBreaker.decorateSupplier(breaker,
    () -> paymentClient.charge(req));

Try.ofSupplier(wrapped)
   .recover(throwable -> Result.failed("circuit open"))
   .get();
```

**Spring integration:**
```java
@CircuitBreaker(name = "payment", fallbackMethod = "fallback")
public Result charge(Request req) { return paymentClient.charge(req); }
public Result fallback(Request req, Throwable t) { return Result.failed(...); }
```

**When to use:** any synchronous call to a remote dependency that might fail. Without a breaker, your service hangs waiting for timeouts, exhausts thread pool, breaks itself trying to call a broken downstream.

### Q235. Retry with exponential backoff and jitter.

Naive retry storms the failed service when many clients retry simultaneously. Two fixes: exponential backoff and jitter.

**Exponential backoff:** wait longer after each failure.
```
attempt 1: wait 1s
attempt 2: wait 2s
attempt 3: wait 4s
attempt 4: wait 8s
```

**Jitter:** randomise the wait to spread out simultaneous retries. Without jitter, all clients retry at exactly the same intervals, creating thundering herds.

```
wait = random(0, base * 2^attempt)
```

**Resilience4j:**
```java
RetryConfig config = RetryConfig.custom()
    .maxAttempts(3)
    .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
        Duration.ofMillis(100),    // initial
        2.0,                        // multiplier
        0.5                         // randomisation factor (jitter)
    ))
    .retryOnException(ex -> ex instanceof IOException)
    .build();

Retry retry = Retry.of("payment", config);
```

**Don't retry:**
- Non-idempotent operations without idempotency keys (you might double-charge)
- Errors that are permanent (4xx not 5xx — don't retry validation failures)
- Business logic failures

**Circuit breaker + retry combo:** retry inside the circuit breaker. Once breaker opens, retries stop entirely.

### Q236. Bulkhead pattern — isolating failure domains.

Named after ship hulls — compartments separated so flooding one doesn't sink the whole vessel.

**Problem:** all calls to backend X share one thread pool. Backend X gets slow → all threads block on X → other backends starved → cascading failure.

**Bulkhead:** dedicated resource pool per dependency.

```java
// Resilience4j thread-pool bulkhead
ThreadPoolBulkhead bh = ThreadPoolBulkhead.of("payment-api",
    ThreadPoolBulkheadConfig.custom()
        .maxThreadPoolSize(8)
        .coreThreadPoolSize(4)
        .queueCapacity(100)
        .build());

bh.executeSupplier(() -> paymentClient.charge(req));
```

**Two flavours:**
- **Thread-pool bulkhead** — separate thread pool per dependency. Heavy.
- **Semaphore bulkhead** — limit concurrent calls per dependency. Lightweight, but doesn't isolate scheduling.

**When to use:** any service that calls multiple slow dependencies. Without bulkheads, one slow dependency contaminates the whole service.

**With virtual threads (Java 21+),** thread-pool bulkheads are largely unnecessary — virtual threads are cheap, blocking is fine. Semaphore bulkheads still useful for capping concurrency on rate-limited APIs.

### Q237. Timeout strategies — connect / read / total.

Three layers of timeout, each catching different failure modes.

**Connect timeout** — how long to wait for TCP connection establishment. Defaults are often huge (~30s). Set low (1-3s) for healthy networks.

**Read timeout** — max idle time waiting for response bytes. Catches "connected but never responded" — common with overloaded services.

**Total / call timeout** — max wall-clock time for the entire request. Catches "responding slowly but bytes keep dribbling in".

**Java HttpClient:**
```java
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(2))
    .build();

HttpRequest req = HttpRequest.newBuilder(uri)
    .timeout(Duration.ofSeconds(5))   // total request timeout
    .build();
```

**Spring WebClient:**
```java
WebClient.builder()
    .clientConnector(new ReactorClientHttpConnector(
        HttpClient.create()
            .responseTimeout(Duration.ofSeconds(5))
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
    ))
    .build();
```

**Pitfalls:**
- Default timeouts in many libraries are infinite or hours — always override
- Timeouts must respect circuit breaker / retry budgets — total time should not exceed user-facing SLO
- For database calls (HikariCP), `connectionTimeout` is borrow-from-pool, not connect-to-DB. Set socket-level timeout on the JDBC URL: `?socketTimeout=10` (Postgres).

### Q238. Fallback strategies — degrade gracefully.

When a dependency fails, what do you return? Three approaches, ranked by user impact.

**1. Cached value** — return last-known-good. Best UX if data isn't real-time critical.
```java
@CircuitBreaker(name = "exchange-rates", fallbackMethod = "cachedRates")
public ExchangeRate getRate(Currency c) { return rateClient.fetch(c); }
public ExchangeRate cachedRates(Currency c, Throwable t) {
    return rateCache.get(c);
}
```

**2. Sensible default** — for non-critical fields. Recommendation engine down → return popular items list.

**3. Partial response** — drop the failed component, return what works. "Couldn't load reviews, but here's the product."

**4. Fail fast with clear error** — better than hanging. 503 + `Retry-After`.

**Don't fallback to the same broken dependency.** Don't fallback by retrying immediately (that's what retry is for, with backoff).

**Document fallbacks** — operations team needs to know "we're returning stale rates, freshness drops to 1 hour".

### Q239. Rate limiting algorithms — token bucket / leaky bucket / sliding window.

Four common algorithms; trade-offs in burst handling and accuracy.

**Token bucket:**
- Bucket has capacity N, refills at rate R per second
- Each request consumes 1 token
- If empty, request rejected
- **Allows bursts** up to bucket capacity

```
capacity=10, rate=2/s
[burst of 10 immediate requests OK, then 2/s sustained]
```

**Leaky bucket:**
- Requests fill a bucket; bucket drains at constant rate
- Overflow → reject
- **Smooths bursts** to a constant output rate

**Fixed window:**
- Count requests per fixed time window (per minute)
- Reset counter at window boundary
- Simple but suffers boundary stampede (1000 req at 11:59:59 + 1000 req at 12:00:01 = 2000 in 2 seconds)

**Sliding window log:**
- Track timestamp of every request
- Count those within the window
- Accurate but expensive (memory per request)

**Sliding window counter:**
- Two fixed windows; weighted average
- Approximation but cheap and accurate enough

**Implementations:**
- Single-instance: in-process map (not safe across pods)
- Distributed: Redis with atomic Lua script, or a dedicated rate-limiting service (Envoy global rate limiter, Kong, Traefik plugin)

**Java libraries:** Bucket4j (in-process or Hazelcast/Redis-backed), Resilience4j-RateLimiter (token bucket).

```java
RateLimiter limiter = RateLimiter.of("api", RateLimiterConfig.custom()
    .limitForPeriod(100)
    .limitRefreshPeriod(Duration.ofSeconds(1))
    .timeoutDuration(Duration.ofMillis(50))
    .build());

if (limiter.acquirePermission()) { handleRequest(); }
else { return ResponseEntity.status(429).build(); }
```

### Q308. How do you stop one slow downstream from killing the whole service?

Five concurrent patterns: timeouts on every outbound call (no infinite waits), retries with exponential backoff + jitter for idempotent ops only, circuit breaker (fail fast after N errors, half-open probe to recover), bulkhead (separate thread/connection pools per dependency so one stuck pool doesn't starve others), and fallback (cached value, default response, graceful degradation). Make operations idempotent so retries are safe. Resilience4j or Spring Cloud Circuit Breaker wraps this; the discipline is applying it on *every* network boundary, not just the obvious ones.

---

---

## Java Module System (JPMS)

### Summary

**What this topic covers**

Project Jigsaw — the module system that arrived in Java 9 — and the practical question of whether to use it. Three concern areas: (1) **basics** — `module-info.java`, `requires`, `exports`, `opens`, `uses`, `provides`; what an explicit module vs an automatic module vs the unnamed module means; (2) **reflection access controls** — the `--add-opens` / `--add-exports` flags that frameworks like Spring need to reach into JDK internals, and why every framework had a rough Java 9 upgrade; and (3) **ecosystem integration** — `ServiceLoader` for module-aware service discovery, migration strategies from non-modular apps (start with automatic modules, gradually go explicit), and `jlink` for building custom runtime images that include only the modules you need. The 5 questions are about whether you've actually used JPMS or just heard the controversy.

**Mental model**

JPMS is *strong encapsulation at the package level*. Before Java 9, "public" meant "visible to anyone with the JAR on their classpath" — `sun.misc.Unsafe`, JDK internals, every package was reachable. JPMS introduces **modules** as a grouping of packages with explicit declarations of (a) what packages they *export* (visible to other modules) and (b) what modules they *require* (depend on). A package not in an `exports` declaration is invisible to other modules, even if its classes are `public`. **Reflection** is gated separately by `opens` — a module must explicitly open a package to reflective access (or use `--add-opens` at the command line). This is why early Java 9 broke half the Java ecosystem: Spring, Hibernate, JAXB, every serialisation library was reflecting into JDK internals that were no longer accessible. The fix was a long migration. Three kinds of module exist at runtime: **explicit** (has a `module-info.java`), **automatic** (a JAR on the module path without `module-info`, gets a derived module name and exports all packages), and the **unnamed module** (everything on the classpath, the legacy bucket). Most apps in 2026 are *not* explicitly modular — they put their dependencies on the classpath and use only the runtime side of JPMS via `--add-opens` flags for compatibility. The places it has actually paid off are JDK distributions (`jlink` lets you build a 40MB runtime image instead of shipping a 200MB JRE), the JDK itself (strong encapsulation of internals improved security), and some library authors who want to publicly enforce API boundaries.

**Key terms**

- **`module-info.java`** — module descriptor at the module root; declares name, requires, exports, opens, uses, provides.
- **`requires`** — module dependency; `requires transitive X` re-exports X to consumers.
- **`exports`** — package made visible to other modules; can be qualified (`exports x.y.z to com.foo`).
- **`opens`** — package made reflectively accessible; needed for serialisation, ORM, DI frameworks.
- **`uses` / `provides`** — service consumer / provider declarations; integrates `ServiceLoader`.
- **Explicit module** — has `module-info.java`; strong encapsulation enforced.
- **Automatic module** — JAR on module path without `module-info`; module name derived from JAR name; exports everything.
- **Unnamed module** — classpath fallback; can read all modules but other modules can't `requires` it.
- **`--add-opens`** — JVM flag to open a package at runtime; the standard workaround for framework reflection.
- **`--add-exports`** — JVM flag to export a package at compile/runtime.
- **`jlink`** — tool to assemble a custom JRE containing only the modules you use; cuts runtime size dramatically.
- **`jdeps`** — tool to analyse module dependencies; shows what's required.

**Why interviewers ask this**

Three signals. (1) **Awareness over adoption** — most senior candidates have *not* migrated production code to explicit modules. The interview signal is whether they know what JPMS does, what `--add-opens` is for, and why their Spring Boot app needs `--add-opens java.base/java.lang=ALL-UNNAMED` in some configurations. (2) **`jlink` usage** — the cloud-native sweet spot for JPMS is custom runtime images. A candidate who has used `jlink` to build a 70MB Docker base image instead of pulling the 200MB OpenJDK distribution understands the operational payoff. (3) **Service loader integration** — `ServiceLoader` with `uses`/`provides` is a clean alternative to scanning for `@Component`-style annotation discovery; senior engineers know it exists, even if they don't reach for it daily.

**Common confusions**

- "JPMS is required in modern Java" — it isn't; the classpath still works fine. JPMS is optional for application authors.
- "Putting `module-info.java` in my project makes it modular" — yes, but transitively all your dependencies must either be explicit modules, automatic modules, or you accept the runtime warnings.
- "`exports` and `opens` are the same" — they aren't; `exports` is for compile-time visibility, `opens` is for reflective access. A package can be opened but not exported.
- "`--add-opens` is a hack" — it's the *intended* migration escape hatch; the JDK explicitly added it because pure JPMS would have broken the world.
- "JPMS killed reflection" — no; it gates *cross-module* reflection. Within a module, reflection works as before.
- "Automatic modules are evil" — they're a transitional bridge. Use them to migrate gradually; don't ship them as a long-term design.

**What follows from this topic**

JPMS is the most-discussed-least-used Java feature. The practical payoff is `jlink` for Cloud-Native (smaller container images) and the operational knowledge of `--add-opens` for Spring/Hibernate compatibility. It also previews the trend toward stronger encapsulation in the JDK — every recent JDK release closes off more internals (`sun.misc.Unsafe` removal, restricted reflection by default), so even non-modular apps eventually have to deal with the consequences. A candidate who can explain `--add-opens` and `jlink` has done enough.

### Q272. JPMS basics — `module-info.java`.

Java Platform Module System (Java 9+) adds a layer above packages. Each module has a `module-info.java`:

```java
module com.example.api {
    requires java.sql;
    requires com.example.util;            // depends on another module
    requires transitive com.example.dto;  // re-exports — consumers see DTO too

    exports com.example.api;              // public API
    exports com.example.api.internal to com.example.tests;  // qualified

    opens com.example.entity to spring.core;  // reflection access
    opens com.example.dto;                     // reflection to anyone

    provides com.example.spi.Plugin
        with com.example.api.MyPlugin;         // service provider

    uses com.example.spi.Plugin;               // service consumer
}
```

**Directives:**
- `requires` — depends on another module
- `requires transitive` — consumers automatically get the transitive dep
- `requires static` — compile-time only (optional dep)
- `exports` — public API; without it, even `public` classes aren't visible across modules
- `exports ... to` — qualified, restricts to specific modules
- `opens` — allows deep reflection (Spring/Hibernate need this for entities)
- `opens ... to` — qualified opens
- `provides ... with` — declares this module provides a service implementation
- `uses` — declares this module consumes a service via `ServiceLoader`

### Q273. JPMS reflection access — `--add-opens`, `--add-exports`.

If you need reflection across modules without modifying source:

```bash
# Allow reflection from any unnamed module into java.base/java.lang
--add-opens java.base/java.lang=ALL-UNNAMED

# Allow access to internal API
--add-exports java.base/sun.security.util=com.example.app
```

**Why this comes up:**
- Spring needs to reflectively access user entities — fails on Java 17+ without `--add-opens`
- Many older libraries use `sun.misc.Unsafe` or `java.lang.reflect` deeply
- Hibernate, Mockito, Lombok rely on reflection access

**Permanent fix:** module author should `opens` the package. Workaround: caller passes `--add-opens` at runtime (e.g. via `JAVA_OPTS`, surefire `argLine`).

`module-info.java` defaults are strict — consider this when migrating.

### Q274. `ServiceLoader` and JPMS service providers.

JPMS formalises the `ServiceLoader` pattern for plugin architectures.

```java
// Service interface (in module com.example.spi)
public interface Plugin { void run(); }

// Provider (in module com.example.plugin.foo)
module com.example.plugin.foo {
    requires com.example.spi;
    provides com.example.spi.Plugin with com.example.plugin.foo.FooPlugin;
}

// Consumer (in module com.example.app)
module com.example.app {
    requires com.example.spi;
    uses com.example.spi.Plugin;
}

// In code:
ServiceLoader<Plugin> plugins = ServiceLoader.load(Plugin.class);
plugins.forEach(Plugin::run);
```

JDK uses this internally: JDBC drivers, charsets, security providers, locale providers all register via `ServiceLoader`.

**Pre-JPMS** — providers declared in `META-INF/services/com.example.spi.Plugin` text file. Still works in non-modular code; both mechanisms can coexist.

### Q275. Migrating a non-modular app to JPMS — strategies.

**Option 1: Stay non-modular (classpath).** Easiest — most apps do this. Loses module benefits.

**Option 2: Bottom-up migration.** Convert leaf modules first (no deps), add `module-info.java` to each, work upward through the dependency graph.

**Option 3: Top-down with automatic modules.** Apps' own JARs become "automatic modules" by sitting on the module path. Auto-modules export everything and require all other modules. Useful as a transitional state.

**Tooling:** `jdeps --generate-module-info ./out myapp.jar` produces a starter `module-info.java`.

**Common blockers:**
- Reflection-heavy frameworks (Spring, Hibernate) need explicit `opens` clauses
- Internal API usage flagged by `jdeps --jdk-internals`
- Split packages (same package across multiple JARs) forbidden in modules — must be merged

### Q276. `jlink` + JPMS — the smaller-runtime workflow.

```
1. App is fully modular (or auto-modular)
2. jdeps --list-deps app.jar → list of required modules
3. jlink --add-modules <those modules> --output ./runtime
4. Distribute ./runtime + your app
```

Result: 30-80MB runtime including only what your app uses, vs 300MB+ full JDK.

**Combine with:**
- `--strip-debug` — removes debug info
- `--compress=2` — strongest compression
- `--no-man-pages --no-header-files` — strip unused

**Use case:** containerised Java apps. Smaller runtime → smaller image → faster pulls and faster cold starts. **Spring Boot 3 native image** offers a different path for the same goal.

---

## Related Notes

- [[Java Theory - Interview Reference]] — JPM-tuned cram sheet (overlap is intentional)
- [[Algorithm Patterns]]
- [[System-Design-Patterns]]
- [[System Design Practice]]
- [[Neet-150-Pattens]]
