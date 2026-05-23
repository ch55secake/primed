---
created-on: "[[Journal/2026/May/12-May-Tuesday]]"
ctime: 2026-05-12 17:41:45
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# Kotlin Interview Primer — 170+ Questions

Comprehensive Q+A primer covering Kotlin for backend interviews, Android development, and senior roles. Each answer is interview-shaped: 2–6 sentences, code where useful, no textbook padding.

**Sections:**
1. [[#Kotlin Fundamentals]]
2. [[#Null Safety & Type System]]
3. [[#Functions, Lambdas & Functional Programming]]
4. [[#Collections & Sequences]]
5. [[#Coroutines]]
6. [[#OOP, Operators & Delegation]]
7. [[#Spring on Kotlin]]
8. [[#Testing in Kotlin]]
9. [[#Common Idioms, Pitfalls & Spot-the-Bug]]
10. [[#Android & Platform Context]]
11. [[#DSL Design]]
12. [[#Reflection, Metaprogramming & Compiler Plugins]]
13. [[#Performance, Memory & GC]]
14. [[#Java Interoperability]]
15. [[#Advanced Concepts & Miscellaneous]]

---

## Kotlin Fundamentals

### Summary

**What this topic covers**

The language primitives every Kotlin interviewer warms up on — the building blocks that define how Kotlin actually feels, and that every later topic in this primer silently assumes. Three concern areas live here: (1) the **value model** — `val` vs `var`, properties with auto-generated accessors, data classes, sealed classes, the `object` keyword for singletons and companion objects; (2) the **type system as ergonomics** — smart casts, type aliases, destructuring, scope functions (`let`, `run`, `apply`, `also`, `with`), `when` as a pattern-matching expression; and (3) the **inheritance posture** — classes and methods are `final` by default, `open` is opt-in, and `inline`/`reified` close the performance gap that higher-order functions would otherwise open. The 16 questions in this topic surface what every Kotlin engineer is expected to write without thinking.

**Mental model**

Think of Kotlin as a deliberate reaction to two decades of Java pain. Every defaults inversion you'll see — `val` over `var`, `final` over `open`, non-null over nullable, `private` constructors, `internal` visibility — is the language betting on safety first and giving you syntax to escape when you need to. The second mental shift is that **everything is an expression**. `if`, `when`, `try`, `return` — all return values, which is why `val x = if (...) a else b` is idiomatic and ternary operators don't exist. The third shift is **structural sugar that compiles to plain JVM bytecode**. Data classes are POJOs with generated `equals`/`hashCode`/`copy`. Extension functions are static methods with the receiver as their first argument. Companion objects are singletons. Scope functions are inline higher-order functions. None of this is magic — it's careful syntax over the same JVM you already know.

**Key terms**

- **`val` vs `var`** — immutable vs mutable reference; `val` is the default, `var` is opt-in. Note: `val` does not freeze the referenced object, only the binding.
- **Property** — first-class language construct; `val name: String` auto-generates a getter, `var` adds a setter, both can be customised with `get()`/`set(value)` blocks and an implicit `field`.
- **Data class** — auto-generates `equals`, `hashCode`, `toString`, `componentN`, and `copy`. Intended for value objects; combine with `val` properties.
- **Sealed class** — closed inheritance hierarchy; `when` over a sealed type is checked for exhaustiveness by the compiler, eliminating the `else` branch.
- **`object`** — singleton declaration; thread-safe lazy init handled by the JVM. Used for top-level singletons, companion objects, and anonymous instances.
- **Companion object** — singleton nested in a class, accessed as `MyClass.foo`; Kotlin's substitute for Java `static`, but can implement interfaces.
- **Extension function** — adds a method to an existing type without subclassing; resolves statically at compile time on the declared receiver type.
- **Scope functions** — `let`, `run`, `apply`, `also`, `with`; differ on receiver (`this` vs `it`) and return value (block vs receiver).
- **`open`/`final`** — Kotlin inverts Java: classes and methods are `final` by default; `open` opts in to inheritance.
- **`inline`** — copies the function body into each call site; eliminates lambda allocation for higher-order functions and enables `reified` type parameters.
- **`reified`** — preserves a generic type at runtime; only valid in `inline` functions because the type is substituted at the call site.
- **Smart cast** — after an `is` check, the compiler narrows the type automatically inside the branch.

**Why interviewers ask this**

Three signals. (1) **Idiom check** — can you write `data class User(val id: Int, val name: String)` and explain what gets generated without hedging? Junior candidates describe Kotlin as "Java with less code"; senior candidates name the specific defaults that change behaviour. (2) **Defaults awareness** — questions about `val`/`var`, `open`/`final`, and sealed classes test whether you understand that Kotlin's defaults express a design opinion, not just terseness. Get this right and the rest of the interview gets harder questions; get it wrong and you'll spend the rest of the round defending basics. (3) **Compilation model** — `inline`, `reified`, and extension functions look like magic until you can describe what the compiler emits. Interviewers want to know you can reason about cost, not just syntax.

**Common confusions**

- "`val` means immutable" — `val` means the *reference* cannot be reassigned. `val xs = mutableListOf<Int>(); xs.add(1)` is legal. For deep immutability, use `val` plus a read-only type like `List<T>`.
- "Companion objects are Java `static`" — they're singletons with their own type, can implement interfaces, and can be referenced as `MyClass.Companion`. The bytecode is closer to a nested singleton instance than a static field.
- "Extension functions are added to the class" — they're not. They compile to static methods with the receiver as the first argument. Member functions always win in dispatch; an extension with the same signature is shadowed.
- "Sealed classes are like enums" — enums enumerate *instances*; sealed classes enumerate *subtypes*. Each sealed subtype can carry its own state and be a `data class`.
- "`inline` is always faster" — `inline` removes call overhead and lambda allocation but duplicates bytecode at every call site. Overuse bloats class files and can defeat JIT inlining heuristics.
- "Scope functions are interchangeable" — they're not. Pick on two axes: do you want the receiver back (`apply`/`also`) or the block result (`let`/`run`/`with`), and do you want `this` (configuration) or `it` (chained transforms)?

**What follows from this topic**

Every later section assumes you can read this syntax fluently. Null Safety builds on properties and smart casts. Functions & Lambdas builds on `inline`, scope functions, and extension functions. Coroutines launches its builders from `companion object` singletons (`Dispatchers.IO`). DSL Design is just lambdas with receivers plus `@DslMarker`. If you stumble on `val` vs `var` in question one, the interviewer rarely makes it to coroutines.

### Q1. What is Kotlin and how does it relate to Java?

Kotlin is a statically-typed language that compiles to JVM bytecode (or JavaScript/Native), designed for interoperability with Java while reducing boilerplate and improving safety. It runs on the JVM, shares the standard library, and code from both languages can coexist in the same project seamlessly. Kotlin's goals: conciseness, safety (null safety, extension functions), and performance without sacrificing readability.

### Q2. What is the difference between `val` and `var` in Kotlin?

`val` declares an immutable (read-only) reference — you cannot reassign it after initialization, but if it holds a mutable object, the object's state can change. `var` declares a mutable reference that can be reassigned. Prefer `val` by default for safety and reasoning; only use `var` when reassignment is needed. This idiom differs from Java where everything is mutable by default.

### Q3. Explain Kotlin's property system and how it differs from Java getters/setters.

Kotlin unifies fields and accessors: `val name: String` automatically generates a getter, `var age: Int` generates both getter and setter. You can override the default behavior with custom get/set blocks. Unlike Java where fields and accessors are separate, Kotlin properties are first-class language constructs with implicit backing fields. This eliminates boilerplate while maintaining encapsulation.

```kotlin
var age: Int = 0
  get() = field
  set(value) { field = if (value > 0) value else 0 }
```

### Q4. What are extension functions and what are their use cases?

Extension functions allow you to add methods to a class without inheritance or delegation. Declared outside the class: `fun String.isEmail() = ...`. They are syntactic sugar — the receiver becomes the first parameter under the hood. Use cases: enriching standard library classes, adding domain-specific operations, creating fluent APIs. They are resolved at compile-time (unlike virtual methods), so they don't affect performance.

### Q5. Explain Kotlin's `companion object`.

A `companion object` is a singleton object nested inside a class, accessed via the class name without instantiation. It's Kotlin's way of implementing static members — `companion object { const val DEBUG = true }` inside a class is accessed as `MyClass.DEBUG`. Only one companion per class. Unlike Java static fields, companions can implement interfaces and have their own type.

```kotlin
class Logger {
  companion object {
    fun log(msg: String) = println(msg)
  }
}
Logger.log("Hello")
```

### Q6. What is the `object` keyword and when do you use it?

`object` declares a singleton instance — exactly one instance created lazily on first use. Used for: singletons (e.g., `object Database`), companion objects (nested), and anonymous objects. Thread-safe by default (JVM handles lazy init). Unlike `class`, you cannot instantiate `object` multiple times. Preferred over the Java singleton pattern because the language handles thread-safety and serialization.

### Q7. Explain data classes in Kotlin.

Data classes (`data class User(val id: Int, val name: String)`) auto-generate `equals()`, `hashCode()`, `toString()`, and `copy()` based on declared properties. Useful for value objects and DTOs. Kotlin enforces immutability by convention — declare properties as `val` and use `copy()` for modifications. Data classes must have at least one constructor parameter and cannot be abstract or sealed (can be sealed in Kotlin 1.1+).

### Q8. What are sealed classes and when should you use them?

Sealed classes restrict which classes can inherit from them — all subclasses must be defined in the same file (or package in newer versions). Useful for representing restricted hierarchies (e.g., `sealed class Result { data class Success(...) : Result() }`). When you exhaust all sealed subclasses in a `when`, the compiler enforces completeness without a default clause. Enables safe pattern matching and compile-time guarantees about variants.

### Q9. What is the difference between `open` and `final` in Kotlin?

Classes and methods are `final` by default in Kotlin — you cannot override them. To allow inheritance, explicitly mark with `open`. This is the opposite of Java (where everything is open by default). Design principle: you must explicitly allow override, preventing fragile base class problems. If you're designing a library, carefully choose which methods should be open; users cannot override final methods even if it breaks their use case.

### Q10. Explain the `inline` keyword and its purpose.

`inline` functions are substituted at the call site instead of being called normally — the compiler copies the function body into each call location. Useful for reducing function call overhead and enabling higher-order functions without allocation. `inline` is especially valuable for lambdas: `inline fun <T> List<T>.myForEach(action: (T) -> Unit)` avoids creating an object for the lambda. Caveat: can increase bytecode size if overused.

```kotlin
inline fun <T> measureTime(block: () -> T): T {
  val start = System.currentTimeMillis()
  val result = block()
  println(System.currentTimeMillis() - start)
  return result
}
```

### Q11. What are scope functions (`let`, `run`, `apply`, `also`, `with`)?

Scope functions execute a block of code in the context of an object, providing different return values and receiver access:
- `let`: receiver as parameter `it`, returns block result (good for null checks: `obj?.let { ... }`)
- `run`: receiver as `this`, returns block result (configuration blocks)
- `apply`: receiver as `this`, returns the receiver itself (builder pattern)
- `also`: receiver as parameter `it`, returns receiver (debugging, side effects)
- `with`: non-extension, receiver as `this`, returns block result (operate on multiple properties)

Choose based on whether you want the object back and how you access it.

### Q12. What is a type alias and when is it useful?

A type alias gives a new name to an existing type: `typealias Predicate<T> = (T) -> Boolean`. Used for: documenting intent (e.g., `typealias UserId = Int` is clearer than `Int` everywhere), shortening complex generic types (e.g., `typealias Network = suspend () -> Result`), and creating domain-specific types without runtime overhead. Type aliases are purely compile-time; they don't create new types at runtime.

### Q13. Explain Kotlin's smart cast feature.

After an `is` check, the compiler automatically casts the variable to the narrower type — no explicit cast needed. Example: `if (obj is String) println(obj.length)` — `obj` is smart-cast to `String` inside the block without writing `(obj as String).length`. Works with `is`, `is !`, `is not`, and in `when` expressions. This eliminates verbose casting code and reduces errors from forgetting to cast.

### Q14. What are destructuring declarations and where are they useful?

Destructuring lets you unpack components of an object into separate variables: `val (x, y) = point` unpacks a `data class Point(val x: Int, val y: Int)`. Works with: data classes (via generated `componentN()` functions), Pair/Triple, maps, and custom `operator fun componentN()`. Use cases: unpacking function returns, iterating over maps, pattern matching. Reduces intermediate variables and improves code readability.

```kotlin
val (name, age) = user
for ((key, value) in map) { ... }
```

### Q15. Explain when expressions in Kotlin.

`when` is Kotlin's pattern matching construct — more powerful than switch. Supports: value matching, ranges (`1..10`), type checking with smart cast, conditions, and an else clause. All branches return a value, so you can assign: `val category = when (x) { in 1..10 -> "small" else -> "large" }`. Unlike switch, it supports arbitrary expressions and is expression-oriented, making it safer and more functional.

```kotlin
when (x) {
  is String -> println(x.length)
  in 1..10 -> println("small")
  else -> println("other")
}
```

### Q16. What is a reified type parameter and why is it needed?

In Java/Kotlin, generic type information is erased at runtime — `List<Int>` and `List<String>` are indistinguishable. Reified type parameters (only in `inline` functions) preserve type info: `inline fun <reified T> parseAs(json: String): T`. At compile time, Kotlin substitutes the actual type, allowing `T::class` and `is T` checks. Essential for reflection-based libraries (JSON parsing, dependency injection). Cannot be used in non-inline functions.

```kotlin
inline fun <reified T> fromJson(json: String): T = gson.fromJson(json, T::class.java)
```

---

## Null Safety & Type System

### Summary

**What this topic covers**

The feature that sells Kotlin to most Java teams and the type system machinery that makes it work. Three concern areas live here: (1) the **nullability split** — `String` vs `String?`, the safe call (`?.`), Elvis (`?:`), and not-null assertion (`!!`) operators, `lateinit` as the escape hatch for non-null deferred init, and platform types (`String!`) where the Kotlin type system meets Java's null-unaware signatures; (2) **variance** — invariant by default, `out T` for covariance (producer), `in T` for contravariance (consumer), the difference between declaration-site and use-site variance, and how all of this plays against JVM type erasure; (3) **the top and bottom of the type lattice** — `Any` and `Any?` as the universal supertypes, `Nothing` as the bottom type that inhabits no value and is the return type of `throw`, and star projection `<*>` as "I don't care which subtype". The 14 questions here are the type-theory backbone of every other topic.

**Mental model**

Two ideas explain everything. (1) **Nullability is part of the type**, not a runtime flag. `String` and `String?` are distinct types, and the compiler refuses to let you call `.length` on a `String?` without unwrapping it. The JVM still represents them identically at runtime, but the compile-time distinction means most NPEs become compile errors. (2) **Variance is about who can substitute for whom**. `List<out Number>` means "I produce Numbers, so I can be a list of Int", whereas `Comparator<in Number>` means "I consume Numbers, so I can compare Ints". The mnemonic is PECS — producer extends (`out`), consumer super (`in`) — borrowed from Java but enforced by the compiler in Kotlin. Add a third idea: **Java interop is the leak**. Platform types exist because Java methods don't carry nullability, and `!!`, `lateinit`, and explicit annotations are the tools you use to plug the hole the JVM has left.

**Key terms**

- **Nullable type (`T?`)** — type that includes `null`; cannot be dereferenced without `?.`, `!!`, or a smart-cast guard.
- **Safe call (`?.`)** — short-circuits to `null` if the receiver is null; chains naturally: `user?.address?.city`.
- **Elvis (`?:`)** — supplies a fallback when the left side is null; commonly used with `return` or `throw` on the right.
- **Not-null assertion (`!!`)** — converts `T?` to `T`, throwing NPE if null; a code smell outside guard-clause patterns.
- **`lateinit`** — defers non-null var initialisation; `::prop.isInitialized` checks state. Cannot be used on primitives, `val`, or nullable types.
- **Platform type (`T!`)** — Kotlin's representation of a Java type with unknown nullability; you choose whether to treat it as `T` or `T?`.
- **Variance modifiers (`out`/`in`)** — declaration-site control of subtyping for generics; `out` for producers, `in` for consumers.
- **Type projection** — use-site variance: `List<out Any>` reads as "some list of unknown subtype of Any".
- **Star projection (`<*>`)** — "I don't care about the type parameter"; roughly `<out Any?>` for reads.
- **`Any` / `Any?`** — top types; `Any` is the non-null root, `Any?` includes null.
- **`Nothing`** — bottom type with no instances; return type of `throw`, `TODO()`, and infinite loops; subtype of every type.
- **Type erasure** — generics live only at compile time on the JVM; drives the existence of `reified` and forces `is List<*>` instead of `is List<String>`.

**Why interviewers ask this**

Three signals. (1) **Can you actually use the feature you're selling?** Every Kotlin candidate talks about null safety; few can explain why `String!` is unsafe or when `lateinit` beats nullable. (2) **Variance is the divider question** — junior candidates have memorised "PECS" but can't say why `MutableList<T>` is invariant. Senior candidates explain it in two sentences: a mutable list both produces and consumes `T`, so neither `out` nor `in` is sound. (3) **Java interop awareness** — most production Kotlin calls into Java libraries (Spring, JDBC, AWS SDKs). Knowing that platform types defer the null check to runtime, and that you should wrap Java APIs at the boundary with explicit `T?`, is what separates someone who has shipped Kotlin from someone who has only written greenfield demos.

**Common confusions**

- "`!!` is fine because I know it's not null" — if you knew, the compiler would too. `!!` is the language saying "I'm overriding the type checker"; treat every one as a future bug report.
- "`lateinit var x: String?` is allowed" — it's not. `lateinit` requires a non-nullable, non-primitive `var`. If you want nullability, just use `var x: String? = null`.
- "`String!` and `String?` are the same" — they're not. `String!` is a *flexible* type that the compiler will accept anywhere `String` or `String?` is expected without warning. That flexibility is what makes it dangerous.
- "Variance is the same as bounds" — bounds (`<T : Number>`) constrain *what* `T` can be; variance (`<out T>`) constrains *how* the parameter behaves in subtyping. They're orthogonal.
- "`Nothing` is `void`" — `void`/`Unit` is "returns nothing meaningful"; `Nothing` is "does not return". Functions that `throw` or loop forever return `Nothing`, and the compiler uses that to track unreachable code.
- "Star projection equals raw type" — raw types lose all type info at use; star projection is type-safe (`List<*>` lets you read `Any?` but blocks writes).

**What follows from this topic**

Everything downstream leans on this. Collections distinguishes `List<T>` from `MutableList<T>` and the variance of each. Coroutines uses `Nothing` as the return type of `cancel(cause)` paths and `suspend fun <reified T>` patterns for type-preserving builders. Reflection & Metaprogramming depends on `KClass<T>` and reified generics. Java Interoperability is just "platform types, all the way down". If null safety and variance feel slippery, the rest of the primer will too.

### Q17. Explain Kotlin's null safety and nullable vs non-null types.

Kotlin distinguishes nullable types (`String?`) from non-nullable types (`String`) at compile time. By default, a variable is non-nullable — you cannot assign `null` without explicitly opting in. Access a nullable via the safe call operator (`.?`), Elvis operator (`?:`), or null check. This eliminates null pointer exceptions at the language level — if your code compiles, most null errors are prevented. The most significant design difference from Java.

```kotlin
val name: String? = null
val length = name?.length ?: 0  // safe call + Elvis
```

### Q18. What is the Elvis operator and how does it work?

The Elvis operator (`?:`) provides a default value if the left side is null: `val name = user.name ?: "Unknown"`. If `user.name` is non-null, use it; otherwise use `"Unknown"`. Named after Elvis because `?:` looks like his hair and eyes. It's shorthand for the ternary: `if (x != null) x else y`. Commonly chained: `a ?: b ?: c ?: default`.

### Q19. Explain the not-null assertion operator (`!!`) and when to use it.

The `!!` operator (not-null assertion) converts a nullable type to non-nullable, throwing `NullPointerException` if it's null: `val name: String = user.name!!`. Use sparingly — only when you're certain the value is non-null. It defeats null safety, so avoid unless you have a strong reason (e.g., after a guard clause). Better alternatives: null-safe operators, Elvis operator, or `requireNotNull()` for clearer intent.

### Q20. What is platform-specific type and how does it relate to Java interop?

When calling Java code from Kotlin, generic types without explicit nullability become platform types (marked with `!`): `String!` means "could be null or not." This is Kotlin's way of saying "I don't know from the Java signature whether this is nullable." You must decide: treat as `String?` or `String`. Platform types are unsafe — if you get it wrong, you get NPE at runtime. Always be explicit when wrapping Java code.

### Q21. Explain the `lateinit` keyword and when to use it.

`lateinit` defers initialization of a non-nullable variable: `lateinit var name: String` — you promise to initialize it before use. Useful in Android (`onCreate` initializes properties), dependency injection, and test setup. Call `::name.isInitialized` to check. Throws `UninitializedPropertyAccessException` if accessed before init. Don't confuse with nullable: `lateinit` is non-nullable once init, while `String?` is nullable. Use when you cannot initialize in the constructor but need non-null safety afterwards.

### Q22. What is a bounded type parameter and how does it work?

Bounded type parameters restrict what types can be passed: `fun <T : Number> processNumber(x: T)` only accepts `Number` and subclasses. Use `where` for multiple bounds: `fun <T> process(x: T) where T : Number, T : Comparable<T>`. Bounds enable calling methods on the generic type safely — inside the function, you know `T` has `Number` methods. Covariance/contravariance extend this: `out T` (producer, covariant), `in T` (consumer, contravariant) control subtype relationships.

### Q23. Explain variance in Kotlin (`out` and `in`).

Variance controls whether a generic type is compatible with subtypes:
- **Invariant** (default): `List<Number>` is not compatible with `List<Int>`, even though `Int extends Number`
- **Covariance** (`out T`): `List<out Number>` accepts `List<Int>` (read-only, values come out)
- **Contravariance** (`in T`): `(in Number) -> Unit` accepts `(Int) -> Unit` (write-only, values go in)

Declaration-site variance (in interface): `interface Producer<out T> { fun get(): T }`. Use-site variance: `fun print(list: List<out Any>)`. Reduces type casts and enables flexible APIs while maintaining type safety.

### Q24. What is a type projection and how does it differ from bounds?

Type projection (`List<out String>`) limits what you can do with a type at the use site, whereas bounds (`<T : String>`) constrain the type at declaration. Projections are temporary — you read-only from `List<out String>` but the actual type is still known. Bounds commit: `<T : String>` means `T` is `String` or a subclass throughout the function. Use projections for maximum flexibility in consumers; use bounds when you need to call methods on the type.

### Q25. Explain any vs Nothing.

`Any` is the root class (like Java's `Object`) — every type is an `Any`. Useful for: type-erased collections (`List<Any>`), reflection. `Nothing` is the bottom type — it has no instances and can be assigned to any type. Used for: functions that never return normally (`fun fail(): Nothing = throw Exception()`), unreachable code. `Nothing` is useful for type checking unreachable branches and expressing "this doesn't return."

### Q26. What is star projection and when is it used?

Star projection (`List<*>`) means "I don't care about the type parameter." Equivalent to `List<out Any?>` — you can read but cannot write. Used when: the type parameter doesn't matter (e.g., checking list size), you have external Java code with raw types, or you want maximum flexibility. `List<*>` is less strict than `List<Any>` (which is contravariant in reading). Useful for interop with Java generics but lose type information.

### Q97. Explain contravariance in detail with an example.

Contravariance (`in T`) means type parameter can only be consumed (input), never produced. `(in Int) -> Unit` is a function accepting Int. A function accepting `Number` can be passed where `(in Int) -> Unit` is expected (contravariance). Why? If you pass `Number`, the caller can pass an `Int` (number is-a int? no), but... actually, `(in Int)` means "I only read Int", so you can safely pass `(Number) -> Unit` — it handles Int as a Number. Use case: callbacks, consumers. Declaration-site: `interface Consumer<in T> { fun consume(t: T) }`. Interface can be invariant by default.

### Q98. Explain declaration-site vs use-site variance.

Declaration-site variance is declared on the interface/class: `interface Producer<out T> { fun produce(): T }`. Applies to all usages. Use-site variance is declared where used: `fun print(p: Producer<out Any>)`. Scope: just this function signature. Declaration-site is cleaner (declare once, use everywhere); use-site is flexible (different variance in different contexts). If you control the interface, prefer declaration-site. If using external interfaces, use-site variance lets you be flexible.

### Q99. What are bounds and when do you use upper bounds vs lower bounds?

Upper bounds (`<T : Number>`) restrict T to Number and subclasses — you can call Number methods on T. Lower bounds (`<T : in Number>`) restrict T to Number and supertypes (rare, used with contravariance). Upper bounds are common: `fun <T : Comparable<T>> sort(list: List<T>)` ensures T is comparable. Lower bounds are advanced: `<T : in Number>` means "I only pass Number or supertypes". Most code uses upper bounds; lower bounds are niche (advanced generic patterns).

### Q100. Explain type erasure and how it affects Kotlin.

Generic type information is erased at runtime — `List<Int>` and `List<String>` are indistinguishable at runtime (both are `List`). This is a JVM limitation inherited by Kotlin. Consequences: you cannot `is T` check (type is erased), cannot `T::class.java` in non-inline functions, cannot create `T()` instances. Reified type parameters (inline functions) preserve type info by substituting the actual type at compile time: `inline fun <reified T> parseAs(json: String) = gson.fromJson(json, T::class.java)`. Workaround: pass `Class<T>` explicitly or use inline + reified.

---

## Functions, Lambdas & Functional Programming

### Summary

**What this topic covers**

The functional programming surface area of Kotlin and the lambda mechanics underneath. Three concern areas live here: (1) the **function-as-value model** — function types like `(Int) -> Int`, lambdas with their `it` shorthand and trailing-lambda syntax, higher-order functions that take or return functions, and function references (`::name`); (2) **inlining and its escape hatches** — `inline fun` to eliminate lambda allocation, `crossinline` when the lambda crosses an indirect call boundary, `noinline` when you need to store or pass a lambda by reference, and `tailrec` for tail-call elimination on recursive functions; (3) **functional patterns layered on top** — lambdas with receivers (the DSL primitive), pure functions, immutability, composition over inheritance, currying, partial application, and the `Maybe`/`Option` pattern that Kotlin partially subsumes through nullable types. The 16 questions in this topic cover the syntax and the underlying compilation cost.

**Mental model**

Two ideas anchor everything. (1) **Functions are values, but only at the source level**. `(Int) -> Int` looks like a first-class type, but on the JVM it compiles to an instance of `Function1<Int, Int>`. Every `list.map { it * 2 }` you write allocates a `Function1` object — unless `map` is `inline`, in which case the compiler substitutes the body and there is no allocation at all. That's why the Kotlin stdlib marks almost every collection operator `inline`. (2) **Receivers turn lambdas into mini-languages**. A normal lambda `(T) -> R` receives `T` as `it`; a lambda with receiver `T.() -> R` receives `T` as `this`, so inside the block you can call `T`'s members without prefixing. This single mechanic is what makes `apply { ... }`, `buildString { ... }`, `html { body { } }`, and Gradle's Kotlin DSL all look the way they do. Functional programming in Kotlin is pragmatic, not dogmatic — pure functions and immutability are encouraged, but `var` and mutation are still right there when you need them.

**Key terms**

- **Higher-order function** — a function that takes a function as a parameter or returns one. `list.map`, `list.filter`, and `list.fold` are the canonical examples.
- **Lambda** — anonymous function literal, written `{ x -> x * 2 }`. Single-parameter lambdas can use the implicit `it`.
- **Trailing lambda** — if a lambda is the last argument, it moves outside the parentheses: `list.map { it * 2 }`. If it's the only argument, the parentheses disappear entirely.
- **Function type** — `(A, B) -> C`; nullable as `((A) -> B)?`; suspending as `suspend (A) -> B`.
- **Function reference** — `::println`, `String::length`, `obj::method`; converts a named function into a value of function type.
- **Lambda with receiver** — `T.() -> R`; inside the block, `this` is the `T` instance. Powers scope functions and DSLs.
- **`inline`** — copies the function body and lambda bodies into each call site; eliminates allocation and enables non-local `return` from lambdas.
- **`crossinline`** — lambda will be called from a context where non-local return is unsafe (e.g. inside another lambda or a different execution context).
- **`noinline`** — lambda parameter that should *not* be inlined, typically because you want to store it or pass it onward by reference.
- **`tailrec`** — compiler converts a tail-recursive function into a loop, avoiding stack growth. Requires the recursive call to be the last operation.
- **Pure function** — output depends only on inputs; no side effects, no time dependence; trivially testable and parallelisable.
- **Composition** — building behaviour by combining functions (`f(g(x))`) instead of by extending classes; the functional alternative to inheritance.

**Why interviewers ask this**

Three signals. (1) **Cost awareness** — can you explain what `list.map { it * 2 }.filter { it > 10 }` actually costs? Junior candidates say "it makes a new list"; senior candidates name the two intermediate `ArrayList` allocations, the inlined lambda bodies, and the iterator overhead, then offer `asSequence()` as the alternative. (2) **Inline mastery** — `crossinline` and `noinline` are the questions that separate people who *use* the Kotlin stdlib from people who *write* libraries with it. Get them right and the interviewer knows you've shipped a Kotlin library. (3) **Functional fluency without dogma** — Kotlin shops are pragmatic; interviewers want candidates who can write functional pipelines for transforms and write loops with `var` when that's clearer. Memorising "immutability good, mutation bad" is a junior tell.

**Common confusions**

- "Lambdas are free" — they're not, unless they're inlined. Each non-inlined lambda is an object allocation per call. In tight loops this matters; in once-off code it doesn't.
- "`forEach` is the same as `map`" — `forEach` returns `Unit` and is for side effects; `map` returns a new collection. Using `forEach` when you want a transform is a code smell.
- "`tailrec` works on any recursive function" — only when the recursive call is *literally* the last expression. `n * factorial(n-1)` is not tail-recursive; `factorial(n-1, acc * n)` is.
- "`inline` is just an optimisation" — it's also a language feature. Non-local `return` from a lambda, `reified` type parameters, and zero-allocation higher-order functions all require `inline`.
- "Kotlin is a functional language" — it's a multi-paradigm language with strong functional support. It is not Haskell. There is no enforced purity, no required immutability, and no automatic currying.
- "`it` is always available" — `it` only exists in single-parameter lambdas. With two parameters you must name them: `{ a, b -> ... }`.

**What follows from this topic**

Collections & Sequences is this topic applied at scale. Coroutines builders (`launch`, `async`, `runBlocking`) are higher-order functions taking lambdas with receivers. DSL Design is lambdas with receivers plus `@DslMarker`. Spring on Kotlin uses lambdas-with-receivers for the `routes { }` DSL and for `beans { }` config. If you can't explain the cost of a lambda, you'll struggle to reason about coroutine and DSL performance later.

### Q27. What is a higher-order function and what is an example?

A higher-order function takes a function as a parameter or returns a function. Example: `fun apply(x: Int, op: (Int) -> Int): Int = op(x)` takes a function `op`. Another: `fun makeAdder(x: Int): (Int) -> Int = { y -> x + y }` returns a function. Higher-order functions enable functional programming patterns: map, filter, reduce. In Kotlin, functions are first-class values — you can pass them around like integers. The syntax `(Int) -> Int` declares a function type.

### Q28. Explain lambda syntax in Kotlin.

Lambdas are anonymous functions. Full syntax: `{ x: Int -> x * 2 }` — parameters, arrow, body. Shortened: `{ x -> x * 2 }` (type inferred), `{ it * 2 }` (implicit parameter `it`). If the lambda is the last argument, move it outside parentheses: `list.map { it * 2 }`. If only parameter, omit parentheses. Multiple parameters: `{ x, y -> x + y }`. Lambdas capture variables from enclosing scope — be aware of closure behavior.

### Q29. What is the difference between `map` and `forEach`?

`map` transforms each element and returns a new collection: `list.map { it * 2 }` returns a list of doubled values. `forEach` performs an action on each element and returns `Unit` (nothing): `list.forEach { println(it) }` is for side effects only. Use `map` when you care about the transformed result; use `forEach` when you only care about the action (printing, logging, mutating external state). Many codebases overuse `forEach` when `map` would be clearer.

### Q30. Explain `flatMap` vs `flatten`.

`flatMap` transforms each element into a collection and flattens: `list.flatMap { listOf(it, it * 2) }` on `[1, 2]` returns `[1, 1, 2, 2, 4]`. It's `map` then `flatten`. `flatten` only flattens: `listOf(listOf(1, 2), listOf(3, 4)).flatten()` returns `[1, 2, 3, 4]`. Use `flatMap` to transform and flatten in one step (avoids intermediate collection); use `flatten` when you only need to flatten an existing nested collection.

### Q31. What is a Sequence and when should you use it over List?

Sequences are lazy — operations are not evaluated until terminal operations (like `toList()` or `forEach`) are called. `listOf(1..1000).map { it * 2 }.filter { it > 100 }` creates two intermediate lists; `sequenceOf(1..1000).map { it * 2 }.filter { it > 100 }` chains lazily, computing only needed elements. Use Sequence for: chaining many transformations (efficiency), infinite streams, or when you don't need all results. For small collections or when you need random access, List is simpler.

### Q32. Explain tail recursion and the `tailrec` keyword.

Tail recursion is when a function's last operation is a recursive call (no further computation after). The `tailrec` keyword optimizes tail recursion into a loop, preventing stack overflow: `tailrec fun factorial(n: Int, acc: Int = 1): Int = if (n <= 1) acc else factorial(n - 1, n * acc)`. Without `tailrec`, deep recursion causes StackOverflowError. The compiler can only optimize if the call is truly last. Use `tailrec` for recursive algorithms on large inputs.

### Q33. What are function types and how are they declared?

Function types describe a function's signature: `(String, Int) -> Boolean` means a function taking `String` and `Int`, returning `Boolean`. Nullable functions: `((String) -> Int)?`. No parameters: `() -> Unit`. Suspend functions: `suspend (Int) -> String`. Function types are first-class — you can use them as type annotations, parameter types, and return types. They're syntactic sugar for SAM (single abstract method) interfaces, but cleaner and more idiomatic.

```kotlin
val adder: (Int, Int) -> Int = { a, b -> a + b }
```

### Q34. Explain Kotlin's DSL capabilities and why they're useful.

Kotlin's syntax allows building Domain-Specific Languages (DSLs) through lambdas with receivers, extension functions, and infix operators. Example: HTML builder `html { body { h1 { +"Hello" } } }`. DSLs: make APIs more expressive and readable, enable declarative configuration, and reduce boilerplate. Kotlin's syntax is perfect for this: lambdas with receivers (`{ receiver -> ... }`), infix functions, operator overloading all work together. DSLs are everywhere in Kotlin: Gradle, Spring, Exposed (SQL).

### Q35. What is a lambda with receiver and how does it differ from a normal lambda?

A lambda with receiver has access to the receiver object's members via `this`: `String.() -> Int` is a lambda on String. Inside, you can call String methods directly: `val len: String.() -> Int = { length }` calls `String.length` implicitly. Normal lambdas: `(String) -> Int` receive the object as a parameter `it`. Lambdas with receivers enable fluent APIs and DSLs — they feel like adding a method to a class temporarily. `apply`, `run`, `with` all use lambdas with receivers.

### Q36. Explain crossinline and noinline modifiers.

`crossinline` allows a lambda to be passed to nested functions (in the same inline function) without it being inlined itself — used when a lambda cannot be inlined due to non-local returns. `noinline` prevents a specific lambda parameter from being inlined, useful when you want to store the lambda in a field. Both are used with `inline fun` to fine-tune inlining behavior. Necessary when inline functions call other inline functions and you need to control which lambdas get inlined.

### Q124. Explain pure functions and their benefits.

Pure function: output depends only on inputs, no side effects (no mutation, I/O, time-dependent). Example: `fun add(a: Int, b: Int) = a + b` vs `fun add(a: Int, b: Int) { println("adding"); return a + b }` (side effect). Benefits: testable, composable, parallelizable, reasoned about. Functional programming encourages pure functions. Kotlin supports both (not purely functional like Haskell) — mix pure and effectful as needed. Mark pure functions explicitly or document them.

### Q125. Explain immutability and its relationship to functional programming.

Immutability: objects don't change after creation. `val` enforces this. Functional programming relies on immutability (no shared mutable state, easier parallelism). Kotlin encourages but doesn't enforce: `var` exists, mutable collections exist. Best practice: default to immutable (`val`, `List<T>`), use mutable only when necessary. Kotlin's syntax makes immutability ergonomic (`copy()` for updates, `map` chains instead of mutation).

### Q126. Explain composition and why it's superior to inheritance in functional programming.

Composition: build larger behavior from smaller functions (`f(g(x))`). Inheritance: share code through class hierarchy. Functional preference: composition (simpler, more flexible). Example: instead of `class LoggedRepository(val repo: Repository) : Repository by repo { override fun get() = { log(); repo.get() } }`, use `fun withLogging(repo: Repository) = Repository { log(); repo.get() }`. Composition is easier to test (less coupling), parallelize, and reason about. Functional languages heavily rely on composition.

### Q127. Explain currying and partial application in Kotlin.

Currying: transform function of N args into N functions of 1 arg each. Example: `fun add(a: Int, b: Int) = a + b` becomes `fun curried(a: Int) = { b: Int -> a + b }`. Partial application: call a multi-arg function with some args, get back a function of remaining args. Example: `fun multiply(a: Int, b: Int, c: Int) = a * b * c; fun multiplyBy2 = { b: Int, c: Int -> multiply(2, b, c) }`. Useful for: function composition, creating specialized functions. Kotlin doesn't have built-in support; you implement manually.

### Q128. Explain monads and Maybe/Option pattern in Kotlin.

Monad: a pattern for chaining computations that might fail/return nothing. `Maybe<T>` (also called `Option<T>`) wraps a value or nothing. Kotlin's `?.` and `?:` replicate this: `val result = obj?.method() ?: default`. Java Optional is similar: `Optional<T>`. Monadic pattern: `flatMap` chains operations, short-circuiting on None. Example: `Maybe.of(user).flatMap { getMaybeAge(it) }.flatMap { getCategory(it) }` — if any step returns nothing, the result is nothing. Kotlin's nullable types are a simplified monad.

---

## Collections & Sequences

### Summary

**What this topic covers**

The data-shaping vocabulary that almost every Kotlin codebase uses on every page. Three concern areas live here: (1) the **read-only vs mutable split** — `List<T>` vs `MutableList<T>`, `Map<K,V>` vs `MutableMap<K,V>`, and the factory functions that produce each (`listOf`, `mutableListOf`, `mapOf`, `mutableMapOf`, `linkedMapOf`, `sortedMapOf`, `buildList`, `buildMap`); (2) the **functional transformation toolkit** — `map`, `flatMap`, `flatten`, `filter`, `find`/`first`, `fold`/`reduce`, `any`/`all`, `groupBy`, `partition`, `distinct`/`distinctBy`, `take`/`drop` and their `While` variants, `withIndex`, `zip`/`unzip`; (3) the **eager-vs-lazy choice** — `List` operations are eager and materialise intermediate collections, `Sequence` operations are lazy and stream through one element at a time. The 11 questions in this topic cover the operators every Kotlin engineer is expected to read fluently and reach for without thinking.

**Mental model**

Two ideas explain almost everything. (1) **`List` is not `Collections.unmodifiableList`**. Kotlin's read-only interfaces are a *type-level* contract, not a runtime wrapper. At runtime, `List<T>` and `MutableList<T>` are usually the same `java.util.ArrayList` instance — the read-only view simply hides the mutating methods from the type checker. This matters in Java interop: a Kotlin `List<T>` exposed to Java is fully mutable from the Java side. (2) **`List` is eager, `Sequence` is lazy**. `xs.map { f(it) }.filter { p(it) }` on a `List` allocates a new list after `map`, then iterates it again to produce the filtered list — two passes, one intermediate allocation. The same pipeline on a `Sequence` fuses into a single pass: for each element, apply `f`, then `p`, then emit if true. Sequences pay a per-element overhead (each operator wraps the iterator) but win on long chains and large inputs. Lists win on short chains, small inputs, and operations that need random access or size.

**Key terms**

- **`List<T>` vs `MutableList<T>`** — read-only view vs read-write; the same underlying object on the JVM, distinguished only by interface.
- **`mapOf` / `mutableMapOf` / `linkedMapOf` / `sortedMapOf`** — immutable, mutable, insertion-ordered, key-sorted map factories. `to` is the infix that produces `Pair`s.
- **`buildList` / `buildMap`** — scoped builders that hand you a `MutableList`/`MutableMap`, then return an immutable result. Better than building-then-freezing manually.
- **`map`** — one-to-one transformation; returns a new collection.
- **`flatMap` vs `flatten`** — `flatMap` does `map` then `flatten` in one pass; `flatten` only flattens an already-nested collection.
- **`find` vs `first`** — both return the first match; `find` returns `null` on miss, `first` throws `NoSuchElementException`.
- **`fold` vs `reduce`** — `fold` takes an explicit accumulator seed and handles empty inputs; `reduce` uses the first element as the seed and throws on empty.
- **`any` / `all` / `none`** — boolean predicates; on empty inputs, `any` is false, `all` is true (vacuous), `none` is true.
- **`groupBy`** — partition into `Map<K, List<T>>` by a key function; `groupingBy` is the streaming variant for aggregations.
- **`partition`** — split into a `Pair<List<T>, List<T>>` by a predicate; single pass, two outputs.
- **`distinct` / `distinctBy`** — dedupe by `equals`/`hashCode` or by a selector; preserves first-occurrence order.
- **`Sequence<T>`** — lazy, single-shot pipeline; created with `asSequence()`, `sequenceOf`, or `sequence { yield(...) }`.

**Why interviewers ask this**

Three signals. (1) **Idiom fluency** — can you write `users.groupBy { it.team }.mapValues { it.value.sumOf { u -> u.score } }` and explain what each step costs? This is the bread-and-butter of Kotlin services and a fast filter for candidates. (2) **The sequence question** — "when would you reach for `asSequence()`?" separates candidates who memorise operators from candidates who understand allocation costs. The right answer names long chains, large or unbounded inputs, and short-circuiting operators like `first`/`take` where laziness pays off. (3) **Mutability discipline** — production Kotlin codebases default to `List<T>` everywhere; `MutableList<T>` should be visible only inside a function or behind a private field. Interviewers ask about this to test architectural taste, not syntax.

**Common confusions**

- "`List` is immutable" — it's *read-only* from the Kotlin side. The underlying object is usually mutable and is exposed as mutable to Java. For true immutability, use `kotlinx.collections.immutable` or wrap defensively.
- "Sequences are always faster" — false. For short chains over small lists, the per-element wrapper overhead of `Sequence` is more expensive than two array passes. Benchmark; don't cargo-cult.
- "`map` and `forEach` are interchangeable" — `forEach` returns `Unit`. If you ever bind the result of `forEach`, you've made a mistake.
- "`fold` and `reduce` differ only in seed" — they also differ in empty-input behaviour. `reduce` throws on empty; `fold` returns the seed. Production code prefers `fold` for this reason.
- "`distinct` is O(n)" — `distinct` is O(n) *with* a `HashSet` allocation. For tiny collections, a manual `toSet().toList()` may be clearer; for huge collections, `distinctBy` with a cheap key is cheaper than `distinct` with an expensive `equals`/`hashCode`.
- "`flatMap` works on `Map`" — `flatMap` on a `Map<K, V>` iterates entries. If you wanted to merge maps, use `+` or `putAll`, not `flatMap`.

**What follows from this topic**

Collections appears everywhere downstream. Coroutines uses `Flow` operators that mirror `Sequence`'s laziness for asynchronous streams. Performance & GC returns to the question of intermediate allocations and boxing in primitive-heavy pipelines. Spring's repository return types are almost always `List<T>` or `Flow<T>`, and Spot-the-Bug includes the classic `data class Point(var x, var y)` + `Set` mutation trap. Mastering collections is the difference between writing Kotlin and writing Java with Kotlin syntax.

### Q37. Explain the difference between MutableList and List.

`List<T>` is immutable — after creation, you cannot add/remove elements (no mutating methods). `MutableList<T>` extends `List` and adds mutating methods: `add()`, `remove()`, `clear()`. Kotlin distinguishes read-only from mutable by type, not by runtime checks (unlike Java's `Collections.unmodifiableList` which wraps). Use `List` by default for safety; only use `MutableList` when you need to mutate. This is a design principle: immutability by default makes code easier to reason about.

### Q38. What are the different ways to create a Map in Kotlin?

- `mapOf(1 to "a", 2 to "b")` — immutable map with `to` infix function
- `mutableMapOf(1 to "a")` — mutable map
- `linkedMapOf(...)` — maintains insertion order
- `sortedMapOf(...)` — sorts by keys
- `map { ... }.toMap()` — from a list of pairs
- Map builders: `buildMap { put(1, "a") }` (creates immutable after building)

The `to` infix function creates a `Pair`: `1 to "a"` is `Pair(1, "a")`. Use immutable `Map` by default unless you need mutability.

### Q39. Explain groupBy and its use cases.

`groupBy` partitions a collection into a map of groups: `students.groupBy { it.grade }` returns `Map<Grade, List<Student>>`. Useful for: organizing data by a key, analyzing distributions, generating reports. Example: `lines.groupBy { it.first() }` groups words by their first character. The result is a map where keys are the grouping criteria and values are lists of matching elements. Combine with `mapValues` to transform groups: `groupBy { it.grade }.mapValues { it.value.size }`.

### Q40. What is the difference between find and first?

`find { condition }` returns the first matching element or `null` (nullable). `first { condition }` returns the first matching element or throws `NoSuchElementException` if not found. Use `find` when absence is normal (nullable result); use `first` when you expect an element to exist (fail fast on absence). There's also `firstOrNull` (same as `find`), `findLast`, and `last` for reverse variants.

### Q41. Explain fold and reduce.

`fold(initial) { acc, x -> ... }` starts with an initial value and accumulates: `listOf(1,2,3).fold(0) { acc, x -> acc + x }` returns 6. `reduce { acc, x -> ... }` is like `fold` but starts with the first element: `listOf(1,2,3).reduce { acc, x -> acc + x }` also returns 6. Difference: `fold` works on empty lists (returns initial), `reduce` throws on empty lists. Use `fold` when you need a starting value (like summing starting from 0); use `reduce` for simpler reductions.

### Q42. What is the difference between `any` and `all`?

`any { condition }` returns true if at least one element matches. `all { condition }` returns true if all elements match. Both return false on empty collections (except `any` on empty is false, `all` on empty is true by vacuous truth). Example: `list.any { it > 10 }` (is there a large element?), `list.all { it > 0 }` (are all positive?). Often combined: `if (!any { it.invalid } && all { it.verified })` — logical operations on collections.

### Q43. Explain distinct, distinctBy, and dropDuplicates.

`distinct()` returns unique elements (uses `equals` and `hashCode`). `distinctBy { selector }` removes duplicates based on a property: `users.distinctBy { it.email }` keeps first occurrence per email. No `dropDuplicates` in standard — `distinct` is the function. For multisets or complex dedup logic, use `groupBy` then `mapValues { it.value.first() }`. Order is preserved (removes duplicates, keeps first). Useful for: removing API duplicates, deduping database results.

### Q44. What is the difference between take and drop?

`take(n)` returns first n elements. `drop(n)` skips first n elements and returns the rest. `takeWhile { condition }` returns elements while condition is true. `dropWhile { condition }` skips while condition is true. Example: `list.take(3)` gets `[1, 2, 3]` from `[1..5]`; `list.drop(2)` gets `[3, 4, 5]`. Useful for: pagination (`drop(page * size).take(size)`), ignoring headers, reading partial streams.

### Q45. Explain withIndex and its use case.

`withIndex()` pairs each element with its index: `list.withIndex()` returns `List<IndexedValue<T>>`. Access via `.index` and `.value`. Useful when you need indices in a functional chain: `list.withIndex().filter { it.index % 2 == 0 }` gets even-indexed elements. Alternative to manual indexing: `for ((index, value) in list.withIndex())` using destructuring. Cleaner than `list.mapIndexed { i, x -> ... }` when you need only indices, not a transformation.

### Q46. What is partition and when is it useful?

`partition { condition }` splits a collection into two: matching and non-matching. Returns a `Pair<List, List>`: `val (evens, odds) = list.partition { it % 2 == 0 }`. Useful for: separating valid/invalid items, grouping by a binary condition, parallel processing (process evens and odds separately). More explicit than two separate `filter` calls (which iterates twice). Example: `results.partition { it.success }.let { (good, bad) -> ... }`.

### Q47. Explain zip and unzip.

`zip(other)` pairs elements from two collections: `list1.zip(list2)` returns `List<Pair<T, U>>` with minimum length. `zipWithNext()` pairs consecutive elements. `unzip()` reverses: `pairs.unzip()` returns `Pair<List<T>, List<U>>`. Example: `listOf("a", "b").zip(listOf(1, 2))` returns `[(a, 1), (b, 2)]`. Useful for: combining parallel streams, aligning data, transposing. Watch out: zip truncates to the shorter list.

---

## Coroutines

### Summary

**What this topic covers**

The async story that defines modern Kotlin and the topic that dominates any serious interview. Three concern areas live here: (1) the **execution model** — coroutines as lightweight suspendable computations, `suspend` functions and suspension points, the `Continuation` machinery the compiler emits, threads vs coroutines, dispatchers (`Main`, `IO`, `Default`, `Unconfined`), and `CoroutineContext` as the bag-of-elements that carries job, dispatcher, and exception handler across suspensions; (2) the **structured concurrency model** — `CoroutineScope`, parent-child `Job` hierarchies, `launch` vs `async` vs `runBlocking` vs `withContext`, cooperative cancellation with `isActive`/`yield`/`ensureActive`, `withTimeout`, `SupervisorJob` for independent children, and `CoroutineExceptionHandler` for unhandled failures; (3) the **stream layer on top** — `Flow` as a cold async sequence, `StateFlow` and `SharedFlow` as hot state and event streams, operators (`map`, `filter`, `flatMapLatest`, `collect`, `launchIn`), `Channel`s for actor-style message passing, backpressure strategies, and `Mutex` for coroutine-safe locking. The 25 questions here are the single largest section of this primer for a reason.

**Mental model**

Three ideas anchor everything. (1) **`suspend` is a compile-time transform, not a runtime construct**. Every `suspend fun` is rewritten by the compiler into a state machine that takes a hidden `Continuation` parameter; suspension points are state transitions, and when the coroutine resumes the JVM jumps back into the same state machine. There are no green threads, no fibers — just compiler-generated callbacks that happen to read like sequential code. (2) **Structured concurrency means jobs form a tree**. Every coroutine launched from a scope becomes a child of that scope's job. Cancelling the scope cancels every descendant. A child's failure cancels its siblings (unless the parent is a `SupervisorJob`). This is the safety property that distinguishes coroutines from threads: leaks are nearly impossible if you avoid `GlobalScope`. (3) **Cold vs hot is about who drives emission**. A cold `Flow` runs its block once per collector; a hot `SharedFlow`/`StateFlow` runs forever and broadcasts to whoever is listening. Cold flows are pull-based; hot flows are push-based.

**Key terms**

- **Coroutine** — a suspendable computation; cheap (thousands per thread) because suspension means returning to the dispatcher, not blocking the OS thread.
- **`suspend` function** — function the compiler may suspend at any call to another `suspend` function; can only be called from another suspend context.
- **`CoroutineScope`** — the entry point for launching coroutines; bound to a lifetime via its `Job`.
- **`Job`** — handle to a coroutine; supports `cancel`, `join`, `invokeOnCompletion`; forms a parent-child tree.
- **`Dispatcher`** — chooses the thread or thread pool a coroutine resumes on; `Main`, `IO` (large pool, blocking-friendly), `Default` (CPU-bound, sized to cores), `Unconfined` (resumes on caller's thread).
- **`launch` vs `async` vs `withContext` vs `runBlocking`** — fire-and-forget, deferred result, context switch with a value, and thread-blocking bridge respectively.
- **Structured concurrency** — every coroutine is a child of some scope; cancellation and failure propagate through the tree.
- **`SupervisorJob`** — child failures don't cancel siblings; used for independent concurrent tasks (e.g. multiple network calls).
- **`CoroutineExceptionHandler`** — last-resort handler for uncaught exceptions in `launch` (not `async`, which surfaces on `await`).
- **`Flow`** — cold async stream; lazy, single-shot per collector; built with `flow { emit(...) }` or `flowOf`.
- **`StateFlow` / `SharedFlow`** — hot flows for state (always has a current value) and events (configurable replay/buffer).
- **`Channel`** — coroutine-safe queue with `send`/`receive`; supports buffered, rendezvous, and conflated configurations.

**Why interviewers ask this**

Three signals. (1) **Concurrency reasoning** — backend and Android both rely on coroutines for everything from HTTP handlers to UI state. Interviewers want to hear you talk about cancellation, dispatcher selection, and structured concurrency without prompting. (2) **The cancellation question** — "what happens if you call `delay(1000)` inside a `while(true)` loop and then cancel the scope?" The right answer names `delay` as a suspending function that respects cancellation, the `CancellationException` that propagates through `finally` blocks, and the cooperative-cancellation rule that pure-CPU loops without `yield` won't stop. Get this wrong and you've shipped a coroutine leak. (3) **Flow fluency** — modern Kotlin codebases (especially on Android and in reactive backends) use `StateFlow` for view state, `SharedFlow` for events, `Flow` for streams. Knowing when to use which, and how `flatMapLatest` cancels the previous inner flow, is what senior interviews probe.

**Common confusions**

- "Coroutines are threads" — they're not. A coroutine running on `Dispatchers.IO` may resume on a different thread than it started on; thread-local state is a footgun, dispatcher-context is the right tool.
- "`async` is for concurrency, `launch` is for sequential" — both are concurrent. The difference is `async` returns a `Deferred<T>` you `await` for a value; `launch` returns a `Job` with no result.
- "`runBlocking` is fine in production" — almost never. `runBlocking` blocks an OS thread for the duration of the coroutine; in a server, this defeats the entire async model.
- "Cancellation is automatic" — it's *cooperative*. A coroutine that runs a tight CPU loop without ever calling a suspension point cannot be cancelled. You must check `isActive` or call `yield()`/`ensureActive()`.
- "`async` exceptions propagate automatically" — they propagate when you `await`, not when they're thrown. If you `async { throw ... }` and never `await`, the exception sits silently in the `Deferred` until the parent job collects it.
- "`StateFlow` and `LiveData` are the same" — `StateFlow` is multiplatform, coroutine-native, and not lifecycle-aware. `LiveData` is Android-only and observes the `Lifecycle`. They overlap in role but differ in mechanism.

**What follows from this topic**

Coroutines underpins every modern Kotlin domain. Spring on Kotlin uses `suspend` controller methods and `Flow` return types. Android & Platform Context combines `viewModelScope` with `StateFlow` for UI state. Testing in Kotlin uses `runTest` and virtual time. Spot-the-Bug includes the classic race-condition example because coroutines do not give you free thread safety. If coroutines feel shaky, every other topic from here on becomes harder.

### Q48. What is a coroutine and how does it differ from a thread?

A coroutine is a lightweight abstraction for concurrent code — many can run on a single thread by suspending and resuming. Threads are OS-level; coroutines are language-level. Threads are heavy (stack memory, OS scheduling overhead); coroutines are cheap (thousands can run efficiently). A coroutine can suspend at suspension points (marked `suspend`) and resume later without blocking the thread. Ideal for I/O-heavy code (network, database) where threads would waste resources waiting.

### Q49. Explain suspend functions and suspension points.

A `suspend` function can be paused and resumed: `suspend fun fetchData(): String`. The `suspend` keyword marks that this function can call other suspend functions and be suspended. Suspension points are calls to other suspend functions (or explicit `suspendCancellableCoroutine`). When a coroutine hits a suspension point, it yields the thread to other work — the thread is not blocked. Suspension points are checked at compile time. You cannot call suspend functions from normal code; you need a `CoroutineScope`.

### Q50. What are launch and async builders?

`launch` starts a coroutine that returns `Job` — fire-and-forget, returns immediately. `async` starts a coroutine that returns `Deferred<T>` — you must await the result. Use `launch` for tasks you don't need a result from (logging, analytics). Use `async` when you need the result and want to await it: `val result = async { fetchData() }.await()`. Both inherit parent scope by default (structured concurrency). Neither blocks the thread — they suspend, allowing other work to proceed.

```kotlin
GlobalScope.launch { delay(100) }  // fire-and-forget
val result = GlobalScope.async { "hello" }.await()
```

### Q51. Explain CoroutineScope and GlobalScope.

`CoroutineScope` defines the lifetime and context of coroutines launched in it. `GlobalScope` is a scope with no parent — coroutines don't care when they finish. Avoid `GlobalScope` in production code (leaks resources, hard to cancel). Instead, create scopes tied to lifecycles: `viewModelScope`, `lifecycleScope` (Android), or explicit scopes via `MainScope()`. Structured concurrency ties scope lifetime to a parent job — when scope is cancelled, all children cancel. Essential for resource cleanup.

### Q52. What are Dispatchers and how do they work?

Dispatchers specify which thread pool a coroutine runs on:
- `Dispatchers.Main` — main/UI thread (Android, Swing)
- `Dispatchers.IO` — thread pool optimized for I/O (network, files)
- `Dispatchers.Default` — thread pool for CPU-heavy work
- `Dispatchers.Unconfined` — resumes on the thread that called resume (avoid unless you know why)

You specify via `launch(Dispatchers.IO) { ... }` or `withContext(Dispatchers.IO)`. Dispatchers enable switching contexts (e.g., fetch on IO, update UI on Main). The thread pool size is tuned automatically; don't create too many custom dispatchers.

### Q53. What is withContext and when do you use it?

`withContext(dispatcher)` suspends, switches to a different dispatcher, executes the block, then returns to the original dispatcher. Example: `val data = withContext(Dispatchers.IO) { fetchFromNetwork() }` fetches on IO thread, then resumes on the caller's dispatcher. Used for: context switching without spawning a new coroutine, atomic operations on different threads. Unlike `launch`, `withContext` returns a value and suspends, so it's useful for sequential operations requiring different dispatchers.

### Q54. Explain coroutine cancellation.

Cancellation is cooperative — calling `job.cancel()` sets a flag, but the coroutine must check for cancellation and exit. Check via `yield()` or `isActive`. Example: `while (isActive) { ... }` exits gracefully when cancelled. `delay()`, `withTimeout()`, and other suspend functions respond to cancellation. If a coroutine ignores cancellation, it runs until completion. Always use `try/finally` for cleanup (closing resources, logging) — cancellation throws `CancellationException` but finally blocks always run.

```kotlin
try {
  while (isActive) { delay(100); ... }
} finally {
  cleanup()
}
```

### Q55. What is withTimeout and withTimeoutOrNull?

`withTimeout(timeMillis) { ... }` throws `TimeoutCancellationException` if the block doesn't complete in time. `withTimeoutOrNull(timeMillis) { ... }` returns null instead of throwing. Example: `val data = withTimeoutOrNull(5000) { fetchData() }` — if fetch takes > 5s, data is null. Useful for: preventing hung operations, respecting user-visible timeouts (network requests, animations). Cancellation happens gracefully — the coroutine exits, finally blocks run, and exceptions are handled.

### Q56. Explain Flow and cold vs hot streams.

`Flow<T>` is a coroutine-friendly stream — lazily evaluated, cold by default (each collector triggers its own execution). Example: `flow { emit(1); emit(2) }` doesn't execute until `collect { ... }` is called. Hot streams (like `SharedFlow`, `StateFlow`) emit regardless of collectors. `Flow` is like Sequence (lazy); hot streams are like List (eager). Use `Flow` for one-time data streams (API responses, database queries); use `StateFlow` for state (current user, UI state) where late collectors need the latest value.

### Q57. What are operators on Flow (map, filter, flatMapLatest)?

Flow operators transform the stream:
- `map { transform }` — transforms each element
- `filter { condition }` — keeps matching elements
- `flatMapLatest { Flow }` — replaces the inner flow (cancels previous)
- `take(n)` — emits first n elements
- `collect { action }` — terminal operation, performs action on each

`flatMapLatest` is special — when a new upstream value arrives, it cancels the previous inner flow and starts a new one. Useful for: searches (when user types, cancel previous search), API requests (fetch latest). Operators are chainable and lazy — nothing happens until `collect` is called.

### Q58. Explain StateFlow and ReplayCache.

`StateFlow<T>` is a hot, state-holding flow — always has a current value, new collectors get the latest immediately. Created via `MutableStateFlow(initialValue)`. Example: `val count = MutableStateFlow(0)` and `count.value = 1`. Unlike `Flow`, `StateFlow` requires a current value and replays it to new collectors. Use for: UI state, reactive variables. `Flow` also supports `replay(n)` to replay n emissions: `flow.replay(1)` acts like `StateFlow` but for one-time flows.

### Q59. Explain SharedFlow.

`SharedFlow<T>` is a hot, multi-collector flow with configurable replay and buffering. `MutableSharedFlow(replay = 1)` replays 1 emission to new collectors. Useful for: events (multiple interested parties), bus patterns, state sharing. Unlike `StateFlow` (which is always `replay(1)`), `SharedFlow` is flexible. Example: `val events = MutableSharedFlow<Event>()` and multiple collectors `events.collect { ... }` all receive the same events. Watch out: buffering = unbounded or configurable (affects memory).

### Q60. What is the difference between Flow.collect and Flow.launchIn?

`collect { ... }` is a suspend function — it collects all emissions, blocks until flow completes. Must be called from a coroutine. `launchIn(scope)` launches collection in a background coroutine within the scope — returns immediately. Example: `stateFlow.launchIn(viewModelScope)` starts collection without blocking; `flow.collect { ... }` inside a coroutine waits for all emissions. Use `launchIn` for side effects (observation); use `collect` when you need sequential processing or a value afterwards.

### Q101. Explain the job hierarchy and structured concurrency.

Structured concurrency: parent-child job relationships ensure orderly cancellation and error handling. When you `launch { ... }` in a scope, the created job becomes a child. If parent is cancelled, all children cancel. If a child fails, parent is notified (default: cancels all siblings). Example: `GlobalScope.launch { }` has no parent (bad); `viewModelScope.launch { }` has viewModelScope as parent (good). This prevents resource leaks and ensures cleanup. Jobs form a tree; cancellation/failure propagates upward and sideways.

### Q102. What is Dispatchers.Main and why do you need it?

`Dispatchers.Main` executes coroutines on the main/UI thread. Used for: UI updates, event handlers. Other dispatchers (IO, Default) execute on thread pools. You switch to Main via `withContext(Dispatchers.Main)` after background work. Example: `val data = withContext(Dispatchers.IO) { fetch() }; withContext(Dispatchers.Main) { ui.update(data) }`. `Dispatchers.Main` is platform-specific — Android provides it, JVM/desktop don't have a default. Not specifying a dispatcher uses the inherited one (context propagation).

### Q103. Explain channels and their relationship to Flow.

Channels (`Channel<T>`) are queues for coroutine communication — `send()` and `receive()` are suspend functions. Example: `val channel = Channel<Int>(); launch { channel.send(1) }; channel.receive()`. Hot by default (emit regardless of receivers). Flow is a Channel wrapper with operators (map, filter, etc.). Channels are lower-level; Flow is higher-level and easier to use. Channels useful for: actor models, complex coordination. Flow preferable for most cases.

```kotlin
val channel = Channel<Int>()
launch { channel.send(1) }
val x = channel.receive()
```

### Q104. Explain context preservation and CoroutineContext.

`CoroutineContext` carries context across suspend points — job, dispatcher, exception handler, etc. When you `launch { }`, the context is inherited: same dispatcher, job parent, etc. You can override: `launch(Dispatchers.IO + exceptionHandler) { }` combines contexts. `withContext(dispatcher)` temporarily switches context, then restores. Context propagation ensures: cleanup works, exceptions are handled, dispatchers are respected. You rarely create context manually; Spring/Android/Ktor manage it.

### Q105. Explain exception handling in coroutines (CoroutineExceptionHandler).

By default, unhandled exceptions crash the coroutine and its scope. Use `CoroutineExceptionHandler` to customize: `val handler = CoroutineExceptionHandler { _, ex -> logger.error(ex) }`. Launch with handler: `launch(handler) { throw Exception() }`. The handler is called, exception doesn't crash. Caveat: handler only catches uncaught exceptions from `launch` (fire-and-forget); `async` stores exceptions in the result, you handle them on `await()`. Always handle exceptions in production code.

### Q106. Explain the `runBlocking` function and when to use it.

`runBlocking` blocks the current thread, running a coroutine to completion, then returns. Example: `runBlocking { delay(1000); println("done") }` — blocks for 1 second. Used in: main functions (to bridge suspend to blocking), integration tests, demonstrations. Avoid in production async code — blocking defeats the purpose of coroutines. Used in examples because `main` isn't suspend. For tests, use `runTest` (kotlinx-coroutines-test) instead.

### Q107. What is the difference between `launch`, `async`, and `runBlocking`?

- `launch`: fire-and-forget, returns `Job`, called from coroutine or suspension point, non-blocking
- `async`: returns result via `await()`, called from coroutine, non-blocking, returns `Deferred<T>`
- `runBlocking`: blocks current thread, creates a bridge for suspend code, not a true coroutine builder

Use `launch` for side effects (logging, analytics). Use `async` for results you need to await. Use `runBlocking` only to bridge suspend to blocking code (main functions, tests). Mixing them: `launch { async { ... }.await() }` is valid but async's advantage is moot (you're not parallelizing).

### Q134. Explain actor pattern with coroutines.

Actor pattern: encapsulate mutable state and expose it via message passing (instead of shared mutable state). Kotlin: `actor<Message> { for (msg in channel) { when (msg) { ... } } }` creates an actor. Send messages: `actor.send(Message(...))`. Useful for: shared resources (database connections, caches), avoiding locks. Actors process messages serially (no concurrency within actor), making state updates safe. Actors scale better than threads because they're lightweight.

```kotlin
sealed class CounterMsg
object IncMsg : CounterMsg()
class GetMsg(val response: CompletableFuture<Int>) : CounterMsg()

val counter = actor<CounterMsg> {
  var count = 0
  for (msg in channel) {
    when (msg) {
      is IncMsg -> count++
      is GetMsg -> msg.response.complete(count)
    }
  }
}
```

### Q135. Explain backpressure and how to handle it in coroutines.

Backpressure: producer is faster than consumer, so messages pile up (memory issue). Solutions: buffer (bounded, slow producer when full), drop (drop old messages), suspend (producer waits for consumer). `Channel<T>(capacity)` sets buffer size. `Channel(UNLIMITED)` buffers everything (careful!), `Channel(RENDEZVOUS)` has no buffer (producer waits). `Flow` has built-in backpressure — it's cold, so producer doesn't emit until consumer collects. Hot flows (`SharedFlow`, `StateFlow`) with bounded buffers can handle backpressure via drop/buffer strategies.

### Q136. Explain mutex and the difference from Java locks.

Mutex: mutual exclusion lock for coroutines (non-blocking). `val lock = Mutex(); lock.withLock { ... }` ensures only one coroutine enters the block at a time. Other coroutines suspend, not block. Advantage over `synchronized`: doesn't block threads. Use `Mutex` in coroutine code; use `ReentrantLock` in blocking code. Kotlin also has `RwLock` (multiple readers, single writer). Avoid low-level locking; high-level patterns (actors, channels) are often better.

### Q137. Explain supervisor jobs and error propagation.

`SupervisorJob` changes error propagation: when a child fails, other children aren't cancelled (only the failed one). Regular job (default): child failure cancels all siblings. Example: `launch(SupervisorJob()) { launch { throw Ex() }; launch { ... } }` — second launch continues even if first throws. Useful for: independent tasks (one failure shouldn't stop others). Exception still isn't caught (must handle with try/catch or exception handler). Supervisor jobs require more thought (not a silver bullet).

### Q138. Explain the `yield` function and cooperative cancellation.

`yield()` is a suspension point: coroutine can be cancelled here. Also yields the thread to other work (scheduler point). Use in loops to allow cancellation: `while (isActive) { work(); yield() }` checks for cancellation and lets scheduler run other coroutines. Without `yield()`, a long-running coroutine blocks others (busy loop). Suspension functions like `delay()` and `suspendCancellableCoroutine` include yield implicitly. Manual yielding is a cooperative concurrency pattern — essential for large computations.

---

## OOP, Operators & Delegation

### Summary

**What this topic covers**

The object-oriented machinery Kotlin inherits from Java plus the operator and delegation features that distinguish it. Three concern areas live here: (1) the **classical OOP refresher** — abstract classes vs interfaces, overriding vs overloading, the Liskov substitution principle, interface segregation, composition vs inheritance, the template method pattern, and the factory pattern as Kotlin reshapes it with companion-object `invoke`; (2) **delegation** — class delegation via `by` to forward an interface to a backing object, property delegation via `by` to a delegate that implements `getValue`/`setValue`, and the standard delegate suite (`lazy`, `observable`, `vetoable`, `notNull`, `Delegates.map`); (3) **operator overloading** — `plus`, `minus`, `times`, `div`, `rem`, `compareTo`, `equals`, `get`/`set` for `[]`, `invoke` for `()`, `rangeTo` for `..`, `iterator` for `for`, plus the `componentN` operators that power destructuring. The 14 questions in this topic cover the OO design vocabulary every senior interviewer expects.

**Mental model**

Two ideas explain almost everything. (1) **Delegation is composition with syntax sugar**. `class LoggedList<T>(private val backing: MutableList<T>) : MutableList<T> by backing` tells the compiler to generate every `MutableList` method as a forwarding call to `backing`. You then override only what you want to change. This is the decorator pattern made cheap — no boilerplate, no risk of forgetting a method. Property delegation generalises the same idea: `val name by lazy { ... }` lets a delegate object intercept get/set, hiding the storage and timing decisions. (2) **Operators are just methods with conventional names**. `a + b` compiles to `a.plus(b)`. `a[i]` is `a.get(i)`. `a()` is `a.invoke()`. There's no special operator machinery; you implement `operator fun plus(other: T): T` and the compiler wires up the syntax. This is why DSLs can use `+`, `..`, and `()` so freely — they're not magic, just convention-bound method names.

**Key terms**

- **Class delegation (`by`)** — forwards an implemented interface to a constructor-provided object, generating each forwarded method automatically.
- **Property delegation (`by`)** — replaces a property's backing field with a delegate object implementing `getValue`/`setValue` (or `ReadOnlyProperty`/`ReadWriteProperty`).
- **`lazy`** — standard delegate; computes once on first access, caches the result, thread-safe by default (configurable).
- **`observable`/`vetoable`** — delegates that fire callbacks on assignment; `vetoable` can reject the new value.
- **Abstract class vs interface** — abstract classes can hold state and have a constructor; interfaces can have default methods but no state (only abstract `val`s with no backing field).
- **`override` / `open` / `final`** — Kotlin requires explicit `open` to allow overriding, and explicit `override` when subclassing. Overriding a method preserves `open` by default; mark it `final override` to stop the chain.
- **Liskov substitution** — a subclass must be usable wherever the superclass is expected; Kotlin's variance, immutability, and explicit `override` reinforce this.
- **Operator function** — a method named after an operator and prefixed `operator`; the compiler resolves `a OP b` to the corresponding call.
- **`invoke` operator** — lets an object be called like a function; `obj(x)` compiles to `obj.invoke(x)`.
- **`get` / `set` operators** — power the indexing syntax `obj[k]` and `obj[k] = v`.
- **`componentN`** — destructuring operators; data classes generate them automatically for primary-constructor properties.
- **Factory via companion `invoke`** — `companion object { operator fun invoke(...) = MyClass(...) }` lets `MyClass(x)` route through a factory while still looking like a constructor call.

**Why interviewers ask this**

Three signals. (1) **OO design taste** — composition vs inheritance, ISP, and LSP are evergreen interview questions because they predict whether a candidate will produce a maintainable class hierarchy or a fragile one. Kotlin's `by`, sealed classes, and default-`final` posture all bias toward composition; interviewers want candidates who *agree* with that bias and can articulate why. (2) **Delegation fluency** — `class Foo(impl: Bar) : Bar by impl` is one of Kotlin's most distinctive features. Candidates who can explain when class delegation beats inheritance, and who can name `lazy`/`observable`/`Delegates.notNull` from memory, are signalling real production experience. (3) **Operator restraint** — operator overloading is powerful and easy to misuse. Senior interviews probe whether a candidate knows when *not* to overload (`+` should always mean addition-like; `invoke` should make sense semantically as "calling" the object).

**Common confusions**

- "Class delegation is inheritance" — it's not. `class Foo : Bar by impl` does not extend `Bar`; it implements `Bar` and forwards calls. There is no `super.method()` available.
- "`override` is optional" — it's required. Forgetting `override` is a compile error, by design; this is one of the changes Kotlin made to prevent silent overrides.
- "Abstract classes can do everything interfaces can, and more" — they can hold state, but you only get one. Interfaces let you mix in many capabilities. Prefer interfaces unless you genuinely need state in the base.
- "Operator overloading lets me invent new operators" — it doesn't. The set of overloadable operators is fixed and conventional-name-driven; you can't add `<>` or `**`.
- "`invoke` and `()` are the same as a constructor" — `invoke` lets you call an *instance* like a function. Even `companion object`'s `invoke` is calling the companion *instance*; the syntax happens to look constructor-like.
- "Property delegation has no cost" — each delegated property emits a `KProperty` reference and a delegate object. For one-shot lazy values this is negligible; for thousands of instances it adds up.

**What follows from this topic**

DSL Design layers on top of operator overloading (especially `invoke`, `get`, `rangeTo`) and lambdas with receivers. Spring on Kotlin uses constructor injection plus `by lazy` for expensive beans. Android & Platform Context uses `by viewModels()`, `by viewBinding()`, `by navArgs()` — all property delegates. Advanced Concepts revisits `by` for the decorator pattern. If delegation feels unfamiliar, the Spring and Android sections will read like magic.

### Q61. Explain delegation in Kotlin and the `by` keyword.

Delegation forwards method calls to a delegate object: `class A(val b: B) : Interface by b`. Class A implements Interface by delegating to `b`. Example: `class LoggedList<T>(val list: MutableList<T> = mutableListOf()) : MutableList<T> by list`. Reduces boilerplate — you don't implement all interface methods, just delegate. Useful for: decorators, adapters, mixins. Kotlin supports both class delegation and property delegation (custom getters/setters).

### Q62. Explain property delegation and custom delegates.

Property delegation lets you customize property access: `val name: String by lazy { ... }` computes the value on first access. Custom delegates implement `ReadOnlyProperty<C, T>` or `ReadWriteProperty<C, T>` with `getValue` and `setValue`. Useful for: lazy initialization, observable properties (e.g., UI updates on change), validation, computed properties. Standard delegates: `lazy`, `observable`, `vetoable`, `notNull`. Delegates move logic out of the property into a reusable object.

```kotlin
class User {
  var name: String by observable("") { _, old, new ->
    println("$old -> $new")
  }
}
```

### Q63. What is an abstract class vs an interface in Kotlin?

Abstract classes can have mutable state, constructors, and non-abstract methods. Interfaces cannot have mutable state (only `val`), constructors, but can have default methods. Use abstract class for: shared mutable state, constructor initialization, template methods. Use interface for: capability contracts, multiple inheritance, extension function entry points. With default methods (Java 8, Kotlin always), the gap narrowed. Default: prefer interfaces; use abstract classes only when you need state or constructor.

### Q64. Explain method overriding and how it differs from overloading.

Overriding replaces a parent's method with a child's implementation (virtual dispatch at runtime). Mark parent method `open`, child uses `override`. Overloading defines multiple methods with the same name but different parameters (resolved at compile-time). Kotlin requires `open` explicitly (unlike Java) to prevent accidental fragile base class problems. You cannot override if the parent didn't mark the method `open`. Overloading works normally; Kotlin resolves the right method at compile time.

### Q65. What is the liskov substitution principle and how does Kotlin enforce it?

LSP states: a subclass can replace a parent without breaking code. Kotlin enforces this via type safety — you cannot override a method with an incompatible signature. Variance (`out`/`in`) also enforces LSP for generics. Example: if parent returns `Any`, child can return `String` (covariance) but not vice versa. Immutability helps — since data classes are `val` by default, you cannot accidentally create mutable subclasses. Kotlin's design encourages LSP-safe code.

### Q66. Explain the factory pattern and how Kotlin simplifies it.

Factory pattern creates objects without specifying exact classes. Kotlin simplifies via: `companion object { fun create(...): MyClass = ... }` instead of separate `Factory` class. Better: `invoke` operator: `operator fun invoke(...) = MyClass(...)` on a companion object lets you call `MyClass(...)` as both constructor and factory. Even better: use sealed classes + factory functions to ensure exhaustiveness. Kotlin's inline functions and DSLs often eliminate factory patterns altogether.

```kotlin
companion object {
  operator fun invoke(x: Int) = MyClass(x * 2)
}
```

### Q67. Explain interface segregation and how it relates to Kotlin.

Interface segregation: prefer many specific interfaces over one bloated interface. Instead of `interface Repository { fun get(); fun save(); fun delete(); }`, split into `interface Readable { fun get() }` and `interface Writable { fun save(); fun delete() }`. Clients depend only on what they need. Kotlin makes this easy with default methods and composition. Java 8+ allows default methods but Kotlin encourages this from the start. Results in more flexible, testable code.

### Q68. What is composition and how does it relate to inheritance?

Composition: `class A { val b = B() }` — A owns a B. Inheritance: `class A : B` — A is a B. Prefer composition to inheritance (more flexible, easier to test). Kotlin's `by` keyword makes delegation (a composition pattern) idiomatic. Example: `class LoggedList<T> : MutableList<T> by list` is composition under the hood. Inheritance is more rigid — if B changes, A breaks. Composition is flexible — you can replace B with a mock in tests.

### Q69. Explain the template method pattern and how Kotlin simplifies it.

Template method: define a skeleton in a parent, let children fill in details. Example: `abstract class Parser { fun parse() { validate(); process(); output() } }` with abstract `validate()`, `process()`, `output()`. Kotlin simplifies with default methods and functional composition. Often, a higher-order function is cleaner: `fun parse(onValidate: () -> Unit, onProcess: () -> Unit, ...)` eliminates inheritance. Use template method when you have a complex, reusable algorithm with pluggable steps; otherwise, composition is simpler.

### Q115. Explain operator overloading and common operators.

Operator overloading: implement operator methods. Example: `operator fun plus(other: Complex) = Complex(real + other.real, imag + other.imag)` lets `a + b` call `a.plus(b)`. Common: `+` (plus), `-` (minus), `*` (times), `/` (div), `%` (mod), `==` (equals), `<` (compareTo), `[]` (get/set), `()` (invoke), `..` (rangeTo). Useful for: DSLs, domain-specific values. Don't overload if it's confusing — `+` should mean addition, not something weird.

```kotlin
data class Complex(val real: Double, val imag: Double) {
  operator fun plus(other: Complex) = Complex(real + other.real, imag + other.imag)
}
```

### Q116. Explain the `invoke` operator and its use cases.

`operator fun invoke(...)` lets you call an object like a function: `val adder = { a: Int, b: Int -> a + b }; adder(1, 2)`. More generally: `class Multiplier(val x: Int) { operator fun invoke(y: Int) = x * y }; val times3 = Multiplier(3); times3(5)` returns 15. Use cases: function-like objects, command pattern, strategy pattern. Less common than other operators but powerful for DSLs and functional programming.

### Q117. Explain the `get` and `set` operators.

`operator fun get(key: K): V` lets `obj[key]` return a value. `operator fun set(key: K, value: V)` lets `obj[key] = value` set a value. Example: `class Store { operator fun get(item: String) = prices[item]; operator fun set(item: String, price: Double) { prices[item] = price } }`. Turns objects into maps/arrays. Useful for: matrix libraries, caching, configuration maps. Works on any object; not limited to collections.

### Q118. Explain destructuring with component functions.

`operator fun componentN()` lets destructuring unpack objects: `data class Point(x: Int, y: Int)` auto-generates `component1()` (returns x), `component2()` (returns y). Then: `val (a, b) = point` unpacks. Custom: `class Custom { operator fun component1() = "first"; operator fun component2() = "second" }`. Destructuring combines `componentN()` functions. Limited to 5 components by convention. Useful for: returning multiple values, pattern matching.

---

## Spring on Kotlin

### Summary

**What this topic covers**

The intersection of Spring's enterprise machinery and Kotlin's ergonomic upgrades. Three concern areas live here: (1) the **Spring bean and DI vocabulary as Kotlin reshapes it** — `@Bean`, `@Component`/`@Service`/`@Repository`, `@Configuration`, constructor injection without `@Autowired`, named parameters and default arguments as a substitute for builder beans, and the `beans { }` Kotlin DSL as an alternative to annotations; (2) **transactional and data-access concerns** — `@Transactional` semantics including class-level vs method-level scope and the self-invocation proxy trap, Spring Data repository interfaces with Kotlin-friendly extensions like `findByIdOrNull`, and JPA's quirks when applied to Kotlin's null-aware, `val`-by-default class model; (3) **alternatives within the Kotlin ecosystem** — JetBrains Exposed (DAO and DSL flavours) as a Kotlin-first SQL framework, and Ktor as a coroutine-native, lightweight alternative to Spring Boot for greenfield Kotlin services. The 9 questions in this topic cover the architectural choices that define a Kotlin backend project.

**Mental model**

Two ideas explain the section. (1) **Spring loves Kotlin more than Kotlin loves Spring**. Spring 5+ added first-class Kotlin support: constructor injection without `@Autowired`, null-safe types in `@RequestMapping`, the `beans { }` and `routes { }` Kotlin DSLs, `runBlocking`/`suspend` interop in MVC and WebFlux. The combination is genuinely good — Kotlin trims Spring's verbosity by half. But Spring's runtime is still classpath-scanning, proxy-based, and reflection-heavy, which fights Kotlin's compile-time bias. (2) **The `final` default is the friction point**. Kotlin classes are `final` unless declared `open`; Spring's proxies need to subclass at runtime. The `kotlin-spring` Gradle plugin makes `@Component`, `@Service`, `@Repository`, `@Configuration`, `@Controller`, and `@Bean` classes implicitly `open`. Without it, every Spring class needs an explicit `open` keyword. Similar plugins exist for JPA (`kotlin-jpa` for no-arg constructors) and Allopen (custom annotation-driven opening). Knowing about these plugins is a strong senior signal.

**Key terms**

- **`@Bean`** — method-level annotation that registers the return value as a Spring bean; used in `@Configuration` classes for third-party objects or conditional wiring.
- **`@Component` / `@Service` / `@Repository`** — class-level stereotypes; all register a bean. `@Repository` adds DataAccessException translation; the others are pure semantic markers.
- **`@Configuration`** — marks a class containing `@Bean` factories; Spring CGLIB-proxies the class so inter-`@Bean` calls return cached singletons.
- **Constructor injection** — primary constructor parameters as dependencies; idiomatic in Kotlin, no `@Autowired` needed since Spring 4.3.
- **`@Transactional`** — proxy-based transaction boundary; only intercepts external calls on public methods. Self-invocation bypasses the proxy.
- **Spring Data repository** — interface declaring queries; Spring generates the implementation. Kotlin extensions like `findByIdOrNull` smooth the `Optional<T>` returns.
- **`kotlin-spring` compiler plugin** — makes Spring-annotated classes implicitly `open` so the proxy machinery works.
- **`kotlin-jpa` compiler plugin** — synthesises no-arg constructors for `@Entity` classes, which Hibernate requires.
- **Named & default arguments** — replace many `*Builder` patterns; combine cleanly with constructor injection and `@Bean` factories.
- **Exposed** — Kotlin-first SQL library with a typed DSL (`Users.select { Users.age greater 18 }`) and an optional DAO layer. No reflection, no proxies.
- **Ktor** — JetBrains' coroutine-native web framework; route DSL, lightweight startup, designed for `suspend` end-to-end.
- **`beans { }` DSL** — Spring 5 Kotlin DSL for registering beans without annotations or reflection; used for functional bean definition.

**Why interviewers ask this**

Three signals. (1) **Real-world wiring** — Spring is the dominant Kotlin backend framework, and most production code is Kotlin Spring. Interviewers ask to confirm you can ship a service, not just write language features in isolation. (2) **The plugin trap** — candidates who don't know about `kotlin-spring` and `kotlin-jpa` write Kotlin Spring code that mysteriously fails until they add `open` everywhere. Naming the plugins is a real-experience signal. (3) **Architectural taste** — the Exposed-vs-JPA and Ktor-vs-Spring questions probe whether a candidate can articulate trade-offs: maturity vs ergonomics, ecosystem depth vs startup time, reflection cost vs feature breadth. Senior interviews want opinions backed by reasoning, not template answers.

**Common confusions**

- "Constructor injection requires `@Autowired`" — not since Spring 4.3 on single-constructor classes. Kotlin's primary-constructor syntax makes this the default.
- "`@Transactional` on a private method works" — it doesn't. Spring's proxy intercepts only public, externally-invoked calls. Self-invocation (`this.foo()`) bypasses the proxy entirely.
- "Data classes work fine as JPA entities" — they often don't. JPA requires a no-arg constructor and mutable fields; data classes have neither by default. Use the `kotlin-jpa` plugin and switch to `var`, or model entities as regular classes.
- "Spring is the only option" — Ktor is a real alternative, especially for microservices and coroutine-first designs. Exposed beats JPA for many Kotlin teams.
- "`@Repository` is mandatory" — Spring Data auto-detects repository interfaces; you can omit `@Repository` and it still works. The annotation adds exception translation, not detection.
- "Kotlin and Spring's reflection are friends" — Spring's component scanning, proxy generation, and AOT compilation all assume open classes and mutable beans. Kotlin's defaults work *against* this; the compiler plugins exist precisely because the impedance is real.

**What follows from this topic**

Spring on Kotlin builds on every prior topic — null safety in request/response models, data classes for DTOs, coroutines in WebFlux controllers, delegation for repository decorators. Testing in Kotlin returns here for `@SpringBootTest` integration tests and `MockK` for service mocking. Java Interoperability returns here too: Spring is largely Java code that Kotlin consumes through platform types and SAM conversion. If Spring feels like a black box, treat it as the test of whether you can apply the language fundamentals at production scale.

### Q70. Explain Spring's @Bean annotation and how it works in Kotlin.

`@Bean` marks a method that produces a bean — Spring calls it and registers the return value as a singleton bean. Example: `@Bean fun myService() = MyService()`. Kotlin often uses constructor injection (`@Autowired` constructor or Kotlin synthetic params) instead. `@Bean` is useful for: third-party objects (can't annotate the class), conditional beans, complex initialization. Return type is the bean type. Multiple beans of the same type need `@Qualifier` or unique names. In Kotlin, prefer constructor injection and extension functions for creating beans.

### Q71. What is constructor injection and how does Kotlin make it ergonomic?

Constructor injection: pass dependencies via constructor. Spring auto-resolves and injects them. Kotlin syntax: `class UserService(private val repository: UserRepository)` — single expression, no `@Autowired` needed (Spring 4.3+). Advantages: immutable dependencies, testability (pass mocks), explicit dependencies. Java often uses field injection (`@Autowired private UserRepository repo;`) which is weaker (hidden dependencies, harder to test). Kotlin makes constructor injection the default — prefer it over field injection.

### Q72. What is the difference between @Component, @Service, and @Repository?

All are stereotype annotations marking beans for Spring:
- `@Component` — generic bean
- `@Service` — semantic: business logic layer
- `@Repository` — semantic: data access layer, adds exception translation

Spring treats them identically for autowiring; the name is convention for readability and tooling. Use `@Repository` for DAO/repository classes, `@Service` for business logic, `@Component` for generic utilities. In Kotlin with Spring Data, `@Repository` is implicit on interfaces extending `CrudRepository`. The annotations are optional if you use component scanning — just scan the packages and Spring finds them.

### Q73. What is @Configuration and how is it different from @Component?

`@Configuration` marks a class containing `@Bean` methods — Spring treats the class specially (CGLIB proxying to ensure singletons). Example: `@Configuration class AppConfig { @Bean fun myService() = ... }`. Unlike `@Component`, Spring intercepts method calls within the class to return singletons (e.g., if you call `myService()` from another `@Bean`, it returns the singleton, not a new instance). Use `@Configuration` for bean factory methods; use `@Component` for regular beans. In Kotlin, you can often use `@Configuration` with `@Bean` to define the entire app context.

### Q74. What is the difference between @Transactional and manual transaction management?

`@Transactional` starts a transaction, runs the method, then commits (or rolls back on exception). Declarative and clean. Manual: `transactionManager.getTransaction(...); try { ... } finally { transactionManager.commit/rollback(); }` — verbose but explicit. Spring also supports programmatic: `TransactionTemplate.execute { ... }`. Declarative is preferred — cleaner, less error-prone. Caveat: `@Transactional` only works on public methods (proxied by Spring), not private; also doesn't apply to `@Transactional` methods called from other methods in the same class (proxy issue).

### Q75. Explain Kotlin's named parameters and default arguments with Spring.

Named parameters: `myFunction(name = "Alice", age = 30)` names each argument. Default arguments: `fun greet(name: String = "Guest")` provides defaults. Spring benefits: cleaner bean definitions with `@Bean` functions that have many optional params. Example: `@Bean fun service(repo: UserRepository, cache: Cache? = null) = UserService(repo, cache)` — if Spring finds `Cache`, it injects; otherwise uses null. Reduces factory boilerplate. Combined with Kotlin's constructor injection, you get very clean, readable configuration.

### Q76. What is Spring Data and how does Kotlin interact with it?

Spring Data abstracts away boilerplate database code — you define repository interfaces like `interface UserRepository : CrudRepository<User, Long>` and Spring generates implementation. Kotlin pairs well: `CrudRepository.findById(id).orElse(null)` is verbose; Kotlin extension: `fun <T, ID> CrudRepository<T, ID>.findByIdOrNull(id: ID): T? = findById(id).orElse(null)`. Spring Data + Kotlin = minimal code, high productivity. Works with JPA, MongoDB, Redis. Extension functions fill gaps (null handling, functional shortcuts).

### Q77. What is Kotlin's Exposed framework and how does it compare to JPA?

Exposed is a Kotlin-first SQL framework (alternative to JPA/Hibernate). Two APIs: DAO (ORM-like) and DSL (SQL-like). Example DSL: `Users.select().where { age > 18 }.forEach { ... }`. Advantages: type-safe SQL, simpler than JPA, no reflection needed, composable queries. JPA is more mature, widely used, supports multiple databases easier. Exposed is lighter and more Kotlin-idiomatic but less battle-tested. Use Exposed for new Kotlin projects valuing simplicity; use JPA/Hibernate if you need industry standard or complex relational models.

### Q78. Explain Ktor as an alternative to Spring for Kotlin.

Ktor is a lightweight framework for building async, non-blocking web applications in Kotlin. Built on coroutines, much faster startup, smaller memory footprint than Spring Boot. Example: `get("/users/{id}") { ... }` defines routes. Spring Boot is more feature-complete (transactions, JPA, security modules); Ktor is more minimal and composable. Choose Ktor for: microservices, high-throughput APIs, GraalVM native images, coroutine-first code. Choose Spring for: enterprise, rich ecosystem, widespread team knowledge. Both valid; Ktor is increasingly popular for new Kotlin projects.

---

## Testing in Kotlin

### Summary

**What this topic covers**

The testing toolkit and discipline expected of any Kotlin engineer shipping production code. Three concern areas live here, although the primer's question count is small because the underlying philosophy is shared across languages: (1) **fixture and setup management** — `@BeforeEach`/`@AfterEach` (JUnit 5) and `@BeforeAll`/`@AfterAll` for class-scoped setup, helper factory functions for canonical test data, `by lazy` for expensive shared resources, and the trade-off between sharing fixtures (fast tests, brittle coupling) and re-creating them per test (slow, isolated); (2) **mocking and isolation** — when to use a real dependency, a stub, a spy, or a mock; Mockito-Kotlin and MockK as the two dominant libraries, with MockK being the Kotlin-first choice that handles `final` classes, coroutines, and extension functions out of the box; (3) the **Kotlin testing ecosystem at large** — kotlin.test for assertions, JUnit 5 as the dominant runner, Kotest as the BDD-style alternative, `runTest` from `kotlinx-coroutines-test` for virtual-time coroutine tests, and `@SpringBootTest` / `MockMvc` / `WebTestClient` for integration. The 2 questions here are deliberately broad; the underlying topic is the discipline of writing tests that give confidence to change.

**Mental model**

Two ideas explain the section. (1) **Tests test behaviour, not implementation**. Kotlin's data classes, sealed classes, and value classes make this easier than in Java — equality and structural comparison are built in, so assertions like `assertEquals(expected, actual)` work on whole result graphs. Resist the urge to verify private methods or internal state; if a refactor breaks a test that didn't observe a behaviour change, the test was over-specified. (2) **The mocking decision is structural, not tooling**. If you find yourself mocking many fine-grained collaborators, the design is over-coupled. Kotlin's `class delegation` and constructor injection make it cheap to inject test doubles, but the cheaper path is often to write code with fewer collaborators and use real implementations or thin in-memory fakes. MockK is the right tool when you genuinely need to intercept (e.g. a network client), not when you're papering over a tangled service.

**Key terms**

- **Fixture** — pre-built test data or environment; can be per-test, per-class, or per-suite scope.
- **`@BeforeEach` / `@BeforeAll`** — JUnit 5 lifecycle hooks for per-test and per-class setup; `@AfterEach` / `@AfterAll` are the teardown counterparts.
- **Stub** — a fake that returns canned data; no verification of how it was called.
- **Mock** — a fake that both returns canned data and records calls; you can verify invocations after the fact.
- **Spy** — a real object with selectively-mocked methods; useful when most behaviour is fine but one path needs intercepting.
- **MockK** — Kotlin-first mocking library; handles `final` classes natively, supports `coEvery`/`coVerify` for coroutines, mocks extension functions, top-level functions, and `object` singletons.
- **Mockito-Kotlin** — Mockito wrapper with Kotlin syntax; requires the `mockito-inline` engine to mock `final` classes (which Kotlin produces by default).
- **kotlin.test** — multiplatform assertion library; `assertEquals`, `assertTrue`, `assertFailsWith`, `assertNotNull` etc. Wraps the underlying runner (JUnit, JS test framework, etc.).
- **Kotest** — alternative testing framework with BDD-style describe/should blocks, property-based testing, and rich assertion DSL.
- **`runTest`** — coroutine test runner from `kotlinx-coroutines-test`; uses a virtual `TestDispatcher` and skips `delay()` calls to keep tests fast.
- **`TestDispatcher` / `StandardTestDispatcher`** — coroutine dispatcher with controllable virtual time; substitutable for `Dispatchers.Main`/`IO` during tests.
- **`@SpringBootTest`** — full integration test with a real Spring context; pair with `MockMvc` (servlet) or `WebTestClient` (reactive) for HTTP-layer assertions.

**Why interviewers ask this**

Three signals. (1) **Production discipline** — anyone can write a happy-path test; senior candidates know how to test error paths, edge cases, and concurrent behaviour. Asking about `runTest` and virtual time probes whether you've actually shipped coroutine code under test. (2) **The mocking-vs-real decision** — over-mocking is one of the most common antipatterns in Kotlin codebases. Interviewers want to hear "I'd use a real implementation here because it's pure" or "I'd mock this because it talks to the network" — concrete reasoning, not blanket policies. (3) **Tooling fluency** — MockK vs Mockito-Kotlin, JUnit 5 vs Kotest, `@SpringBootTest` vs `@WebMvcTest` are all choices with trade-offs. Candidates who can articulate the choices have shipped at scale; candidates who recite one stack as "the right way" have not.

**Common confusions**

- "Mocks and stubs are the same thing" — stubs return canned data; mocks also record calls so you can verify invocations. A `spy` is a real object with some methods overridden.
- "MockK and Mockito-Kotlin are interchangeable" — MockK is Kotlin-native and handles `final` classes, coroutines, and extension functions out of the box. Mockito-Kotlin requires extra setup for these.
- "Coroutines tests should use `runBlocking`" — they shouldn't. `runBlocking` waits in real time; `runTest` uses virtual time and skips `delay()`. Tests run in milliseconds instead of seconds.
- "Spring tests must be `@SpringBootTest`" — for a controller test, `@WebMvcTest` or `@WebFluxTest` boots only the web layer and is dramatically faster. Full `@SpringBootTest` is the heavyweight, last-resort option.
- "Private methods need direct testing" — if a private method has behaviour worth testing in isolation, it's a public method on a different class. Test the public surface; let private methods be covered by it.
- "More mocks = better isolation" — more mocks = more coupling to implementation. The goal is fewer mocks and richer fakes (or real, in-memory implementations).

**What follows from this topic**

Testing connects every prior topic. Coroutines tests use `runTest` and virtual time. Spring tests use `@SpringBootTest` with MockK or `@MockkBean`. Spot-the-Bug examples are exactly the kind of mistake good tests catch at PR review. If you can't write a confident test for a piece of Kotlin code, you don't really understand what it does — interviewers know this and probe accordingly.

### Q79. What is a test fixture and how do you manage them?

Test fixtures are test data or setup — hardcoded values, mocks, temporary files. Example: `val mockUser = User(1, "Test")` is a fixture. Manage via: `@BeforeEach setUp()` (JUnit 4) for per-test setup, `companion object { @BeforeAll fun setUpClass() }` (JUnit 5) for once-per-suite setup, or Kotlin fixtures: `fun createTestUser() = User(...)`. Keep fixtures minimal and focused on the test's needs — big, shared fixtures make tests brittle. In Kotlin, create fixtures as helper functions or factory objects. Use `by lazy` for expensive setup.

### Q80. Explain mocking and when to use it.

Mocks replace real dependencies with fakes to isolate what you're testing. Example: `val mockRepo = mock<UserRepository> { on { find(1) } doReturn User(1) }` using Mockito. Use mocks when: real dependency is slow (network), has side effects (sends email), or state-dependent (time). Don't mock: value objects, collections, things you're testing. Kotlin libraries: Mockito, MockK (Kotlin-first). Spies: `spy(RealClass())` wraps the real object and verifies calls. Avoid over-mocking — mocks can make tests brittle and hide real bugs.

---

## Common Idioms, Pitfalls & Spot-the-Bug

### Summary

**What this topic covers**

The everyday small-syntax decisions a Kotlin engineer makes hundreds of times a day, plus the canonical traps that interviewers love to drop into "spot the bug" rounds. Three concern areas live here: (1) **idiomatic small utilities** — destructuring in `for` loops and elsewhere, `to` for `Pair` construction in map literals, `require`/`requireNotNull`/`check` for precondition validation, `takeIf`/`takeUnless` for conditional pass-through, `repeat` for fixed-count loops, string templates and raw strings; (2) **opinions about defaults** — when not to use `var` (almost always), when not to use `!!` (almost always), and the cultural pressure inside good Kotlin codebases toward `val`, nullable types, and explicit handling; (3) **the spot-the-bug catalogue** — null-safety mistakes, late-init access before initialisation, race conditions from shared mutable state across dispatchers, member-vs-extension dispatch surprises, `inline` plus recursion, `reified` outside `inline`, `data class` with `var` properties breaking `HashSet`/`HashMap` invariants. The 17 questions in this topic are the senior interviewer's playground.

**Mental model**

Two ideas anchor everything. (1) **Kotlin's idioms are opinions, not syntax**. `val` over `var`, `?.` over `!!`, `data class` with all-`val` properties, `require` at the top of a function — none of these are mandated by the compiler, but every well-run Kotlin codebase enforces them via convention, code review, or detekt rules. Knowing the syntax is junior-level; knowing the *defaults* and *escape conditions* is the seniority signal. (2) **The spot-the-bug questions all share a pattern: they look correct because they compile**. Kotlin's type system catches a vast class of bugs, which conditions readers to trust compiling code. The bugs that remain are the ones the type system *can't* catch — runtime nullability via `!!`, race conditions across dispatchers, `lateinit` before init, member-shadowing of extensions, hash invariants violated by mutation. The skill is reading code with the type checker turned off in your head.

**Key terms**

- **`require(condition) { msg }`** — precondition check on arguments; throws `IllegalArgumentException`. `requireNotNull(x) { msg }` is the null-specialised variant.
- **`check(condition) { msg }`** — internal state precondition; throws `IllegalStateException`. Use for "this object is in the wrong state" rather than "this argument is wrong".
- **`takeIf { p }` / `takeUnless { p }`** — return the receiver if the predicate holds (or doesn't); otherwise return `null`. Chains naturally with `?.let`.
- **`repeat(n) { ... }`** — `n`-times loop with the iteration index as `it`. Simpler than `for (i in 0 until n)` when you need iteration only, not the index name.
- **`to` infix** — `1 to "a"` returns `Pair(1, "a")`; used in `mapOf` and anywhere a `Pair` is needed.
- **String templates** — `"$name has ${list.size} items"`; raw triple-quoted strings preserve newlines without escaping.
- **`!!` as code smell** — never the right answer in production code unless you've just guarded; prefer `?.`, `?:`, or `requireNotNull` with a real message.
- **`var` discipline** — production Kotlin code defaults to `val`; `var` is justified by a comment or by the obvious need (counters, accumulators inside a loop scope).
- **Member-vs-extension dispatch** — when a member function exists with the same signature as an extension, the member always wins. Adding an extension that's silently shadowed is a debugging hazard.
- **`data class` with `var`** — auto-generated `hashCode` reflects current state; mutating a property after inserting the object into a `HashSet`/`HashMap` breaks the lookup invariant.
- **`lateinit` access before init** — throws `UninitializedPropertyAccessException`; `::prop.isInitialized` guards against it.
- **`inline` with recursion** — `inline` substitutes the body at each call site; a recursive inline call would substitute itself infinitely. The compiler rejects it; you need `tailrec` instead.

**Why interviewers ask this**

Three signals. (1) **Idiomatic instinct** — a candidate who reaches for `require` at the top of a method, uses `?.let` instead of `if (x != null)`, and never types `!!` without grimacing has internalised the language. Idiomatic instinct is hard to fake. (2) **Bug-spotting under pressure** — spot-the-bug questions test whether you read code carefully or skim. The trap snippet usually compiles and looks reasonable; the bug is one line that interacts with a subtle semantic (cancellation, mutability, dispatch order). Candidates who slow down and reason about runtime behaviour win. (3) **Cultural fit with the code review process** — these questions surface the candidate's review eye. Will they catch the `var` in a `data class`? Will they flag a `lateinit` that escapes the constructor without guarantee of init? Will they question a `!!` in a hot path? This predicts whether the candidate will be a net contributor to code quality.

**Common confusions**

- "`require` and `assert` are the same" — `require` is always enforced and throws `IllegalArgumentException`; `assert` is disabled by default at the JVM level and meant for development invariants only. Use `require` for argument validation in production code.
- "`takeIf` short-circuits an exception" — it doesn't. The predicate runs unconditionally; only the *result* changes. If the predicate throws, `takeIf` propagates the exception.
- "`!!` is faster than `?.`" — irrelevant. The throughput difference is negligible; the bug surface is enormous. `!!` is a hostile signal to your reviewers.
- "Mutable `data class` properties are fine if I never put the object in a `Set`" — until someone three months later puts it in a `Set` and the hash invariant collapses silently. Mark properties `val` by default and enforce it in review.
- "Extension functions override members" — they don't. Members always win in dispatch. Naming an extension the same as a member produces a silent shadow.
- "`repeat` provides an index" — yes, as `it`. People often forget this and rewrite `repeat(n) { i -> ... }` unnecessarily.

**What follows from this topic**

This section is the cumulative pressure test. It folds in null safety (Q17–Q26), `inline`/`reified` (Q10, Q16), data classes (Q7), coroutines and dispatchers (Q48–Q60), and member-vs-extension resolution from Fundamentals (Q4). If a candidate breezes through this section, they have actually integrated the language. If they get stuck, the gaps point straight back to whichever earlier topic the trap is built from.

### Q81. Explain destructuring in for loops.

Destructuring in for loops unpacks components: `for ((key, value) in map) { ... }` unpacks map entries. Works on: data classes with `componentN()`, `Pair`, `Triple`, custom objects with `operator fun componentN()`. Example: `for ((index, value) in list.withIndex()) { ... }` unpacks index and value. Reduces intermediate variables and improves readability. Watch out: wrong number of variables causes compilation error; if you don't need all components, use `_` to ignore: `for ((_, value) in map) { ... }`.

### Q82. Explain the `to` infix function and Pair.

`to` creates a `Pair`: `1 to "a"` is `Pair(1, "a")`. Syntax sugar for `Pair(1, "a")`. Useful in contexts: `mapOf(1 to "a", 2 to "b")`, `Triple`s, any tuple. Access via `.first` and `.second`. Kotlin also supports destructuring: `val (a, b) = 1 to "a"`. The real value is readability — `1 to "a"` is clearer than `Pair(1, "a")`. Infix functions in Kotlin allow `a to b` instead of `to(a, b)`.

### Q83. What is the `require` function and when should you use it?

`require(condition) { "message" }` throws `IllegalArgumentException` if condition is false. Used for argument validation: `require(age > 0) { "Age must be positive" }`. Variants: `requireNotNull(x) { "X is required" }` (throws if null), `check(condition)` (precondition check). Good practice: validate at function entry. Unlike assertions, `require` is always checked (assertions can be disabled). Fail fast with clear messages. Better than silent failures or null returns.

```kotlin
fun setAge(age: Int) {
  require(age > 0) { "Age must be positive" }
  this.age = age
}
```

### Q84. Explain the `takeIf` and `takeUnless` functions.

`takeIf { condition }` returns the receiver if condition is true, else null. `takeUnless { condition }` is the opposite. Example: `str.takeIf { it.length > 5 }` returns str if long enough, else null. Useful for: conditional returns without if/else, chaining: `user.takeIf { it.active }?.let { process(it) }`. Replaces: `if (str.length > 5) str else null`. Makes code more functional and readable. Combine with Elvis: `str.takeIf { it.length > 5 } ?: default`.

### Q85. What is the `repeat` function and when is it useful?

`repeat(n) { ... }` executes a block n times. Example: `repeat(5) { println("hello") }` prints "hello" 5 times. Useful for: testing (repeating a test), generating data, simple loops. More concise than `for (i in 0 until 5)` when you don't need the index. If you need the index, use `repeat`'s implicit `it` parameter: nope, `repeat` doesn't provide it — use `for` instead.

### Q86. Explain when not to use `var` and prefer `val`.

`var` allows reassignment, but most code doesn't need it. Reassignment makes code harder to reason about — where did the value change? Use `var` only when you actually need to reassign (e.g., loop counters, mutable holders). Prefer `val` + `let` chaining for functional flows. Exception: performance-critical code where reusing a var avoids allocations. Lint rules: many projects forbid `var` unless justified. Kotlin's design encourages `val` (immutability by default).

### Q87. Explain when not to use `!!` (not-null assertion).

`!!` defeats null safety — if the value is null, you get `NullPointerException`. Avoid unless: after a guard clause (`if (x == null) return; x.method()`), inside library code where you document assumptions, or tests (where failure is expected). Alternatives: `x?.method()` (safe call), `x ?: default` (Elvis), `x?.let { method(it) }` (nullable chain). If you find yourself using `!!` often, reconsider your data model — maybe something should be non-nullable, or you need better validation.

### Q88. Explain string templates and formatting.

String templates: `"Hello $name"` interpolates the variable. Complex expressions: `"Result: ${x + 1}"`. Raw strings: `""" line 1 | line 2 """` preserves newlines. No built-in `String.format` equivalent in Kotlin, but you can call Java's: `"%s %d".format(name, age)`. String templates are cleaner than concatenation and Java's `.format()`. For logging/DSLs, use string templates; for user-facing messages, consider i18n.

```kotlin
val msg = "Hello $name, you are ${age + 1} next year"
```

### Q147. Spot the bug: null safety

```kotlin
val name: String? = null
val length = name.length  // Bug: name is nullable, .length is not safe
```

**Fix**: `val length = name?.length ?: 0` (safe call + Elvis) or `val length = name?.length` (nullable result) or guard: `if (name != null) val length = name.length`.

### Q148. Spot the bug: mutable default argument

```kotlin
fun createUser(tags: MutableList<String> = mutableListOf()) {
  tags.add("default")
  // Bug: all calls share the same list (not created per call)
}
```

**Fix**: Use immutable `List<String> = emptyList()` or create a new list each call (move default out of parameter). Actually, mutableListOf creates a new list each call — no bug here. Ignore this example.

### Q149. Spot the bug: late-init access

```kotlin
class Service {
  lateinit var name: String
  fun getName() = name  // Bug: name might not be initialized
}
val s = Service()
println(s.getName())  // UninitializedPropertyAccessException at runtime
```

**Fix**: Check `::name.isInitialized` before use, or guarantee init before access, or use `String? = null` + null check.

### Q150. Spot the bug: concurrency and Dispatchers

```kotlin
var count = 0
launch(Dispatchers.IO) { count++ }
launch(Dispatchers.IO) { count++ }
// Bug: race condition, both launch on IO thread concurrently
```

**Fix**: Use `Mutex`, `AtomicInteger`, or avoid shared mutable state (actor pattern, message passing).

### Q151. Spot the bug: extension function not called

```kotlin
class Foo { fun bar() = "foo" }
fun Foo.bar() = "extension"  // Bug: extension is defined but never called
val f = Foo()
println(f.bar())  // Prints "foo" (member takes precedence)
```

**Fix**: Member functions have precedence over extensions. Extensions only apply if no member exists. Use a different name or move logic to the class.

### Q152. Spot the bug: inline recursion

```kotlin
inline fun factorial(n: Int): Int =
  if (n <= 1) 1 else n * factorial(n - 1)
// Bug: inline prevents tail-call optimization (and works with recursion)
```

**Fix**: Use `tailrec fun factorial(...)` instead. `inline` + recursion = bytecode explosion and potential stack overflow.

### Q153. Spot the bug: reified type parameter in non-inline

```kotlin
fun <reified T> parse(json: String): T = gson.fromJson(json, T::class.java)
// Bug: reified requires inline
```

**Fix**: `inline fun <reified T> parse(...)`. Reified preserves type info only when the function is inlined (substituted at compile time).

### Q154. Spot the bug: not-null assertion with null value

```kotlin
val name: String? = null
val length = name!!.length  // Bug: name is null, !! throws NPE
```

**Fix**: Use `name?.length ?: 0` or nullable return `name?.length`.

### Q155. Spot the bug: dataclass with var

```kotlin
data class Point(var x: Int, var y: Int)
val p = Point(1, 2)
val s = setOf(p)
p.x = 3  // Bug: mutating point changes its hash, breaks set invariant
s.contains(p)  // May not find p (set uses old hash)
```

**Fix**: Use `val x: Int, val y: Int` (immutable). Data classes are intended immutable.

---

## Android & Platform Context

### Summary

**What this topic covers**

The Android platform vocabulary that distinguishes a Kotlin engineer who has shipped an app from one who has only written JVM services. Three concern areas live here: (1) the **lifecycle-aware data model** — `ViewModel` as the configuration-survival container, `LiveData` as the lifecycle-aware observable and its relationship to `StateFlow` in modern code, `viewModelScope` and `lifecycleScope` as structured-concurrency entry points, and the migration story away from `LiveData` toward coroutine-native flows; (2) the **UI layer split** — XML layouts and the imperative `findViewById` / `ViewBinding` world vs Jetpack Compose's declarative `@Composable` functions, `remember { mutableStateOf(...) }` for stateful composables, recomposition mechanics, and why state should always live in `remember` or hoisted higher; (3) **platform glue and storage** — Intents (explicit and implicit) for activity/service/broadcast invocation, Fragments as reusable UI pieces with their own lifecycle, `by lazy` for deferred initialisation of expensive Android objects, SharedPreferences for small key-value storage and DataStore as the coroutine-native replacement. The 8 questions in this topic are the Android subset every senior Kotlin candidate is expected to handle.

**Mental model**

Two ideas explain the section. (1) **Android has its own lifecycle model and Kotlin coroutines bolt onto it via scopes**. `viewModelScope` is cancelled when the `ViewModel` is cleared; `lifecycleScope` is cancelled when the owner's lifecycle reaches `DESTROYED`. Launching coroutines from these scopes is the canonical way to avoid the classic Android leak (a background task outliving the `Activity` it was supposed to update). `GlobalScope.launch { ... }` in an Activity is the bug everyone writes once and then never writes again. (2) **Compose is React with a Kotlin compiler plugin**. `@Composable` functions describe UI as a function of state; when state changes, the framework recomposes the affected subtree. The mental model is functional and declarative — the same intuitions that apply to React with hooks apply to Compose with `remember`. The catch is that Compose's correctness depends on its compiler plugin, on the discipline of keeping state inside `remember`, and on understanding that recomposition can run many times per frame.

**Key terms**

- **`ViewModel`** — survives configuration changes (rotation, theme change); cleared when the owning scope is permanently destroyed.
- **`viewModelScope`** — `CoroutineScope` bound to the `ViewModel`'s lifetime; cancels on `onCleared()`.
- **`lifecycleScope`** — `CoroutineScope` bound to a `LifecycleOwner`; cancels at `DESTROYED`. Variants like `launchWhenStarted` pause coroutines while the lifecycle is below the threshold.
- **`LiveData`** — lifecycle-aware observable; only emits to active observers. Pre-coroutines; being phased out in favour of `StateFlow` + `repeatOnLifecycle`.
- **`StateFlow`** — coroutine-native hot flow with a current value; combine with `lifecycleScope.launch { repeatOnLifecycle(STARTED) { ... } }` for lifecycle-aware collection.
- **Jetpack Compose** — declarative UI framework; `@Composable` functions, automatic recomposition driven by state changes.
- **`remember { mutableStateOf(...) }`** — composable-scoped state that survives recomposition; lost on configuration change unless promoted to `rememberSaveable` or a `ViewModel`.
- **Recomposition** — Compose re-runs the affected `@Composable` functions when their inputs change; smart enough to skip unaffected branches.
- **Intent** — message object for starting components or broadcasting events; explicit (target class named) or implicit (action + data).
- **Fragment** — reusable UI piece with its own lifecycle; Kotlin extensions like `by viewModels()`, `by navArgs()`, and `by viewBinding()` make boilerplate disappear.
- **`by lazy`** — common in Android for expensive objects (SharedPreferences, ViewBinding, ViewModelProvider) that should be initialised on first access.
- **DataStore** — coroutine-native, type-safe replacement for SharedPreferences; supports `Preferences` and `Proto` flavours.

**Why interviewers ask this**

Three signals. (1) **Lifecycle discipline** — leaks are the most common Android bug, and structured concurrency is the modern fix. Asking about `viewModelScope` vs `GlobalScope` probes whether the candidate writes code that cleans up. (2) **Compose readiness** — Jetpack Compose is now the default for new Android UI work. Candidates who can explain recomposition, state hoisting, and `remember` semantics are signalling current production experience. Candidates whose Android knowledge stops at XML and `findViewById` are signalling that they haven't shipped a recent app. (3) **Flow vs LiveData** — this is the migration story across the entire Android ecosystem. A senior candidate can articulate why a new project should default to `StateFlow` for view state and `SharedFlow` for one-off events, and when `LiveData` is still worth using (legacy projects, Java-only callers).

**Common confusions**

- "`GlobalScope.launch` in a ViewModel is fine because the ViewModel manages it" — it isn't. `GlobalScope` has no parent; it survives the ViewModel and leaks. Use `viewModelScope`.
- "`LiveData` and `StateFlow` are interchangeable" — they overlap but `LiveData` is Android-only and lifecycle-aware; `StateFlow` is multiplatform and dispatcher-driven. Collection from a `StateFlow` needs `repeatOnLifecycle` for lifecycle awareness.
- "Compose replaces ViewModel" — it doesn't. `ViewModel` still owns business state and survives configuration changes; Compose owns the UI rendering. They coexist.
- "Recomposition runs once per state change" — recomposition can run many times per frame, sometimes per pixel during animation. Side effects inside `@Composable` functions must be wrapped in `LaunchedEffect`, `DisposableEffect`, or `SideEffect`.
- "Fragments are deprecated" — they aren't. They're heavily used, especially with the Navigation component. Compose-only apps may skip them, but Fragment + Compose hybrids are common.
- "SharedPreferences is fine" — for new code, DataStore is the recommended replacement: type-safe, coroutine-native, supports transactional updates.

**What follows from this topic**

Android pulls together every prior topic into one platform. Coroutines provides `viewModelScope` and the structured-concurrency story. Null Safety governs every Android API call (most returns are nullable). OOP & Delegation gives you `by viewModels()`, `by navArgs()`, `by viewBinding()`. DSL Design appears in Compose's nested `@Composable` functions, which feel like a DSL. If a candidate cannot reason about lifecycle and structured concurrency together, the Android section reveals it instantly.

### Q89. What is a ViewModel and how does Kotlin make it ergonomic?

`ViewModel` survives configuration changes (screen rotation) and holds UI state. You extend `ViewModel` and pass data via `by lazy` or fields. Kotlin's conciseness shines: one-liner initialization vs Java's verbose null checks. Example: `val users: LiveData<List<User>> = MutableLiveData()`. Android's `viewModelScope` (Kotlin extension) simplifies coroutine launching: `viewModelScope.launch { fetch() }` — no explicit cancellation needed. Kotlin's property syntax and extension functions make ViewModels clean.

### Q90. What is LiveData and when do you use it vs StateFlow?

`LiveData<T>` is an observable data holder, lifecycle-aware (only notifies active observers). Used heavily pre-Kotlin Coroutines. `StateFlow<T>` is a coroutine-based hot flow, simpler API, no lifecycle awareness. LiveData is Android-specific; StateFlow is multiplatform. Modern choice: `StateFlow` + `lifecycleScope.launchWhenStarted` for lifecycle awareness. LiveData is still valid (widely supported) but being phased out. If starting a new Android project, prefer `StateFlow` + coroutines.

### Q91. What is Compose and how does it differ from XML layouts?

Jetpack Compose is a declarative UI framework (like React) for building UIs with pure Kotlin functions. Example: `@Composable fun UserCard(user: User) { Text(user.name) }`. Traditional XML layouts are imperative (imperatively update views). Compose: automatic recomposition (state changes trigger UI updates), no manual findViewById, type-safe. Drawback: only works on Android 5.0+; learning curve for imperative developers. Future of Android UI. If targeting modern Android, Compose is preferred; if supporting older API levels, stick with XML.

### Q92. Explain Compose's recomposition and state.

Recomposition: when state changes, Compose re-executes the composable function and updates the UI. `remember { mutableStateOf(value) }` stores state across recompositions. Example: `var count by remember { mutableStateOf(0) }` makes count observable — changing it triggers recomposition. Smart recomposition: only affected composables recompose (not the whole tree). Don't store mutable state outside `remember` — it will reset on recomposition. Compose's model is functional and predictable — state flows one direction (top-down).

### Q93. What is an Intent in Android and how is it used?

Intent is a message for starting activities, services, or broadcasts. Explicit: `Intent(context, TargetActivity::class.java).startActivity()` — starts a specific activity. Implicit: `Intent(ACTION_VIEW, Uri.parse("https://example.com"))` — let Android choose which app handles it. Pass data: `putExtra("key", value)`. Retrieve: `intent.getStringExtra("key")`. Modern Kotlin: use Activity Result APIs (`registerForActivityResult`) instead of `startActivityForResult` callbacks. Intents enable component communication and inter-app interaction.

### Q94. Explain Kotlin's `by lazy` and its use in Android.

`val x by lazy { expensive() }` computes x on first access, then caches the result. Thread-safe by default. Useful in Android: `val sharedPref by lazy { context.getSharedPreferences(...) }` — expensive access deferred. Combine with extensions: `val viewModel by lazy { ViewModelProvider(this).get(MyViewModel::class.java) }` (now simplified by androidx extensions). Lazy is a performance optimization and readability tool. Watch out: if accessed on different threads concurrently, it initializes once but may compute multiple times; this is acceptable.

### Q95. What is a Fragment and how do Kotlin extensions help?

Fragment is a reusable piece of UI (like a subsection of an activity). Fragments have lifecycles, backstack support, and args passing. Kotlin extensions `androidx.fragment:fragment-ktx` provide: `val args by navArgs()` (type-safe args), `viewLifecycleOwner` scope, `Fragment.viewBinding()` (no findViewById). Example: `val viewModel: MyViewModel by viewModels()` auto-injects a ViewModel. Kotlin makes Fragment boilerplate-heavy work clean. Modern Navigation Component (Kotlin-first) simplifies fragment management.

### Q96. Explain shared preferences and how to access them in Kotlin.

Shared Preferences store small key-value data (app settings). Access: `getSharedPreferences("name", MODE_PRIVATE).edit { putString("key", value); apply() }`. Kotlin shortcuts: `context.getSharedPreferences(...).edit { ... }` with apply block. Modern: `DataStore` (Kotlin-first replacement for SharedPrefs) using coroutines. `DataStore` is simpler, type-safe, and handles migrations. If starting new Android projects, use DataStore; SharedPrefs are legacy but still widely used.

---

## DSL Design

### Summary

**What this topic covers**

The collection of language features that lets Kotlin be used to build Domain-Specific Languages — small, readable, type-safe vocabularies that look like they're part of the language but are really just regular Kotlin code. Three concern areas live here: (1) the **DSL primitives** — lambdas with receivers (`T.() -> R`) so that inside a block `this` is the target type, extension functions to add fluent methods, infix functions to drop the dot, operator overloading (especially `invoke`, `get`, `rangeTo`, `plus`), and `inline` functions to make all this allocation-free; (2) **safety mechanics** — `@DslMarker` annotations that prevent accidental nested scope resolution (so you can't write a `<div>` inside a `<head>` and have the compiler accept it), sealed hierarchies for restricting valid children, and builder return types that constrain what can be called where; (3) **the canonical DSL families** — HTML builders (kotlinx.html), SQL builders (Exposed), Gradle's Kotlin DSL, Spring's `routes { }` and `beans { }`, Compose's UI tree, Ktor's routing, Anko (deprecated but historically important), and the test DSLs of Kotest and Spek. The 6 questions in this topic survey the design vocabulary.

**Mental model**

Two ideas explain DSL design entirely. (1) **A Kotlin DSL is a tree of nested lambdas-with-receivers**. The outer block sets the root receiver (`html { }` — receiver is `Html`); inside it, calling `body { }` invokes a member function of `Html` that itself takes a `Body.() -> Unit` lambda; inside that, `h1 { }` calls a member of `Body` taking `H1.() -> Unit`; and so on. The DSL is just method calls, with the lambda-with-receiver mechanic making each level feel like its own mini-language. (2) **`@DslMarker` exists because lambda-with-receiver leaks scope**. By default, inside a nested lambda you have access to all enclosing receivers via implicit `this`. That means inside `body { ... }` you could accidentally call `html { ... }` again, nesting an HTML root inside a body. `@DslMarker` shuts this down: applying it to a marker annotation, then annotating each receiver class with that marker, tells the compiler "only the innermost receiver is accessible implicitly". This single annotation is what makes typed DSLs safe.

**Key terms**

- **Lambda with receiver (`T.() -> R`)** — a function literal that takes a `T` as an implicit `this`; the DSL primitive.
- **`@DslMarker`** — meta-annotation; annotate a custom annotation with it, then annotate your DSL receiver classes. Prevents implicit access to outer receivers in nested scopes.
- **Builder pattern, Kotlin-style** — a function that creates an instance, applies a configuration lambda-with-receiver to it, and returns it. `buildString { append(...) }` is the stdlib example; `buildList`, `buildMap`, `buildSet` are the others.
- **`apply` / `also` / `run` / `let` / `with`** — the scope-function family; each is a tiny DSL primitive for object configuration, side effects, or scoped computation.
- **Infix function** — declared `infix fun` and callable as `a name b` without dots or parentheses; powers `1 to "a"`, `key shouldEqual value`, `Users select Users.name`.
- **Operator overloading in DSLs** — `invoke` lets `route("/users") { }` look like a function call; `get`/`set` enable map-like indexing; `rangeTo` enables `1..10`-style ranges; `plus`/`minus` build expression DSLs.
- **`inline fun` in DSLs** — eliminates the lambda allocation cost, allows non-local `return` from DSL blocks, and enables `reified` for type-driven dispatch.
- **kotlinx.html** — official HTML DSL with type-safe nesting (compile error if you try to put a `<p>` directly inside an `<html>` element).
- **Exposed** — SQL DSL with two layers: a typed query DSL (`Users.select { Users.age greater 18 }`) and a higher-level DAO.
- **Gradle Kotlin DSL** — the build script DSL itself; replaces Groovy with type-safe, IDE-friendly Kotlin.
- **Sealed hierarchy for AST nodes** — common DSL pattern; each node type is a sealed subtype and the `when` over them is exhaustive.
- **Type-safe builder** — colloquial term for the whole pattern: nested lambdas-with-receivers + `@DslMarker` + sealed children = compile-time-checked syntax tree.

**Why interviewers ask this**

Three signals. (1) **Language-level reasoning** — DSLs combine almost every Kotlin feature at once. A candidate who can explain how `html { body { h1 { +"hi" } } }` desugars step by step is showing fluency across lambdas, extension receivers, operator overloading, and member resolution. (2) **Library-author taste** — many Kotlin shops maintain internal DSLs (test DSLs, infrastructure DSLs, API client builders). Interviewers probe whether the candidate would design a usable DSL or a confusing one. The right answers favour restraint: shallow nesting, conventional operator names, clear receivers. (3) **`@DslMarker` awareness** — this is the most senior-specific question in the section. Candidates who can name `@DslMarker` and explain why it exists have shipped a DSL or worked deeply inside one. Most candidates have not.

**Common confusions**

- "DSLs are magic" — they're not. Every DSL desugars to ordinary method calls with lambda arguments. If a DSL feels mysterious, the team has either over-used operator overloading or skipped `@DslMarker`.
- "Lambdas with receivers are the same as extension functions" — they're related but distinct. An extension function declares the receiver in its signature; a lambda with receiver has the receiver as part of its *type* (`T.() -> R`).
- "Infix functions are operators" — they're not. Infix is just syntax that drops the dot for binary functions. Operators are a fixed set of conventional names with special syntax (`+`, `*`, `[]`, `()`).
- "Operator overloading lets you invent new operators" — only conventional names work. You can't define `<=>` in Kotlin.
- "`@DslMarker` is optional" — for a real DSL it isn't. Without it, the inner block sees every outer receiver, and naming collisions or accidental nesting silently compile.
- "DSLs are a runtime feature" — almost none of this is runtime. Lambdas with receivers, `@DslMarker`, infix, and operator resolution are all compile-time. Runtime cost is the same as ordinary method calls plus (without `inline`) one lambda allocation per nested block.

**What follows from this topic**

DSL Design is where almost every prior topic converges. Functions & Lambdas provides the lambda machinery; OOP & Operators provides `invoke` and `get`; Spring on Kotlin uses the `routes { }` and `beans { }` DSLs; Android & Platform Context uses Compose, which is the largest and most ambitious DSL in the Kotlin ecosystem. If you can design a small DSL, you have demonstrated mastery of the entire language. Most senior interviews end with a DSL design question for exactly this reason.

### Q108. Explain lambda receivers and DSL design patterns.

Lambda with receiver (`String.() -> Int`) has implicit access to String methods: `val len = { length }` calls String.length implicitly. Used in DSLs to enable fluent, natural syntax. Example: `html { body { h1 { +"Hello" } } }` — each lambda receives its element implicitly. Without receivers: `html(body(h1(+"Hello")))` is nested and unreadable. Receivers make DSLs feel like language extensions. Gradle, Spring, HTML builders all use this pattern.

### Q109. Explain the builder pattern in Kotlin with an example.

Builder pattern: separate construction from representation. Kotlin simplifies with apply: `StringBuilder().apply { append("a"); append("b") }.toString()`. Even simpler with DSL: `buildString { append("a"); append("b") }`. The builder is implicit — you're inside `StringBuilder` context (`this`). Advantages: clean API, immutability (result is created and done), composability. Kotlin's DSLs are builders — you build up a structure (HTML, SQL, configuration) and finalize it.

```kotlin
val html = buildString {
  append("<div>")
  append("content")
  append("</div>")
}
```

### Q110. Explain the marker interface pattern in Kotlin DSLs.

Marker interfaces restrict where lambdas can be nested: `@DslMarker annotation class HtmlMarker`. Annotate classes: `@HtmlMarker class Body { ... }`. Now, inside a `Body` lambda, `this` is Body, not Html. Accessing outer scope requires explicit `this@Html`. Prevents accidental nesting errors (e.g., putting a `<div>` in a `<head>`). Example: `html { body { html { } } }` — the inner `html { }` is caught at compile time because `this` is Body, not Html. Safety feature for DSLs.

### Q111. Explain infix functions and their use in DSLs.

Infix functions: `infix fun String.to(other: String) = Pair(this, other)`. Call without dot: `"a" to "b"` instead of `"a".to("b")`. Used in DSLs for: natural-looking syntax (`mapOf(1 to "a")` vs `mapOf(Pair(1, "a"))`), configuration (`should equal "value"`). Infix is syntactic sugar — less dot notation = more readable. Restrict to common operations (to, plus, times). Overuse makes code confusing.

### Q139. Explain HTML DSL and its type safety.

HTML builders are type-safe DSLs: `html { body { h1 { +"Hello" } } }` — compiler ensures valid nesting (h1 is valid in body, not vice versa). Implemented with sealed classes and lambdas with receivers: each element type has restricted children. Benefits: invalid HTML is caught at compile time, IDE autocomplete, readable syntax. Example: Kotlin stdlib `html {}` builder or kotlinx.html library. Type safety prevents entire categories of bugs.

### Q140. Explain SQL DSLs and the Exposed framework.

Exposed provides two DSLs: DAO (ORM-like, object-oriented) and DSL (SQL-like, functional). DSL example: `Users.select().where { age > 18 }` is type-safe SQL. Type safety: column types are checked, joins are validated. Benefits over raw SQL: no string injection, compile-time checking, refactoring-safe. Exposed's DSL is more idiomatic for Kotlin than raw SQL. Less mature than Hibernate but cleaner and more Kotlin-like.

```kotlin
(Users select Users.name where { Users.age > 18 }).toList()
```

---

## Reflection, Metaprogramming & Compiler Plugins

### Summary

**What this topic covers**

The mechanisms Kotlin offers for working with types, classes, and properties at compile time and at runtime — the advanced territory most senior interviews probe at least once. Three concern areas live here: (1) **Kotlin reflection** — the `kotlin-reflect` library and the `KClass`, `KProperty`, `KFunction`, `KType` hierarchy that wraps Java's `Class`, `Field`, and `Method` with Kotlin-aware metadata (nullability, properties as first-class entities, default parameters, visibility); (2) the **reified-generic trick and serialisation** — `inline fun <reified T>` to preserve a generic type through type erasure, kotlinx.serialization as the compile-time alternative to reflection-based Jackson/Gson, the cost of reflection (slow, large jar) vs codegen (fast, fixed at build time); (3) **compiler-time metaprogramming** — annotation processing via KAPT and KSP (Kotlin Symbol Processing), the Kotlin compiler plugin API used by kotlinx.serialization, Compose, Parcelize, and AllOpen, `@OptIn` for experimental APIs, `@Retention` semantics, and Kotlin Multiplatform's `expect`/`actual` for per-platform implementations of shared APIs. The 7 questions in this topic survey the most advanced corner of the language.

**Mental model**

Two ideas explain everything. (1) **There are two ways to do metaprogramming on Kotlin: reflection at runtime or code generation at compile time, and modern Kotlin strongly prefers the latter**. Java's tradition is runtime reflection (Jackson, Spring, Hibernate). Kotlin's modern stack is code generation: kotlinx.serialization generates serialisers at compile time, Compose generates state machinery at compile time, Room generates DAOs at compile time, Parcelize generates `Parcelable` implementations at compile time. The reflection API exists and is useful, but it's the second choice — slower, larger artefact, harder to optimise for AOT and GraalVM Native Image. (2) **`reified` is the bridge for the common case**. When you want type information at runtime without paying the reflection cost, `inline fun <reified T>` makes the compiler substitute the type at every call site. The function body can then call `T::class` and `is T` as if `T` were a real type, because at the call site it *is* one.

**Key terms**

- **`KClass<T>`** — Kotlin's reflection root; obtained via `T::class` or `obj::class`. Distinct from `java.lang.Class<T>` (bridge with `.java`).
- **`KProperty<T>` / `KFunction<T>`** — first-class references to properties and functions; created with `::name`, `Class::name`, or `obj::name`.
- **`memberProperties` / `members`** — reflective listing of a class's declared properties and methods, including Kotlin-specific metadata like nullability and default parameters.
- **`kotlin-reflect`** — the reflection library; ~3MB jar, opt-in (most projects don't pull it transitively). Required for full `KClass`/`KProperty` introspection.
- **`reified` type parameter** — only valid in `inline` functions; substitutes the actual type at the call site so `T::class` and `is T` work despite JVM erasure.
- **kotlinx.serialization** — official compile-time serialisation framework; `@Serializable` triggers the compiler plugin to generate `KSerializer` implementations.
- **KAPT** — Kotlin annotation processing tool; lets Java annotation processors (Dagger, Room, Glide) work with Kotlin code. Being phased out in favour of KSP.
- **KSP (Kotlin Symbol Processing)** — Kotlin-first annotation processing API; faster than KAPT (no Java stub generation), supports Kotlin-specific constructs like extension functions and properties.
- **Compiler plugin** — code that hooks into the Kotlin compiler to modify the AST or generate code. Used by kotlinx.serialization, Compose, Parcelize, AllOpen, NoArg.
- **`@Retention`** — controls annotation lifetime: `SOURCE` (compile only), `BINARY` (in bytecode, not reflective), `RUNTIME` (reflective). Kotlin's default is `RUNTIME`.
- **`@OptIn`** — opt-in for APIs marked `@RequiresOptIn`; Kotlin's mechanism for evolving experimental APIs without breaking stable code.
- **`expect` / `actual`** — Kotlin Multiplatform declaration pair; `expect` in shared code declares the API, `actual` in each platform target provides the implementation.

**Why interviewers ask this**

Three signals. (1) **Performance and AOT awareness** — production Kotlin increasingly targets GraalVM Native Image, AOT-compiled Android, and Kotlin/Native, all of which restrict reflection. A candidate who reaches for kotlinx.serialization instead of Jackson, or KSP instead of KAPT, has internalised the modern Kotlin posture. (2) **The reified question** — `inline fun <reified T>` is a common interview probe because it sits at the intersection of generics, type erasure, and the `inline` machinery. Candidates who can explain *why* `reified` requires `inline` are demonstrating mental-model depth, not just syntax recall. (3) **Plugin awareness** — most candidates use compiler plugins daily (`kotlin-spring`, `kotlin-jpa`, `kotlinx.serialization`, Compose) without realising they're plugins. Knowing they exist and what they do is a senior signal; building one is a staff signal.

**Common confusions**

- "Kotlin reflection is free" — it requires `kotlin-reflect`, which adds ~3MB to your jar and is slower than Java reflection because of the additional Kotlin metadata.
- "`T::class` always works in a generic function" — only in `inline` functions with `reified T`. Otherwise the type is erased and `T::class` won't compile.
- "KAPT and KSP are the same thing" — KAPT runs Java annotation processors by generating Java stubs from Kotlin (slow); KSP processes Kotlin source directly via a Kotlin-native API (much faster). KSP is the strategic direction.
- "Reflection and annotation processing are the same" — reflection happens at runtime against loaded classes; annotation processing happens at compile time and generates new source files.
- "Compiler plugins are easy to write" — they aren't. The Kotlin compiler API is internal, unstable, and version-specific. Use existing plugins; write your own only if you're prepared to maintain it across compiler versions.
- "`@Retention(SOURCE)` annotations work at runtime" — they don't. They're erased after compilation; useful only for compile-time tools.

**What follows from this topic**

Reflection and metaprogramming are the most senior territory. Spring on Kotlin's proxy magic is reflection. Testing in Kotlin's MockK uses both reflection (to intercept calls) and compiler-time code generation (for inline mocks). Performance & GC returns to the cost of reflection vs codegen. If you can answer `reified` clearly and name two compiler plugins you've used, you've covered the most senior corner of the primer.

### Q112. What is Kotlin reflection and how does it differ from Java reflection?

Kotlin reflection is higher-level than Java reflection — works with Kotlin's type system directly. `MyClass::class` is a `KClass`, not `Class`. Advantages: KClass knows about properties (not just fields), supports extensions, handles nullable types. Example: `MyClass::class.members` lists all members; `MyClass::prop.get(obj)` accesses a property. You can also use Java reflection: `MyClass::class.java` bridges to Java. Kotlin reflection is cleaner but less mature (performance). Necessary for: serialization libraries, dependency injection, advanced type manipulation.

### Q113. Explain serialization and why Kotlin makes it complex.

Serialization (object -> bytes/JSON) requires accessing object state. Kotlin complicates this: null safety, immutability, generics. Two approaches: Java reflection (slow, verbose) or code generation (fast, clean). Kotlinx.serialization uses code generation: `@Serializable data class User(val name: String)` generates serialization code. Alternative: Jackson (Java), Moshi (Android). Kotlinx.serialization is Kotlin-first and recommended for new code. Downside: requires annotation, no dynamic serialization.

### Q114. Explain inline reified with reflection.

Combining `inline` + `reified` with reflection: `inline fun <reified T> getProperty(obj: Any, name: String) = obj::class.memberProperties.first { it.name == name }`. `reified` preserves type info, then `T::class` accesses class metadata. Use case: generic serialization, ORM mapping. This is advanced — most code uses libraries that handle it. Understanding it is interview material for senior roles.

### Q141. Explain compiler plugins and their use cases.

Compiler plugins intercept compilation and modify the AST (abstract syntax tree) or generate code. Use cases: serialization libraries (kotlinx.serialization generates serializers), code generation (reducing boilerplate), DSL extensions. Plugins are advanced (require understanding Kotlin compiler internals). Example: `@Serializable` is handled by a plugin (code generation). Other examples: Jetpack Compose, Parcelize. Plugins are powerful but complex — use existing plugins (don't write custom unless necessary). Each Kotlin version requires plugin updates (maintenance burden).

### Q142. Explain annotation processing and @Retention.

Annotation processing runs during compilation, reading annotations and generating code. `@Retention(RUNTIME)` keeps annotation in runtime bytecode (reflection visible). `@Retention(SOURCE)` removes it after compilation (docs only). Processing happens in rounds: read annotations, generate files, repeat. Used in: Dagger DI (generates component implementations), Lombok (generates getters/setters), KAPT (Kotlin annotation processing). Kotlin-native approach: compiler plugins (better than Java's annotation processing). KAPT (Kotlin Annotation Processing Tool) allows Java annotation processors to work with Kotlin.

### Q143. Explain Kotlin multiplatform and code generation.

Kotlin Multiplatform (KMP) allows sharing code across JVM, JS, Native. Platform-specific code via `expect/actual`: `expect class File` (abstract), then `actual class File` (platform-specific implementation) in each platform. Useful for: libraries (share logic, native I/O per platform), business logic (shared algorithms). Code generation is per-platform. Modern approach: share as much as possible, platform-specific only where necessary (I/O, threading, graphics).

---

## Performance, Memory & GC

### Summary

**What this topic covers**

The performance-aware corner of Kotlin — the cost model behind the syntax, the allocation traps that show up in profiling, and the memory-management primitives that matter when you're not just writing happy-path business logic. Three concern areas live here: (1) the **cost of language features** — what `inline` actually buys you, what data classes' generated methods cost in hot paths, what sequences win and lose against lists, what string interning means for `==` vs `===`; (2) **boxing, allocation, and GC** — primitive vs object representation, autoboxing in generic code (`List<Int>` boxes every element), object pool patterns, intermediate collection allocations in functional pipelines, and the way GC pressure compounds under naive functional style; (3) **the reference-strength toolkit** — strong references (the default), weak references (don't prevent GC), soft references (GC keeps until memory pressure), and their use cases in caches and observer registries. The 8 questions in this topic sit at the boundary between language ergonomics and JVM reality.

**Mental model**

Two ideas explain everything. (1) **Kotlin is a thin layer over the JVM's allocation and GC model**. Every `data class` instance is a heap object. Every `mapOf(...)` is an `ArrayList<Pair<...>>` of `Pair` objects feeding a hash map. Every lambda you write, unless inlined, is a `Function1` allocation. Every `Int` boxed into a `List<Int>` is an `Integer`. Kotlin's syntactic sugar doesn't change the cost — it changes whether you notice it. Profiling tools (JFR, async-profiler, VisualVM) reveal what the language hides. (2) **`inline` and primitive arrays are the main escape hatches**. `inline` removes function-call overhead and lambda allocation for higher-order functions. `IntArray`, `LongArray`, `DoubleArray` etc. give you flat, unboxed storage for primitives — `IntArray(n)` is one allocation of `n * 4` bytes, while `Array<Int>` is one allocation of `n` references plus `n` boxed `Integer` objects. For hot, primitive-heavy code, the difference is order-of-magnitude.

**Key terms**

- **`inline` function** — function body and lambda bodies substituted at the call site; eliminates call overhead and lambda allocation; can bloat bytecode if overused on large functions.
- **Autoboxing** — `Int` (primitive on the JVM where possible) becomes `Integer` whenever placed into a generic container, returned through a generic API, or stored in a nullable field.
- **`IntArray` / `LongArray` / `DoubleArray`** — primitive-backed arrays; flat memory, no boxing, the right answer for performance-critical numeric work.
- **`Array<T>` vs primitive array** — `Array<Int>` is `Integer[]` (boxed); `IntArray` is `int[]` (unboxed). Same applies to `Long`, `Double`, `Boolean`, etc.
- **`Sequence<T>`** — lazy stream; avoids intermediate collection allocations on long chains; per-element wrapper overhead can lose on small inputs.
- **`data class` cost** — generated `equals`/`hashCode`/`toString` walk every property; cheap for small classes, observable in profiling for huge classes used in tight loops.
- **String interning** — `"hello" === "hello"` is true because string literals are interned; `String(...)` produces a fresh object that fails `===` but passes `==`.
- **Strong reference** — the default; the object is reachable and won't be GC'd.
- **Weak reference (`WeakReference<T>`)** — does not prevent GC; `ref.get()` returns null after the object is collected. Use for observer/listener registries and caches where you don't want to retain entries past their natural lifetime.
- **Soft reference (`SoftReference<T>`)** — the GC may collect, but only under memory pressure; suitable for image caches and other "drop if needed" patterns.
- **`WeakHashMap`** — Java collection with weak keys; entries disappear when their keys are GC'd. Useful for per-instance metadata that shouldn't outlive the instance.
- **GC pressure** — sustained high allocation rate forcing frequent GC cycles; the most common Kotlin performance pathology, usually caused by intermediate collections and lambda allocations in hot loops.

**Why interviewers ask this**

Three signals. (1) **Profiling instinct** — interviewers want candidates who reach for measurement before optimisation. Asking about `inline` or sequences probes whether the candidate has actually benchmarked the difference or is repeating folklore. The best answers cite specific contexts: "for chains of three-plus operators over collections larger than ~1000 elements, sequences usually win". (2) **JVM literacy** — Kotlin runs on the JVM, and senior interviews want JVM knowledge: GC algorithms (G1, ZGC, Shenandoah), heap sizing, allocation profiling, when to use primitive arrays. (3) **Reference-strength awareness** — most candidates have never used a weak reference. The candidates who have are the ones who've debugged a memory leak in production. Naming `WeakReference` and explaining when to use it is a strong real-experience signal.

**Common confusions**

- "`inline` is always faster" — `inline` copies the function body. For a small function with many call sites, that's bytecode bloat that may *hurt* JIT inlining heuristics. The stdlib uses `inline` strategically, not universally.
- "Sequences are always faster" — they're not. For short chains (one or two operators) over small lists, the per-operator wrapper allocation overhead loses to a single array pass. Benchmark.
- "Data classes are slow" — they're not, unless you're using them as values in extremely hot loops. The generated `hashCode` and `equals` are linear in property count; for a 3-field data class this is a handful of nanoseconds.
- "`==` and `===` are interchangeable" — `==` calls `equals`; `===` is reference identity. For strings, primitives, and value classes, `==` is what you want. `===` is rarely correct.
- "Weak references solve memory leaks" — they prevent retention, but introduce nullability. Misusing them gives you spurious `null`s instead of leaks. Use carefully and always handle the null case.
- "Soft references are like weak references but better" — they're different. Soft references resist collection under memory pressure but eventually yield; weak references are collected at the next GC if otherwise unreachable.

**What follows from this topic**

Performance & GC tightens up almost every previous topic. Collections returns here for the sequence-vs-list decision. Coroutines returns here for the cost of lambda allocation in builders and operator chains. Reflection returns here for the runtime cost of `kotlin-reflect`. Java Interop returns here for boxing across the language boundary. The skill this section tests is the ability to reason about a Kotlin codebase's runtime cost without dropping into bytecode — the senior-engineer move that separates someone who writes Kotlin from someone who ships Kotlin at scale.

### Q119. Explain `inline` functions and their performance implications.

`inline` functions are substituted at compile time (no function call overhead). Useful for: lambdas (avoids allocation), hot paths (small functions called frequently). Downsides: increases bytecode size (code duplication), non-local returns (break out of enclosing scope), cannot be recursive. Benchmark before inlining — the overhead of small functions is often negligible. Modern JITs (HotSpot) inline automatically; manual inlining is a micro-optimization. Use `inline` when: functions take lambdas (avoid allocation) or in frameworks (Kotlin stdlib does this).

### Q120. Explain object allocation and garbage collection in Kotlin.

Kotlin objects are allocated on the heap, garbage collected when unreachable. Collections (List, Map) allocate objects for each entry. Excessive allocation causes GC pressure, pauses. Optimization: reuse objects (e.g., object pools), use primitives (Int vs Integer via autoboxing), avoid intermediate collections (`sequence` instead of `list` chains). Kotlin standard library does this for you (`map { }.filter { }` chains use sequences internally for efficiency in some cases — not always). Profile before optimizing.

### Q121. What are data classes and their performance characteristics?

Data classes auto-generate `equals()`, `hashCode()`, `toString()`, `copy()`. Advantages: safe for sets/maps, readable error messages. Performance: these methods have overhead (equality checks fields, hashCode hashes fields). For huge datasets, avoid data classes in hot paths if these methods aren't needed. In practice, the overhead is minimal and readability wins. Profile if you suspect issues. Most Kotlin code favors data classes for safety/readability.

### Q122. Explain sequence vs list performance tradeoffs.

`Sequence` is lazy — intermediate operations don't create collections. `list.map { }.filter { }` creates two lists (intermediate); `sequence().map { }.filter { }` chains without allocation. Benefit: for large collections or many transformations, sequences are faster. Cost: some operations (size, sorting, random access) require materialization (toList()). Benchmark: sequences are faster for long chains, lists are faster for small collections or when you need multiple passes. Modern Kotlin often prefers sequences.

### Q123. Explain string interning and identity vs equality.

String interning: JVM caches string literals and identical strings. `"hello" === "hello"` is true (same reference). `String("hello") === "hello"` might be false (different object). Equality (`==` calls `equals()`) is safer: `"hello" == String("hello")` is true. Use `==` for comparison; `===` only when you specifically need identity. Interning is an optimization; don't rely on it in code. Kotlin uses `===` rarely (and `==` by default in equals implementations).

### Q144. Explain boxing and autoboxing.

Primitives (Int, Long, Boolean) are unboxed (stack, efficient). Generics require objects, so `List<Int>` boxes ints into `Integer` objects. Each box allocation is memory overhead; unboxing back to primitive is CPU overhead. Kotlin can optimize: the compiler sometimes avoids boxing (primitive specialization in newer versions). Multiplatform Kotlin (Native, JS) handles this differently. For hot paths with millions of elements, be aware of boxing (use specialized collections, primitive arrays).

### Q145. Explain weak references and their use cases.

Weak references don't prevent garbage collection. `val ref = WeakReference(obj)` — if obj is unreachable otherwise, GC collects it despite the weak ref. Use cases: caches (cache entries shouldn't keep objects alive), observers (listeners shouldn't keep subjects alive). Example: Android's context leaks — listeners holding context refs prevent GC. Weak refs: `ref.get()` returns the object or null if collected. Java has `WeakHashMap` (uses weak keys). Kotlin: use with care (unexpected nulls) but useful for memory-efficient patterns.

### Q146. Explain soft references.

Soft references are like weak refs but hint to GC: "collect this if you need memory." `SoftReference(obj)` — GC prefers not to collect soft refs (but can if heap is low). Use: resource-intensive caches (images, parsers). More forgiving than weak refs — you get the object if GC hasn't been pressed for memory. Java has no soft ref collections in stdlib; use `java.util.SoftReference` manually. Less common than weak refs but useful for caching large objects.

---

## Java Interoperability

### Summary

**What this topic covers**

The set of mechanisms that let Kotlin and Java coexist in the same project — and the seams where the two languages don't quite agree. Three concern areas live here: (1) **calling Java from Kotlin** — platform types (`String!`) where Java's null-unaware signatures meet Kotlin's null-aware type system, the absence of checked exceptions in Kotlin, SAM (Single Abstract Method) conversion that lets Kotlin lambdas implement Java functional interfaces transparently, and the way `void`/`Unit` are mapped automatically; (2) **calling Kotlin from Java** — the `@JvmName`, `@JvmStatic`, `@JvmField`, `@JvmOverloads`, `@JvmDefault`/`@JvmDefaultWithCompatibility`, and `@Throws` annotations that control the JVM-side signatures Kotlin emits, top-level functions ending up in a `FooKt` synthetic class by default, and the boilerplate that Java callers face when consuming Kotlin features like default arguments and extension functions; (3) the **type mapping table at the language boundary** — `Unit` vs `void`, Kotlin's `String?` vs Java's nullable `@Nullable String`, Kotlin's `IntArray` vs Java's `int[]` vs `Integer[]`, Kotlin's `List<T>` vs Java's `List<T>` (mutable from Java even when declared read-only in Kotlin). The 5 questions in this topic survey the interop surface.

**Mental model**

Two ideas explain almost everything. (1) **The compiler bends backwards to make interop seamless, but the null-safety contract leaks at the boundary**. Calling a Java method that returns `String` gives you back `String!` — a *flexible type* that the compiler accepts as either `String` or `String?` without warning. This is by design; mass-annotating every Java return type as nullable would make Java codebases unusable from Kotlin. The cost is that NPEs can sneak in via Java calls. Best practice: wrap Java APIs at the module boundary with Kotlin-typed adapters that explicitly choose `T` or `T?`. (2) **Java callers see whatever the Kotlin compiler emits, which is often surprising**. A top-level `fun foo()` in `Utils.kt` becomes `UtilsKt.foo()` from Java. A property `val name` becomes `getName()`. An object's member is reached through `Foo.INSTANCE.bar()`. Default arguments become method overloads only if you add `@JvmOverloads`. Extension functions become static methods with the receiver as the first parameter. The `@Jvm*` annotation suite exists to make these emissions Java-friendly when you need them to be.

**Key terms**

- **Platform type (`T!`)** — Kotlin's representation of a Java type with unknown nullability; the compiler accepts it as both `T` and `T?` without warning.
- **`@Nullable` / `@NotNull`** — JSR-305 / JetBrains / Spring nullability annotations; Kotlin reads these and converts the platform type into a real nullable or non-null type.
- **SAM conversion** — automatic conversion of a Kotlin lambda into an implementation of a Java single-abstract-method interface (e.g. `Runnable`, `Comparator`). Kotlin's own `fun interface` extends this to Kotlin-defined interfaces.
- **Checked exceptions** — Kotlin has none. Java methods that declare `throws IOException` can be called without `try` or `throws`. The exception still propagates at runtime.
- **`Unit` vs `void`** — `Unit` is a singleton type; Kotlin functions returning `Unit` appear as `void` to Java. Java `void` methods appear as returning `Unit` to Kotlin.
- **`@JvmName("...")`** — overrides the JVM-visible name of a function, property, or top-level declaration. Useful for resolving signature clashes or producing Java-friendly names.
- **`@JvmStatic`** — emits a real static method on the enclosing class for a member of a `companion object` or `object`. Without it, Java has to go through `Foo.Companion.bar()`.
- **`@JvmField`** — exposes a property as a public field with no getter/setter, useful for plain constants visible to Java.
- **`@JvmOverloads`** — generates overloaded JVM methods for each default argument combination, so Java callers don't have to pass every parameter.
- **`@Throws`** — declares checked exceptions in the JVM signature so Java callers can catch them without unchecked-cast workarounds.
- **`@file:JvmName("Foo")`** — file-level annotation that changes the synthetic class name for top-level declarations (default would be `FooKt`).
- **`FileKt` synthetic class** — when you put top-level functions in `Foo.kt`, Java sees them as static methods on `FooKt`. Rename with `@file:JvmName`.

**Why interviewers ask this**

Three signals. (1) **Real-world fluency** — almost no Kotlin project is pure Kotlin. Spring is Java. JDBC is Java. AWS SDK is Java. Most logging frameworks are Java. Interviewers ask about platform types because they predict whether the candidate will write safe code at the Java boundary or scatter NPEs through the codebase. (2) **Library author thinking** — `@JvmStatic`, `@JvmField`, `@JvmOverloads`, `@JvmName` are the toolkit for publishing Kotlin libraries that Java callers can use without rage. Naming them shows the candidate has shipped a library or maintained one. (3) **The collection-mutability surprise** — Kotlin's `List<T>` is read-only at the type level, but the underlying object is mutable from Java. A senior interview probe is "what happens if you return a Kotlin `List<T>` to Java code that calls `.add(...)`?" The answer is: it works, because the runtime object is `ArrayList`. Defensive copying at the boundary is the fix.

**Common confusions**

- "`String!` is a real type" — it isn't. It's a *flexible* type only meaningful at the type-checker level; at runtime it's just `String`. The compiler chooses between treating it as `String` or `String?` based on usage.
- "Kotlin has no exceptions" — Kotlin has exceptions; it just doesn't have *checked* exceptions. Java's `try-catch` still works in Kotlin and vice versa.
- "Default arguments work from Java" — they don't, unless you add `@JvmOverloads`. Without it, Java callers must pass every argument.
- "`object` is a Java singleton" — Kotlin `object Foo` is callable from Java as `Foo.INSTANCE`. Members are accessed via the singleton instance unless marked `@JvmStatic`.
- "Companion object members are Java static" — only if you annotate them `@JvmStatic`. Otherwise Java sees `MyClass.Companion.bar()`.
- "Kotlin and Java handle nullability the same way" — they don't. Java has no compile-time nullability; Kotlin treats it as part of the type. Without `@Nullable`/`@NotNull` annotations on the Java side, the boundary is undecidable.

**What follows from this topic**

Java interop is the substrate under almost every production Kotlin codebase. Spring on Kotlin is mostly Java consumed through interop. Testing in Kotlin uses Mockito (Java) or MockK (Kotlin) — both interoperate. Reflection bridges through `KClass::class.java` to `java.lang.Class<T>`. Null Safety's platform type behaviour originates here. If you can wrap a Java library cleanly with Kotlin-typed adapters at the module boundary, you've absorbed the interop story. If not, NPEs from Java leak through your codebase forever.

### Q129. Explain platform types and null safety when calling Java.

When you call Java methods from Kotlin, return types lack null info. A Java method `String getName()` could return null or not. Kotlin represents this as a platform type `String!` — "could be null or not". You must decide: treat as `String?` (nullable) or `String` (non-null). Platform types are unsafe — you lose compile-time null safety. Best practice: wrap Java code with Kotlin nullability: `fun getNameSafe(): String? = obj.getName()` documents the choice and makes it explicit.

### Q130. Explain checked exceptions in Kotlin.

Java has checked exceptions (must be caught or declared). Kotlin has no checked exceptions — all exceptions are unchecked. When you call Java code throwing checked exceptions, Kotlin ignores them. Example: `FileInputStream` throws `FileNotFoundException` (checked); Kotlin code doesn't force you to catch it. You can still catch it: `try { FileInputStream(...) } catch (e: FileNotFoundException)`. This is a design decision: Kotlin treats all exceptions as unchecked, simplifying error handling.

### Q131. What is the difference between Java's `void` and Kotlin's `Unit`?

Java `void` means "no return value". Kotlin `Unit` is an actual type representing "no value" (a singleton object). `fun foo(): Unit = Unit` is valid; `fun bar() { ... }` implicitly returns `Unit`. Benefits: composability (treat Unit as a value, pass it around), consistency (everything is a type). When calling Java methods returning void from Kotlin: they return `Unit`. When calling Kotlin functions returning Unit from Java: they return `void`. Functionally equivalent; Kotlin's model is more consistent.

### Q132. Explain Kotlin's SAM conversion when calling Java.

Java Single Abstract Method interfaces (like `Runnable`) can be implemented as lambdas in Kotlin (automatic SAM conversion): `thread(Runnable { println("hi") })` simplifies to `thread { println("hi") }`. Works only with one-method interfaces. Kotlin doesn't require SAM for its own interfaces — it has lambdas natively. SAM conversion is a convenience for Java libraries. Can be disabled with `@Suppress("FunctionName")` or `@JvmSuppressWildcards` on the interface.

### Q133. What is `@JvmName` and when should you use it?

`@JvmName("altName")` changes the name of a method/property seen from Java. Useful when Kotlin generates a name that Java doesn't like. Example: a Kotlin property `isEmpty` generates a Java method `isEmpty()`, but if you want the Java name to be different, use `@JvmName("empty")`. Less common case: top-level functions in a Kotlin file generate a class `FileKt`; `@JvmName` changes the class name. Use when: interoperability with Java is important, existing Java code expects certain names.

---

## Advanced Concepts & Miscellaneous

### Summary

**What this topic covers**

The senior-and-staff-level grab bag — features that don't fit neatly into the prior topics but show up in real interviews because they distinguish a Kotlin engineer who has shipped from one who has dabbled. Three concern areas live here: (1) **language features at the edges** — `tailrec` for stack-safe recursion, property delegation revisited (`by lazy`, `by observable`, custom delegates), the `@OptIn` and experimental-API model, `typealias` vs `data class` vs value class for type modelling, value classes (formerly inline classes) for zero-cost type-safe wrappers, `NoSuchElementException` and the `*OrNull` discipline, `crossinline` revisited; (2) **structured-concurrency depth and coroutine ergonomics** — cancellation scopes and `SupervisorJob`, `CoroutineContext` as a composable bag of elements, the `runBlocking`-vs-`runTest` choice for tests vs entrypoints; (3) **design-pattern realisation in Kotlin** — the repository pattern, the decorator pattern via class delegation, Spring's annotation-based configuration revisited, `@Transactional` at class vs method scope. The 15 questions in this topic survey the senior surface and bring earlier topics together at production scale.

**Mental model**

Two ideas anchor everything. (1) **Most advanced Kotlin features are about making a previously-implicit cost explicit and zero**. Value classes (`@JvmInline value class UserId(val id: Int)`) wrap a primitive with type safety but emit as the underlying primitive at runtime — zero allocation, full compile-time type distinction. `tailrec` lets you write recursion with the safety of a loop. `inline` + `reified` preserves type information without runtime reflection. `by lazy` defers expensive initialisation without sacrificing non-null typing. Each of these features answers "how do I get safety/expressivity without paying the runtime cost?" and Kotlin's answer is consistently "the compiler will rewrite it". (2) **The design patterns chapter of the Gang-of-Four book gets shorter in Kotlin**. Singleton is `object`. Decorator is class delegation. Factory is `companion object invoke`. Builder is a scoped lambda-with-receiver. Observer is `Flow` or `StateFlow`. Strategy is a function parameter. The interview question "explain pattern X in Kotlin" usually has a one-line answer that surprises Java-trained candidates.

**Key terms**

- **`tailrec`** — compiler-enforced tail-call optimisation; the recursive call must be the literal last expression. Rewrites recursion into a loop.
- **`by lazy { ... }`** — property delegate; computes on first access, caches the result, thread-safe by default (`LazyThreadSafetyMode.SYNCHRONIZED`). Configurable to `PUBLICATION` or `NONE`.
- **Value class (`@JvmInline value class T(val v: U)`)** — single-property wrapper with zero runtime cost; the underlying value is used directly. Replaces the older `inline class` syntax.
- **`@OptIn(ExperimentalX::class)`** — explicit acknowledgement that you're using an unstable API; Kotlin's evolution mechanism for new features that may change.
- **`typealias` vs value class** — typealias is a pure compile-time rename with no type-safety boundary (`UserId` and `Int` are interchangeable); value class is a real type at compile time, primitive at runtime.
- **`NoSuchElementException`** — thrown by `first`, `last`, `single` when the predicate matches nothing. The `*OrNull` variants return `null` instead — almost always the right choice in production code.
- **`crossinline`** — forbids non-local returns from a lambda parameter; required when the lambda is captured by a different control-flow construct (e.g. passed to a thread or a non-inline call).
- **`SupervisorJob` / `supervisorScope`** — variants that prevent a child failure from cancelling its siblings; used for independent parallel work.
- **`CoroutineContext`** — a composable map of elements (`Job`, `Dispatcher`, `CoroutineExceptionHandler`, custom keys); inherited and overridden when launching child coroutines.
- **`runTest`** — coroutine test runner with virtual time and a `TestDispatcher`; skips `delay` calls to keep tests fast.
- **Repository pattern** — interface-based abstraction over data access; Spring Data turns the interface into an auto-generated implementation.
- **Decorator via `by`** — class delegation that forwards an interface to a backing object, allowing selective override. The Kotlin-idiomatic decorator implementation.

**Why interviewers ask this**

Three signals. (1) **Synthesis** — these questions force the candidate to combine features from earlier topics. Explaining "decorator pattern in Kotlin" requires delegation (Q61), interfaces (Q63), and composition over inheritance (Q68). Senior interviews want to see the candidate join the dots. (2) **Currency** — value classes, `@OptIn`, KSP, and the `runTest`-over-`runBlocking` migration all happened in the last several years. A candidate who knows these features is signalling current production experience; a candidate stuck on Kotlin 1.3 idioms is signalling otherwise. (3) **Production scars** — `NoSuchElementException` from `first()` on an empty list, `var` in a `data class` breaking a `HashSet`, `lateinit` access before init — these are the bugs that real production codebases ship. Candidates who anticipate them have debugged them. Candidates who haven't, will.

**Common confusions**

- "Value classes are the same as data classes" — they're not. Data classes generate methods and exist as real heap objects. Value classes erase to their wrapped value at runtime and exist only at the type level. Use value classes for IDs, units of measurement, and other identity-free wrappers.
- "`tailrec` always works" — only if the recursive call is the *literal* last expression. `n * recurse(n-1)` is not tail-recursive because the multiplication happens after the call.
- "`runBlocking` is fine in tests" — it works but is slow. `runTest` uses virtual time and `TestDispatcher`, finishing in milliseconds rather than waiting for real `delay()`s.
- "`first()` and `firstOrNull()` are interchangeable" — `first()` throws on empty; `firstOrNull()` returns `null`. Production code overwhelmingly prefers `*OrNull` variants with explicit handling.
- "`@OptIn` is a warning suppression" — it's a real opt-in acknowledgement. The compiler flags experimental APIs; `@OptIn` documents that you accept the instability risk.
- "`SupervisorJob` catches exceptions" — it doesn't. It changes propagation so siblings aren't cancelled, but the failing child's exception still surfaces via the handler. You still need `try-catch` or a `CoroutineExceptionHandler`.

**What follows from this topic**

This is the closing section by design. It pulls together fundamentals (`val`/`var`, `lateinit`, scope functions), null safety (`!!`, platform types), coroutines (cancellation, context, structured concurrency), OOP (delegation, decorator), and performance (value classes, `tailrec`). If a candidate handles this section confidently, they have absorbed the full primer. If they stumble, the gaps point back to the specific earlier topic — the section is a diagnostic surface as much as a syllabus.

### Q156. Explain tail call optimization and tailrec.

Tail call: function's last operation is a recursive call. Example: `tailrec fun fib(n: Int, a: Int = 0, b: Int = 1): Int = if (n == 0) a else fib(n-1, b, a+b)`. `tailrec` keyword signals to compiler: optimize this tail recursion into a loop (no stack growth). Without `tailrec`, deep recursion causes StackOverflowError. The compiler rewrites the recursion as a loop internally. Use `tailrec` for algorithmic recursion on large inputs.

### Q157. Explain `by` property delegation with an example.

Property delegation lets you customize property access without boilerplate. Example: `val name: String by observable("") { _, _, new -> log("Changed to $new") }`. The `observable` delegate handles getting and setting, triggering a callback. Standard delegates: `lazy`, `observable`, `vetoable`, `notNull`. Custom: implement `ReadOnlyProperty<C, T>` or `ReadWriteProperty<C, T>` with `getValue`/`setValue`. Cleaner than overriding `get`/`set` for complex logic.

### Q158. Explain the @OptIn annotation and experimental APIs.

`@OptIn` marks code as using experimental/unstable APIs. Example: `@OptIn(ExperimentalCoroutinesApi::class) fun foo() { ... }` uses experimental coroutines. Stability guarantees: `Experimental` = might change, `Alphas` = early preview, `Beta` = mostly stable, `ReleaseCandidate` = very stable, no marker = stable API. Use `@OptIn` when you need experimental features; document the reason. Kotlin team uses this to evolve the language without breaking stable code.

### Q159. Explain typealias vs data class.

`typealias UserId = Int` creates an alias, no runtime overhead, purely compile-time. `data class UserId(val value: Int)` creates a new type, runtime object. Use typealias for: short names for complex types (`typealias Handler = (String) -> Unit`), semantic names (UserId = Int, semantically different from just Int). Use data class when you want a real type (runtime identity, methods). Typealias is lighter; data class is safer.

### Q160. Explain coroutine cancellation scopes and structured concurrency.

Structured concurrency: scope defines lifetime of coroutines. Cancelling scope cancels all children. Example: `viewModelScope.launch { }` — when ViewModel is destroyed, scope is cancelled, all coroutines cleanup. Prevents leaks. Unstructured (bad): `GlobalScope.launch { }` — no parent, no automatic cleanup. Always use structured scopes tied to lifetimes (Android: `viewModelScope`, `lifecycleScope`; backend: explicit `CoroutineScope(Job() + Dispatchers.IO)`). Structured concurrency is the biggest safety improvement coroutines bring.

### Q161. Explain annotation-based configuration in Spring and how Kotlin improves it.

Annotation-based config: `@Service class MyService` marks as bean. Spring scans and registers it. Kotlin improves: constructor injection is implicit, no `@Autowired` needed. Example: `@Service class MyService(private val repo: UserRepository)` — repo is auto-injected. Kotlin's type system and conciseness make annotations cleaner. XML config (old) and Kotlin DSL config (modern) are alternatives. Annotation-based is the most common and most concise in Kotlin.

### Q162. Explain the repository pattern and its benefits.

Repository pattern: abstract database access behind an interface. Example: `interface UserRepository { fun findById(id: Long): User? }` with implementations (JPA, custom SQL, mock). Benefits: testable (mock repository), swappable storage (switch databases), dependency inversion (business logic depends on interface, not DB). Spring Data implements this: `interface UserRepository : CrudRepository<User, Long>` auto-generates implementation. Essential for clean architecture.

### Q163. Explain lazy evaluation and `by lazy`.

`by lazy { ... }` computes the value on first access, then caches. Example: `val expensive: Data by lazy { computeExpensive() }` — computation defers until first use. Thread-safe by default. Useful: expensive I/O, initialization in constructors, optional fields. Downside: unpredictable timing (first access might be slow), cannot be reset. Use when: initialization is optional, expensive, and can wait until needed.

### Q164. Explain the decorator pattern in Kotlin.

Decorator pattern: wrap an object to add behavior. Example: `class LoggedRepository(val repo: Repository) : Repository by repo { override fun get(id: Long) = { log("get $id"); repo.get(id) } }`. Delegation (`by repo`) forwards most calls; override specific methods to add logging. Advantages over inheritance: composed dynamically, don't modify original class. Kotlin's `by` keyword makes decorators idiomatic and concise.

### Q165. Explain the difference between @Transactional on a class vs method.

`@Transactional` on a class applies to all public methods (Spring proxy intercepts). On a method: only that method is transactional. Class-level is simpler if all methods are transactional; method-level is more precise (only the few methods that need transactions). Caveat: non-public methods and calls from within the class don't get transactional proxy. Best practice: method-level for clarity (explicit which methods are transactional).

### Q166. Explain the use of `crossinline` in inline functions.

`crossinline` allows a lambda parameter to be passed to nested functions without being inlined itself. Example: `inline fun retry(block: crossinline () -> Unit) { ... thread { block() } ... }` — `block` is not inlined (can't inline across thread boundary), but the `retry` function is still inline. Used when: inline function calls other inline functions, and the lambda can't be inlined in the nested context. Rare but necessary for correctness.

### Q167. Explain the NoSuchElementException and how to avoid it.

`NoSuchElementException` thrown by `first()`, `last()`, `single()` when no element matches. Example: `list.first { it > 10 }` on an empty list throws. Avoid: use `firstOrNull`, `lastOrNull`, `singleOrNull` (return null instead), or guard with checks. Better: `list.find { it > 10 }` (nullable). In tests, `first()` is okay (fail fast); in production, use `OrNull` variants. Never ignore exceptions in production code.

### Q168. Explain Kotlin's `value` modifier and inline classes.

Inline classes (Kotlin 1.3+, now `value classes`): `value class UserId(val id: Int)` wraps a value with no runtime overhead. At runtime, just `Int` (not a separate object). Use cases: type-safe wrappers (UserId ≠ Int semantically), domain-driven design. Compiler optimizes away the class. Constraints: single property, no inheritance, must be immutable. Useful for: IDs, units of measurement. Replaces the old `typealias` for safety.

### Q169. Explain coroutine context and Job hierarchy revisited.

Coroutine context (`CoroutineContext`) is a set of elements: job, dispatcher, exception handler, etc. When you launch: `launch(ctx) { }`, the coroutine inherits ctx. Job hierarchy: job has parent (scope's job), children are jobs launched within the scope. Cancelling parent cancels children. Context propagation ensures: scope lifetime, exception handling, dispatcher. You rarely manipulate context manually; frameworks (Spring, Android) manage it. Understanding context is essential for coroutine mastery.

### Q170. Explain when to use `runBlocking` and when to use `runTest`.

`runBlocking` blocks the calling thread, running coroutines to completion. Used in: `main` functions (bridge suspend to blocking), simple demonstrations. `runTest` (from `kotlinx-coroutines-test`) is designed for tests — controls time (fast-forwards delays), runs on `TestDispatcher`, measures test time. Use `runTest` for all coroutine tests. Use `runBlocking` only at top-level (main function) or when you absolutely need to block. Mixing them: `runTest { runBlocking { } }` is a code smell (redundant).

---

## Closure

This primer covers Kotlin essentials for interviews. Kotlin's conciseness and safety make it increasingly popular in startups and established tech shops. Coroutines, null safety, and extension functions are the language's defining features — understand these deeply.

**Key takeaways:**
- Null safety is Kotlin's killer feature — deeply understand `?`, `?.`, `?:`, `!!`.
- Coroutines are the modern way to handle concurrency — master `launch`, `async`, `Flow`, and structured concurrency.
- Functional programming and immutability are idiomatic — prefer `val`, lambdas, and declarative transformations.
- Interop with Java is seamless but requires awareness of platform types and checked exceptions.
- DSLs and domain-specific patterns are everywhere in Kotlin — understand lambdas with receivers and sealed classes.

Good luck with your interviews!
