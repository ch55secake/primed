# Python Interview Primer

Senior-level Q+A covering Python backend interviews. Each answer is interview-shaped: direct, concrete, real tradeoffs.

---

## Core Python

### Summary

**What this topic covers**

The language fundamentals: Python's data model, object system, scoping rules (LEGB), mutability, closures, decorators, generators, comprehensions, and the standard built-in types. Everything a senior Python developer is expected to reason about without looking anything up.

**Mental model**

Python is a dynamically typed, interpreted language where **everything is an object** — including functions, classes, and modules. The data model is the core: special (dunder) methods define how objects behave with operators, iteration, context management, and attribute access. The key mental shift from Java/Go: **duck typing** — "if it has a `.read()` method, it's a file-like object." No interfaces, no explicit type declarations (though type hints exist). The second shift: **mutability matters** — lists, dicts, and sets are mutable; strings, tuples, ints, and frozensets are immutable. Mutable defaults in function signatures are a classic footgun. The third shift: Python's runtime is single-threaded for CPU work (due to the GIL) but excellent for IO-bound concurrency.

**Key terms**

- **GIL** — Global Interpreter Lock; only one thread executes Python bytecode at a time. CPU-bound tasks don't benefit from threading; use `multiprocessing` or subprocesses.
- **dunder methods** — `__init__`, `__repr__`, `__eq__`, `__hash__`, `__len__`, `__iter__`, `__enter__`/`__exit__` etc. Define how objects interact with the language.
- **duck typing** — type checking by behaviour, not declared type. "If it quacks like a duck…"
- **generator** — function with `yield`; returns a lazy iterator. `yield from` delegates to a sub-generator.
- **decorator** — callable that takes a function and returns a function (or class). `@functools.wraps` preserves metadata.
- **closure** — function that captures variables from an enclosing scope. Captured by reference (late binding).
- **LEGB** — variable lookup order: Local → Enclosing → Global → Built-in.
- **descriptor** — object implementing `__get__`/`__set__`/`__delete__`. Powers `@property`, `classmethod`, `staticmethod`.
- **`__slots__`** — class attribute that replaces the default `__dict__` per-instance with a fixed-layout structure; reduces memory, disables arbitrary attribute assignment.
- **mutable default argument** — `def f(x=[]):` — the default list is created once and mutated across calls. Use `None` + guard instead.

**Why interviewers ask this**

Python's flexibility makes it easy to write working code and hard to write correct code. Interviewers probe: mutable default arguments (classic footgun), late binding in closures, the descriptor protocol (powers every ORM), and the GIL (the answer to "when does threading help?"). Senior signal: understanding *why* these behaviours exist, not just knowing to avoid them.

**Common confusions**

- "Python is slow" — CPython is slower than compiled languages, but the bottleneck is usually IO, not CPU. NumPy/Pandas use C extensions so they're fast. PyPy JITs most code to native speed.
- "Tuples are immutable but a tuple can contain a list" — the tuple reference is immutable; the contained list is still mutable. `(1, [2, 3])` — you can mutate the list.
- "Closures capture by value" — no, by *reference*. Classic bug: `[lambda: i for i in range(5)]` — all lambdas return 4 because `i` is captured by reference and ends at 4.
- "`is` and `==` are interchangeable" — `is` tests identity (same object), `==` tests equality. `None` checks use `is None`. Small integers and interned strings may share identity but that's an implementation detail.
- "Generators and iterators are the same" — a generator is a type of iterator (it implements `__iter__` and `__next__`), but not all iterators are generators.

**What follows from this topic**

Async/await and the event loop builds directly on generators and coroutines. ORM and metaclass patterns build on descriptors and the class creation protocol. Testing idioms (pytest, fixtures, mocking) build on decorators and context managers.

### Q1. What is the GIL and when does it matter?

