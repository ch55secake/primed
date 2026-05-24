---
created-on: "[[Journal/2026/May/23-May-Saturday]]"
ctime: 2026-05-23 14:20:42
categories:
  - "[[Categories/Interview Prep|Interview Prep]]"
  - "[[Categories/Technical|Technical]]"
type: interview-prep
---

# DSA Patterns Primer — Recognition-First Drill Sheet

Companion to NeetCode 150. Where NeetCode gives you worked example problems, this primer is the *pattern recognition* layer that sits underneath. The goal isn't to grind 500 problems — it's to **see the pattern in 30 seconds** so the problem decomposes itself. Signals → pattern → template → complexity → traps.

Each topic opens with a Summary block (mental model, key terms, why interviewers ask, common confusions) and then runs through 5-8 drill questions: recognition, template walkthrough, variants, traps, a representative hard problem, and the senior follow-up the interviewer pushes on once you've solved it.

Drill the **Recognition & Decision Tree** and the **Pattern Signal Tables** until they're reflex. Most senior candidates lose interviews not because they can't write the code, but because they spend 20 minutes recognising what pattern it is. Get that down to 30 seconds and the rest is mechanical.

---

## Recognition & Decision Tree

### Summary

**What this topic covers**

The mental decision tree a senior candidate walks the moment a coding problem is read out. Four passes — **constraints** (what's N, what's the time budget?), **input shape** (sorted array, linked list, graph, grid, stream, string?), **objective** (yes/no, count, max/min, shortest, longest, all possible, Kth, range query, ordering?), and **constraint clues** (palindrome, brackets, cycle, prefix, in-place, O(1) space, numbers in 1..N, XOR). Each branch lands on a small set of candidate patterns. The tree compresses what most candidates do over five minutes of staring into a structured ten-second scan that produces a shortlist before the brute force is written. The 7 questions in this topic are pure recognition drills — read the signal, name the pattern, justify the choice with complexity.

**Mental model**

Think of it as four lenses applied in sequence, each one halving the search space. The **constraint lens** tells you the target complexity: N ≤ 20 means backtracking or bitmask DP is fine; N ≤ 10⁵ means you're forced into O(N log N); N ≤ 10⁶ means O(N) only; N ≤ 10⁸ means math, bit tricks, or binary search on the answer. The **shape lens** narrows by data structure: sorted arrays scream two pointers or binary search; linked lists scream fast/slow; graphs scream BFS/DFS/Dijkstra; grids are just graphs with a directions array; streams scream heap or running aggregate. The **objective lens** narrows by what's being asked: "shortest in unweighted graph" is BFS, "longest contiguous" is sliding window, "all subsets" is backtracking, "Kth" is heap or quickselect. The **clue lens** then drops the final hint — "palindrome" means two pointers or expand-from-center, "prerequisites" means topological sort, "O(1) space with values in 1..N" means cyclic sort, "XOR / single number / power of 2" means bit manipulation. Most senior candidates can name the pattern from the problem statement alone, without even reading the constraints — the tree is what makes that reflex possible.

**Key terms**

- **Constraint scan** — read N, time limit, memory limit first; they bound the acceptable complexity.
- **Input shape** — the data structure of the input (sorted array, linked list, tree, graph, grid, stream, string) is the first big branch in the tree.
- **Objective verb** — the verb in the prompt ("find", "count", "return all", "minimum", "shortest", "Kth", "median") is the second big branch.
- **Constraint clues** — keywords like "palindrome", "in-place", "O(1) space", "numbers 1..N" eliminate or favour specific patterns.
- **Brute-force baseline** — even if you spot the pattern, state the O(N²) or O(2^N) baseline first; the interviewer wants to see the comparison.
- **Target complexity** — derived from N; if N = 10⁵ then O(N²) = 10¹⁰ ops is too slow, you need O(N log N).
- **Binary search on the answer** — when the answer space is monotonic and the brute search isn't, search on the answer rather than the input. The senior-level lever.
- **Pattern shortlist** — output of the tree: 1-3 candidate patterns, ranked. You commit to one after stating tradeoffs.
- **Reflex pattern recognition** — the goal state; pattern is named within 30 seconds of reading the prompt.
- **Decision symmetry** — the tree's branches mirror the standard problem taxonomy (NeetCode, Sean Prashad), which is why drilling it once pays compounding interest.

**Why interviewers ask this**

Three signals. (1) **Process visibility** — interviewers want to *see* you scan the constraints first, name the brute force, then walk a recognition tree. Candidates who jump straight to code without that scan signal junior; candidates who narrate the four passes (constraint, shape, objective, clues) signal senior. (2) **Complexity discipline** — the constraint scan forces you to commit to a target complexity *before* coding, so you don't waste time writing an O(N²) solution when N = 10⁶. Senior candidates who do this never write the wrong-complexity solution. (3) **Pattern fluency under uncertainty** — for ambiguous prompts the tree gives you a shortlist of 2-3 candidate patterns and a way to disambiguate (clarifying questions about edge cases, expected return type, mutability of the input). That's the signal that you've internalised the taxonomy, not just memorised individual problems.

**Common confusions**

- "Pattern recognition is about memorising more problems" — it's about memorising the *signals that map to patterns*, not the problems themselves. 30 patterns cover ~95% of LeetCode.
- "I should derive the answer from first principles" — sometimes useful, usually slow. Recognising you're looking at LIS (longest increasing subsequence) saves you twenty minutes of dead ends.
- "Constraints don't matter until you've written the code" — they're the *first* thing to look at; N = 12 vs N = 10⁶ is a different problem entirely.
- "If two patterns fit, the harder one is correct" — usually the simpler one is correct; the harder pattern is the optimiser, not the first move.
- "Binary search on the answer is a trick for hard problems" — it's a tool; the signal ("smallest X such that condition is true", "find the boundary") is what tells you to reach for it.
- "Greedy is the same as DP" — greedy commits locally, DP enumerates all states; greedy must be *proved* correct (exchange argument), DP doesn't need proof.

**What follows from this topic**

Every later topic in the primer maps directly onto a branch of this tree. The Pattern Signal Tables (next topic) are the lookup table for the tree. The 23 individual pattern topics (Arrays & Hashing through Math, Geometry & Stream Patterns) are the leaves — each one expands a tree branch into the full template, traps, and problem family. If you can't walk this tree on a cold prompt, fix it first; drilling the leaves before the trunk doesn't compound. Practise on five random prompts a day: read the prompt, walk the tree out loud, name the pattern in 30 seconds. The mechanical coding comes after.

### Q1. A problem says N ≤ 20 and asks for "the maximum value over all subsets". What's your move?

Backtracking or **bitmask DP**. At N = 20, 2^N = ~10⁶ which is fine, and a bitmask state lets you precompute or cache results for each subset. Classic signals here: "assign N tasks to N people" (minimum cost), "shortest superstring", "TSP". State is `dp[mask]` or `dp[mask][last_visited]`. If the subset itself has no order ("any subset works"), pure backtracking with include/exclude pruning is also fine and writes faster.

### Q2. Prompt: "given sorted array, find the pair summing to target." What pattern and why?

**Two pointers**, opposite ends converging. The array is sorted, so if `nums[left] + nums[right]` is too small, advance left; if too big, retreat right. O(N) time, O(1) space — strictly better than the O(N) hash-map version because the hash overhead and allocation cost go away. Note: if the input were *unsorted*, the right call would flip to a hash map (`value → index`) because sorting would cost O(N log N). The "sorted" signal in the prompt is what makes two pointers correct; without it, hash map wins.

### Q3. "Find the longest substring with at most K distinct characters." Which pattern?

**Variable-size sliding window**. Signal: "contiguous" (substring) + "longest" + "at most" / "exactly" condition. Expand the right pointer to include the new character, shrink the left pointer while the window violates the constraint, track the max length seen. Use a frequency hash map to know when `len(map) > K`. O(N) — each character is added once and removed at most once, so the inner while loop is amortised O(1) per outer iteration. Common trap: forgetting to delete from the map when count hits zero — that breaks `len(map)`.

### Q4. "Find the next greater element for each entry in an array." What's the move?

**Monotonic stack**. The signal "next greater / previous smaller / nearest larger" is one of the hardest patterns to derive from scratch but trivial to recognise. Keep a stack of indices with monotonically decreasing values. When the new element is greater than `stack.top()`, pop and record — the popped index's "next greater" is the current element. O(N) because each index is pushed and popped at most once. Same pattern: Daily Temperatures, Largest Rectangle in Histogram (with width = stack-distance), Stock Span, 132 Pattern, Sum of Subarray Minimums.

### Q5. "Find the minimum capacity that can ship all packages within D days." Binary search or DP?

**Binary search on the answer**. The signal phrase "minimum capacity such that..." or "largest minimum / smallest maximum" plus a monotonic predicate (`can_ship(cap)` is true for all cap above some threshold) is the lever. The answer space is `[max(weights), sum(weights)]`. Binary search: for each candidate capacity, simulate shipping in O(N), check if ≤ D days. Total O(N log(sum-max)). The senior-level recognition is that the underlying decision problem is monotonic — once a capacity works, all larger capacities also work — and that's what makes binary search applicable. Related: Koko Eating Bananas, Split Array Largest Sum, Smallest Divisor.

### Q6. "Given course prerequisites, return a valid build order." Which pattern?

**Topological sort**. Signal: "prerequisites / dependencies / build order" + directed graph. Two flavours: Kahn's algorithm (BFS with in-degree tracking — start with all zero-in-degree nodes, repeatedly remove) or DFS with post-order (DFS each node, append on completion, reverse at end). Kahn's also detects cycles naturally — if the output order has fewer than N nodes, a cycle exists and no valid build order is possible. O(V + E). Course Schedule I/II, Alien Dictionary, Parallel Courses are all topo sort variations.

### Q7. "Find the median of a stream of integers as numbers arrive." What's the data structure?

**Two heaps** — a max-heap for the lower half and a min-heap for the upper half, kept balanced (sizes differ by at most one). The median is either the top of the larger heap or the average of both tops. Each `addNum` is O(log N) for heap operations, `findMedian` is O(1). In Python, `heapq` is min-only, so the max-heap stores negated values. The recognition signal here is **"median of stream"** specifically; for a static array, quickselect (O(N) average) is the right call.

### Q8. Senior interview angle: how do you tell the difference between a sliding window problem and a DP problem when both involve subarrays?

The disambiguator is **contiguous vs subsequence**. Sliding window works only when the subarray is **contiguous** *and* the condition is monotonic in the window size (e.g. "longest substring with at most K distinct" — expanding can violate, shrinking restores). DP is correct when the subarray can be a **subsequence** (non-contiguous, like LIS), or when the condition isn't monotonic in window size (e.g. "maximum subarray sum" with negatives is Kadane's, a 1D DP that *coincidentally* uses a sliding-window-shaped recurrence but isn't sliding window). Rule of thumb: if "shrink the left pointer when condition violates" makes sense, it's sliding window; if you need to compare include-vs-exclude at each index, it's DP.

---

## Pattern Signal Tables

### Summary

**What this topic covers**

The lookup tables that compress the Recognition Decision Tree into two reference grids you can scan mid-interview without re-deriving. The first grid is **by keyword** — for every common phrase that appears in coding-interview prompts ("sorted array", "pair sums", "contiguous subarray", "next greater", "subarray sum equals K", "Kth largest", "merge intervals", "course prerequisites", "shortest path", "single number", "palindrome", "permutations"), it lists the pattern you reach for. The second grid is **by return type** — `bool`, single `int`, `int[]`, `List<List<T>>`, `Node`, `String` — each return shape maps to a small candidate set. These tables aren't a substitute for understanding the patterns, but they cut the recognition latency from minutes to seconds once internalised. The 6 questions in this topic are scenario drills: given a one-line problem fragment, name the pattern and justify the choice with a constraint argument.

**Mental model**

The signal tables work because most coding interview prompts use a small vocabulary — there are maybe 50 phrases that show up across the entire LeetCode corpus, and each maps to 1-2 patterns. "Sorted array" + "pair / triplet" = two pointers. "Contiguous subarray" + "longest / shortest with constraint" = sliding window. "Range query" = prefix sum or segment tree. "Top K" = heap. "Permutations / combinations / subsets" = backtracking. The tables are the compiled form of this vocabulary. Crucially, the **return type** of the function is the second strongest signal: when the prompt says "return a list of lists of integers", that's almost always backtracking (all solutions) or BFS level order; when it says "return a boolean", that's reachability (DFS/BFS/Union Find) or hash-set membership. Combining keyword + return type narrows to one pattern in 80% of cases. The interviewer phrasing of the prompt is itself diagnostic — they're not trying to hide the pattern, they're testing whether you can hear it.

**Key terms**

- **Keyword signal** — a specific word or phrase in the prompt that maps to a pattern (e.g. "next greater" → monotonic stack).
- **Return-type signal** — the function signature's return type (`bool`, `int`, `List<List<T>>`) narrows the candidate set.
- **"At most K" vs "exactly K"** — variable-size sliding window; the "exactly" version often uses `atMost(K) - atMost(K-1)`.
- **"Find the boundary"** — binary search on the answer, especially in monotonic predicate problems.
- **"In-place / O(1) space"** — two pointers, cyclic sort, Floyd's cycle, XOR tricks.
- **"All possible / generate all"** — backtracking (or, rarely, DP with reconstruction).
- **"Number of ways"** — DP, almost always.
- **"Connected / groups / components"** — DFS / BFS / Union Find; pick by whether edges are dynamic.
- **"Schedule / room / arrows"** — interval problem; sort by start (merge) or end (greedy pick) + heap.
- **"Median of stream"** — two heaps. Static array: quickselect.
- **"Shortest in unweighted graph"** — BFS, always.

**Why interviewers ask this**

Two signals fold into one: (1) **vocabulary fluency** — staff candidates speak in the same dialect as the prompts. When the interviewer says "find the longest substring with at most K distinct characters", a fluent candidate has already started writing the sliding-window template by the end of the sentence. (2) **Disambiguation discipline** — many prompts have *two* valid patterns (e.g. "shortest path in weighted graph with non-negative weights" is Dijkstra; with negative weights, Bellman-Ford; with K-stop constraint, modified Bellman-Ford or Dijkstra on `(node, hops)` state). Senior candidates ask the disambiguating clarifying questions ("are the weights non-negative?", "is the graph dense or sparse?", "do edges change over time?") before committing — that's the signal that you've internalised the tables not as a flat lookup but as a decision tree with branches.

**Common confusions**

- "These tables are a cheat sheet, not real understanding" — they're a *compiled* form of the understanding. You still need the templates and the proofs; the tables just compress the recognition step.
- "If two keywords match, pick the first one alphabetically" — pick the *most specific* one; "next greater in circular array" is monotonic stack with `2N` iterations, not just monotonic stack.
- "Return type is just a Python/Java detail" — it's a major signal; `List<List<T>>` almost guarantees backtracking or BFS level order, never sliding window.
- "Keyword 'shortest' always means BFS" — only in *unweighted* graphs. With weights it's Dijkstra; with negative weights, Bellman-Ford; in a DAG, topological-order DP.
- "Two pointers and sliding window are the same" — both use left/right indices, but two pointers converge on a sorted array; sliding window expands and shrinks based on a window-property condition.
- "The tables make the patterns optional" — no; the tables tell you *which* pattern, the topic sections tell you *how* to write it.

**What follows from this topic**

