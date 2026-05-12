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

### Q79. What is a test fixture and how do you manage them?

Test fixtures are test data or setup — hardcoded values, mocks, temporary files. Example: `val mockUser = User(1, "Test")` is a fixture. Manage via: `@BeforeEach setUp()` (JUnit 4) for per-test setup, `companion object { @BeforeAll fun setUpClass() }` (JUnit 5) for once-per-suite setup, or Kotlin fixtures: `fun createTestUser() = User(...)`. Keep fixtures minimal and focused on the test's needs — big, shared fixtures make tests brittle. In Kotlin, create fixtures as helper functions or factory objects. Use `by lazy` for expensive setup.

### Q80. Explain mocking and when to use it.

Mocks replace real dependencies with fakes to isolate what you're testing. Example: `val mockRepo = mock<UserRepository> { on { find(1) } doReturn User(1) }` using Mockito. Use mocks when: real dependency is slow (network), has side effects (sends email), or state-dependent (time). Don't mock: value objects, collections, things you're testing. Kotlin libraries: Mockito, MockK (Kotlin-first). Spies: `spy(RealClass())` wraps the real object and verifies calls. Avoid over-mocking — mocks can make tests brittle and hide real bugs.

---

## Common Idioms, Pitfalls & Spot-the-Bug

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