The Global Interpreter Lock is a mutex inside CPython that allows only one thread to execute Python bytecode at a time. For **IO-bound** work (HTTP calls, DB queries, file IO), threads are fine — the GIL is released during IO waits, so multiple threads make progress. For **CPU-bound** work (image processing, ML inference, number crunching), threads don't give parallelism — use `multiprocessing`, `concurrent.futures.ProcessPoolExecutor`, or C extensions that release the GIL (NumPy, etc.). The GIL is a CPython detail — PyPy, Jython, and GraalPy have different models. Python 3.13+ has experimental per-interpreter GILs (free-threaded CPython, `--disable-gil`).

### Q2. Explain Python's data model and dunder methods.

The data model defines how objects interact with language constructs via special methods. `__repr__` / `__str__` for string representation; `__eq__` / `__hash__` for equality and hashing (must be consistent — equal objects must hash equally); `__len__` / `__iter__` / `__next__` for the iteration protocol; `__enter__` / `__exit__` for context managers (`with` statement); `__getitem__` / `__setitem__` for indexing; `__call__` to make instances callable. Implementing these protocols makes objects work with Python's built-in functions and syntax.

### Q3. What is the mutable default argument trap?

```python
# Wrong:
def append_to(item, to=[]):
    to.append(item)
    return to

append_to(1)  # [1]
append_to(2)  # [1, 2] — not [2]!
```

Default argument values are evaluated **once** at function definition time, not per call. The same list object is reused. Fix: use `None` as default and create the mutable inside the function:

```python
def append_to(item, to=None):
    if to is None:
        to = []
    to.append(item)
    return to
```

### Q4. Explain closures and late binding.

A closure captures variables from its enclosing scope **by reference**, not by value. The classic gotcha:

```python
funcs = [lambda: i for i in range(5)]
print([f() for f in funcs])  # [4, 4, 4, 4, 4]
```

All lambdas share the same `i` variable, which ends at 4. Fix with default argument capture:

```python
funcs = [lambda i=i: i for i in range(5)]
# [0, 1, 2, 3, 4]
```

### Q5. How do decorators work?

A decorator is a callable that takes a function and returns a replacement. `@decorator` is syntactic sugar for `func = decorator(func)`.

```python
import functools

def retry(times=3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == times - 1:
                        raise
        return wrapper
    return decorator

@retry(times=3)
def flaky():
    ...
```

`@functools.wraps(func)` preserves `__name__`, `__doc__`, and `__wrapped__` — always use it.

### Q6. What is the difference between `__repr__` and `__str__`?

`__repr__` should return an unambiguous, developer-facing string — ideally valid Python that recreates the object. `__str__` is the human-readable form. `str(x)` calls `__str__`, falling back to `__repr__`. `repr(x)` always calls `__repr__`. In containers (`list`, `dict`), elements are displayed using `repr`. Rule of thumb: always define `__repr__`; define `__str__` only if you need a different human-readable form.

### Q7. Explain `__slots__`.

By default, Python stores instance attributes in a per-instance `__dict__`. For classes creating millions of instances, this dict overhead is significant. `__slots__ = ('x', 'y')` replaces the dict with a fixed-size array per instance — lower memory, faster attribute access, but no dynamic attribute assignment and no `__dict__`. Common in high-throughput data classes, numpy-backed types, and event-loop objects.

### Q8. What is the LEGB rule?

Python resolves variable names by looking up scopes in order: **Local** (inside the current function), **Enclosing** (enclosing function scopes for closures), **Global** (module level), **Built-in** (`builtins` module). `global x` declares `x` refers to the global scope. `nonlocal x` in a nested function refers to the enclosing function's `x`. Assigning to a name without `global`/`nonlocal` always creates a local binding.

---

## Async Python

### Summary

**What this topic covers**

`asyncio`, coroutines, the event loop, `async`/`await`, tasks, `asyncio.gather`, `asyncio.TaskGroup` (3.11+), and the distinction between concurrency (asyncio) and parallelism (multiprocessing).

**Mental model**

Python's async model is cooperative, single-threaded concurrency. The event loop runs one coroutine at a time; when a coroutine hits `await`, it yields control back to the event loop, which can run another coroutine. This is the same model as Node.js. Coroutines don't block the event loop — blocking IO (`requests.get`, `time.sleep`) blocks the **entire** loop. Use `asyncio`-compatible libraries: `httpx`, `aiohttp`, `asyncpg`, `aiosqlite`. CPU-bound work still needs `ProcessPoolExecutor` — `run_in_executor` offloads a blocking call to a thread or process pool without blocking the event loop.