The 23 individual pattern topics that follow are the expansion of each row in these tables. Drilling them in order is wasted effort; instead, drill them in *frequency order* — the patterns that appear most often in interviews (arrays & hashing, two pointers, sliding window, binary search, trees, graph traversals, DP) deserve 80% of your practice budget. The advanced topics (segment tree, KMP, Tarjan's) are recognition-only — you should know the name and the signal but not feel you need to write them from scratch unprepared. If you can read a prompt and name the pattern within 30 seconds using these tables, the rest of the interview is mechanical execution.

### Q1. "Subarray sum equals K" — keyword scan, pattern, why.

**Prefix sum + hash map**. The keyword "subarray sum equals K" is the canonical signal. Naive O(N²) checks every (i, j) pair. The trick: maintain `prefix[i]` = sum of first `i` elements; then `sum(nums[l..r]) = prefix[r+1] - prefix[l]`. So "subarray summing to K" becomes "two prefix sums differ by K", which is a Two-Sum-style hash-map lookup. One pass, O(N) time, O(N) space. Critical seed: initialise `seen = {0: 1}` to cover the case where the prefix itself equals K. Same trick generalises to subarray sum divisible by K (store `prefix % K`), subarray XOR equals K (store prefix XOR), contiguous array of 0s and 1s (treat 0 as -1).

### Q2. Return type is `List<List<Integer>>` and the prompt says "all subsets of nums". Pattern?

**Backtracking** — almost certain. The return-type signal `List<List<T>>` plus the keyword "all" (subsets, combinations, permutations, partitions) is the dead-on signature of backtracking. Skeleton: choose, explore, unchoose. For subsets, the canonical version is the include/exclude binary recursion — at each index, either include `nums[i]` in the current subset or skip it. Total work is O(N · 2^N) — there are 2^N subsets, each takes O(N) to build. The alternative interpretation as "BFS level order" only applies if the prompt is on a tree, which it isn't here.

### Q3. "Find the Kth largest element in an unsorted array." Pattern choice and the senior follow-up.

Three valid answers. (1) **Heap of size K** — keep a min-heap of K elements; if a new value beats the root, pop and push. O(N log K). (2) **Quickselect** — partition-based, O(N) average but O(N²) worst case. (3) **Sorting** — O(N log N), simplest, often "good enough" for small N. Senior follow-up: "what if N is 10⁹ and you can't fit it in memory?" — then external streaming with a heap of size K is the answer; quickselect doesn't work on a stream. "What if values are bounded in [0, M]?" — counting sort / bucket sort, O(N + M). The right pick depends on N, K, value range, and whether the input is streaming.

### Q4. "Find shortest path in a maze with walls." Recognise and pick.

**BFS**. The graph is unweighted (each step has cost 1), so BFS guarantees the first time you reach the target is the shortest path. Use a queue, a visited set, and a directions array `[(-1,0), (1,0), (0,-1), (0,1)]` for grid neighbours. O(rows × cols) time and space. Common variants: multi-source BFS (seed the queue with all sources at distance 0, then BFS — used for "rotting oranges" and "walls and gates"); 0-1 BFS (when steps have 0 or 1 cost, use a deque with 0-edges pushed to front, 1-edges to back, still O(V+E)). For *weighted* edges, this becomes Dijkstra.

### Q5. "Course Schedule — can you finish all courses given prerequisites?" Pattern and the cycle-detection angle.

**Topological sort**, specifically Kahn's algorithm (BFS) for the "can finish" boolean variant. Build the graph + in-degree array; seed the queue with all zero-in-degree nodes; repeatedly remove a node and decrement its neighbours' in-degrees. If the final count of processed nodes equals N, no cycle, return true. If fewer, a cycle exists, return false. The DFS alternative uses three-colour marking (white/grey/black) — a back-edge to a grey node is a cycle. Both are O(V+E). Course Schedule II asks for the order itself (just return the Kahn output if N matches), Alien Dictionary builds the graph from character ordering then runs topo, Parallel Courses asks for the number of semesters (use layered Kahn).

### Q6. Senior interview angle: prompt says "merge K sorted lists" — three solutions, pick.

(1) **Brute concat + sort** — O(N log N) where N is total elements. Easy but ignores the "sorted" structure. (2) **Heap of size K** — push the head of each list; pop the smallest, advance that list, push the new head. O(N log K). The canonical answer. (3) **Divide and conquer** — pairwise merge K lists down to 1 in log K rounds. Also O(N log K) but with better cache behaviour for very large K. The interviewer is testing whether you reach for the heap reflexively from the "K sorted" signal, and whether you can articulate why it beats brute concat (you avoid re-sorting elements that are already in order). The space difference also matters: heap is O(K), brute is O(N).

---

## Arrays & Hashing

### Summary

**What this topic covers**

The bread-and-butter pattern that opens nearly every coding interview: using hash sets and hash maps to convert an O(N²) brute-force search into O(N) with O(N) extra space. Three sub-patterns live here: (1) **hash set for membership** — `seen = set()`, the foundation of Contains Duplicate and the O(N) Longest Consecutive Sequence trick; (2) **hash map for counting** — `Counter(s)` for frequency, anagram detection, Top K Frequent; (3) **hash map for index lookup** — store `value → index`, check for complement (classic Two Sum). A fourth, less-named pattern is **group by signature** — bucket items by a canonical key (sorted string for anagrams, character count tuple for Group Anagrams). The 6 questions in this topic cover the templates, the edge cases (hashing tuples vs lists, defaultdict vs dict.get), and the senior follow-ups (when does hashing fall apart, and what are the alternatives).

**Mental model**

Think of hashing as the universal **time-for-space trade**. Whenever the brute force is "for each element, search for a matching element", hashing collapses the inner loop from O(N) to O(1) average — you've paid O(N) space to save O(N) time, ending up at O(N) instead of O(N²). The mental shift is that "search for X" is a hash lookup, "is X here" is a hash set check, and "what's the count of X" is a hash map increment. The Two Sum pattern formalises the trick: instead of checking every pair, store each seen value with its index; for each new value, check if `target - value` is already in the map. This works in one pass because hashing turns a quadratic search into a linear scan. The deeper insight is that **hashing assumes equality is cheap and well-defined** — primitives, strings, tuples are fine, but mutable objects (lists, dicts) can't be keys because their hash would change on mutation. This is the source of Python's "unhashable type: 'list'" errors and Java's `Object.hashCode()` contract bugs.

**Key terms**

- **Hash set** — `set()`; O(1) average membership test, dedup, intersection.
- **Hash map / dictionary** — `dict` / `Map`; O(1) average insert, lookup, delete by key.
- **Counter** — Python's `collections.Counter`; multiset implementation with `most_common(k)` for top-K.
- **defaultdict** — `defaultdict(int)`, `defaultdict(list)`; avoids the `if key not in d` boilerplate.
- **Group by signature** — bucket items by a canonical key (sorted string, char-count tuple, frozenset).
- **Index lookup map** — `value → index` for "find pair / find complement" problems (Two Sum).
- **Frequency map** — `value → count`; used in anagram checks, sliding-window with counts, Top K.
- **Longest Consecutive Sequence trick** — only start counting from numbers `n` where `n-1` is *not* in the set; that makes it O(N) instead of O(N log N).
- **Hashable keys** — immutable types only; convert lists to tuples, sets to frozensets, before hashing.
- **Hash collision** — multiple keys map to the same bucket; standard libraries use chaining or open addressing.
- **Hash flooding** — an adversarial attack that forces collisions; modern hash maps use randomised seeds to mitigate.

**Why interviewers ask this**

Three signals. (1) **Reflex pattern recognition** — Two Sum is the hello-world of pattern recognition; if you don't reach for the hash map within 30 seconds, the interviewer downgrades. (2) **Complexity articulation** — saying "the brute force is O(N²) — we can do O(N) time with O(N) space using a hash map" out loud is the senior tell. Junior candidates jump to code; senior candidates state the trade. (3) **Edge case discipline** — the duplicate-key handling, the `{0: 1}` seed for prefix-sum-equals-K, the "only count from numbers with no n-1 in set" trick for Longest Consecutive Sequence — these are the details that separate "writes working code" from "writes correct code". Interviewers ask about Anagrams precisely to see whether you reach for sorted-string or character-count tuple (both work; the count version is O(N) per word vs O(L log L) for sort).

**Common confusions**

- "Hash maps are O(1)" — *average*. Worst case is O(N) under adversarial collisions; in interview context, state "O(1) amortised average".
- "Set and dict are different things" — they're the same structure underneath; a set is a dict where values are ignored.
- "Counter is just a fancy dict" — it has `most_common(k)`, multiset arithmetic (`c1 + c2`, `c1 - c2`), and zero-default reads.
- "Hashing a list works in Python" — no; lists are mutable, not hashable. Convert to tuple first.
- "Defaultdict and dict.get are equivalent" — defaultdict mutates on read-via-`[]`, which can leak entries. Use `dict.get(k, 0)` if you don't want side effects.
- "Two Sum needs two passes" — one pass works: for each element, check if complement is already in the map *before* inserting current.

**What follows from this topic**

This is the foundation for Prefix Sum (which is hash map + cumulative sum), for Sliding Window (which often uses a frequency map for window state), for Trie (which generalises the hash to a tree of character maps), for Union Find (which is a parent-pointer map). The Top K Frequent problem links directly to Heap. Group Anagrams links to canonical-form thinking that recurs in problems like Isomorphic Strings, Word Pattern, and Substring Anagram. If you internalise that hashing is the universal time-for-space trade, every later topic that uses it (which is most of them) will feel like the same move with different decorations.

### Q1. When do you reach for a hash set vs a hash map vs Counter?

**Hash set** when you only care about membership ("have I seen this before?", "does this exist?"). Contains Duplicate, Longest Consecutive Sequence, intersection of two arrays. **Hash map** when you need a value associated with the key — typically an index, a count, or a list of items. Two Sum (value → index), Group Anagrams (canonical key → list of words). **Counter** when you specifically need frequency counts plus convenience operations like `most_common(k)` — Valid Anagram, Top K Frequent, Reorganize String. Counter also supports multiset arithmetic (`c1 + c2`, `c1 & c2`) which is handy for problems like "minimum window contains all characters of T".

### Q2. Walk me through Two Sum in one pass.

```python
def two_sum(nums, target):
    seen = {}  # value → index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
```

The trick is to check for the complement *before* inserting the current value — that way if there are duplicates (`nums = [3, 3]`, `target = 6`), you don't accidentally pair an element with itself. O(N) time, O(N) space. The two-pass version is also valid: first pass build the map, second pass look up complements. One pass is preferred because it short-circuits as soon as the pair is found.

### Q3. Walk me through the Longest Consecutive Sequence O(N) trick.

The naive O(N log N) sorts and scans. The O(N) trick: put all numbers in a set, then for each number `n`, only start counting **if `n - 1` is not in the set** (so `n` is the start of a sequence). Then walk `n, n+1, n+2, ...` while each is in the set, counting length. Each element is touched at most twice across the whole algorithm — once when checking "am I a start?", once when walked from a start — so it's amortised O(N).

```python
def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for n in s:
        if n - 1 not in s:  # n is the start of a sequence
            length = 1
            while n + length in s:
                length += 1
            best = max(best, length)
    return best
```

The subtle thing is the `if n - 1 not in s` guard — without it, every number would walk its full sequence, giving O(N²) on a degenerate case like `[1, 2, 3, ..., N]`.

### Q4. How do you handle Group Anagrams without sorting each string?

Sort-the-string is O(N · L log L). The O(N · L) alternative uses a **character count tuple** as the canonical key — count occurrences of each of the 26 letters, convert to a tuple, use that as the dict key.

```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = tuple(w.count(c) for c in 'abcdefghijklmnopqrstuvwxyz')
        groups[key].append(w)
    return list(groups.values())
```

Pros over sort: linear in word length, no allocation churn. Cons: assumes lowercase ASCII; for Unicode you'd use a frozen Counter or sorted-string after all. Senior follow-up: how does this generalise to "find all anagram pairs across a 10⁶-word dictionary"? Answer: same canonical key, group, then for each group emit `len(group) choose 2` pairs.

### Q5. What's the trap with using `dict.get(k, 0)` vs `defaultdict(int)` inside a hot loop?

`dict.get(k, 0)` performs one lookup and returns 0 if absent — no side effect. `defaultdict(int)` performs the lookup *and inserts the default* into the dict when you use `d[k]` syntax. This matters in two ways: (1) **memory** — if you read many keys that may never be written, defaultdict bloats with zero entries. (2) **iteration / `len()`** — `len(defaultdict_used_with_brackets)` will be larger than the meaningful entries. In sliding-window patterns where you're tracking "distinct keys in window", forgetting to delete a key when its count hits zero breaks `len(map)` — use `if d[k] == 0: del d[k]` after each decrement.

### Q6. Senior interview angle: when does hashing fall apart, and what are the alternatives?

Three failure modes. (1) **Worst-case O(N) lookup** under adversarial inputs (hash flooding) — modern hash maps mitigate with randomised seeds but it's still a theoretical worst case. Alternative: balanced BST (`std::map`, `TreeMap`) for guaranteed O(log N). (2) **Memory overhead** — hash maps have 30-50% overhead from load factor + bucket arrays. For dense integer keys in `[0, M]`, a plain array indexed by key is faster and tighter. (3) **No ordering** — hash maps don't preserve insertion order in older Java/Python (Python 3.7+ does). For "Kth smallest", a heap or sorted structure beats hashing. The senior tell is naming these tradeoffs explicitly: "I'd use a hash map here because we need O(1) membership and don't care about order; for ordered iteration I'd switch to TreeMap or a sorted list."

---

## Two Pointers

### Summary

**What this topic covers**

The pattern that converts many O(N²) brute-force scans on sorted or symmetric data into O(N) with O(1) space. Three variants live here: (1) **opposite ends converging** — left and right pointers march inward on a sorted array, used for Two Sum II, 3Sum, Container With Most Water, Valid Palindrome, Trapping Rain Water; (2) **same direction (fast/slow)** — both pointers move forward, used for in-place mutation problems like Remove Duplicates from Sorted Array, Move Zeroes, Sort Colors (Dutch National Flag); (3) **fast/slow on linked lists** — the linked-list specialisation, used for cycle detection (Floyd's tortoise and hare), finding the middle of the list, and removing the Nth node from the end. The 6 questions in this topic cover the templates, the duplicate-skipping trick that makes 3Sum correct, the off-by-one traps with `<` vs `<=`, and the senior-level proof that 3SUM is conjecturally optimal at O(N²).

**Mental model**

Two pointers works when the data has **monotonic structure you can exploit by moving one pointer based on a comparison**. On a sorted array, if `nums[left] + nums[right] < target`, increasing left makes the sum larger (because the array is sorted); decreasing right makes it smaller. That monotonicity is what lets you discard half the search space per step without sorting or hashing. The mental shift from brute force is "I don't need to check every pair — moving the pointer in the right direction eliminates an entire row of the pair matrix in O(1)". For in-place mutation, the slow pointer marks the "write position" and the fast pointer marks the "read position"; you read with fast, decide whether to keep, and only advance slow when you keep. This is the universal "compact in place" pattern that beats the obvious O(N²) shift-everything-right approach. For linked lists, the fast/slow speed ratio (2:1) is what gives you the middle-of-list trick — when fast hits the end, slow is at the middle — and Floyd's cycle detection (they must meet inside the cycle if one exists).

**Key terms**

- **Converging pointers** — left and right start at opposite ends and meet; used for sorted-array problems.
- **Fast/slow pointers** — both move forward but at different speeds; used for in-place compaction and linked-list cycle detection.
- **In-place mutation** — modifying the input array without extra storage; the slow pointer is the write head.
- **Dutch National Flag** — three-pointer partition for sorting an array with three colours/values (low/mid/high).
- **Floyd's tortoise and hare** — fast moves 2 steps, slow moves 1; they meet inside a cycle if one exists.
- **Cycle start** — after Floyd's meeting, reset one pointer to head and advance both by 1; they meet at the cycle start.
- **Middle of list** — when fast hits the end (or `fast.next == None`), slow is at the middle.
- **Nth from end** — advance fast by N, then move both until fast hits the end; slow is at the Nth-from-end.
- **3SUM duplicate skip** — `if i > 0 and nums[i] == nums[i-1]: continue`; the trick that makes 3Sum correct without a hash set of triples.
- **Off-by-one** — `left < right` vs `left <= right`; pick one style for your problem and never mix.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on sorted inputs** — the moment the prompt says "sorted array" + "find pair / triplet", a senior candidate should reach for two pointers, not a hash map. The pointer version is strictly better (O(1) space vs O(N)) when the array is already sorted. (2) **In-place reasoning** — many interview problems specify "O(1) extra space"; two pointers is the universal answer for compaction problems. Candidates who can write Remove Duplicates from Sorted Array in-place without a temporary buffer show they understand the slow-pointer-as-write-head idiom. (3) **Linked-list mastery** — Floyd's cycle detection is a senior interview staple because it requires careful pointer arithmetic *and* a mathematical proof that the meeting point + head-distance reveals the cycle start. Getting the algorithm right is junior-level; explaining the math is senior-level.

**Common confusions**

- "Two pointers always means converging from ends" — no, fast/slow (same direction) is equally valid; pick by problem shape.
- "I need to skip duplicates after `left += 1`, not before" — actually both work; the canonical version skips on the *outer* loop (the fixed index in 3Sum) and after each match in the inner loop.
- "Floyd's only detects cycles, not the start" — the second phase (reset slow to head, advance both by 1, they meet at cycle start) is what makes it useful for Linked List Cycle II.
- "Two pointers is O(N²)" — it's O(N) for opposite-ends and fast/slow; the O(N²) version is 3Sum which has an outer loop fixing one index plus inner two pointers.
- "I can use two pointers on unsorted arrays" — only with hash map as backup; the sorted property is what gives you the directional move.
- "Middle of list is `len/2`" — that needs a length count first; fast/slow finds it in one pass without counting.

**What follows from this topic**

Two pointers underpins Sliding Window (which is a constrained variant — both pointers move forward, the right expands and the left shrinks based on a window condition). The linked-list variant feeds into Linked List Patterns (cycle detection, reversal, dummy nodes). The in-place compaction pattern recurs in Cyclic Sort & Index-as-Hash (where the "swap to correct index" is a same-direction two-pointer move). And the 3Sum template generalises to 4Sum, K-Sum, and Closest 3Sum — all variants of "fix N-2 indices, two-pointer the rest". If you internalise two pointers as "exploit monotonic structure with O(1) space", every later pattern that uses it will feel familiar.

### Q1. When do you reach for two pointers vs hash map on a "find pair" problem?

**Two pointers** when the array is already sorted (or sorting cost is amortised across many queries). O(N) time, O(1) space, beats hash map's O(N) space. **Hash map** when the array is unsorted and you can't afford to sort. O(N) time, O(N) space, beats two pointers' O(N log N) sort cost. The break-even: if you have to sort *just* for two pointers, hash map wins because sort is O(N log N) and hash is O(N). If the array is sorted as input (Two Sum II), two pointers strictly wins. For 3Sum and above, sort + two pointers wins because hashing triples is messy and dedup is harder.

### Q2. Walk me through the 3Sum template and explain the duplicate-skip trick.

```python
def three_sum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i-1]:  # skip duplicates at the outer index
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left-1]:
                    left += 1
            elif s < 0:
                left += 1
            else:
                right -= 1
    return result
```

The duplicate skip is needed in two places: (1) outer loop — if `nums[i] == nums[i-1]`, the triplets starting with this value are already in `result`. (2) inner loop after a match — if `nums[left] == nums[left-1]`, skip; otherwise you'd emit `[0, 0, 0]` multiple times for `[0, 0, 0, 0]`. Without these skips you'd need a set of triples for dedup, which is messier and slower. O(N²) time, O(1) extra space (output excluded).

### Q3. Walk me through Floyd's cycle detection — both phases.

**Phase 1: detect the cycle.** Move `slow` 1 step, `fast` 2 steps. If there's a cycle, they meet inside it (because fast gains 1 step per iteration). If `fast` or `fast.next` is None, no cycle.

**Phase 2: find the cycle start.** Reset `slow` to `head`. Advance both `slow` and `fast` one step at a time. They meet at the cycle start.

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            break
    else:
        return None
    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next
    return slow
```

The math: let `H` = distance from head to cycle start, `D` = distance from cycle start to meeting point (in the direction of motion), `L` = cycle length. At meeting, slow has moved `H + D`, fast has moved `H + D + kL` for some `k ≥ 1`, and `fast = 2 × slow`, so `H + D + kL = 2(H + D)`, giving `H = kL - D`. That is, starting one pointer at head and advancing `H` steps lands at the cycle start; advancing the other pointer from the meeting point by `H` steps also lands at the cycle start (it goes `kL - D` steps around the cycle from offset `D`). They meet at the start.

### Q4. What's the trap with Container With Most Water?

The greedy move: always advance the *shorter* pointer inward. Why? The water area is `min(height[l], height[r]) × (r - l)`. If you move the taller pointer inward, the width strictly decreases and the height is still capped by the shorter pointer — so the area can only get worse. Moving the shorter pointer is the only move that can possibly improve the area (because the new pointer might be taller, removing the height cap). The trap is forgetting this and trying to move both, or moving the taller pointer "because it might find a taller neighbour" — that's wrong, you've already established the shorter pointer is the bottleneck.

### Q5. Walk me through Sort Colors (Dutch National Flag).

Three pointers: `low` (next position for 0), `mid` (current scan), `high` (next position for 2, scanning right). Invariant: `nums[:low]` is all 0s, `nums[low:mid]` is all 1s, `nums[mid:high+1]` is unknown, `nums[high+1:]` is all 2s.

```python
def sort_colors(nums):
    low = mid = 0
    high = len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:  # nums[mid] == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
            # don't increment mid — the swapped-in value is unknown
```

The trap: when you swap with `high`, don't advance `mid` — the swapped-in value hasn't been examined yet. When you swap with `low`, you *can* advance `mid` because the swapped-in value was a 1 (it's behind `low` ≤ `mid`, which we already established is 1s). One pass, O(N), O(1) space.

### Q6. Senior interview angle: prove 3Sum is O(N²) optimal.

The conjecture (open for decades, widely believed) is that 3SUM requires Ω(N²) time. The intuition: there are O(N³) possible triples but only O(N²) distinct pair sums, and you must check each pair against the third element. No general algorithm is known that beats O(N²) on unbounded inputs. For small/bounded value ranges, FFT-based convolution can do O(N log N), but that's a special case. The interview-correct answer: "it's conjecturally optimal at O(N²); sort + two pointers is the standard solution. The hardness reduction is from 3SUM to many computational geometry problems (3 collinear points, etc.) — if you could beat 3SUM you'd beat all of them." Don't try to claim a sub-quadratic algorithm unless you can name the specific bounded-input trick.

---

## Sliding Window

### Summary

**What this topic covers**

The pattern for "contiguous subarray / substring with constraint" problems — the second most common pattern after Arrays & Hashing. Three flavours: (1) **fixed-size window** — exactly K elements, used for Maximum Average Subarray of Size K, Maximum Sum Subarray of Size K, Permutation in String; (2) **variable-size, shrink when condition violates** — Longest Substring with At Most K Distinct, Minimum Window Substring, Fruit Into Baskets; (3) **variable-size, expand to satisfy** — Smallest Subarray with Sum ≥ S, Minimum Operations to Reduce X to Zero (via complement). The 6 questions cover the standard templates, the "at most K = exactly K via subtraction" trick (atMost(K) - atMost(K-1)), the amortised O(N) analysis (each element added and removed at most once), and the Minimum Window Substring trap with required/formed counts.

**Mental model**

Sliding window works when the problem has the shape "find the longest/shortest contiguous subarray such that condition C holds" and **the condition is monotonic in the window size** — expanding the window can only make the condition fail (or only make it succeed), never both. That monotonicity is what makes the two-pointer move correct: when the window violates, shrink from the left; when it satisfies, expand to the right and update the best. The mental shift from brute force is "I don't need to recompute the window state from scratch — I incrementally add the right element and (sometimes) remove the left, maintaining a constant-time state update". The amortised O(N) comes from the fact that each element is added once (when right advances) and removed at most once (when left advances), so the total work across all iterations is 2N. The trap: when condition C is *non-monotonic* in window size (e.g. "maximum subarray sum with negatives possible"), sliding window doesn't apply — that's a DP / Kadane's problem. Always check monotonicity before committing.

**Key terms**

- **Fixed-size window** — window of exactly K elements; right always moves, left advances when window reaches K.
- **Variable-size window** — window grows and shrinks based on a condition.
- **Window state** — running sum, frequency map, distinct count; updated incrementally as the window moves.
- **Shrink-when-violates** — for "at most K" problems; while window is bad, advance left.
- **Expand-to-satisfy** — for "smallest such that ≥ S" problems; advance right until condition holds, then try to shrink.
- **At most K trick** — exactly K = atMost(K) - atMost(K-1); converts "exactly" problems to two "at most" runs.
- **Frequency map** — `char → count`; used for substring problems with character constraints.
- **Required vs formed** — for Minimum Window Substring; required = how many distinct chars T has, formed = how many of those have the right count in the window.
- **Monotonic predicate** — the condition must be monotonic in window size for sliding window to be applicable.
- **Amortised analysis** — each element touched at most twice (add once, remove once); total O(N) despite the inner while loop.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on contiguous problems** — "contiguous", "substring", "window of size K", "longest with at most" are dead giveaway keywords. A senior candidate names sliding window in 10 seconds. (2) **Amortised complexity reasoning** — the inner while loop *looks* like O(N²) on first glance, but each element is processed at most twice. Articulating "this is O(N) because each character is added and removed at most once across the whole loop" is the senior tell. Junior candidates either miss it or state O(N²). (3) **Tricky state management** — Minimum Window Substring is the test case where naive `len(window_map) == len(t_map)` is wrong (counts matter, not just presence). The required/formed pattern is the senior-level workaround that gets it right in one pass. Interviewers reach for this problem specifically because the gap between "knows sliding window" and "knows Minimum Window Substring" is exactly the gap between junior and senior.

**Common confusions**

- "Sliding window works on any subarray problem" — only contiguous + monotonic. Subsequence problems are DP. Non-monotonic conditions are DP/Kadane.
- "Shrinking should use `if`, not `while`" — needs `while` for "at most K" problems where the condition might still be violated after one shrink.
- "I can use sliding window with negative numbers" — generally no; the running sum is no longer monotonic. There are exceptions (Minimum Window Substring works with positive counts).
- "Window state is just a sum or count" — for substring problems it's a frequency map; tracking just `len(map)` misses the "counts must match" requirement.
- "Fixed window doesn't need a `while`" — correct; just slide by one each iteration after reaching size K.
- "atMost(K) and exactly(K) are the same algorithm" — different in spirit; the subtraction trick is the bridge.

**What follows from this topic**

Sliding window underpins Monotonic Deque (which is sliding window max/min — the deque maintains the window's extrema in O(1) amortised). It pairs with Prefix Sum for problems like "longest subarray with sum equal to K" (where the window isn't strictly monotonic but prefix-sum-diff lookup gives a one-pass solution). The "expand-to-satisfy" variant generalises to two-pointer problems on streams. And the amortised analysis here is the same idea that underpins Monotonic Stack (each index pushed and popped at most once). If you can articulate why sliding window is O(N) and not O(N²), you've internalised the amortised mindset that recurs across the whole curriculum.

### Q1. Walk me through the variable-size sliding window template ("longest substring with at most K distinct").

```python
def longest_substring_at_most_k_distinct(s, k):
    count = {}
    left = 0
    best = 0
    for right in range(len(s)):
        count[s[right]] = count.get(s[right], 0) + 1
        while len(count) > k:
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best
```

The structure: outer for-loop over right (always advances), inner while-loop shrinks left while the window violates the constraint. Update `best` after the shrink so the window is always valid when measured. The critical detail: delete the key when count hits zero, otherwise `len(count)` overcounts and breaks the shrink condition.

### Q2. Why is this O(N) and not O(N²)?

The outer loop runs N times. The inner while-loop *can* run multiple times per outer iteration — but each character is added to the window exactly once (when right advances) and removed at most once (when left advances). So across the entire algorithm, the total work in the inner loop is bounded by N. Total: O(N) amortised. The mistake junior candidates make is looking at "for loop with while loop inside" and assuming O(N²); the senior tell is naming the amortised argument out loud.

### Q3. Walk me through Minimum Window Substring — what's the required/formed trick?

You need the window to contain every character of T with the right counts. Naive approach: shrink when `window_map == t_map` — wrong because window can have extra characters of T (and that's still valid). Correct: track `required` (number of distinct chars in T) and `formed` (number of distinct chars in T whose window count matches the t_map count). Shrink when `formed == required`.

```python
from collections import Counter

def min_window(s, t):
    if not t: return ""
    t_count = Counter(t)
    required = len(t_count)
    window = {}
    formed = 0
    left = 0
    best = (float('inf'), 0, 0)
    for right, c in enumerate(s):
        window[c] = window.get(c, 0) + 1
        if c in t_count and window[c] == t_count[c]:
            formed += 1
        while formed == required:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right)
            window[s[left]] -= 1
            if s[left] in t_count and window[s[left]] < t_count[s[left]]:
                formed -= 1
            left += 1
    return s[best[1]:best[2]+1] if best[0] != float('inf') else ""
```

The trap: incrementing `formed` only when the window count *first reaches* the required count (not when it exceeds). Decrementing `formed` only when the window count *drops below* the required count. Get those off-by-one comparisons right and the rest follows.

### Q4. The "at most K = exactly K via subtraction" trick — when do you use it?

For problems like "Subarrays with K Different Integers" (LeetCode 992), the "exactly K" variant doesn't fit cleanly into a sliding window because the count of distinct chars isn't monotonically increasing or decreasing as you extend. The trick: `exactly(K) = atMost(K) - atMost(K-1)`. Each `atMost(X)` is a standard sliding window. Total still O(N) (two passes). This converts a hard problem into two easy ones — recognise the signal "exactly K [some count]" on a contiguous subarray and reach for it.

### Q5. Walk me through "smallest subarray with sum ≥ S" (expand-to-satisfy).

```python
def min_subarray_sum(nums, s):
    left = 0
    total = 0
    best = float('inf')
    for right, x in enumerate(nums):
        total += x
        while total >= s:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return best if best != float('inf') else 0
```

Same shape as the "at most K" template but flipped: extend until condition holds, then shrink while it still holds, recording the minimum length. Note this assumes positive numbers — with negatives the running sum isn't monotonic and you need a different approach (deque + prefix sum). O(N) amortised.

### Q6. Senior interview angle: when does sliding window break, and what's the fallback?

Sliding window breaks when the condition is **non-monotonic in window size** or when the array contains **negative numbers** in a sum-based problem. Example: "longest subarray with sum equal to K" — adding more elements can either increase or decrease the sum (with negatives), so shrinking from the left isn't guaranteed to restore feasibility. Fallback: **prefix sum + hash map**. Compute `prefix[i]`, store each prefix in a map (or set), check if `prefix[i] - K` was seen earlier. Same O(N) but doesn't rely on monotonicity. Another fallback for max/min over a fixed window: monotonic deque. The interviewer is testing whether you know sliding window has limits, not just that you know it.

---

## Prefix Sum

### Summary

**What this topic covers**

The pattern for "range sum query / subarray with property" problems — converting per-query O(N) range scans into O(1) lookups via cumulative sums. Five sub-patterns live here: (1) **cumulative sum array** — `prefix[i] = sum(nums[:i])`, range sum `[l, r]` = `prefix[r+1] - prefix[l]`; (2) **prefix sum + hash map** — the killer variant for "subarray sum equals K", stores `prefix_value → count`, the most important variation in the family; (3) **2D prefix sum** — for matrix range queries, `prefix[i][j] = sum of submatrix [0..i][0..j]`; (4) **difference array** — the inverse, for "increment range [l, r] by v" operations in O(1) per update with O(N) integration at the end; (5) **prefix XOR** — same trick as prefix sum but with XOR for "subarray XOR equals K" problems. The 6 questions cover the templates, the `{0: 1}` seed trap, the inclusive/exclusive bounds discipline, and the bridge to segment trees when the array is mutable.

**Mental model**

Prefix sum is the **arithmetic precomputation** that makes range queries O(1). The cumulative-sum array exploits the fact that `sum(nums[l..r]) = sum(nums[0..r]) - sum(nums[0..l-1])` — once you have the cumulative array, every range sum is one subtraction. The killer extension is **prefix sum + hash map**: if you're looking for subarrays summing to K, it's equivalent to finding two prefix sums that differ by K, which is a Two-Sum problem on the prefix array — one pass with a hash map gives O(N) total. The dual concept is the **difference array**: instead of computing cumulative sums forward, you encode "increment range [l, r] by v" as `diff[l] += v; diff[r+1] -= v`; integrating with a running sum at the end materialises the actual values. This is the right pattern when you have many range updates and one final query — flips the cost structure of prefix sum. Both ideas extend to 2D matrices, where the inclusion-exclusion formula `prefix[i][j] = nums[i][j] + prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1]` handles the overlap. And the trick generalises beyond sums: prefix XOR for XOR queries, prefix product for product queries (with division-handling caveats).

**Key terms**

- **Cumulative sum array** — `prefix[i] = nums[0] + nums[1] + ... + nums[i-1]`; length N+1 with `prefix[0] = 0`.
- **Range sum** — `sum(nums[l..r]) = prefix[r+1] - prefix[l]`; inclusive of both ends.
- **Prefix sum + hash map** — for "subarray sum equals K"; store `prefix_value → count` seen so far.
- **`{0: 1}` seed** — initialise the hash map with `{0: 1}` to handle subarrays starting at index 0.
- **2D prefix sum** — `prefix[i][j] = sum of submatrix [0..i][0..j]`; uses inclusion-exclusion to build.
- **Range sum 2D query** — `sum(r1, c1, r2, c2) = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]`.
- **Difference array** — encodes range updates; `diff[l] += v; diff[r+1] -= v`; integrate to materialise.
- **Prefix XOR** — same as prefix sum but with XOR; "subarray XOR equals K" uses the same hash-map trick.
- **Prefix modulo** — `prefix[i] % K` for "subarray sum divisible by K" or "continuous subarray sum is multiple of K".
- **Static vs mutable** — prefix sum is for static arrays; for mutable arrays, switch to segment tree or Fenwick tree.

**Why interviewers ask this**

Three signals. (1) **Recognising "range" or "subarray" + "sum / count / property"** — the hash-map variant is one of the most common medium problems, and senior candidates spot it from the keyword "subarray sum equals K". (2) **Hash-map seed discipline** — the `{0: 1}` initialisation is the off-by-one trap that catches juniors. Without it, the subarray starting at index 0 isn't counted. Naming this trap out loud is the senior tell. (3) **Bridge to segment trees / Fenwick** — the senior follow-up is "what if the array changes between queries?" — that's the cue to introduce segment tree or Fenwick tree (binary indexed tree). Knowing when prefix sum is enough and when it isn't is exactly the staff-level boundary call.

**Common confusions**

- "Range sum is `prefix[r] - prefix[l]`" — depends on whether prefix is 0-indexed or 1-indexed and whether ends are inclusive. Pick one convention and stick to it.
- "I don't need the `{0: 1}` seed" — you do, for subarrays starting at index 0.
- "Prefix sum works on a stream" — only if you don't need range queries on past windows; otherwise you need to store the prefix array.
- "2D prefix sum is just nested 1D" — no, the build step uses inclusion-exclusion to avoid double-counting.
- "Difference array is just for updates" — it's the dual of prefix sum; updates are O(1), final materialisation is O(N). Useful when updates >> queries.
- "Prefix XOR doesn't work the same way" — it does, because XOR is its own inverse: `prefix[r] ^ prefix[l-1]` gives the XOR of nums[l..r].

**What follows from this topic**

Prefix sum is the gateway to **Segment Trees** and **Fenwick Trees** (when the array is mutable), which are advanced topics in the Less-Common section. It pairs naturally with hash maps (the Two-Sum-on-prefix variant), and it's the canonical preprocessing step for problems like Range Sum Query Immutable and Range Sum Query 2D Immutable. The difference-array variant is the foundation of sweep-line algorithms (Q22, Intervals) — same idea (start +1, end -1, integrate) generalises to "max concurrent meetings" and "min arrows to burst balloons". If you see "many range queries on static data" or "many range updates with one final query", prefix-sum thinking should be the first move.

### Q1. Walk me through "subarray sum equals K" with a hash map.

```python
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = {0: 1}  # seed
    for num in nums:
        prefix += num
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

For each prefix sum, check how many earlier prefix sums equal `prefix - k`; that count is the number of subarrays ending here that sum to K. The `{0: 1}` seed handles subarrays starting at index 0 — without it, `prefix == k` at the first match wouldn't count. O(N) time, O(N) space. This trick generalises: "subarray XOR equals K" uses `prefix ^ k`, "subarray sum divisible by K" uses `prefix % k`.

### Q2. Why does `{0: 1}` matter — give a failing example without it.

Take `nums = [3, 1, 2]`, `k = 3`. The subarray `[3]` (just the first element) sums to 3. Without the seed, after the first iteration `prefix = 3` and we look up `seen.get(0, 0) = 0` — miss. With the seed, `seen.get(0, 0) = 1` — hit, count incremented. The seed encodes "the empty prefix has sum 0, and there's one such prefix" — without it, you miss every subarray that starts at index 0.

### Q3. Walk me through 2D prefix sum.

Build:
```python
def build_2d_prefix(matrix):
    rows, cols = len(matrix), len(matrix[0])
    prefix = [[0] * (cols + 1) for _ in range(rows + 1)]
    for r in range(rows):
        for c in range(cols):
            prefix[r+1][c+1] = (matrix[r][c]
                                + prefix[r][c+1]
                                + prefix[r+1][c]
                                - prefix[r][c])
    return prefix
```

Query `sum(r1, c1, r2, c2)` (inclusive, 0-indexed):
```python
def query(prefix, r1, c1, r2, c2):
    return (prefix[r2+1][c2+1]
            - prefix[r1][c2+1]
            - prefix[r2+1][c1]
            + prefix[r1][c1])
```

The inclusion-exclusion: subtract the top rectangle, subtract the left rectangle, add back the doubly-subtracted top-left corner. O(rows·cols) build, O(1) per query.

### Q4. Walk me through the difference array trick.

When you have many range updates "increment nums[l..r] by v" and one final read of the whole array, naive O(N) per update gives O(N·Q). Difference array gives O(1) per update + O(N) final integration.

```python
def apply_range_updates(n, updates):
    diff = [0] * (n + 1)
    for l, r, v in updates:
        diff[l] += v
        diff[r + 1] -= v
    nums = [0] * n
    running = 0
    for i in range(n):
        running += diff[i]
        nums[i] = running
    return nums
```

Total: O(Q + N) instead of O(N·Q). The senior application is sweep-line: encode "meeting starts at L, ends at R" as `diff[L] += 1, diff[R] -= 1`, integrate to get concurrent count at each time, take the max — gives Meeting Rooms II in O(N log N) sort + O(N) sweep.

### Q5. What's the trap with "subarray sum divisible by K"?

You can't just use `prefix - k` because divisibility isn't equality. Store `prefix % K` in the hash map; two prefixes with the same remainder differ by a multiple of K, so the subarray between them sums to a multiple of K. Trap: negative numbers can give negative remainders in Python (and Java). Use `((prefix % k) + k) % k` to normalise. Same `{0: 1}` seed for subarrays starting at index 0.

```python
def subarrays_div_by_k(nums, k):
    count = 0
    prefix = 0
    seen = {0: 1}
    for num in nums:
        prefix += num
        r = ((prefix % k) + k) % k
        count += seen.get(r, 0)
        seen[r] = seen.get(r, 0) + 1
    return count
```

### Q6. Senior interview angle: when does prefix sum fall apart and what's the upgrade?

Prefix sum is **for static arrays**. The moment the array becomes mutable (point updates between range queries), every update would require recomputing the suffix of the prefix array — O(N) per update. The upgrade is **Fenwick tree (Binary Indexed Tree)** for range-sum + point-update, both O(log N). For more general operations (range min, range max, range GCD, range update with lazy propagation), **segment tree** is the answer, also O(log N) per op but more flexible. The interviewer signal: "what if the array changes?" → "Fenwick or segment tree, depending on operation". Stating that progression is the staff-level move.

---

## Monotonic Stack

### Summary

**What this topic covers**

The pattern for "next greater / previous smaller / nearest larger" problems and the family of histogram-rectangle problems that look like O(N²) but resolve to O(N). The core invariant: maintain a stack where values are monotonically increasing or decreasing; when a new element violates the invariant, pop — and the popped element's "next greater/smaller" is the current element. Four canonical applications: (1) **Next Greater Element** family — Daily Temperatures, Stock Span, Next Greater Element I/II; (2) **Histogram / rectangle problems** — Largest Rectangle in Histogram, Maximal Rectangle, Sum of Subarray Minimums; (3) **Lexicographic monotonic** — Remove K Digits, Smallest Subsequence of Distinct Characters; (4) **Trapping Rain Water** — solvable with monotonic stack as an alternative to two pointers. The 6 questions cover the canonical template, the variant for "previous" instead of "next", the circular-array trick, the contribution technique for Sum of Subarray Minimums, and the senior-level amortised analysis.

**Mental model**