**Key terms**

- **coroutine** — a function defined with `async def`; returns a coroutine object when called. Must be awaited to run.
- **event loop** — single-threaded loop that schedules and runs coroutines. `asyncio.run(main())` creates and runs one.
- **`await`** — suspends the current coroutine and yields to the event loop until the awaitable completes.
- **Task** — wraps a coroutine, schedules it on the event loop. Created with `asyncio.create_task()`.
- **`asyncio.gather`** — runs multiple awaitables concurrently, collects results.
- **`asyncio.TaskGroup`** — structured concurrency (3.11+); tasks cancel each other on failure.
- **`run_in_executor`** — runs a blocking function in a thread/process pool without blocking the event loop.

**Why interviewers ask this**

Async Python is the standard for high-throughput IO services (FastAPI, Starlette). Interviewers probe whether you understand the cooperative model — especially what "blocking the event loop" means and how to avoid it. Senior signal: reaching for `asyncio.TaskGroup` for structured concurrency, knowing when async doesn't help (CPU-bound work).

**Common confusions**

- "async makes code faster" — it enables higher concurrency for IO-bound work. CPU-bound work is not improved by asyncio.
- "You can mix sync and async freely" — calling a sync blocking function in an async context blocks the event loop. Wrap with `run_in_executor`.
- "Threads and asyncio are interchangeable" — asyncio has less overhead per concurrent task but requires fully async libraries. Threads work with any library but have GIL limits for CPU work.
- "`asyncio.gather` catches exceptions silently" — by default, if one coroutine raises, `gather` propagates the first exception and cancels the rest only if `return_exceptions=False` (default). With `return_exceptions=True`, exceptions are returned as results.

**What follows from this topic**

FastAPI internals, Starlette middleware, WebSocket handling, and background task patterns.

### Q9. What happens if you call a blocking function inside an async coroutine?

The blocking call freezes the event loop — no other coroutine can run until it returns. This defeats the purpose of async. Fix: use an async-native library (`httpx.AsyncClient` instead of `requests`), or offload to a thread pool:

```python
import asyncio

async def blocking_task():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, some_blocking_function, arg)
    return result
```

`None` uses the default ThreadPoolExecutor. For CPU-heavy work, use a `ProcessPoolExecutor`.

### Q10. How does asyncio.TaskGroup differ from asyncio.gather?

`asyncio.gather` is a lower-level primitive. If one coroutine fails, others continue (or cancel depending on flag). `asyncio.TaskGroup` (Python 3.11+) implements structured concurrency: all tasks in the group are cancelled if any raises, and the group waits for all to finish before re-raising. It's safer and cleaner:

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(coro1())
        task2 = tg.create_task(coro2())
    # Both completed or both cancelled on failure