Monotonic stack works on **"for each index, find the nearest index in some direction satisfying a comparison"** problems. The brute force is O(N²) — for each index, scan in the chosen direction. The stack trick: as you iterate, you maintain a stack of indices whose answers are *still unknown*. When you encounter a new element that resolves some pending question (i.e. it's the "next greater" for elements in the stack), you pop those elements and record the answer. The stack invariant — strictly decreasing for "next greater", strictly increasing for "next smaller" — is what guarantees that when you pop, the current element really is the nearest qualifying neighbour. The amortised analysis: each index is pushed once and popped at most once, so the total inner-loop work across the whole algorithm is O(N), even though it looks like nested loops. The deeper insight is that monotonic stack is the **algorithmic dual of the brute-force scan** — instead of scanning forward from each index, you let the new index "pull" the answer back to all the indices it resolves. For histogram problems, the trick is that for each bar `h[i]`, the largest rectangle containing it has width = (next smaller index) - (previous smaller index) - 1; once you can compute next-smaller and previous-smaller for each bar in O(N), the rectangle problem is O(N).

**Key terms**

- **Monotonic stack** — stack whose values (or values indexed by stack contents) are monotonic.
- **Next Greater Element (NGE)** — for each index, the value of the closest larger element to the right.
- **Next Smaller Element (NSE)** — closest smaller to the right; uses an increasing stack.
- **Previous Greater / Previous Smaller** — symmetric; iterate left-to-right but query the stack top before pushing.
- **Histogram rectangle** — for each bar, the largest rectangle containing it is bounded by the nearest smaller bars on each side.
- **Contribution technique** — for "sum over all subarrays of f(subarray)", compute each element's contribution = how many subarrays it's the min/max of.
- **Circular array** — for "next greater in circular array", iterate `2N` times with `i % N` and only push real indices into the stack on the first pass.
- **Lexicographic monotonic** — for "smallest result string" problems, pop characters that are bigger than the new one (subject to budget constraints).
- **Stack of indices vs values** — indices are usually more useful because they let you compute distances/widths.
- **Strict vs non-strict monotonic** — strict (`<`) vs non-strict (`<=`); the difference matters for "first equal vs first strictly greater" semantics.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on a hard-to-derive-from-scratch family** — Next Greater is the kind of pattern almost no one invents in an interview; recognising it from the keyword "next greater" or "stock span" is the test. Junior candidates implement O(N²); senior candidates write the stack template from memory. (2) **Amortised complexity reasoning** — Largest Rectangle in Histogram looks like O(N²) (outer loop over bars, inner while loop popping) but is actually O(N) because each index is pushed and popped at most once. Articulating this is the senior tell. (3) **Variant fluency** — circular arrays, "previous" instead of "next", strict vs non-strict, contribution technique. The interviewer pushes on variants to see whether you can adapt the template, not just memorise it. The Histogram → Maximal Rectangle escalation (per-row histogram across a binary matrix) is a senior-level reach.

**Common confusions**

- "Monotonic increasing stack means push values in increasing order" — no; it means *after every push and pop*, the stack contents are monotonic. The stack pops happen *during* the push.
- "Next greater needs a decreasing stack — that's backwards" — yes it's backwards: you keep candidates whose NGE hasn't been found yet, and they must be in decreasing order so the next-bigger element resolves all of them.
- "I need two passes for next-greater-and-previous-greater" — for symmetric problems you can; for problems where you need both per index, one pass with two stacks or two passes with one stack both work.
- "Stack-of-values is fine, I don't need indices" — usually you need indices for width/distance calculations; values alone work only for "what's the next greater value" without "at what index".
- "Histogram is too hard, I'll just brute force" — the template is short and very standard; not knowing it is a senior tell in the wrong direction.
- "Trapping Rain Water needs monotonic stack" — it's one valid approach; the two-pointer approach is shorter and O(1) space.

**What follows from this topic**

Monotonic stack is the close cousin of **Monotonic Deque** (next topic) — same idea but with O(1) access to both ends, used for sliding-window max/min. The amortised analysis here is the same idea that underpins Sliding Window (each element added and removed at most once). The "contribution technique" for Sum of Subarray Minimums recurs in many subarray-aggregate problems and pairs well with prefix-sum thinking. And the histogram-rectangle template is the building block for Maximal Rectangle (apply per-row to a binary matrix). If you can write the Next Greater template from memory and explain the amortised analysis, you've earned the pattern.

### Q1. Walk me through Next Greater Element.

```python
def next_greater_elements(nums):
    n = len(nums)
    result = [-1] * n
    stack = []  # stack of indices; values nums[stack[i]] are strictly decreasing
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)
    return result
```

Walk through `[2, 1, 2, 4, 3]`:
- i=0, push 0. stack=[0]
- i=1, nums[1]=1 < nums[0]=2, push. stack=[0,1]
- i=2, nums[2]=2 > nums[1]=1, pop 1, result[1]=2. 2 == nums[0]=2, not strictly greater, push. stack=[0,2]
- i=3, nums[3]=4 > nums[2]=2, pop 2, result[2]=4. 4 > nums[0]=2, pop 0, result[0]=4. push. stack=[3]
- i=4, nums[4]=3 < 4, push. stack=[3,4]

result = [4, 2, 4, -1, -1]. Stack invariant: nums at stack indices are strictly decreasing (top is smallest).

### Q2. Walk me through Largest Rectangle in Histogram and the amortised O(N).

For each bar, the largest rectangle containing it spans from "previous smaller bar + 1" to "next smaller bar - 1". Compute these in one pass with a monotonic increasing stack.

```python
def largest_rectangle(heights):
    stack = []  # increasing stack of indices
    best = 0
    heights = heights + [0]  # sentinel forces final pop
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            top = stack.pop()
            # width: from (previous in stack + 1) to (i - 1), inclusive
            width = i if not stack else i - stack[-1] - 1
            best = max(best, heights[top] * width)
        stack.append(i)
    return best
```

Why O(N)? Each index is pushed exactly once and popped at most once across the whole algorithm. Total inner-loop work ≤ 2N. The sentinel `+ [0]` ensures everything left in the stack at the end gets popped (since 0 is smaller than any bar).

### Q3. Walk me through "Next Greater Element in a Circular Array".

Trick: iterate `2N` times, using `i % N` as the actual index. On the first pass push real indices, treating their NGE as unknown; on the second pass, only do the popping (the value comparison wraps around). Or, more idiomatically:

```python
def next_greater_circular(nums):
    n = len(nums)
    result = [-1] * n
    stack = []
    for i in range(2 * n):
        idx = i % n
        while stack and nums[stack[-1]] < nums[idx]:
            result[stack.pop()] = nums[idx]
        if i < n:
            stack.append(idx)
    return result
```

The `if i < n` guard prevents pushing indices on the second pass (they'd never resolve since we've already seen everything). O(N) — each index is pushed once and popped at most once.

### Q4. Walk me through the "contribution technique" for Sum of Subarray Minimums.

For each element `nums[i]`, count how many subarrays have `nums[i]` as their minimum. If that count is `C_i`, the answer is `sum(nums[i] * C_i)`. The count: let `L_i` = distance to previous strictly smaller element (or beginning), `R_i` = distance to next smaller-or-equal element (or end). Then `C_i = L_i * R_i`. Use monotonic stack to compute both in O(N).

```python
def sum_subarray_mins(nums):
    n = len(nums)
    MOD = 10**9 + 7
    # Previous less (strictly)
    pl = [-1] * n
    stack = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] >= x:
            stack.pop()
        if stack: pl[i] = stack[-1]
        stack.append(i)
    # Next less or equal (avoids double-counting equal mins)
    nl = [n] * n
    stack = []
    for i in range(n - 1, -1, -1):
        while stack and nums[stack[-1]] > nums[i]:
            stack.pop()
        if stack: nl[i] = stack[-1]
        stack.append(i)
    total = 0
    for i in range(n):
        total = (total + nums[i] * (i - pl[i]) * (nl[i] - i)) % MOD
    return total
```

The strict/non-strict asymmetry (`>=` on one side, `>` on the other) is what prevents double-counting when there are equal values — without it, a subarray with two equal mins would be counted twice. O(N).

### Q5. Walk me through Remove K Digits (lexicographic monotonic).

Goal: remove K digits from a number string to get the smallest possible remaining number. Greedy: scan left to right; whenever the new digit is smaller than the stack top, pop (subject to budget K). At the end, if K > 0, pop from the right.

```python
def remove_k_digits(num, k):
    stack = []
    for d in num:
        while stack and k > 0 and stack[-1] > d:
            stack.pop()
            k -= 1
        stack.append(d)
    # If we still have removals left, pop from the end
    while k > 0:
        stack.pop()
        k -= 1
    # Strip leading zeros
    return ''.join(stack).lstrip('0') or '0'
```

The intuition: at each position, removing a larger digit in favour of a smaller one to its right is locally optimal and (by an exchange argument) globally optimal. The stack enforces the monotonic-increasing prefix. O(N).

### Q6. Senior interview angle: why is Largest Rectangle in Histogram O(N) despite the nested-looking while loop?

Each index `i` is pushed onto the stack exactly once (when the outer loop reaches it) and popped at most once (either by some later index resolving it or by the sentinel at the end). The total number of pop operations across all outer iterations is therefore bounded by N. The total work in the while loop is O(N) summed over the whole algorithm. The outer loop is O(N). Total: O(N). This is **amortised analysis**: an individual iteration of the outer loop can do up to N pops, but they're "paid for" by earlier pushes. Articulating this — and naming "amortised" out loud — is what separates senior from junior. The same analysis applies to sliding window (each element added once, removed at most once) and to monotonic deque (next topic).

---

## Monotonic Deque

### Summary

**What this topic covers**

The pattern for "max or min in a sliding window of size K" problems — the cousin of monotonic stack with O(1) access to both ends. The deque maintains indices in monotonic order (decreasing values for window-max, increasing for window-min); the front is always the current window's extremum. Key applications: (1) **Sliding Window Maximum** — the canonical LeetCode hard; (2) **Shortest Subarray with Sum at Least K** — prefix-sum + monotonic deque, the hard variant that breaks pure sliding window because negatives make the sum non-monotonic; (3) **Constrained Subsequence Sum** — DP + monotonic deque, where the deque tracks the best `dp[j]` value within a window of K back-references; (4) **Jump Game VI** — same DP + deque trick for "max reachable score with jump ≤ K". The 5 questions cover the template, the eviction logic (front-of-deque expires when out of window), the prefix-sum-plus-deque combination, and the senior-level "why deque, not heap" question.

**Mental model**

A monotonic deque is a sliding window's *max/min query engine*. Whereas sliding window tracks a running aggregate (sum, count, distinct), monotonic deque tracks the **current window's extremum** with O(1) per element amortised. The key insight: when a new element enters the window, any older element smaller than it (for a window-max problem) is dominated forever — it can never be the window's max as long as the new element is in the window. So you pop them from the back. When the front-of-deque index falls out of the window (becomes < `i - K + 1`), you pop it from the front. The invariant: the deque always contains indices of the window's "still-contenders" in monotonically decreasing value order. The front is the current max. The amortised analysis is the same as monotonic stack — each index enters the deque once and leaves at most once, so total work is O(N) despite the inner while loops. The mental shift from monotonic stack is that you also need to evict the *front* (not just the back) when the window moves past it; that's the only difference, and it's why deque (double-ended) instead of stack (single-ended) is the right structure.

**Key terms**

- **Monotonic deque** — double-ended queue maintaining indices in monotonic order of values.
- **Window max** — front of decreasing-value deque is the current window's max.
- **Window min** — front of increasing-value deque is the current window's min.
- **Back eviction** — when a new element exceeds (or is below, for min) the back, pop from the back.
- **Front eviction** — when the front index falls outside the window (`< i - K + 1`), pop from the front.
- **Indices, not values** — deque stores indices so you can check window membership.
- **Prefix sum + deque** — for "shortest subarray with sum ≥ K" with negatives, deque holds prefix-sum indices in increasing order.
- **DP + deque** — for "best dp[j] within K back-references", deque speeds the inner max from O(K) to O(1) amortised.
- **Heap alternative** — heap also works for window max/min but costs O(N log K) instead of O(N); also can't evict by index directly.
- **Strict vs non-strict** — strict (`>`) keeps equal values; non-strict (`>=`) drops them. Matters for "first equal index" semantics.

**Why interviewers ask this**

Three signals. (1) **Senior pattern recognition** — Sliding Window Maximum is a LeetCode hard, but the monotonic-deque template is just 8 lines once you've seen it. A senior candidate writes it from memory; a junior candidate reaches for a heap or recomputes max for each window in O(NK). (2) **Amortised reasoning** — same as monotonic stack, naming "each index enters and leaves the deque at most once, so total O(N)" is the senior tell. (3) **Recognising when sliding window alone isn't enough** — for "shortest subarray with sum ≥ K" with negatives, naive sliding window fails because the sum isn't monotonic in window size. The fix is prefix sum + monotonic deque on prefix indices, which is hard to derive from scratch but trivial to recognise. The interviewer reaches for this problem to test whether you can compose patterns.

**Common confusions**

- "Monotonic deque is the same as monotonic stack" — same invariant, but deque needs O(1) front access for eviction-on-window-move; stack can't do that.
- "Heap is fine for sliding window max" — heap is O(N log K) and can't directly evict by index; deque is O(N) and supports the moving window cleanly.
- "I push values, not indices" — push indices; you need them to check window membership for front eviction.
- "Sliding window max needs to maintain sorted order" — only at the back. Inserting at the back may pop multiple elements; the deque ends up containing only "future contender" indices.
- "Prefix sum + sliding window solves shortest-subarray-sum-≥-K" — fails with negative numbers; you need the deque to track minimum prefix candidates.
- "Deque is just two stacks" — you can simulate it that way (Queue Using Two Stacks pattern), but Python's `collections.deque` is O(1) on both ends natively.

**What follows from this topic**

Monotonic deque pairs naturally with **Prefix Sum** for the shortest-subarray-sum problem and with **Dynamic Programming** for the constrained-DP family (Jump Game VI, Constrained Subsequence Sum). The amortised analysis here is the same recurring theme that links Sliding Window, Monotonic Stack, and Monotonic Deque — three patterns sharing one analytical move (each element processed at most twice across the whole algorithm). If you can write Sliding Window Maximum from memory and articulate why deque beats heap, you've earned this pattern.

### Q1. Walk me through Sliding Window Maximum.

```python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()  # indices; nums[dq[0]] is current window max
    result = []
    for i, x in enumerate(nums):
        # Evict expired front
        while dq and dq[0] <= i - k:
            dq.popleft()
        # Evict dominated back
        while dq and nums[dq[-1]] < x:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

Two while loops: front-eviction (window slid past) and back-eviction (dominated by new element). Output `nums[dq[0]]` once the window is full. O(N) amortised — each index pushed and popped at most once.

### Q2. Why deque instead of heap for window max?

Heap gives O(N log K) and can't easily evict by index — you'd have to use a "lazy deletion" approach where you tag entries as stale and skip them on pop, which works but is messier. Deque is O(N) (each element pushed and popped once across the whole algorithm) and supports the "evict from front when index out of window" operation in O(1) per eviction. If the interviewer asks "can heap work?", say yes with lazy deletion at O(N log K); but deque is the canonical answer.

### Q3. Walk me through Shortest Subarray with Sum at Least K.

The trap: with positive-only numbers, sliding window works (O(N)). With negatives, the prefix sum isn't monotonic and sliding window fails. Instead, use prefix sum + monotonic deque on prefix indices.

```python
from collections import deque

def shortest_subarray(nums, k):
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    dq = deque()  # indices into prefix; values prefix[dq[i]] increasing
    best = float('inf')
    for i in range(n + 1):
        # Try to satisfy with the smallest prefix in the deque
        while dq and prefix[i] - prefix[dq[0]] >= k:
            best = min(best, i - dq.popleft())
        # Maintain increasing-prefix invariant
        while dq and prefix[dq[-1]] >= prefix[i]:
            dq.pop()
        dq.append(i)
    return best if best != float('inf') else -1
```

The invariant: deque holds prefix indices in increasing prefix-value order. For each new index `i`, repeatedly check if the smallest-prefix in the deque (front) yields a subarray summing ≥ K — if yes, pop it (we have the best answer using that front; any later index gives a longer subarray). Then maintain the invariant by popping back-elements ≥ current prefix. O(N).

### Q4. Walk me through Constrained Subsequence Sum (DP + monotonic deque).

`dp[i] = nums[i] + max(0, max(dp[i-K], dp[i-K+1], ..., dp[i-1]))`. Naive: O(NK). With monotonic deque maintaining the max `dp[j]` in the K-back window: O(N).

```python
from collections import deque

def constrained_subset_sum(nums, k):
    n = len(nums)
    dp = nums[:]
    dq = deque([0])
    for i in range(1, n):
        # Evict expired
        while dq and dq[0] < i - k:
            dq.popleft()
        # Use front (best dp in window)
        dp[i] = nums[i] + max(0, dp[dq[0]])
        # Maintain decreasing-dp deque
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return max(dp)
```

The pattern: DP recurrence with a max-over-window subexpression → use monotonic deque to make the max O(1) amortised. Jump Game VI is the same pattern with a slightly different recurrence.

### Q5. Senior interview angle: when do you reach for monotonic deque vs sparse table vs segment tree for range max?

**Monotonic deque** — when the window slides forward by 1 each step (sliding-window queries). O(N) total, O(K) space.

**Sparse table** — for *arbitrary* range-max queries on an immutable array. O(N log N) precomputation, O(1) per query. Use when you have many queries and the queries aren't sliding.

**Segment tree** — when the array is mutable. O(log N) per query and per update. More general but slower constants.

The signal: sliding window of size K → deque. Many arbitrary queries on static data → sparse table. Mutable array → segment tree. Naming this hierarchy is the staff-level move.

---

## Binary Search

### Summary

**What this topic covers**

The pattern for "find element in sorted data in O(log N)" and its more powerful cousin "binary search on the answer" — the senior-level lever that makes many seemingly intractable problems solvable in O(N log range). Two flavours: (1) **search on array** — classic find-target / lower-bound / upper-bound on a sorted array, including the rotated-sorted-array variants; (2) **binary search on the answer** — when the answer space is bounded and the predicate `can_we_do_it_with_X(x)` is monotonic. Examples: Minimum Capacity to Ship Packages, Koko Eating Bananas, Split Array Largest Sum, Smallest Divisor, Median of Two Sorted Arrays. The 7 questions cover the canonical lower-bound template, the inclusive-vs-exclusive bounds discipline, the "predicate monotonicity" recognition signal, the rotated-array variant, and the senior follow-up on Median of Two Sorted Arrays.

**Mental model**

Binary search is the universal **divide-by-half search** on any monotonic structure. The classic version searches on a sorted array; the senior-level extension is **searching on the answer space**. Whenever the problem asks for "the minimum X such that some predicate is true" or "the maximum X such that ...", and the predicate is **monotonic** in X (true for all X above some threshold, false below — or vice versa), you can binary search on X. You don't need a sorted array; you need a monotonic predicate. The brute force iterates every X and tests; binary search does it in O(log range × cost-per-test). The mental shift is "the answer itself is the thing to search over, not the input array". The canonical template uses inclusive-exclusive bounds (`left = 0, right = len(nums)`) and the half-open invariant (`nums[left:right]` is the candidate range); this convention prevents the off-by-one errors that plague the inclusive-inclusive style. The other invariant discipline: pick "lower bound" vs "upper bound" semantics deliberately and stick with one — mixing them is the second-most-common bug. Modern interview problems lean heavily on binary-search-on-answer because it tests whether you can recognise monotonicity in an unfamiliar problem, not just write a textbook search.

**Key terms**

- **Lower bound** — smallest index `i` such that `nums[i] >= target`; returns `len(nums)` if all are smaller.
- **Upper bound** — smallest index `i` such that `nums[i] > target`; returns `len(nums)` if all are ≤ target.
- **Inclusive-exclusive bounds** — `left = 0, right = len(nums)`; loop while `left < right`.
- **Inclusive-inclusive bounds** — `left = 0, right = len(nums) - 1`; loop while `left <= right`. Different shape; pick one.
- **Monotonic predicate** — `can_we_do_it_with_X(x)` is true for all x ≥ threshold (or all x ≤); the precondition for binary search on the answer.
- **Binary search on answer** — search over the answer space (e.g. capacity, days, divisor), not the input array.
- **Rotated sorted array** — sorted array rotated at some pivot; modified binary search figures out which half is sorted.
- **Peak element** — local maximum; binary search by checking neighbour.
- **Overflow** — `(left + right) // 2` overflows in Java/C++; use `left + (right - left) // 2`. Python is safe.
- **Off-by-one** — `<` vs `<=` and `mid + 1` vs `mid` are the two common bug sources.

**Why interviewers ask this**

Three signals. (1) **Template discipline** — getting binary search right under interview pressure requires picking a convention (inclusive-exclusive) and sticking with it. Candidates who muddle bounds and write infinite loops are an instant downgrade. (2) **Predicate-monotonicity recognition** — the senior tell is naming "this is binary search on the answer because the predicate `can_ship(cap)` is monotonic in cap". Junior candidates don't see the binary-search opportunity in problems like Koko Eating Bananas because the input isn't sorted; senior candidates see it because the *answer space* is monotonic. (3) **Edge case discipline** — rotated arrays, all-same elements, single-element arrays, target outside the range — interviewers test these specifically. The canonical Median of Two Sorted Arrays problem requires binary searching on the partition point, which is an interview classic for testing whether you can adapt binary search to a non-obvious search space.

**Common confusions**

- "Binary search needs a sorted array" — the *predicate* needs to be monotonic; that's often achievable without sorted input.
- "`mid = (left + right) // 2` is fine" — overflows in Java/C++; use `left + (right - left) // 2`. Python's arbitrary precision integers are safe.
- "Lower bound and upper bound are interchangeable" — they return different indices when the target is present multiple times. Use lower for "first occurrence", upper for "first after".
- "Binary search on rotated array is too hard" — it's a standard template: check which half is sorted by comparing `nums[mid]` to `nums[left]`, recurse on the sorted half if target is in range.
- "Inclusive-inclusive is simpler" — both styles work; inclusive-exclusive is more consistent because `right = len` is always "one past the end".
- "If my binary search doesn't terminate, the bug is in `<` vs `<=`" — that's one cause; another is incorrect `mid` update (`left = mid` instead of `left = mid + 1`).

**What follows from this topic**

Binary search is the foundation of **patience-sorting LIS in O(N log N)**, of **Kth Smallest in Sorted Matrix** (binary search on the value), of **Find Peak Element**, of **Search in Rotated Sorted Array**. The binary-search-on-answer pattern recurs across many DP-like optimisation problems (Capacity to Ship, Koko, Split Array Largest Sum). It pairs with prefix sum (Maximum Size Subarray Sum Equals K), with the median-of-two-sorted-arrays template, with sparse tables (range-min query on immutable data). And the discipline you build here — pick a convention, name the invariant, never mix bounds — pays off in every other O(log N) algorithm you write.

### Q1. Walk me through the canonical lower-bound template.

```python
def lower_bound(nums, target):
    """Smallest index i where nums[i] >= target."""
    left, right = 0, len(nums)  # right is exclusive
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left
```

Invariant: the answer is in `[left, right)`. When `nums[mid] < target`, the answer is strictly right of mid → `left = mid + 1`. When `nums[mid] >= target`, the answer is at mid or left of it → `right = mid` (not `mid - 1`!). Loop ends when `left == right`; that's the answer. For upper bound (smallest index where `nums[i] > target`), change `<` to `<=`.

### Q2. Walk me through Binary Search on the Answer with Capacity to Ship Packages.

```python
def smallest_capacity(weights, days):
    def can_ship(cap):
        d = 1; load = 0
        for w in weights:
            if load + w > cap:
                d += 1
                load = 0
            load += w
        return d <= days
    left, right = max(weights), sum(weights)
    while left < right:
        mid = (left + right) // 2
        if can_ship(mid):
            right = mid
        else:
            left = mid + 1
    return left
```

The answer space is `[max(weights), sum(weights)]` — minimum capacity is max single package (else that package doesn't fit), maximum is total sum (one day). `can_ship(cap)` is monotonic: true for all capacities above the answer, false below. Binary search on `cap`. Each `can_ship` is O(N); total O(N log(sum-max)).

### Q3. Walk me through Search in Rotated Sorted Array.

Trick: at each step, one of the two halves `[left, mid]` and `[mid+1, right]` is guaranteed sorted (because the rotation only happens at one pivot). Check which:

```python
def search_rotated(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:  # left half sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # right half sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
```

Edge case: duplicates break the "one half is sorted" guarantee (you can't tell which half). For arrays with duplicates, you may need to linearly skip equal elements at the boundary — O(N) worst case.

### Q4. Walk me through Find Peak Element.

A "peak" is any index `i` such that `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]` (with virtual `-∞` at boundaries). Multiple peaks may exist; return any. Binary search works because of the slope argument: at each `mid`, if `nums[mid] < nums[mid+1]`, the slope is going up, so a peak must exist to the right (because the array is bounded above and below); if `nums[mid] > nums[mid+1]`, a peak exists at mid or to the left.

```python
def find_peak(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < nums[mid + 1]:
            left = mid + 1
        else:
            right = mid
    return left
```

O(log N). The trick is seeing that binary search applies even though the array isn't sorted — what's monotonic is the "is there a peak to my right" predicate.

### Q5. Walk me through Koko Eating Bananas — what's the predicate?

Koko eats at speed `k` bananas/hour; she finishes pile of size `p` in `ceil(p/k)` hours. Given piles and `H` hours, find minimum `k` such that she finishes in time. Predicate: `can_finish(k)` = sum of `ceil(p/k)` over piles ≤ H. Monotonic: higher `k` is faster (or equal), so once `can_finish(k)` is true, it's true for all higher `k`. Binary search on `k` in `[1, max(piles)]`.

```python
def min_eating_speed(piles, h):
    def can_finish(k):
        return sum((p + k - 1) // k for p in piles) <= h
    left, right = 1, max(piles)
    while left < right:
        mid = (left + right) // 2
        if can_finish(mid):
            right = mid
        else:
            left = mid + 1
    return left
```

Same shape as Capacity to Ship Packages — recognise the family.

### Q6. What's the trap with `(left + right) // 2`?

In Java/C++/Rust with fixed-width integers, `left + right` can overflow when both are large (e.g. near INT_MAX). The fix: `left + (right - left) // 2` — same value, no overflow. In Python, integers are arbitrary precision, so this is a non-issue, but the habit is worth keeping for portability. The other trap: forgetting `+ 1` in `left = mid + 1` — without it, `left` and `right` get stuck when they're adjacent and the loop never terminates. Always trace your binary search by hand on a 3-element array to catch these.

### Q7. Senior interview angle: walk me through Median of Two Sorted Arrays.

Brute O(N+M) merges and finds the median. The O(log(min(N,M))) trick: binary search on the **partition point** of the smaller array. Partition both arrays into left and right halves of equal size; if `max(leftA, leftB) <= min(rightA, rightB)`, you've found the median split.

```python
def find_median(a, b):
    if len(a) > len(b): a, b = b, a  # binary search on smaller
    n, m = len(a), len(b)
    total = n + m
    half = (total + 1) // 2
    left, right = 0, n
    while left <= right:
        i = (left + right) // 2
        j = half - i
        a_left = a[i-1] if i > 0 else float('-inf')
        a_right = a[i] if i < n else float('inf')
        b_left = b[j-1] if j > 0 else float('-inf')
        b_right = b[j] if j < m else float('inf')
        if a_left <= b_right and b_left <= a_right:
            if total % 2:
                return max(a_left, b_left)
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        elif a_left > b_right:
            right = i - 1
        else:
            left = i + 1
    return -1
```

The senior point: this is binary search where the *thing you're searching for* is "how many elements from A go into the left half"; the predicate "the partition is valid" is monotonic in that count. Hardest part is the boundary handling with `inf` sentinels for "the partition includes all / none of A". O(log(min(N, M))).

---

## Linked List Patterns

### Summary

**What this topic covers**

The pattern family for problems where the input is a `ListNode` and the answer requires careful pointer manipulation without random access. Four sub-patterns: (1) **dummy node** — prepend a sentinel when the head can change, to avoid edge-case branches; (2) **fast/slow pointers** — find the middle, detect cycles, find Nth from end; (3) **in-place reversal** — `prev`, `curr`, `next` shuffle to flip pointers without extra memory; (4) **merge with tail pointer** — combine two sorted lists by appending to a dummy-head tail. The 7 questions cover the canonical reverse template, Floyd's cycle detection with the meeting-point proof, the dummy-node idiom for Reverse Nodes in K-Group, the Reorder List composition (find middle, reverse second half, weave), and the LRU Cache implementation as the senior-level "linked list + hash map" problem.

**Mental model**

Linked lists test two things at once: **pointer hygiene** and **edge-case fluency**. The pointer hygiene is mechanical — you need three variables (`prev`, `curr`, `next`) to reverse, you need to save `curr.next` before clobbering it, you need to check `fast and fast.next` before `fast = fast.next.next`. The edge-case fluency is what separates senior from junior: the head can change (use a dummy node), the list can be empty (return immediately), the list can have one or two nodes (degenerate cases for fast/slow), cycles can start at the head (Floyd's still works). The dummy-node idiom is the universal painkiller — it converts "what if the operation changes the head?" into "the dummy never changes, return `dummy.next`". The fast/slow trick exploits the 2:1 speed ratio: when fast hits the end, slow is at the middle; when fast wraps in a cycle, slow and fast meet inside the cycle (Floyd's). The deeper insight is that linked-list problems compose: Reorder List = find middle (fast/slow) + reverse second half (in-place reversal) + weave (dummy-tail merge). Senior candidates decompose the problem into these primitives; junior candidates write a single 50-line function.

**Key terms**

- **Dummy node** — sentinel prepended to the list; head never changes, simplifies edge cases.
- **Fast/slow pointers** — fast moves 2 steps, slow moves 1; meet inside cycles, slow reaches middle when fast reaches end.
- **Floyd's cycle detection (tortoise and hare)** — two-phase: detect meeting, then find cycle start by resetting one pointer to head.
- **In-place reversal** — `prev = None; curr = head; while curr: nxt = curr.next; curr.next = prev; prev = curr; curr = nxt`.
- **K-group reversal** — reverse every K nodes; use dummy + group-by-group reversal with `group_prev` pointer.
- **Merge two sorted lists** — dummy + tail pointer; advance the smaller head, attach to tail.
- **Nth from end** — advance fast by N, then move both until fast hits end; slow is at Nth from end.
- **Middle of list** — fast/slow; when `fast` or `fast.next` is None, slow is at middle.
- **Random pointer** — for Copy List with Random Pointer; hash map old→new, two passes.
- **LRU Cache** — doubly linked list (for O(1) removal) + hash map (for O(1) lookup).

**Why interviewers ask this**

Three signals. (1) **Pointer arithmetic under pressure** — interviewers reach for linked lists because they test attention to detail without algorithmic complexity. A candidate who writes `curr.next = prev` *before* saving `curr.next` to `nxt` has a working code that produces a broken list; a senior candidate catches this in the moment. (2) **Decomposition skill** — Reorder List is the classic "decompose into three sub-problems" test. Junior candidates write one 50-line tangle; senior candidates call `find_middle`, `reverse`, `merge`. The interviewer is testing whether you reach for composition. (3) **Senior-tier LRU Cache** — this is the staff-level interview standard for "design a data structure". Doubly linked list for O(1) eviction-of-LRU, hash map for O(1) lookup; get this design right, articulate the invariants, and you signal staff-readiness.

**Common confusions**

- "I don't need a dummy node, I'll special-case the head" — every special case is a bug surface; the dummy eliminates them.
- "Floyd's only detects cycles" — phase 2 (reset slow to head, advance both by 1) finds the cycle start.
- "Reversing is O(N) space if I use recursion" — yes, recursion uses O(N) stack; iterative is O(1).
- "Middle of list is at `len/2`" — that needs a length count first; fast/slow does it in one pass.
- "Singly linked lists are enough for LRU" — they're not; eviction-of-LRU needs O(1) removal of an arbitrary node, which requires the `prev` pointer. Doubly linked.
- "Random pointer copy needs two passes" — yes, the canonical solution does: pass 1 build hash map old→new (with random=None), pass 2 fill in `next` and `random`.

**What follows from this topic**

Linked-list patterns are the foundation of LRU Cache, LFU Cache, and many "design X" problems. The fast/slow idiom recurs in array problems (Find the Duplicate Number with Floyd's). The merge-with-dummy-tail pattern extends to Merge K Sorted Lists (with a heap of head pointers). The reversal template is the building block for Reverse Nodes in K-Group, Reverse Linked List II (reverse between positions m and n), and Reorder List. If you can write Floyd's cycle detection with the meeting-point proof and implement LRU Cache from scratch with the doubly-linked-list + hash-map design, you've earned the pattern.

### Q1. Walk me through reversing a linked list iteratively.

```python
def reverse(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next       # save next BEFORE clobbering
        curr.next = prev       # reverse pointer
        prev = curr            # advance prev
        curr = nxt             # advance curr
    return prev                # prev is new head
```

Three pointers (`prev`, `curr`, `next`), one swap per iteration. O(N), O(1). The order matters: save `next` first, then redirect `curr.next`, then advance. Reversing the order corrupts the chain.

### Q2. Walk me through Floyd's cycle detection — both phases plus the math.

Phase 1: fast moves 2, slow moves 1. If fast (or fast.next) becomes None, no cycle. Else they meet inside the cycle.

Phase 2: reset slow to head; advance both by 1. They meet at the cycle start.

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            break
    else:
        return None
    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next
    return slow
```

The math: let `H` = distance head→cycle start, `D` = distance cycle start→meeting point, `L` = cycle length. At meeting, slow has moved `H + D`, fast has moved `H + D + kL` (k loops around). Fast is twice slow, so `2(H + D) = H + D + kL`, giving `H = kL - D`. Starting one pointer at head and advancing H steps lands at the cycle start; advancing the other H steps from the meeting point lands at the cycle start (it goes around the cycle `kL - D` steps). They meet there.

### Q3. Walk me through Reverse Nodes in K-Group.

The trick: dummy node + group-by-group reversal, with `group_prev` pointing to the node before the current group. Reverse the K nodes in place, then reattach the reversed group's head and tail.

```python
def reverse_k_group(head, k):
    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        # Find Kth node from group_prev
        kth = group_prev
        for _ in range(k):
            kth = kth.next
            if not kth: return dummy.next
        group_next = kth.next
        # Reverse [group_prev.next, kth]
        prev, curr = group_next, group_prev.next
        while curr != group_next:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        # Reattach
        tmp = group_prev.next  # this is now the tail of reversed group
        group_prev.next = kth   # kth was old tail, now new head
        group_prev = tmp
    return dummy.next
```

The dummy node is essential — the first group's reversal changes the head, and the dummy absorbs that change. O(N).

### Q4. Walk me through Reorder List — decompose into three primitives.

Reorder `L0 → L1 → ... → Ln` into `L0 → Ln → L1 → Ln-1 → ...`. Decompose:

1. **Find middle** with fast/slow.
2. **Reverse second half** in place.
3. **Weave** the two halves together with dummy-tail merge.

```python
def reorder_list(head):
    # 1. Find middle
    slow, fast = head, head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    # 2. Reverse second half (starting from slow.next)
    prev, curr = None, slow.next
    slow.next = None  # cut the list
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    # 3. Weave
    first, second = head, prev
    while second:
        f_next, s_next = first.next, second.next
        first.next = second
        second.next = f_next
        first, second = f_next, s_next
```

Three primitives, each ~5 lines. This decomposition is the senior signal — junior candidates write one tangled function.

### Q5. Walk me through Merge Two Sorted Lists.

Dummy node + tail pointer. At each step, attach the smaller head to the tail and advance.

```python
def merge_two_lists(a, b):
    dummy = ListNode()
    tail = dummy
    while a and b:
        if a.val <= b.val:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a or b  # attach remainder
    return dummy.next
```

The dummy is the painkiller — without it you'd special-case the very first comparison. O(N + M). For Merge K Sorted Lists, the same primitive is used K times naively (O(NK)) or with a heap of K head pointers (O(N log K)).

### Q6. Walk me through Copy List with Random Pointer.

Two passes with a hash map old→new.

```python
def copy_random_list(head):
    if not head: return None
    old_to_new = {}
    # Pass 1: clone nodes
    curr = head
    while curr:
        old_to_new[curr] = Node(curr.val)
        curr = curr.next
    # Pass 2: wire next + random
    curr = head
    while curr:
        old_to_new[curr].next = old_to_new.get(curr.next)
        old_to_new[curr].random = old_to_new.get(curr.random)
        curr = curr.next
    return old_to_new[head]
```

The O(1)-space variant interleaves clones into the original list, wires randoms via `curr.next` (which is the clone), then separates — slick but rarely worth the complexity in an interview. Hash-map version is cleaner.

### Q7. Senior interview angle: design LRU Cache.

Requirements: `get(key)` and `put(key, value)` in O(1). Eviction is LRU when capacity exceeded. Data structure: **doubly linked list** + **hash map**. The list orders nodes by recency (head = MRU, tail = LRU); the map gives O(1) lookup from key to node.

```python
class Node:
    __slots__ = ('key', 'val', 'prev', 'next')
    def __init__(self, key, val):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = {}
        # Sentinels: head ↔ tail
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node):
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.cache: return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self.cache[key] = node
        self._add_to_front(node)
        if len(self.cache) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
```

Sentinels (head and tail dummies) eliminate every special case. Doubly linked is required because eviction needs O(1) removal of an arbitrary node (need `prev` pointer). The hash map stores **node references**, not just values, so removal is O(1).

---

## Trees

### Summary

**What this topic covers**

The pattern family for problems where the input is a `TreeNode` (binary tree or BST). Four traversal modes plus an entire vocabulary of recursive idioms: (1) **preorder** (root → L → R) for serialise/clone/decide-before-children; (2) **inorder** (L → root → R) for BST sorted iteration; (3) **postorder** (L → R → root) for aggregate-from-children problems (height, diameter, deletions); (4) **level-order BFS** for level-by-level problems (right side view, minimum depth). Plus the two foundational idioms: the **"two values up the recursion"** pattern (return one value for "this subtree's contribution", maintain a nonlocal for "best anywhere") used in diameter, max path sum, longest univalue path; and the **BST bounds validation** pattern that uses passed-down lo/hi rather than just comparing to immediate children. The 7 questions cover the templates, BST construction from traversals, LCA (BST version vs general binary tree), iterative inorder with an explicit stack, and the senior-level Maximum Path Sum problem.

**Mental model**

Tree problems test whether you can think recursively about a structure with no inherent order. The mental shift is **postorder thinking**: instead of imagining a top-down pass, picture each node asking its children "what's your answer?" and combining them. Height = `1 + max(left_height, right_height)`; size = `1 + left_size + right_size`; sum = `val + left_sum + right_sum`; "is BST" = "left is BST and right is BST and root.val is in (left_max, right_min)". The recursion writes itself once you frame the subproblem as "what does each subtree contribute". The "two values up" pattern is the senior-level extension: `depth(node)` returns the height to the parent, but inside `depth` you also update a `nonlocal best` with `left + right` (the diameter through this node). The return value is what flows up; the nonlocal is what accumulates across the whole tree. The other senior pattern is BST validation with bounds: comparing `root.val` to `root.left.val` and `root.right.val` is **wrong** (a single mis-ordered descendant can pass); the correct version passes `(lo, hi)` down the recursion and tightens the bounds at each step. Get those two patterns right and you've covered 80% of tree interview problems.

**Key terms**

- **Preorder** — visit root, recurse left, recurse right. For serialisation, cloning, decide-before-children.
- **Inorder** — recurse left, visit root, recurse right. For BST gives sorted order.
- **Postorder** — recurse left, recurse right, visit root. For aggregate-from-children (height, size, deletions).
- **Level-order BFS** — queue-based, level by level. For "right side view", "average per level", "minimum depth".
- **Postorder aggregation** — return a subtree's contribution, combine at each parent.
- **"Two values up"** — return one value (subtree's contribution), update a nonlocal (best anywhere).
- **BST bounds validation** — pass `(lo, hi)` down; at each node check `lo < val < hi` and tighten for recursion.
- **LCA in BST** — walk down; if both in left → recurse left, both in right → recurse right, else current is LCA.
- **LCA in general tree** — postorder; node is LCA when subtrees return finding p and q separately.
- **Iterative inorder** — explicit stack simulates the call stack; push left chain, pop visit, push right.
- **Construction from traversals** — pre + in or post + in (with distinct values) uniquely reconstructs.
- **Tree DP** — postorder with multiple return values (e.g. "rob this node + can't rob children" vs "don't rob this node").

**Why interviewers ask this**

Three signals. (1) **Recursive fluency** — trees are the cleanest test for "can you think recursively?". Junior candidates write iterative loops with explicit stacks; senior candidates write a postorder function in 6 lines and articulate the subproblem. (2) **BST vs general tree distinction** — junior candidates conflate BSTs and binary trees; senior candidates know that BST gives free sorted iteration (inorder) and `O(log N)` ops on balanced BSTs, vs general binary trees which are just "anything goes". The interviewer reaches for "validate BST" specifically to test this. (3) **The "two values up" pattern** — Maximum Path Sum and Diameter are the canonical tests. A candidate who returns the diameter and also returns the height, mixing them in one variable, fails; a candidate who separates "what flows up" from "what accumulates" succeeds. This is the senior tell.

**Common confusions**

- "BST validation just compares to immediate children" — wrong; you need bounds propagated down. `root = [10, 5, 15, null, null, 6, 20]` passes the immediate check but isn't a BST.
- "Inorder traversal works for any binary tree" — it works mechanically; only on BST does it produce sorted output.
- "Diameter is height(left) + height(right) at the root" — only if the longest path passes through the root; in general it can be entirely in a subtree. Use the "two values up" pattern.
- "Iterative tree traversal needs a visited set" — no, the recursive call stack (or explicit stack) handles that.
- "LCA in BST and general tree are the same algorithm" — different. BST uses the value-ordering property; general tree uses postorder with subtree-found checks.
- "Constructing from preorder alone is enough" — no; you need inorder (or postorder) too. With distinct values, pre+in or post+in is unique.

**What follows from this topic**

Trees are the gateway to Graph Traversals (the same DFS/BFS, generalised to arbitrary edges with a visited set). The postorder aggregation pattern is the foundation of Tree DP (House Robber III, Binary Tree Cameras). The "two values up" pattern recurs in Longest Univalue Path, Diameter, Maximum Path Sum — recognise it and the variants write themselves. Serialise/Deserialise is the bridge to system design (designing the wire format for distributed trees). And the BST-specific tricks (iterative inorder for "Kth smallest", bounds validation) prepare you for self-balancing tree topics in the Less-Common section (AVL, Red-Black, B-Tree).

### Q1. Walk me through the postorder aggregation template using Diameter as the example.

```python
def diameter(root):
    best = 0
    def depth(node):
        nonlocal best
        if not node: return 0
        left = depth(node.left)
        right = depth(node.right)
        best = max(best, left + right)  # diameter through this node
        return 1 + max(left, right)     # height returned to parent
    depth(root)
    return best
```

Two distinct values: `depth(node)` returns the height of the subtree (what flows up to the parent's recursion), and `best` (nonlocal) accumulates the best diameter seen anywhere in the tree. The diameter through any given node is `left_depth + right_depth`; the best across the whole tree is the max of these. The trick is separating "what each node contributes to its parent" from "what we're optimising overall". O(N).

### Q2. Walk me through BST validation with bounds.

```python
def is_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root: return True
    if not (lo < root.val < hi): return False
    return (is_bst(root.left, lo, root.val) and
            is_bst(root.right, root.val, hi))
```

The bounds tighten at each step: when going left, `hi = root.val`; when going right, `lo = root.val`. Comparing only to immediate children is wrong because a deeper descendant can violate the BST property — e.g. root 10, left child 5, left child's right child 12 (passes local check, but 12 > 10 violates global BST). The bounds propagation catches this. O(N).

### Q3. Walk me through Level Order BFS.

```python
from collections import deque

def level_order(root):
    if not root: return []
    result = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):  # snapshot the level size
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result
```

The `for _ in range(len(q))` snapshot is what gives you level-by-level grouping — without it, you'd process all nodes together. Variants: for "right side view" emit the last node of each level; for "minimum depth" return the depth when you hit the first leaf; for "average per level" sum the level and divide. O(N).

### Q4. Walk me through Lowest Common Ancestor for BST vs general binary tree.

**BST LCA**: walk down from root. If both p and q are less than current → go left. Both greater → go right. Else (split, or current equals one of them) → current is LCA.

```python
def lca_bst(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val: root = root.left
        elif p.val > root.val and q.val > root.val: root = root.right
        else: return root
    return None
```

**General binary tree LCA**: postorder; node is LCA when both subtrees report finding one of (p, q).

```python
def lca(root, p, q):
    if not root or root == p or root == q: return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right: return root  # split, current is LCA
    return left or right
```

BST is O(log N) balanced (height), O(N) skewed; general tree is O(N). The interviewer often asks both to confirm you can distinguish.

### Q5. Walk me through iterative inorder traversal.

Simulate the recursion with an explicit stack: push the left chain, pop and visit, then move to the right subtree.

```python
def inorder_iterative(root):
    result = []
    stack = []
    curr = root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result
```

The structure: outer loop runs while there's anywhere to go. Inner while pushes the entire left chain. Pop and visit, then pivot to the right subtree (which will be processed by the next outer iteration). O(N) time, O(H) stack space (H = height).

### Q6. Walk me through constructing a tree from preorder + inorder.

Preorder gives root-first; inorder gives the root split between left and right subtree. Take the first preorder element as root; find its index in inorder; left subtree is everything inorder-left-of-root, right is everything inorder-right-of-root. Recurse.

```python
def build_tree(preorder, inorder):
    if not preorder or not inorder: return None
    root_val = preorder[0]
    root = TreeNode(root_val)
    idx = inorder.index(root_val)
    root.left = build_tree(preorder[1:1+idx], inorder[:idx])
    root.right = build_tree(preorder[1+idx:], inorder[idx+1:])
    return root
```

O(N²) naive; O(N) with a hash map from inorder value → index. Same shape for post + in (post gives root last instead of first).

### Q7. Senior interview angle: walk me through Maximum Path Sum.

A path can start and end at any node, must be connected, can go through any node at most once. Use "two values up" pattern: `max_gain(node)` returns the maximum path sum starting at `node` and going down through one child; `best` accumulates the best "path that turns at this node" (`node.val + max_gain(left) + max_gain(right)`).

```python
def max_path_sum(root):
    best = float('-inf')
    def max_gain(node):
        nonlocal best
        if not node: return 0
        left = max(max_gain(node.left), 0)   # ignore negative subtrees
        right = max(max_gain(node.right), 0)
        best = max(best, node.val + left + right)  # path turning here
        return node.val + max(left, right)         # path going up through one child
    max_gain(root)
    return best
```

The two senior tells: (1) clamp child contributions at 0 (negative subtrees are skipped, not included). (2) separate "path turning at this node" (the best globally) from "path going up through one child" (what flows to the parent). Mixing these in one variable is the canonical junior bug. O(N).

---

## Graph Traversals (BFS / DFS)

### Summary

**What this topic covers**

The pattern family for graph and grid problems where the answer is "reach / count / shortest unweighted". Two foundational algorithms: (1) **BFS** for shortest path in unweighted graphs, level-by-level traversal, "minimum steps"; (2) **DFS** for connectivity, cycle detection, "all paths", topological-sort prep. Three structural extensions: (1) **grid-as-graph** with the standard `DIRS = [(-1,0),(1,0),(0,-1),(0,1)]` directions array; (2) **multi-source BFS** for "rotting oranges" / "walls and gates" — seed the queue with all sources at distance 0; (3) **bidirectional BFS** for "shortest transformation sequence" (Word Ladder) — search from both ends, meet in the middle, O(b^(d/2)) vs O(b^d). The 7 questions cover the canonical templates, multi-source BFS, the three-colour DFS for cycle detection in directed graphs, the visited-set discipline (in-place marking vs explicit set), and the senior-level "why BFS over DFS for shortest path" question.

**Mental model**

BFS and DFS share the same skeleton — start node, frontier, mark visited, expand — and differ only in the frontier data structure (queue vs stack). The strategic choice between them is **what you're searching for**: BFS guarantees the first time you reach a target is the shortest path (in unweighted graphs), because BFS explores by distance; DFS doesn't make that guarantee but is the right pick for "is there any path" (yes/no), connectivity components, cycle detection. The grid-as-graph trick is to treat each cell as a node with up-to-4 neighbours given by the directions array — this collapses 2D problems into 1D graph thinking. Multi-source BFS is the BFS generalisation when there are multiple starting points: seed the queue with all of them at distance 0, and BFS gives you the distance from the *nearest* source to every cell, which is exactly the right answer for "minimum time to rot every orange" or "distance from each room to the nearest gate". Bidirectional BFS is the asymptotic optimisation for problems with a known target: search from both source and target simultaneously, meeting in the middle. The branching factor `b` and depth `d` give O(b^d) for unidirectional vs O(b^(d/2)) for bidirectional — exponential improvement when the graph is large.

**Key terms**

- **BFS** — queue-based, level-by-level; guarantees shortest in unweighted graphs.
- **DFS** — stack-based (or recursion); used for connectivity, cycles, "all paths".
- **Visited set** — tracks nodes already explored to avoid infinite loops.
- **In-place visited marking** — for grids, mutate the cell to a "visited" sentinel to save memory.
- **Grid directions array** — `[(-1,0),(1,0),(0,-1),(0,1)]` for 4-connected; add diagonals for 8-connected.
- **Multi-source BFS** — seed the queue with all sources at distance 0; result is distance from nearest source.
- **Three-colour DFS** — white (unvisited), grey (in current path), black (fully processed); grey edge = cycle in directed graph.
- **Bidirectional BFS** — search from source and target simultaneously; intersection of the two frontiers signals a meeting.
- **Cycle detection on undirected** — DFS with parent tracking; back edge to non-parent = cycle. Or Union Find.
- **Cycle detection on directed** — three-colour DFS, or Kahn's topo sort (incomplete order = cycle).
- **0-1 BFS** — when edges are 0 or 1 weight; use deque (push 0-edges to front, 1-edges to back).
- **Connected components** — DFS / BFS from each unvisited node; count or aggregate.

**Why interviewers ask this**

Three signals. (1) **BFS vs DFS choice with justification** — junior candidates pick one arbitrarily; senior candidates name "BFS because we need shortest" or "DFS because we just need connectivity". (2) **Grid-as-graph fluency** — Number of Islands is a foundational test for whether you can see a 2D grid as a graph and reach for the canonical template (DFS from each unvisited '1' cell, mark visited in place). (3) **Multi-source BFS as a senior tell** — Rotting Oranges and Walls and Gates require seeding the queue with all sources; junior candidates write N separate BFSes; senior candidates recognise the multi-source pattern and write one. Bidirectional BFS for Word Ladder is the staff-level optimisation.

**Common confusions**

- "DFS can find shortest path" — only by exploring everything (O(V × E) in unweighted). BFS gives it in O(V + E).
- "BFS is always better" — no; for cycle detection, "all paths", or pure connectivity, DFS is cleaner.
- "I don't need a visited set" — you do, unless you're on a DAG. Without it, you'll infinite-loop or do exponential work.
- "Multi-source BFS is multiple BFSes" — it's one BFS, seeded with all sources at distance 0. The single pass gives nearest-source distance to every node.
- "DFS on undirected graph cycle detection needs a colour" — no, just check "neighbour visited and neighbour != parent".
- "I should use recursion for DFS" — fine for trees and small graphs; for deep DFS on graphs (Python recursion limit ~1000), switch to iterative with explicit stack.

**What follows from this topic**

Graph traversals are the base layer for **Weighted Graph Algorithms** (Dijkstra is BFS + priority queue), **Topological Sort** (DFS post-order or Kahn's BFS), **Union Find** (an alternative for connectivity, especially dynamic), **A*** (Dijkstra + heuristic for pathfinding). The grid-as-graph trick recurs in many BFS/DFS problems including Pacific Atlantic Water Flow, Surrounded Regions, Number of Distinct Islands. And the three-colour DFS cycle detection is the foundation for course-schedule and topological-sort cycle handling. If you can recognise "shortest unweighted" → BFS, "connectivity" → DFS or Union Find, "multi-source distance" → multi-source BFS, you've covered the recognition layer.

### Q1. Walk me through BFS shortest path on a grid.

```python
from collections import deque

DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def shortest_path(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    q = deque([(start, 0)])
    visited = {start}
    while q:
        (r, c), d = q.popleft()
        if (r, c) == end:
            return d
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols
                and (nr, nc) not in visited
                and grid[nr][nc] != '#'):
                visited.add((nr, nc))
                q.append(((nr, nc), d + 1))
    return -1
```

Key invariant: mark visited *when enqueueing*, not when dequeueing. Otherwise you'll enqueue the same node multiple times, blowing up the queue. O(rows × cols).

### Q2. Walk me through Number of Islands (DFS with in-place visited marking).

```python
def num_islands(grid):
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])
    count = 0
    def dfs(r, c):
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # mark visited in place
        for dr, dc in DIRS:
            dfs(r + dr, c + dc)
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count
```

The in-place marking saves O(rows × cols) space at the cost of mutating the input — interview convention varies, mention both options. For deep grids (millions of cells), iterative BFS/DFS avoids Python's recursion-depth limit. O(rows × cols).

### Q3. Walk me through Multi-Source BFS with Rotting Oranges.

Seed the queue with *all* initially rotten oranges at distance 0; BFS gives each cell its distance to the nearest rotten orange.

```python
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                q.append((r, c, 0))  # (row, col, time)
            elif grid[r][c] == 1:
                fresh += 1
    max_time = 0
    while q:
        r, c, t = q.popleft()
        max_time = max(max_time, t)
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t + 1))
    return max_time if fresh == 0 else -1