```

Prefer `TaskGroup` for new code — it avoids partially-completed state.

### Q11. Explain coroutines vs threads vs processes in Python.

- **Coroutines (asyncio)**: single-threaded cooperative concurrency. Excellent for IO-bound work with async libraries. No thread safety concerns. Requires async-native ecosystem.
- **Threads (`threading`)**: OS threads, subject to GIL. Good for IO-bound work with sync libraries (requests, psycopg2). GIL prevents parallel CPU execution. Use `ThreadPoolExecutor`.
- **Processes (`multiprocessing`)**: separate OS processes, no GIL. True parallelism for CPU-bound work. Higher overhead (IPC, serialisation). Use `ProcessPoolExecutor`.

Rule of thumb: IO-bound → coroutines or threads; CPU-bound → processes.

---

## Object-Oriented Python

### Summary

**What this topic covers**

Python's class system: MRO (Method Resolution Order), metaclasses, descriptors, `@property`, `@classmethod`, `@staticmethod`, dataclasses, abstract base classes, and mixin patterns.

**Mental model**

Python's OOP is more flexible than Java's: multiple inheritance is allowed (resolved by MRO using C3 linearisation), classes are objects created by metaclasses, and descriptors power the property and method mechanisms. Understanding the descriptor protocol unlocks understanding of every ORM field, every `@property`, and every `classmethod`. `dataclasses` (Python 3.7+) are the idiomatic way to write data-holding classes without boilerplate — they generate `__init__`, `__repr__`, `__eq__` from field annotations.

**Key terms**

- **MRO** — Method Resolution Order. `ClassName.__mro__` shows the lookup chain. C3 linearisation ensures consistent ordering with multiple inheritance.
- **metaclass** — the class of a class. `type` is the default metaclass. `class Foo(metaclass=Meta)` lets you customise class creation.
- **descriptor** — object with `__get__`/`__set__`/`__delete__`. Assigned as a class attribute, it intercepts instance attribute access.
- **`@property`** — descriptor-based getter/setter. Makes attribute access trigger method calls without changing the API.
- **`@classmethod`** — receives the class as first argument (`cls`). Used for alternative constructors.
- **`@staticmethod`** — no implicit first argument. Just a namespaced function.
- **`@dataclass`** — generates `__init__`, `__repr__`, `__eq__` from annotated fields. `frozen=True` makes it hashable/immutable.
- **ABC** — `abc.ABC` + `@abc.abstractmethod` enforces that subclasses implement certain methods.

**Why interviewers ask this**

Understanding descriptors and MRO separates candidates who know Python's syntax from those who understand its mechanics. Django ORM fields, SQLAlchemy columns, and Pydantic fields all use descriptors. Any non-trivial framework touches metaclasses.

**Common confusions**

- "Multiple inheritance is always bad" — Python's MRO makes it predictable. Mixin classes (no state, behaviour only) are a clean pattern.
- "`@staticmethod` vs module-level function" — semantically identical; `@staticmethod` signals the function logically belongs to the class.
- "`@classmethod` for singleton pattern" — valid but `__new__` or module-level instance is cleaner for singletons.

**What follows from this topic**

Django/SQLAlchemy ORM internals, Pydantic model validation, and framework plugin systems.

### Q12. How does Python's MRO work with multiple inheritance?

Python uses C3 linearisation to determine method lookup order. `ClassName.__mro__` gives the tuple. For `class C(A, B)`, Python searches C → A → B → object. The rule: a class always appears before its parents, and preserves the order of bases. Mixins work cleanly because they're designed to be inserted into the MRO without clashing.

```python
class Loggable:
    def save(self):
        print("logging")
        super().save()

class Validatable:
    def save(self):
        print("validating")
        super().save()

class Model(Loggable, Validatable):
    def save(self):
        super().save()
        print("saving")
```

`super()` follows the MRO — `Model.save` → `Loggable.save` → `Validatable.save`.

### Q13. How do descriptors work and what uses them?

A descriptor is a class implementing `__get__`, `__set__`, or `__delete__`. When assigned as a class attribute, Python routes attribute access through these methods. `@property` is implemented as a descriptor. Django model fields (`models.CharField`) are descriptors — accessing `instance.name` triggers `__get__`, which returns the field's value from the instance's `__dict__` or a deferred query.

```python
class TypedAttribute:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, int):
            raise TypeError(f"{self.name} must be int")
        obj.__dict__[self.name] = value

class Point:
    x = TypedAttribute()
    y = TypedAttribute()
```

### Q14. When do you use dataclasses vs NamedTuple vs plain classes?

- **`@dataclass`**: mutable data container with generated `__init__`, `__repr__`, `__eq__`. Use for most data objects. `frozen=True` adds `__hash__` and immutability. Add `slots=True` (3.10+) for memory efficiency.
- **`NamedTuple`**: immutable, iterable, unpackable. Good for lightweight value objects, function return types. Interops with tuple-consuming APIs.
- **Plain class**: when you need custom `__init__` logic, inheritance, or methods that don't fit the dataclass model.
- **Pydantic `BaseModel`**: when you need runtime validation, JSON serialisation, and schema generation. The standard for FastAPI request/response models.

---

## Testing & Tooling

### Summary

**What this topic covers**

pytest (fixtures, parametrise, marks), mocking with `unittest.mock`, test design patterns, virtual environments, dependency management (pip, poetry, uv), type checking with mypy, and linting with ruff.

**Mental model**

pytest is the industry standard — plain `assert` statements, powerful fixtures with dependency injection, and parametrised tests. Mocking uses `unittest.mock.patch` to replace dependencies in the module under test. The tooling landscape in 2025: `uv` for dependency management and virtualenvs (extremely fast, Rust-based), `ruff` for linting + formatting (replaces flake8 + black + isort), `mypy` or `pyright` for type checking.

**Key terms**

- **fixture** — pytest function decorated with `@pytest.fixture`; provides test dependencies via function parameter injection.
- **`@pytest.mark.parametrize`** — runs a test with multiple input/output pairs.
- **`unittest.mock.patch`** — replaces an object in the module under test during the test.
- **`MagicMock`** — auto-speccing mock; records calls, allows assertions like `mock.assert_called_once_with(...)`.
- **`conftest.py`** — pytest file for shared fixtures, visible to tests in its directory and below.
- **`uv`** — fast Python package manager and virtualenv tool (Astral). Replaces pip + venv for most workflows.
- **`ruff`** — fast linter and formatter. Single tool replacing flake8, black, isort, pyupgrade.
- **`mypy`** — static type checker. Checks type hints without running the code.

**Why interviewers ask this**

Testing idioms reveal seniority. Writing fixtures for shared state, parametrising instead of copy-pasting test cases, knowing how to mock at the right layer (the module that *uses* the dependency, not where it's defined) — these are senior signals.

**Common confusions**

- "Patch where the object is defined" — no. Patch where it's *used*. If `mymodule.py` does `import requests`, patch `mymodule.requests`, not `requests.get`.
- "Fixtures are only for setup/teardown" — fixtures are for any reusable test dependency: DB connections, temp files, mock clients, config objects.
- "`pytest.raises` is just try/except" — `with pytest.raises(ValueError, match="pattern"):` also checks the message. Use it.

**What follows from this topic**

Integration testing with `pytest-asyncio` for async code, test containers for DB integration tests, and CI pipeline configuration.

### Q15. How does pytest fixture dependency injection work?

A fixture is a function decorated with `@pytest.fixture`. Tests (and other fixtures) declare dependencies by accepting them as arguments — pytest resolves and injects them automatically.

```python
@pytest.fixture
def db_session():
    session = create_test_session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def user(db_session):
    u = User(name="alice")
    db_session.add(u)
    db_session.flush()
    return u

def test_user_name(user):
    assert user.name == "alice"
```

Scope controls reuse: `scope="function"` (default), `"class"`, `"module"`, `"session"`.

### Q16. How do you mock a dependency in Python correctly?

Mock at the point of *use*, not definition. If `payments.py` does `import stripe`, patch `payments.stripe`:

```python
from unittest.mock import patch, MagicMock

def test_charge(mocker):
    mock_stripe = MagicMock()
    mock_stripe.PaymentIntent.create.return_value = {"id": "pi_123"}
    with patch("payments.stripe", mock_stripe):
        result = charge_customer("cus_abc", 1000)
    assert result["id"] == "pi_123"
```

With `pytest-mock`, use `mocker.patch("payments.stripe")` — auto-cleaned up after the test.

### Q17. What is parametrize and when do you use it?

`@pytest.mark.parametrize` runs a test with multiple input combinations — replaces copy-paste test cases.

```python
@pytest.mark.parametrize("n,expected", [
    (0, 1),
    (1, 1),
    (5, 120),
    (10, 3628800),
])
def test_factorial(n, expected):
    assert factorial(n) == expected