```

Single BFS gives the answer in O(rows × cols). The alternative — BFS from each rotten orange separately — is O(rotten × rows × cols), strictly worse.

### Q4. Walk me through cycle detection in a directed graph (three-colour DFS).

White (unvisited), grey (in current DFS path), black (fully processed). A back-edge to a grey node is a cycle.

```python
WHITE, GREY, BLACK = 0, 1, 2

def has_cycle_directed(graph):
    color = {u: WHITE for u in graph}
    def dfs(u):
        color[u] = GREY
        for v in graph[u]:
            if color[v] == GREY: return True   # back edge → cycle
            if color[v] == WHITE and dfs(v): return True
        color[u] = BLACK
        return False
    for u in graph:
        if color[u] == WHITE and dfs(u):
            return True
    return False
```

For undirected graphs, the simpler "DFS with parent tracking, back-edge to non-parent = cycle" works (no need for three colours). The colour trick is specifically for directed graphs where you need to distinguish "in current path" from "already visited".

### Q5. Walk me through Word Ladder (BFS) and the bidirectional optimisation.

Unidirectional BFS: queue of `(word, length)`; for each word, try changing each character to each of 26 letters, check if the result is in the word list, enqueue.

Bidirectional BFS: maintain two frontiers (from begin and end); always expand the smaller; when expanding, check if you hit a word in the other frontier (success).

```python
def ladder_length(begin, end, word_list):
    word_set = set(word_list)
    if end not in word_set: return 0
    front, back = {begin}, {end}
    length = 1
    while front and back:
        if len(front) > len(back):
            front, back = back, front
        next_front = set()
        for w in front:
            for i in range(len(w)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    nw = w[:i] + c + w[i+1:]
                    if nw in back: return length + 1
                    if nw in word_set:
                        next_front.add(nw)
                        word_set.remove(nw)
        front = next_front
        length += 1
    return 0
```

The asymptotic win: unidirectional is O(b^d), bidirectional is O(b^(d/2)) where `b` is branching factor (26 × len(word)). For Word Ladder, this is a meaningful speedup on hard cases.

### Q6. What's the trap with in-place visited marking?

Two traps: (1) **callers may not expect mutation** — if the grid is passed by reference and the caller reuses it, you've corrupted their data. Document this or restore after. (2) **the sentinel value must be unambiguous** — if you mark visited as '0' on a grid where '0' was meaningful (water), you've conflated "originally water" with "visited land". For ambiguous cases, use an explicit `visited` set or a separate sentinel value (e.g. `'#'`).

### Q7. Senior interview angle: why BFS over DFS for shortest path?

BFS explores by **distance** — at any point during BFS, all nodes in the queue are at distance ≤ k+1, where k is the current popped distance. The first time you reach the target is therefore the shortest path. DFS explores by **path** — it might find any path quickly but doesn't guarantee shortest unless it exhausts all paths (O(V × paths) instead of O(V + E)). The deeper point: BFS is the foundation of Dijkstra (which generalises BFS to weighted graphs with a priority queue), and 0-1 BFS (which uses a deque to handle 0-or-1 weighted edges in O(V+E)). The senior tell is naming these connections — "BFS, Dijkstra, and A* are the same algorithm with different frontier data structures (queue, min-heap, min-heap-with-heuristic)".

---

## Weighted Graph Algorithms

### Summary

**What this topic covers**

The pattern family for graph problems with edge weights: shortest path, minimum spanning tree, and detection of negative cycles. Four algorithms with distinct sweet spots: (1) **Dijkstra** — single-source shortest path, non-negative weights, O((V+E) log V) with a binary heap; the default; (2) **Bellman-Ford** — single-source, handles negative weights, detects negative cycles, O(V·E); (3) **Floyd-Warshall** — all-pairs shortest paths, V ≤ 400, O(V³); handles negative weights but not negative cycles; (4) **A*** — single-pair with an admissible heuristic; Dijkstra with a "distance to target" estimate added to the priority. Plus two MST algorithms: **Kruskal** (sort edges, add smallest if no cycle, uses Union Find) and **Prim** (grow from a vertex, heap-based, like Dijkstra). The 8 questions cover the templates, the "stale entry" trick in Python's heapq Dijkstra, the K-stops constraint variant, the MST algorithm comparison, and the senior-level recognition signals.

**Mental model**

Weighted graphs add one degree of freedom to BFS/DFS: edges have costs, so "shortest" means "minimum total weight" rather than "fewest hops". Dijkstra is the generalisation of BFS: instead of a FIFO queue, use a priority queue keyed by accumulated distance; pop the closest unvisited node, relax its edges. The correctness depends on **non-negative weights** — once you pop a node, its distance is finalised (no later path can be shorter because all later edges only add positive weight). Bellman-Ford drops the non-negative assumption at the cost of O(V·E) — it iterates V-1 times, relaxing every edge each pass, which is enough to find the shortest path to every node (longest possible shortest-path has V-1 edges). One extra pass detects negative cycles (if anything still updates, a negative cycle exists). Floyd-Warshall is the all-pairs version, using dynamic programming over intermediate vertices: `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` for each intermediate k. The triple loop gives O(V³), only viable for V ≤ 400. For MST, the analogy is "grow a tree using cheapest edges without forming cycles" — Kruskal sorts edges globally and uses Union Find for cycle check; Prim grows incrementally from a starting vertex using a min-heap of cut-crossing edges. Both give the same MST; pick by graph density (Kruskal for sparse, Prim for dense).

**Key terms**

- **Dijkstra** — single-source shortest path with non-negative weights; O((V+E) log V) with binary heap.
- **Bellman-Ford** — handles negative weights, detects negative cycles; O(V·E).
- **Floyd-Warshall** — all-pairs shortest paths via DP; O(V³).
- **A*** — Dijkstra + heuristic; faster for single-pair on grids with a good admissible heuristic (e.g. Manhattan distance).
- **0-1 BFS** — for graphs with only 0-or-1 edge weights; deque-based, O(V+E).
- **MST (Minimum Spanning Tree)** — subset of edges connecting all V vertices with minimum total weight (V-1 edges, no cycle).
- **Kruskal** — sort edges, add smallest if no cycle (Union Find); O(E log E).
- **Prim** — grow MST from a vertex using min-heap; O((V+E) log V).
- **Edge relaxation** — `if dist[u] + w < dist[v]: dist[v] = dist[u] + w`; the universal shortest-path update.
- **Stale heap entry** — Python's heapq has no decrease-key; push a new entry and lazy-discard old ones via `if d > dist[u]: continue`.
- **Negative cycle** — a cycle with negative total weight; makes "shortest path" undefined (can loop forever).
- **K-stops constraint** — modified Dijkstra on `(node, hops_used)` state, or Bellman-Ford with K iterations.

**Why interviewers ask this**

Three signals. (1) **Algorithm choice with justification** — junior candidates pick "Dijkstra" reflexively; senior candidates ask "are weights non-negative?", "do we need all-pairs or single-source?", "is there a K-stops constraint?", and pick the right algorithm. (2) **Python heapq idiom** — the "stale entry" trick is the specific gotcha for Python implementations of Dijkstra (no native decrease-key). Knowing to write `if d > dist[u]: continue` after the pop is the senior tell. (3) **K-stops as a generalisation test** — Cheapest Flights Within K Stops is the canonical hard problem because pure Dijkstra doesn't work (greedy commits to shortest distance, but with the K-edge constraint a longer path might be reachable in fewer hops). The fix — Bellman-Ford with K iterations, or Dijkstra on `(node, edges_used)` state — is the senior tell.

**Common confusions**

- "Dijkstra works with negative weights" — no, it requires non-negative. Negative weights break the "once popped, distance is final" invariant.
- "Bellman-Ford is always slower" — yes, O(V·E) vs O((V+E) log V), but it's the only option with negative weights or for negative-cycle detection.
- "Floyd-Warshall is for sparse graphs" — opposite; it's O(V³) regardless of edge count, so it's competitive only when V is small (≤ 400) and you need all-pairs.
- "Prim and Kruskal give different MSTs" — they give the same total weight; the specific tree may differ when there are ties.
- "A* is always faster than Dijkstra" — only with a good admissible heuristic; with a useless heuristic (always 0), A* degenerates to Dijkstra.
- "K-stops Dijkstra works without state augmentation" — no; you need `(node, hops_used)` as the state, otherwise greedy commits prevent finding the right answer.

**What follows from this topic**

Weighted graphs are the gateway to **A*** (grid pathfinding in games), **network flow** (max-flow / min-cut), and many optimisation problems that reduce to shortest path. The MST algorithms feed into network design (cheapest way to connect N points), the Kruskal version directly uses **Union Find**. Bellman-Ford is the foundation of **arbitrage detection** (cycle with negative log-weights = arbitrage opportunity). Floyd-Warshall, despite its O(V³) cost, is the right answer for small dense graphs and pairs naturally with **transitive closure** queries. If you can name Dijkstra vs Bellman-Ford vs Floyd-Warshall by signal in 10 seconds and write the heap-based Dijkstra with stale-entry handling, you've earned the pattern.

### Q1. Walk me through Dijkstra with Python heapq.

```python
import heapq

def dijkstra(graph, source):
    """graph[u] = list of (v, weight). Returns dist dict."""
    dist = {u: float('inf') for u in graph}
    dist[source] = 0
    pq = [(0, source)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:  # stale entry, skip
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist
```

The `if d > dist[u]: continue` is critical — Python's heapq has no decrease-key, so we push a new entry every time the distance improves and lazy-discard stale ones on pop. O((V + E) log V).

### Q2. Walk me through Bellman-Ford and negative cycle detection.

```python
def bellman_ford(edges, n, source):
    dist = [float('inf')] * n
    dist[source] = 0
    for _ in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        if not updated: break  # early exit
    # One more pass — any update means negative cycle
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            return dist, True
    return dist, False
```

V-1 iterations of relaxing every edge are sufficient because the longest possible shortest path has V-1 edges. One extra pass detects negative cycles. O(V·E).

### Q3. Walk me through Floyd-Warshall.

```python
def floyd_warshall(n, edges):
    dist = [[float('inf')] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = w
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist
```

The triple loop with k as the outer is the key — `dist[i][j]` at the end of iteration k is the shortest path using only intermediate vertices in {0, 1, ..., k}. O(V³) — only practical for V ≤ 400.

### Q4. Walk me through Cheapest Flights Within K Stops — why pure Dijkstra fails.

Pure Dijkstra greedily finalises a node's distance when popped — but with the K-stops constraint, a node that's reached via a long path early might be reachable via a shorter path with fewer stops later, which Dijkstra would have rejected. Fix 1: **Bellman-Ford with K+1 iterations** (each iteration relaxes one more edge of the path).

```python
def find_cheapest_price(n, flights, src, dst, k):
    cost = [float('inf')] * n
    cost[src] = 0
    for _ in range(k + 1):
        new_cost = cost[:]
        for u, v, w in flights:
            if cost[u] + w < new_cost[v]:
                new_cost[v] = cost[u] + w
        cost = new_cost
    return cost[dst] if cost[dst] != float('inf') else -1
```

The `new_cost = cost[:]` snapshot ensures each iteration represents "one more flight" rather than chained relaxations within a single pass. Fix 2: Dijkstra on `(cost, node, hops_used)` state, where hops_used ≤ K+1. Both are O(K × E) or O(K × E log V).

### Q5. Walk me through Kruskal for MST.

```python
def kruskal(n, edges):
    edges.sort(key=lambda e: e[2])  # sort by weight
    uf = UnionFind(n)
    mst_weight = 0
    for u, v, w in edges:
        if uf.union(u, v):
            mst_weight += w
    return mst_weight
```

Sort edges globally; for each edge in increasing weight, add it to the MST if it doesn't form a cycle (Union Find tells you this in nearly O(1) amortised). O(E log E) — dominated by the sort. Best for sparse graphs.

### Q6. Walk me through Prim for MST.

```python
import heapq

def prim(graph, n):
    visited = {0}
    pq = [(w, 0, v) for v, w in graph[0]]
    heapq.heapify(pq)
    mst_weight = 0
    while pq and len(visited) < n:
        w, u, v = heapq.heappop(pq)
        if v in visited: continue
        visited.add(v)
        mst_weight += w
        for nv, nw in graph[v]:
            if nv not in visited:
                heapq.heappush(pq, (nw, v, nv))
    return mst_weight
```

Grow the MST from vertex 0; always add the cheapest edge crossing the cut (from visited to unvisited). O((V+E) log V). Best for dense graphs because it doesn't sort all edges upfront.

### Q7. What's the trap with using Dijkstra on grids with weighted cells?

The cell weight (cost of *entering* a cell) is conceptually an edge weight, but it's tied to the destination, not the edge. The fix: when relaxing the edge from `u` to `v`, the cost added is `grid[v]`, not a per-edge weight. Otherwise the rest of Dijkstra is unchanged. For "swim in rising water" the answer is the **max** cell height along the path (not sum), so the comparison becomes `max(d, grid[v]) < dist[v]` — minimax shortest path, still solvable by Dijkstra with this twist.

### Q8. Senior interview angle: how do you detect arbitrage in a currency exchange graph?

Build a graph where vertices are currencies and edges are exchange rates. To detect arbitrage (a cycle whose product of rates > 1), take the **negative log** of each rate as the edge weight; a cycle of original-product > 1 becomes a cycle of log-sum < 0. Run Bellman-Ford to detect a negative cycle. O(V·E). This is a canonical staff-level interview problem because it requires (1) recognising the graph reduction, (2) the log transform, (3) knowing Bellman-Ford is the only standard algorithm that detects negative cycles. State each step out loud.

---

## Heap / Priority Queue

### Summary

**What this topic covers**

The pattern family for "Kth largest / smallest", "top K", "median of stream", "merge K sorted", and "scheduling N tasks" problems. Four sub-patterns: (1) **heap of size K for top K** — keep a min-heap (for top-K-largest) of K elements, pop when over; O(N log K) instead of O(N log N) full sort; (2) **two heaps for median of stream** — max-heap for lower half, min-heap for upper half, kept balanced; (3) **heap as multi-way merge** — push first element of each sorted list, pop smallest, push next from that list; classic for Merge K Sorted Lists; (4) **heap for greedy scheduling** — Task Scheduler, Meeting Rooms II, Reorganize String. The 6 questions cover the templates, the Python heapq-is-min-only gotcha, the heap-vs-quickselect-vs-bucket-sort tradeoff for top K, and the senior-level "when does quickselect win" follow-up.

**Mental model**

A heap (binary heap) is a partially ordered tree that gives you O(1) access to the min (or max) and O(log N) insert/remove. It's the universal "best so far" data structure when you need streaming or incremental access to extrema. The four sub-patterns all derive from this primitive: "top K largest" uses a min-heap of size K because you want to evict the smallest of your K candidates when a new larger one arrives; "two heaps for median" uses one of each because the median sits at the boundary; "merge K sorted" uses a heap of head pointers because the next-smallest across all lists is the next-smallest in the heap; "greedy scheduling" uses a heap because you always want to pick the highest-count / earliest-ending / best candidate to process next. The mental shift is **streaming vs static**: heap is the right answer when items arrive over time, when N is unbounded, or when you need only the top K and don't want to pay O(N log N) for a full sort. For static arrays where you only need the Kth element once, **quickselect** is the asymptotic winner at O(N) average; for bounded value ranges, **bucket sort** wins at O(N + range). Senior candidates name all three and pick by signal.

**Key terms**

- **Min-heap / max-heap** — priority queue with O(1) access to the min / max.
- **Python heapq** — min-heap only; negate values or push tuples for max-heap behaviour.
- **Top K with min-heap** — counterintuitive but correct: keep a min-heap of size K so you can evict the smallest when a larger one arrives.
- **Top K with max-heap** — push all, pop K times; O(N + K log N), beats min-heap when K is close to N.
- **Two heaps for median** — max-heap (lower half) + min-heap (upper half), balanced sizes.
- **Heap multi-way merge** — for K sorted lists, push K heads, pop smallest, push that list's next.
- **Lazy deletion** — for heap with stale entries, push new values and skip stale ones on pop.
- **Quickselect** — partition-based, O(N) average, O(N²) worst case; beats heap for Kth element on static arrays.
- **Bucket sort** — O(N + range); beats both when values are bounded integers in [0, M].
- **Heapify** — `heapq.heapify(list)`; O(N) to convert a list to a heap in place.
- **Stable heap** — Python's heapq isn't stable; for tie-breaking, push tuples `(priority, counter, value)`.

**Why interviewers ask this**

Three signals. (1) **Top K pattern recognition** — the keyword "top K" or "Kth largest" should trigger heap-of-size-K reflex. Junior candidates sort the whole array (O(N log N)); senior candidates name O(N log K) and articulate why. (2) **Heap algorithm choice** — for "Kth largest", senior candidates name three options (heap, quickselect, bucket sort) and pick by N, K, and value range. (3) **Python heapq idioms** — knowing it's min-only, knowing to negate for max-heap, knowing `heapq.nlargest(k, iterable, key=...)` is the cleanest one-liner for top K. The two-heap median problem is the staff-level test because it requires careful balance management (size difference ≤ 1, the bigger heap holds the median).

**Common confusions**

- "Top K uses a max-heap" — counterintuitive but no; min-heap of size K is the right call so you can evict the smallest when a new larger value arrives.
- "Python has a max-heap" — no; `heapq` is min-only. Negate values or use `heapq._heapify_max` (private API).
- "Heapify is O(N log N)" — it's O(N) using the sift-down build trick.
- "Quickselect is always faster than heap" — average O(N) beats O(N log K), but worst case is O(N²). On adversarial inputs, heap wins.
- "Two heaps for median needs equal sizes" — sizes differ by at most 1; the bigger heap holds the median (or one of the two medians).
- "Heap supports decrease-key" — most language libraries (Python heapq, Java PriorityQueue) don't; use lazy deletion or `IndexHeap` from algorithms textbooks.

**What follows from this topic**

Heaps are the foundation of **Dijkstra** (min-heap of `(distance, node)`), **Prim's MST** (min-heap of edges), **A*** (min-heap of `(f-score, node)`), and **event-based simulation** (next event by time). The two-heap pattern recurs in Sliding Window Median (with lazy deletion for window eviction). And the heap-vs-quickselect-vs-bucket-sort comparison is a recurring senior interview pattern (Top K Frequent Words tests it too). If you can write the heap-of-size-K template from memory and name when quickselect wins, you've earned the pattern.

### Q1. Walk me through Top K Frequent Elements.

```python
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    freq = Counter(nums)
    return heapq.nlargest(k, freq, key=freq.get)
```

`heapq.nlargest` does the right thing in O(N log K). The manual version maintains a min-heap of size K:

```python
def top_k_frequent_manual(nums, k):
    freq = Counter(nums)
    heap = []  # min-heap of (count, value)
    for val, count in freq.items():
        heapq.heappush(heap, (count, val))
        if len(heap) > k:
            heapq.heappop(heap)
    return [val for count, val in heap]
```

Result order is unspecified (heap is partially ordered). If you need sorted, sort the K elements at the end (O(K log K), negligible).

### Q2. Walk me through Two Heaps for Median of Stream.

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []  # max-heap (negate values)
        self.hi = []  # min-heap

    def addNum(self, num):
        heapq.heappush(self.lo, -num)
        # Move largest of lo to hi
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        # Balance: hi at most as large as lo
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def findMedian(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2
```

The trick: always push to `lo`, then balance by moving the max of `lo` to `hi`, then rebalance if `hi` ended up bigger. The invariant is `len(lo) >= len(hi)` and `len(lo) - len(hi) <= 1`. The median is `-lo[0]` if odd total, else average of `-lo[0]` and `hi[0]`. Each addNum is O(log N), findMedian is O(1).

### Q3. Walk me through Merge K Sorted Lists.

```python
import heapq

def merge_k_lists(lists):
    heap = []
    for i, head in enumerate(lists):
        if head:
            heapq.heappush(heap, (head.val, i, head))  # i breaks ties
    dummy = ListNode()
    tail = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

Heap of head pointers, pop smallest, advance that list, push next. The `i` (list index) is a tie-breaker because raw nodes aren't comparable. O(N log K) where N = total elements.

### Q4. Walk me through Task Scheduler.

Given task types and a cooldown `n`, schedule all tasks minimising total time. Greedy: always pick the most-frequent remaining task that's off cooldown.

```python
import heapq
from collections import Counter, deque

def least_interval(tasks, n):
    freq = Counter(tasks)
    heap = [-f for f in freq.values()]
    heapq.heapify(heap)
    time = 0
    cooldown = deque()  # (available_time, count)
    while heap or cooldown:
        time += 1
        if heap:
            count = heapq.heappop(heap) + 1  # one less of this task
            if count < 0:
                cooldown.append((time + n, count))
        if cooldown and cooldown[0][0] == time:
            heapq.heappush(heap, cooldown.popleft()[1])
    return time
```

The max-heap (negated) gives the most-frequent task; the cooldown deque holds tasks waiting to re-enter the heap. Greedy works because picking the most-frequent task first leaves the schedule maximally flexible.

### Q5. Walk me through Meeting Rooms II.

Minimum rooms = maximum concurrent meetings. Sort by start time; min-heap of end times of in-progress meetings. For each new meeting, if the earliest end is ≤ this start, free that room (pop); always push this meeting's end.

```python
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    heap = []  # min-heap of end times
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
```

The heap size at any moment = currently-active meetings; final size = maximum concurrent = rooms needed. O(N log N). Alternative: sweep line with separated start/end events (push (start, +1), (end, -1), sort, sweep, take max running sum).

### Q6. Senior interview angle: top K — heap vs quickselect vs bucket sort, when does each win?

**Heap of size K**: O(N log K). Wins when streaming, when K << N, when you can't mutate the input.

**Quickselect**: O(N) average, O(N²) worst. Wins for static arrays where you only need the Kth element once; modifies the input. Good in C++/Java with `nth_element`; in Python, often slower in practice due to interpreter overhead.

**Bucket sort**: O(N + M) where M is the value range. Wins when values are bounded integers and M = O(N) — e.g. "Top K Frequent Elements" where counts are bounded by N.

The senior answer: "for top K frequent elements where counts are in [1, N], bucket sort is O(N) and beats both. For Kth largest of unbounded integers, quickselect O(N) average beats heap O(N log K) for large N. For streaming data, heap is the only option because the others require all data upfront."

---

## Topological Sort

### Summary

**What this topic covers**

The pattern for "directed graph + dependencies / prerequisites / build order" problems. Two algorithms, both O(V + E): (1) **Kahn's algorithm (BFS)** — track in-degrees, start with zero-in-degree nodes, repeatedly remove; detects cycles naturally (if output has fewer than V nodes, a cycle exists); (2) **DFS with post-order** — DFS each node, append to result on completion, reverse at end. The 6 questions cover the templates, cycle detection (the canonical reason topological sort matters in interviews), Alien Dictionary as the "build the graph first" twist, Parallel Courses (layered Kahn for semester counting), and the senior-level Three Cycle Detection Approaches (Kahn's, three-colour DFS, Union Find for undirected).

**Mental model**

Topological sort is the answer to "given dependencies, in what order can I do these?". A topological ordering exists if and only if the graph is a DAG (directed acyclic graph). Kahn's algorithm makes this explicit: start with all nodes that have zero in-degree (no prerequisites), repeatedly "complete" one (decrement neighbours' in-degrees, enqueue any that hit zero). If you can complete all V nodes, you have a valid order; if you get stuck (some nodes still have in-degree > 0), a cycle exists. DFS post-order is the dual: DFS each node, the *last* node finished in DFS is the "root" of its dependency tree, so post-order reversal gives the topo sort. Both have the same complexity; Kahn's is preferable for cycle detection (the "incomplete order" check is natural) and for layered processing (you can group nodes by "completion round" to compute semester counts). DFS is preferable when you also need to compute "earliest finish" or detect cycles via three-colour marking. The deeper insight is that **most "build order" / "course schedule" / "dependency resolution" problems are topological sort in disguise** — recognising the directed-graph framing is the recognition step; the algorithm is mechanical.

**Key terms**

- **Topological sort** — linear ordering of a DAG's vertices such that every edge `u → v` has `u` before `v`.
- **In-degree** — number of incoming edges to a node.
- **Kahn's algorithm** — BFS-based; start with zero-in-degree, repeatedly remove.
- **DFS post-order** — recursive DFS; append node on completion; reverse at end.
- **Cycle detection (directed)** — Kahn's "incomplete order = cycle", or three-colour DFS (grey edge = back edge = cycle).
- **DAG** — directed acyclic graph; the precondition for topological sort.
- **Layered Kahn** — process all zero-in-degree nodes in a "batch", then the next layer, etc.; used for Parallel Courses / Minimum Semesters.
- **Build graph from constraints** — for Alien Dictionary: derive ordering edges from adjacent word comparisons.
- **Lexicographically smallest topo order** — replace queue with min-heap in Kahn's.
- **Multiple valid orders** — most problems have many; just pick any.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on "prerequisites" / "build order"** — Course Schedule I/II is a foundational test. A senior candidate recognises topo sort from the keyword "prerequisites" in 10 seconds. (2) **Cycle detection awareness** — knowing that Kahn's detects cycles by "did we process all V nodes?" is the senior tell. Junior candidates write a separate cycle-detection pass. (3) **Graph-building from constraints** — Alien Dictionary requires deriving the graph from adjacent word comparisons, which tests whether you can build the dependency graph from indirect data. The Parallel Courses variant tests layered processing (semester counting). All these escalations distinguish "knows topo sort" from "can apply topo sort to a derived graph".

**Common confusions**

- "Topo sort needs a unique order" — no; most graphs have many valid orders. Either is correct; pick the lexicographically smallest if asked.
- "I need a separate cycle check after topo sort" — Kahn's gives it for free: if the output has fewer than V nodes, there's a cycle.
- "Topo sort works on undirected graphs" — no; it requires directed edges to define the "before / after" relationship.
- "DFS post-order is the same as the reverse of preorder" — different; post-order appends *after* recursing on children, which captures completion-order rather than discovery-order.
- "Parallel Courses needs separate algorithm" — it's layered Kahn: process zero-in-degree nodes in a batch (one semester), then the next batch.
- "Topo sort is O(V log V) like a sort" — it's O(V + E); Kahn's queue and DFS don't need sorting.

**What follows from this topic**

Topological sort is the foundation of **task scheduling** systems (Airflow, Dagster, build systems like Make and Bazel), of **module resolution** in package managers, and of **incremental compilation** strategies. It pairs naturally with **DP on DAGs** (longest path in a DAG = layered Kahn + running max), with **cycle detection** (three approaches: Kahn's, three-colour DFS, Union Find for undirected). The "build the graph from constraints" pattern recurs in Alien Dictionary, Sequence Reconstruction, and other "derive the dependency from data" problems. If you can recognise topo sort from the prompt and write Kahn's from memory with cycle detection inline, you've earned the pattern.

### Q1. Walk me through Kahn's algorithm.

```python
from collections import deque, defaultdict

def topo_sort(num_nodes, edges):
    graph = defaultdict(list)
    indegree = [0] * num_nodes
    for u, v in edges:  # u → v
        graph[u].append(v)
        indegree[v] += 1
    q = deque(i for i in range(num_nodes) if indegree[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return order if len(order) == num_nodes else []  # [] = cycle
```

Build graph + in-degree array; seed queue with zero-in-degree nodes; pop, add to order, decrement neighbours' in-degrees, enqueue any that hit zero. The `len(order) == num_nodes` check at the end is the cycle detection — if some nodes never had their in-degree hit zero, a cycle exists. O(V + E).

### Q2. Walk me through DFS post-order topological sort.

```python
def topo_sort_dfs(num_nodes, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
    WHITE, GREY, BLACK = 0, 1, 2
    color = [WHITE] * num_nodes
    order = []
    has_cycle = [False]
    def dfs(u):
        color[u] = GREY
        for v in graph[u]:
            if color[v] == GREY:
                has_cycle[0] = True
                return
            if color[v] == WHITE:
                dfs(v)
        color[u] = BLACK
        order.append(u)
    for u in range(num_nodes):
        if color[u] == WHITE:
            dfs(u)
    return order[::-1] if not has_cycle[0] else []
```

DFS each node; append to order *on completion* (after recursing on children). Reverse at the end. The three-colour marking detects cycles (grey-to-grey edge = back edge = cycle). O(V + E).

### Q3. Walk me through Course Schedule II.

This is just Kahn's with the order as the output:

```python
def find_order(num_courses, prerequisites):
    graph = defaultdict(list)
    indegree = [0] * num_courses
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1
    q = deque(i for i in range(num_courses) if indegree[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return order if len(order) == num_courses else []
```

Note the edge direction: `[course, prereq]` means "to take `course`, you need `prereq`", so the edge is `prereq → course`. Get the direction right and the rest is mechanical.

### Q4. Walk me through Alien Dictionary.

You're given a sorted list of words in an alien alphabet; derive the alphabet's character ordering. Build edges from adjacent word pairs: the first differing character gives `c1 → c2`.

```python
def alien_order(words):
    graph = defaultdict(set)
    indegree = {c: 0 for w in words for c in w}
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        if len(w1) > len(w2) and w1.startswith(w2):
            return ""  # invalid: prefix can't come after
        for c1, c2 in zip(w1, w2):
            if c1 != c2:
                if c2 not in graph[c1]:
                    graph[c1].add(c2)
                    indegree[c2] += 1
                break
    q = deque(c for c in indegree if indegree[c] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return ''.join(order) if len(order) == len(indegree) else ""
```

Two traps: (1) only the *first* differing character gives an edge (the rest don't); (2) the prefix-conflict edge case (`abc` before `ab` is invalid). The rest is Kahn's. O(C + total characters).

### Q5. Walk me through Parallel Courses (layered Kahn).

Find the minimum number of semesters to take all courses, where you can take any number of courses per semester as long as their prerequisites are done.

```python
def min_semesters(n, relations):
    graph = defaultdict(list)
    indegree = [0] * (n + 1)
    for u, v in relations:
        graph[u].append(v)
        indegree[v] += 1
    q = deque(i for i in range(1, n + 1) if indegree[i] == 0)
    semesters = 0
    taken = 0
    while q:
        semesters += 1
        for _ in range(len(q)):  # process one layer
            u = q.popleft()
            taken += 1
            for v in graph[u]:
                indegree[v] -= 1
                if indegree[v] == 0:
                    q.append(v)
    return semesters if taken == n else -1
```

The `for _ in range(len(q))` is the layer snapshot — same trick as level-order BFS on a tree. Number of semesters = longest chain length = depth of the layered structure. O(V + E).

### Q6. Senior interview angle: three approaches to detect cycles in directed graphs — when do you pick each?

**Kahn's (incomplete order)**: O(V + E). The natural by-product of topo sort; if you already need topo sort, this is free. Pick this when you also need the ordering.

**DFS three-colour**: O(V + E). Explicit cycle detection without needing the topo order. Pick when you only need yes/no on cycles or need to find the cycle itself.

**Union Find (undirected only)**: O(V · α(V)). For undirected graphs, adding an edge between two nodes already in the same component = cycle. Pick when you're processing edges incrementally (dynamic connectivity).

The senior tell: "Union Find doesn't work on directed graphs because direction matters for cycles — `a → b → a` is a cycle but `a → b, b → a` and `a → b, a → b` are different. Kahn's and three-colour DFS are the directed-graph options."

---

## Union Find

### Summary

**What this topic covers**

The pattern for "connected components / groups / dynamic connectivity" problems. The data structure (Disjoint Set Union, DSU) supports two operations in nearly O(1) amortised: **find** (which component does this node belong to?) and **union** (merge two components). With both **path compression** (find flattens the tree) and **union by rank** (attach shorter tree under taller), the amortised complexity is O(α(N)) where α is the inverse Ackermann function — essentially constant for any realistic N. The 6 questions cover the canonical template with both optimisations, the choice between Union Find and DFS/BFS for connectivity, the dynamic-connectivity sweet spot, MST via Kruskal as a Union Find application, and the senior-level proof gesture for path compression's amortised analysis.

**Mental model**

Union Find shines when you have **incremental connectivity** — edges are added one at a time, and you need to answer "are A and B connected?" or "how many components?" after each addition. The naive DFS/BFS rerun is O(V + E) per query; Union Find is O(α(V)) per query, which for V = 10⁹ is < 5. The data structure is a forest of trees where each node points at its parent; the root is the component representative. `find(x)` walks up to the root; `union(x, y)` makes one root the parent of the other. Path compression flattens the tree during find (every node on the path now points directly at the root); union by rank keeps the tree shallow (attach the shorter tree under the taller). The strategic question is "when is Union Find better than DFS/BFS?" — three cases: (1) **dynamic edges** — edges arrive incrementally, you can't afford to re-run DFS after each; (2) **MST (Kruskal)** — sort edges, add if they don't form a cycle, where "cycle" = "endpoints already in same component"; (3) **offline batched queries** — process all unions first, then answer all connectivity queries. The mental shift from DFS/BFS is that Union Find is **incremental and amortised** rather than batch and worst-case.

**Key terms**

- **DSU (Disjoint Set Union)** — alternative name for Union Find.
- **find(x)** — returns the component representative (root) for x.
- **union(x, y)** — merges the components containing x and y.
- **Path compression** — during find, redirect every node on the path to point directly at the root.
- **Union by rank** — attach the shorter tree's root under the taller's; keeps trees shallow.
- **Union by size** — attach the smaller tree under the larger; equivalent in practice to union by rank.
- **Component count** — track in the DSU itself; decrement on each successful union.
- **Amortised O(α(N))** — inverse Ackermann function; effectively constant for all realistic N.
- **Dynamic connectivity** — edges added (or queried) one at a time; the sweet spot for Union Find.
- **Kruskal's MST** — sort edges by weight, add if not forming a cycle (Union Find check).
- **Offline algorithms** — process all updates first, then queries; Union Find is the typical engine.
- **Weighted Union Find** — variant where each edge has a value; used for Satisfiability of Equality Equations with ratios.

**Why interviewers ask this**

Three signals. (1) **Recognition of "dynamic" / "incremental" connectivity** — junior candidates reach for DFS even when edges are arriving over time; senior candidates recognise the Union Find signal. (2) **Path compression + union by rank as a two-step optimisation** — junior candidates implement naive Union Find (O(N) per op); senior candidates know both optimisations and implement them by reflex. (3) **Pattern composition with Kruskal** — Min Cost to Connect All Points is the canonical "MST via Kruskal via Union Find" problem; a candidate who reaches for the right composition signals senior. The amortised α(N) bound is a recognition-level fact, not something you need to prove from scratch — but knowing it (and citing "inverse Ackermann, effectively constant") is the staff-level signal.

**Common confusions**

- "Union Find is O(log N)" — without optimisations, yes (tree of depth log N). With path compression + union by rank, it's amortised O(α(N)).
- "I can use Union Find for cycle detection in directed graphs" — no, only undirected. Directed cycles need three-colour DFS or Kahn's.
- "Path compression alone is enough" — gives O(log N) amortised; combined with union by rank gives O(α(N)). Both are needed for the tight bound.
- "DFS is always simpler than Union Find" — for static connectivity, yes. For dynamic, Union Find is dramatically simpler and faster.
- "Union by rank tracks tree depth" — it tracks rank, which is an upper bound on depth (the rank only increases on union of equal ranks).
- "I need to recompute components after deletion" — Union Find doesn't support deletion efficiently. For deletion, reverse time (process events backwards as unions) is the offline trick.

**What follows from this topic**

Union Find is the foundation of **Kruskal's MST** (next-section pattern), of **offline LCA on trees** (Tarjan's algorithm), of **dynamic graph connectivity** (with link-cut trees as the more powerful generalisation), and of **percolation simulation**. The "earliest moment everyone is connected" problem is the canonical incremental-connectivity test. The Satisfiability of Equality Equations problem extends to weighted Union Find (tracking ratios between connected variables) — a senior-level variant. If you can write the path-compression + union-by-rank template from memory and articulate the α(N) bound, you've earned the pattern.

### Q1. Walk me through Union Find with both optimisations.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.count -= 1
        return True
```

Path compression: during find, every node on the path redirects to point at the root. Union by rank: attach shorter under taller, increment rank only when ranks are equal. With both, amortised O(α(N)) per operation. The `count` field tracks the number of components for problems like Number of Connected Components.

### Q2. When do you pick Union Find over DFS/BFS?

Three cases. (1) **Dynamic edges**: edges arrive one at a time (Number of Islands II, Earliest Moment Everyone Connected). DFS/BFS would re-run O(V + E) per addition; Union Find is amortised O(α(N)). (2) **Kruskal's MST**: sorting edges and adding the smallest non-cycle edge requires fast cycle detection, which Union Find provides in O(α). (3) **Static connectivity with many queries**: build the DSU once with O(E α(V)) total, then answer connectivity queries in O(α) each. DFS would require a BFS/DFS pass per query.

### Q3. Walk me through Number of Connected Components (static).

```python
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

Initial count = N; each successful union decrements by 1. Final count = number of components. O(E α(V)) total. The DFS version is also valid and similarly efficient for static graphs — pick by code clarity.

### Q4. Walk me through Min Cost to Connect All Points (Kruskal).

Compute all pairwise distances; sort by distance; add edges in order if they don't form a cycle.

```python
def min_cost_connect_points(points):
    n = len(points)
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            d = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
            edges.append((d, i, j))
    edges.sort()
    uf = UnionFind(n)
    total = 0
    for d, i, j in edges:
        if uf.union(i, j):
            total += d
    return total
```

O(N² log N) — dominated by sorting N² edges. For sparse graphs Prim with a heap would be better; for dense ones (like this one with all pairwise distances), Kruskal is competitive.

### Q5. Walk me through Accounts Merge.

Each account has an owner and a list of emails; merge accounts that share any email. Union Find over emails: union all emails in the same account, then group emails by root, then attach the owner name.

```python
def accounts_merge(accounts):
    email_to_idx = {}
    uf = UnionFind(len(accounts))
    for i, account in enumerate(accounts):
        for email in account[1:]:
            if email in email_to_idx:
                uf.union(i, email_to_idx[email])
            email_to_idx[email] = i
    from collections import defaultdict
    groups = defaultdict(set)
    for email, i in email_to_idx.items():
        groups[uf.find(i)].add(email)
    return [[accounts[i][0]] + sorted(emails) for i, emails in groups.items()]
```

The key insight: union account *indices* (not emails) when they share an email; then in the second pass, group emails by the root account index. O(N α(N) + E log E) where E is total emails (the sort dominates).

### Q6. Senior interview angle: why is path compression amortised O(α(N))?

The proof is genuinely hard (Tarjan, 1975) and not expected in interview — but knowing the bound and naming "inverse Ackermann, effectively constant for any realistic N" is the senior signal. The intuition: each find operation either traverses a short path (cheap) or compresses a long path (expensive *but pays for many future cheap finds*). The amortised analysis amortises the expensive operations over the cheap ones using a potential function argument. The bound is the inverse Ackermann α(N), which grows so slowly that α(N) < 5 for any N ≤ 2^65536. In practice, treat Union Find ops as O(1). If pressed, say: "the proof is from Tarjan; the key idea is that path compression amortises the work across all future find operations, and the inverse Ackermann arises from the recursion structure of the analysis."

---

## Dynamic Programming

### Summary

**What this topic covers**

The largest and most heavily-tested pattern family in coding interviews — the catch-all for "number of ways", "maximum / minimum / longest / shortest" with overlapping subproblems. The five-question senior framing: **state** (what does `dp[i]` represent? be precise), **transition** (`dp[i]` in terms of smaller states), **base case** (what's `dp[0]` / `dp[empty]`?), **order** (bottom-up direction, or top-down with memo), **answer** (which cell holds the final answer?). Plus the dozen DP families to recognise: 1D linear (House Robber, Climbing Stairs), Kadane's (max subarray), 0/1 knapsack (subset sum, partition equal), unbounded knapsack (coin change, combination sum IV), LIS (patience sort in O(N log N)), LCS / Edit Distance (2D over two strings), palindrome DP, interval DP (Burst Balloons, Matrix Chain), grid DP (Unique Paths, Min Path Sum), bitmask DP (TSP, assign N to N for N ≤ 20), tree DP (House Robber III), digit DP (count in [L, R] with property), and state-machine DP (Buy/Sell Stock with K transactions). The 8 questions cover the framing, the family recognition signals, Kadane's, LIS in O(N log N), 0/1 vs unbounded knapsack distinction, state-machine DP for the stock problems, and the senior-level "state definition is the entire game" claim.

**Mental model**

DP is the **memoised recursion** answer to problems with overlapping subproblems. The mental shift from brute-force recursion is that you cache subproblem results to avoid recomputing them — the state space is bounded (otherwise it's not DP), so the total work is bounded by the size of the state space times the cost per state. The five-question framing forces clarity: if you can't state in *one sentence* what `dp[i][j][k]` *means*, you can't write the transition. Most failed DP attempts come from sloppy state definitions ("dp[i] is the answer for the first i elements" is vague; "dp[i] is the maximum sum of a non-adjacent subsequence ending at or before index i" is precise). The transition then writes itself from the recurrence: "what choices does the current state allow, and what do they cost?". Bottom-up vs top-down is mostly style — top-down (memoised recursion) is easier to derive from the recurrence; bottom-up (iterative table fill) is easier to space-optimise. The dozen families are recognition shortcuts: "two strings, transforming or matching" → 2D LCS-style DP; "knapsack with unbounded picks" → unbounded knapsack with items in outer loop; "Buy/Sell Stock with K transactions" → state-machine DP with `dp[i][k][holding]`. Senior candidates name the family in 30 seconds and write the template; junior candidates derive from scratch for 20 minutes.

**Key terms**

- **State** — the variables that uniquely identify a subproblem; the dimensions of `dp[...]`.
- **Transition** — the recurrence relating `dp[state]` to smaller states.
- **Base case** — `dp[0]` or `dp[empty]`; the boundary conditions.
- **Order** — bottom-up iteration direction; or top-down with memoisation.
- **Answer cell** — which entry of `dp[...]` holds the final answer; sometimes `dp[N]`, sometimes `max(dp[i] for i in range(N))`.
- **Overlapping subproblems** — the same subproblem appears in multiple recursion branches; DP caches it.
- **Optimal substructure** — the optimal answer to the problem decomposes into optimal answers to subproblems.
- **Kadane's algorithm** — 1D DP for maximum subarray sum; `dp[i] = max(nums[i], dp[i-1] + nums[i])`.
- **0/1 knapsack** — each item picked 0 or 1 times; capacity inner loop iterated backwards.
- **Unbounded knapsack** — items can repeat; capacity inner loop iterated forwards.
- **LIS (Longest Increasing Subsequence)** — O(N²) DP or O(N log N) via patience sort with binary search.
- **State-machine DP** — `dp[i][state]` where state encodes a discrete mode (holding stock, in cooldown, etc.).
- **Tree DP** — DP on a tree, postorder; often two states per node ("include this node" vs "exclude").
- **Bitmask DP** — state includes a bitmask of "which items used"; only viable for N ≤ ~20.
- **Space optimisation** — if `dp[i]` only depends on `dp[i-1]`, drop to two rows or two scalars.

**Why interviewers ask this**

Three signals. (1) **State definition discipline** — the senior tell is being able to articulate the state in one precise sentence before writing any code. Junior candidates write code first and discover bugs because their state was vague. (2) **Family recognition** — the dozen DP families cover 95% of LeetCode DP problems; senior candidates name the family in 30 seconds. (3) **Space optimisation** — for `dp[i]` depending only on `dp[i-1]`, dropping to O(K) space (K rows of recurrence) is the senior optimisation. Knowing when to apply it and how — and when *not* to (when you need the full table for reconstruction) — distinguishes from "memorised the basic template" to "understands the underlying recurrence".

**Common confusions**

- "DP is just memoisation" — memoisation is one *implementation*; the underlying idea is overlapping subproblems + optimal substructure.
- "Top-down and bottom-up are different algorithms" — same recurrence, different order. Bottom-up avoids recursion overhead; top-down is easier to derive.
- "DP always needs a 2D table" — depends on the state; 1D works for many problems (House Robber, Climbing Stairs).
- "Greedy and DP are equivalent for these problems" — greedy must be proven correct; DP doesn't need a proof but is asymptotically slower. Coin Change with [1, 3, 4] breaks greedy, needs DP.
- "I should always memoise" — only if the recurrence has overlapping subproblems. Pure recursion (no overlapping) is just brute force.
- "Bitmask DP scales beyond N = 20" — at N = 20, 2^N = ~10⁶. At N = 25, 2^N = 33M. At N = 30, 2^N = 10⁹. Past N = 20, you need a different approach.

**What follows from this topic**

DP underlies many of the hardest interview problems: Edit Distance, Regular Expression Matching, Wildcard Matching, Maximum Path Sum, Burst Balloons, Russian Doll Envelopes, Word Break II, Travelling Salesman. The state-machine DP family is the foundation of the entire Buy/Sell Stock series (six variants). Tree DP is the foundation of House Robber III, Binary Tree Cameras, and any "DP on tree" problem. Bitmask DP is the foundation of N-Queens-style assignment problems. Senior candidates internalise the families as a vocabulary; junior candidates rederive each one from scratch. If you can write Kadane's from memory, LIS in O(N log N), the 0/1 vs unbounded knapsack distinction, and articulate the five-question framing on a fresh problem, you've earned the pattern.

### Q1. Walk me through the five-question DP framing.

(1) **State**: what does `dp[i]` represent? Be precise — "the maximum value achievable using the first i items" is precise; "the answer for i" is not. (2) **Transition**: `dp[i] = f(dp[smaller_states])`. Derive from "what choices does state i allow, and what's the cost?". (3) **Base case**: `dp[0]` or `dp[empty]`; the boundary. Often `dp[0] = 0` or `dp[empty] = 1`. (4) **Order**: bottom-up requires that `dp[i]` be filled after all its dependencies; top-down memoised recursion handles this automatically. (5) **Answer**: `dp[N]`? `max(dp[i])`? `dp[N][K]`? State this explicitly. The five-question discipline is what separates "writes correct DP" from "writes buggy DP".

### Q2. Walk me through Kadane's algorithm for Maximum Subarray.

State: `dp[i]` = the maximum subarray sum ending exactly at index i. Transition: `dp[i] = max(nums[i], dp[i-1] + nums[i])` — either start a new subarray here or extend the one ending at i-1. Answer: `max(dp)`.

```python
def max_subarray(nums):
    best = curr = nums[0]
    for x in nums[1:]:
        curr = max(x, curr + x)
        best = max(best, curr)
    return best
```

Space optimisation: since `dp[i]` only depends on `dp[i-1]`, just keep one scalar `curr`. O(N) time, O(1) space.

### Q3. Walk me through LIS in O(N log N).

The O(N²) version is straightforward: `dp[i] = 1 + max(dp[j] for j < i if nums[j] < nums[i])`. The O(N log N) version uses **patience sort**: maintain `tails[k]` = smallest tail of any increasing subsequence of length k+1. For each new element, binary search to find where it fits (replace or append).

```python
from bisect import bisect_left

def lis_length(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
```

The final length of `tails` is the LIS length. Note: `tails` is *not* the actual LIS — it's the array of smallest tails per length, which preserves length but not order. For the actual sequence, you need to backtrack with extra bookkeeping. O(N log N).

### Q4. Walk me through 0/1 Knapsack vs Unbounded Knapsack.

**0/1 knapsack**: each item used 0 or 1 times. State `dp[w]` = best value using items 0..i with capacity w. Transition: for each item, iterate capacity *backwards* to ensure each item is used at most once.

```python
def knapsack_01(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # backwards
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

**Unbounded knapsack**: each item can be used unlimited times. Same state, but iterate capacity *forwards* (so the same item can be picked multiple times in one outer iteration).

```python
def coin_change_combinations(coins, amount):
    dp = [0] * (amount + 1)
    dp[0] = 1
    for coin in coins:
        for w in range(coin, amount + 1):  # forwards
            dp[w] += dp[w - coin]
    return dp[amount]
```

The direction of the inner loop is the entire difference. Get it wrong and you'll count combinations as permutations (or vice versa).

### Q5. Walk me through Edit Distance.

State: `dp[i][j]` = minimum edits to transform `word1[:i]` into `word2[:j]`. Transition: if `word1[i-1] == word2[j-1]`, no edit needed: `dp[i][j] = dp[i-1][j-1]`. Else min of insert (`dp[i][j-1] + 1`), delete (`dp[i-1][j] + 1`), replace (`dp[i-1][j-1] + 1`). Base: `dp[0][j] = j`, `dp[i][0] = i`.

```python
def edit_distance(w1, w2):
    m, n = len(w1), len(w2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if w1[i-1] == w2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]
```

Canonical 2D string DP. O(M × N) time and space; can be reduced to O(min(M, N)) space using two rows.

### Q6. Walk me through Buy/Sell Stock with Cooldown (state-machine DP).

States per day: holding stock, just sold (in cooldown), or doing nothing. Transitions: from "holding" you can sell → "just sold"; from "just sold" you can only do nothing → "doing nothing"; from "doing nothing" you can buy → "holding" or stay → "doing nothing".

```python
def max_profit_cooldown(prices):
    if not prices: return 0
    hold = -prices[0]
    sold = 0
    rest = 0
    for p in prices[1:]:
        prev_sold = sold
        sold = hold + p           # sell today
        hold = max(hold, rest - p)  # buy today (from rest) or keep holding
        rest = max(rest, prev_sold)  # rest today or finish cooldown from prev sold
    return max(sold, rest)
```

The state machine has three states; each transition updates one variable from the others. Space-optimised to O(1). The senior insight: state-machine DP works for any problem where the "current mode" has finite options and transitions are well-defined — Buy/Sell with K transactions extends this to `dp[i][k][holding]`.

### Q7. Walk me through House Robber III (tree DP).

For each node, two states: `rob_this` (rob this node, can't rob children) and `skip_this` (don't rob this node, take max of rob-or-skip each child).

```python
def rob_tree(root):
    def helper(node):
        if not node: return (0, 0)  # (rob_this, skip_this)
        left_rob, left_skip = helper(node.left)
        right_rob, right_skip = helper(node.right)
        rob_this = node.val + left_skip + right_skip
        skip_this = max(left_rob, left_skip) + max(right_rob, right_skip)
        return (rob_this, skip_this)
    return max(helper(root))
```

Postorder traversal; each node returns two values (the two states). O(N) — each node visited once.

### Q8. Senior interview angle: "state definition is the entire game" — give me an example where a vague state causes a wrong DP.

Take "longest substring with at most K distinct characters". A naive state would be `dp[i] = length of longest substring ending at or before i`. But "ending at or before" is too loose — you can't extend such a state by one character because you don't know what the "ending position" is. The correct state for sliding window (not DP) is "longest substring ending exactly at i". For a true DP example: Word Break, state `dp[i] = "can break s[:i]"` (boolean), transition `dp[i] = any(dp[j] for j in range(i) if s[j:i] in dictionary)`. A vague version like "dp[i] = the broken parts" gives you a string-of-strings state that's neither bounded nor useful. The senior discipline: write the state definition on the whiteboard *first*, in one sentence, before any code. If the sentence is vague, the DP will be buggy.

---

## Backtracking

### Summary

**What this topic covers**

The pattern for "generate all" / "find all paths" / "permutations / combinations / subsets" problems with small N (typically ≤ 12). The universal skeleton: **choose, explore, unchoose** — at each step, try each available option, recurse, then undo the choice. Five canonical templates: (1) **subsets** — include/exclude binary recursion; (2) **permutations** — track used elements via set or in-place swap; (3) **combinations** — index-based, never revisit smaller indices; (4) **combination sum** — index + remaining target; (5) **grid search** — N-Queens, Sudoku, Word Search with direction array and visited backtracking. The 7 questions cover the templates, the duplicate-handling trick (sort + skip `if i > start and nums[i] == nums[i-1]`), pruning as the entire game (brute backtracking is O(branches^depth)), and the senior-level N-Queens complexity question.

**Mental model**

Backtracking is **exhaustive search with undo**. It systematically enumerates all candidate solutions by building them incrementally; when a candidate can't be extended to a valid solution, the algorithm undoes the last choice and tries the next option. The mental shift from naive recursion is that you're modifying a shared mutable state (a list, a board, a set of used elements) instead of passing copies — the undo step is what makes this safe. The pattern works when (1) the state space is small enough to enumerate (typically N ≤ 12 for permutations, N ≤ 20 for subsets), and (2) you can prune aggressively — a brute search of all O(2^N) or O(N!) candidates is hopeless without pruning. Pruning is what makes N-Queens solvable for N = 12 (~14 million theoretical states, but pruning cuts to thousands). The skeleton — choose, explore, unchoose — generalises across permutations, combinations, partitions, and grid search; the differences are in the "valid choices" filter and the "is solution" check. The duplicate-skipping trick (sort + skip equals at the same recursion level) is the universal painkiller for "find all *unique* permutations / combinations". Senior candidates name the pattern in 10 seconds from the "all" keyword and write the template from memory; junior candidates rederive each time.

**Key terms**

- **Choose, explore, unchoose** — the universal backtracking skeleton.
- **State** — the partial solution being built (a list, a board, a path).
- **Choices** — the available options at the current step.
- **Is solution** — the predicate that checks if the current state is a complete valid solution.
- **Pruning** — cutting off branches that can't lead to a valid solution.
- **Duplicate-skip trick** — sort input, skip `if i > start and nums[i] == nums[i-1]`; prevents duplicate branches in permutations/combinations with duplicates.
- **In-place mutation** — modifying a shared list/board and undoing; saves memory vs passing copies.
- **Index-based combinations** — `backtrack(i, current)`; only consider elements from index i onwards.
- **Visited set** — for permutations or grid search; track which elements/cells are used.
- **N-Queens** — place N queens on N×N board with no attacks; classic backtracking with column/diagonal sets.
- **Sudoku** — fill grid with constraints; backtracking with row/col/box sets.
- **Word Search** — DFS on grid with backtracking visited marking.

**Why interviewers ask this**

Three signals. (1) **Recognition of "all" / "generate" keywords** — senior candidates reach for backtracking reflexively. (2) **Skeleton fluency** — the choose/explore/unchoose pattern should be written from memory; the variants (subsets via include/exclude, permutations via used-set, combinations via index) should be distinguishable. (3) **Pruning as the entire game** — brute backtracking is exponential; pruning (and stating it out loud) is the senior tell. For N-Queens, the column/diagonal-set check is the pruning; for Sudoku, the row/col/box constraint check. A candidate who writes backtracking without articulating the pruning is junior; a candidate who names "this prune cuts an exponential subtree at each level" is senior.

**Common confusions**

- "I should pass copies of the state" — slow and unnecessary. Mutate + undo is the standard.
- "Backtracking and DFS are the same" — backtracking is DFS *with* undo for state restoration. DFS on a graph just marks visited; backtracking on a search tree restores state.
- "Subsets needs combinations logic" — subsets are simpler: at each index, include or exclude. O(2^N) per element gives 2^N subsets, each O(N) to build → O(N · 2^N).
- "Permutations needs in-place swap" — swap is one valid implementation; the cleaner version uses a `used` set or a remaining list.
- "I need to dedupe at the end" — better to skip duplicates during recursion (sort + skip equals). End-of-recursion dedup is slower and harder to reason about.
- "Pruning is an optimisation, not required" — for N ≥ 8, unpruned backtracking is too slow. Pruning is essential.

**What follows from this topic**

Backtracking is the foundation of constraint satisfaction (N-Queens, Sudoku, graph colouring), of generating all parse trees (Word Break II, Restore IP Addresses), of brute search with pruning (Travelling Salesman with branch-and-bound). It pairs with **bitmask DP** when the state space has structure that allows memoisation (e.g. TSP with `dp[mask][last]`). The grid-DFS variant (Word Search) is the bridge to graph DFS with explicit visited tracking. If you can write the five templates from memory and articulate the pruning argument, you've earned the pattern.

### Q1. Walk me through Subsets (include/exclude).

```python
def subsets(nums):
    result = []
    def backtrack(i, current):
        if i == len(nums):
            result.append(current[:])
            return
        # Exclude
        backtrack(i + 1, current)
        # Include
        current.append(nums[i])
        backtrack(i + 1, current)
        current.pop()
    backtrack(0, [])
    return result
```

At each index, two branches: exclude (don't add `nums[i]`) or include (add then recurse, then pop to undo). 2^N total leaves; O(N · 2^N) total work (each leaf builds a list of length ≤ N).

### Q2. Walk me through Permutations.

```python
def permute(nums):
    result = []
    def backtrack(current, remaining):
        if not remaining:
            result.append(current[:])
            return
        for i in range(len(remaining)):
            current.append(remaining[i])
            backtrack(current, remaining[:i] + remaining[i+1:])
            current.pop()
    backtrack([], nums)
    return result
```

At each level, try each remaining element. N! permutations; O(N · N!) total. The `remaining[:i] + remaining[i+1:]` is the "remove without mutating" idiom; alternatively, use a `used` set or in-place swap for less allocation.

### Q3. Walk me through Combination Sum.

```python
def combination_sum(candidates, target):
    result = []
    def backtrack(i, current, remaining):
        if remaining == 0:
            result.append(current[:])
            return
        if remaining < 0 or i == len(candidates):
            return
        # Include candidates[i] (and stay at i since unlimited use)
        current.append(candidates[i])
        backtrack(i, current, remaining - candidates[i])
        current.pop()
        # Skip candidates[i]
        backtrack(i + 1, current, remaining)
    backtrack(0, [], target)
    return result
```

Two branches: include this candidate (and stay at i for unlimited use) or skip to next. Pruning: `remaining < 0` terminates. The "stay at i" is what makes it unbounded; for Combination Sum II (each candidate used once), recurse to `i + 1` after include.

### Q4. Walk me through duplicate handling — Permutations II.

Sort first; at each level, skip elements equal to the previous *at the same level*. The "at the same level" is enforced by `if i > start and nums[i] == nums[i-1]: continue` — `i > start` ensures we're not at the first call.

```python
def permute_unique(nums):
    nums.sort()
    result = []
    used = [False] * len(nums)
    def backtrack(current):
        if len(current) == len(nums):
            result.append(current[:])
            return
        for i in range(len(nums)):
            if used[i]: continue
            if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
                continue  # skip duplicate at this level
            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False
    backtrack([])
    return result
```

The `not used[i-1]` condition is the trick: if the previous duplicate is *not* used, we'd be choosing it second in this level, which is a duplicate branch. If it *is* used, we're past it in the recursion and this duplicate is legitimately the next choice.

### Q5. Walk me through N-Queens.

Place N queens on N×N board such that no two attack. Track columns, positive diagonals (`row + col`), and negative diagonals (`row - col`) as sets for O(1) attack check.

```python
def n_queens(n):
    cols = set()
    pos_diag = set()
    neg_diag = set()
    result = []
    board = [['.'] * n for _ in range(n)]
    def backtrack(row):
        if row == n:
            result.append([''.join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row + col) in pos_diag or (row - col) in neg_diag:
                continue
            cols.add(col); pos_diag.add(row + col); neg_diag.add(row - col)
            board[row][col] = 'Q'
            backtrack(row + 1)
            cols.remove(col); pos_diag.remove(row + col); neg_diag.remove(row - col)
            board[row][col] = '.'
    backtrack(0)
    return result
```

Pruning via the three sets is what makes this tractable for N up to ~15. Without it, you'd enumerate all N! row assignments. O is hard to express tightly because of pruning; bounded by N! but vastly less in practice.

### Q6. Walk me through Word Search (grid backtracking).

```python
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def exist(board, word):
    rows, cols = len(board), len(board[0])
    def backtrack(r, c, i):
        if i == len(word): return True
        if not (0 <= r < rows and 0 <= c < cols): return False
        if board[r][c] != word[i]: return False
        board[r][c] = '#'  # mark visited
        for dr, dc in DIRS:
            if backtrack(r + dr, c + dc, i + 1):
                board[r][c] = word[i]  # restore (optional if returning True)
                return True
        board[r][c] = word[i]  # restore on failure
        return False
    for r in range(rows):
        for c in range(cols):
            if backtrack(r, c, 0):
                return True
    return False
```

In-place visited marking (with restore on backtrack) saves memory. Pruning: as soon as `board[r][c] != word[i]`, terminate. O(rows · cols · 4^L) where L is word length (4 directions per step).

### Q7. Senior interview angle: what's the time complexity of N-Queens, and why is the answer "complicated"?

The state space (without pruning) is N! row assignments (one queen per row, choose column). With pruning by columns and diagonals, the effective work is much less, but there's no clean closed form — it depends on the geometry of which placements survive the pruning at each level. The empirical bound for N = 14 is about 30 seconds in Python; for N = 16 it's hours. The senior-correct answer: "bounded by O(N!) in the worst case (one queen per row, N column choices each), but pruning by columns and diagonals cuts this dramatically. The exact complexity doesn't have a clean closed form — be honest that it's hard to express tighter than O(N!) with the practical note that it's vastly faster." Don't try to bluff a tighter bound; interviewers respect the honest hedge.

---

## Greedy

### Summary

**What this topic covers**

The pattern for problems where the locally optimal choice at each step leads to the global optimum — but with the crucial caveat that **greedy must be proven correct** (exchange argument, optimal substructure) before you commit. Five canonical sub-patterns: (1) **sort then sweep** — Activity Selection, Non-overlapping Intervals, Minimum Arrows; (2) **greedy with heap** — Task Scheduler, Reorganize String; (3) **jump greedy** — Jump Game (track furthest reachable), Jump Game II (BFS-like layers); (4) **interval greedy** — sort by end time, pick earliest-ending non-conflicting; (5) **greedy with regret** — IPO (heap by capital, then heap by profit when affordable). The 6 questions cover the templates, the proof obligation, the Coin Change counter-example (greedy fails with [1, 3, 4] for target 6), Jump Game, and the senior-level "when does greedy work and how do you prove it" question.

**Mental model**

Greedy is the **optimisation pattern where you commit irrevocably to the best-looking choice at each step**. The mental shift from DP is that you don't enumerate all options — you just pick one. This works when the problem has the **greedy choice property** (the locally optimal choice is part of some globally optimal solution) and **optimal substructure** (after making the greedy choice, the remaining subproblem is the same type). Together these give you a polynomial algorithm where DP would also work but slower. The proof is what separates correct greedy from wishful greedy. Most "intuitive greedy" attempts fail — Coin Change with denominations [1, 3, 4] and target 6 greedily picks 4, then 1, 1 (three coins), but the optimal is 3, 3 (two coins). The greedy is wrong here because the choice property doesn't hold (picking the largest coin doesn't always lead to the optimum). The five sub-patterns are all instances where the choice property *does* hold and is provable: in interval scheduling, picking the earliest-ending interval is provably part of some optimal schedule (exchange argument: if any optimal schedule doesn't include the earliest-ending interval, you can swap and still have an optimum). The proof discipline is what makes greedy a senior-level pattern.

**Key terms**

- **Greedy choice property** — the locally optimal choice is part of some globally optimal solution.
- **Optimal substructure** — after making the greedy choice, the remaining subproblem is the same type.
- **Exchange argument** — common proof technique: show that any optimal solution can be transformed into one that includes the greedy choice without loss.
- **Sort + sweep** — sort by some key (start time, end time, value/weight ratio), then sweep linearly.
- **Activity selection** — sort by end time; pick earliest-ending non-conflicting; provably optimal.
- **Jump game** — track furthest reachable index; greedy works because being able to reach `i` means you can reach any j ≤ i.
- **Greedy with heap** — for "pick the best at each step" with dynamic candidates; Task Scheduler, Reorganise String.
- **Greedy with regret** — pick now if affordable, swap if a better option appears later. IPO.
- **Counter-example: Coin Change** — greedy fails for denominations that don't form a "canonical" system.
- **Greedy proof obligation** — in an interview, briefly justify why greedy works; don't just claim it.

**Why interviewers ask this**

Three signals. (1) **Proof discipline** — junior candidates apply greedy reflexively; senior candidates explicitly justify with an exchange argument or "this works because picking X first never prevents reaching the optimum". (2) **Greedy vs DP distinction** — Coin Change is the canonical test: with arbitrary denominations, greedy fails and DP is required. A candidate who reaches for greedy on this is downgraded; a candidate who pauses and reasons "would greedy work with [1, 3, 4] for 6? no — 4+1+1=3 coins but 3+3=2 coins" is senior. (3) **Pattern recognition on the five sub-patterns** — sort+sweep for intervals, heap for "pick best dynamically", regret for "swap later". Each has a recognition signal; naming them is the senior tell.

**Common confusions**

- "Greedy always works for optimisation" — only when the greedy choice property holds. Coin Change is the canonical counter-example.
- "Greedy and DP are equivalent" — when greedy works it's strictly better (O(N log N) vs O(N · capacity) for knapsack-style problems).
- "The greedy choice is always 'pick the biggest'" — sometimes it's "pick the smallest" (earliest deadline, smallest weight) or "pick by ratio" (value-per-weight for fractional knapsack).
- "I don't need to prove greedy in an interview" — you do; the proof gesture is what signals senior. A 30-second exchange-argument sketch is enough.
- "Sorting is preprocessing, not greedy" — sorting is part of the greedy algorithm; the order in which you process candidates is what makes the choice locally optimal.
- "Greedy with heap is heap, not greedy" — the data structure is a heap; the *strategy* (always pick the best remaining) is greedy.

**What follows from this topic**

Greedy is the foundation of many interval problems (next topic), of Huffman coding, of fractional knapsack, of activity selection in scheduling. The proof discipline you build here pays off in **algorithm design interviews** where you propose a heuristic and need to justify it. The Jump Game variant connects to BFS (Jump Game II is BFS-like layered search). The greedy-with-regret pattern (IPO, Maximum Performance of a Team) is the senior extension. If you can recognise the five sub-patterns and articulate when greedy fails (Coin Change), you've earned the pattern.

### Q1. Walk me through Jump Game.

State: `reach` = the furthest index reachable so far. Iterate; if `i > reach`, return False; else `reach = max(reach, i + nums[i])`.

```python
def can_jump(nums):
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + x)
    return True
```

Greedy works because being able to reach index `i` means you can reach any `j ≤ i` — there's no advantage to "skipping" earlier indices. O(N).

### Q2. Walk me through Non-overlapping Intervals (sort by end).

Remove the minimum intervals so the rest don't overlap; equivalent to "select the maximum non-overlapping intervals" (classic Activity Selection). Sort by end time; pick the first; for each subsequent, pick if it starts after the last picked end.

```python
def erase_overlap(intervals):
    intervals.sort(key=lambda x: x[1])  # sort by end
    count = 0
    last_end = float('-inf')
    for start, end in intervals:
        if start >= last_end:
            last_end = end
        else:
            count += 1  # remove this overlapping one
    return count
```

Proof (exchange argument): the earliest-ending interval is part of *some* optimal solution. Swap any optimal solution's first interval for the earliest-ending — the rest of the optimal still works (since earliest-ending leaves the most room). O(N log N) for the sort.

### Q3. Walk me through Task Scheduler (greedy with heap).

Given task counts and cooldown `n`, schedule all tasks. Greedy: always pick the highest-count task that's off cooldown.

```python
import heapq
from collections import Counter, deque

def least_interval(tasks, n):
    freq = Counter(tasks)
    heap = [-f for f in freq.values()]
    heapq.heapify(heap)
    time = 0
    cooldown = deque()
    while heap or cooldown:
        time += 1
        if heap:
            count = heapq.heappop(heap) + 1
            if count < 0:
                cooldown.append((time + n, count))
        if cooldown and cooldown[0][0] == time:
            heapq.heappush(heap, cooldown.popleft()[1])
    return time
```

Max-heap (negated for Python) of remaining counts; cooldown deque holds tasks waiting to re-enter. Greedy works because picking the most-frequent task first maximises future scheduling flexibility (exchange argument: deferring it would just push the same problem later).

### Q4. Walk me through Gas Station.

Find the starting gas station from which you can complete the circle (or return -1). Greedy: if total gas < total cost, impossible. Else, find the first station from which a forward sweep never dips below zero.

```python
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start = 0
    tank = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0
    return start
```

Greedy insight: if you run out of gas between A and B (inclusive), then any station between A and B also can't be the start (because they have even less accumulated gas). So skip directly past B and reset. O(N).

### Q5. Walk me through IPO (greedy with regret).

You have `k` projects to invest in; each requires a capital and yields a profit. Maximise total capital after `k` projects.

```python
import heapq

def find_maximised_capital(k, w, profits, capital):
    projects = sorted(zip(capital, profits))
    available = []  # max-heap of profits (negated)
    i = 0
    for _ in range(k):
        while i < len(projects) and projects[i][0] <= w:
            heapq.heappush(available, -projects[i][1])
            i += 1
        if not available:
            break
        w -= heapq.heappop(available)
    return w
```

Two heaps in effect: one sorted by capital (so we can identify affordable projects), one of profits among affordable (so we always pick the best affordable). After each project, more become affordable. Greedy works because picking the best affordable now never prevents picking a better one later (the better one becomes affordable later if it wasn't now). O(N log N).

### Q6. Senior interview angle: why does greedy work for Activity Selection but fail for Coin Change with [1, 3, 4]?

**Activity Selection (works)**: pick the earliest-ending interval. Proof (exchange argument): take any optimal schedule. Its first interval ends at some time `t1`. The earliest-ending interval ends at `t0 ≤ t1`. Swap them — the rest of the optimal schedule still works because the new interval ends earlier (more room). The earliest-ending interval is therefore part of *some* optimal solution; the rest follows by induction.

**Coin Change with [1, 3, 4] for target 6 (fails)**: greedy picks 4 first (largest), then 1, 1 → 3 coins. Optimal is 3, 3 → 2 coins. Greedy fails because the greedy choice property doesn't hold — picking 4 prevents using two 3s. The issue is that the coin system isn't *canonical* (a coin system is canonical if greedy gives the optimum for any target; US coins {1, 5, 10, 25} are canonical, but [1, 3, 4] isn't). For non-canonical coin systems, you need DP (`dp[amount] = 1 + min(dp[amount - coin] for coin in coins)`).

The senior framing: "greedy needs the greedy choice property, which must be proven. The proof is usually an exchange argument. When the proof fails, fall back to DP."

---

## Intervals

### Summary

**What this topic covers**

The pattern family for problems with intervals (meetings, ranges, periods, events) and the universal first move: **sort by start time** (sometimes by end time for greedy variants). Five sub-patterns: (1) **merge intervals** — sort by start, extend the last merged or append; (2) **insert interval** — find where it fits, merge with overlapping; (3) **count rooms / max concurrent** — sort by start + heap of end times, or sweep with separated start/end events; (4) **non-overlapping count** — sort by end time, greedy pick (Activity Selection); (5) **sweep line** — for advanced problems, treat starts as +1 and ends as -1, sort all events, sweep with a running count. The 6 questions cover the merge template, Meeting Rooms II with the heap, sweep line for "Number of Airplanes in the Sky", Interval List Intersections, and the senior-level Calendar III problem.

**Mental model**

Interval problems are all variations on "what happens when these ranges overlap?". The universal first move is sorting — usually by start time, sometimes by end time. After sorting, the structure of overlaps becomes mechanical: two intervals `[s1, e1]` and `[s2, e2]` (with `s1 ≤ s2`) overlap iff `s2 ≤ e1`. Merge is then a one-pass scan: for each next interval, either extend the last merged (`result[-1][1] = max(result[-1][1], end)`) or append. For "max concurrent" problems, sort by start and use a min-heap of end times — when the next interval starts, pop expired ones; the heap size is the current concurrency. Alternatively, **sweep line** decomposes each interval into two events (+1 at start, -1 at end), sorts all events globally, then sweeps with a running count — the max running count is the answer. Sweep line is the more general tool; heap is the more direct algorithm. The mental shift from raw "check all pairs" (O(N²)) is that sorting reveals the structure in O(N log N) and lets you process intervals in a single linear scan after. Senior candidates recognise interval problems from the keywords "meetings", "rooms", "intervals", "overlapping", "merge" and reach for the sort + sweep template.

**Key terms**

- **Interval** — `[start, end]`; typically inclusive-exclusive or inclusive-inclusive (clarify).
- **Overlap** — `[s1, e1]` and `[s2, e2]` overlap iff `max(s1, s2) ≤ min(e1, e2)`.
- **Sort by start** — universal first move; required for merge and "max concurrent" patterns.
- **Sort by end** — for Activity Selection / Non-overlapping Intervals greedy.
- **Merge intervals** — combine overlapping intervals into the union.
- **Max concurrent / room count** — maximum number of intervals overlapping at any point.
- **Sweep line** — decompose intervals into +1/-1 events; sort and sweep with running count.
- **Heap of end times** — for "rooms needed": when a new meeting starts, pop ended meetings; heap size = current rooms.
- **Inclusive vs exclusive ends** — `[1, 5)` (5 not included) vs `[1, 5]` (5 included); affects overlap check.
- **Interval intersection** — `[max(s1, s2), min(e1, e2)]` if valid (i.e. max ≤ min).
- **Interval List Intersections** — two sorted lists, two pointers, advance the one with smaller end.
- **Calendar I/II/III** — incremental room booking; III asks for max concurrent overlaps at any point.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on "intervals" / "meetings" / "ranges"** — the keyword should trigger "sort by start, then sweep" reflex. (2) **Sweep line as a generalisation** — junior candidates write merge intervals; senior candidates know sweep line as the more general tool for problems like "Number of Airplanes in the Sky" or "Maximum CPU load". (3) **Heap vs sweep line choice** — for Meeting Rooms II, both work; senior candidates name both and pick by problem shape. The Calendar series (especially Calendar III with max concurrent overlaps) is the senior-level test because it requires recognising the sweep-line pattern in an incremental-update setting.

**Common confusions**

- "I need to sort by both start and end" — no; one or the other depending on the problem. Don't double-sort.
- "Overlap check is `e1 > s2`" — depends on inclusive vs exclusive ends; clarify with the interviewer.
- "Heap of end times tracks all meetings" — only currently-in-progress meetings (after expired ones popped).
- "Sweep line needs two arrays (starts and ends separately)" — one combined array of `(time, +1 or -1)` events is cleaner; sort by time, then by event type for ties.
- "Meeting Rooms II needs to track which room is which" — no, only the count matters.
- "Interval List Intersections needs to merge first" — no; two-pointer scan over the sorted lists is O(M + N).

**What follows from this topic**

Intervals connect to **greedy** (Activity Selection, Non-overlapping Intervals), to **sweep line** (the more general tool), to **scheduling and resource allocation** in system design. The sweep-line technique recurs in Skyline Problem (priority queue + sweep), Car Pooling, Range Module. If you can write merge intervals from memory, recognise Meeting Rooms II as heap + sort, and articulate when sweep line is the right escalation, you've earned the pattern.

### Q1. Walk me through Merge Intervals.

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    result = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result
```

Sort by start; for each next interval, either extend (overlap) or append (gap). O(N log N) — dominated by sort.

### Q2. Walk me through Meeting Rooms II with a heap.

```python
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    heap = []  # min-heap of end times
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
```

Sort by start; min-heap of end times of in-progress meetings. For each new meeting, free any room whose meeting has ended (`heap[0] <= start`), then add this meeting's end. The heap size at any moment = current rooms in use; final size = max needed. O(N log N).

### Q3. Walk me through Meeting Rooms II with sweep line.

Decompose intervals into events; sort by time; sweep with a running count.

```python
def min_meeting_rooms_sweep(intervals):
    events = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    events.sort(key=lambda x: (x[0], x[1]))  # tie: -1 before +1 (end before start at same time)
    rooms = 0
    max_rooms = 0
    for _, delta in events:
        rooms += delta
        max_rooms = max(max_rooms, rooms)
    return max_rooms
```

The tie-break `(time, delta)` — with -1 coming before +1 — handles the case where a meeting ends at the same time another starts: count them as non-overlapping (the room is freed first). If the convention is "overlapping at exact equal", flip the tie-break. O(N log N).

### Q4. Walk me through Insert Interval.

```python
def insert(intervals, new_interval):
    result = []
    i = 0
    n = len(intervals)
    # Add all intervals strictly before new_interval
    while i < n and intervals[i][1] < new_interval[0]:
        result.append(intervals[i])
        i += 1
    # Merge all overlapping
    while i < n and intervals[i][0] <= new_interval[1]:
        new_interval[0] = min(new_interval[0], intervals[i][0])
        new_interval[1] = max(new_interval[1], intervals[i][1])
        i += 1
    result.append(new_interval)
    # Add the rest
    while i < n:
        result.append(intervals[i])
        i += 1
    return result
```

Three phases: pre-insert, merge with overlapping, post-insert. The input is already sorted, so this is O(N) — no need to re-sort.

### Q5. Walk me through Interval List Intersections.

Two sorted lists; find all pairwise intersections.

```python
def interval_intersection(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        lo = max(a[i][0], b[j][0])
        hi = min(a[i][1], b[j][1])
        if lo <= hi:
            result.append([lo, hi])
        # Advance the one that ends first
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return result
```

Two pointers; the intersection is `[max(starts), min(ends)]` if valid. Advance the interval that ends first, since it can't intersect anything further. O(M + N).

### Q6. Senior interview angle: walk me through Calendar III (max concurrent meetings).

Each `book(start, end)` adds an interval; return the current maximum concurrent meetings. Sweep-line approach with a sorted map (TreeMap in Java, `SortedDict` in Python via `sortedcontainers`):

```python
from sortedcontainers import SortedDict

class MyCalendarThree:
    def __init__(self):
        self.delta = SortedDict()
    def book(self, start, end):
        self.delta[start] = self.delta.get(start, 0) + 1
        self.delta[end] = self.delta.get(end, 0) - 1
        active = 0
        max_active = 0
        for v in self.delta.values():
            active += v
            max_active = max(max_active, active)
        return max_active
```

The senior point: each booking is O(N) (sweep over all events). For better performance, use a segment tree with lazy propagation, O(log N) per booking. The interviewer is testing whether you recognise that sweep-line with a sorted map is the natural approach, and whether you know the segment-tree escalation if pressed on performance.

---

## Tries

### Summary

**What this topic covers**

The pattern for "prefix" / "autocomplete" / "word search" / "starts with" problems, and for the bit-trie variant used in "maximum XOR pair" problems. A trie (prefix tree) is a tree where each node represents a character, and a path from root to a marked node spells a complete word. Core operations: insert (O(L)), search exact (O(L)), starts-with (O(L)). Four sub-patterns: (1) **basic word trie** — for autocomplete, spell-check, dictionary problems; (2) **wildcard search** — when `.` matches any char, recurse over all children at that level; (3) **trie + DFS on grid** — Word Search II (build trie of words, DFS grid pruning by trie path); (4) **bit trie** — for "maximum XOR pair" type problems, treat each integer as a 32-bit string. The 5 questions cover the canonical template, the Word Search II escalation, the bit-trie XOR trick, and the senior-level memory analysis.

**Mental model**

A trie is the **right data structure for prefix-based queries on a corpus of strings**. The brute-force "for word in dictionary: if word.startswith(prefix)" is O(N × L); the trie collapses this to O(L) by structuring the dictionary as a tree where each path encodes a word. The mental shift is from "iterate the dictionary" to "walk the tree by character" — at each character, you either follow an existing child or terminate (for "starts with" / "search") or create a new child (for "insert"). The memory cost is the trie's defining tradeoff: each node holds a children map (up to 26 pointers for lowercase ASCII, more for full Unicode), so a corpus of N words with average length L uses O(N × L) memory in the worst case (no shared prefixes) but much less when prefixes are shared. The bit-trie generalisation treats each integer as a 32-bit string and stores them in a trie of depth 32; this gives O(N log U) where U is the value range, and enables "maximum XOR pair" in O(N log U) instead of O(N²) — for each number, walk the trie greedily choosing the opposite bit at each level (since XOR maximises when bits differ). The Word Search II escalation combines tries with grid DFS: build a trie of target words, DFS the grid, pruning whenever the current path doesn't match any trie branch. This turns an O(M × N × W × L) brute force into O(M × N × 4^L) with trie pruning.

**Key terms**

- **Trie (prefix tree)** — tree where each path from root encodes a string; marked nodes are complete words.
- **TrieNode** — node with `children` (map / array of pointers) and `is_word` flag.
- **Insert** — walk down, creating missing nodes; mark final node as `is_word`.
- **Search exact** — walk down; if any step misses, return False; final node must have `is_word`.
- **Starts with** — walk down; if any step misses, return False; no `is_word` check.
- **Wildcard search** — `.` matches any char; recurse over all children at that step.
- **Trie + DFS on grid** — for Word Search II; trie prunes the DFS by trie membership.
- **Bit trie** — trie of depth 32 (or 64); each node has at most 2 children (bit 0 or 1).
- **Max XOR pair** — for each number, walk the bit trie greedily picking the opposite bit; gives max XOR with any stored number.
- **Memory cost** — O(N × L × alphabet_size) worst case; much less with prefix sharing.
- **Suffix trie / suffix automaton** — advanced; rarely interview material.
- **Compressed trie (radix tree)** — collapses single-child chains; saves memory.

**Why interviewers ask this**

Three signals. (1) **Pattern recognition on "prefix" / "autocomplete"** — the keyword should trigger trie reflex. Junior candidates use a sorted list with binary search (O(N log N) per query); senior candidates use a trie (O(L)). (2) **Word Search II as the canonical hard problem** — combining trie with grid DFS is a senior-level test; brute force (DFS for each word) is O(W × M × N × 4^L), trie-pruned is O(M × N × 4^L). The factor-of-W reduction is meaningful. (3) **Bit trie as the "max XOR" specialist** — Maximum XOR of Two Numbers in an Array is the canonical test. Junior candidates can't see how to beat O(N²); senior candidates name "bit trie, O(N log U)".

**Common confusions**

- "Trie uses 26 children per node" — for lowercase ASCII; for full Unicode use a hash map.
- "I should store the entire word at each node" — no, just `is_word` boolean; the path encodes the word.
- "Trie operations are O(N)" — they're O(L) (length of word), not O(N) (number of words in trie).
- "Trie and hash map are equivalent" — hash map gives O(L) for exact lookup but can't do prefix queries efficiently; trie does both.
- "Word Search II needs to DFS the grid for each word" — no, build a trie of words first, then one DFS pass uses the trie to prune.
- "Bit trie is too obscure for interviews" — Maximum XOR of Two Numbers is a LeetCode medium specifically testing it.

**What follows from this topic**

Tries connect to **search engines** (autocomplete, spell-check), to **IP routing** (longest-prefix match via binary trie on IP bits), to **DNA sequence analysis** (suffix tries for substring queries). The bit-trie generalisation extends to "find pair with max AND / OR" variants. The compressed trie (radix tree) is the data structure behind many production systems (e.g. Redis's radix-tree index). If you can write the basic trie template from memory, articulate the memory cost, and recognise Word Search II as trie + DFS, you've earned the pattern.

### Q1. Walk me through the basic trie template.

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
        node.is_word = True

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_word

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def _walk(self, s):
        node = self.root
        for c in s:
            if c not in node.children:
                return None
            node = node.children[c]
        return node
```

Insert/search/starts_with all O(L). The `_walk` helper factors out the common walk-down logic.

### Q2. Walk me through Add and Search Word (with wildcard).

```python
class WordDictionary:
    def __init__(self):
        self.root = TrieNode()
    def addWord(self, word):
        node = self.root
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
        node.is_word = True
    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return node.is_word
            c = word[i]
            if c == '.':
                return any(dfs(child, i + 1) for child in node.children.values())
            if c not in node.children:
                return False
            return dfs(node.children[c], i + 1)
        return dfs(self.root, 0)
```

The wildcard `.` recurses over all children at that position. Worst case (all wildcards) is O(26^L) — but average case is much faster because most positions are concrete characters.

### Q3. Walk me through Word Search II (trie + grid DFS).

Build a trie of target words; DFS the grid, walking the trie in lockstep. When you reach a trie node with `is_word == True`, you've found a word.

```python
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def find_words(board, words):
    root = TrieNode()
    for w in words:
        node = root
        for c in w:
            node = node.children.setdefault(c, TrieNode())
        node.word = w  # store word at terminal node
    rows, cols = len(board), len(board[0])
    result = []
    def dfs(r, c, node):
        ch = board[r][c]
        if ch not in node.children:
            return
        next_node = node.children[ch]
        if hasattr(next_node, 'word'):
            result.append(next_node.word)
            del next_node.word  # dedup
        board[r][c] = '#'
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, next_node)
        board[r][c] = ch
    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return result
```

Two optimisations: (1) store the word itself at the terminal node (no need to reconstruct from path); (2) delete after found to avoid duplicate detection. O(M × N × 4^L) where L is max word length — vastly better than O(W × M × N × 4^L) brute force.

### Q4. Walk me through Maximum XOR of Two Numbers (bit trie).

Build a trie of 32-bit binary representations of all numbers. For each number, walk the trie greedily choosing the opposite bit at each level (since XOR maximises when bits differ).

```python
def find_maximum_xor(nums):
    class BitTrie:
        def __init__(self):
            self.children = {}
    root = BitTrie()
    # Insert all numbers
    for num in nums:
        node = root
        for i in range(31, -1, -1):
            b = (num >> i) & 1
            if b not in node.children:
                node.children[b] = BitTrie()
            node = node.children[b]
    # For each number, find max XOR
    best = 0
    for num in nums:
        node = root
        cur_xor = 0
        for i in range(31, -1, -1):
            b = (num >> i) & 1
            opp = 1 - b
            if opp in node.children:
                cur_xor |= (1 << i)
                node = node.children[opp]
            else:
                node = node.children[b]
        best = max(best, cur_xor)
    return best
```

O(N × 32) = O(N) — strictly better than the O(N²) brute force. The greedy choice (always prefer the opposite bit) gives the max XOR because the higher bits dominate.

### Q5. Senior interview angle: what's the memory cost of a trie, and when is it not the right choice?

**Memory cost**: O(N × L × alphabet_size) in the worst case (no shared prefixes, full hash-map per node). For lowercase ASCII (26 letters), each node has up to 26 pointers; with a hash map, the overhead is ~30-50 bytes per node. For 10⁶ words of average length 10, that's ~10⁷ nodes × 50 bytes = ~500MB. **Not the right choice** when: (1) memory-constrained and the corpus has low prefix sharing; (2) you don't need prefix queries (a hash map gives O(L) exact lookup with much less overhead); (3) the corpus is huge and you need disk-resident storage (use a B-tree or sorted run on disk). For very large dictionaries, the **compressed trie (radix tree)** collapses single-child chains and saves dramatic memory. The interviewer signal: name the memory cost, name when it's the wrong tool, name the alternatives (hash map for no-prefix, radix tree for memory pressure, suffix automaton for substring queries).

---

## Bit Manipulation

### Summary

**What this topic covers**

The pattern for "single number" / "XOR" / "powers of 2" / "count bits" / "subset enumeration with N ≤ 20" / "without using +" / "in-place numeric trick" problems. The core idioms: bit set/clear/toggle/check with shifts and masks; `n & -n` for lowest set bit; `n & (n - 1)` for clearing the lowest set bit (Brian Kernighan's bit counting); `n & (n - 1) == 0` for power-of-2 check; XOR properties (`a ^ a = 0`, `a ^ 0 = a`, commutative + associative) for "find unique" problems; subset iteration via `sub = (sub - 1) & mask`. Plus **bitmask DP** when N ≤ 20 and the state is "which of N items used". The 5 questions cover the idiom table, Single Number variants (I, II, III), Power of Two, bitmask subset iteration, and the senior-level "sum of two integers without +".

**Mental model**

Bit manipulation is the **direct-to-hardware path** for problems where the structure is binary: presence/absence, parity, power-of-2, XOR cancellation. The mental shift from arithmetic thinking is that bits compose differently than digits — XOR is "addition without carry", AND is intersection, OR is union, NOT is complement. The key idiom is **XOR's self-inverse property**: `a ^ a = 0` for any `a`, so XORing a sequence cancels out any value that appears an even number of times. This is the basis of "find the unique number where every other appears twice" (Single Number I — XOR everything, the result is the unique). For "every other appears three times" (Single Number II), the trick is more involved: track each bit independently with modulo-3 counting. For two unique numbers in a sea of pairs (Single Number III), XOR the whole array to get `a ^ b`, find any set bit (which differs between a and b), partition by that bit, XOR each half. The other family of idioms is **bit-as-set-membership**: a 32-bit integer can represent a subset of {0, 1, ..., 31}, with bit `i` set meaning "element i is in the set". This enables **bitmask DP** for problems with N ≤ 20 elements — `dp[mask]` represents "the best result using exactly the elements in mask". Senior candidates have these idioms memorised and recognise the signals ("single number", "XOR", "power of 2", "subsets of N ≤ 20") in 10 seconds.

**Key terms**

- **Bit set / clear / toggle / check** — `n | (1 << i)` / `n & ~(1 << i)` / `n ^ (1 << i)` / `n & (1 << i)`.
- **Lowest set bit** — `n & -n`; uses two's complement.
- **Clear lowest set bit** — `n & (n - 1)`; foundation of Brian Kernighan's bit count.
- **Power of 2 check** — `n > 0 and (n & (n - 1)) == 0`.
- **XOR properties** — `a ^ a = 0`, `a ^ 0 = a`, commutative, associative.
- **Brian Kernighan's bit count** — `while n: n &= n - 1; count += 1`; O(set_bits) instead of O(32).
- **Bitmask** — integer where each bit represents membership of an element in a set.
- **Subset iteration** — `sub = mask; while sub: ...; sub = (sub - 1) & mask`; enumerates all subsets of `mask` in O(2^popcount).
- **Bitmask DP** — for problems with N ≤ 20 elements; state is `dp[mask]` or `dp[mask][i]`.
- **Two's complement** — how negative numbers are represented in binary; `-n = ~n + 1`.
- **XOR for swapping** — `a ^= b; b ^= a; a ^= b` swaps without a temp; rarely useful in practice.
- **Hamming weight (popcount)** — number of set bits; Python: `bin(n).count('1')` or `n.bit_count()` (3.10+).

**Why interviewers ask this**

Three signals. (1) **Idiom fluency** — the bit-tricks table should be reflex. Senior candidates write `n & (n - 1) == 0` for power-of-2 without hesitating; junior candidates write `while n % 2 == 0: n //= 2`. (2) **XOR reasoning** — Single Number I requires recognising "XOR cancels duplicates" in 10 seconds. Single Number III escalates to "XOR the whole thing, find any set bit, partition by it, XOR each half" — a multi-step reasoning chain that tests deeper understanding. (3) **Bitmask DP recognition** — for N ≤ 20 problems, recognising bitmask DP from "assign N tasks to N people" or "shortest superstring" is the senior tell. The "sum of two integers without +" problem tests whether you can think in terms of XOR (sum without carry) and AND-then-shift (carry).

**Common confusions**

- "XOR is the same as addition" — XOR is addition *without carry*; full addition needs `(a ^ b) + (carry << 1)`, recursively.
- "Power of 2 check is `log2(n) is integer`" — works but slow and floating-point-imprecise; `n & (n - 1) == 0` is the canonical bit trick.
- "Brian Kernighan's is just `while n: n >>= 1; if n & 1: count += 1`" — that's O(log n); Kernighan's is O(set_bits), which is faster when most bits are zero.
- "Bitmask DP scales beyond N = 20" — at N = 25, 2^N = 33M (borderline); at N = 30, 2^N = 10⁹ (no). N = 20 is the practical limit.
- "I should use Python's `int.bit_length()` for count" — `bit_length()` gives the position of the highest set bit (log2 + 1), not the count.
- "Negative numbers in Python don't work with bit ops" — they do, but Python's ints are arbitrary precision, so masking with `& 0xFFFFFFFF` is needed for 32-bit semantics.

**What follows from this topic**

Bit manipulation is the foundation of **bitmask DP** (TSP, Shortest Superstring, Smallest Sufficient Team), of **bit tries** (Maximum XOR Pair), of **bloom filters** (probabilistic membership with bit arrays), of **bitboard representations** in chess engines. The XOR trick recurs in many "find the duplicate / missing" problems (Missing Number, Find the Duplicate). And the subset-iteration idiom is the foundation of subset-sum-style DP. If you can write the idiom table from memory and articulate XOR's self-inverse property, you've earned the pattern.

### Q1. Walk me through the bit-tricks table — most important idioms.

```
Check bit i is set:        n & (1 << i)
Set bit i:                 n | (1 << i)
Clear bit i:               n & ~(1 << i)
Toggle bit i:              n ^ (1 << i)
Lowest set bit:            n & -n
Clear lowest set bit:      n & (n - 1)
Power of 2 check:          n > 0 and (n & (n - 1)) == 0
Brian Kernighan's count:   while n: n &= (n - 1); count += 1
XOR find unique:           reduce(xor, nums)
Subset iteration:          sub = mask; while sub: ...; sub = (sub - 1) & mask
```

The signature ones to memorise: `n & (n - 1)` (clears lowest set bit; building block for everything), `n & -n` (isolates lowest set bit; two's complement magic), `n & (n - 1) == 0` (power of 2 check), and the subset iteration loop (gives all subsets of a mask in O(2^popcount)).

### Q2. Walk me through Single Number I, II, and III.

**Single Number I** (every other appears exactly twice, find the unique):

```python
def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result
```

XOR cancels duplicates; the unique number remains. O(N), O(1).

**Single Number II** (every other appears exactly three times):

```python
def single_number_ii(nums):
    ones = twos = 0
    for n in nums:
        ones = (ones ^ n) & ~twos
        twos = (twos ^ n) & ~ones
    return ones
```

Track each bit modulo 3 via two state variables. Tricky to derive; memorise the template.

**Single Number III** (exactly two unique numbers; rest appear twice):

```python
def single_number_iii(nums):
    xor_all = 0
    for n in nums:
        xor_all ^= n
    # xor_all = a ^ b; find any set bit (where a, b differ)
    diff_bit = xor_all & -xor_all
    a = b = 0
    for n in nums:
        if n & diff_bit:
            a ^= n
        else:
            b ^= n
    return [a, b]
```

Three steps: XOR everything (get `a ^ b`); find any differing bit (`n & -n`); partition by that bit and XOR each half (each half has one unique + pairs).

### Q3. Walk me through Counting Bits (Hamming weight for 0..N).

```python
def count_bits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
```

DP recurrence: `count(i) = count(i / 2) + (i mod 2)` — shifting right by 1 drops the lowest bit; add it back if set. O(N). Alternative: `dp[i] = dp[i & (i - 1)] + 1` (Brian Kernighan recurrence).

### Q4. Walk me through subset iteration with bitmask.

```python
mask = 0b1011  # example: subset {0, 1, 3}
sub = mask
while sub > 0:
    print(bin(sub))  # process subset
    sub = (sub - 1) & mask
# Also include the empty subset
print(bin(0))
```

Output: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000. The `(sub - 1) & mask` trick gives the next subset in reverse order; it ends when sub = 0, at which point you've processed all subsets of `mask`. O(2^popcount(mask)) per outer iteration. Used in problems like "partition into K subsets" or "minimum cost to cover all items with packs".

### Q5. Senior interview angle: walk me through sum of two integers without using `+`.

XOR gives the sum without carry; AND-then-shift gives the carry; repeat until carry is zero.

```python
def add(a, b):
    MASK = 0xFFFFFFFF
    while b != 0:
        sum_no_carry = (a ^ b) & MASK
        carry = ((a & b) << 1) & MASK
        a, b = sum_no_carry, carry
    # Handle Python's arbitrary-precision ints — convert back to signed 32-bit
    if a > 0x7FFFFFFF:
        a = ~(a ^ MASK)
    return a
```

The Python quirk: `&` and `|` don't auto-truncate to 32 bits, so masking with `0xFFFFFFFF` simulates 32-bit semantics. The two's-complement conversion at the end handles negative results. The senior tell is naming "XOR is sum-without-carry, AND-then-shift is the carry, recurse" — that's the algorithmic insight; the masking is implementation detail.

---

## Cyclic Sort & Index-as-Hash

### Summary

**What this topic covers**

The pattern for problems where the array contains integers in range `[1, N]` or `[0, N-1]` and the problem requires "find missing / duplicate" with O(1) extra space. Two related techniques: (1) **cyclic sort** — swap each number to its "correct" position (number `k` should be at index `k-1`); after one pass, any mismatch reveals duplicates and missing; (2) **index-as-hash** — mark visited indices by negating the value at that index (since values are in [1, N], negation is reversible). Both run in O(N) time, O(1) extra space, and *mutate* the input. The 5 questions cover the cyclic-sort template, the index-as-hash variant, First Missing Positive as the canonical hard problem, the Floyd's-cycle-detection alternative for Find the Duplicate Number, and the senior-level discussion of when to use each.

**Mental model**

These two techniques exploit a specific structural property: **when the values are constrained to indices of the array itself**, the array can encode information about its own contents through position (cyclic sort) or sign (index-as-hash). The brute-force "use a hash set to track seen values" works in O(N) time and O(N) space; these techniques achieve O(1) extra space by repurposing the array's existing storage. The mental shift is "the array is its own data structure — values point at positions, positions hold values, and the relationship between them encodes presence/absence". Cyclic sort proceeds by swapping each value `nums[i]` into position `nums[i] - 1` (the "correct" position for that value); when `nums[i] == nums[nums[i] - 1]`, you've hit a fixed point (either it's already correct or it's a duplicate of what's at the target position). After the sweep, any index where `nums[i] != i + 1` reveals a missing number (i+1) and a duplicate (nums[i]). Index-as-hash marks visited by negating: for each value `x`, negate `nums[abs(x) - 1]`; after the sweep, any index that's still positive corresponds to a missing number. Both work because the input domain matches the array's index domain. First Missing Positive is the canonical hard test because it requires combining cyclic sort with the realisation that "we don't care about values outside [1, N]" — those can be ignored or marked as "wrong".

**Key terms**

- **Cyclic sort** — swap each value to its "correct" position (number `k` at index `k-1`).
- **Index-as-hash** — mark visited indices by negating the value at that index.
- **Correct position** — for value `k` in 1-indexed range [1, N], the correct position is index `k - 1`.
- **Self-loop detection** — `nums[i] == nums[nums[i] - 1]` means we've hit a fixed point; advance i.
- **First Missing Positive** — the canonical hard cyclic-sort problem; values can be out of range or negative.
- **Find the Duplicate Number** — Floyd's cycle detection works because nums forms a linked list with a cycle.
- **Mutation tradeoff** — these techniques mutate the input; document this or restore.
- **Values in [1, N] vs [0, N-1]** — adjust the "correct position" formula (`k - 1` vs `k`).
- **Out-of-range values** — for First Missing Positive, treat values outside [1, N] as "ignore".
- **Set Mismatch** — find both the duplicate and the missing in one pass.

**Why interviewers ask this**

Three signals. (1) **Recognition of "values in [1, N]" + "O(1) space"** — the keyword combination should trigger cyclic sort or index-as-hash reflex. Junior candidates use a hash set; senior candidates recognise the structural constraint and reach for the in-place technique. (2) **First Missing Positive as the canonical hard test** — this problem (LeetCode 41, hard) specifically tests whether you can apply cyclic sort under added constraints (values can be negative, zero, or > N). A candidate who writes the O(N) / O(1) version is senior-tier. (3) **Floyd's cycle on Find the Duplicate** — the connection between linked-list cycle detection and "find the duplicate in [1, N]" is non-obvious; recognising it (treat `nums[i]` as a "next pointer") is the senior tell. Three different approaches are valid (sort O(N log N), set O(N) space, Floyd's O(1) space) — naming all three and picking by constraints is the staff signal.

**Common confusions**

- "Cyclic sort needs a hash set" — opposite; cyclic sort *avoids* the hash set by using the array's structure.
- "I need to track visited via an extra array" — index-as-hash uses negation in the same array; no extra space.
- "First Missing Positive needs O(N) extra space" — it doesn't; cyclic sort gives O(1).
- "Negation marking breaks when values are zero" — true; handle the zero edge case explicitly (replace zeros with N+1, then negate).
- "Cyclic sort is O(N²) because of nested loops" — it's amortised O(N); each value is swapped at most once into its correct position.
- "Floyd's cycle detection only works on linked lists" — it works on any function with finite range; treating array as a function gives Find the Duplicate.

**What follows from this topic**

Cyclic sort and index-as-hash are niche but distinctive — they show up specifically in "find missing/duplicate with O(1) space" problems and don't generalise much beyond. The mutation discipline (or restoring afterwards) is the senior practice. Floyd's cycle detection generalises beyond linked lists to any "deterministic function on a finite domain" — Happy Number uses it for cycle-in-number-transformation, Find the Duplicate uses it for cycle-in-array-as-function. If you can recognise the "values in [1, N] + O(1) space" signal and write cyclic sort from memory, you've earned the pattern.

### Q1. Walk me through cyclic sort to find all missing numbers.

```python
def find_missing(nums):
    """nums contains integers in [1, N], find all missing."""
    i = 0
    while i < len(nums):
        correct = nums[i] - 1  # position where nums[i] should be
        if nums[i] != nums[correct]:
            nums[i], nums[correct] = nums[correct], nums[i]
        else:
            i += 1
    return [j + 1 for j, x in enumerate(nums) if x != j + 1]
```

Outer loop: at each index, swap `nums[i]` to its correct position. If it's already there (or a duplicate of what's there), advance `i`. After the sweep, scan for mismatches. O(N) amortised (each value swapped at most once into its correct position).

### Q2. Walk me through index-as-hash to find all duplicates.

```python
def find_duplicates(nums):
    result = []
    for x in nums:
        i = abs(x) - 1
        if nums[i] < 0:
            result.append(abs(x))  # already negated → duplicate
        else:
            nums[i] = -nums[i]
    return result
```

For each value, negate `nums[abs(value) - 1]`. If it's already negative, you've seen this value before → duplicate. Single pass, O(N). The use of `abs()` is what makes this work even after the array has been partially negated.

### Q3. Walk me through First Missing Positive.

The first missing positive must be in `[1, N+1]` (worst case: array is `[1, 2, ..., N]`, answer is N+1). Use cyclic sort, ignoring values out of range.

```python
def first_missing_positive(nums):
    n = len(nums)
    i = 0
    while i < n:
        correct = nums[i] - 1
        if 1 <= nums[i] <= n and nums[i] != nums[correct]:
            nums[i], nums[correct] = nums[correct], nums[i]
        else:
            i += 1
    for j in range(n):
        if nums[j] != j + 1:
            return j + 1
    return n + 1
```

The guard `1 <= nums[i] <= n` is what handles out-of-range values (zeros, negatives, > N). Those get ignored — they can't be the answer to "first missing positive" (which is in [1, N+1]). O(N) / O(1).

### Q4. Walk me through Find the Duplicate Number with Floyd's cycle detection.

Treat the array as a function `f(i) = nums[i]`. Since values are in `[1, N]` and indices are `[0, N]`, this function has a finite range, and if there's a duplicate, the function has a cycle (multiple indices map to the same value, forming a back-edge).

```python
def find_duplicate(nums):
    # Phase 1: find meeting point in cycle
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    # Phase 2: find cycle start (the duplicate)
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
```

Phase 1 detects the cycle (slow and fast meet inside it); phase 2 finds the cycle start (reset slow to start, advance both by 1, they meet at the duplicate). The duplicate is the cycle start because it's where two indices point at the same value. O(N) time, O(1) space. The alternative O(N log N) is binary search on the value (count how many values ≤ mid; if > mid, the duplicate is ≤ mid).

### Q5. Senior interview angle: when do you pick cyclic sort vs index-as-hash vs Floyd's vs hash set?

**Cyclic sort**: when you need to find missing *and* duplicates and don't mind mutating. Conceptually clean for "every value should be at its correct position".

**Index-as-hash**: when you only need duplicates (or missing) and want to preserve "magnitude" (just the sign changes). Slightly less invasive than cyclic sort because you can recover the original by taking abs().

**Floyd's cycle detection**: when you need to find a single duplicate in `[1, N]` with O(1) space and *don't* want to mutate. Pure pointer arithmetic.

**Hash set**: when O(N) space is acceptable, the constraint isn't "values in [1, N]", or you can't mutate. Simplest, most general.

The senior tell: name all four, pick by constraints (mutation allowed? need duplicates *and* missing? value range?). The interview signal is "I'd reach for cyclic sort because we need both missing and duplicate without extra space; if we couldn't mutate, I'd use Floyd's for single-duplicate or a hash set for general".

---

## Math, Geometry & Stream Patterns

### Summary

**What this topic covers**

The numeric tricks that show up sporadically in interviews but are decisive when they do. Six core techniques: (1) **GCD via Euclid** — `gcd(a, b) = gcd(b, a % b)`; (2) **Sieve of Eratosthenes** — primes up to N in O(N log log N); (3) **modular exponentiation** — `pow(a, b, mod)` in O(log b); (4) **reservoir sampling** — pick K random items from a stream of unknown length, each with equal probability; (5) **Boyer-Moore majority vote** — find element appearing > N/2 times in O(N) / O(1); (6) **fast power and matrix exponentiation** — Fibonacci in O(log N) via the matrix [[1,1],[1,0]]. Plus geometric helpers: line-line intersection, point-in-polygon, convex hull (Graham scan / Andrew's monotone chain). The 5 questions cover Boyer-Moore, reservoir sampling, modular exponentiation, the Pow(x, n) iterative trick, and the senior-level reservoir-sampling proof.

**Mental model**

This is the "miscellaneous mathematical tricks" topic — patterns that don't fit into the broader algorithmic taxonomy but are individually high-leverage. The unifying theme is that each technique exploits a specific mathematical property to achieve a complexity that brute force can't reach. Euclid's GCD works because `gcd(a, b) = gcd(b, a % b)` — the recurrence converges in O(log min(a, b)) because the remainder shrinks geometrically. The Sieve of Eratosthenes works because once you've marked all multiples of every prime up to √N, the remaining unmarked numbers are prime. Modular exponentiation works because `a^b mod m = (a^(b/2))^2 mod m`, halving the exponent at each step. Reservoir sampling works because of a beautiful induction: the i-th item is kept with probability `K/i`, replacing a uniformly random one of the K currently kept; you can prove by induction that every item seen has probability exactly `K/i` of being in the reservoir at any time. Boyer-Moore works because if a majority element exists, it survives the "cancel one of each different pair" process. Matrix exponentiation generalises modular exponentiation to recurrences (Fibonacci satisfies `[F(n+1), F(n)] = M × [F(n), F(n-1)]` where M = [[1,1],[1,0]]; raise M to the N-th power in O(log N) via the same halving trick). The mental shift is that math, used carefully, replaces algorithmic brute force.

**Key terms**

- **GCD (Greatest Common Divisor)** — `gcd(a, b) = gcd(b, a % b)`; O(log min(a, b)).
- **LCM (Least Common Multiple)** — `lcm(a, b) = a * b // gcd(a, b)`.
- **Sieve of Eratosthenes** — mark all multiples of primes up to N; remaining are prime. O(N log log N).
- **Modular exponentiation** — `pow(a, b, m)` in Python; O(log b).
- **Reservoir sampling** — pick K from a stream of unknown length; for the i-th item, keep it with probability K/i, replacing a random one of the K.
- **Boyer-Moore majority vote** — track a candidate and a count; cancel mismatches; the survivor is the candidate.
- **Matrix exponentiation** — raise a transformation matrix to N to compute the N-th term of a linear recurrence in O(log N).
- **Fast power** — `a^b = (a^(b/2))^2 * (a if b odd else 1)`; O(log b).
- **Happy Number** — cycle detection in the "sum of squares of digits" iteration.
- **Pow(x, n)** — iterative version; double the base and halve the exponent.
- **Excel column conversion** — base-26 with no zero; tricky off-by-one.
- **Random Pick with Weight** — prefix sum + binary search.

**Why interviewers ask this**

Three signals. (1) **Mathematical fluency** — these tricks aren't algorithmic in the standard sense; they require seeing the math behind the problem. Junior candidates apply brute force; senior candidates recognise the math shortcut. (2) **Reservoir sampling as a streaming-systems test** — this problem is the canonical "design a uniform sampler over a stream of unknown length" and shows up in real system design (e.g. sampling for telemetry, log sampling). (3) **Boyer-Moore as a tricky-but-clean test** — Majority Element is a LeetCode easy that hides a beautiful algorithm; recognising "track a candidate, cancel mismatches" in 30 seconds is the senior signal. The matrix exponentiation trick for Fibonacci is the staff-level extension — knowing it exists, even if you don't write it from scratch, signals breadth.

**Common confusions**

- "GCD requires a loop" — recursive is one line; iterative is also fine. Both O(log min(a, b)).
- "Sieve of Eratosthenes is O(N log N)" — it's O(N log log N); the difference matters for N = 10⁸.
- "`pow(a, b, m)` is Python-only" — Java has `BigInteger.modPow`; C++ needs manual implementation.
- "Reservoir sampling for K=1 is just 'flip a coin'" — it's "replace the current with probability 1/i"; the proof requires induction.
- "Boyer-Moore guarantees a majority" — only if one exists; if not, the survivor is meaningless. Always verify with a second pass.
- "Matrix exponentiation is exotic" — it's the canonical way to compute the N-th term of any linear recurrence in O(log N).

**What follows from this topic**

These tricks are the foundation of many specialised areas: GCD/LCM underpins number theory and cryptography; the Sieve generalises to segmented sieves for primes up to 10¹⁸; modular exponentiation underpins RSA and other crypto; reservoir sampling generalises to weighted reservoir sampling (A-Res, A-ExpJ algorithms); Boyer-Moore generalises to "find all elements appearing > N/3 times" (track two candidates); matrix exponentiation generalises to any linear recurrence (Tribonacci, Lucas, etc.). If you can recognise the math signal and reach for the right trick, you've earned the pattern.

### Q1. Walk me through Boyer-Moore majority vote.

```python
def majority_element(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate
```

The algorithm: track a candidate and a count. For each element, increment count if matches, else decrement. When count hits zero, replace candidate with the current element. The survivor is the majority element (if one exists). O(N), O(1). Verify with a second pass if "majority exists" isn't guaranteed.

The intuition: pair each non-candidate with one candidate; both cancel out. If a true majority exists (> N/2 occurrences), it can't be fully cancelled — some must remain. The remaining candidate at the end is the majority.

### Q2. Walk me through reservoir sampling for K=1.

```python
import random

def reservoir_sample_one(stream):
    chosen = None
    for i, x in enumerate(stream, 1):  # 1-indexed
        if random.randint(1, i) == 1:  # keep with probability 1/i
            chosen = x
    return chosen
```

For each i-th item, replace the current chosen with probability `1/i`. After N items, each one has been chosen with probability exactly `1/N`. Proof: the i-th item is initially chosen with probability `1/i`; subsequently, it survives if none of the items (i+1)..N replace it. The probability it's *not* replaced by item j is `(j-1)/j`. So the survival probability is `(1/i) × (i/(i+1)) × ((i+1)/(i+2)) × ... × ((N-1)/N) = 1/N`. Each item has probability 1/N of being the final choice — uniform.

For K > 1, fill the reservoir with the first K items, then for the i-th item (i > K), replace a random one of the K with probability `K/i`.

### Q3. Walk me through Pow(x, n) — iterative fast power.

```python
def my_pow(x, n):
    if n < 0:
        x, n = 1 / x, -n
    result = 1.0
    while n > 0:
        if n & 1:  # n is odd
            result *= x
        x *= x  # square the base
        n >>= 1  # halve the exponent
    return result
```

The trick: at each step, if the current exponent bit is 1, multiply into result; then square the base and halve the exponent. This computes `x^n` in O(log n) instead of O(n). Same idea underlies `pow(a, b, mod)` for modular exponentiation — just mod the result at each step.

### Q4. Walk me through Happy Number.

A number is "happy" if iterating "replace with sum of squares of digits" eventually reaches 1; else it enters a cycle. Use cycle detection (Floyd's or hash set).

```python
def is_happy(n):
    def next_num(x):
        return sum(int(d) ** 2 for d in str(x))
    slow, fast = n, next_num(n)
    while fast != 1 and slow != fast:
        slow = next_num(slow)
        fast = next_num(next_num(fast))
    return fast == 1
```

Floyd's cycle detection: if fast reaches 1, n is happy; if slow == fast (cycle), n is unhappy. O(log n) per `next_num` call, O(log n) iterations total (the cycle length for non-happy numbers is bounded).

### Q5. Senior interview angle: prove that reservoir sampling for K=1 gives uniform probability.

Claim: after processing N items, each item has been the final chosen with probability exactly 1/N.

Proof by induction on N. **Base case** N=1: the only item is chosen with probability 1 = 1/1. **Inductive step**: assume true for N. At step N+1, we keep the new item with probability 1/(N+1) and the previously chosen with probability N/(N+1). By induction, each of the first N items was the chosen at step N with probability 1/N. After step N+1, each is the chosen with probability `(1/N) × (N/(N+1)) = 1/(N+1)`. The new item is the chosen with probability `1/(N+1)`. So all N+1 items have probability 1/(N+1). QED.

The senior signal is writing the induction cleanly and recognising that the algorithm's elegance comes from this exact recurrence. For K > 1, the same induction shows each item is in the reservoir with probability K/N.

---

## Advanced / Less Common

### Summary

**What this topic covers**

The patterns that show up at staff level or in HFT/quant-shop interviews — too niche to expect from every senior candidate but high-leverage when the signal appears. Recognition-first: know the name and the signal, but don't expect to implement from scratch unprepared. Twelve techniques: (1) **Segment Tree** — range queries with point updates (or range updates with lazy propagation); (2) **Fenwick Tree / BIT** — simpler than segment tree, prefix-sum range queries with point updates; (3) **Sparse Table** — O(1) range-min query on immutable arrays; (4) **Suffix Array / Suffix Automaton** — substring problems at scale; (5) **KMP / Z-algorithm / Rabin-Karp** — pattern matching in strings; (6) **Tarjan's / Kosaraju's** — strongly connected components; (7) **Tarjan's bridges and articulation points** — graph connectivity; (8) **Heavy-Light Decomposition** — path queries on trees; (9) **Mo's algorithm** — offline range queries; (10) **Convex hull** — computational geometry; (11) **Line sweep with BST** — overlapping rectangles, skyline; (12) **Manacher's algorithm** — all palindromic substrings in O(N). The 5 questions cover Segment Tree vs Fenwick Tree, KMP, Tarjan's SCC, Skyline as a line-sweep test, and the senior-level "when do you reach for advanced data structures".

**Mental model**

These are the **specialised tools** for problems that don't fit the standard 23-pattern taxonomy. Each one is the right answer for a small but well-defined class of problems: segment tree for "many range queries + point updates on mutable arrays"; Fenwick tree for "prefix-sum-style range queries + point updates" (simpler when the operation supports inverse, e.g. addition); sparse table for "many range queries on immutable arrays" (O(1) per query after O(N log N) preprocessing); KMP for "find pattern in text with O(N + M) instead of O(N × M)"; Tarjan's SCC for "find strongly connected components in directed graphs" (used in 2-SAT, condensation graphs); convex hull for computational geometry. The mental shift is **recognition over implementation**: senior candidates know the name of the right tool, the signal that calls for it, and the complexity, even if they couldn't write it from scratch in 20 minutes. Naming the tool out loud — "this is a segment tree problem because we have range-sum queries and point updates" — is the staff-level signal. Implementing it is the bonus. For interviews, the canonical advice is: if you've seen the problem family before, write the template from memory; if you haven't, articulate the choice of tool and ask the interviewer if a black-box implementation is acceptable.

**Key terms**

- **Segment tree** — binary tree over array intervals; supports range queries + point updates in O(log N). With lazy propagation, also range updates.
- **Fenwick tree (BIT, Binary Indexed Tree)** — simpler than segment tree, supports prefix-style range queries + point updates. O(log N) per op.
- **Sparse table** — O(1) range query (min, max, GCD) on immutable arrays after O(N log N) preprocessing.
- **KMP (Knuth-Morris-Pratt)** — pattern matching in O(N + M); uses a failure function (longest proper prefix that's also suffix).
- **Z-algorithm** — alternative pattern matching; O(N + M); computes longest prefix-match-length array.
- **Rabin-Karp** — rolling hash for pattern matching; O(N + M) expected; useful for "find all occurrences of multiple patterns".
- **Tarjan's SCC** — strongly connected components in directed graphs; O(V + E).
- **Kosaraju's SCC** — two DFS passes (forward + reverse graph); also O(V + E).
- **Bridges and articulation points** — Tarjan's variant for finding "critical" edges and vertices.
- **Heavy-Light Decomposition** — decompose a tree into chains; supports path queries in O(log² N).
- **Mo's algorithm** — offline range queries; sort by block then by right; O((N + Q) × √N).
- **Convex hull** — smallest convex polygon containing all points; Graham scan or Andrew's monotone chain in O(N log N).
- **Manacher's algorithm** — all palindromic substrings in O(N); avoids the O(N²) of expand-from-center.

**Why interviewers ask this**

Three signals. (1) **Recognition vocabulary** — at staff level, interviewers test whether you can name the right tool for the problem even if you can't implement it in 20 minutes. Saying "this is a segment tree problem with lazy propagation" earns credit; struggling to derive segment tree from scratch loses time. (2) **Range Sum Query - Mutable** is the canonical Fenwick tree problem; recognising it should be reflex. (3) **String matching at scale** — for "find all occurrences" problems, junior candidates write O(N × M) brute force; senior candidates name KMP / Z-algorithm / Rabin-Karp and discuss the tradeoff (KMP for single pattern, Rabin-Karp for multiple patterns or substring hashing). The Skyline Problem is the canonical line-sweep + heap test; recognising the decomposition (events + heap of active heights) is staff-level.

**Common confusions**

- "Segment tree and Fenwick tree are interchangeable" — Fenwick is simpler but only supports prefix-style range queries; segment tree handles arbitrary range operations.
- "KMP is too complex to bother with" — for "find all occurrences" interview problems, KMP or Z-algorithm is expected at senior+; brute force is a downgrade.
- "Sparse table replaces segment tree" — only for immutable arrays; mutable needs segment tree.
- "Convex hull is computational geometry, not algorithms" — interview problems do show up (Erect the Fence, Outermost Points).
- "Mo's algorithm is too obscure" — for offline range-query problems with no fast update, it's the only O((N+Q)√N) option; rare but distinctive.
- "I should implement everything from scratch" — at staff level, naming the tool and gesturing at the complexity is enough for many; full implementation only if the interviewer pushes.

**What follows from this topic**

These tools connect to many specialised problem families: segment trees underpin **count of smaller numbers after self**, **range sum query - mutable**, **range increment + range sum** (with lazy propagation); Fenwick trees underpin **count inversions** via merge sort or BIT; KMP underpins **find substring without built-ins**; Tarjan's SCC underpins **2-SAT** and **condensation graph** problems; line sweep underpins **skyline**, **rectangle area union**, **overlapping rectangles**. The Less Common section is recognition-only — don't drill these to mastery, drill them to recognition. If you can name the tool from the signal and articulate the complexity, you've earned the pattern.

### Q1. When do you reach for Segment Tree vs Fenwick Tree vs Sparse Table?

**Segment tree**: mutable array + general range operations (range sum, range min, range max, range GCD; with lazy propagation, also range updates). O(log N) per query and update. Most flexible, most code.

**Fenwick tree (BIT)**: mutable array + prefix-sum-style range queries (range sum where the operation has an inverse). Simpler code than segment tree, similar performance. Doesn't generalise to range min/max because those don't have inverses.

**Sparse table**: *immutable* array + range queries on operations that satisfy `f(a, b) = f(f(a, b'), f(b'', b))` for any decomposition (idempotent operations: min, max, GCD). O(N log N) preprocessing, O(1) per query. Best for many queries on static data.

The decision: mutable → segment tree or BIT (BIT if sum-only); immutable + many queries → sparse table; immutable + few queries → prefix sum is enough.

### Q2. Walk me through KMP at a high level.

Goal: find pattern P in text T in O(|T| + |P|) instead of brute-force O(|T| × |P|). The key idea: when a mismatch occurs at position i in T and position j in P, instead of restarting at i+1, use the **failure function** of P to skip — `fail[j]` = length of longest proper prefix of `P[:j]` that's also a suffix. So you can resume matching from `fail[j]` in P without backtracking in T.

```python
def kmp_search(text, pattern):
    # Build failure function
    m = len(pattern)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k > 0 and pattern[k] != pattern[i]:
            k = fail[k - 1]
        if pattern[k] == pattern[i]:
            k += 1
        fail[i] = k
    # Search
    n = len(text)
    j = 0
    result = []
    for i in range(n):
        while j > 0 and pattern[j] != text[i]:
            j = fail[j - 1]
        if pattern[j] == text[i]:
            j += 1
        if j == m:
            result.append(i - m + 1)
            j = fail[j - 1]
    return result
```

O(|T| + |P|). At staff level, knowing the algorithm exists and the complexity is enough; implementing from scratch in 20 minutes is bonus.

### Q3. Walk me through Skyline Problem (line sweep + heap).

Each building is `[left, right, height]`. The skyline is the set of (x, y) key points where the height changes. Approach: decompose each building into two events (left edge: building starts; right edge: building ends); sort events; sweep left-to-right; maintain a max-heap of active heights; whenever the max height changes, record the key point.

```python
import heapq

def get_skyline(buildings):
    events = []
    for L, R, H in buildings:
        events.append((L, -H, R))  # start: negative H so taller comes first at same x
        events.append((R, 0, 0))    # end marker
    events.sort()
    result = []
    heap = [(0, float('inf'))]  # (negated height, end)
    for x, neg_h, R in events:
        if neg_h != 0:  # start event
            heapq.heappush(heap, (neg_h, R))
        # Pop expired
        while heap[0][1] <= x:
            heapq.heappop(heap)
        cur_height = -heap[0][0]
        if not result or result[-1][1] != cur_height:
            result.append([x, cur_height])
    return result
```

The heap tracks currently-active buildings (each with its end coordinate for lazy expiration). At each event, lazily expire any building whose end has passed; the new max height is the heap's top. O((N + Q) log N).

### Q4. Walk me through Tarjan's SCC at a high level.

Find strongly connected components in a directed graph (a set of nodes where every pair is mutually reachable). Tarjan's uses a single DFS with two indices per node: `index` (discovery time) and `lowlink` (lowest index reachable from this subtree, considering back-edges to nodes on the current stack). When `lowlink == index` for a node, it's the root of an SCC; pop the stack until reaching it.

```python
def tarjan_scc(graph):
    index_counter = [0]
    stack = []
    lowlinks = {}
    index = {}
    on_stack = {}
    result = []
    def strongconnect(v):
        index[v] = lowlinks[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack[v] = True
        for w in graph.get(v, []):
            if w not in index:
                strongconnect(w)
                lowlinks[v] = min(lowlinks[v], lowlinks[w])
            elif on_stack.get(w):
                lowlinks[v] = min(lowlinks[v], index[w])
        if lowlinks[v] == index[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == v: break
            result.append(scc)
    for v in graph:
        if v not in index:
            strongconnect(v)
    return result
```

O(V + E). Used for 2-SAT and condensation graphs. Knowing the name and signal is enough for most senior interviews.

### Q5. Senior interview angle: when do you reach for an advanced data structure vs telling the interviewer you'd "use a segment tree" without implementing it?

The honest senior answer: at staff level, recognising the right tool and articulating the complexity is often more valuable than implementing from scratch. If the interviewer's goal is "design a system that handles range-sum queries on a mutable array with billions of updates", they want the right data structure and the right complexity bounds, not a 50-line implementation. If the goal is "implement Range Sum Query Mutable in this code window", they want the implementation.

The signal: if the problem is in the "implementation" category (a single function, 20-30 lines), implement. If it's in the "design" category (a system, many components), articulate the choice and the complexity. The phrase "I'd reach for a segment tree here because we need range updates and point queries, both O(log N); the implementation is about 50 lines so I'll sketch the structure and we can fill in details if needed" is the right register.

---

## Complexity & Edge Cases

### Summary

**What this topic covers**

The discipline of **complexity analysis** and the universal interviewer favourite — **edge cases**. The complexity cheat sheet maps N to the acceptable complexity class: N ≤ 12 → O(N!); N ≤ 20 → O(2^N · N); N ≤ 100 → O(N⁴); N ≤ 500 → O(N³); N ≤ 5,000 → O(N²); N ≤ 10⁵ → O(N log N); N ≤ 10⁶ → O(N); N ≤ 10⁸ → O(log N) or O(1). Plus the data-structure-operation table (array, linked list, hash, BST, heap, trie). And the comprehensive edge-case checklist: empty input, single element, all same elements, already sorted, negative numbers, zeros, integer overflow, linked-list edge cases, tree edge cases, graph edge cases, string edge cases, off-by-one, mutating while iterating, recursion depth. The 6 questions cover the cheat sheet, the data-structure table, integer overflow handling, the "first edge cases to check" discipline, recursion depth in Python, and the senior-level "narrate edge cases out loud as you code" practice.

**Mental model**

Complexity analysis and edge cases are the two **non-algorithmic** disciplines that separate working code from correct code. Complexity analysis is the constraint scan: read N, derive the acceptable complexity, pick a pattern that hits it. The N-to-complexity mapping is reflex for senior candidates — N = 10⁵ → O(N log N) target; N = 10⁶ → O(N); N = 20 → bitmask DP is fine. Without this calibration, you write the wrong-complexity solution and run out of time. Edge cases are the other side of the discipline: every algorithm has degenerate inputs that expose bugs (empty input, single element, all-same elements, already sorted, negative numbers, zeros), and senior candidates **enumerate them at the start of the problem**, not at the end when the tests fail. The mental shift is "edge cases aren't an afterthought — they're part of the requirements". Stating "I'll handle empty input as returning 0; single element as returning that element; the rest is the main algorithm" before writing code is the senior tell. The other recurring concerns are **integer overflow** (Java/C++ specific, Python is safe; the canonical fix is `mid = left + (right - left) // 2` for binary search), **recursion depth** (Python defaults to 1000; for deep trees or DFS on large graphs, switch to iterative), and **mutation during iteration** (Python's `list` and `dict` raise errors; iterate a copy or use indices).

**Key terms**

- **Complexity cheat sheet** — N-to-complexity mapping: N ≤ 12 (N!), N ≤ 20 (2^N), N ≤ 100 (N⁴), N ≤ 500 (N³), N ≤ 5,000 (N²), N ≤ 10⁵ (N log N), N ≤ 10⁶ (N), N ≤ 10⁸ (log N / 1).
- **Data structure ops** — array O(1) access / O(N) search; linked list O(N) access / O(1) insert at head; hash O(1) avg; BST O(log N) balanced; heap O(log N) push/pop, O(1) peek; trie O(L) per op.
- **Comparison sort lower bound** — Ω(N log N); counting / radix sort O(N) when values bounded.
- **First edge cases** — empty input (`[]`, `""`, `None`); single element; all same; already sorted / reverse sorted; negative numbers; zeros.
- **Linked list edge cases** — empty, single node, two nodes, even/odd length, cycle starts at head.
- **Tree edge cases** — empty, single node, skewed (linked-list shape), perfect.
- **Graph edge cases** — disconnected, self-loops, multi-edges, single node, cycle.
- **String edge cases** — Unicode, case sensitivity, whitespace, empty.
- **Off-by-one** — `range(n)` vs `range(n+1)`, `<` vs `<=`, inclusive vs exclusive bounds.
- **Integer overflow** — `mid = (left + right) // 2` overflows in Java/C++; use `left + (right - left) // 2`. Python is safe.
- **Recursion depth** — Python default 1000; use `sys.setrecursionlimit(10**6)` or iterative for deep DFS.
- **Mutating while iterating** — Python `list` iteration breaks; iterate a copy or use indices.

**Why interviewers ask this**

Three signals. (1) **Complexity discipline as a pre-coding check** — senior candidates state the target complexity *before* writing code, derived from N. Junior candidates write code first and discover it's too slow. The "scan constraints, derive target, pick pattern" sequence is the senior tell. (2) **Edge case enumeration upfront** — narrating "I'll handle empty, single element, duplicates first, then the main algorithm" earns credit even before you write a line. Junior candidates skip this and discover edge cases via failing tests. (3) **Integer overflow awareness in Java/C++** — for Java/C++/Rust interviews, the binary-search `(left + right) // 2` overflow is a classic trap. Knowing the `left + (right - left) // 2` fix is the language-specific senior signal. For Python, no overflow, but knowing the trick exists shows breadth.

**Common confusions**

- "Complexity is hard to derive — I'll just submit and see" — interviewers want you to state it before coding; submitting blind is a downgrade.
- "Edge cases are the testing team's job" — they're yours, in interviews. Enumerate them at the start.
- "Python doesn't have overflow, so I don't need to worry" — true for Python, but if you say "I'd use `left + (right - left) // 2` in Java/C++ to avoid overflow", you signal breadth.
- "Recursion depth is fine for typical problems" — for trees of depth 10,000+ or graphs with deep DFS, Python's default of 1000 stack frames bites. Use iterative or `sys.setrecursionlimit`.
- "Mutating while iterating is fine in Python" — it raises `RuntimeError: dictionary changed size during iteration` for dicts and gives subtle bugs for lists. Iterate a copy: `for x in list(items):`.
- "Empty input edge case is trivial" — until your O(N) loop tries to access `nums[0]` and crashes.

**What follows from this topic**

Complexity and edge cases are the meta-disciplines that apply to every pattern in this primer. They're what the interviewer is *implicitly* grading on every problem — not just "does the code work" but "does the candidate scan constraints, derive target complexity, enumerate edge cases, narrate the analysis". If you internalise the cheat sheet and the edge-case checklist, every problem becomes easier because you've front-loaded the analysis. And the senior interview signal — narrate constraints, complexity, edge cases all out loud — is what separates "writes working code" from "thinks like a staff engineer".

### Q1. Walk me through the complexity cheat sheet.

| N | Acceptable complexity |
|---|---|
| ≤ 12 | O(N!) — permutations |
| ≤ 20 | O(2^N · N) — bitmask DP |
| ≤ 100 | O(N⁴) — quadruple loop |
| ≤ 500 | O(N³) — Floyd-Warshall, interval DP |
| ≤ 5,000 | O(N²) — basic DP, brute pairs |
| ≤ 10⁵ | O(N log N) — sort, heap, segment tree |
| ≤ 10⁶ | O(N) — sliding window, hash, two pointers |
| ≤ 10⁸ | O(log N) or O(1) — math, bit tricks |

The interviewer expects you to derive these on the fly: 10⁹ ops/sec is the rough budget for an interpreted language; 10⁸ for Python; O(N²) at N = 10⁵ is 10¹⁰ — too slow. Reading N and naming the target complexity before coding is the senior tell.

### Q2. Walk me through the data-structure-operation table.

| Operation | Array | Linked List | Hash | BST (balanced) | Heap | Trie |
|---|---|---|---|---|---|---|
| Access by index | O(1) | O(N) | — | O(log N) | — | — |
| Search | O(N) | O(N) | O(1) avg | O(log N) | O(N) | O(L) |
| Insert at end | O(1) amort | O(1) | O(1) | O(log N) | O(log N) | O(L) |
| Insert at front | O(N) | O(1) | — | O(log N) | — | — |
| Delete | O(N) | O(1) given node | O(1) | O(log N) | O(log N) | O(L) |
| Min / Max | O(N) | O(N) | O(N) | O(log N) | O(1) | — |

Internalise this — the "best data structure" choice in interviews is almost always derivable from the operation mix. For example, "frequent insert + frequent min" → heap; "frequent insert + sorted iteration" → BST or sorted list; "frequent membership check" → hash set; "prefix queries" → trie.

### Q3. What's the integer overflow trap in binary search?

In Java/C++/Rust with 32-bit integers, `(left + right) // 2` overflows when both are near INT_MAX. The fix: `left + (right - left) // 2` — same value, no overflow. Python uses arbitrary-precision integers, so this is a non-issue, but the habit is portable. The other common overflow site: matrix product accumulation; use `long` (Java) or `int64_t` (C++) or check for overflow explicitly. For sum of many large numbers, sum into a long.

### Q4. Walk me through the "first edge cases to check" list.

The interview discipline: at the start of every problem, enumerate these out loud and decide how to handle each.

1. **Empty input** — `[]`, `""`, `None`. Often "return 0", "return empty", "return -1".
2. **Single element** — degenerate cases for many algorithms.
3. **All same elements** — exposes off-by-one in deduplication.
4. **Already sorted / reverse sorted** — exposes O(N²) quicksort, O(N) edge of binary search.
5. **Negative numbers** — breaks sliding window (sum non-monotonic), Dijkstra.
6. **Zeros** — break product-style problems, divisions.
7. **Maximum / minimum constraint values** — INT_MAX / INT_MIN, overflow potential.
8. **Duplicate values** — breaks "first occurrence" assumptions; need explicit tie-breaking.

Naming these *before* coding is the senior signal. "I'll handle empty input by returning early; single element returns the element; everything else hits the main algorithm" earns credit even before you write the first line.

### Q5. What's the trap with recursion depth in Python?

Python's default recursion limit is 1000. For deep trees, DFS on large graphs (V > 1000), or recursive DP with depth N, you'll hit `RecursionError`. Two fixes:

1. `sys.setrecursionlimit(10**6)` — increases the limit; may still crash due to actual stack overflow at the OS level (Python is a stack-grown-on-thread-stack language). Safe for small increments.
2. **Convert to iterative** — use an explicit stack or queue. More work but guaranteed safe. Iterative DFS:

```python
def dfs_iterative(start, graph):
    visited = set()
    stack = [start]
    while stack:
        u = stack.pop()
        if u in visited: continue
        visited.add(u)
        for v in graph[u]:
            if v not in visited:
                stack.append(v)
```

The senior tell: name the trap, name both fixes, pick by problem size. For LeetCode-style problems with N ≤ 10⁵, `sys.setrecursionlimit(10**6)` is usually safe.

### Q6. Senior interview angle: walk me through your edge-case narration practice.

Out loud, at the start of every problem:

(1) **State the constraints** — "N is up to 10⁵, values are in [-10⁹, 10⁹]". (2) **Derive target complexity** — "10⁵ → O(N log N) target". (3) **Enumerate edge cases** — "empty array → return 0; single element → return the element; all negatives → ..."; "duplicates → I'll handle by ..."; "if values can overflow ints in Java, I'll use long". (4) **Name the pattern** — "this is a [sliding window / DP / binary search on answer] problem because [signal]". (5) **Sketch the algorithm at a high level** before any code.

The narration earns credit for *process*, not just outcome. Even if you don't finish coding, the interviewer has heard your full analysis and can grade your reasoning. Junior candidates skip the narration and dive into code; senior candidates frontload the analysis. The interviewer's notes will reflect this difference.

---

## Closing — Bring Receipts

### Summary

**What this topic covers**

The final consolidation — a quick-reference cheat list of every pattern recognition signal from the primer, plus the drill discipline for turning recognition into reflex. The signals: N-to-complexity mapping; sorted array → two pointers or binary search; contiguous subarray with constraint → sliding window; "sum / count / property equals K" on subarrays → prefix sum + hash map; "next greater / previous smaller / sliding max" → monotonic stack/deque; "Kth / top K" → heap (or quickselect); "median of stream" → two heaps; intervals → sort by start + sweep; "prerequisites / dependencies" → topological sort; "connected components / dynamic union" → Union Find; unweighted shortest → BFS; non-negative weighted shortest → Dijkstra; negative weights → Bellman-Ford; all-pairs with V ≤ 400 → Floyd-Warshall; "permutations / combinations / subsets / all possible" → backtracking; "number of ways / longest subseq / minimum ops / can reach" → DP; "prefix / autocomplete" → trie; "single number / power of 2 / XOR" → bit manipulation; "array of integers in [1, N], O(1) space" → cyclic sort or index-as-hash. Plus the language-specific reminders: Python heapq is min-only (negate for max); Floyd's cycle detection for "find cycle start"; Dijkstra with `if d > dist[u]: continue` for lazy stale-entry skip; "state, transition, base, order, answer" — the DP five.

**Mental model**

The senior coding interview isn't about knowing more algorithms — it's about **recognising the algorithm faster**. The 23 patterns in this primer cover 95% of LeetCode; the recognition tree and signal tables in topics 1 and 2 compress the recognition step from "five minutes of staring" to "thirty seconds of pattern naming". The Closing section is the consolidated quick-reference — the signals you should be able to recite from memory in the morning before an interview. The drill discipline is daily: read five random LeetCode prompts, name the pattern in thirty seconds each, then check your guess. Over weeks, the recognition becomes reflex; over months, you can name the pattern from the *first sentence* of the prompt, before reading the constraints. That's the goal state — the difference between candidates who lose interviews to "I spent 20 minutes recognising what pattern it was" and candidates who name it in 30 seconds and spend the remaining 40 minutes coding cleanly with full edge-case discipline. The closing advice from the vault note: "drill until reflex. Most senior candidates lose interviews not because they can't write the code but because they spend 20 minutes recognising what pattern it is. Get that down to 30 seconds and the rest is mechanical."

**Key terms**

- **Recognition reflex** — naming the pattern from the prompt in under 30 seconds.
- **Signal table** — the keyword-to-pattern lookup (sorted array → two pointers, etc.).
- **Brute-force baseline** — always state O(N²) or O(2^N) brute force before optimising; shows the interviewer you understand the comparison.
- **Edge-case narration** — enumerate empty, single, duplicates, negatives, sorted before coding.
- **Complexity scan** — derive target complexity from N before picking a pattern.
- **State definition discipline** — for DP, define `dp[i][j]` in one precise sentence before writing the transition.
- **Amortised analysis** — sliding window, monotonic stack/deque, Union Find — name "amortised O(N)" out loud.
- **Senior tell** — naming the tradeoff (heap vs quickselect vs bucket sort), the alternative algorithm (Dijkstra vs Bellman-Ford), the proof (greedy correctness via exchange argument).
- **Drill schedule** — five prompts a day, name the pattern in 30 seconds, then verify.
- **Companion to NeetCode 150** — this primer is the recognition layer; NeetCode is the worked examples.

**Why interviewers ask this**

Three signals come together in every coding round. (1) **Recognition speed** — the interviewer is watching the clock. Forty-five minutes total; ten for problem reading and clarifying; thirty for coding; five for testing. Spend twenty on recognition and you'll be coding under time pressure. (2) **Process visibility** — narrating constraints, complexity, pattern, edge cases earns credit even if you don't finish. The interviewer's notes capture *what you said*, not just *what you wrote*. (3) **Senior signals at every step** — the cumulative effect of "stated brute force, stated target complexity, named the pattern in 30 seconds, enumerated edge cases, narrated the algorithm before coding, named the amortised analysis, named the alternative algorithm with tradeoffs". Each one is a small upgrade signal; together they're decisive.

**Common confusions**

- "I just need to memorise more problems" — no; memorise more *patterns*. 30 patterns cover everything.
- "Speed comes from typing fast" — no; speed comes from skipping the 20-minute recognition phase.
- "If I can solve the problem, the rest is gravy" — no; the narration is the senior signal. Solving without narrating earns less credit than partially solving with narration.
- "Edge cases are an afterthought" — they're the pre-thought. Enumerate them before coding.
- "Optimal complexity is the only thing that matters" — wrong; getting to a working brute force then optimising is often the safer path than reaching for the optimal first.
- "Pattern recognition gets you only so far" — wrong; pattern recognition compounded with template fluency *is* coding interview success.

**What follows from this topic**

This is the closing topic — what follows is your daily practice. The drill: pick five random NeetCode-150 problems each morning; read each prompt; close your eyes; name the pattern in 30 seconds (out loud); name the brute force; name the optimal; name two edge cases; then verify by reading the solution. Over weeks, you'll find the recognition becomes faster, the templates become reflexive, and the edge-case enumeration becomes automatic. The goal state isn't "I've seen this exact problem before" — it's "I see the pattern from the first sentence and the rest is mechanical". Drill until that's reflex. The interview is won in the first 30 seconds.

### Q1. Recite the complexity-by-N cheat list.

- N ≤ 20 → backtracking / bitmask DP (2^N · N is fine).
- N ≤ 100 → O(N⁴) quadruple loop is fine.
- N ≤ 500 → O(N³) Floyd-Warshall, interval DP.
- N ≤ 5,000 → O(N²) basic DP, brute pairs.
- N ≤ 10⁵ → O(N log N) target — sort, heap, segment tree.
- N ≤ 10⁶ → O(N) — sliding window, hash, two pointers.
- N ≥ 10⁷ → O(log N) or O(1) — math, bit tricks, binary search on answer.

State this *before* coding. If your algorithm doesn't fit, switch patterns before writing a line.

### Q2. Recite the keyword-to-pattern signals.

- **Sorted array, pair sums** → two pointers.
- **Contiguous subarray with constraint** → sliding window.
- **Subarray sum / count / property equals K** → prefix sum + hash map.
- **Next greater / previous smaller / sliding max** → monotonic stack or deque.
- **Kth / top K** → heap of size K (or quickselect for O(N) avg).
- **Median of stream** → two heaps.
- **Intervals / meetings** → sort by start, sweep.
- **Prerequisites / build order** → topological sort.
- **Connected components / dynamic union** → DFS, BFS, or Union Find.
- **Unweighted shortest path** → BFS.
- **Non-negative weighted shortest** → Dijkstra.
- **Negative weights** → Bellman-Ford.
- **All-pairs, V ≤ 400** → Floyd-Warshall.
- **Permutations / combinations / subsets / all possible** → backtracking.
- **Number of ways / longest subseq / can reach / minimum ops** → DP.
- **Prefix / autocomplete / word search** → trie.
- **Single number / XOR / power of 2** → bit manipulation.
- **Array of integers in [1, N], O(1) space** → cyclic sort or index-as-hash.

Read each one aloud. The signal should map to the pattern in under a second.

### Q3. Recite the language-specific gotchas.

- **Python heapq is min-only** — negate values for max-heap behaviour.
- **Floyd's cycle detection** — for "find cycle start in linked list".
- **Dijkstra with `if d > dist[u]: continue`** — lazy stale-entry skip in Python (no decrease-key).
- **Integer overflow** — `mid = (left + right) // 2` in Java/C++; Python is safe.
- **Recursion depth** — Python default 1000; `sys.setrecursionlimit(10**6)` for deep DFS.
- **DP five questions** — state, transition, base, order, answer.
- **Amortised analysis** — name it for sliding window, monotonic stack/deque, Union Find.

These are the language- and pattern-specific reminders that catch even prepared candidates.

### Q4. Walk me through your pre-coding narration ritual.

(1) Restate the problem in your own words to confirm understanding. (2) State the constraints — N range, value range, time limit. (3) Derive target complexity from N. (4) Enumerate edge cases — empty, single, duplicates, negatives, sorted. (5) State the brute-force baseline complexity. (6) Name the pattern and articulate the signal that led you to it. (7) Sketch the algorithm at a high level (state, transition, traversal order — whichever applies). (8) Start coding.

This is 60-90 seconds of narration. Junior candidates skip steps 1-7 and start at 8; senior candidates do all eight. The interviewer is grading on *what you say*, not just what you write.

### Q5. What's your daily drill schedule?

The recommended pace: five LeetCode prompts per day, each given 30-60 seconds for pattern recognition before checking the solution. Drill the **Recognition Decision Tree** and the **Pattern Signal Tables** at the start of every session — these compress the recognition step. Over four weeks, you'll find:

- Week 1: recognition takes 2-3 minutes per problem; pattern is often wrong.
- Week 2: recognition takes 1-2 minutes; pattern is right ~70% of the time.
- Week 3: recognition takes 30-60 seconds; pattern is right ~90% of the time.
- Week 4: recognition is reflex; pattern is right ~95% of the time, often from the first sentence.

That's the goal state. Drill until reflex.

### Q6. Closing senior interview angle: what's the one piece of advice that compounds the most?

**Recognition speed compounds**. Every other interview skill (template fluency, edge-case discipline, complexity narration, alternative-algorithm awareness) gets *more time to operate* when recognition is fast. If recognition takes 30 seconds instead of 20 minutes, you have an extra 19.5 minutes for coding, testing, edge cases, and the senior-level narration. That extra time is what separates "barely solved" from "solved cleanly with full discipline".

The drill: read five LeetCode prompts daily, name the pattern in 30 seconds out loud, verify. Do this for four weeks and your interview performance changes qualitatively. The 23 patterns in this primer cover 95% of what you'll see. Drill them until recognition is reflex — and bring receipts.

---