```

Each case runs as a separate named test. Combine with fixtures via `indirect=True` for complex setups.

---

## Python in Production

### Summary

**What this topic covers**

FastAPI/Django patterns, database access (SQLAlchemy, asyncpg), dependency injection, configuration management, Pydantic validation, structured logging, and deployment with Docker/Gunicorn/Uvicorn.

**Mental model**

Python backend services in 2025: FastAPI for new async APIs (fastest Python HTTP framework, auto OpenAPI docs, Pydantic validation), Django for full-stack apps with ORM + admin. Uvicorn is the ASGI server (async), Gunicorn multi-worker process manager (spawn multiple Uvicorn workers for production). Configuration via environment variables + Pydantic `BaseSettings`. Structured logging with `structlog` or `python-json-logger`.

**Key terms**

- **WSGI** — synchronous Python web interface (Django, Flask). One request per thread.
- **ASGI** — asynchronous Python web interface (FastAPI, Starlette, Django 3.1+). Supports async handlers and WebSockets.
- **Uvicorn** — ASGI server. Single-process, async.
- **Gunicorn** — WSGI/ASGI process manager. Spawns multiple worker processes (`-w 4`). Use with `uvicorn.workers.UvicornWorker` for FastAPI.
- **Pydantic** — data validation library using Python type hints. FastAPI's request/response model layer.
- **`BaseSettings`** — Pydantic class for environment-variable-backed config. Type-safe, validated at startup.
- **SQLAlchemy** — Python ORM and SQL toolkit. Core for raw SQL, ORM for model-based queries. Async support via `asyncio` extension.
- **Alembic** — database migration tool for SQLAlchemy schemas.

**Why interviewers ask this**

Production Python has real failure modes: N+1 queries, synchronous DB calls in async handlers, unhandled exceptions in background tasks, missing request timeouts. Senior signal: knowing to configure connection pool sizes, use eager loading to avoid N+1, set Gunicorn worker count (2×CPU+1 is the formula), and validate config at startup with Pydantic.

**Common confusions**

- "Flask is enough for production" — Flask is fine; for new projects FastAPI gives you async, type safety, and auto-docs for free. Use what the team knows.
- "Django ORM is magic — I don't need to understand SQL" — N+1 queries kill performance. `select_related` / `prefetch_related` are essential.
- "Uvicorn alone is sufficient for production" — Uvicorn is single-process. Use Gunicorn with UvicornWorker for multiple processes and graceful restart.

**What follows from this topic**

Celery for background tasks, Redis for caching and queues, observability with OpenTelemetry, and container orchestration.

### Q18. How does FastAPI handle request validation?

FastAPI uses Pydantic models for request body validation and Python type hints for path/query parameters. Declare a Pydantic model, use it as a parameter type, and FastAPI validates incoming JSON automatically — returning 422 Unprocessable Entity with field-level errors on failure.

```python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI()

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: int

@app.post("/users")
async def create_user(body: UserCreate):
    # body is fully validated
    return {"id": 1, **body.model_dump()}
```

Validation happens before your handler runs. No manual `request.json()` parsing needed.

### Q19. How do you avoid N+1 queries with SQLAlchemy ORM?

N+1: loading 100 users then querying the DB 100 times for each user's posts. Fix with eager loading: `selectinload` or `joinedload`.

```python
# N+1 — bad
users = session.execute(select(User)).scalars().all()
for user in users:
    print(user.posts)  # one query per user

# Eager load — good
users = session.execute(
    select(User).options(selectinload(User.posts))
).scalars().all()
for user in users:
    print(user.posts)  # posts already loaded in 1 extra query
```

`selectinload` uses a `SELECT ... WHERE user_id IN (...)` — one extra query total. `joinedload` uses a JOIN — one query, but can produce large result sets for one-to-many.

### Q20. How do you configure a FastAPI app for production?

```
gunicorn app:app \
  -w 4 \                          # 2×CPU+1 workers
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 30 \
  --graceful-timeout 10 \
  --access-logfile - \
  --error-logfile -
```

Config via Pydantic `BaseSettings` with `model_config = SettingsConfigDict(env_file=".env")` — validates all env vars at startup, fails fast on missing required config. Use `lifespan` context manager for startup/shutdown (DB pool init, connection close).
