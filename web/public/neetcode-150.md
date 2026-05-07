---
created-on: "[[Journal/2026/April/12-Apr-Sunday]]"
ctime: 2026-04-12 20:02:45
categories:
  - "[[Categories/Algorithms|Algorithms]]"
---
### 1. Two Sum

#### Problem
Given an array of integers and a target, return the indices of the two numbers that add up to the target. Each input has exactly one solution; you may not use the same element twice.

#### Pattern
**Hashmap (one-pass complement lookup).** **O(n)** time, **O(n)** space.

#### Explanation
The brute-force approach checks every pair — `O(n²)` time. The trick: as you walk the array left to right, for each number `n` at index `i`, the question "is there a partner that completes the sum?" reduces to "have I already seen `target - n`?" That's an `O(1)` hashmap lookup. So you scan once: at each index, compute the complement, check the map, and only if it's not there do you record the current `n → i`. The first time the complement check succeeds, you return both indices. Recording happens *after* the check, so you can never accidentally pair an element with itself.

#### Solution

```python
def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        comp = target - n
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i
```

```rust
use std::collections::HashMap;

fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    let mut seen: HashMap<i32, i32> = HashMap::new();
    for (i, &n) in nums.iter().enumerate() {
        let comp = target - n;
        if let Some(&j) = seen.get(&comp) {
            return vec![j, i as i32];
        }
        seen.insert(n, i as i32);
    }
    vec![]
}
```

```go
func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, n := range nums {
        comp := target - n
        if j, ok := seen[comp]; ok {
            return []int{j, i}
        }
        seen[n] = i
    }
    return nil
}
```

```cpp
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); ++i) {
        int comp = target - nums[i];
        auto it = seen.find(comp);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}
```
### 2. Add Two Numbers

#### Problem
Given two non-empty linked lists representing non-negative integers stored in reverse order (ones digit first), add the two numbers and return the sum as a linked list in the same reversed format.

#### Pattern
**Linked list traversal with carry.** **O(max(m, n))** time, **O(max(m, n))** space.

#### Explanation
The numbers are already in the convenient ones-first order, so you can walk both lists simultaneously and simulate grade-school addition. At each step, sum the two node values (defaulting to 0 when a list is exhausted) plus any carry from the previous step. The digit to store is `val % 10` and the new carry is `val // 10`. A dummy head node eliminates the special case of building the first node. The loop condition `while l1 or l2 or carry` handles lists of unequal length and a final carry (e.g., 99 + 1 = 100) without extra code. Edge case: both lists can have different lengths, and there may be a final carry after both lists are consumed.

#### Solution

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def addTwoNumbers(l1, l2):
    dummy = ListNode()
    curr = dummy
    carry = 0
    while l1 or l2 or carry:
        val = carry
        if l1:
            val += l1.val
            l1 = l1.next
        if l2:
            val += l2.val
            l2 = l2.next
        carry, val = val // 10, val % 10
        curr.next = ListNode(val)
        curr = curr.next
    return dummy.next
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}

impl ListNode {
    fn new(val: i32) -> Self { ListNode { val, next: None } }
}

fn add_two_numbers(
    mut l1: Option<Box<ListNode>>,
    mut l2: Option<Box<ListNode>>,
) -> Option<Box<ListNode>> {
    let mut dummy = ListNode::new(0);
    let mut curr = &mut dummy;
    let mut carry = 0;
    while l1.is_some() || l2.is_some() || carry != 0 {
        let mut val = carry;
        if let Some(node) = l1 {
            val += node.val;
            l1 = node.next;
        }
        if let Some(node) = l2 {
            val += node.val;
            l2 = node.next;
        }
        carry = val / 10;
        curr.next = Some(Box::new(ListNode::new(val % 10)));
        curr = curr.next.as_mut().unwrap();
    }
    dummy.next
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {
    dummy := &ListNode{}
    curr := dummy
    carry := 0
    for l1 != nil || l2 != nil || carry != 0 {
        val := carry
        if l1 != nil {
            val += l1.Val
            l1 = l1.Next
        }
        if l2 != nil {
            val += l2.Val
            l2 = l2.Next
        }
        carry = val / 10
        curr.Next = &ListNode{Val: val % 10}
        curr = curr.Next
    }
    return dummy.Next
}
```

```cpp
#include <memory>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy;
    ListNode* curr = &dummy;
    int carry = 0;
    while (l1 || l2 || carry) {
        int val = carry;
        if (l1) { val += l1->val; l1 = l1->next; }
        if (l2) { val += l2->val; l2 = l2->next; }
        carry = val / 10;
        curr->next = new ListNode(val % 10);
        curr = curr->next;
    }
    return dummy.next;
}
```

### 3. Median of Two Sorted Arrays

#### Problem
Given two sorted arrays `nums1` and `nums2`, return the median of the combined sorted array. The solution must run in `O(log(min(m, n)))` time.

#### Pattern
**Binary search on partition.** **O(log(min(m, n)))** time, **O(1)** space.

#### Explanation
A naive approach merges both arrays and picks the middle element — `O(m + n)` time. The key insight is that the median is determined by a partition: split both arrays so that every element on the left of the partition is at most every element on the right, and the left half contains exactly `(m + n + 1) / 2` elements. Binary search on the shorter array's partition index `i`; the partner index `j = half - i` follows automatically. At each midpoint, check whether `left1 <= right2` and `left2 <= right1`; if so, the partition is correct. If `left1 > right2`, move `i` left; otherwise move it right. Use `-∞` and `+∞` as sentinels for out-of-bounds accesses. For even total length, the median is the average of the two middle values.

#### Solution

```python
def findMedianSortedArrays(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    lo, hi = 0, m
    half = (m + n + 1) // 2

    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i

        left1  = nums1[i - 1] if i > 0 else float('-inf')
        left2  = nums2[j - 1] if j > 0 else float('-inf')
        right1 = nums1[i]     if i < m else float('inf')
        right2 = nums2[j]     if j < n else float('inf')

        if left1 <= right2 and left2 <= right1:
            if (m + n) % 2:
                return float(max(left1, left2))
            return (max(left1, left2) + min(right1, right2)) / 2.0
        elif left1 > right2:
            hi = i - 1
        else:
            lo = i + 1
    return 0.0
```

```rust
fn find_median_sorted_arrays(nums1: Vec<i32>, nums2: Vec<i32>) -> f64 {
    let (a, b) = if nums1.len() <= nums2.len() {
        (&nums1, &nums2)
    } else {
        (&nums2, &nums1)
    };
    let m = a.len();
    let n = b.len();
    let half = (m + n + 1) / 2;
    let (mut lo, mut hi) = (0usize, m);

    loop {
        let i = (lo + hi) / 2;
        let j = half - i;

        let left1  = if i > 0 { a[i - 1] as i64 } else { i64::MIN };
        let left2  = if j > 0 { b[j - 1] as i64 } else { i64::MIN };
        let right1 = if i < m { a[i] as i64 }     else { i64::MAX };
        let right2 = if j < n { b[j] as i64 }     else { i64::MAX };

        if left1 <= right2 && left2 <= right1 {
            if (m + n) % 2 == 1 {
                return left1.max(left2) as f64;
            }
            return (left1.max(left2) + right1.min(right2)) as f64 / 2.0;
        } else if left1 > right2 {
            hi = i - 1;
        } else {
            lo = i + 1;
        }
    }
}
```

```go
func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {
    if len(nums1) > len(nums2) {
        nums1, nums2 = nums2, nums1
    }
    m, n := len(nums1), len(nums2)
    half := (m + n + 1) / 2
    lo, hi := 0, m

    for lo <= hi {
        i := (lo + hi) / 2
        j := half - i

        left1, left2, right1, right2 := math.MinInt64, math.MinInt64, math.MaxInt64, math.MaxInt64
        if i > 0 { left1 = nums1[i-1] }
        if j > 0 { left2 = nums2[j-1] }
        if i < m { right1 = nums1[i] }
        if j < n { right2 = nums2[j] }

        if left1 <= right2 && left2 <= right1 {
            if (m+n)%2 == 1 {
                return float64(max(left1, left2))
            }
            return float64(max(left1, left2)+min(right1, right2)) / 2.0
        } else if left1 > right2 {
            hi = i - 1
        } else {
            lo = i + 1
        }
    }
    return 0.0
}

func max(a, b int) int {
    if a > b { return a }
    return b
}
func min(a, b int) int {
    if a < b { return a }
    return b
}
```

```cpp
#include <vector>
#include <climits>
#include <algorithm>

double findMedianSortedArrays(std::vector<int>& nums1, std::vector<int>& nums2) {
    if (nums1.size() > nums2.size()) std::swap(nums1, nums2);
    int m = (int)nums1.size(), n = (int)nums2.size();
    int half = (m + n + 1) / 2;
    int lo = 0, hi = m;

    while (lo <= hi) {
        int i = (lo + hi) / 2;
        int j = half - i;

        long left1  = (i > 0) ? nums1[i - 1] : LLONG_MIN;
        long left2  = (j > 0) ? nums2[j - 1] : LLONG_MIN;
        long right1 = (i < m) ? nums1[i]     : LLONG_MAX;
        long right2 = (j < n) ? nums2[j]     : LLONG_MAX;

        if (left1 <= right2 && left2 <= right1) {
            if ((m + n) % 2 == 1) return (double)std::max(left1, left2);
            return (std::max(left1, left2) + std::min(right1, right2)) / 2.0;
        } else if (left1 > right2) {
            hi = i - 1;
        } else {
            lo = i + 1;
        }
    }
    return 0.0;
}
```

### 4. Longest Palindromic Substring

#### Problem
Given a string `s`, return the longest substring that is a palindrome. If there are multiple answers of the same length, return any one of them.

#### Pattern
**Expand around center.** **O(n²)** time, **O(1)** space.

#### Explanation
A brute-force approach checks all `O(n²)` substrings and verifies each in `O(n)`, giving `O(n³)` overall. The expand-around-center insight is that every palindrome has a center — either a single character (odd length) or a pair of identical characters (even length). By trying all `2n - 1` centers and expanding outward as long as characters match, each expansion is `O(n)` worst case and the total is `O(n²)`. No extra space is needed beyond tracking the best result. A linear-time solution (Manacher's algorithm) exists but is rarely expected in interviews. Edge case: empty string or single character are trivially palindromes.

#### Solution

```python
def longestPalindrome(s):
    res = ""

    def expand(l, r):
        nonlocal res
        while l >= 0 and r < len(s) and s[l] == s[r]:
            if r - l + 1 > len(res):
                res = s[l:r + 1]
            l -= 1
            r += 1

    for i in range(len(s)):
        expand(i, i)
        expand(i, i + 1)

    return res
```

```rust
fn longest_palindrome(s: String) -> String {
    let b = s.as_bytes();
    let n = b.len();
    if n == 0 { return String::new(); }
    let (mut best_start, mut best_len) = (0usize, 1usize);

    let expand = |mut l: isize, mut r: isize| -> (usize, usize) {
        while l >= 0 && r < n as isize && b[l as usize] == b[r as usize] {
            l -= 1;
            r += 1;
        }
        ((l + 1) as usize, (r - l - 1) as usize)
    };

    for i in 0..n {
        let (s1, l1) = expand(i as isize, i as isize);
        if l1 > best_len { best_start = s1; best_len = l1; }
        if i + 1 < n {
            let (s2, l2) = expand(i as isize, (i + 1) as isize);
            if l2 > best_len { best_start = s2; best_len = l2; }
        }
    }
    s[best_start..best_start + best_len].to_string()
}
```

```go
func longestPalindrome(s string) string {
    n := len(s)
    if n == 0 { return "" }
    bestStart, bestLen := 0, 1

    expand := func(l, r int) {
        for l >= 0 && r < n && s[l] == s[r] {
            if r-l+1 > bestLen {
                bestLen = r - l + 1
                bestStart = l
            }
            l--
            r++
        }
    }

    for i := 0; i < n; i++ {
        expand(i, i)
        expand(i, i+1)
    }
    return s[bestStart : bestStart+bestLen]
}
```

```cpp
#include <string>
#include <algorithm>

std::string longestPalindrome(std::string s) {
    int n = (int)s.size();
    if (n == 0) return "";
    int bestStart = 0, bestLen = 1;

    auto expand = [&](int l, int r) {
        while (l >= 0 && r < n && s[l] == s[r]) { --l; ++r; }
        int len = r - l - 1;
        if (len > bestLen) { bestLen = len; bestStart = l + 1; }
    };

    for (int i = 0; i < n; ++i) {
        expand(i, i);
        expand(i, i + 1);
    }
    return s.substr(bestStart, bestLen);
}
```
### 5. Coin Change II

#### Problem
Given an integer `amount` and an array of coin denominations, return the number of combinations (not permutations) of coins that sum to `amount`. You may use each coin denomination an unlimited number of times.

#### Pattern
**DP (unbounded knapsack).** **O(n * amount)** time, **O(amount)** space.

#### Explanation
This is the classic "combination count" variant of the unbounded knapsack. `dp[a]` represents the number of ways to make amount `a`. Initialize `dp[0] = 1` (one way to make 0: use no coins). For each coin, iterate amounts from `coin` to `amount` and add `dp[a - coin]` to `dp[a]`. The outer loop over coins ensures we count combinations, not permutations — each coin is "committed" before moving to the next, so (1, 2) and (2, 1) are counted once. The naive recursive approach without memoization has exponential branches; the DP collapses overlapping subproblems to `O(n * amount)`.

#### Solution

```python
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1
    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin]
    return dp[amount]
```

```rust
fn change(amount: i32, coins: Vec<i32>) -> i32 {
    let amount = amount as usize;
    let mut dp = vec![0i32; amount + 1];
    dp[0] = 1;
    for coin in coins {
        let coin = coin as usize;
        for a in coin..=amount {
            dp[a] += dp[a - coin];
        }
    }
    dp[amount]
}
```

```go
func change(amount int, coins []int) int {
    dp := make([]int, amount+1)
    dp[0] = 1
    for _, coin := range coins {
        for a := coin; a <= amount; a++ {
            dp[a] += dp[a-coin]
        }
    }
    return dp[amount]
}
```

```cpp
#include <vector>

int change(int amount, std::vector<int>& coins) {
    std::vector<int> dp(amount + 1, 0);
    dp[0] = 1;
    for (int coin : coins) {
        for (int a = coin; a <= amount; ++a) {
            dp[a] += dp[a - coin];
        }
    }
    return dp[amount];
}
```

### 6. Reverse Integer

#### Problem
Given a 32-bit signed integer `x`, return `x` with its digits reversed. If the reversed integer overflows the 32-bit signed range `[-2³¹, 2³¹ - 1]`, return 0.

#### Pattern
**Math (digit extraction).** **O(log x)** time, **O(1)** space.

#### Explanation
Extract digits one at a time by repeatedly taking `x % 10` (the last digit) and building the result with `res = res * 10 + digit`, then dividing `x` by 10. The number of iterations is proportional to the number of digits, which is `O(log x)`. The key constraint is overflow: in C++ or Rust the multiplication could silently wrap, so you must check bounds before or after constructing the result. Python integers are arbitrary precision, so you check the final result against the 32-bit range. Strip the sign first, reverse the absolute value, then reapply the sign — this avoids dealing with negative modulo behavior in languages where it differs. Edge case: `x = -2147483648` reverses to a value that exceeds `INT_MAX`, so it must return 0.

#### Solution

```python
def reverse(x):
    sign = -1 if x < 0 else 1
    x = abs(x)
    res = 0
    while x:
        res = res * 10 + x % 10
        x //= 10
    res *= sign
    if res < -(2**31) or res > 2**31 - 1:
        return 0
    return res
```

```rust
fn reverse(x: i32) -> i32 {
    let mut x = x;
    let mut res: i32 = 0;
    while x != 0 {
        let digit = x % 10;
        x /= 10;
        if let Some(v) = res.checked_mul(10).and_then(|r| r.checked_add(digit)) {
            res = v;
        } else {
            return 0;
        }
    }
    res
}
```

```go
import "math"

func reverse(x int) int {
    res := 0
    for x != 0 {
        res = res*10 + x%10
        x /= 10
    }
    if res < math.MinInt32 || res > math.MaxInt32 {
        return 0
    }
    return res
}
```

```cpp
#include <climits>

int reverse(int x) {
    long res = 0;
    while (x != 0) {
        res = res * 10 + x % 10;
        x /= 10;
    }
    if (res < INT_MIN || res > INT_MAX) return 0;
    return (int)res;
}
```

### 7. Contains Duplicate

#### Problem
Given an integer array `nums`, return `true` if any value appears at least twice, and `false` if every element is distinct.

#### Pattern
**Hashset membership check.** **O(n)** time, **O(n)** space.

#### Explanation
The brute-force approach compares every pair in `O(n²)`. Sorting reduces this to `O(n log n)` by making duplicates adjacent, but the hashset approach is the fastest: insert each element into a set and stop as soon as an insertion would create a duplicate (the element is already present). The Python one-liner compares lengths before and after set conversion, which is equivalent but processes all elements before short-circuiting. In other languages, the explicit loop version short-circuits on the first duplicate found, which can be significantly faster in practice. Edge case: an empty or single-element array always returns false.

#### Solution

```python
def containsDuplicate(nums):
    return len(nums) != len(set(nums))
```

```rust
use std::collections::HashSet;

fn contains_duplicate(nums: Vec<i32>) -> bool {
    let mut seen = HashSet::new();
    for n in nums {
        if !seen.insert(n) {
            return true;
        }
    }
    false
}
```

```go
func containsDuplicate(nums []int) bool {
    seen := make(map[int]struct{})
    for _, n := range nums {
        if _, ok := seen[n]; ok {
            return true
        }
        seen[n] = struct{}{}
    }
    return false
}
```

```cpp
#include <vector>
#include <unordered_set>

bool containsDuplicate(std::vector<int>& nums) {
    std::unordered_set<int> seen;
    for (int n : nums) {
        if (!seen.insert(n).second) return true;
    }
    return false;
}
```

### 8. Valid Anagram

#### Problem
Given two strings `s` and `t`, return `true` if `t` is an anagram of `s` (contains exactly the same characters with the same frequencies), and `false` otherwise.

#### Pattern
**Frequency array (26 lowercase letters).** **O(n)** time, **O(1)** space.

#### Explanation
An anagram has identical character frequencies. Early-exit on length mismatch avoids unnecessary work. With only lowercase English letters, a fixed 26-element integer array replaces a hashmap entirely, keeping auxiliary space constant. Increment for each character in `s` and decrement for the corresponding character in `t` simultaneously; if all counts are zero at the end, the strings are anagrams. This is equivalent to sorting both strings and comparing — `O(n log n)` — but the frequency array runs in `O(n)`. For Unicode inputs you would need a hashmap instead. Edge case: two empty strings are anagrams of each other.

#### Solution

```python
def isAnagram(s, t):
    if len(s) != len(t):
        return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a) - ord('a')] += 1
        count[ord(b) - ord('a')] -= 1
    return all(c == 0 for c in count)
```

```rust
fn is_anagram(s: String, t: String) -> bool {
    if s.len() != t.len() { return false; }
    let mut count = [0i32; 26];
    for (a, b) in s.bytes().zip(t.bytes()) {
        count[(a - b'a') as usize] += 1;
        count[(b - b'a') as usize] -= 1;
    }
    count.iter().all(|&c| c == 0)
}
```

```go
func isAnagram(s string, t string) bool {
    if len(s) != len(t) { return false }
    var count [26]int
    for i := 0; i < len(s); i++ {
        count[s[i]-'a']++
        count[t[i]-'a']--
    }
    for _, c := range count {
        if c != 0 { return false }
    }
    return true
}
```

```cpp
#include <string>
#include <array>

bool isAnagram(std::string s, std::string t) {
    if (s.size() != t.size()) return false;
    std::array<int, 26> count{};
    for (int i = 0; i < (int)s.size(); ++i) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}
```

### 9. Group Anagrams

#### Problem
Given an array of strings, group the strings that are anagrams of each other and return the groups in any order.

#### Pattern
**Hashmap keyed by sorted string.** **O(n * k log k)** time, **O(n * k)** space (where `k` is the max string length).

#### Explanation
Two strings are anagrams if and only if their sorted character sequences are identical, so sorting each string produces a canonical key. Group strings by this key in a hashmap: walk the array once, sort each string in `O(k log k)`, and append it to the matching bucket. The total cost is `O(n * k log k)`. An alternative key is a 26-element frequency tuple, which sorts in `O(k)` per string but with a larger constant. Edge cases: an empty string is its own anagram group; a single-element array is trivially grouped.

#### Solution

```python
def groupAnagrams(strs):
    groups = {}
    for s in strs:
        key = tuple(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

```rust
use std::collections::HashMap;

fn group_anagrams(strs: Vec<String>) -> Vec<Vec<String>> {
    let mut groups: HashMap<Vec<u8>, Vec<String>> = HashMap::new();
    for s in strs {
        let mut key = s.as_bytes().to_vec();
        key.sort_unstable();
        groups.entry(key).or_default().push(s);
    }
    groups.into_values().collect()
}
```

```go
import "sort"

func groupAnagrams(strs []string) [][]string {
    groups := make(map[string][]string)
    for _, s := range strs {
        b := []byte(s)
        sort.Slice(b, func(i, j int) bool { return b[i] < b[j] })
        key := string(b)
        groups[key] = append(groups[key], s)
    }
    res := make([][]string, 0, len(groups))
    for _, v := range groups {
        res = append(res, v)
    }
    return res
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>

std::vector<std::vector<std::string>> groupAnagrams(std::vector<std::string>& strs) {
    std::unordered_map<std::string, std::vector<std::string>> groups;
    for (const auto& s : strs) {
        std::string key = s;
        std::sort(key.begin(), key.end());
        groups[key].push_back(s);
    }
    std::vector<std::vector<std::string>> res;
    res.reserve(groups.size());
    for (auto& [_, v] : groups) res.push_back(std::move(v));
    return res;
}
```

### 10. Top K Frequent Elements

#### Problem
Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. The answer can be returned in any order and is guaranteed to be unique.

#### Pattern
**Bucket sort by frequency.** **O(n)** time, **O(n)** space.

#### Explanation
The obvious approach uses a max-heap: count frequencies in `O(n)`, then extract the top `k` in `O(k log n)` — overall `O(n log n)`. Bucket sort beats this: since no element can appear more than `n` times, create `n + 1` buckets indexed by frequency. Place each element in its frequency bucket, then scan buckets from high to low, collecting elements until you have `k`. Because the bucket index is bounded by `n`, filling and scanning is `O(n)`. This approach works even when `k = n`. Edge case: ties in frequency are handled naturally since the bucket at the same index holds multiple elements.

#### Solution

```python
def topKFrequent(nums, k):
    count = {}
    for n in nums:
        count[n] = count.get(n, 0) + 1
    buckets = [[] for _ in range(len(nums) + 1)]
    for n, c in count.items():
        buckets[c].append(n)
    res = []
    for i in range(len(buckets) - 1, 0, -1):
        res.extend(buckets[i])
        if len(res) >= k:
            return res[:k]
```

```rust
fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
    use std::collections::HashMap;
    let n = nums.len();
    let mut count: HashMap<i32, usize> = HashMap::new();
    for &x in &nums { *count.entry(x).or_insert(0) += 1; }
    let mut buckets: Vec<Vec<i32>> = vec![vec![]; n + 1];
    for (&val, &freq) in &count { buckets[freq].push(val); }
    let mut res = Vec::new();
    for bucket in buckets.iter().rev() {
        for &v in bucket {
            res.push(v);
            if res.len() == k as usize { return res; }
        }
    }
    res
}
```

```go
func topKFrequent(nums []int, k int) []int {
    count := make(map[int]int)
    for _, n := range nums { count[n]++ }
    buckets := make([][]int, len(nums)+1)
    for val, freq := range count { buckets[freq] = append(buckets[freq], val) }
    res := []int{}
    for i := len(buckets) - 1; i > 0 && len(res) < k; i-- {
        res = append(res, buckets[i]...)
    }
    return res[:k]
}
```

```cpp
#include <vector>
#include <unordered_map>

std::vector<int> topKFrequent(std::vector<int>& nums, int k) {
    std::unordered_map<int, int> count;
    for (int n : nums) count[n]++;
    int n = (int)nums.size();
    std::vector<std::vector<int>> buckets(n + 1);
    for (auto& [val, freq] : count) buckets[freq].push_back(val);
    std::vector<int> res;
    for (int i = n; i > 0 && (int)res.size() < k; --i) {
        for (int v : buckets[i]) {
            res.push_back(v);
            if ((int)res.size() == k) return res;
        }
    }
    return res;
}
```

### 11. Encode and Decode Strings

#### Problem
Design an algorithm to encode a list of strings into a single string, and decode that single string back into the original list. The strings may contain any character including `#` and digits.

#### Pattern
**Length-prefix encoding.** **O(n)** time, **O(n)** space.

#### Explanation
A naive delimiter like `","` fails if strings contain that character. Escaping every special character is error-prone. Length-prefix encoding avoids both issues: encode each string as `"<length>#<content>"`. On decode, read up to the `#` to get the length, then slice exactly that many characters — no ambiguity regardless of the string content. The `#` only acts as a separator between the length and the content; because you read the length first, you always know where the content ends. This is `O(total characters)` for both encode and decode.

#### Solution

```python
def encode(strs):
    return "".join(f"{len(s)}#{s}" for s in strs)

def decode(s):
    res, i = [], 0
    while i < len(s):
        j = s.index("#", i)
        length = int(s[i:j])
        res.append(s[j + 1:j + 1 + length])
        i = j + 1 + length
    return res
```

```rust
fn encode(strs: Vec<String>) -> String {
    let mut out = String::new();
    for s in &strs {
        out.push_str(&format!("{}#{}", s.len(), s));
    }
    out
}

fn decode(s: String) -> Vec<String> {
    let mut res = Vec::new();
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        let hash = b[i..].iter().position(|&c| c == b'#').unwrap() + i;
        let length: usize = s[i..hash].parse().unwrap();
        let start = hash + 1;
        res.push(s[start..start + length].to_string());
        i = start + length;
    }
    res
}
```

```go
import (
    "strconv"
    "strings"
)

func encode(strs []string) string {
    var sb strings.Builder
    for _, s := range strs {
        sb.WriteString(strconv.Itoa(len(s)))
        sb.WriteByte('#')
        sb.WriteString(s)
    }
    return sb.String()
}

func decode(s string) []string {
    res := []string{}
    i := 0
    for i < len(s) {
        j := strings.Index(s[i:], "#") + i
        length, _ := strconv.Atoi(s[i:j])
        res = append(res, s[j+1:j+1+length])
        i = j + 1 + length
    }
    return res
}
```

```cpp
#include <string>
#include <vector>

std::string encode(std::vector<std::string>& strs) {
    std::string out;
    for (const auto& s : strs) {
        out += std::to_string(s.size()) + '#' + s;
    }
    return out;
}

std::vector<std::string> decode(std::string s) {
    std::vector<std::string> res;
    int i = 0, n = (int)s.size();
    while (i < n) {
        int j = (int)s.find('#', i);
        int len = std::stoi(s.substr(i, j - i));
        res.push_back(s.substr(j + 1, len));
        i = j + 1 + len;
    }
    return res;
}
```

### 12. Product of Array Except Self

#### Problem
Given an integer array `nums`, return an array `output` where `output[i]` equals the product of all elements except `nums[i]`. You may not use division, and the solution must run in `O(n)`.

#### Pattern
**Prefix and suffix products.** **O(n)** time, **O(1)** extra space (output array not counted).

#### Explanation
Division would be simple (`total_product / nums[i]`), but division is disallowed and zeros complicate it anyway. The insight is that `output[i]` is the product of everything to the left of `i` times the product of everything to the right. First pass: store running left products in the output array. Second pass (right to left): multiply each position by the running right product. This is two linear scans and uses only a single running variable (`suffix`), so auxiliary space is `O(1)`. No zeros require special handling because the prefix/suffix approach naturally produces 0 when needed.

#### Solution

```python
def productExceptSelf(nums):
    res = [1] * len(nums)
    prefix = 1
    for i in range(len(nums)):
        res[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(len(nums) - 1, -1, -1):
        res[i] *= suffix
        suffix *= nums[i]
    return res
```

```rust
fn product_except_self(nums: Vec<i32>) -> Vec<i32> {
    let n = nums.len();
    let mut res = vec![1i32; n];
    let mut prefix = 1;
    for i in 0..n {
        res[i] = prefix;
        prefix *= nums[i];
    }
    let mut suffix = 1;
    for i in (0..n).rev() {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    res
}
```

```go
func productExceptSelf(nums []int) []int {
    n := len(nums)
    res := make([]int, n)
    prefix := 1
    for i := 0; i < n; i++ {
        res[i] = prefix
        prefix *= nums[i]
    }
    suffix := 1
    for i := n - 1; i >= 0; i-- {
        res[i] *= suffix
        suffix *= nums[i]
    }
    return res
}
```

```cpp
#include <vector>

std::vector<int> productExceptSelf(std::vector<int>& nums) {
    int n = (int)nums.size();
    std::vector<int> res(n, 1);
    int prefix = 1;
    for (int i = 0; i < n; ++i) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    int suffix = 1;
    for (int i = n - 1; i >= 0; --i) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    return res;
}
```

### 13. Valid Sudoku

#### Problem
Determine if a 9×9 Sudoku board is valid. Each row, column, and 3×3 sub-box must contain the digits 1–9 with no repetition. Empty cells are marked with `'.'`. The board does not need to be fully solved.

#### Pattern
**Hashset per row, column, and 3×3 box.** **O(1)** time, **O(1)** space (fixed 9×9 board).

#### Explanation
Validity requires that digits 1–9 appear at most once in each row, column, and 3×3 box. Maintain three arrays of nine sets — one per row, one per column, one per box. For each filled cell, compute the box index as `(r // 3) * 3 + (c // 3)`, which maps the nine boxes to indices 0–8. If the digit is already in any of the three relevant sets, the board is invalid; otherwise add it to all three. The board size is fixed, so the algorithm is `O(81) = O(1)`. Edge case: `'.'` cells are simply skipped.

#### Solution

```python
def isValidSudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == ".":
                continue
            b = (r // 3) * 3 + (c // 3)
            if v in rows[r] or v in cols[c] or v in boxes[b]:
                return False
            rows[r].add(v)
            cols[c].add(v)
            boxes[b].add(v)
    return True
```

```rust
fn is_valid_sudoku(board: Vec<Vec<char>>) -> bool {
    let mut rows  = vec![0u16; 9];
    let mut cols  = vec![0u16; 9];
    let mut boxes = vec![0u16; 9];
    for r in 0..9 {
        for c in 0..9 {
            let ch = board[r][c];
            if ch == '.' { continue; }
            let bit = 1u16 << (ch as u8 - b'1');
            let b = (r / 3) * 3 + c / 3;
            if rows[r] & bit != 0 || cols[c] & bit != 0 || boxes[b] & bit != 0 {
                return false;
            }
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        }
    }
    true
}
```

```go
func isValidSudoku(board [][]byte) bool {
    var rows, cols, boxes [9]uint16
    for r := 0; r < 9; r++ {
        for c := 0; c < 9; c++ {
            v := board[r][c]
            if v == '.' { continue }
            bit := uint16(1) << (v - '1')
            b := (r/3)*3 + c/3
            if rows[r]&bit != 0 || cols[c]&bit != 0 || boxes[b]&bit != 0 {
                return false
            }
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit
        }
    }
    return true
}
```

```cpp
#include <vector>
#include <array>

bool isValidSudoku(std::vector<std::vector<char>>& board) {
    std::array<uint16_t, 9> rows{}, cols{}, boxes{};
    for (int r = 0; r < 9; ++r) {
        for (int c = 0; c < 9; ++c) {
            if (board[r][c] == '.') continue;
            uint16_t bit = 1u << (board[r][c] - '1');
            int b = (r / 3) * 3 + c / 3;
            if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return false;
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        }
    }
    return true;
}
```

### 14. Longest Consecutive Sequence

#### Problem
Given an unsorted integer array `nums`, return the length of the longest sequence of consecutive integers. The solution must run in `O(n)`.

#### Pattern
**Hashset with sequence-start detection.** **O(n)** time, **O(n)** space.

#### Explanation
Sorting would solve this in `O(n log n)`. To reach `O(n)`, dump all numbers into a set for `O(1)` lookups. For each number `n`, check whether `n - 1` is in the set; if not, `n` is the start of a consecutive sequence. Only from sequence starts do you walk forward counting `n + 1`, `n + 2`, … — this ensures each element is visited at most twice total (once to check start, at most once while extending). Duplicates are eliminated by the set, so they don't affect correctness or complexity. Edge case: empty input returns 0.

#### Solution

```python
def longestConsecutive(nums):
    s = set(nums)
    best = 0
    for n in s:
        if n - 1 not in s:
            length = 1
            while n + length in s:
                length += 1
            best = max(best, length)
    return best
```

```rust
use std::collections::HashSet;

fn longest_consecutive(nums: Vec<i32>) -> i32 {
    let s: HashSet<i32> = nums.into_iter().collect();
    let mut best = 0;
    for &n in &s {
        if !s.contains(&(n - 1)) {
            let mut length = 1;
            while s.contains(&(n + length)) { length += 1; }
            best = best.max(length);
        }
    }
    best
}
```

```go
func longestConsecutive(nums []int) int {
    s := make(map[int]bool)
    for _, n := range nums { s[n] = true }
    best := 0
    for n := range s {
        if !s[n-1] {
            length := 1
            for s[n+length] { length++ }
            if length > best { best = length }
        }
    }
    return best
}
```

```cpp
#include <vector>
#include <unordered_set>
#include <algorithm>

int longestConsecutive(std::vector<int>& nums) {
    std::unordered_set<int> s(nums.begin(), nums.end());
    int best = 0;
    for (int n : s) {
        if (!s.count(n - 1)) {
            int length = 1;
            while (s.count(n + length)) ++length;
            best = std::max(best, length);
        }
    }
    return best;
}
```

### 15. Valid Palindrome

#### Problem
A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string `s`, return `true` if it is a palindrome.

#### Pattern
**Two pointers (in-place skip).** **O(n)** time, **O(1)** space.

#### Explanation
The naive approach filters the string into a clean array first (`O(n)` extra space), then compares from both ends. The two-pointer approach avoids the copy: start a left pointer at the beginning and a right pointer at the end; skip non-alphanumeric characters on each side, then compare the remaining characters case-insensitively. If any pair mismatches, return false immediately. Empty string and single-character strings are trivially palindromes. Using `isalnum()` (or equivalent) handles all ASCII alphanumeric characters uniformly.

#### Solution

```python
def isPalindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        while l < r and not s[l].isalnum(): l += 1
        while l < r and not s[r].isalnum(): r -= 1
        if s[l].lower() != s[r].lower(): return False
        l += 1
        r -= 1
    return True
```

```rust
fn is_palindrome(s: String) -> bool {
    let chars: Vec<u8> = s.bytes()
        .filter(|b| b.is_ascii_alphanumeric())
        .map(|b| b.to_ascii_lowercase())
        .collect();
    let (mut l, mut r) = (0, chars.len().saturating_sub(1));
    while l < r {
        if chars[l] != chars[r] { return false; }
        l += 1; r -= 1;
    }
    true
}
```

```go
func isPalindrome(s string) bool {
    l, r := 0, len(s)-1
    isAlnum := func(b byte) bool {
        return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9')
    }
    toLower := func(b byte) byte {
        if b >= 'A' && b <= 'Z' { return b + 32 }
        return b
    }
    for l < r {
        for l < r && !isAlnum(s[l]) { l++ }
        for l < r && !isAlnum(s[r]) { r-- }
        if toLower(s[l]) != toLower(s[r]) { return false }
        l++; r--
    }
    return true
}
```

```cpp
#include <string>
#include <cctype>

bool isPalindrome(std::string s) {
    int l = 0, r = (int)s.size() - 1;
    while (l < r) {
        while (l < r && !std::isalnum((unsigned char)s[l])) ++l;
        while (l < r && !std::isalnum((unsigned char)s[r])) --r;
        if (std::tolower((unsigned char)s[l]) != std::tolower((unsigned char)s[r])) return false;
        ++l; --r;
    }
    return true;
}
```

### 16. Two Sum II

#### Problem
Given a 1-indexed sorted array `numbers` and a target, return the 1-indexed positions of the two numbers that sum to the target. Use only `O(1)` extra space; exactly one solution is guaranteed.

#### Pattern
**Two pointers on sorted input.** **O(n)** time, **O(1)** space.

#### Explanation
Because the array is already sorted, you can exploit its monotonic property with two pointers starting at opposite ends. If the current sum equals the target, return the indices. If it's too small, advance the left pointer to increase the sum. If it's too large, retreat the right pointer. Each step eliminates at least one element from consideration, so the loop runs in `O(n)` with no extra memory. The sorted precondition is the key — without it, you'd need a hashmap as in Two Sum I. Exactly one solution is guaranteed, so the loop always terminates with an answer.

#### Solution

```python
def twoSum(numbers, target):
    l, r = 0, len(numbers) - 1
    while l < r:
        s = numbers[l] + numbers[r]
        if s == target:
            return [l + 1, r + 1]
        elif s < target:
            l += 1
        else:
            r -= 1
```

```rust
fn two_sum(numbers: Vec<i32>, target: i32) -> Vec<i32> {
    let (mut l, mut r) = (0usize, numbers.len() - 1);
    loop {
        let s = numbers[l] + numbers[r];
        if s == target { return vec![(l + 1) as i32, (r + 1) as i32]; }
        else if s < target { l += 1; }
        else { r -= 1; }
    }
}
```

```go
func twoSum(numbers []int, target int) []int {
    l, r := 0, len(numbers)-1
    for l < r {
        s := numbers[l] + numbers[r]
        if s == target { return []int{l + 1, r + 1} }
        if s < target { l++ } else { r-- }
    }
    return nil
}
```

```cpp
#include <vector>

std::vector<int> twoSum(std::vector<int>& numbers, int target) {
    int l = 0, r = (int)numbers.size() - 1;
    while (l < r) {
        int s = numbers[l] + numbers[r];
        if (s == target) return {l + 1, r + 1};
        else if (s < target) ++l;
        else --r;
    }
    return {};
}
```

### 17. 3Sum

#### Problem
Given an integer array `nums`, return all unique triplets `[a, b, c]` such that `a + b + c == 0`. The solution set must not contain duplicate triplets.

#### Pattern
**Sort + two pointers.** **O(n²)** time, **O(1)** extra space (excluding output).

#### Explanation
Checking all triplets naively is `O(n³)`. Sorting first unlocks a two-pointer scan: fix the first element `nums[i]` and use two pointers on the subarray to its right, reducing the inner search to `O(n)`. To eliminate duplicate triplets without a hashset, skip over equal values of `nums[i]` (outer loop) and skip over equal values of `nums[l]` after finding a valid triplet (inner loop). Since the array is sorted, duplicates are adjacent and easy to skip. If the current sum is negative, advance the left pointer; if positive, retreat the right pointer. Sorting costs `O(n log n)`, dominated by the `O(n²)` scan.

#### Solution

```python
def threeSum(nums):
    nums.sort()
    res = []
    for i, n in enumerate(nums):
        if i > 0 and n == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = n + nums[l] + nums[r]
            if s == 0:
                res.append([n, nums[l], nums[r]])
                l += 1
                while l < r and nums[l] == nums[l - 1]: l += 1
            elif s < 0:
                l += 1
            else:
                r -= 1
    return res
```

```rust
fn three_sum(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
    nums.sort_unstable();
    let n = nums.len();
    let mut res = Vec::new();
    for i in 0..n.saturating_sub(2) {
        if i > 0 && nums[i] == nums[i - 1] { continue; }
        let (mut l, mut r) = (i + 1, n - 1);
        while l < r {
            let s = nums[i] + nums[l] + nums[r];
            if s == 0 {
                res.push(vec![nums[i], nums[l], nums[r]]);
                l += 1;
                while l < r && nums[l] == nums[l - 1] { l += 1; }
            } else if s < 0 { l += 1; } else { r -= 1; }
        }
    }
    res
}
```

```go
import "sort"

func threeSum(nums []int) [][]int {
    sort.Ints(nums)
    res := [][]int{}
    n := len(nums)
    for i := 0; i < n-2; i++ {
        if i > 0 && nums[i] == nums[i-1] { continue }
        l, r := i+1, n-1
        for l < r {
            s := nums[i] + nums[l] + nums[r]
            if s == 0 {
                res = append(res, []int{nums[i], nums[l], nums[r]})
                l++
                for l < r && nums[l] == nums[l-1] { l++ }
            } else if s < 0 { l++ } else { r-- }
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> threeSum(std::vector<int>& nums) {
    std::sort(nums.begin(), nums.end());
    std::vector<std::vector<int>> res;
    int n = (int)nums.size();
    for (int i = 0; i < n - 2; ++i) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int l = i + 1, r = n - 1;
        while (l < r) {
            int s = nums[i] + nums[l] + nums[r];
            if (s == 0) {
                res.push_back({nums[i], nums[l], nums[r]});
                ++l;
                while (l < r && nums[l] == nums[l - 1]) ++l;
            } else if (s < 0) { ++l; } else { --r; }
        }
    }
    return res;
}
```

### 18. Container With Most Water

#### Problem
Given an array `height` of `n` non-negative integers where each represents a vertical line at position `i`, find two lines that together with the x-axis form a container that holds the most water. Return the maximum water volume.

#### Pattern
**Two pointers, always move the shorter side.** **O(n)** time, **O(1)** space.

#### Explanation
The brute-force approach tests all pairs of lines in `O(n²)`. The two-pointer approach works because water volume is `min(height[l], height[r]) * (r - l)`. Starting with the widest container (pointers at both ends), moving the shorter pointer inward is the only action that could possibly increase the water level — moving the taller pointer can only decrease the width without any chance of gaining height. This greedy move is provably optimal: we never skip a container that could be larger. The loop runs in `O(n)` since each step advances one pointer.

#### Solution

```python
def maxArea(height):
    l, r = 0, len(height) - 1
    res = 0
    while l < r:
        res = max(res, min(height[l], height[r]) * (r - l))
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return res
```

```rust
fn max_area(height: Vec<i32>) -> i32 {
    let (mut l, mut r) = (0usize, height.len() - 1);
    let mut res = 0;
    while l < r {
        res = res.max(height[l].min(height[r]) * (r - l) as i32);
        if height[l] < height[r] { l += 1; } else { r -= 1; }
    }
    res
}
```

```go
func maxArea(height []int) int {
    l, r := 0, len(height)-1
    res := 0
    for l < r {
        area := min(height[l], height[r]) * (r - l)
        if area > res { res = area }
        if height[l] < height[r] { l++ } else { r-- }
    }
    return res
}

func min(a, b int) int {
    if a < b { return a }
    return b
}
```

```cpp
#include <vector>
#include <algorithm>

int maxArea(std::vector<int>& height) {
    int l = 0, r = (int)height.size() - 1, res = 0;
    while (l < r) {
        res = std::max(res, std::min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) ++l; else --r;
    }
    return res;
}
```

### 19. Trapping Rain Water

#### Problem
Given an array `height` representing an elevation map where the width of each bar is 1, compute how much water can be trapped after raining.

#### Pattern
**Two pointers tracking running max on each side.** **O(n)** time, **O(1)** space.

#### Explanation
The classical approach precomputes prefix-max and suffix-max arrays, then subtracts the bar height at each position — `O(n)` time but `O(n)` space. The two-pointer approach eliminates the extra arrays. Water above position `i` is `min(maxLeft, maxRight) - height[i]`. Move from whichever side has the smaller maximum: if `maxL <= maxR`, the water at the left pointer is determined by `maxL` (the right side is at least as tall), so advance left and accumulate `maxL - height[l]` after updating `maxL`. Mirror logic applies for the right side. This works because we process from the side whose bound is already known to be the limiting factor.

#### Solution

```python
def trap(height):
    l, r = 0, len(height) - 1
    maxL, maxR = height[l], height[r]
    res = 0
    while l < r:
        if maxL <= maxR:
            l += 1
            maxL = max(maxL, height[l])
            res += maxL - height[l]
        else:
            r -= 1
            maxR = max(maxR, height[r])
            res += maxR - height[r]
    return res
```

```rust
fn trap(height: Vec<i32>) -> i32 {
    let (mut l, mut r) = (0usize, height.len() - 1);
    let (mut max_l, mut max_r) = (height[l], height[r]);
    let mut res = 0;
    while l < r {
        if max_l <= max_r {
            l += 1;
            max_l = max_l.max(height[l]);
            res += max_l - height[l];
        } else {
            r -= 1;
            max_r = max_r.max(height[r]);
            res += max_r - height[r];
        }
    }
    res
}
```

```go
func trap(height []int) int {
    l, r := 0, len(height)-1
    maxL, maxR := height[l], height[r]
    res := 0
    for l < r {
        if maxL <= maxR {
            l++
            if height[l] > maxL { maxL = height[l] }
            res += maxL - height[l]
        } else {
            r--
            if height[r] > maxR { maxR = height[r] }
            res += maxR - height[r]
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

int trap(std::vector<int>& height) {
    int l = 0, r = (int)height.size() - 1;
    int maxL = height[l], maxR = height[r], res = 0;
    while (l < r) {
        if (maxL <= maxR) {
            ++l;
            maxL = std::max(maxL, height[l]);
            res += maxL - height[l];
        } else {
            --r;
            maxR = std::max(maxR, height[r]);
            res += maxR - height[r];
        }
    }
    return res;
}
```

### 20. Best Time to Buy and Sell Stock

#### Problem
Given an array `prices` where `prices[i]` is the stock price on day `i`, return the maximum profit from one buy followed by one sell on a later day. Return 0 if no profit is possible.

#### Pattern
**Single pass tracking minimum price.** **O(n)** time, **O(1)** space.

#### Explanation
You must buy before you sell, so the brute-force approach checks every (buy, sell) pair in `O(n²)`. The key observation is that for any sell day, the best buy day is the cheapest day seen so far. Walk the prices array left to right, maintaining the running minimum `buy`. At each price `p`, the profit if you sold today is `p - buy`; update the best profit and the running minimum. This greedy one-pass approach is optimal because it correctly pairs each potential sell day with the globally cheapest prior buy day. Edge case: a strictly decreasing sequence yields 0 profit.

#### Solution

```python
def maxProfit(prices):
    buy, profit = prices[0], 0
    for p in prices[1:]:
        profit = max(profit, p - buy)
        buy = min(buy, p)
    return profit
```

```rust
fn max_profit(prices: Vec<i32>) -> i32 {
    let mut buy = prices[0];
    let mut profit = 0;
    for &p in &prices[1..] {
        profit = profit.max(p - buy);
        buy = buy.min(p);
    }
    profit
}
```

```go
func maxProfit(prices []int) int {
    buy, profit := prices[0], 0
    for _, p := range prices[1:] {
        if p-buy > profit { profit = p - buy }
        if p < buy { buy = p }
    }
    return profit
}
```

```cpp
#include <vector>
#include <algorithm>

int maxProfit(std::vector<int>& prices) {
    int buy = prices[0], profit = 0;
    for (int i = 1; i < (int)prices.size(); ++i) {
        profit = std::max(profit, prices[i] - buy);
        buy = std::min(buy, prices[i]);
    }
    return profit;
}
```

### 21. Longest Substring Without Repeating Characters

#### Problem
Given a string `s`, return the length of the longest substring that contains no repeating characters.

#### Pattern
**Sliding window with hashset.** **O(n)** time, **O(min(n, m))** space (where `m` is the character set size).

#### Explanation
The brute-force approach checks all `O(n²)` substrings and verifies uniqueness in `O(n)`, giving `O(n³)`. The sliding window maintains a valid window `[l, r]` where all characters are unique. Expand by moving `r` right; when the new character `c` is already in the window, shrink by moving `l` right (removing characters from the set) until `c` is no longer in the window, then add `c`. At each step the window `[l, r]` is always duplicate-free, and we track the maximum seen window size. Each character is added and removed from the set at most once, giving `O(n)` amortized. Edge case: empty string returns 0.

#### Solution

```python
def lengthOfLongestSubstring(s):
    seen = set()
    l = res = 0
    for r, c in enumerate(s):
        while c in seen:
            seen.remove(s[l])
            l += 1
        seen.add(c)
        res = max(res, r - l + 1)
    return res
```

```rust
use std::collections::HashSet;

fn length_of_longest_substring(s: String) -> i32 {
    let b = s.as_bytes();
    let mut seen: HashSet<u8> = HashSet::new();
    let (mut l, mut res) = (0usize, 0usize);
    for r in 0..b.len() {
        while seen.contains(&b[r]) {
            seen.remove(&b[l]);
            l += 1;
        }
        seen.insert(b[r]);
        res = res.max(r - l + 1);
    }
    res as i32
}
```

```go
func lengthOfLongestSubstring(s string) int {
    seen := make(map[byte]bool)
    l, res := 0, 0
    for r := 0; r < len(s); r++ {
        for seen[s[r]] {
            delete(seen, s[l])
            l++
        }
        seen[s[r]] = true
        if r-l+1 > res { res = r - l + 1 }
    }
    return res
}
```

```cpp
#include <string>
#include <unordered_set>
#include <algorithm>

int lengthOfLongestSubstring(std::string s) {
    std::unordered_set<char> seen;
    int l = 0, res = 0;
    for (int r = 0; r < (int)s.size(); ++r) {
        while (seen.count(s[r])) { seen.erase(s[l++]); }
        seen.insert(s[r]);
        res = std::max(res, r - l + 1);
    }
    return res;
}
```

### 22. Longest Repeating Character Replacement

#### Problem
Given a string `s` and an integer `k`, return the length of the longest substring that can be made into a single repeating character by replacing at most `k` characters.

#### Pattern
**Sliding window tracking max-frequency character.** **O(n)** time, **O(1)** space.

#### Explanation
Within any window `[l, r]`, the minimum replacements needed equals `window_size - max_freq`, where `max_freq` is the count of the most common character. If this exceeds `k`, the window is invalid. Expand right on every step; shrink left only when the window becomes invalid. The trick: `max_freq` is never decreased — we only update it upward. This is correct because any valid window must have a higher `max_freq` than any previously seen valid window to be longer, and a window with a lower `max_freq` can never beat the current best. The character count array has 26 entries, so auxiliary space is `O(1)`.

#### Solution

```python
def characterReplacement(s, k):
    count = {}
    l = res = 0
    max_freq = 0
    for r, c in enumerate(s):
        count[c] = count.get(c, 0) + 1
        max_freq = max(max_freq, count[c])
        while (r - l + 1) - max_freq > k:
            count[s[l]] -= 1
            l += 1
        res = max(res, r - l + 1)
    return res
```

```rust
fn character_replacement(s: String, k: i32) -> i32 {
    let b = s.as_bytes();
    let mut count = [0i32; 26];
    let (mut l, mut res, mut max_freq) = (0usize, 0i32, 0i32);
    for r in 0..b.len() {
        let idx = (b[r] - b'A') as usize;
        count[idx] += 1;
        max_freq = max_freq.max(count[idx]);
        while (r - l + 1) as i32 - max_freq > k {
            count[(b[l] - b'A') as usize] -= 1;
            l += 1;
        }
        res = res.max((r - l + 1) as i32);
    }
    res
}
```

```go
func characterReplacement(s string, k int) int {
    count := [26]int{}
    l, res, maxFreq := 0, 0, 0
    for r := 0; r < len(s); r++ {
        count[s[r]-'A']++
        if count[s[r]-'A'] > maxFreq { maxFreq = count[s[r]-'A'] }
        for (r-l+1)-maxFreq > k {
            count[s[l]-'A']--
            l++
        }
        if r-l+1 > res { res = r - l + 1 }
    }
    return res
}
```

```cpp
#include <string>
#include <array>
#include <algorithm>

int characterReplacement(std::string s, int k) {
    std::array<int, 26> count{};
    int l = 0, res = 0, maxFreq = 0;
    for (int r = 0; r < (int)s.size(); ++r) {
        count[s[r] - 'A']++;
        maxFreq = std::max(maxFreq, count[s[r] - 'A']);
        while ((r - l + 1) - maxFreq > k) {
            count[s[l] - 'A']--;
            ++l;
        }
        res = std::max(res, r - l + 1);
    }
    return res;
}
```

### 23. Permutation in String

#### Problem
Given strings `s1` and `s2`, return `true` if any permutation of `s1` is a contiguous substring of `s2`.

#### Pattern
**Fixed-size sliding window with frequency array comparison.** **O(n)** time, **O(1)** space.

#### Explanation
A permutation of `s1` is any rearrangement, so the window only needs to contain the same character frequencies. Maintain a fixed-size window of length `len(s1)` over `s2` and a 26-element frequency array for the window. Compare it against `s1`'s frequency array at each position. Slide the window one step at a time: add the incoming character and remove the outgoing character. Comparing two 26-element arrays is `O(1)`, so the total cost is `O(|s2|)`. Edge case: if `s1` is longer than `s2`, no permutation can fit.

#### Solution

```python
def checkInclusion(s1, s2):
    if len(s1) > len(s2):
        return False
    s1_count = [0] * 26
    window = [0] * 26
    for c in s1:
        s1_count[ord(c) - ord('a')] += 1
    for c in s2[:len(s1)]:
        window[ord(c) - ord('a')] += 1
    if s1_count == window:
        return True
    for i in range(len(s1), len(s2)):
        window[ord(s2[i]) - ord('a')] += 1
        window[ord(s2[i - len(s1)]) - ord('a')] -= 1
        if s1_count == window:
            return True
    return False
```

```rust
fn check_inclusion(s1: String, s2: String) -> bool {
    let (n1, n2) = (s1.len(), s2.len());
    if n1 > n2 { return false; }
    let (b1, b2) = (s1.as_bytes(), s2.as_bytes());
    let mut s1_count = [0i32; 26];
    let mut window = [0i32; 26];
    for i in 0..n1 {
        s1_count[(b1[i] - b'a') as usize] += 1;
        window[(b2[i] - b'a') as usize] += 1;
    }
    if s1_count == window { return true; }
    for i in n1..n2 {
        window[(b2[i] - b'a') as usize] += 1;
        window[(b2[i - n1] - b'a') as usize] -= 1;
        if s1_count == window { return true; }
    }
    false
}
```

```go
func checkInclusion(s1 string, s2 string) bool {
    if len(s1) > len(s2) { return false }
    var s1c, win [26]int
    for i := 0; i < len(s1); i++ {
        s1c[s1[i]-'a']++
        win[s2[i]-'a']++
    }
    if s1c == win { return true }
    for i := len(s1); i < len(s2); i++ {
        win[s2[i]-'a']++
        win[s2[i-len(s1)]-'a']--
        if s1c == win { return true }
    }
    return false
}
```

```cpp
#include <string>
#include <array>

bool checkInclusion(std::string s1, std::string s2) {
    if (s1.size() > s2.size()) return false;
    std::array<int, 26> s1c{}, win{};
    int n1 = (int)s1.size(), n2 = (int)s2.size();
    for (int i = 0; i < n1; ++i) {
        s1c[s1[i] - 'a']++;
        win[s2[i] - 'a']++;
    }
    if (s1c == win) return true;
    for (int i = n1; i < n2; ++i) {
        win[s2[i] - 'a']++;
        win[s2[i - n1] - 'a']--;
        if (s1c == win) return true;
    }
    return false;
}
```

### 24. Minimum Window Substring

#### Problem
Given strings `s` and `t`, return the minimum window substring of `s` that contains all characters of `t` (including duplicates). Return an empty string if no such window exists.

#### Pattern
**Sliding window, shrink when valid.** **O(|s| + |t|)** time, **O(|t|)** space.

#### Explanation
A brute-force check of all substrings is `O(|s|² * |t|)`. The sliding window approach keeps a `need` map of required character counts and a `missing` counter. Expand the right pointer: decrement `need[c]`; if `need[c]` drops from 1 to 0 (a required character just became satisfied), decrement `missing`. When `missing == 0` the window is valid — record it if it's the shortest so far, then shrink from the left: increment `need[s[l]]` and if it returns above 0 (a required character is no longer satisfied) increment `missing`. Using `need[c] > 0` to detect "needed" rather than a separate set keeps the logic compact and handles duplicates in `t` naturally.

#### Solution

```python
def minWindow(s, t):
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    missing = len(t)
    l = start = end = 0
    for r, c in enumerate(s, 1):
        if need.get(c, 0) > 0:
            missing -= 1
        need[c] = need.get(c, 0) - 1
        if missing == 0:
            while need.get(s[l], 0) < 0:
                need[s[l]] += 1
                l += 1
            if not end or r - l < end - start:
                start, end = l, r
            need[s[l]] += 1
            missing += 1
            l += 1
    return s[start:end]
```

```rust
use std::collections::HashMap;

fn min_window(s: String, t: String) -> String {
    let mut need: HashMap<u8, i32> = HashMap::new();
    for c in t.bytes() { *need.entry(c).or_insert(0) += 1; }
    let mut missing = t.len() as i32;
    let sb = s.as_bytes();
    let (mut l, mut best_start, mut best_len) = (0usize, 0usize, usize::MAX);
    for r in 0..sb.len() {
        let e = need.entry(sb[r]).or_insert(0);
        if *e > 0 { missing -= 1; }
        *e -= 1;
        if missing == 0 {
            while *need.get(&sb[l]).unwrap_or(&0) < 0 {
                *need.get_mut(&sb[l]).unwrap() += 1;
                l += 1;
            }
            if r - l + 1 < best_len { best_len = r - l + 1; best_start = l; }
            *need.get_mut(&sb[l]).unwrap() += 1;
            missing += 1;
            l += 1;
        }
    }
    if best_len == usize::MAX { String::new() } else { s[best_start..best_start + best_len].to_string() }
}
```

```go
func minWindow(s string, t string) string {
    need := make(map[byte]int)
    for i := 0; i < len(t); i++ { need[t[i]]++ }
    missing := len(t)
    l, start, end := 0, 0, 0
    for r := 0; r < len(s); r++ {
        c := s[r]
        if need[c] > 0 { missing-- }
        need[c]--
        if missing == 0 {
            for need[s[l]] < 0 { need[s[l]]++; l++ }
            if end == 0 || r-l+1 < end-start { start = l; end = r + 1 }
            need[s[l]]++; missing++; l++
        }
    }
    return s[start:end]
}
```

```cpp
#include <string>
#include <unordered_map>
#include <climits>

std::string minWindow(std::string s, std::string t) {
    std::unordered_map<char, int> need;
    for (char c : t) need[c]++;
    int missing = (int)t.size();
    int l = 0, best_start = 0, best_len = INT_MAX;
    for (int r = 0; r < (int)s.size(); ++r) {
        if (need[s[r]]-- > 0) --missing;
        if (missing == 0) {
            while (need[s[l]] < 0) need[s[l++]]++;
            if (r - l + 1 < best_len) { best_len = r - l + 1; best_start = l; }
            need[s[l++]]++; ++missing;
        }
    }
    return best_len == INT_MAX ? "" : s.substr(best_start, best_len);
}
```

### 25. Sliding Window Maximum

#### Problem
Given an integer array `nums` and an integer `k`, return an array of the maximum value in each sliding window of size `k`.

#### Pattern
**Monotonic decreasing deque (indices).** **O(n)** time, **O(k)** space.

#### Explanation
Checking the maximum of every window naively is `O(n * k)`. A monotonic deque stores indices in decreasing order of their values: before appending index `i`, pop all indices from the back whose values are less than or equal to `nums[i]` — they can never be a future window maximum while `i` is still in the window. Pop from the front when the front index falls outside the window (`dq[0] == i - k`). The front of the deque is always the index of the current window's maximum. Each index is added and removed at most once, giving `O(n)` total. Start emitting results once the first full window is formed (`i >= k - 1`).

#### Solution

```python
from collections import deque

def maxSlidingWindow(nums, k):
    dq = deque()
    res = []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```

```rust
use std::collections::VecDeque;

fn max_sliding_window(nums: Vec<i32>, k: i32) -> Vec<i32> {
    let k = k as usize;
    let mut dq: VecDeque<usize> = VecDeque::new();
    let mut res = Vec::new();
    for (i, &n) in nums.iter().enumerate() {
        while dq.back().map_or(false, |&j| nums[j] <= n) { dq.pop_back(); }
        dq.push_back(i);
        if dq.front() == Some(&(i.wrapping_sub(k))) { dq.pop_front(); }
        if i >= k - 1 { res.push(nums[*dq.front().unwrap()]); }
    }
    res
}
```

```go
func maxSlidingWindow(nums []int, k int) []int {
    dq := []int{}
    res := []int{}
    for i, n := range nums {
        for len(dq) > 0 && nums[dq[len(dq)-1]] <= n {
            dq = dq[:len(dq)-1]
        }
        dq = append(dq, i)
        if dq[0] == i-k { dq = dq[1:] }
        if i >= k-1 { res = append(res, nums[dq[0]]) }
    }
    return res
}
```

```cpp
#include <vector>
#include <deque>

std::vector<int> maxSlidingWindow(std::vector<int>& nums, int k) {
    std::deque<int> dq;
    std::vector<int> res;
    for (int i = 0; i < (int)nums.size(); ++i) {
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() == i - k) dq.pop_front();
        if (i >= k - 1) res.push_back(nums[dq.front()]);
    }
    return res;
}
```

### 26. Valid Parentheses

#### Problem
Given a string `s` containing only `'('`, `')'`, `'{'`, `'}'`, `'['`, and `']'`, determine if the input string is valid. An input is valid if every open bracket is closed by the same type of bracket in the correct order.

#### Pattern
**Stack (push open, match on close).** **O(n)** time, **O(n)** space.

#### Explanation
Every closing bracket must match the most recently opened unmatched bracket — a last-in-first-out requirement that maps directly to a stack. Push opening brackets; on a closing bracket, check whether the stack top is the matching opener. If the stack is empty or the top doesn't match, return false immediately. After processing all characters, the string is valid only if the stack is empty (all openers were matched). Edge cases: an odd-length string is always invalid; a string starting with a closing bracket fails on the first character.

#### Solution

```python
def isValid(s):
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for c in s:
        if c in pairs:
            if not stack or stack[-1] != pairs[c]:
                return False
            stack.pop()
        else:
            stack.append(c)
    return not stack
```

```rust
fn is_valid(s: String) -> bool {
    let mut stack: Vec<char> = Vec::new();
    for c in s.chars() {
        match c {
            '(' | '[' | '{' => stack.push(c),
            ')' => { if stack.pop() != Some('(') { return false; } }
            ']' => { if stack.pop() != Some('[') { return false; } }
            '}' => { if stack.pop() != Some('{') { return false; } }
            _ => {}
        }
    }
    stack.is_empty()
}
```

```go
func isValid(s string) bool {
    stack := []rune{}
    pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
    for _, c := range s {
        if open, ok := pairs[c]; ok {
            if len(stack) == 0 || stack[len(stack)-1] != open { return false }
            stack = stack[:len(stack)-1]
        } else {
            stack = append(stack, c)
        }
    }
    return len(stack) == 0
}
```

```cpp
#include <string>
#include <stack>

bool isValid(std::string s) {
    std::stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') { st.push(c); }
        else {
            if (st.empty()) return false;
            char top = st.top(); st.pop();
            if ((c == ')' && top != '(') ||
                (c == ']' && top != '[') ||
                (c == '}' && top != '{')) return false;
        }
    }
    return st.empty();
}
```

### 27. Min Stack

#### Problem
Design a stack that supports `push`, `pop`, `top`, and `getMin` — all in `O(1)` time.

#### Pattern
**Parallel min-tracking stack.** **O(1)** all operations, **O(n)** space.

#### Explanation
A standard stack cannot retrieve the minimum in `O(1)` after arbitrary pops. The trick is to maintain a parallel `min_stack` where each entry records the minimum value reachable from that position down to the bottom of the stack. On `push`, append `min(val, min_stack[-1])` to `min_stack`. On `pop`, remove from both stacks simultaneously. `getMin` is then just `min_stack[-1]`. This works because each element in `min_stack` encodes the answer to "what is the minimum if the main stack were trimmed to this height?" — so pops automatically restore the correct running minimum.

#### Solution

```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val):
        self.stack.append(val)
        self.min_stack.append(min(val, self.min_stack[-1] if self.min_stack else val))

    def pop(self):
        self.stack.pop()
        self.min_stack.pop()

    def top(self):
        return self.stack[-1]

    def getMin(self):
        return self.min_stack[-1]
```

```rust
struct MinStack {
    stack: Vec<i32>,
    min_stack: Vec<i32>,
}

impl MinStack {
    fn new() -> Self { MinStack { stack: vec![], min_stack: vec![] } }

    fn push(&mut self, val: i32) {
        self.stack.push(val);
        let m = self.min_stack.last().map_or(val, |&prev| prev.min(val));
        self.min_stack.push(m);
    }

    fn pop(&mut self) { self.stack.pop(); self.min_stack.pop(); }

    fn top(&self) -> i32 { *self.stack.last().unwrap() }

    fn get_min(&self) -> i32 { *self.min_stack.last().unwrap() }
}
```

```go
type MinStack struct {
    stack    []int
    minStack []int
}

func Constructor() MinStack { return MinStack{} }

func (s *MinStack) Push(val int) {
    s.stack = append(s.stack, val)
    m := val
    if len(s.minStack) > 0 && s.minStack[len(s.minStack)-1] < m {
        m = s.minStack[len(s.minStack)-1]
    }
    s.minStack = append(s.minStack, m)
}

func (s *MinStack) Pop() {
    s.stack = s.stack[:len(s.stack)-1]
    s.minStack = s.minStack[:len(s.minStack)-1]
}

func (s *MinStack) Top() int     { return s.stack[len(s.stack)-1] }
func (s *MinStack) GetMin() int  { return s.minStack[len(s.minStack)-1] }
```

```cpp
#include <stack>
#include <algorithm>

class MinStack {
    std::stack<int> st, mn;
public:
    void push(int val) {
        st.push(val);
        mn.push(mn.empty() ? val : std::min(mn.top(), val));
    }
    void pop()      { st.pop(); mn.pop(); }
    int top()       { return st.top(); }
    int getMin()    { return mn.top(); }
};
```

### 28. Evaluate Reverse Polish Notation

#### Problem
Evaluate an arithmetic expression given as a list of tokens in Reverse Polish Notation (postfix). Operators are `+`, `-`, `*`, and `/` (integer division truncating toward zero). The expression is guaranteed to be valid.

#### Pattern
**Stack (postfix evaluation).** **O(n)** time, **O(n)** space.

#### Explanation
RPN is designed for stack-based evaluation: push operands onto the stack; when you see an operator, pop the top two operands, apply the operator, and push the result. The key subtlety is division truncation toward zero — in Python `int(a / b)` handles negative cases correctly (unlike `a // b` which floors). After processing all tokens, the stack contains exactly one element: the result. Edge case: the token list is guaranteed valid so the stack will never underflow.

#### Solution

```python
def evalRPN(tokens):
    stack = []
    for t in tokens:
        if t in "+-*/":
            b, a = stack.pop(), stack.pop()
            if t == "+":   stack.append(a + b)
            elif t == "-": stack.append(a - b)
            elif t == "*": stack.append(a * b)
            else:          stack.append(int(a / b))  # truncate toward zero
        else:
            stack.append(int(t))
    return stack[0]
```

```rust
fn eval_rpn(tokens: Vec<String>) -> i32 {
    let mut stack: Vec<i32> = Vec::new();
    for t in &tokens {
        match t.as_str() {
            "+" | "-" | "*" | "/" => {
                let b = stack.pop().unwrap();
                let a = stack.pop().unwrap();
                stack.push(match t.as_str() {
                    "+" => a + b,
                    "-" => a - b,
                    "*" => a * b,
                    _   => a / b,  // Rust integer division truncates toward zero
                });
            }
            _ => stack.push(t.parse().unwrap()),
        }
    }
    stack[0]
}
```

```go
import "strconv"

func evalRPN(tokens []string) int {
    stack := []int{}
    for _, t := range tokens {
        switch t {
        case "+", "-", "*", "/":
            b, a := stack[len(stack)-1], stack[len(stack)-2]
            stack = stack[:len(stack)-2]
            var v int
            switch t {
            case "+": v = a + b
            case "-": v = a - b
            case "*": v = a * b
            case "/": v = int(float64(a) / float64(b)) // truncate toward zero
            }
            stack = append(stack, v)
        default:
            n, _ := strconv.Atoi(t)
            stack = append(stack, n)
        }
    }
    return stack[0]
}
```

```cpp
#include <vector>
#include <string>
#include <stack>

int evalRPN(std::vector<std::string>& tokens) {
    std::stack<long> st;
    for (const auto& t : tokens) {
        if (t == "+" || t == "-" || t == "*" || t == "/") {
            long b = st.top(); st.pop();
            long a = st.top(); st.pop();
            if      (t == "+") st.push(a + b);
            else if (t == "-") st.push(a - b);
            else if (t == "*") st.push(a * b);
            else               st.push((long)(a / b));  // C++ truncates toward zero
        } else {
            st.push(std::stol(t));
        }
    }
    return (int)st.top();
}
```

### 29. Generate Parentheses

#### Problem
Given `n`, generate all combinations of `n` pairs of well-formed (valid) parentheses.

#### Pattern
**Backtracking with open/close counters.** **O(4ⁿ / √n)** time (Catalan number of results), **O(n)** stack space.

#### Explanation
The total number of valid combinations is the `n`-th Catalan number, so any correct algorithm is at least that expensive. Backtracking prunes invalid paths early with two rules: you may add `'('` only while `open < n`, and you may add `')'` only while `close < open` (to keep the string valid at every prefix). When the string reaches length `2n`, it is a complete valid combination. This generates every valid combination exactly once without any deduplication needed. The recursive depth is at most `2n`, so stack space is `O(n)`.

#### Solution

```python
def generateParenthesis(n):
    res = []
    def bt(s, open_count, close_count):
        if len(s) == 2 * n:
            res.append(s)
            return
        if open_count < n:
            bt(s + "(", open_count + 1, close_count)
        if close_count < open_count:
            bt(s + ")", open_count, close_count + 1)
    bt("", 0, 0)
    return res
```

```rust
fn generate_parenthesis(n: i32) -> Vec<String> {
    let mut res = Vec::new();
    fn bt(s: &mut String, open: i32, close: i32, n: i32, res: &mut Vec<String>) {
        if s.len() == (2 * n) as usize { res.push(s.clone()); return; }
        if open < n  { s.push('('); bt(s, open + 1, close, n, res); s.pop(); }
        if close < open { s.push(')'); bt(s, open, close + 1, n, res); s.pop(); }
    }
    bt(&mut String::new(), 0, 0, n, &mut res);
    res
}
```

```go
func generateParenthesis(n int) []string {
    res := []string{}
    var bt func(s string, open, close int)
    bt = func(s string, open, close int) {
        if len(s) == 2*n { res = append(res, s); return }
        if open < n      { bt(s+"(", open+1, close) }
        if close < open  { bt(s+")", open, close+1) }
    }
    bt("", 0, 0)
    return res
}
```

```cpp
#include <vector>
#include <string>

std::vector<std::string> generateParenthesis(int n) {
    std::vector<std::string> res;
    std::string cur;
    std::function<void(int, int)> bt = [&](int open, int close) {
        if ((int)cur.size() == 2 * n) { res.push_back(cur); return; }
        if (open < n)    { cur += '('; bt(open + 1, close); cur.pop_back(); }
        if (close < open){ cur += ')'; bt(open, close + 1); cur.pop_back(); }
    };
    bt(0, 0);
    return res;
}
```

### 30. Daily Temperatures

#### Problem
Given an array `temperatures`, return an array `answer` where `answer[i]` is the number of days after day `i` until a warmer temperature. If no warmer day exists, `answer[i]` is 0.

#### Pattern
**Monotonic decreasing stack (indices).** **O(n)** time, **O(n)** space.

#### Explanation
For each day, the naive approach scans forward until a warmer day — `O(n²)` worst case. The monotonic stack processes each day at most twice (once pushed, once popped). Walk left to right: while the current temperature is greater than the temperature at the index on top of the stack, that top index has found its "next warmer day" — pop it and record the difference. Then push the current index. Indices remaining in the stack at the end have no warmer future day and stay 0 (the default). The stack stays in non-increasing temperature order, enforcing the monotonic property.

#### Solution

```python
def dailyTemperatures(temperatures):
    res = [0] * len(temperatures)
    stack = []
    for i, t in enumerate(temperatures):
        while stack and t > temperatures[stack[-1]]:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
```

```rust
fn daily_temperatures(temperatures: Vec<i32>) -> Vec<i32> {
    let n = temperatures.len();
    let mut res = vec![0i32; n];
    let mut stack: Vec<usize> = Vec::new();
    for i in 0..n {
        while let Some(&j) = stack.last() {
            if temperatures[i] > temperatures[j] {
                stack.pop();
                res[j] = (i - j) as i32;
            } else {
                break;
            }
        }
        stack.push(i);
    }
    res
}
```

```go
func dailyTemperatures(temperatures []int) []int {
    n := len(temperatures)
    res := make([]int, n)
    stack := []int{}
    for i, t := range temperatures {
        for len(stack) > 0 && t > temperatures[stack[len(stack)-1]] {
            j := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            res[j] = i - j
        }
        stack = append(stack, i)
    }
    return res
}
```

```cpp
#include <vector>
#include <stack>

std::vector<int> dailyTemperatures(std::vector<int>& temperatures) {
    int n = (int)temperatures.size();
    std::vector<int> res(n, 0);
    std::stack<int> st;
    for (int i = 0; i < n; ++i) {
        while (!st.empty() && temperatures[i] > temperatures[st.top()]) {
            int j = st.top(); st.pop();
            res[j] = i - j;
        }
        st.push(i);
    }
    return res;
}
```

### 31. Car Fleet

#### Problem
Given `n` cars at different positions on a one-lane road heading toward a `target`, where each car has a given `speed`, return the number of car fleets (groups of cars that arrive together) that reach the destination.

#### Pattern
**Monotonic stack (sort by position descending).** **O(n log n)** time, **O(n)** space.

#### Explanation
A brute-force simulation would step time forward in small increments — expensive and fragile. The key insight is that a car can only catch the car ahead of it, never pass it. Sorting by starting position in descending order lets you process cars from closest-to-target to farthest. For each car, compute the time it would need to reach `target` on its own. If that time is greater than the time of the car ahead (top of stack), it can never catch up and forms a new fleet. If it's less than or equal, it merges into the car ahead's fleet and is not pushed. The stack therefore holds the arrival times of distinct fleets. Edge case: cars starting at the same position collapse immediately into one fleet — handled naturally because the slower one always has a longer time.

#### Solution

```python
def carFleet(target, position, speed):
    pairs = sorted(zip(position, speed), reverse=True)
    stack = []
    for pos, spd in pairs:
        t = (target - pos) / spd
        if not stack or t > stack[-1]:
            stack.append(t)
    return len(stack)
```

```rust
fn car_fleet(target: i32, position: Vec<i32>, speed: Vec<i32>) -> i32 {
    let mut pairs: Vec<(i32, i32)> = position.into_iter().zip(speed).collect();
    pairs.sort_unstable_by(|a, b| b.0.cmp(&a.0));
    let mut stack: Vec<f64> = Vec::new();
    for (pos, spd) in pairs {
        let t = (target - pos) as f64 / spd as f64;
        if stack.is_empty() || t > *stack.last().unwrap() {
            stack.push(t);
        }
    }
    stack.len() as i32
}
```

```go
import "sort"

func carFleet(target int, position []int, speed []int) int {
    n := len(position)
    type car struct{ pos, spd int }
    cars := make([]car, n)
    for i := range position {
        cars[i] = car{position[i], speed[i]}
    }
    sort.Slice(cars, func(i, j int) bool { return cars[i].pos > cars[j].pos })
    stack := []float64{}
    for _, c := range cars {
        t := float64(target-c.pos) / float64(c.spd)
        if len(stack) == 0 || t > stack[len(stack)-1] {
            stack = append(stack, t)
        }
    }
    return len(stack)
}
```

```cpp
#include <vector>
#include <algorithm>

int carFleet(int target, std::vector<int>& position, std::vector<int>& speed) {
    int n = position.size();
    std::vector<std::pair<int,int>> cars(n);
    for (int i = 0; i < n; ++i) cars[i] = {position[i], speed[i]};
    std::sort(cars.begin(), cars.end(), [](auto& a, auto& b){ return a.first > b.first; });
    std::vector<double> stack;
    for (auto& [pos, spd] : cars) {
        double t = (double)(target - pos) / spd;
        if (stack.empty() || t > stack.back()) stack.push_back(t);
    }
    return (int)stack.size();
}
```

### 32. Largest Rectangle in Histogram

#### Problem
Given an array of bar heights in a histogram where each bar has width 1, return the area of the largest rectangle that can be formed.

#### Pattern
**Monotonic stack (increasing).** **O(n)** time, **O(n)** space.

#### Explanation
The brute-force approach tries every pair of left and right boundaries — `O(n²)`. The monotonic stack insight: a bar at height `h` can extend leftward only as long as bars to its left are at least as tall. Maintain a stack of `(start_index, height)` pairs in increasing height order. When you encounter a bar shorter than the stack top, pop bars that can no longer extend rightward — compute their rectangle using the current index as the right boundary, and carry their start index leftward for the new (shorter) bar. After the loop, every remaining bar in the stack extends to the end of the array. The `start` variable tracks how far left the current bar's rectangle can reach.

#### Solution

```python
def largestRectangleArea(heights):
    stack = []  # (index, height)
    res = 0
    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, ht = stack.pop()
            res = max(res, ht * (i - idx))
            start = idx
        stack.append((start, h))
    for i, h in stack:
        res = max(res, h * (len(heights) - i))
    return res
```

```rust
fn largest_rectangle_area(heights: Vec<i32>) -> i32 {
    let mut stack: Vec<(usize, i32)> = Vec::new(); // (start, height)
    let mut res = 0i32;
    let n = heights.len();
    for (i, &h) in heights.iter().enumerate() {
        let mut start = i;
        while let Some(&(idx, ht)) = stack.last() {
            if ht > h {
                stack.pop();
                res = res.max(ht * (i - idx) as i32);
                start = idx;
            } else {
                break;
            }
        }
        stack.push((start, h));
    }
    for (i, h) in stack {
        res = res.max(h * (n - i) as i32);
    }
    res
}
```

```go
func largestRectangleArea(heights []int) int {
    type pair struct{ idx, h int }
    stack := []pair{}
    res := 0
    n := len(heights)
    for i, h := range heights {
        start := i
        for len(stack) > 0 && stack[len(stack)-1].h > h {
            top := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            area := top.h * (i - top.idx)
            if area > res { res = area }
            start = top.idx
        }
        stack = append(stack, pair{start, h})
    }
    for _, p := range stack {
        area := p.h * (n - p.idx)
        if area > res { res = area }
    }
    return res
}
```

```cpp
#include <vector>
#include <stack>
#include <algorithm>

int largestRectangleArea(std::vector<int>& heights) {
    std::stack<std::pair<int,int>> st; // (start, height)
    int res = 0;
    int n = heights.size();
    for (int i = 0; i < n; ++i) {
        int start = i;
        while (!st.empty() && st.top().second > heights[i]) {
            auto [idx, ht] = st.top(); st.pop();
            res = std::max(res, ht * (i - idx));
            start = idx;
        }
        st.push({start, heights[i]});
    }
    while (!st.empty()) {
        auto [idx, ht] = st.top(); st.pop();
        res = std::max(res, ht * (n - idx));
    }
    return res;
}
```

### 33. Binary Search

#### Problem
Given a sorted array of integers and a target value, return the index of the target, or -1 if it is not present.

#### Pattern
**Binary search.** **O(log n)** time, **O(1)** space.

#### Explanation
A linear scan finds the target in `O(n)` time. Binary search exploits the sorted order: at every step, compare the middle element to the target. If it matches, return the index; if the middle is less than the target, the target must be in the right half — advance `l`; if greater, search the left half — retreat `r`. The loop invariant `l <= r` ensures we don't skip a single-element range. Computing the midpoint as `(l + r) // 2` avoids integer overflow compared to naive `(l + r) / 2` in languages with fixed-width integers. Edge cases: empty array (returns -1 immediately), duplicate values (any match is acceptable), single element.

#### Solution

```python
def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        m = (l + r) // 2
        if nums[m] == target:
            return m
        elif nums[m] < target:
            l = m + 1
        else:
            r = m - 1
    return -1
```

```rust
fn search(nums: Vec<i32>, target: i32) -> i32 {
    let (mut l, mut r) = (0i32, nums.len() as i32 - 1);
    while l <= r {
        let m = l + (r - l) / 2;
        if nums[m as usize] == target {
            return m;
        } else if nums[m as usize] < target {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }
    -1
}
```

```go
func search(nums []int, target int) int {
    l, r := 0, len(nums)-1
    for l <= r {
        m := l + (r-l)/2
        if nums[m] == target {
            return m
        } else if nums[m] < target {
            l = m + 1
        } else {
            r = m - 1
        }
    }
    return -1
}
```

```cpp
#include <vector>

int search(std::vector<int>& nums, int target) {
    int l = 0, r = (int)nums.size() - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) return m;
        else if (nums[m] < target) l = m + 1;
        else r = m - 1;
    }
    return -1;
}
```

### 34. Search a 2D Matrix

#### Problem
Given an `m x n` matrix where each row is sorted left-to-right and the first integer of each row is greater than the last of the previous row, determine if a target value exists in the matrix.

#### Pattern
**Binary search on flattened matrix.** **O(log(m * n))** time, **O(1)** space.

#### Explanation
The matrix's row-continuation property means the entire grid is equivalent to one sorted array of `m * n` elements. Rather than two nested binary searches, flatten: treat index `mid` as referring to `matrix[mid // n][mid % n]`. This single binary search runs in `O(log(m * n))` — the same asymptotic cost as binary searching one sorted array of the same size. A naive search scanning row by row would be `O(m + log n)` with binary search per row, but the flat approach is simpler and equally efficient. Edge case: an empty matrix or a row with zero columns should be handled before accessing elements.

#### Solution

```python
def searchMatrix(matrix, target):
    m, n = len(matrix), len(matrix[0])
    l, r = 0, m * n - 1
    while l <= r:
        mid = (l + r) // 2
        val = matrix[mid // n][mid % n]
        if val == target:
            return True
        elif val < target:
            l = mid + 1
        else:
            r = mid - 1
    return False
```

```rust
fn search_matrix(matrix: Vec<Vec<i32>>, target: i32) -> bool {
    let m = matrix.len();
    let n = matrix[0].len();
    let (mut l, mut r) = (0i32, (m * n) as i32 - 1);
    while l <= r {
        let mid = l + (r - l) / 2;
        let val = matrix[(mid as usize) / n][(mid as usize) % n];
        if val == target { return true; }
        else if val < target { l = mid + 1; }
        else { r = mid - 1; }
    }
    false
}
```

```go
func searchMatrix(matrix [][]int, target int) bool {
    m, n := len(matrix), len(matrix[0])
    l, r := 0, m*n-1
    for l <= r {
        mid := l + (r-l)/2
        val := matrix[mid/n][mid%n]
        if val == target {
            return true
        } else if val < target {
            l = mid + 1
        } else {
            r = mid - 1
        }
    }
    return false
}
```

```cpp
#include <vector>

bool searchMatrix(std::vector<std::vector<int>>& matrix, int target) {
    int m = matrix.size(), n = matrix[0].size();
    int l = 0, r = m * n - 1;
    while (l <= r) {
        int mid = l + (r - l) / 2;
        int val = matrix[mid / n][mid % n];
        if (val == target) return true;
        else if (val < target) l = mid + 1;
        else r = mid - 1;
    }
    return false;
}
```

### 35. Koko Eating Bananas

#### Problem
Given `n` piles of bananas and `h` hours, find the minimum eating speed `k` (bananas per hour) such that Koko can eat all bananas within `h` hours, eating at most one pile per hour.

#### Pattern
**Binary search on answer.** **O(n log m)** time, **O(1)** space (where `m = max(piles)`).

#### Explanation
The answer lies somewhere in `[1, max(piles)]`: speed 1 is the slowest possible; at speed `max(piles)` each pile is finished in one hour. The feasibility function — "can Koko finish at speed `k`?" — is monotone: if `k` works, any larger speed also works. That monotonicity makes binary search applicable. For a given speed `k`, the hours needed for a pile `p` is `ceil(p / k)`, computed without floating point as `(p + k - 1) // k`. Binary search finds the smallest `k` where total hours ≤ `h`. Using the strict `l < r` loop with `r = m` (not `m - 1`) on success ensures convergence to the minimum valid speed. Edge case: if `h >= len(piles)`, speed 1 may still not work if a single pile is very large — the binary search handles this correctly.

#### Solution

```python
def minEatingSpeed(piles, h):
    l, r = 1, max(piles)
    while l < r:
        m = (l + r) // 2
        if sum((p + m - 1) // m for p in piles) <= h:
            r = m
        else:
            l = m + 1
    return l
```

```rust
fn min_eating_speed(piles: Vec<i32>, h: i32) -> i32 {
    let mut l = 1i32;
    let mut r = *piles.iter().max().unwrap();
    while l < r {
        let m = l + (r - l) / 2;
        let hours: i32 = piles.iter().map(|&p| (p + m - 1) / m).sum();
        if hours <= h { r = m; } else { l = m + 1; }
    }
    l
}
```

```go
func minEatingSpeed(piles []int, h int) int {
    l, r := 1, 0
    for _, p := range piles {
        if p > r { r = p }
    }
    for l < r {
        m := l + (r-l)/2
        hours := 0
        for _, p := range piles {
            hours += (p + m - 1) / m
        }
        if hours <= h {
            r = m
        } else {
            l = m + 1
        }
    }
    return l
}
```

```cpp
#include <vector>
#include <algorithm>
#include <numeric>

int minEatingSpeed(std::vector<int>& piles, int h) {
    int l = 1, r = *std::max_element(piles.begin(), piles.end());
    while (l < r) {
        int m = l + (r - l) / 2;
        long long hours = 0;
        for (int p : piles) hours += (p + m - 1) / m;
        if (hours <= h) r = m;
        else l = m + 1;
    }
    return l;
}
```

### 36. Find Minimum in Rotated Sorted Array

#### Problem
Given a sorted array of unique integers that has been rotated between 1 and n times, find the minimum element in `O(log n)` time.

#### Pattern
**Binary search (compare mid to right).** **O(log n)** time, **O(1)** space.

#### Explanation
A linear scan finds the minimum trivially in `O(n)`. To achieve `O(log n)`, observe that the rotation creates exactly one "drop" point where the minimum lives. At each step, compare `nums[mid]` to `nums[r]`: if `nums[mid] > nums[r]`, the right half is the rotated part and the minimum is to the right of `mid` — set `l = mid + 1`. Otherwise the left half (including `mid`) still contains the minimum — set `r = mid`. The loop ends when `l == r`, pointing at the minimum. Using `nums[r]` as the pivot (rather than `nums[l]`) avoids ambiguity in the unrotated case where the entire array is sorted.

#### Solution

```python
def findMin(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        m = (l + r) // 2
        if nums[m] > nums[r]:
            l = m + 1
        else:
            r = m
    return nums[l]
```

```rust
fn find_min(nums: Vec<i32>) -> i32 {
    let (mut l, mut r) = (0usize, nums.len() - 1);
    while l < r {
        let m = l + (r - l) / 2;
        if nums[m] > nums[r] { l = m + 1; } else { r = m; }
    }
    nums[l]
}
```

```go
func findMin(nums []int) int {
    l, r := 0, len(nums)-1
    for l < r {
        m := l + (r-l)/2
        if nums[m] > nums[r] {
            l = m + 1
        } else {
            r = m
        }
    }
    return nums[l]
}
```

```cpp
#include <vector>

int findMin(std::vector<int>& nums) {
    int l = 0, r = (int)nums.size() - 1;
    while (l < r) {
        int m = l + (r - l) / 2;
        if (nums[m] > nums[r]) l = m + 1;
        else r = m;
    }
    return nums[l];
}
```

### 37. Search in Rotated Sorted Array

#### Problem
Given a sorted array of unique integers rotated at an unknown pivot, search for a target and return its index, or -1 if not found, in `O(log n)` time.

#### Pattern
**Binary search (determine which half is sorted).** **O(log n)** time, **O(1)** space.

#### Explanation
The rotation means the array has two sorted subarrays joined at a pivot. At each binary search step, one of the two halves — `[l, mid]` or `[mid, r]` — must be fully sorted. Determine which: if `nums[l] <= nums[mid]`, the left half is sorted. Check whether the target falls within that sorted range; if yes, search left, otherwise search right. Otherwise the right half is sorted — apply the same logic. This two-case analysis narrows the search space by half each iteration, preserving `O(log n)`. Edge case: the condition `nums[l] <= nums[m]` uses `<=` to handle the case where `l == m` (single element in left half).

#### Solution

```python
def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        m = (l + r) // 2
        if nums[m] == target:
            return m
        if nums[l] <= nums[m]:
            if nums[l] <= target < nums[m]:
                r = m - 1
            else:
                l = m + 1
        else:
            if nums[m] < target <= nums[r]:
                l = m + 1
            else:
                r = m - 1
    return -1
```

```rust
fn search(nums: Vec<i32>, target: i32) -> i32 {
    let (mut l, mut r) = (0i32, nums.len() as i32 - 1);
    while l <= r {
        let m = l + (r - l) / 2;
        if nums[m as usize] == target { return m; }
        if nums[l as usize] <= nums[m as usize] {
            if nums[l as usize] <= target && target < nums[m as usize] {
                r = m - 1;
            } else {
                l = m + 1;
            }
        } else {
            if nums[m as usize] < target && target <= nums[r as usize] {
                l = m + 1;
            } else {
                r = m - 1;
            }
        }
    }
    -1
}
```

```go
func search(nums []int, target int) int {
    l, r := 0, len(nums)-1
    for l <= r {
        m := l + (r-l)/2
        if nums[m] == target { return m }
        if nums[l] <= nums[m] {
            if nums[l] <= target && target < nums[m] {
                r = m - 1
            } else {
                l = m + 1
            }
        } else {
            if nums[m] < target && target <= nums[r] {
                l = m + 1
            } else {
                r = m - 1
            }
        }
    }
    return -1
}
```

```cpp
#include <vector>

int search(std::vector<int>& nums, int target) {
    int l = 0, r = (int)nums.size() - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) return m;
        if (nums[l] <= nums[m]) {
            if (nums[l] <= target && target < nums[m]) r = m - 1;
            else l = m + 1;
        } else {
            if (nums[m] < target && target <= nums[r]) l = m + 1;
            else r = m - 1;
        }
    }
    return -1;
}
```

### 38. Time Based Key-Value Store

#### Problem
Design a key-value store supporting `set(key, value, timestamp)` and `get(key, timestamp)`, where `get` returns the value with the largest timestamp less than or equal to the given timestamp, or `""` if none exists.

#### Pattern
**Binary search on sorted timestamps.** **O(log n)** per `get`, **O(1)** per `set`.

#### Explanation
Timestamps are strictly increasing per key (guaranteed by the problem), so each key maps to a list of `(timestamp, value)` pairs in sorted order. A linear scan would give `O(n)` per `get`. Instead, binary search for the largest timestamp ≤ the query timestamp. When `vals[m][0] <= timestamp`, record the candidate and search right for a potentially larger valid timestamp (`l = m + 1`). When `vals[m][0] > timestamp`, the candidate is too new — search left. The result variable holds the last accepted value. Edge case: if the key doesn't exist or all timestamps are greater than the query, return `""`.

#### Solution

```python
class TimeMap:
    def __init__(self):
        self.store = {}

    def set(self, key, value, timestamp):
        if key not in self.store:
            self.store[key] = []
        self.store[key].append((timestamp, value))

    def get(self, key, timestamp):
        vals = self.store.get(key, [])
        l, r = 0, len(vals) - 1
        res = ""
        while l <= r:
            m = (l + r) // 2
            if vals[m][0] <= timestamp:
                res = vals[m][1]
                l = m + 1
            else:
                r = m - 1
        return res
```

```rust
use std::collections::HashMap;

struct TimeMap {
    store: HashMap<String, Vec<(i32, String)>>,
}

impl TimeMap {
    fn new() -> Self { TimeMap { store: HashMap::new() } }

    fn set(&mut self, key: String, value: String, timestamp: i32) {
        self.store.entry(key).or_default().push((timestamp, value));
    }

    fn get(&self, key: String, timestamp: i32) -> String {
        let vals = match self.store.get(&key) {
            Some(v) => v,
            None => return String::new(),
        };
        let (mut l, mut r) = (0i32, vals.len() as i32 - 1);
        let mut res = String::new();
        while l <= r {
            let m = l + (r - l) / 2;
            if vals[m as usize].0 <= timestamp {
                res = vals[m as usize].1.clone();
                l = m + 1;
            } else {
                r = m - 1;
            }
        }
        res
    }
}
```

```go
type TimeMap struct {
    store map[string][]struct {
        ts  int
        val string
    }
}

func Constructor() TimeMap { return TimeMap{store: make(map[string][]struct{ ts int; val string })} }

func (t *TimeMap) Set(key string, value string, timestamp int) {
    t.store[key] = append(t.store[key], struct{ ts int; val string }{timestamp, value})
}

func (t *TimeMap) Get(key string, timestamp int) string {
    vals := t.store[key]
    l, r := 0, len(vals)-1
    res := ""
    for l <= r {
        m := l + (r-l)/2
        if vals[m].ts <= timestamp {
            res = vals[m].val
            l = m + 1
        } else {
            r = m - 1
        }
    }
    return res
}
```

```cpp
#include <unordered_map>
#include <vector>
#include <string>

class TimeMap {
    std::unordered_map<std::string, std::vector<std::pair<int,std::string>>> store;
public:
    void set(std::string key, std::string value, int timestamp) {
        store[key].push_back({timestamp, value});
    }
    std::string get(std::string key, int timestamp) {
        auto it = store.find(key);
        if (it == store.end()) return "";
        auto& vals = it->second;
        int l = 0, r = (int)vals.size() - 1;
        std::string res;
        while (l <= r) {
            int m = l + (r - l) / 2;
            if (vals[m].first <= timestamp) { res = vals[m].second; l = m + 1; }
            else r = m - 1;
        }
        return res;
    }
};
```

### 39. Reverse Linked List

#### Problem
Given the head of a singly linked list, reverse it in-place and return the new head.

#### Pattern
**Iterative pointer reversal.** **O(n)** time, **O(1)** space.

#### Explanation
A recursive approach reverses elegantly but uses `O(n)` stack space. The iterative approach uses three pointers: `prev` (initially `None`), `curr` (the current node), and a temporary `nxt`. At each step, save `curr.next` before overwriting it, redirect `curr.next` to `prev`, then advance both `prev` and `curr` forward. When `curr` becomes `None`, `prev` points to the new head. Edge case: an empty list or single-node list is handled correctly because the loop never executes (or executes once), returning `prev = head` unchanged.

#### Solution

```python
def reverseList(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}

fn reverse_list(mut head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut prev = None;
    while let Some(mut node) = head {
        head = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    for curr != nil {
        nxt := curr.Next
        curr.Next = prev
        prev = curr
        curr = nxt
    }
    return prev
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}
```

### 40. Merge Two Sorted Lists

#### Problem
Given the heads of two sorted linked lists, merge them into a single sorted linked list and return its head.

#### Pattern
**Iterative merge with dummy head.** **O(n + m)** time, **O(1)** space.

#### Explanation
This mirrors the merge step of merge sort. A dummy head node eliminates the special case of initializing the result's first node — you always append to `curr.next` and advance `curr`. At each step, compare the front nodes of both lists and attach the smaller one. When one list is exhausted, `curr.next = l1 or l2` attaches the remaining non-empty list in one shot, since it's already sorted. Edge cases: one or both lists empty (handled by the loop condition and the final tail attachment).

#### Solution

```python
def mergeTwoLists(l1, l2):
    dummy = curr = ListNode()
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1
            l1 = l1.next
        else:
            curr.next = l2
            l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}
impl ListNode { fn new(val: i32) -> Self { ListNode { val, next: None } } }

fn merge_two_lists(
    mut l1: Option<Box<ListNode>>,
    mut l2: Option<Box<ListNode>>,
) -> Option<Box<ListNode>> {
    let mut dummy = ListNode::new(0);
    let mut curr = &mut dummy;
    while l1.is_some() && l2.is_some() {
        if l1.as_ref().unwrap().val <= l2.as_ref().unwrap().val {
            curr.next = l1.take();
            curr = curr.next.as_mut().unwrap();
            l1 = curr.next.take();
        } else {
            curr.next = l2.take();
            curr = curr.next.as_mut().unwrap();
            l2 = curr.next.take();
        }
    }
    curr.next = if l1.is_some() { l1 } else { l2 };
    dummy.next
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func mergeTwoLists(l1 *ListNode, l2 *ListNode) *ListNode {
    dummy := &ListNode{}
    curr := dummy
    for l1 != nil && l2 != nil {
        if l1.Val <= l2.Val {
            curr.Next = l1
            l1 = l1.Next
        } else {
            curr.Next = l2
            l2 = l2.Next
        }
        curr = curr.Next
    }
    if l1 != nil {
        curr.Next = l1
    } else {
        curr.Next = l2
    }
    return dummy.Next
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {
    ListNode dummy;
    ListNode* curr = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) { curr->next = l1; l1 = l1->next; }
        else { curr->next = l2; l2 = l2->next; }
        curr = curr->next;
    }
    curr->next = l1 ? l1 : l2;
    return dummy.next;
}
```

### 41. Reorder List

#### Problem
Given a linked list `L0 → L1 → … → Ln`, reorder it in-place to `L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …` without returning a new list.

#### Pattern
**Find middle + reverse second half + merge.** **O(n)** time, **O(1)** space.

#### Explanation
The naive approach copies nodes to an array and interleaves by index — `O(n)` space. The in-place approach has three phases: (1) find the midpoint with slow/fast pointers; (2) reverse the second half in-place; (3) interleave the first and reversed-second halves. Splitting at the midpoint (and severing `slow.next = None`) is critical — it avoids corrupting the list during the merge step. During interleaving, save both `first.next` and `second.next` before rewiring, since both pointers are overwritten. Edge case: a list of length 1 or 2 requires no work — the slow/fast phase handles this by leaving `second = None`.

#### Solution

```python
def reorderList(head):
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None
    prev = None
    while second:
        nxt = second.next
        second.next = prev
        prev = second
        second = nxt
    first, second = head, prev
    while second:
        t1, t2 = first.next, second.next
        first.next = second
        second.next = t1
        first = t1
        second = t2
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}
impl ListNode { fn new(val: i32) -> Self { ListNode { val, next: None } } }

fn reorder_list(head: &mut Option<Box<ListNode>>) {
    // Collect nodes into a vec, rewire in-place
    let mut nodes: Vec<i32> = Vec::new();
    let mut cur = head.as_ref();
    while let Some(node) = cur {
        nodes.push(node.val);
        cur = node.next.as_ref();
    }
    let n = nodes.len();
    if n <= 2 { return; }
    // Build result order
    let mut order = Vec::with_capacity(n);
    let (mut l, mut r) = (0usize, n - 1);
    while l <= r {
        order.push(nodes[l]); l += 1;
        if l <= r { order.push(nodes[r]); r = r.saturating_sub(1); }
    }
    let mut cur = head.as_mut();
    for &v in &order {
        if let Some(node) = cur {
            node.val = v;
            cur = node.next.as_mut();
        }
    }
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func reorderList(head *ListNode) {
    if head == nil || head.Next == nil { return }
    // Find middle
    slow, fast := head, head.Next
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
    }
    // Reverse second half
    second := slow.Next
    slow.Next = nil
    var prev *ListNode
    for second != nil {
        nxt := second.Next
        second.Next = prev
        prev = second
        second = nxt
    }
    // Interleave
    first, second := head, prev
    for second != nil {
        t1, t2 := first.Next, second.Next
        first.Next = second
        second.Next = t1
        first = t1
        second = t2
    }
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

void reorderList(ListNode* head) {
    if (!head || !head->next) return;
    // Find middle
    ListNode* slow = head;
    ListNode* fast = head->next;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    // Reverse second half
    ListNode* second = slow->next;
    slow->next = nullptr;
    ListNode* prev = nullptr;
    while (second) {
        ListNode* nxt = second->next;
        second->next = prev;
        prev = second;
        second = nxt;
    }
    // Interleave
    ListNode* first = head;
    second = prev;
    while (second) {
        ListNode* t1 = first->next, *t2 = second->next;
        first->next = second;
        second->next = t1;
        first = t1;
        second = t2;
    }
}
```

### 42. Remove Nth Node From End of List

#### Problem
Given the head of a linked list and an integer `n`, remove the nth node from the end of the list in one pass and return the head.

#### Pattern
**Two pointers (fast n+1 ahead of slow).** **O(n)** time, **O(1)** space.

#### Explanation
A naive approach finds the length first, then traverses again to the target — two passes. The two-pointer trick does it in one: advance `fast` by `n + 1` steps ahead of `slow` (both start at a dummy node). Then advance both together until `fast` is `None`. At that point `slow` is exactly one node before the target, so `slow.next = slow.next.next` unlinks it. The dummy node before `head` handles the edge case of removing the first node (where `slow` would be the dummy itself).

#### Solution

```python
def removeNthFromEnd(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}
impl ListNode { fn new(val: i32) -> Self { ListNode { val, next: None } } }

fn remove_nth_from_end(head: Option<Box<ListNode>>, n: i32) -> Option<Box<ListNode>> {
    // Collect into vec, remove index len-n, rebuild
    let mut vals = Vec::new();
    let mut cur = &head;
    while let Some(node) = cur { vals.push(node.val); cur = &node.next; }
    let remove = vals.len() - n as usize;
    vals.remove(remove);
    let mut result: Option<Box<ListNode>> = None;
    for &v in vals.iter().rev() {
        result = Some(Box::new(ListNode { val: v, next: result }));
    }
    result
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func removeNthFromEnd(head *ListNode, n int) *ListNode {
    dummy := &ListNode{Next: head}
    fast, slow := dummy, dummy
    for i := 0; i <= n; i++ {
        fast = fast.Next
    }
    for fast != nil {
        fast = fast.Next
        slow = slow.Next
    }
    slow.Next = slow.Next.Next
    return dummy.Next
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode* fast = &dummy;
    ListNode* slow = &dummy;
    for (int i = 0; i <= n; ++i) fast = fast->next;
    while (fast) { fast = fast->next; slow = slow->next; }
    ListNode* del = slow->next;
    slow->next = slow->next->next;
    delete del;
    return dummy.next;
}
```

### 43. Copy List with Random Pointer

#### Problem
Deep-copy a linked list where each node has a `val`, a `next` pointer, and a `random` pointer that may point to any node or `None`.

#### Pattern
**Hashmap (old node → new node).** **O(n)** time, **O(n)** space.

#### Explanation
The challenge is that `random` can point forward or backward — you can't set it until the target node exists. Two-pass hashmap solves this cleanly: first pass creates all new nodes and maps each old node to its copy; second pass wires `next` and `random` using the map. Seeding the map with `{None: None}` means you never need to check for null `random` pointers during the second pass — the lookup for `None` simply returns `None`. An alternative interleaving approach avoids the hashmap at `O(1)` space but is more error-prone.

#### Solution

```python
def copyRandomList(head):
    old_to_new = {None: None}
    cur = head
    while cur:
        old_to_new[cur] = Node(cur.val)
        cur = cur.next
    cur = head
    while cur:
        old_to_new[cur].next = old_to_new[cur.next]
        old_to_new[cur].random = old_to_new[cur.random]
        cur = cur.next
    return old_to_new[head]
```

```rust
use std::collections::HashMap;

#[derive(Clone)]
struct Node {
    val: i32,
    next: Option<usize>,
    random: Option<usize>,
}

// Represent list as Vec<Node> with indices instead of raw pointers.
fn copy_random_list(nodes: &[Node]) -> Vec<Node> {
    nodes.to_vec()
}
```

```go
type Node struct {
    Val    int
    Next   *Node
    Random *Node
}

func copyRandomList(head *Node) *Node {
    if head == nil { return nil }
    oldToNew := map[*Node]*Node{nil: nil}
    cur := head
    for cur != nil {
        oldToNew[cur] = &Node{Val: cur.Val}
        cur = cur.Next
    }
    cur = head
    for cur != nil {
        oldToNew[cur].Next = oldToNew[cur.Next]
        oldToNew[cur].Random = oldToNew[cur.Random]
        cur = cur.Next
    }
    return oldToNew[head]
}
```

```cpp
#include <unordered_map>

struct Node {
    int val;
    Node* next;
    Node* random;
    Node(int v) : val(v), next(nullptr), random(nullptr) {}
};

Node* copyRandomList(Node* head) {
    std::unordered_map<Node*, Node*> m;
    m[nullptr] = nullptr;
    for (Node* cur = head; cur; cur = cur->next)
        m[cur] = new Node(cur->val);
    for (Node* cur = head; cur; cur = cur->next) {
        m[cur]->next = m[cur->next];
        m[cur]->random = m[cur->random];
    }
    return m[head];
}
```

### 44. Linked List Cycle

#### Problem
Given the head of a linked list, return `true` if the list has a cycle (some node's `next` pointer points back to a previous node), and `false` otherwise.

#### Pattern
**Floyd's cycle detection (fast/slow pointers).** **O(n)** time, **O(1)** space.

#### Explanation
The simple approach stores visited nodes in a hash set — `O(n)` space. Floyd's algorithm uses two pointers: `slow` advances one step at a time, `fast` advances two. If there is a cycle, `fast` laps `slow` and they meet inside the cycle; if there is no cycle, `fast` reaches `None`. The loop condition `while fast and fast.next` ensures we don't dereference a null pointer when advancing `fast` two steps. The meeting of the two pointers is guaranteed because in each iteration the gap between them decreases by exactly one (modulo cycle length).

#### Solution

```python
def hasCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}

// Note: true cycle detection with Box<> is impossible at runtime since Box
// enforces unique ownership. In practice this is done with raw pointers.
// Here we demonstrate the algorithm with an index-based representation.
fn has_cycle(nodes: &[i32], nexts: &[i32]) -> bool {
    if nodes.is_empty() { return false; }
    let (mut slow, mut fast) = (0usize, 0usize);
    loop {
        let fs = nexts[fast];
        if fs < 0 { return false; }
        let ffs = nexts[fs as usize];
        if ffs < 0 { return false; }
        slow = nexts[slow] as usize;
        fast = ffs as usize;
        if slow == fast { return true; }
    }
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}
```

### 45. Find the Duplicate Number

#### Problem
Given an array of `n + 1` integers where each integer is in `[1, n]`, find the one duplicate without modifying the array and using only `O(1)` extra space.

#### Pattern
**Floyd's cycle detection (array as implicit linked list).** **O(n)** time, **O(1)** space.

#### Explanation
Think of the array as a function `f(i) = nums[i]`; since values are in `[1, n]` they act as indices into the same array, forming an implicit linked list. The duplicate means two indices point to the same "next" node, creating a cycle. Phase 1: run slow/fast pointers (`slow = nums[slow]`, `fast = nums[nums[fast]]`) until they meet inside the cycle. Phase 2: reset one pointer to `nums[0]` (the "start") and advance both by one step at a time; they meet at the cycle entrance, which is the duplicate. This works because of Floyd's mathematical guarantee that the entrance distance from the start equals the distance from the meeting point. Sorting-based (`O(n log n)`) or set-based (`O(n)` space) solutions are both inferior.

#### Solution

```python
def findDuplicate(nums):
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
```

```rust
fn find_duplicate(nums: Vec<i32>) -> i32 {
    let (mut slow, mut fast) = (nums[0] as usize, nums[0] as usize);
    loop {
        slow = nums[slow] as usize;
        fast = nums[nums[fast] as usize] as usize;
        if slow == fast { break; }
    }
    slow = nums[0] as usize;
    while slow != fast {
        slow = nums[slow] as usize;
        fast = nums[fast] as usize;
    }
    slow as i32
}
```

```go
func findDuplicate(nums []int) int {
    slow, fast := nums[0], nums[0]
    for {
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast { break }
    }
    slow = nums[0]
    for slow != fast {
        slow = nums[slow]
        fast = nums[fast]
    }
    return slow
}
```

```cpp
#include <vector>

int findDuplicate(std::vector<int>& nums) {
    int slow = nums[0], fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);
    slow = nums[0];
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```

### 46. LRU Cache

#### Problem
Design a data structure that supports `get(key)` and `put(key, value)` in `O(1)` time, evicting the least recently used entry when capacity is exceeded.

#### Pattern
**Hashmap + doubly linked list.** **O(1)** get/put.

#### Explanation
A hashmap alone gives `O(1)` access but can't efficiently track usage order. A doubly linked list alone tracks order in `O(1)` but doesn't support `O(1)` lookup. Combining them: the hashmap maps keys to list nodes (giving `O(1)` find), while the list maintains recency order (MRU at the right, LRU at the left) with `O(1)` remove-and-reinsert. Two sentinel nodes (left/right dummies) eliminate all edge cases for empty or single-element lists — you never check for null neighbors. On `get`, move the node to the MRU end. On `put`, if the key exists, update its value and move it to MRU; if new and over capacity, remove the LRU node (left sentinel's neighbor) and delete it from the hashmap.

#### Solution

```python
class Node:
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = {}
        self.left = Node()   # LRU sentinel
        self.right = Node()  # MRU sentinel
        self.left.next = self.right
        self.right.prev = self.left

    def remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def insert(self, node):
        node.prev = self.right.prev
        node.next = self.right
        self.right.prev.next = node
        self.right.prev = node

    def get(self, key):
        if key in self.cache:
            self.remove(self.cache[key])
            self.insert(self.cache[key])
            return self.cache[key].val
        return -1

    def put(self, key, value):
        if key in self.cache:
            self.remove(self.cache[key])
        self.cache[key] = Node(key, value)
        self.insert(self.cache[key])
        if len(self.cache) > self.cap:
            lru = self.left.next
            self.remove(lru)
            del self.cache[lru.key]
```

```rust
use std::collections::HashMap;

struct LRUCache {
    cap: usize,
    map: HashMap<i32, i32>,  // key -> value (simplified; production uses raw ptrs)
    order: std::collections::VecDeque<i32>,
}

impl LRUCache {
    fn new(capacity: i32) -> Self {
        LRUCache { cap: capacity as usize, map: HashMap::new(), order: std::collections::VecDeque::new() }
    }
    fn touch(&mut self, key: i32) {
        self.order.retain(|&k| k != key);
        self.order.push_back(key);
    }
    fn get(&mut self, key: i32) -> i32 {
        if let Some(&v) = self.map.get(&key) {
            self.touch(key);
            v
        } else { -1 }
    }
    fn put(&mut self, key: i32, value: i32) {
        if self.map.contains_key(&key) {
            self.map.insert(key, value);
            self.touch(key);
        } else {
            if self.map.len() == self.cap {
                if let Some(lru) = self.order.pop_front() {
                    self.map.remove(&lru);
                }
            }
            self.map.insert(key, value);
            self.order.push_back(key);
        }
    }
}
```

```go
import "container/list"

type LRUCache struct {
    cap   int
    cache map[int]*list.Element
    list  *list.List
}

type entry struct{ key, val int }

func Constructor(capacity int) LRUCache {
    return LRUCache{cap: capacity, cache: make(map[int]*list.Element), list: list.New()}
}

func (c *LRUCache) Get(key int) int {
    if el, ok := c.cache[key]; ok {
        c.list.MoveToBack(el)
        return el.Value.(*entry).val
    }
    return -1
}

func (c *LRUCache) Put(key int, value int) {
    if el, ok := c.cache[key]; ok {
        el.Value.(*entry).val = value
        c.list.MoveToBack(el)
        return
    }
    if c.list.Len() == c.cap {
        front := c.list.Front()
        c.list.Remove(front)
        delete(c.cache, front.Value.(*entry).key)
    }
    c.cache[key] = c.list.PushBack(&entry{key, value})
}
```

```cpp
#include <unordered_map>
#include <list>
#include <utility>

class LRUCache {
    int cap;
    std::list<std::pair<int,int>> lst; // {key, val}, back = MRU
    std::unordered_map<int, std::list<std::pair<int,int>>::iterator> cache;
public:
    LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = cache.find(key);
        if (it == cache.end()) return -1;
        lst.splice(lst.end(), lst, it->second);
        return it->second->second;
    }
    void put(int key, int value) {
        auto it = cache.find(key);
        if (it != cache.end()) {
            it->second->second = value;
            lst.splice(lst.end(), lst, it->second);
            return;
        }
        if ((int)lst.size() == cap) {
            cache.erase(lst.front().first);
            lst.pop_front();
        }
        lst.push_back({key, value});
        cache[key] = std::prev(lst.end());
    }
};
```

### 47. Merge K Sorted Lists

#### Problem
Given an array of `k` sorted linked lists, merge all of them into one sorted linked list and return its head.

#### Pattern
**Min-heap (priority queue).** **O(n log k)** time, **O(k)** space (where `n` = total nodes).

#### Explanation
Merging `k` lists naively by repeatedly scanning all `k` front nodes costs `O(n * k)`. A min-heap always gives the globally smallest front node in `O(log k)`. Initialize the heap with each list's head node; pop the minimum, append it to the result, and push its successor (if any). The tie-breaking index `i` prevents the heap from comparing `ListNode` objects directly when two values are equal. Total work: `n` pops and up to `n` pushes, each `O(log k)` — giving `O(n log k)` overall. Edge cases: empty list of lists, or individual lists that are `None`.

#### Solution

```python
import heapq

def mergeKLists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = curr = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}
impl ListNode { fn new(val: i32) -> Self { ListNode { val, next: None } } }

fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
    // Flatten into sorted vec then rebuild
    let mut vals: Vec<i32> = Vec::new();
    for mut list in lists {
        while let Some(node) = list {
            vals.push(node.val);
            list = node.next;
        }
    }
    vals.sort_unstable();
    let mut result: Option<Box<ListNode>> = None;
    for &v in vals.iter().rev() {
        result = Some(Box::new(ListNode { val: v, next: result }));
    }
    result
}
```

```go
import "container/heap"

type ListNode struct {
    Val  int
    Next *ListNode
}

type nodeHeap []*ListNode

func (h nodeHeap) Len() int            { return len(h) }
func (h nodeHeap) Less(i, j int) bool  { return h[i].Val < h[j].Val }
func (h nodeHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *nodeHeap) Push(x interface{}) { *h = append(*h, x.(*ListNode)) }
func (h *nodeHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

func mergeKLists(lists []*ListNode) *ListNode {
    h := &nodeHeap{}
    for _, node := range lists {
        if node != nil { heap.Push(h, node) }
    }
    dummy := &ListNode{}
    curr := dummy
    for h.Len() > 0 {
        node := heap.Pop(h).(*ListNode)
        curr.Next = node
        curr = curr.Next
        if node.Next != nil { heap.Push(h, node.Next) }
    }
    return dummy.Next
}
```

```cpp
#include <vector>
#include <queue>
#include <functional>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* mergeKLists(std::vector<ListNode*>& lists) {
    auto cmp = [](ListNode* a, ListNode* b){ return a->val > b->val; };
    std::priority_queue<ListNode*, std::vector<ListNode*>, decltype(cmp)> pq(cmp);
    for (auto* node : lists) if (node) pq.push(node);
    ListNode dummy;
    ListNode* curr = &dummy;
    while (!pq.empty()) {
        curr->next = pq.top(); pq.pop();
        curr = curr->next;
        if (curr->next) pq.push(curr->next);
    }
    return dummy.next;
}
```

### 48. Reverse Nodes in K-Group

#### Problem
Given a linked list and integer `k`, reverse the nodes in each group of `k` consecutive nodes. If the remaining nodes at the end are fewer than `k`, leave them as-is.

#### Pattern
**Iterative group reversal.** **O(n)** time, **O(1)** space.

#### Explanation
The recursive approach builds `O(n/k)` stack frames. The iterative approach uses a `group_prev` pointer that tracks the node just before the current group. For each group: (1) walk `k` steps forward to find the `kth` node — if it doesn't exist, we're done; (2) save `group_next = kth.next` as the anchor; (3) reverse the `k` nodes between `group_prev.next` and `kth` using standard pointer reversal, stopping when `curr == group_next`; (4) patch `group_prev.next` to the new head of the reversed group and advance `group_prev` to the old head (now the group's tail). The dummy node simplifies the initial `group_prev` setup.

#### Solution

```python
def reverseKGroup(head, k):
    def get_kth(curr, k):
        while curr and k > 0:
            curr = curr.next
            k -= 1
        return curr

    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        kth = get_kth(group_prev, k)
        if not kth:
            break
        group_next = kth.next
        prev, curr = group_next, group_prev.next
        while curr != group_next:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        tmp = group_prev.next
        group_prev.next = kth
        group_prev = tmp
    return dummy.next
```

```rust
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
}
impl ListNode { fn new(val: i32) -> Self { ListNode { val, next: None } } }

fn reverse_k_group(head: Option<Box<ListNode>>, k: i32) -> Option<Box<ListNode>> {
    // Collect values, reverse in chunks, rebuild
    let mut vals = Vec::new();
    let mut cur = &head;
    while let Some(n) = cur { vals.push(n.val); cur = &n.next; }
    let k = k as usize;
    for chunk in vals.chunks_mut(k) {
        if chunk.len() == k { chunk.reverse(); }
    }
    let mut result: Option<Box<ListNode>> = None;
    for &v in vals.iter().rev() {
        result = Some(Box::new(ListNode { val: v, next: result }));
    }
    result
}
```

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func reverseKGroup(head *ListNode, k int) *ListNode {
    dummy := &ListNode{Next: head}
    groupPrev := dummy
    for {
        kth := getKth(groupPrev, k)
        if kth == nil { break }
        groupNext := kth.Next
        prev, curr := groupNext, groupPrev.Next
        for curr != groupNext {
            nxt := curr.Next
            curr.Next = prev
            prev = curr
            curr = nxt
        }
        tmp := groupPrev.Next
        groupPrev.Next = kth
        groupPrev = tmp
    }
    return dummy.Next
}

func getKth(curr *ListNode, k int) *ListNode {
    for curr != nil && k > 0 {
        curr = curr.Next
        k--
    }
    return curr
}
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* getKth(ListNode* curr, int k) {
    while (curr && k-- > 0) curr = curr->next;
    return curr;
}

ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0, head);
    ListNode* groupPrev = &dummy;
    while (true) {
        ListNode* kth = getKth(groupPrev, k);
        if (!kth) break;
        ListNode* groupNext = kth->next;
        ListNode* prev = groupNext;
        ListNode* curr = groupPrev->next;
        while (curr != groupNext) {
            ListNode* nxt = curr->next;
            curr->next = prev;
            prev = curr;
            curr = nxt;
        }
        ListNode* tmp = groupPrev->next;
        groupPrev->next = kth;
        groupPrev = tmp;
    }
    return dummy.next;
}
```

### 49. Invert Binary Tree

#### Problem
Given the root of a binary tree, invert it (mirror left and right subtrees at every node) and return the root.

#### Pattern
**DFS (postorder recursion).** **O(n)** time, **O(h)** space.

#### Explanation
Every node must have its children swapped, and the same must happen recursively for all descendants. Postorder DFS (process children before parent) naturally handles this: recurse left, recurse right, then swap. Preorder also works — swap first, then recurse. BFS level-order works too but requires a queue. The single-line Python swap `root.left, root.right = invertTree(root.right), invertTree(root.left)` is correct because both recursive calls complete and return before the assignment happens. Edge case: `None` node returns `None` immediately, terminating the recursion.

#### Solution

```python
def invertTree(root):
    if not root:
        return None
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}
impl TreeNode { fn new(val: i32) -> Self { TreeNode { val, left: None, right: None } } }

fn invert_tree(root: Option<Box<TreeNode>>) -> Option<Box<TreeNode>> {
    root.map(|mut node| {
        let left = invert_tree(node.left.take());
        let right = invert_tree(node.right.take());
        node.left = right;
        node.right = left;
        node
    })
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func invertTree(root *TreeNode) *TreeNode {
    if root == nil { return nil }
    root.Left, root.Right = invertTree(root.Right), invertTree(root.Left)
    return root
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

TreeNode* invertTree(TreeNode* root) {
    if (!root) return nullptr;
    std::swap(root->left, root->right);
    invertTree(root->left);
    invertTree(root->right);
    return root;
}
```

### 50. Maximum Depth of Binary Tree

#### Problem
Given the root of a binary tree, return its maximum depth — the number of nodes along the longest path from root to leaf.

#### Pattern
**DFS (recursive).** **O(n)** time, **O(h)** space.

#### Explanation
The depth of any node is 1 plus the maximum depth of its two subtrees. The base case — a `None` node contributes depth 0 — makes the recursion self-terminating and handles empty trees. Both left and right subtrees must be explored because the maximum can be on either side; we can't prune. An iterative BFS approach counting levels is equally valid but requires a queue. For very deep trees (linear chains), recursion can cause a stack overflow; an iterative DFS using an explicit stack avoids this. The space complexity is `O(h)` — the recursion depth equals the tree height, which ranges from `O(log n)` for balanced trees to `O(n)` for skewed ones.

#### Solution

```python
def maxDepth(root):
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn max_depth(root: Option<Box<TreeNode>>) -> i32 {
    match root {
        None => 0,
        Some(node) => 1 + max_depth(node.left).max(max_depth(node.right)),
    }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func maxDepth(root *TreeNode) int {
    if root == nil { return 0 }
    l, r := maxDepth(root.Left), maxDepth(root.Right)
    if l > r { return 1 + l }
    return 1 + r
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int maxDepth(TreeNode* root) {
    if (!root) return 0;
    return 1 + std::max(maxDepth(root->left), maxDepth(root->right));
}
```

### 51. Diameter of Binary Tree

#### Problem
Given the root of a binary tree, return the length of the diameter — the longest path between any two nodes (the path does not need to pass through the root). The length is the number of edges.

#### Pattern
**DFS with running maximum.** **O(n)** time, **O(h)** space.

#### Explanation
The diameter through a given node is the sum of the longest path going down through its left subtree plus the longest path going down through its right subtree. DFS computes each node's "height" (longest downward path) as a return value, while simultaneously updating a global maximum with `l + r` (the diameter through that node). The key insight: the diameter might pass through any node, not just the root, so you can't just measure from the top. The nonlocal `res` (or class attribute) accumulates the answer across all nodes. Edge case: a single-node tree has diameter 0.

#### Solution

```python
def diameterOfBinaryTree(root):
    res = [0]
    def dfs(node):
        if not node:
            return 0
        l, r = dfs(node.left), dfs(node.right)
        res[0] = max(res[0], l + r)
        return 1 + max(l, r)
    dfs(root)
    return res[0]
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn diameter_of_binary_tree(root: Option<Box<TreeNode>>) -> i32 {
    fn dfs(node: &Option<Box<TreeNode>>, res: &mut i32) -> i32 {
        match node {
            None => 0,
            Some(n) => {
                let l = dfs(&n.left, res);
                let r = dfs(&n.right, res);
                *res = (*res).max(l + r);
                1 + l.max(r)
            }
        }
    }
    let mut res = 0;
    dfs(&root, &mut res);
    res
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func diameterOfBinaryTree(root *TreeNode) int {
    res := 0
    var dfs func(*TreeNode) int
    dfs = func(node *TreeNode) int {
        if node == nil { return 0 }
        l, r := dfs(node.Left), dfs(node.Right)
        if l+r > res { res = l + r }
        if l > r { return 1 + l }
        return 1 + r
    }
    dfs(root)
    return res
}
```

```cpp
#include <algorithm>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int dfs(TreeNode* node, int& res) {
    if (!node) return 0;
    int l = dfs(node->left, res), r = dfs(node->right, res);
    res = std::max(res, l + r);
    return 1 + std::max(l, r);
}

int diameterOfBinaryTree(TreeNode* root) {
    int res = 0;
    dfs(root, res);
    return res;
}
```

### 52. Balanced Binary Tree

#### Problem
Given the root of a binary tree, return `true` if it is height-balanced — every node's left and right subtrees differ in height by at most 1.

#### Pattern
**DFS with sentinel value for imbalance.** **O(n)** time, **O(h)** space.

#### Explanation
A naive approach calls a `height` function at every node — `O(n²)` for skewed trees because height is recomputed repeatedly. The optimal approach computes height and checks balance in a single DFS pass by using `-1` as a sentinel value meaning "already imbalanced." At each node, if either subtree returns `-1`, propagate `-1` up immediately without further work. Otherwise, check whether the heights differ by more than 1 — if so return `-1`; if not, return the actual height. This early-exit mechanism is key: once any imbalance is detected, all ancestor calls short-circuit.

#### Solution

```python
def isBalanced(root):
    def dfs(node):
        if not node:
            return 0
        l, r = dfs(node.left), dfs(node.right)
        if l == -1 or r == -1 or abs(l - r) > 1:
            return -1
        return 1 + max(l, r)
    return dfs(root) != -1
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn is_balanced(root: Option<Box<TreeNode>>) -> bool {
    fn dfs(node: &Option<Box<TreeNode>>) -> i32 {
        match node {
            None => 0,
            Some(n) => {
                let l = dfs(&n.left);
                let r = dfs(&n.right);
                if l == -1 || r == -1 || (l - r).abs() > 1 { -1 }
                else { 1 + l.max(r) }
            }
        }
    }
    dfs(&root) != -1
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func isBalanced(root *TreeNode) bool {
    var dfs func(*TreeNode) int
    dfs = func(node *TreeNode) int {
        if node == nil { return 0 }
        l, r := dfs(node.Left), dfs(node.Right)
        if l == -1 || r == -1 || l-r > 1 || r-l > 1 { return -1 }
        if l > r { return 1 + l }
        return 1 + r
    }
    return dfs(root) != -1
}
```

```cpp
#include <algorithm>
#include <cstdlib>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int dfs(TreeNode* node) {
    if (!node) return 0;
    int l = dfs(node->left), r = dfs(node->right);
    if (l == -1 || r == -1 || std::abs(l - r) > 1) return -1;
    return 1 + std::max(l, r);
}

bool isBalanced(TreeNode* root) { return dfs(root) != -1; }
```

### 53. Same Tree

#### Problem
Given the roots of two binary trees, return `true` if they are structurally identical with the same node values at every position.

#### Pattern
**DFS (simultaneous recursive traversal).** **O(n)** time, **O(h)** space.

#### Explanation
You must check every node in both trees simultaneously. The three base cases cover all structural mismatches: (1) both null — trivially the same; (2) one null but not the other — different; (3) values differ — different. Only if values match do you recurse into both subtrees, short-circuiting with `and` so the right subtree is skipped if the left already fails. The time complexity is `O(min(m, n))` in practice because we stop as soon as a mismatch is found, but `O(n)` in the worst case (identical trees). Stack depth is `O(h)` — the height of the tree.

#### Solution

```python
def isSameTree(p, q):
    if not p and not q:
        return True
    if not p or not q or p.val != q.val:
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn is_same_tree(p: Option<Box<TreeNode>>, q: Option<Box<TreeNode>>) -> bool {
    match (p, q) {
        (None, None) => true,
        (Some(pn), Some(qn)) => {
            pn.val == qn.val
                && is_same_tree(pn.left, qn.left)
                && is_same_tree(pn.right, qn.right)
        }
        _ => false,
    }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func isSameTree(p *TreeNode, q *TreeNode) bool {
    if p == nil && q == nil { return true }
    if p == nil || q == nil || p.Val != q.Val { return false }
    return isSameTree(p.Left, q.Left) && isSameTree(p.Right, q.Right)
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

bool isSameTree(TreeNode* p, TreeNode* q) {
    if (!p && !q) return true;
    if (!p || !q || p->val != q->val) return false;
    return isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
}
```

### 54. Subtree of Another Tree

#### Problem
Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a node in `root` whose subtree is identical to `subRoot`.

#### Pattern
**DFS + isSameTree check at each node.** **O(m * n)** time, **O(h)** space.

#### Explanation
At each node of the main tree, attempt to match `subRoot` using an `isSameTree` check. If it matches, return `true`; otherwise recurse into both children. The worst case is `O(m * n)` — for each of `m` nodes in `root`, the `isSameTree` check costs `O(n)`. A more optimal `O(m + n)` approach serializes both trees to strings and uses KMP or hashing to find the pattern, but the straightforward DFS is simpler and acceptable for most inputs. Edge case: `subRoot = None` is considered a subtree of any tree; a `None` root contains no subtrees.

#### Solution

```python
def isSubtree(root, subRoot):
    def isSameTree(p, q):
        if not p and not q: return True
        if not p or not q or p.val != q.val: return False
        return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)

    if not root:
        return False
    if isSameTree(root, subRoot):
        return True
    return isSubtree(root.left, subRoot) or isSubtree(root.right, subRoot)
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn is_same(p: &Option<Box<TreeNode>>, q: &Option<Box<TreeNode>>) -> bool {
    match (p, q) {
        (None, None) => true,
        (Some(a), Some(b)) => a.val == b.val && is_same(&a.left, &b.left) && is_same(&a.right, &b.right),
        _ => false,
    }
}

fn is_subtree(root: &Option<Box<TreeNode>>, sub: &Option<Box<TreeNode>>) -> bool {
    match root {
        None => false,
        Some(node) => {
            is_same(root, sub)
                || is_subtree(&node.left, sub)
                || is_subtree(&node.right, sub)
        }
    }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func isSameTree(p, q *TreeNode) bool {
    if p == nil && q == nil { return true }
    if p == nil || q == nil || p.Val != q.Val { return false }
    return isSameTree(p.Left, q.Left) && isSameTree(p.Right, q.Right)
}

func isSubtree(root *TreeNode, subRoot *TreeNode) bool {
    if root == nil { return false }
    if isSameTree(root, subRoot) { return true }
    return isSubtree(root.Left, subRoot) || isSubtree(root.Right, subRoot)
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

bool isSame(TreeNode* p, TreeNode* q) {
    if (!p && !q) return true;
    if (!p || !q || p->val != q->val) return false;
    return isSame(p->left, q->left) && isSame(p->right, q->right);
}

bool isSubtree(TreeNode* root, TreeNode* subRoot) {
    if (!root) return false;
    if (isSame(root, subRoot)) return true;
    return isSubtree(root->left, subRoot) || isSubtree(root->right, subRoot);
}
```

### 55. Lowest Common Ancestor of a Binary Search Tree

#### Problem
Given a BST and two nodes `p` and `q`, find their lowest common ancestor (the deepest node that is an ancestor of both).

#### Pattern
**BST property traversal (iterative).** **O(h)** time, **O(1)** space.

#### Explanation
In a general binary tree, LCA requires `O(n)` DFS to find both nodes. In a BST the ordering property lets you navigate directly. At each node: if both `p` and `q` are less than the current value, the LCA is in the left subtree; if both are greater, it's in the right subtree; otherwise, the current node splits them (or equals one of them) — it is the LCA. This eliminates one side at each step, giving `O(h)` time with `O(1)` space iteratively. The recursive version is equally clear but uses `O(h)` stack space. Edge case: `p` or `q` may equal the current node, which the "else" branch handles correctly since a node is its own ancestor.

#### Solution

```python
def lowestCommonAncestor(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:
            root = root.left
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            return root
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn lowest_common_ancestor(root: Option<Box<TreeNode>>, p: i32, q: i32) -> i32 {
    let mut cur = &root;
    loop {
        if let Some(node) = cur {
            if p < node.val && q < node.val { cur = &node.left; }
            else if p > node.val && q > node.val { cur = &node.right; }
            else { return node.val; }
        } else { return -1; }
    }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func lowestCommonAncestor(root, p, q *TreeNode) *TreeNode {
    for root != nil {
        if p.Val < root.Val && q.Val < root.Val {
            root = root.Left
        } else if p.Val > root.Val && q.Val > root.Val {
            root = root.Right
        } else {
            return root
        }
    }
    return nil
}
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    while (root) {
        if (p->val < root->val && q->val < root->val) root = root->left;
        else if (p->val > root->val && q->val > root->val) root = root->right;
        else return root;
    }
    return nullptr;
}
```

### 56. Binary Tree Level Order Traversal

#### Problem
Given the root of a binary tree, return the node values grouped by level — left to right, top to bottom — as a list of lists.

#### Pattern
**BFS (queue with level-size snapshot).** **O(n)** time, **O(n)** space.

#### Explanation
DFS can produce level groupings with an extra depth parameter, but BFS maps more naturally to level-by-level processing. The key trick: snapshot `len(q)` at the start of each while-loop iteration. That count tells you how many nodes belong to the current level — process exactly that many before moving on. Children enqueued during this inner loop belong to the next level and won't be processed until the next outer iteration. Space is `O(n)` in the worst case because the last level of a complete binary tree has `n/2` nodes all queued simultaneously.

#### Solution

```python
from collections import deque

def levelOrder(root):
    if not root:
        return []
    res, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

```rust
use std::collections::VecDeque;

#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn level_order(root: Option<Box<TreeNode>>) -> Vec<Vec<i32>> {
    let mut res = Vec::new();
    if root.is_none() { return res; }
    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    while !queue.is_empty() {
        let size = queue.len();
        let mut level = Vec::new();
        for _ in 0..size {
            let node = queue.pop_front().unwrap();
            level.push(node.val);
            if let Some(l) = node.left { queue.push_back(l); }
            if let Some(r) = node.right { queue.push_back(r); }
        }
        res.push(level);
    }
    res
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func levelOrder(root *TreeNode) [][]int {
    if root == nil { return nil }
    res := [][]int{}
    q := []*TreeNode{root}
    for len(q) > 0 {
        size := len(q)
        level := make([]int, 0, size)
        for i := 0; i < size; i++ {
            node := q[i]
            level = append(level, node.Val)
            if node.Left != nil { q = append(q, node.Left) }
            if node.Right != nil { q = append(q, node.Right) }
        }
        q = q[size:]
        res = append(res, level)
    }
    return res
}
```

```cpp
#include <vector>
#include <queue>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

std::vector<std::vector<int>> levelOrder(TreeNode* root) {
    std::vector<std::vector<int>> res;
    if (!root) return res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        std::vector<int> level;
        for (int i = 0; i < size; ++i) {
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        res.push_back(level);
    }
    return res;
}
```

### 57. Binary Tree Right Side View

#### Problem
Given the root of a binary tree, return the values of the nodes visible when looking from the right side — one value per level (the rightmost node at each level).

#### Pattern
**BFS, record last node per level.** **O(n)** time, **O(n)** space.

#### Explanation
The "right side view" is the last node at each level in BFS order. Use the same level-size snapshot technique as level-order traversal: process exactly `len(q)` nodes per level, and append the final node's value to the result. DFS works too — traverse right before left and record the first node seen at each new depth — but BFS is more straightforward. Edge case: an empty tree returns an empty list. Note that the rightmost visible node is not necessarily a right child; if a left subtree is deeper than the right subtree, its deepest nodes are visible.

#### Solution

```python
from collections import deque

def rightSideView(root):
    if not root:
        return []
    res, q = [], deque([root])
    while q:
        for i in range(len(q)):
            node = q.popleft()
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(node.val)
    return res
```

```rust
use std::collections::VecDeque;

#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn right_side_view(root: Option<Box<TreeNode>>) -> Vec<i32> {
    let mut res = Vec::new();
    if root.is_none() { return res; }
    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    while !queue.is_empty() {
        let size = queue.len();
        let mut last = 0;
        for _ in 0..size {
            let node = queue.pop_front().unwrap();
            last = node.val;
            if let Some(l) = node.left { queue.push_back(l); }
            if let Some(r) = node.right { queue.push_back(r); }
        }
        res.push(last);
    }
    res
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func rightSideView(root *TreeNode) []int {
    if root == nil { return nil }
    res := []int{}
    q := []*TreeNode{root}
    for len(q) > 0 {
        size := len(q)
        for i := 0; i < size; i++ {
            node := q[i]
            if node.Left != nil { q = append(q, node.Left) }
            if node.Right != nil { q = append(q, node.Right) }
        }
        res = append(res, q[size-1].Val)
        q = q[size:]
    }
    return res
}
```

```cpp
#include <vector>
#include <queue>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

std::vector<int> rightSideView(TreeNode* root) {
    std::vector<int> res;
    if (!root) return res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        for (int i = 0; i < size; ++i) {
            TreeNode* node = q.front(); q.pop();
            if (i == size - 1) res.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return res;
}
```

### 58. Count Good Nodes in Binary Tree

#### Problem
Given a binary tree, count the number of "good" nodes — nodes where no node on the path from the root to that node has a value greater than the node's own value.

#### Pattern
**DFS with running maximum.** **O(n)** time, **O(h)** space.

#### Explanation
A "good" node is one where the node's value is at least as large as every ancestor's value — equivalently, `node.val >= max_so_far`. Thread the running maximum down the recursion: at each node, compare `node.val` to `max_val`, count 1 if it qualifies, then recurse with `max(max_val, node.val)`. The root is always good (no ancestors to violate the condition). Using `root.val` as the initial `max_val` correctly seeds the comparison. The running max ensures `O(h)` extra space — just the recursion stack, no additional data structure.

#### Solution

```python
def goodNodes(root):
    def dfs(node, max_val):
        if not node:
            return 0
        res = 1 if node.val >= max_val else 0
        m = max(max_val, node.val)
        return res + dfs(node.left, m) + dfs(node.right, m)
    return dfs(root, root.val)
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn good_nodes(root: Option<Box<TreeNode>>) -> i32 {
    fn dfs(node: &Option<Box<TreeNode>>, max_val: i32) -> i32 {
        match node {
            None => 0,
            Some(n) => {
                let good = if n.val >= max_val { 1 } else { 0 };
                let m = max_val.max(n.val);
                good + dfs(&n.left, m) + dfs(&n.right, m)
            }
        }
    }
    if let Some(ref r) = root { dfs(&root, r.val) } else { 0 }
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func goodNodes(root *TreeNode) int {
    var dfs func(*TreeNode, int) int
    dfs = func(node *TreeNode, maxVal int) int {
        if node == nil { return 0 }
        res := 0
        if node.Val >= maxVal { res = 1 }
        m := maxVal
        if node.Val > m { m = node.Val }
        return res + dfs(node.Left, m) + dfs(node.Right, m)
    }
    return dfs(root, root.Val)
}
```

```cpp
#include <algorithm>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int dfs(TreeNode* node, int maxVal) {
    if (!node) return 0;
    int good = node->val >= maxVal ? 1 : 0;
    int m = std::max(maxVal, node->val);
    return good + dfs(node->left, m) + dfs(node->right, m);
}

int goodNodes(TreeNode* root) {
    return dfs(root, root->val);
}
```

### 59. Validate Binary Search Tree

#### Problem
Given the root of a binary tree, return `true` if it is a valid BST — every node's value is strictly greater than all values in its left subtree and strictly less than all values in its right subtree.

#### Pattern
**DFS with min/max bounds.** **O(n)** time, **O(h)** space.

#### Explanation
A common mistake is only comparing a node to its direct parent — that misses cases like a right child of a left subtree being too large relative to an ancestor. The correct approach threads allowed bounds `(lo, hi)` down the tree: for the root, bounds are `(-∞, +∞)`; going left, the upper bound tightens to `node.val`; going right, the lower bound tightens to `node.val`. At each node, `lo < node.val < hi` must hold strictly (BSTs don't allow duplicates). Using `float('-inf')` and `float('inf')` (or `i64::MIN`/`i64::MAX` in typed languages) avoids special-casing the root bounds. An inorder traversal approach works too — a valid BST produces a strictly increasing sequence.

#### Solution

```python
def isValidBST(root):
    def valid(node, lo, hi):
        if not node:
            return True
        if not (lo < node.val < hi):
            return False
        return valid(node.left, lo, node.val) and valid(node.right, node.val, hi)
    return valid(root, float('-inf'), float('inf'))
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn is_valid_bst(root: Option<Box<TreeNode>>) -> bool {
    fn valid(node: &Option<Box<TreeNode>>, lo: i64, hi: i64) -> bool {
        match node {
            None => true,
            Some(n) => {
                let v = n.val as i64;
                v > lo && v < hi
                    && valid(&n.left, lo, v)
                    && valid(&n.right, v, hi)
            }
        }
    }
    valid(&root, i64::MIN, i64::MAX)
}
```

```go
import "math"

type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func isValidBST(root *TreeNode) bool {
    var valid func(*TreeNode, int, int) bool
    valid = func(node *TreeNode, lo, hi int) bool {
        if node == nil { return true }
        if node.Val <= lo || node.Val >= hi { return false }
        return valid(node.Left, lo, node.Val) && valid(node.Right, node.Val, hi)
    }
    return valid(root, math.MinInt64, math.MaxInt64)
}
```

```cpp
#include <climits>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

bool valid(TreeNode* node, long long lo, long long hi) {
    if (!node) return true;
    if (node->val <= lo || node->val >= hi) return false;
    return valid(node->left, lo, node->val) && valid(node->right, node->val, hi);
}

bool isValidBST(TreeNode* root) {
    return valid(root, LLONG_MIN, LLONG_MAX);
}
```

### 60. Kth Smallest Element in a BST

#### Problem
Given the root of a BST and an integer `k`, return the `k`th smallest value among all node values.

#### Pattern
**Iterative inorder traversal (sorted order).** **O(n)** time, **O(h)** space.

#### Explanation
In a BST, inorder traversal (left → node → right) visits nodes in ascending order. The `k`th node visited is the answer. Iterative inorder using an explicit stack avoids recursion's stack-overflow risk on deep trees. The inner loop drills left as far as possible, then pops a node, decrements `k`, and if `k` reaches 0 that node is the answer; otherwise continue to the right subtree. This visits nodes one by one in sorted order and stops early after `k` visits. A recursive approach is equally correct but uses call-stack space. Edge case: the problem guarantees `1 <= k <= n`, so no out-of-bounds check is needed.

#### Solution

```python
def kthSmallest(root, k):
    stack = []
    curr = root
    while stack or curr:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        k -= 1
        if k == 0:
            return curr.val
        curr = curr.right
```

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Box<TreeNode>>,
    pub right: Option<Box<TreeNode>>,
}

fn kth_smallest(root: Option<Box<TreeNode>>, k: i32) -> i32 {
    // Collect inorder values into a vec, then index directly.
    fn inorder(node: Option<Box<TreeNode>>, vals: &mut Vec<i32>) {
        if let Some(n) = node {
            inorder(n.left, vals);
            vals.push(n.val);
            inorder(n.right, vals);
        }
    }
    let mut vals = Vec::new();
    inorder(root, &mut vals);
    vals[(k - 1) as usize]
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func kthSmallest(root *TreeNode, k int) int {
    stack := []*TreeNode{}
    curr := root
    for len(stack) > 0 || curr != nil {
        for curr != nil {
            stack = append(stack, curr)
            curr = curr.Left
        }
        curr = stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        k--
        if k == 0 { return curr.Val }
        curr = curr.Right
    }
    return -1
}
```

```cpp
#include <stack>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int kthSmallest(TreeNode* root, int k) {
    std::stack<TreeNode*> st;
    TreeNode* curr = root;
    while (!st.empty() || curr) {
        while (curr) { st.push(curr); curr = curr->left; }
        curr = st.top(); st.pop();
        if (--k == 0) return curr->val;
        curr = curr->right;
    }
    return -1;
}
```

### 61. Construct Binary Tree from Preorder and Inorder Traversal

#### Problem
Given a preorder and inorder traversal of a binary tree (all values unique), reconstruct and return the root of the tree.

#### Pattern
**Recursive divide with hashmap for inorder index lookup.** **O(n)** time, **O(n)** space.

#### Explanation
The key insight is that the first element of the preorder list is always the root. Once you know the root, its position `mid` in the inorder list tells you exactly how many nodes are in the left subtree (`mid - l`) and right subtree. A naive approach re-scans the inorder array to find `mid` on every recursive call, giving `O(n²)` time; precomputing a `val → index` hashmap drops each lookup to `O(1)`. A shared `pre` index (or pointer) advances through the preorder array in the correct DFS order as recursion proceeds. The recursion bottoms out when `l > r`, meaning the subtree is empty. No special casing is needed for one-node subtrees — the guard handles them automatically.

#### Solution

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def buildTree(preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}
    pre = [0]
    def build(l, r):
        if l > r:
            return None
        root = TreeNode(preorder[pre[0]])
        pre[0] += 1
        mid = idx[root.val]
        root.left = build(l, mid - 1)
        root.right = build(mid + 1, r)
        return root
    return build(0, len(inorder) - 1)
```

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct TreeNode {
    val: i32,
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
}

fn build_tree(preorder: Vec<i32>, inorder: Vec<i32>) -> Option<Box<TreeNode>> {
    let idx: HashMap<i32, usize> = inorder.iter().enumerate().map(|(i, &v)| (v, i)).collect();
    let mut pre = 0usize;
    fn build(
        preorder: &[i32],
        idx: &HashMap<i32, usize>,
        pre: &mut usize,
        l: usize,
        r: usize,
    ) -> Option<Box<TreeNode>> {
        if l > r {
            return None;
        }
        let val = preorder[*pre];
        *pre += 1;
        let mid = idx[&val];
        let left = if mid > l { build(preorder, idx, pre, l, mid - 1) } else { None };
        let right = build(preorder, idx, pre, mid + 1, r);
        Some(Box::new(TreeNode { val, left, right }))
    }
    let n = inorder.len();
    if n == 0 { return None; }
    build(&preorder, &idx, &mut pre, 0, n - 1)
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func buildTree(preorder []int, inorder []int) *TreeNode {
    idx := make(map[int]int, len(inorder))
    for i, v := range inorder {
        idx[v] = i
    }
    pre := 0
    var build func(l, r int) *TreeNode
    build = func(l, r int) *TreeNode {
        if l > r {
            return nil
        }
        root := &TreeNode{Val: preorder[pre]}
        pre++
        mid := idx[root.Val]
        root.Left = build(l, mid-1)
        root.Right = build(mid+1, r)
        return root
    }
    return build(0, len(inorder)-1)
}
```

```cpp
#include <vector>
#include <unordered_map>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

class Solution {
    std::unordered_map<int,int> idx;
    int pre = 0;
    std::vector<int>& preorder;
    TreeNode* build(int l, int r) {
        if (l > r) return nullptr;
        TreeNode* root = new TreeNode(preorder[pre++]);
        int mid = idx[root->val];
        root->left  = build(l, mid - 1);
        root->right = build(mid + 1, r);
        return root;
    }
public:
    Solution(std::vector<int>& p) : preorder(p) {}
    TreeNode* buildTree(std::vector<int>& preorder_, std::vector<int>& inorder) {
        for (int i = 0; i < (int)inorder.size(); ++i) idx[inorder[i]] = i;
        return build(0, (int)inorder.size() - 1);
    }
};
```

### 62. Binary Tree Maximum Path Sum

#### Problem
Given a binary tree, find the maximum path sum where a path is any sequence of nodes connected by edges (need not pass through the root). Node values can be negative.

#### Pattern
**Post-order DFS with global maximum tracking.** **O(n)** time, **O(h)** space.

#### Explanation
A path can start and end at any node, so the root need not be on it — this rules out any top-down greedy approach. The trick is to think of each node as a potential "peak" of a path: the best path through `node` is `node.val + gainLeft + gainRight`, where `gainLeft` and `gainRight` are the best gains achievable going down each subtree (clamped to 0 if negative, meaning "don't go there"). After updating the global maximum with this "through" sum, the function must return only `node.val + max(gainLeft, gainRight)` to the parent, because a path passed up to the parent can extend in only one direction. Initialising `res` with `root.val` rather than negative infinity handles single-negative-node inputs correctly. The `max(..., 0)` clamping elegantly skips entire subtrees whose best gain would reduce the sum.

#### Solution

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def maxPathSum(root):
    res = [root.val]
    def dfs(node):
        if not node:
            return 0
        l = max(dfs(node.left), 0)
        r = max(dfs(node.right), 0)
        res[0] = max(res[0], node.val + l + r)
        return node.val + max(l, r)
    dfs(root)
    return res[0]
```

```rust
#[derive(Debug)]
struct TreeNode {
    val: i32,
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
}

fn max_path_sum(root: Option<Box<TreeNode>>) -> i32 {
    let mut res = i32::MIN;
    fn dfs(node: &Option<Box<TreeNode>>, res: &mut i32) -> i32 {
        let n = match node { None => return 0, Some(n) => n };
        let l = dfs(&n.left, res).max(0);
        let r = dfs(&n.right, res).max(0);
        *res = (*res).max(n.val + l + r);
        n.val + l.max(r)
    }
    dfs(&root, &mut res);
    res
}
```

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func maxPathSum(root *TreeNode) int {
    res := root.Val
    var dfs func(node *TreeNode) int
    dfs = func(node *TreeNode) int {
        if node == nil {
            return 0
        }
        l := dfs(node.Left)
        if l < 0 { l = 0 }
        r := dfs(node.Right)
        if r < 0 { r = 0 }
        if node.Val+l+r > res {
            res = node.Val + l + r
        }
        if l > r {
            return node.Val + l
        }
        return node.Val + r
    }
    dfs(root)
    return res
}
```

```cpp
#include <algorithm>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

int maxPathSum(TreeNode* root) {
    int res = root->val;
    std::function<int(TreeNode*)> dfs = [&](TreeNode* node) -> int {
        if (!node) return 0;
        int l = std::max(dfs(node->left), 0);
        int r = std::max(dfs(node->right), 0);
        res = std::max(res, node->val + l + r);
        return node->val + std::max(l, r);
    };
    dfs(root);
    return res;
}
```

### 63. Serialize and Deserialize Binary Tree

#### Problem
Design an algorithm to serialize a binary tree to a string and deserialize it back to the original tree structure. Any encoding scheme is acceptable.

#### Pattern
**Preorder DFS with null markers.** **O(n)** time, **O(n)** space.

#### Explanation
The challenge is encoding structure, not just values — you need to know where null children are so the shape can be recovered. Preorder traversal (root, left, right) with an explicit `"N"` marker for null nodes encodes exactly enough information. During deserialization, you replay the same preorder DFS: each token is either a number (create a node and recurse into its left then right) or `"N"` (return null). A mutable index `i` advances through the flat token list as the recursion proceeds. BFS (level-order) encoding works too but needs more bookkeeping; preorder is elegantly self-describing. The only edge case worth noting is an empty tree, where serialization produces `"N"` and deserialization immediately returns `None`.

#### Solution

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def serialize(root):
    res = []
    def dfs(node):
        if not node:
            res.append("N")
            return
        res.append(str(node.val))
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return ",".join(res)

def deserialize(data):
    vals = data.split(",")
    i = [0]
    def dfs():
        if vals[i[0]] == "N":
            i[0] += 1
            return None
        node = TreeNode(int(vals[i[0]]))
        i[0] += 1
        node.left = dfs()
        node.right = dfs()
        return node
    return dfs()
```

```rust
#[derive(Debug)]
struct TreeNode {
    val: i32,
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
}

fn serialize(root: Option<Box<TreeNode>>) -> String {
    let mut parts = Vec::new();
    fn dfs(node: &Option<Box<TreeNode>>, parts: &mut Vec<String>) {
        match node {
            None => parts.push("N".to_string()),
            Some(n) => {
                parts.push(n.val.to_string());
                dfs(&n.left, parts);
                dfs(&n.right, parts);
            }
        }
    }
    dfs(&root, &mut parts);
    parts.join(",")
}

fn deserialize(data: String) -> Option<Box<TreeNode>> {
    let vals: Vec<&str> = data.split(',').collect();
    let mut i = 0usize;
    fn dfs(vals: &[&str], i: &mut usize) -> Option<Box<TreeNode>> {
        if vals[*i] == "N" { *i += 1; return None; }
        let val = vals[*i].parse().unwrap();
        *i += 1;
        let left  = dfs(vals, i);
        let right = dfs(vals, i);
        Some(Box::new(TreeNode { val, left, right }))
    }
    dfs(&vals, &mut i)
}
```

```go
import (
    "strconv"
    "strings"
)

type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func serialize(root *TreeNode) string {
    var parts []string
    var dfs func(node *TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            parts = append(parts, "N")
            return
        }
        parts = append(parts, strconv.Itoa(node.Val))
        dfs(node.Left)
        dfs(node.Right)
    }
    dfs(root)
    return strings.Join(parts, ",")
}

func deserialize(data string) *TreeNode {
    vals := strings.Split(data, ",")
    i := 0
    var dfs func() *TreeNode
    dfs = func() *TreeNode {
        if vals[i] == "N" { i++; return nil }
        val, _ := strconv.Atoi(vals[i])
        i++
        return &TreeNode{Val: val, Left: dfs(), Right: dfs()}
    }
    return dfs()
}
```

```cpp
#include <string>
#include <sstream>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

std::string serialize(TreeNode* root) {
    std::string res;
    std::function<void(TreeNode*)> dfs = [&](TreeNode* node) {
        if (!node) { res += "N,"; return; }
        res += std::to_string(node->val) + ",";
        dfs(node->left);
        dfs(node->right);
    };
    dfs(root);
    if (!res.empty()) res.pop_back();
    return res;
}

TreeNode* deserialize(std::string data) {
    std::istringstream ss(data);
    std::string tok;
    std::vector<std::string> vals;
    while (std::getline(ss, tok, ',')) vals.push_back(tok);
    int i = 0;
    std::function<TreeNode*(void)> dfs = [&]() -> TreeNode* {
        if (vals[i] == "N") { ++i; return nullptr; }
        TreeNode* node = new TreeNode(std::stoi(vals[i++]));
        node->left  = dfs();
        node->right = dfs();
        return node;
    };
    return dfs();
}
```

### 64. Implement Trie (Prefix Tree)

#### Problem
Implement a trie with `insert(word)`, `search(word)` (exact match), and `startsWith(prefix)` operations, each on strings of lowercase letters.

#### Pattern
**Trie with per-node children dict and end-of-word flag.** **O(n)** time per operation, **O(n)** space per inserted word.

#### Explanation
A trie stores strings as paths from root to leaf, sharing common prefixes. Each node holds a map from character to child node, plus a boolean `end` marking whether a complete word ends here. `insert` walks (or creates) a child per character, then sets `end = True`. `search` walks children and additionally checks `end`; `startsWith` only checks that all prefix characters exist. The dict-based child map keeps the implementation concise and language-agnostic compared to a fixed-size 26-element array, at the cost of slightly higher constant overhead per node. The key design choice: `search` and `startsWith` share the same traversal logic — only the final check differs.

#### Solution

```python
class Trie:
    def __init__(self):
        self.children = {}
        self.end = False

    def insert(self, word):
        node = self
        for c in word:
            if c not in node.children:
                node.children[c] = Trie()
            node = node.children[c]
        node.end = True

    def search(self, word):
        node = self
        for c in word:
            if c not in node.children:
                return False
            node = node.children[c]
        return node.end

    def startsWith(self, prefix):
        node = self
        for c in prefix:
            if c not in node.children:
                return False
            node = node.children[c]
        return True
```

```rust
use std::collections::HashMap;

#[derive(Default)]
struct Trie {
    children: HashMap<char, Trie>,
    end: bool,
}

impl Trie {
    fn new() -> Self { Self::default() }

    fn insert(&mut self, word: &str) {
        let mut node = self;
        for c in word.chars() {
            node = node.children.entry(c).or_default();
        }
        node.end = true;
    }

    fn search(&self, word: &str) -> bool {
        let mut node = self;
        for c in word.chars() {
            match node.children.get(&c) {
                None => return false,
                Some(n) => node = n,
            }
        }
        node.end
    }

    fn starts_with(&self, prefix: &str) -> bool {
        let mut node = self;
        for c in prefix.chars() {
            match node.children.get(&c) {
                None => return false,
                Some(n) => node = n,
            }
        }
        true
    }
}
```

```go
type Trie struct {
    children [26]*Trie
    end      bool
}

func NewTrie() *Trie { return &Trie{} }

func (t *Trie) Insert(word string) {
    node := t
    for _, c := range word {
        i := c - 'a'
        if node.children[i] == nil {
            node.children[i] = &Trie{}
        }
        node = node.children[i]
    }
    node.end = true
}

func (t *Trie) Search(word string) bool {
    node := t
    for _, c := range word {
        i := c - 'a'
        if node.children[i] == nil {
            return false
        }
        node = node.children[i]
    }
    return node.end
}

func (t *Trie) StartsWith(prefix string) bool {
    node := t
    for _, c := range prefix {
        i := c - 'a'
        if node.children[i] == nil {
            return false
        }
        node = node.children[i]
    }
    return true
}
```

```cpp
#include <unordered_map>
#include <string>

struct TrieNode {
    std::unordered_map<char, TrieNode*> children;
    bool end = false;
};

class Trie {
    TrieNode* root;
public:
    Trie() : root(new TrieNode()) {}

    void insert(const std::string& word) {
        TrieNode* node = root;
        for (char c : word) {
            if (!node->children.count(c))
                node->children[c] = new TrieNode();
            node = node->children[c];
        }
        node->end = true;
    }

    bool search(const std::string& word) {
        TrieNode* node = root;
        for (char c : word) {
            auto it = node->children.find(c);
            if (it == node->children.end()) return false;
            node = it->second;
        }
        return node->end;
    }

    bool startsWith(const std::string& prefix) {
        TrieNode* node = root;
        for (char c : prefix) {
            auto it = node->children.find(c);
            if (it == node->children.end()) return false;
            node = it->second;
        }
        return true;
    }
};
```

### 65. Design Add and Search Words Data Structure

#### Problem
Design a word dictionary supporting `addWord(word)` and `search(word)`, where `search` may contain `'.'` as a wildcard that matches any single letter.

#### Pattern
**Trie with recursive DFS for wildcard expansion.** **O(m)** add, **O(26^m)** worst-case search.

#### Explanation
A plain trie handles exact-match queries in `O(m)`. The wildcard `'.'` breaks direct traversal because you don't know which child to follow. The solution is to treat `'.'` as a branch point: instead of following one child, try all children recursively. In the worst case (a pattern like `"..."`) every node fans out 26 ways, giving exponential time — but in practice most patterns are mostly literal characters. The recursive call passes the remaining suffix `word[i+1:]`, so each branch explores independently. An iterative stack-based variant avoids deep Python recursion for very long words, but the recursive form is clearest.

#### Solution

```python
class WordDictionary:
    def __init__(self):
        self.children = {}
        self.end = False

    def addWord(self, word):
        node = self
        for c in word:
            if c not in node.children:
                node.children[c] = WordDictionary()
            node = node.children[c]
        node.end = True

    def search(self, word):
        node = self
        for i, c in enumerate(word):
            if c == ".":
                return any(child.search(word[i + 1:]) for child in node.children.values())
            if c not in node.children:
                return False
            node = node.children[c]
        return node.end
```

```rust
use std::collections::HashMap;

#[derive(Default)]
struct WordDictionary {
    children: HashMap<char, WordDictionary>,
    end: bool,
}

impl WordDictionary {
    fn new() -> Self { Self::default() }

    fn add_word(&mut self, word: &str) {
        let mut node = self;
        for c in word.chars() {
            node = node.children.entry(c).or_default();
        }
        node.end = true;
    }

    fn search(&self, word: &str) -> bool {
        let chars: Vec<char> = word.chars().collect();
        self.search_chars(&chars)
    }

    fn search_chars(&self, chars: &[char]) -> bool {
        if chars.is_empty() { return self.end; }
        let c = chars[0];
        let rest = &chars[1..];
        if c == '.' {
            self.children.values().any(|child| child.search_chars(rest))
        } else {
            self.children.get(&c).map_or(false, |child| child.search_chars(rest))
        }
    }
}
```

```go
type WordDictionary struct {
    children [26]*WordDictionary
    end      bool
}

func (d *WordDictionary) AddWord(word string) {
    node := d
    for _, c := range word {
        i := c - 'a'
        if node.children[i] == nil {
            node.children[i] = &WordDictionary{}
        }
        node = node.children[i]
    }
    node.end = true
}

func (d *WordDictionary) Search(word string) bool {
    return d.searchAt(word, 0)
}

func (d *WordDictionary) searchAt(word string, pos int) bool {
    if pos == len(word) {
        return d.end
    }
    c := word[pos]
    if c == '.' {
        for _, child := range d.children {
            if child != nil && child.searchAt(word, pos+1) {
                return true
            }
        }
        return false
    }
    i := c - 'a'
    if d.children[i] == nil {
        return false
    }
    return d.children[i].searchAt(word, pos+1)
}
```

```cpp
#include <unordered_map>
#include <string>

struct WDNode {
    std::unordered_map<char, WDNode*> children;
    bool end = false;
};

class WordDictionary {
    WDNode* root;
    bool dfs(WDNode* node, const std::string& word, int i) {
        if (i == (int)word.size()) return node->end;
        char c = word[i];
        if (c == '.') {
            for (auto& [_, child] : node->children)
                if (dfs(child, word, i + 1)) return true;
            return false;
        }
        auto it = node->children.find(c);
        if (it == node->children.end()) return false;
        return dfs(it->second, word, i + 1);
    }
public:
    WordDictionary() : root(new WDNode()) {}

    void addWord(const std::string& word) {
        WDNode* node = root;
        for (char c : word) {
            if (!node->children.count(c))
                node->children[c] = new WDNode();
            node = node->children[c];
        }
        node->end = true;
    }

    bool search(const std::string& word) {
        return dfs(root, word, 0);
    }
};
```

### 66. Word Search II

#### Problem
Given an `m×n` character grid and a list of words, return all words that can be formed by traversing adjacent (4-directional) cells without reusing the same cell in one path.

#### Pattern
**Trie-backed DFS backtracking on the board.** **O(m·n·4^L)** time where L is the max word length.

#### Explanation
The naive approach — run Word Search (problem #79) for each word independently — costs `O(W · m·n·4^L)` and redundantly re-explores shared prefixes. Building a trie over all words lets you prune whole subtrees the moment the current cell sequence leaves all word paths. The DFS starts from every cell, walks the trie in parallel with the board, and marks visited cells by temporarily overwriting them with `'#'`, restoring on backtrack. When a node has the special end marker `"#"`, the full word is in the result set; the marker is deleted to avoid duplicates. Pruning dead branches from the trie as words are found (optional but efficient) reduces repeat visits. A `set` collects results to handle grids that could find the same word from multiple starting positions.

#### Solution

```python
def findWords(board, words):
    root = {}
    for word in words:
        node = root
        for c in word:
            node = node.setdefault(c, {})
        node["#"] = word
    res = set()
    rows, cols = len(board), len(board[0])
    def dfs(node, r, c):
        if "#" in node:
            res.add(node["#"])
        if r < 0 or c < 0 or r >= rows or c >= cols:
            return
        tmp = board[r][c]
        if tmp not in node:
            return
        board[r][c] = "#"
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            dfs(node[tmp], r + dr, c + dc)
        board[r][c] = tmp
    for r in range(rows):
        for c in range(cols):
            dfs(root, r, c)
    return list(res)
```

```rust
use std::collections::HashMap;

fn find_words(mut board: Vec<Vec<char>>, words: Vec<String>) -> Vec<String> {
    // Build trie as nested HashMaps; "#" key signals end-of-word
    type Trie = HashMap<char, Trie>;
    fn insert(root: &mut HashMap<char, Box<dyn std::any::Any>>, _word: &str) { unimplemented!() }
    // Simplified: use a flat trie with Option<String> at leaf
    #[derive(Default)]
    struct Node {
        children: HashMap<char, Box<Node>>,
        word: Option<String>,
    }
    fn ins(root: &mut Node, word: &str) {
        let mut node = root;
        for c in word.chars() {
            node = node.children.entry(c).or_default();
        }
        node.word = Some(word.to_string());
    }
    fn dfs(node: &mut Node, board: &mut Vec<Vec<char>>, r: i32, c: i32, res: &mut Vec<String>) {
        if let Some(w) = node.word.take() { res.push(w); }
        let rows = board.len() as i32;
        let cols = board[0].len() as i32;
        if r < 0 || c < 0 || r >= rows || c >= cols { return; }
        // unreachable branch — real work below
        let _ = (node, board, res);
    }
    let mut root = Node::default();
    for w in &words { ins(&mut root, w); }
    let rows = board.len();
    let cols = board[0].len();
    let mut res = Vec::new();
    fn search(node: &mut Node, board: &mut Vec<Vec<char>>, r: usize, c: usize, res: &mut Vec<String>) {
        let ch = board[r][c];
        if ch == '#' { return; }
        if let Some(child) = node.children.get_mut(&ch) {
            if let Some(w) = child.word.take() { res.push(w); }
            board[r][c] = '#';
            let rows = board.len();
            let cols = board[0].len();
            let dirs: [(i32,i32);4] = [(0,1),(0,-1),(1,0),(-1,0)];
            for (dr,dc) in dirs {
                let nr = r as i32 + dr;
                let nc = c as i32 + dc;
                if nr>=0 && nc>=0 && (nr as usize)<rows && (nc as usize)<cols {
                    search(child, board, nr as usize, nc as usize, res);
                }
            }
            board[r][c] = ch;
        }
    }
    for r in 0..rows {
        for c in 0..cols {
            search(&mut root, &mut board, r, c, &mut res);
        }
    }
    res
}
```

```go
type TrieNode struct {
    children [26]*TrieNode
    word     string
}

func findWords(board [][]byte, words []string) []string {
    root := &TrieNode{}
    for _, w := range words {
        node := root
        for _, c := range w {
            i := c - 'a'
            if node.children[i] == nil {
                node.children[i] = &TrieNode{}
            }
            node = node.children[i]
        }
        node.word = w
    }
    rows, cols := len(board), len(board[0])
    var res []string
    var dfs func(node *TrieNode, r, c int)
    dfs = func(node *TrieNode, r, c int) {
        if node.word != "" {
            res = append(res, node.word)
            node.word = ""
        }
        if r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] == '#' {
            return
        }
        ch := board[r][c]
        idx := ch - 'a'
        if node.children[idx] == nil {
            return
        }
        board[r][c] = '#'
        for _, d := range [][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}} {
            dfs(node.children[idx], r+d[0], c+d[1])
        }
        board[r][c] = ch
    }
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            dfs(root, r, c)
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>

struct TrieNode {
    std::unordered_map<char,TrieNode*> ch;
    std::string word;
};

class Solution {
    void dfs(TrieNode* node, std::vector<std::vector<char>>& board,
             int r, int c, std::vector<std::string>& res) {
        if (!node->word.empty()) {
            res.push_back(node->word);
            node->word.clear();
        }
        int rows = board.size(), cols = board[0].size();
        if (r < 0 || c < 0 || r >= rows || c >= cols) return;
        char tmp = board[r][c];
        if (tmp == '#' || !node->ch.count(tmp)) return;
        TrieNode* next = node->ch[tmp];
        board[r][c] = '#';
        for (auto [dr,dc] : std::vector<std::pair<int,int>>{{0,1},{0,-1},{1,0},{-1,0}})
            dfs(next, board, r+dr, c+dc, res);
        board[r][c] = tmp;
    }
public:
    std::vector<std::string> findWords(std::vector<std::vector<char>>& board,
                                       std::vector<std::string>& words) {
        TrieNode* root = new TrieNode();
        for (auto& w : words) {
            TrieNode* node = root;
            for (char c : w) {
                if (!node->ch.count(c)) node->ch[c] = new TrieNode();
                node = node->ch[c];
            }
            node->word = w;
        }
        std::vector<std::string> res;
        for (int r = 0; r < (int)board.size(); ++r)
            for (int c = 0; c < (int)board[0].size(); ++c)
                dfs(root, board, r, c, res);
        return res;
    }
};
```

### 67. Kth Largest Element in a Stream

#### Problem
Design a class initialized with `k` and a list of initial numbers; `add(val)` inserts a new value and returns the kth largest element seen so far.

#### Pattern
**Min-heap of size k.** **O(log k)** per `add`, **O(n log k)** initialization.

#### Explanation
Maintaining a sorted structure over all seen elements would cost `O(n)` space and `O(log n)` per query, but we only care about the k-th largest. A min-heap of exactly `k` elements does the job: the heap's minimum is always the k-th largest, because there are exactly `k-1` elements larger than it in the heap. When a new value arrives, push it; if the heap grows beyond `k`, pop the smallest — the new value displaces itself if it was too small, leaving the top always as answer. During `__init__`, heapify first (O(n)), then pop excess elements down to size `k`. Edge case: the initial list may have fewer than `k` elements; the first few `add` calls grow the heap before it is trimmed.

#### Solution

```python
import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = nums[:]
        heapq.heapify(self.heap)
        while len(self.heap) > k:
            heapq.heappop(self.heap)

    def add(self, val):
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

struct KthLargest {
    k: usize,
    heap: BinaryHeap<Reverse<i32>>,
}

impl KthLargest {
    fn new(k: i32, nums: Vec<i32>) -> Self {
        let k = k as usize;
        let mut heap: BinaryHeap<Reverse<i32>> = BinaryHeap::new();
        for n in nums {
            heap.push(Reverse(n));
            if heap.len() > k { heap.pop(); }
        }
        KthLargest { k, heap }
    }

    fn add(&mut self, val: i32) -> i32 {
        self.heap.push(Reverse(val));
        if self.heap.len() > self.k { self.heap.pop(); }
        self.heap.peek().unwrap().0
    }
}
```

```go
import "container/heap"

type MinHeap []int
func (h MinHeap) Len() int            { return len(h) }
func (h MinHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

type KthLargest struct {
    k    int
    heap *MinHeap
}

func Constructor(k int, nums []int) KthLargest {
    h := &MinHeap{}
    heap.Init(h)
    kl := KthLargest{k: k, heap: h}
    for _, n := range nums {
        kl.Add(n)
    }
    return kl
}

func (kl *KthLargest) Add(val int) int {
    heap.Push(kl.heap, val)
    if kl.heap.Len() > kl.k {
        heap.Pop(kl.heap)
    }
    return (*kl.heap)[0]
}
```

```cpp
#include <queue>
#include <vector>

class KthLargest {
    int k;
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
public:
    KthLargest(int k, std::vector<int>& nums) : k(k) {
        for (int n : nums) {
            heap.push(n);
            if ((int)heap.size() > k) heap.pop();
        }
    }
    int add(int val) {
        heap.push(val);
        if ((int)heap.size() > k) heap.pop();
        return heap.top();
    }
};
```

### 68. Last Stone Weight

#### Problem
You have a list of stone weights. Each turn, smash the two heaviest stones: if they are equal both are destroyed; otherwise the difference survives. Return the weight of the last remaining stone, or 0 if none remain.

#### Pattern
**Max-heap (negate values for min-heap languages).** **O(n log n)** time, **O(n)** space.

#### Explanation
Each turn requires the two largest elements, which is the classic max-heap use-case. Python's `heapq` only provides a min-heap, so negate all values: the smallest negative corresponds to the largest stone. Each iteration: pop twice (getting `a >= b` in absolute value), and if they differ, push back `-(a - b)`. The loop ends when one or zero stones remain. The `if heap else 0` guard handles the edge case where all stones cancel perfectly, leaving an empty heap. Sorting would give `O(n log n)` per step (re-sort after each smash), so the heap is the right structure here — each smash costs only `O(log n)`.

#### Solution

```python
import heapq

def lastStoneWeight(stones):
    heap = [-s for s in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        a = -heapq.heappop(heap)
        b = -heapq.heappop(heap)
        if a != b:
            heapq.heappush(heap, -(a - b))
    return -heap[0] if heap else 0
```

```rust
use std::collections::BinaryHeap;

fn last_stone_weight(stones: Vec<i32>) -> i32 {
    let mut heap: BinaryHeap<i32> = stones.into_iter().collect();
    while heap.len() > 1 {
        let a = heap.pop().unwrap();
        let b = heap.pop().unwrap();
        if a != b {
            heap.push(a - b);
        }
    }
    heap.pop().unwrap_or(0)
}
```

```go
import "container/heap"

type MaxHeap []int
func (h MaxHeap) Len() int            { return len(h) }
func (h MaxHeap) Less(i, j int) bool  { return h[i] > h[j] }
func (h MaxHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MaxHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MaxHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

func lastStoneWeight(stones []int) int {
    h := MaxHeap(append([]int{}, stones...))
    heap.Init(&h)
    for h.Len() > 1 {
        a := heap.Pop(&h).(int)
        b := heap.Pop(&h).(int)
        if a != b {
            heap.Push(&h, a-b)
        }
    }
    if h.Len() == 0 { return 0 }
    return h[0]
}
```

```cpp
#include <queue>
#include <vector>

int lastStoneWeight(std::vector<int>& stones) {
    std::priority_queue<int> heap(stones.begin(), stones.end());
    while (heap.size() > 1) {
        int a = heap.top(); heap.pop();
        int b = heap.top(); heap.pop();
        if (a != b) heap.push(a - b);
    }
    return heap.empty() ? 0 : heap.top();
}
```

### 69. K Closest Points to Origin

#### Problem
Given an array of points on a plane, return the `k` closest points to the origin `(0, 0)`. Distance is Euclidean; order of the output does not matter.

#### Pattern
**Max-heap of size k (negated distance).** **O(n log k)** time, **O(k)** space.

#### Explanation
The naive approach — sort all points by distance — costs `O(n log n)` and `O(n)` space. A max-heap of size `k` is better: maintain a window of the `k` smallest distances seen so far. For each point, push its (negated) squared distance onto the heap; if the heap exceeds `k`, pop the largest (most-negative negation = largest real distance), evicting the farthest candidate. Squaring avoids `sqrt` which is both slower and introduces floating-point error. Negation lets Python's min-heap behave like a max-heap. After processing all points, the heap holds exactly the `k` closest.

#### Solution

```python
import heapq

def kClosest(points, k):
    heap = []
    for x, y in points:
        dist = -(x * x + y * y)
        heapq.heappush(heap, (dist, x, y))
        if len(heap) > k:
            heapq.heappop(heap)
    return [[x, y] for _, x, y in heap]
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

fn k_closest(points: Vec<Vec<i32>>, k: i32) -> Vec<Vec<i32>> {
    // Max-heap by distance; use Reverse to get min-heap behavior for eviction
    let mut heap: BinaryHeap<(i64, i32, i32)> = BinaryHeap::new();
    for p in &points {
        let (x, y) = (p[0] as i64, p[1] as i64);
        heap.push((x * x + y * y, p[0], p[1]));
        if heap.len() > k as usize {
            heap.pop();
        }
    }
    heap.into_iter().map(|(_, x, y)| vec![x, y]).collect()
}
```

```go
import "container/heap"

type maxDistHeap [][]int
func (h maxDistHeap) Len() int { return len(h) }
func (h maxDistHeap) Less(i, j int) bool {
    di := h[i][0]*h[i][0] + h[i][1]*h[i][1]
    dj := h[j][0]*h[j][0] + h[j][1]*h[j][1]
    return di > dj
}
func (h maxDistHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *maxDistHeap) Push(x interface{}) { *h = append(*h, x.([]int)) }
func (h *maxDistHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

func kClosest(points [][]int, k int) [][]int {
    h := &maxDistHeap{}
    for _, p := range points {
        heap.Push(h, p)
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    return [][]int(*h)
}
```

```cpp
#include <vector>
#include <queue>

std::vector<std::vector<int>> kClosest(std::vector<std::vector<int>>& points, int k) {
    auto cmp = [](const std::vector<int>& a, const std::vector<int>& b) {
        return a[0]*a[0]+a[1]*a[1] < b[0]*b[0]+b[1]*b[1];
    };
    std::priority_queue<std::vector<int>, std::vector<std::vector<int>>, decltype(cmp)> heap(cmp);
    for (auto& p : points) {
        heap.push(p);
        if ((int)heap.size() > k) heap.pop();
    }
    std::vector<std::vector<int>> res;
    while (!heap.empty()) { res.push_back(heap.top()); heap.pop(); }
    return res;
}
```

### 70. Kth Largest Element in an Array

#### Problem
Given an integer array and an integer `k`, return the kth largest element (not the kth distinct element — duplicates count).

#### Pattern
**Min-heap of size k.** **O(n log k)** time, **O(k)** space.

#### Explanation
Sorting the array gives `O(n log n)` time and the answer is at index `n - k`, but a min-heap of size `k` does better when `k << n`. Seed the heap with the first `k` elements, then for each remaining element: if it exceeds the heap's minimum (the current kth largest), replace the minimum with it using `heapreplace` (pop + push in one O(log k) step). After processing all elements, the heap's minimum is the kth largest. The key insight: the heap always contains exactly the `k` largest elements seen so far, so its min is always the answer. For small `k` this is noticeably faster than full sort; for `k ≈ n` the difference shrinks.

#### Solution

```python
import heapq

def findKthLargest(nums, k):
    heap = nums[:k]
    heapq.heapify(heap)
    for n in nums[k:]:
        if n > heap[0]:
            heapq.heapreplace(heap, n)
    return heap[0]
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

fn find_kth_largest(nums: Vec<i32>, k: i32) -> i32 {
    let k = k as usize;
    let mut heap: BinaryHeap<Reverse<i32>> = BinaryHeap::new();
    for n in nums {
        heap.push(Reverse(n));
        if heap.len() > k {
            heap.pop();
        }
    }
    heap.peek().unwrap().0
}
```

```go
import "container/heap"

type IntMinHeap []int
func (h IntMinHeap) Len() int            { return len(h) }
func (h IntMinHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h IntMinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *IntMinHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *IntMinHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

func findKthLargest(nums []int, k int) int {
    h := &IntMinHeap{}
    for _, n := range nums {
        heap.Push(h, n)
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    return (*h)[0]
}
```

```cpp
#include <queue>
#include <vector>

int findKthLargest(std::vector<int>& nums, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
    for (int n : nums) {
        heap.push(n);
        if ((int)heap.size() > k) heap.pop();
    }
    return heap.top();
}
```

### 71. Task Scheduler

#### Problem
Given a list of tasks and a cooldown period `n`, find the minimum number of CPU intervals needed to execute all tasks, where the same task type must be at least `n` intervals apart (idle slots are allowed).

#### Pattern
**Greedy simulation with max-heap and cooldown queue.** **O(n log n)** time, **O(n)** space.

#### Explanation
Always execute the most frequent remaining task — this greedy choice minimises idle time. A max-heap stores `(-count, task)` to retrieve the highest-count task in `O(log k)`. After executing a task, it can't run again until time `t + n + 1`, so push it onto a FIFO queue as `(remaining_count, available_at)`. Each time-step: if the heap is non-empty, pop and execute; if the cooldown queue's front becomes available at this moment, push it back onto the heap. The loop runs until both the heap and queue are empty, and `time` counts the answer. A mathematical formula (`max(len(tasks), (maxCount-1)*(n+1)+numMaxTasks)`) gives `O(1)` but is harder to justify; the simulation generalises to variants.

#### Solution

```python
import heapq
from collections import deque

def leastInterval(tasks, n):
    count = {}
    for t in tasks:
        count[t] = count.get(t, 0) + 1
    heap = [-c for c in count.values()]
    heapq.heapify(heap)
    queue = deque()  # (remaining_count, available_at_time)
    time = 0
    while heap or queue:
        time += 1
        if heap:
            cnt = 1 + heapq.heappop(heap)
            if cnt:
                queue.append((cnt, time + n))
        if queue and queue[0][1] == time:
            heapq.heappush(heap, queue.popleft()[0])
    return time
```

```rust
use std::collections::{BinaryHeap, VecDeque, HashMap};

fn least_interval(tasks: Vec<char>, n: i32) -> i32 {
    let mut count: HashMap<char, i32> = HashMap::new();
    for t in tasks { *count.entry(t).or_default() += 1; }
    let mut heap: BinaryHeap<i32> = count.into_values().collect();
    let mut queue: VecDeque<(i32, i32)> = VecDeque::new();
    let mut time = 0i32;
    while !heap.is_empty() || !queue.is_empty() {
        time += 1;
        if let Some(cnt) = heap.pop() {
            if cnt - 1 > 0 { queue.push_back((cnt - 1, time + n)); }
        }
        if let Some(&(c, avail)) = queue.front() {
            if avail == time { queue.pop_front(); heap.push(c); }
        }
    }
    time
}
```

```go
import (
    "container/heap"
)

type MaxIntHeap []int
func (h MaxIntHeap) Len() int            { return len(h) }
func (h MaxIntHeap) Less(i, j int) bool  { return h[i] > h[j] }
func (h MaxIntHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MaxIntHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MaxIntHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

func leastInterval(tasks []byte, n int) int {
    count := make(map[byte]int)
    for _, t := range tasks { count[t]++ }
    h := &MaxIntHeap{}
    for _, c := range count { heap.Push(h, c) }
    heap.Init(h)
    type entry struct{ cnt, avail int }
    var queue []entry
    time := 0
    for h.Len() > 0 || len(queue) > 0 {
        time++
        if h.Len() > 0 {
            cnt := heap.Pop(h).(int) - 1
            if cnt > 0 { queue = append(queue, entry{cnt, time + n}) }
        }
        if len(queue) > 0 && queue[0].avail == time {
            heap.Push(h, queue[0].cnt)
            queue = queue[1:]
        }
    }
    return time
}
```

```cpp
#include <vector>
#include <queue>
#include <unordered_map>

int leastInterval(std::vector<char>& tasks, int n) {
    std::unordered_map<char,int> count;
    for (char t : tasks) count[t]++;
    std::priority_queue<int> heap;
    for (auto& [_, c] : count) heap.push(c);
    std::queue<std::pair<int,int>> q; // (remaining, available_at)
    int time = 0;
    while (!heap.empty() || !q.empty()) {
        ++time;
        if (!heap.empty()) {
            int cnt = heap.top() - 1; heap.pop();
            if (cnt > 0) q.push({cnt, time + n});
        }
        if (!q.empty() && q.front().second == time) {
            heap.push(q.front().first); q.pop();
        }
    }
    return time;
}
```

### 72. Design Twitter

#### Problem
Design a simplified Twitter supporting `postTweet`, `getNewsFeed` (the 10 most recent tweets from the user and their followees), `follow`, and `unfollow`.

#### Pattern
**Heap merge of per-user tweet lists.** **O(k log u)** per `getNewsFeed` where `u` is number of followed users and `k=10`.

#### Explanation
Each user maintains their tweets as a list in posting order, indexed by a global descending counter so recency comparison is just numeric ordering. `getNewsFeed` needs the 10 most recent tweets from up to `u+1` sorted lists — a classic k-way merge. Seed a min-heap with the latest tweet from each relevant user; each pop extracts the globally newest remaining tweet, then the next tweet from that user is pushed. This runs in `O(k log u)` rather than concatenating and sorting everything. The follow/unfollow operations update a set-per-user for `O(1)` lookup. Edge case: a user with no tweets or who hasn't tweeted yet needs a guard before accessing their tweet list.

#### Solution

```python
import heapq
from collections import defaultdict

class Twitter:
    def __init__(self):
        self.count = 0
        self.tweets = defaultdict(list)
        self.following = defaultdict(set)

    def postTweet(self, userId, tweetId):
        self.tweets[userId].append((self.count, tweetId))
        self.count -= 1

    def getNewsFeed(self, userId):
        heap = []
        users = self.following[userId] | {userId}
        for u in users:
            tw = self.tweets[u]
            if tw:
                idx = len(tw) - 1
                cnt, tid = tw[idx]
                heapq.heappush(heap, (cnt, tid, u, idx - 1))
        res = []
        while heap and len(res) < 10:
            cnt, tid, u, idx = heapq.heappop(heap)
            res.append(tid)
            if idx >= 0:
                c, t = self.tweets[u][idx]
                heapq.heappush(heap, (c, t, u, idx - 1))
        return res

    def follow(self, followerId, followeeId):
        self.following[followerId].add(followeeId)

    def unfollow(self, followerId, followeeId):
        self.following[followerId].discard(followeeId)
```

```rust
use std::collections::{HashMap, HashSet, BinaryHeap};
use std::cmp::Reverse;

#[derive(Default)]
struct Twitter {
    count: i64,
    tweets: HashMap<i32, Vec<(i64, i32)>>,
    following: HashMap<i32, HashSet<i32>>,
}

impl Twitter {
    fn new() -> Self { Self::default() }

    fn post_tweet(&mut self, user_id: i32, tweet_id: i32) {
        self.count -= 1;
        self.tweets.entry(user_id).or_default().push((self.count, tweet_id));
    }

    fn get_news_feed(&self, user_id: i32) -> Vec<i32> {
        // (timestamp, tweet_id, user_id, next_index)
        let mut heap: BinaryHeap<(i64, i32, i32, usize)> = BinaryHeap::new();
        let mut users: HashSet<i32> = self.following.get(&user_id).cloned().unwrap_or_default();
        users.insert(user_id);
        for u in &users {
            if let Some(tw) = self.tweets.get(u) {
                if !tw.is_empty() {
                    let idx = tw.len() - 1;
                    heap.push((-(tw[idx].0), tw[idx].1, *u, idx));
                }
            }
        }
        let mut res = Vec::new();
        while let Some((ts, tid, u, idx)) = heap.pop() {
            if res.len() == 10 { break; }
            res.push(tid);
            if idx > 0 {
                let tw = &self.tweets[&u];
                heap.push((-(tw[idx-1].0), tw[idx-1].1, u, idx-1));
            }
        }
        res
    }

    fn follow(&mut self, follower_id: i32, followee_id: i32) {
        self.following.entry(follower_id).or_default().insert(followee_id);
    }

    fn unfollow(&mut self, follower_id: i32, followee_id: i32) {
        if let Some(s) = self.following.get_mut(&follower_id) { s.remove(&followee_id); }
    }
}
```

```go
import (
    "container/heap"
)

type entry struct{ ts, tid, uid, idx int }
type feedHeap []entry
func (h feedHeap) Len() int            { return len(h) }
func (h feedHeap) Less(i, j int) bool  { return h[i].ts > h[j].ts }
func (h feedHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *feedHeap) Push(x interface{}) { *h = append(*h, x.(entry)) }
func (h *feedHeap) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

type Twitter struct {
    count     int
    tweets    map[int][]entry
    following map[int]map[int]bool
}

func NewTwitter() *Twitter {
    return &Twitter{tweets: make(map[int][]entry), following: make(map[int]map[int]bool)}
}

func (t *Twitter) PostTweet(userId, tweetId int) {
    t.tweets[userId] = append(t.tweets[userId], entry{t.count, tweetId, userId, 0})
    t.count--
}

func (t *Twitter) GetNewsFeed(userId int) []int {
    h := &feedHeap{}
    users := map[int]bool{userId: true}
    for u := range t.following[userId] { users[u] = true }
    for u := range users {
        tw := t.tweets[u]
        if len(tw) > 0 {
            idx := len(tw) - 1
            heap.Push(h, entry{tw[idx].ts, tw[idx].tid, u, idx})
        }
    }
    var res []int
    for h.Len() > 0 && len(res) < 10 {
        e := heap.Pop(h).(entry)
        res = append(res, e.tid)
        if e.idx > 0 {
            tw := t.tweets[e.uid]
            heap.Push(h, entry{tw[e.idx-1].ts, tw[e.idx-1].tid, e.uid, e.idx - 1})
        }
    }
    return res
}

func (t *Twitter) Follow(followerId, followeeId int) {
    if t.following[followerId] == nil { t.following[followerId] = make(map[int]bool) }
    t.following[followerId][followeeId] = true
}

func (t *Twitter) Unfollow(followerId, followeeId int) {
    delete(t.following[followerId], followeeId)
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>

class Twitter {
    int count = 0;
    std::unordered_map<int, std::vector<std::pair<int,int>>> tweets;
    std::unordered_map<int, std::unordered_set<int>> following;
public:
    void postTweet(int userId, int tweetId) {
        tweets[userId].push_back({--count, tweetId});
    }
    std::vector<int> getNewsFeed(int userId) {
        using T4 = std::tuple<int,int,int,int>;
        std::priority_queue<T4> heap;
        auto push = [&](int u) {
            auto& tw = tweets[u];
            if (!tw.empty()) {
                int idx = tw.size()-1;
                heap.push({-tw[idx].first, tw[idx].second, u, idx});
            }
        };
        push(userId);
        for (int u : following[userId]) push(u);
        std::vector<int> res;
        while (!heap.empty() && res.size() < 10) {
            auto [ts, tid, u, idx] = heap.top(); heap.pop();
            res.push_back(tid);
            if (idx > 0) {
                auto& tw = tweets[u];
                heap.push({-tw[idx-1].first, tw[idx-1].second, u, idx-1});
            }
        }
        return res;
    }
    void follow(int f, int e)   { following[f].insert(e); }
    void unfollow(int f, int e) { following[f].erase(e); }
};
```

### 73. Find Median from Data Stream

#### Problem
Design a data structure that supports `addNum(int num)` and `findMedian()` — the median of all numbers added so far — in a streaming context.

#### Pattern
**Two heaps: max-heap for lower half, min-heap for upper half.** **O(log n)** add, **O(1)** findMedian.

#### Explanation
The median requires knowing the "middle" of a sorted set — efficient insertion into a fully sorted structure would be `O(n)`. The two-heap trick: keep a max-heap `small` for the lower half and a min-heap `large` for the upper half, maintaining the invariant `len(small) == len(large)` or `len(small) == len(large) + 1`. After each insertion, rebalance if needed. If the tops violate the order property (max of lower > min of upper), fix by moving the offending element across. The median is then either the top of `small` (odd total) or the average of both tops (even total). All operations are `O(log n)` for heap push/pop. Python negates values for the max-heap since `heapq` is a min-heap only.

#### Solution

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []  # max-heap (negated)
        self.large = []  # min-heap

    def addNum(self, num):
        heapq.heappush(self.small, -num)
        if self.small and self.large and -self.small[0] > self.large[0]:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.small) > len(self.large) + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def findMedian(self):
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2.0
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

#[derive(Default)]
struct MedianFinder {
    small: BinaryHeap<i32>,          // max-heap (lower half)
    large: BinaryHeap<Reverse<i32>>, // min-heap (upper half)
}

impl MedianFinder {
    fn new() -> Self { Self::default() }

    fn add_num(&mut self, num: i32) {
        self.small.push(num);
        if let (Some(&s), Some(&Reverse(l))) = (self.small.peek(), self.large.peek()) {
            if s > l {
                let v = self.small.pop().unwrap();
                self.large.push(Reverse(v));
            }
        }
        if self.small.len() > self.large.len() + 1 {
            let v = self.small.pop().unwrap();
            self.large.push(Reverse(v));
        } else if self.large.len() > self.small.len() {
            let Reverse(v) = self.large.pop().unwrap();
            self.small.push(v);
        }
    }

    fn find_median(&self) -> f64 {
        if self.small.len() > self.large.len() {
            *self.small.peek().unwrap() as f64
        } else {
            let s = *self.small.peek().unwrap() as f64;
            let l = self.large.peek().unwrap().0 as f64;
            (s + l) / 2.0
        }
    }
}
```

```go
import "container/heap"

type maxH []int
func (h maxH) Len() int            { return len(h) }
func (h maxH) Less(i, j int) bool  { return h[i] > h[j] }
func (h maxH) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *maxH) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *maxH) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

type minH []int
func (h minH) Len() int            { return len(h) }
func (h minH) Less(i, j int) bool  { return h[i] < h[j] }
func (h minH) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *minH) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *minH) Pop() interface{}   { old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x }

type MedianFinder struct {
    small *maxH
    large *minH
}

func NewMedianFinder() *MedianFinder {
    s, l := &maxH{}, &minH{}
    return &MedianFinder{s, l}
}

func (mf *MedianFinder) AddNum(num int) {
    heap.Push(mf.small, num)
    if mf.small.Len() > 0 && mf.large.Len() > 0 && (*mf.small)[0] > (*mf.large)[0] {
        heap.Push(mf.large, heap.Pop(mf.small))
    }
    if mf.small.Len() > mf.large.Len()+1 {
        heap.Push(mf.large, heap.Pop(mf.small))
    } else if mf.large.Len() > mf.small.Len() {
        heap.Push(mf.small, heap.Pop(mf.large))
    }
}

func (mf *MedianFinder) FindMedian() float64 {
    if mf.small.Len() > mf.large.Len() {
        return float64((*mf.small)[0])
    }
    return float64((*mf.small)[0]+(*mf.large)[0]) / 2.0
}
```

```cpp
#include <queue>

class MedianFinder {
    std::priority_queue<int> small;                             // max-heap
    std::priority_queue<int,std::vector<int>,std::greater<int>> large; // min-heap
public:
    void addNum(int num) {
        small.push(num);
        if (!small.empty() && !large.empty() && small.top() > large.top()) {
            large.push(small.top()); small.pop();
        }
        if (small.size() > large.size() + 1) {
            large.push(small.top()); small.pop();
        } else if (large.size() > small.size()) {
            small.push(large.top()); large.pop();
        }
    }
    double findMedian() {
        if (small.size() > large.size()) return small.top();
        return (small.top() + large.top()) / 2.0;
    }
};
```

### 74. Subsets

#### Problem
Given an array of distinct integers, return all possible subsets (the power set). The solution set must not contain duplicate subsets; order does not matter.

#### Pattern
**Backtracking (include/exclude decision tree).** **O(n · 2ⁿ)** time, **O(n)** auxiliary stack space.

#### Explanation
There are `2ⁿ` subsets — one for each way to include or exclude each element. The backtracking approach frames this as a binary decision tree: at index `i`, either include `nums[i]` and recurse, or skip it and recurse. When `i == n` the current subset is a complete choice and is recorded. This yields each subset exactly once in lexicographic order. An iterative bit-mask approach (`for mask in range(1 << n)`) gives the same `O(n · 2ⁿ)` result but is less generalisable. The `subset[:]` copy is necessary because `subset` is mutated in-place throughout the recursion.

#### Solution

```python
def subsets(nums):
    res = []
    def bt(i, subset):
        if i == len(nums):
            res.append(subset[:])
            return
        subset.append(nums[i])
        bt(i + 1, subset)
        subset.pop()
        bt(i + 1, subset)
    bt(0, [])
    return res
```

```rust
fn subsets(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut res = Vec::new();
    fn bt(nums: &[i32], i: usize, current: &mut Vec<i32>, res: &mut Vec<Vec<i32>>) {
        if i == nums.len() { res.push(current.clone()); return; }
        current.push(nums[i]);
        bt(nums, i + 1, current, res);
        current.pop();
        bt(nums, i + 1, current, res);
    }
    bt(&nums, 0, &mut Vec::new(), &mut res);
    res
}
```

```go
func subsets(nums []int) [][]int {
    var res [][]int
    var bt func(i int, current []int)
    bt = func(i int, current []int) {
        if i == len(nums) {
            tmp := make([]int, len(current))
            copy(tmp, current)
            res = append(res, tmp)
            return
        }
        bt(i+1, append(current, nums[i]))
        bt(i+1, current)
    }
    bt(0, []int{})
    return res
}
```

```cpp
#include <vector>

std::vector<std::vector<int>> subsets(std::vector<int>& nums) {
    std::vector<std::vector<int>> res;
    std::vector<int> current;
    std::function<void(int)> bt = [&](int i) {
        if (i == (int)nums.size()) { res.push_back(current); return; }
        current.push_back(nums[i]);
        bt(i + 1);
        current.pop_back();
        bt(i + 1);
    };
    bt(0);
    return res;
}
```

### 75. Combination Sum

#### Problem
Given an array of distinct positive integers and a target, find all unique combinations where the chosen numbers sum to the target. Each number may be used an unlimited number of times; order does not matter.

#### Pattern
**Backtracking with unlimited reuse.** **O(2^(t/m))** time where `t` is the target and `m` is the smallest candidate.

#### Explanation
Unlike a subset problem, here a candidate can be picked repeatedly — so the recursion does not advance the index after including an element. At each call with index `i`, two branches: (1) use `candidates[i]` again (recurse with same `i`, larger total), (2) move to the next candidate (recurse with `i+1`, same total). Pruning fires when `total > target` or `i` runs past the array. No sorting is strictly required because candidates are distinct, but pre-sorting lets you break early when a candidate exceeds the remaining budget. The result contains no duplicates because the index only moves forward, preventing the same multi-set from being constructed in different orders.

#### Solution

```python
def combinationSum(candidates, target):
    res = []
    def bt(i, curr, total):
        if total == target:
            res.append(curr[:])
            return
        if i >= len(candidates) or total > target:
            return
        curr.append(candidates[i])
        bt(i, curr, total + candidates[i])
        curr.pop()
        bt(i + 1, curr, total)
    bt(0, [], 0)
    return res
```

```rust
fn combination_sum(candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
    let mut res = Vec::new();
    fn bt(candidates: &[i32], i: usize, current: &mut Vec<i32>, total: i32, target: i32, res: &mut Vec<Vec<i32>>) {
        if total == target { res.push(current.clone()); return; }
        if i >= candidates.len() || total > target { return; }
        current.push(candidates[i]);
        bt(candidates, i, current, total + candidates[i], target, res);
        current.pop();
        bt(candidates, i + 1, current, total, target, res);
    }
    bt(&candidates, 0, &mut Vec::new(), 0, target, &mut res);
    res
}
```

```go
func combinationSum(candidates []int, target int) [][]int {
    var res [][]int
    var bt func(i, total int, current []int)
    bt = func(i, total int, current []int) {
        if total == target {
            tmp := make([]int, len(current))
            copy(tmp, current)
            res = append(res, tmp)
            return
        }
        if i >= len(candidates) || total > target {
            return
        }
        bt(i, total+candidates[i], append(current, candidates[i]))
        bt(i+1, total, current)
    }
    bt(0, 0, []int{})
    return res
}
```

```cpp
#include <vector>

std::vector<std::vector<int>> combinationSum(std::vector<int>& candidates, int target) {
    std::vector<std::vector<int>> res;
    std::vector<int> current;
    std::function<void(int, int)> bt = [&](int i, int total) {
        if (total == target) { res.push_back(current); return; }
        if (i >= (int)candidates.size() || total > target) return;
        current.push_back(candidates[i]);
        bt(i, total + candidates[i]);
        current.pop_back();
        bt(i + 1, total);
    };
    bt(0, 0);
    return res;
}
```

### 76. Permutations

#### Problem
Given an array of distinct integers, return all possible permutations in any order.

#### Pattern
**Backtracking with in-place swap or visited set.** **O(n! · n)** time, **O(n)** auxiliary stack space.

#### Explanation
There are `n!` permutations each of length `n`, so `O(n! · n)` is unavoidable. The visited-set approach checks `if n not in perm` on each recursive call — correct but `O(n)` per check, turning the guard into `O(n²)` overhead per leaf. An in-place swap approach avoids this: keep a boundary index `start`; swap `nums[start]` with each `nums[i]` for `i >= start`, recurse, then swap back. This explores every arrangement without extra memory for tracking. The `perm[:]` copy on leaf is necessary regardless of approach. The existing Python solution with `if n not in perm` is `O(n)` per check but still correct and clear for moderate `n`.

#### Solution

```python
def permute(nums):
    res = []
    def bt(perm):
        if len(perm) == len(nums):
            res.append(perm[:])
            return
        for n in nums:
            if n not in perm:
                perm.append(n)
                bt(perm)
                perm.pop()
    bt([])
    return res
```

```rust
fn permute(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut res = Vec::new();
    let mut nums = nums;
    fn bt(nums: &mut Vec<i32>, start: usize, res: &mut Vec<Vec<i32>>) {
        if start == nums.len() { res.push(nums.clone()); return; }
        for i in start..nums.len() {
            nums.swap(start, i);
            bt(nums, start + 1, res);
            nums.swap(start, i);
        }
    }
    bt(&mut nums, 0, &mut res);
    res
}
```

```go
func permute(nums []int) [][]int {
    var res [][]int
    var bt func(start int)
    bt = func(start int) {
        if start == len(nums) {
            tmp := make([]int, len(nums))
            copy(tmp, nums)
            res = append(res, tmp)
            return
        }
        for i := start; i < len(nums); i++ {
            nums[start], nums[i] = nums[i], nums[start]
            bt(start + 1)
            nums[start], nums[i] = nums[i], nums[start]
        }
    }
    bt(0)
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> permute(std::vector<int>& nums) {
    std::vector<std::vector<int>> res;
    std::function<void(int)> bt = [&](int start) {
        if (start == (int)nums.size()) { res.push_back(nums); return; }
        for (int i = start; i < (int)nums.size(); ++i) {
            std::swap(nums[start], nums[i]);
            bt(start + 1);
            std::swap(nums[start], nums[i]);
        }
    };
    bt(0);
    return res;
}
```

### 77. Subsets II

#### Problem
Given an integer array that may contain duplicates, return all possible unique subsets. The solution set must not contain duplicate subsets.

#### Pattern
**Backtracking with sort-and-skip-duplicate technique.** **O(n · 2ⁿ)** time, **O(n)** auxiliary stack space.

#### Explanation
The naive approach generates all `2ⁿ` subsets and deduplicates with a set — correct but wasteful. Sorting the array first groups duplicates together, enabling a simple rule: within the same recursion level (same `i`), skip `nums[j]` if `j > i` and `nums[j] == nums[j-1]`. This prevents choosing the same value twice at the same position in the decision tree without preventing the same value from being chosen at a deeper level (a different copy). The result set is built by appending `subset[:]` at the start of each call (recording every prefix, including the empty set), then branching on each remaining index. This is subtly different from the Combination Sum family — here we record on entry, not only at the leaf.

#### Solution

```python
def subsetsWithDup(nums):
    nums.sort()
    res = []
    def bt(i, subset):
        res.append(subset[:])
        for j in range(i, len(nums)):
            if j > i and nums[j] == nums[j - 1]:
                continue
            subset.append(nums[j])
            bt(j + 1, subset)
            subset.pop()
    bt(0, [])
    return res
```

```rust
fn subsets_with_dup(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
    nums.sort();
    let mut res = Vec::new();
    fn bt(nums: &[i32], i: usize, current: &mut Vec<i32>, res: &mut Vec<Vec<i32>>) {
        res.push(current.clone());
        for j in i..nums.len() {
            if j > i && nums[j] == nums[j - 1] { continue; }
            current.push(nums[j]);
            bt(nums, j + 1, current, res);
            current.pop();
        }
    }
    bt(&nums, 0, &mut Vec::new(), &mut res);
    res
}
```

```go
import "sort"

func subsetsWithDup(nums []int) [][]int {
    sort.Ints(nums)
    var res [][]int
    var bt func(i int, current []int)
    bt = func(i int, current []int) {
        tmp := make([]int, len(current))
        copy(tmp, current)
        res = append(res, tmp)
        for j := i; j < len(nums); j++ {
            if j > i && nums[j] == nums[j-1] {
                continue
            }
            bt(j+1, append(current, nums[j]))
        }
    }
    bt(0, []int{})
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> subsetsWithDup(std::vector<int>& nums) {
    std::sort(nums.begin(), nums.end());
    std::vector<std::vector<int>> res;
    std::vector<int> current;
    std::function<void(int)> bt = [&](int i) {
        res.push_back(current);
        for (int j = i; j < (int)nums.size(); ++j) {
            if (j > i && nums[j] == nums[j - 1]) continue;
            current.push_back(nums[j]);
            bt(j + 1);
            current.pop_back();
        }
    };
    bt(0);
    return res;
}
```

### 78. Combination Sum II

#### Problem
Given a collection of candidates (may contain duplicates) and a target, find all unique combinations that sum to the target where each candidate may only be used once.

#### Pattern
**Backtracking with sort-and-skip-duplicate and early break.** **O(2ⁿ)** time, **O(n)** auxiliary stack space.

#### Explanation
Compared to Combination Sum (problem #75), two constraints tighten the search: each element used at most once (advance `j+1` rather than staying at `i`), and the input may have duplicates (must deduplicate results). Sorting enables both optimisations simultaneously: the duplicate-skip rule (`j > i and candidates[j] == candidates[j-1]`) prevents identical values from being chosen at the same level of the tree, and because candidates are sorted, once `total + candidates[j] > target` you can `break` the inner loop entirely — all subsequent candidates are at least as large. These two prunings together make this considerably faster in practice than the naive approach.

#### Solution

```python
def combinationSum2(candidates, target):
    candidates.sort()
    res = []
    def bt(i, curr, total):
        if total == target:
            res.append(curr[:])
            return
        for j in range(i, len(candidates)):
            if j > i and candidates[j] == candidates[j - 1]:
                continue
            if total + candidates[j] > target:
                break
            curr.append(candidates[j])
            bt(j + 1, curr, total + candidates[j])
            curr.pop()
    bt(0, [], 0)
    return res
```

```rust
fn combination_sum2(mut candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
    candidates.sort();
    let mut res = Vec::new();
    fn bt(candidates: &[i32], i: usize, current: &mut Vec<i32>, total: i32, target: i32, res: &mut Vec<Vec<i32>>) {
        if total == target { res.push(current.clone()); return; }
        for j in i..candidates.len() {
            if j > i && candidates[j] == candidates[j - 1] { continue; }
            if total + candidates[j] > target { break; }
            current.push(candidates[j]);
            bt(candidates, j + 1, current, total + candidates[j], target, res);
            current.pop();
        }
    }
    bt(&candidates, 0, &mut Vec::new(), 0, target, &mut res);
    res
}
```

```go
import "sort"

func combinationSum2(candidates []int, target int) [][]int {
    sort.Ints(candidates)
    var res [][]int
    var bt func(i, total int, current []int)
    bt = func(i, total int, current []int) {
        if total == target {
            tmp := make([]int, len(current))
            copy(tmp, current)
            res = append(res, tmp)
            return
        }
        for j := i; j < len(candidates); j++ {
            if j > i && candidates[j] == candidates[j-1] { continue }
            if total+candidates[j] > target { break }
            bt(j+1, total+candidates[j], append(current, candidates[j]))
        }
    }
    bt(0, 0, []int{})
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> combinationSum2(std::vector<int>& candidates, int target) {
    std::sort(candidates.begin(), candidates.end());
    std::vector<std::vector<int>> res;
    std::vector<int> current;
    std::function<void(int, int)> bt = [&](int i, int total) {
        if (total == target) { res.push_back(current); return; }
        for (int j = i; j < (int)candidates.size(); ++j) {
            if (j > i && candidates[j] == candidates[j - 1]) continue;
            if (total + candidates[j] > target) break;
            current.push_back(candidates[j]);
            bt(j + 1, total + candidates[j]);
            current.pop_back();
        }
    };
    bt(0, 0);
    return res;
}
```

### 79. Word Search

#### Problem
Given an `m×n` grid of characters, determine if the word exists in the grid by moving to horizontally or vertically adjacent cells, without reusing the same cell in one path.

#### Pattern
**DFS backtracking with in-place visited marking.** **O(m · n · 4^L)** time where L is the word length.

#### Explanation
Start a DFS from every cell that matches `word[0]`. The DFS advances through `word` one character at a time; if the current cell doesn't match `word[i]`, return false immediately. Mark visited cells by temporarily overwriting them with a sentinel (`'#'`) to prevent revisiting within the current path — this avoids a separate `visited` set and restores the board on backtrack. When `i == len(word)` all characters have been matched successfully. The worst-case `O(m·n·4^L)` occurs on grids filled with the same character, but early mismatch pruning makes this fast on typical inputs. No global state is needed since the board itself serves as the visited structure.

#### Solution

```python
def exist(board, word):
    rows, cols = len(board), len(board[0])
    def dfs(r, c, i):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False
        tmp, board[r][c] = board[r][c], "#"
        found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)])
        board[r][c] = tmp
        return found
    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

```rust
fn exist(mut board: Vec<Vec<char>>, word: &str) -> bool {
    let chars: Vec<char> = word.chars().collect();
    let rows = board.len();
    let cols = board[0].len();
    fn dfs(board: &mut Vec<Vec<char>>, chars: &[char], r: i32, c: i32, i: usize) -> bool {
        if i == chars.len() { return true; }
        let rows = board.len() as i32;
        let cols = board[0].len() as i32;
        if r < 0 || c < 0 || r >= rows || c >= cols { return false; }
        if board[r as usize][c as usize] != chars[i] { return false; }
        let tmp = board[r as usize][c as usize];
        board[r as usize][c as usize] = '#';
        let found = [(0,1),(0,-1),(1,0),(-1,0)].iter()
            .any(|&(dr,dc)| dfs(board, chars, r+dr, c+dc, i+1));
        board[r as usize][c as usize] = tmp;
        found
    }
    for r in 0..rows {
        for c in 0..cols {
            if dfs(&mut board, &chars, r as i32, c as i32, 0) { return true; }
        }
    }
    false
}
```

```go
func exist(board [][]byte, word string) bool {
    rows, cols := len(board), len(board[0])
    var dfs func(r, c, i int) bool
    dfs = func(r, c, i int) bool {
        if i == len(word) { return true }
        if r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != word[i] { return false }
        tmp := board[r][c]
        board[r][c] = '#'
        found := dfs(r+1, c, i+1) || dfs(r-1, c, i+1) || dfs(r, c+1, i+1) || dfs(r, c-1, i+1)
        board[r][c] = tmp
        return found
    }
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if dfs(r, c, 0) { return true }
        }
    }
    return false
}
```

```cpp
#include <vector>
#include <string>

bool exist(std::vector<std::vector<char>>& board, std::string word) {
    int rows = board.size(), cols = board[0].size();
    std::function<bool(int,int,int)> dfs = [&](int r, int c, int i) -> bool {
        if (i == (int)word.size()) return true;
        if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != word[i]) return false;
        char tmp = board[r][c];
        board[r][c] = '#';
        bool found = dfs(r+1,c,i+1) || dfs(r-1,c,i+1) || dfs(r,c+1,i+1) || dfs(r,c-1,i+1);
        board[r][c] = tmp;
        return found;
    };
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            if (dfs(r, c, 0)) return true;
    return false;
}
```

### 80. Palindrome Partitioning

#### Problem
Given a string `s`, partition it so that every substring in the partition is a palindrome. Return all possible partitioning schemes.

#### Pattern
**Backtracking with inline palindrome check.** **O(n · 2ⁿ)** time, **O(n)** auxiliary stack space.

#### Explanation
At each index `i`, try every possible end index `j >= i` for the next partition piece. If `s[i..j]` is a palindrome, include it and recurse from `j+1`. When `i` reaches the end of the string, the current partition is complete and gets recorded. The inline two-pointer palindrome check is `O(n)` per call, so total time is `O(n · 2ⁿ)`. A DP precomputation (`isPalin[i][j]`) reduces each check to `O(1)` at the cost of `O(n²)` setup, beneficial when the string is long and palindrome checks are repeated frequently. For most interview inputs the inline check is simpler and fast enough.

#### Solution

```python
def partition(s):
    res = []
    def is_palindrome(l, r):
        while l < r:
            if s[l] != s[r]:
                return False
            l += 1
            r -= 1
        return True
    def bt(i, part):
        if i == len(s):
            res.append(part[:])
            return
        for j in range(i, len(s)):
            if is_palindrome(i, j):
                part.append(s[i:j + 1])
                bt(j + 1, part)
                part.pop()
    bt(0, [])
    return res
```

```rust
fn partition(s: &str) -> Vec<Vec<String>> {
    let chars: Vec<char> = s.chars().collect();
    let mut res = Vec::new();
    fn is_palindrome(chars: &[char], l: usize, r: usize) -> bool {
        let (mut l, mut r) = (l as i32, r as i32);
        while l < r {
            if chars[l as usize] != chars[r as usize] { return false; }
            l += 1; r -= 1;
        }
        true
    }
    fn bt(chars: &[char], i: usize, current: &mut Vec<String>, res: &mut Vec<Vec<String>>) {
        if i == chars.len() { res.push(current.clone()); return; }
        for j in i..chars.len() {
            if is_palindrome(chars, i, j) {
                current.push(chars[i..=j].iter().collect());
                bt(chars, j + 1, current, res);
                current.pop();
            }
        }
    }
    bt(&chars, 0, &mut Vec::new(), &mut res);
    res
}
```

```go
func partition(s string) [][]string {
    var res [][]string
    isPalin := func(l, r int) bool {
        for l < r {
            if s[l] != s[r] { return false }
            l++; r--
        }
        return true
    }
    var bt func(i int, current []string)
    bt = func(i int, current []string) {
        if i == len(s) {
            tmp := make([]string, len(current))
            copy(tmp, current)
            res = append(res, tmp)
            return
        }
        for j := i; j < len(s); j++ {
            if isPalin(i, j) {
                bt(j+1, append(current, s[i:j+1]))
            }
        }
    }
    bt(0, []string{})
    return res
}
```

```cpp
#include <vector>
#include <string>

std::vector<std::vector<std::string>> partition(std::string s) {
    std::vector<std::vector<std::string>> res;
    std::vector<std::string> current;
    auto isPalin = [&](int l, int r) {
        while (l < r) { if (s[l++] != s[r--]) return false; }
        return true;
    };
    std::function<void(int)> bt = [&](int i) {
        if (i == (int)s.size()) { res.push_back(current); return; }
        for (int j = i; j < (int)s.size(); ++j) {
            if (isPalin(i, j)) {
                current.push_back(s.substr(i, j - i + 1));
                bt(j + 1);
                current.pop_back();
            }
        }
    };
    bt(0);
    return res;
}
```

### 81. Letter Combinations of a Phone Number

#### Problem
Given a string of digits `2-9`, return all possible letter combinations that the digits could represent on a phone keypad. Return an empty list for an empty input.

#### Pattern
**Backtracking over digit-to-letter mapping.** **O(4ⁿ · n)** time where n is the number of digits (4 accounts for `7` and `9` having 4 letters each).

#### Explanation
Each digit maps to 2-4 letters; the total combinations multiply out to at most `4ⁿ`. The backtracking walks digit by digit, branching once per letter for the current digit. Because strings are immutable in Python, concatenation (`curr + c`) creates a new string at each level — an alternative is to build a list and join at the leaf, but for short phone numbers the difference is negligible. The empty-digits guard is critical: without it the recursion would try to index into the phone map with an empty string and produce an incorrect single empty-string result instead of `[]`.

#### Solution

```python
def letterCombinations(digits):
    if not digits:
        return []
    phone = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",
             "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
    res = []
    def bt(i, curr):
        if i == len(digits):
            res.append(curr)
            return
        for c in phone[digits[i]]:
            bt(i + 1, curr + c)
    bt(0, "")
    return res
```

```rust
fn letter_combinations(digits: String) -> Vec<String> {
    if digits.is_empty() { return vec![]; }
    let phone: &[&str] = &["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"];
    let mut res = Vec::new();
    fn bt(digits: &[u8], phone: &[&str], i: usize, current: &mut Vec<char>, res: &mut Vec<String>) {
        if i == digits.len() { res.push(current.iter().collect()); return; }
        let idx = (digits[i] - b'0') as usize;
        for c in phone[idx].chars() {
            current.push(c);
            bt(digits, phone, i + 1, current, res);
            current.pop();
        }
    }
    bt(digits.as_bytes(), phone, 0, &mut Vec::new(), &mut res);
    res
}
```

```go
func letterCombinations(digits string) []string {
    if len(digits) == 0 { return nil }
    phone := map[byte]string{
        '2': "abc", '3': "def", '4': "ghi", '5': "jkl",
        '6': "mno", '7': "pqrs", '8': "tuv", '9': "wxyz",
    }
    var res []string
    var bt func(i int, curr string)
    bt = func(i int, curr string) {
        if i == len(digits) { res = append(res, curr); return }
        for _, c := range phone[digits[i]] {
            bt(i+1, curr+string(c))
        }
    }
    bt(0, "")
    return res
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>

std::vector<std::string> letterCombinations(std::string digits) {
    if (digits.empty()) return {};
    std::unordered_map<char,std::string> phone = {
        {'2',"abc"},{'3',"def"},{'4',"ghi"},{'5',"jkl"},
        {'6',"mno"},{'7',"pqrs"},{'8',"tuv"},{'9',"wxyz"}
    };
    std::vector<std::string> res;
    std::string current;
    std::function<void(int)> bt = [&](int i) {
        if (i == (int)digits.size()) { res.push_back(current); return; }
        for (char c : phone[digits[i]]) {
            current += c;
            bt(i + 1);
            current.pop_back();
        }
    };
    bt(0);
    return res;
}
```

### 82. N-Queens

#### Problem
Place `n` queens on an `n×n` chessboard such that no two queens share a row, column, or diagonal. Return all distinct solutions as board layouts.

#### Pattern
**Backtracking with column and diagonal conflict sets.** **O(n!)** time, **O(n)** auxiliary space.

#### Explanation
The backtracking places one queen per row (since two queens can never share a row) and prunes columns and diagonals. Three sets track conflicts: `cols` for columns, and the two diagonals — all cells on the same `\` diagonal share the same `r - c` value, and all on the same `/` diagonal share `r + c`. Set membership gives `O(1)` conflict checking. For each row, iterate over columns; if the column or either diagonal is occupied, skip. Otherwise place the queen, recurse to the next row, then undo. When `r == n`, all `n` queens are placed without conflict and the board snapshot is recorded. This is more efficient than bit-mask approaches for clarity, though bitmask versions run faster in practice.

#### Solution

```python
def solveNQueens(n):
    cols = set()
    pos_diag = set()  # r + c
    neg_diag = set()  # r - c
    res = []
    board = [["." ] * n for _ in range(n)]
    def bt(r):
        if r == n:
            res.append(["".join(row) for row in board])
            return
        for c in range(n):
            if c in cols or (r + c) in pos_diag or (r - c) in neg_diag:
                continue
            cols.add(c); pos_diag.add(r + c); neg_diag.add(r - c)
            board[r][c] = "Q"
            bt(r + 1)
            board[r][c] = "."
            cols.remove(c); pos_diag.remove(r + c); neg_diag.remove(r - c)
    bt(0)
    return res
```

```rust
fn solve_n_queens(n: usize) -> Vec<Vec<String>> {
    let mut res = Vec::new();
    let mut cols = vec![false; n];
    let mut pos_diag = vec![false; 2 * n];
    let mut neg_diag = vec![false; 2 * n];
    let mut board = vec![vec![b'.'; n]; n];
    fn bt(
        n: usize, r: usize,
        cols: &mut Vec<bool>, pos: &mut Vec<bool>, neg: &mut Vec<bool>,
        board: &mut Vec<Vec<u8>>, res: &mut Vec<Vec<String>>
    ) {
        if r == n {
            res.push(board.iter().map(|row| String::from_utf8(row.clone()).unwrap()).collect());
            return;
        }
        for c in 0..n {
            let pd = r + c;
            let nd = (r + n) - c;
            if cols[c] || pos[pd] || neg[nd] { continue; }
            cols[c] = true; pos[pd] = true; neg[nd] = true;
            board[r][c] = b'Q';
            bt(n, r + 1, cols, pos, neg, board, res);
            board[r][c] = b'.';
            cols[c] = false; pos[pd] = false; neg[nd] = false;
        }
    }
    bt(n, 0, &mut cols, &mut pos_diag, &mut neg_diag, &mut board, &mut res);
    res
}
```

```go
func solveNQueens(n int) [][]string {
    var res [][]string
    board := make([][]byte, n)
    for i := range board { board[i] = []byte(string(make([]byte, n))); for j := range board[i] { board[i][j] = '.' } }
    cols := make(map[int]bool)
    posDiag := make(map[int]bool)
    negDiag := make(map[int]bool)
    var bt func(r int)
    bt = func(r int) {
        if r == n {
            snap := make([]string, n)
            for i, row := range board { snap[i] = string(row) }
            res = append(res, snap)
            return
        }
        for c := 0; c < n; c++ {
            if cols[c] || posDiag[r+c] || negDiag[r-c] { continue }
            cols[c] = true; posDiag[r+c] = true; negDiag[r-c] = true
            board[r][c] = 'Q'
            bt(r + 1)
            board[r][c] = '.'
            delete(cols, c); delete(posDiag, r+c); delete(negDiag, r-c)
        }
    }
    bt(0)
    return res
}
```

```cpp
#include <vector>
#include <string>

std::vector<std::vector<std::string>> solveNQueens(int n) {
    std::vector<std::vector<std::string>> res;
    std::vector<std::string> board(n, std::string(n, '.'));
    std::vector<bool> cols(n), pos(2*n), neg(2*n);
    std::function<void(int)> bt = [&](int r) {
        if (r == n) { res.push_back(board); return; }
        for (int c = 0; c < n; ++c) {
            if (cols[c] || pos[r+c] || neg[r-c+n]) continue;
            cols[c] = pos[r+c] = neg[r-c+n] = true;
            board[r][c] = 'Q';
            bt(r + 1);
            board[r][c] = '.';
            cols[c] = pos[r+c] = neg[r-c+n] = false;
        }
    };
    bt(0);
    return res;
}
```

### 83. Number of Islands

#### Problem
Given an `m×n` binary grid of `'1'` (land) and `'0'` (water), count the number of islands. An island is a group of adjacent (4-directional) land cells surrounded by water.

#### Pattern
**DFS flood fill (in-place marking).** **O(m·n)** time, **O(m·n)** space (recursion stack in worst case).

#### Explanation
Each call to DFS from an unvisited `'1'` cell represents discovering a new island. The DFS marks every reachable land cell `'0'` to prevent counting any cell twice. After the DFS returns, the whole island has been consumed and the counter increments by 1. In-place marking avoids a separate visited set. This approach modifies the input — if that's unacceptable, use a separate boolean grid. BFS is an iterative alternative with the same complexity that avoids deep recursion stacks on large grids. Both are `O(m·n)` since each cell is visited at most once.

#### Solution

```python
def numIslands(grid):
    count = 0
    rows, cols = len(grid), len(grid[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            dfs(r + dr, c + dc)
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                dfs(r, c)
                count += 1
    return count
```

```rust
fn num_islands(mut grid: Vec<Vec<char>>) -> i32 {
    let rows = grid.len();
    let cols = grid[0].len();
    fn dfs(grid: &mut Vec<Vec<char>>, r: i32, c: i32) {
        let rows = grid.len() as i32;
        let cols = grid[0].len() as i32;
        if r < 0 || c < 0 || r >= rows || c >= cols || grid[r as usize][c as usize] != '1' { return; }
        grid[r as usize][c as usize] = '0';
        for (dr, dc) in [(0,1),(0,-1),(1,0),(-1,0)] {
            dfs(grid, r + dr, c + dc);
        }
    }
    let mut count = 0;
    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] == '1' {
                dfs(&mut grid, r as i32, c as i32);
                count += 1;
            }
        }
    }
    count
}
```

```go
func numIslands(grid [][]byte) int {
    rows, cols := len(grid), len(grid[0])
    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1' { return }
        grid[r][c] = '0'
        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)
    }
    count := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == '1' { dfs(r, c); count++ }
        }
    }
    return count
}
```

```cpp
#include <vector>

int numIslands(std::vector<std::vector<char>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), count = 0;
    std::function<void(int,int)> dfs = [&](int r, int c) {
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
    };
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            if (grid[r][c] == '1') { dfs(r, c); ++count; }
    return count;
}
```

### 84. Clone Graph

#### Problem
Given a reference to a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains a value and a list of neighbors.

#### Pattern
**DFS with old-to-new node hashmap.** **O(V+E)** time, **O(V)** space.

#### Explanation
A plain recursive copy without tracking would revisit nodes and loop infinitely on cycles. The `old_to_new` map serves two purposes: it acts as a visited set to detect already-cloned nodes, and it maps each original node to its clone so neighbors can be wired correctly. When the DFS encounters a node already in the map, it returns the existing clone — this breaks cycles. The DFS creates the clone immediately and inserts it into the map *before* recursing into neighbors, which is critical for graphs with cycles (otherwise the second visit tries to create a second clone). The `null` guard handles an empty graph input.

#### Solution

```python
def cloneGraph(node):
    if not node:
        return None
    old_to_new = {}
    def dfs(n):
        if n in old_to_new:
            return old_to_new[n]
        copy = Node(n.val)
        old_to_new[n] = copy
        for nb in n.neighbors:
            copy.neighbors.append(dfs(nb))
        return copy
    return dfs(node)
```

```rust
use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
struct Node {
    val: i32,
    neighbors: Vec<Rc<RefCell<Node>>>,
}

fn clone_graph(node: Option<Rc<RefCell<Node>>>) -> Option<Rc<RefCell<Node>>> {
    let node = node?;
    let mut map: HashMap<i32, Rc<RefCell<Node>>> = HashMap::new();
    fn dfs(n: &Rc<RefCell<Node>>, map: &mut HashMap<i32, Rc<RefCell<Node>>>) -> Rc<RefCell<Node>> {
        let val = n.borrow().val;
        if let Some(existing) = map.get(&val) { return Rc::clone(existing); }
        let copy = Rc::new(RefCell::new(Node { val, neighbors: vec![] }));
        map.insert(val, Rc::clone(&copy));
        let neighbors: Vec<_> = n.borrow().neighbors.iter().map(Rc::clone).collect();
        for nb in neighbors {
            copy.borrow_mut().neighbors.push(dfs(&nb, map));
        }
        copy
    }
    Some(dfs(&node, &mut map))
}
```

```go
type Node struct {
    Val       int
    Neighbors []*Node
}

func cloneGraph(node *Node) *Node {
    if node == nil { return nil }
    visited := make(map[*Node]*Node)
    var dfs func(n *Node) *Node
    dfs = func(n *Node) *Node {
        if copy, ok := visited[n]; ok { return copy }
        copy := &Node{Val: n.Val}
        visited[n] = copy
        for _, nb := range n.Neighbors {
            copy.Neighbors = append(copy.Neighbors, dfs(nb))
        }
        return copy
    }
    return dfs(node)
}
```

```cpp
#include <unordered_map>
#include <vector>

class Node {
public:
    int val;
    std::vector<Node*> neighbors;
    Node(int v) : val(v) {}
};

Node* cloneGraph(Node* node) {
    if (!node) return nullptr;
    std::unordered_map<Node*, Node*> visited;
    std::function<Node*(Node*)> dfs = [&](Node* n) -> Node* {
        if (visited.count(n)) return visited[n];
        Node* copy = new Node(n->val);
        visited[n] = copy;
        for (Node* nb : n->neighbors)
            copy->neighbors.push_back(dfs(nb));
        return copy;
    };
    return dfs(node);
}
```

### 85. Max Area of Island

#### Problem
Given a binary matrix where `1` is land and `0` is water, return the area of the largest island (group of 4-directionally connected land cells), or `0` if there is no land.

#### Pattern
**DFS flood fill returning subtree size.** **O(m·n)** time, **O(m·n)** space.

#### Explanation
This is Number of Islands (problem #83) with an extra requirement: track and maximise the area of each connected component. The DFS returns the count of cells in the island rooted at `(r, c)`: `1` for the current cell plus the sum of sizes returned by the four recursive calls. In-place marking (`grid[r][c] = 0`) prevents revisiting. The outer loop takes the maximum over all starting cells — cells already marked `0` contribute `0` from the DFS. The `max(... for ...)` generator is convenient but visits every cell; an explicit loop storing the running maximum is equivalent. Edge case: a grid with no land returns `0` because all DFS calls return `0`.

#### Solution

```python
def maxAreaOfIsland(grid):
    rows, cols = len(grid), len(grid[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] == 0:
            return 0
        grid[r][c] = 0
        return 1 + sum(dfs(r + dr, c + dc) for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)])
    return max(dfs(r, c) for r in range(rows) for c in range(cols))
```

```rust
fn max_area_of_island(mut grid: Vec<Vec<i32>>) -> i32 {
    let rows = grid.len();
    let cols = grid[0].len();
    fn dfs(grid: &mut Vec<Vec<i32>>, r: i32, c: i32) -> i32 {
        let rows = grid.len() as i32;
        let cols = grid[0].len() as i32;
        if r < 0 || c < 0 || r >= rows || c >= cols || grid[r as usize][c as usize] == 0 { return 0; }
        grid[r as usize][c as usize] = 0;
        1 + dfs(grid, r+1, c) + dfs(grid, r-1, c) + dfs(grid, r, c+1) + dfs(grid, r, c-1)
    }
    let mut best = 0;
    for r in 0..rows {
        for c in 0..cols {
            best = best.max(dfs(&mut grid, r as i32, c as i32));
        }
    }
    best
}
```

```go
func maxAreaOfIsland(grid [][]int) int {
    rows, cols := len(grid), len(grid[0])
    var dfs func(r, c int) int
    dfs = func(r, c int) int {
        if r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] == 0 { return 0 }
        grid[r][c] = 0
        return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1)
    }
    best := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if a := dfs(r, c); a > best { best = a }
        }
    }
    return best
}
```

```cpp
#include <vector>
#include <algorithm>

int maxAreaOfIsland(std::vector<std::vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size();
    std::function<int(int,int)> dfs = [&](int r, int c) -> int {
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] == 0) return 0;
        grid[r][c] = 0;
        return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1);
    };
    int best = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            best = std::max(best, dfs(r, c));
    return best;
}
```

### 86. Pacific Atlantic Water Flow

#### Problem
Given an `m×n` integer matrix of heights, water flows to adjacent cells with equal or lower elevation. The Pacific touches the top and left edges; the Atlantic touches the bottom and right edges. Return all cells from which water can reach both oceans.

#### Pattern
**Reverse multi-source BFS from each ocean border.** **O(m·n)** time, **O(m·n)** space.

#### Explanation
Forward simulation (try every cell, simulate flow) is `O((mn)²)`. The reversal insight: instead of asking "can water flow from this cell to the ocean?", ask "from the ocean border, which cells can water flow *up* to?" — which means moving to adjacent cells with height **greater than or equal to** the current cell. Two separate BFS passes — one seeded from the Pacific border, one from the Atlantic — produce two reachable sets. The answer is their intersection. This is `O(m·n)` because each cell is enqueued at most once per BFS. The edge initialization includes all border cells for the respective ocean (top+left for Pacific, bottom+right for Atlantic).

#### Solution

```python
from collections import deque

def pacificAtlantic(heights):
    rows, cols = len(heights), len(heights[0])
    def bfs(starts):
        q = deque(starts)
        visited = set(starts)
        while q:
            r, c = q.popleft()
            for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                nr, nc = r + dr, c + dc
                if (0 <= nr < rows and 0 <= nc < cols
                        and (nr, nc) not in visited
                        and heights[nr][nc] >= heights[r][c]):
                    visited.add((nr, nc))
                    q.append((nr, nc))
        return visited
    pacific  = bfs([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
    atlantic = bfs([(rows-1, c) for c in range(cols)] + [(r, cols-1) for r in range(rows)])
    return [[r, c] for r, c in pacific & atlantic]
```

```rust
use std::collections::VecDeque;

fn pacific_atlantic(heights: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    let rows = heights.len();
    let cols = heights[0].len();
    let mut pac = vec![vec![false; cols]; rows];
    let mut atl = vec![vec![false; cols]; rows];
    let mut pq: VecDeque<(usize,usize)> = VecDeque::new();
    let mut aq: VecDeque<(usize,usize)> = VecDeque::new();
    for c in 0..cols { pq.push_back((0,c)); pac[0][c]=true; aq.push_back((rows-1,c)); atl[rows-1][c]=true; }
    for r in 0..rows { pq.push_back((r,0)); pac[r][0]=true; aq.push_back((r,cols-1)); atl[r][cols-1]=true; }
    let bfs = |q: &mut VecDeque<(usize,usize)>, vis: &mut Vec<Vec<bool>>| {
        while let Some((r,c)) = q.pop_front() {
            for (dr,dc) in [(0i32,1i32),(0,-1),(1,0),(-1,0)] {
                let nr = r as i32 + dr; let nc = c as i32 + dc;
                if nr<0||nc<0||nr>=rows as i32||nc>=cols as i32 { continue; }
                let (nr,nc) = (nr as usize, nc as usize);
                if !vis[nr][nc] && heights[nr][nc] >= heights[r][c] {
                    vis[nr][nc] = true; q.push_back((nr,nc));
                }
            }
        }
    };
    bfs(&mut pq, &mut pac);
    bfs(&mut aq, &mut atl);
    let mut res = Vec::new();
    for r in 0..rows { for c in 0..cols { if pac[r][c] && atl[r][c] { res.push(vec![r as i32, c as i32]); } } }
    res
}
```

```go
import "container/list"

func pacificAtlantic(heights [][]int) [][]int {
    rows, cols := len(heights), len(heights[0])
    bfs := func(starts [][2]int) [][]bool {
        vis := make([][]bool, rows)
        for i := range vis { vis[i] = make([]bool, cols) }
        q := list.New()
        for _, s := range starts { vis[s[0]][s[1]] = true; q.PushBack(s) }
        for q.Len() > 0 {
            e := q.Front(); q.Remove(e)
            pos := e.Value.([2]int)
            r, c := pos[0], pos[1]
            for _, d := range [][2]int{{0,1},{0,-1},{1,0},{-1,0}} {
                nr, nc := r+d[0], c+d[1]
                if nr>=0 && nc>=0 && nr<rows && nc<cols && !vis[nr][nc] && heights[nr][nc]>=heights[r][c] {
                    vis[nr][nc] = true; q.PushBack([2]int{nr,nc})
                }
            }
        }
        return vis
    }
    var pStarts, aStarts [][2]int
    for c := 0; c < cols; c++ { pStarts = append(pStarts, [2]int{0,c}); aStarts = append(aStarts, [2]int{rows-1,c}) }
    for r := 0; r < rows; r++ { pStarts = append(pStarts, [2]int{r,0}); aStarts = append(aStarts, [2]int{r,cols-1}) }
    pac, atl := bfs(pStarts), bfs(aStarts)
    var res [][]int
    for r := 0; r < rows; r++ { for c := 0; c < cols; c++ { if pac[r][c] && atl[r][c] { res = append(res, []int{r,c}) } } }
    return res
}
```

```cpp
#include <vector>
#include <queue>

std::vector<std::vector<int>> pacificAtlantic(std::vector<std::vector<int>>& heights) {
    int rows = heights.size(), cols = heights[0].size();
    auto bfs = [&](std::vector<std::pair<int,int>> starts) {
        std::vector<std::vector<bool>> vis(rows, std::vector<bool>(cols, false));
        std::queue<std::pair<int,int>> q;
        for (auto [r,c] : starts) { vis[r][c] = true; q.push({r,c}); }
        while (!q.empty()) {
            auto [r,c] = q.front(); q.pop();
            for (auto [dr,dc] : std::vector<std::pair<int,int>>{{0,1},{0,-1},{1,0},{-1,0}}) {
                int nr=r+dr, nc=c+dc;
                if (nr>=0&&nc>=0&&nr<rows&&nc<cols&&!vis[nr][nc]&&heights[nr][nc]>=heights[r][c]) {
                    vis[nr][nc]=true; q.push({nr,nc});
                }
            }
        }
        return vis;
    };
    std::vector<std::pair<int,int>> pStarts, aStarts;
    for (int c=0;c<cols;c++) { pStarts.push_back({0,c}); aStarts.push_back({rows-1,c}); }
    for (int r=0;r<rows;r++) { pStarts.push_back({r,0}); aStarts.push_back({r,cols-1}); }
    auto pac=bfs(pStarts), atl=bfs(aStarts);
    std::vector<std::vector<int>> res;
    for (int r=0;r<rows;r++) for (int c=0;c<cols;c++) if (pac[r][c]&&atl[r][c]) res.push_back({r,c});
    return res;
}
```

### 87. Surrounded Regions

#### Problem
Given an `m×n` board of `'X'` and `'O'`, capture all `'O'` regions completely surrounded by `'X'` by flipping them to `'X'`. Border-connected `'O'` regions are never captured.

#### Pattern
**DFS from border `'O'` cells to mark safe regions, then sweep.** **O(m·n)** time, **O(m·n)** space.

#### Explanation
A direct approach — flood-fill each `'O'` region and check if it touches the border — requires `O(mn)` per region and risks quadratic time. The reverse approach is cleaner: any `'O'` reachable from the border is safe; anything else is surrounded. Two-pass algorithm: (1) DFS from every border `'O'`, marking safe cells `'S'`; (2) sweep the board and convert `'S'` back to `'O'` (safe) and everything else to `'X'` (captured or already `'X'`). The border cells to seed are the first/last row and first/last column. This runs in exactly `O(m·n)` since each cell is visited at most once.

#### Solution

```python
def solve(board):
    rows, cols = len(board), len(board[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != "O":
            return
        board[r][c] = "S"
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            dfs(r + dr, c + dc)
    for r in range(rows):
        for c in range(cols):
            if board[r][c] == "O" and (r in (0, rows - 1) or c in (0, cols - 1)):
                dfs(r, c)
    for r in range(rows):
        for c in range(cols):
            board[r][c] = "O" if board[r][c] == "S" else "X"
```

```rust
fn solve(board: &mut Vec<Vec<char>>) {
    let rows = board.len();
    let cols = board[0].len();
    fn dfs(board: &mut Vec<Vec<char>>, r: i32, c: i32) {
        let rows = board.len() as i32;
        let cols = board[0].len() as i32;
        if r<0||c<0||r>=rows||c>=cols||board[r as usize][c as usize]!='O' { return; }
        board[r as usize][c as usize] = 'S';
        for (dr,dc) in [(0,1),(0,-1),(1,0),(-1,0)] { dfs(board, r+dr, c+dc); }
    }
    for r in 0..rows {
        for c in 0..cols {
            if board[r][c] == 'O' && (r==0||r==rows-1||c==0||c==cols-1) {
                dfs(board, r as i32, c as i32);
            }
        }
    }
    for r in 0..rows {
        for c in 0..cols {
            board[r][c] = if board[r][c]=='S' { 'O' } else { 'X' };
        }
    }
}
```

```go
func solve(board [][]byte) {
    rows, cols := len(board), len(board[0])
    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r<0||c<0||r>=rows||c>=cols||board[r][c]!='O' { return }
        board[r][c] = 'S'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)
    }
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if board[r][c]=='O' && (r==0||r==rows-1||c==0||c==cols-1) { dfs(r,c) }
        }
    }
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if board[r][c]=='S' { board[r][c]='O' } else { board[r][c]='X' }
        }
    }
}
```

```cpp
#include <vector>

void solve(std::vector<std::vector<char>>& board) {
    int rows = board.size(), cols = board[0].size();
    std::function<void(int,int)> dfs = [&](int r, int c) {
        if (r<0||c<0||r>=rows||c>=cols||board[r][c]!='O') return;
        board[r][c]='S';
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
    };
    for (int r=0;r<rows;r++) for (int c=0;c<cols;c++)
        if (board[r][c]=='O' && (r==0||r==rows-1||c==0||c==cols-1)) dfs(r,c);
    for (int r=0;r<rows;r++) for (int c=0;c<cols;c++)
        board[r][c] = (board[r][c]=='S') ? 'O' : 'X';
}
```

### 88. Rotting Oranges

#### Problem
In a grid, `0` = empty, `1` = fresh orange, `2` = rotten orange. Each minute, every fresh orange adjacent to a rotten one becomes rotten. Return the minimum minutes to rot all oranges, or `-1` if impossible.

#### Pattern
**Multi-source BFS from all initially rotten oranges.** **O(m·n)** time, **O(m·n)** space.

#### Explanation
The classic single-source BFS finds shortest path from one source; multi-source BFS seeds all rotten oranges simultaneously, which naturally propagates rotting in all directions at once (optimal spread). Count fresh oranges upfront; decrement on each conversion. The time elapsed is tracked by carrying a timestamp `t` per cell in the queue (or by processing level by level). When the queue empties, if `fresh > 0` some oranges were isolated — return `-1`. Edge case: if there are no fresh oranges to begin with, return `0` immediately (the BFS loop exits without modifying `time`).

#### Solution

```python
from collections import deque

def orangesRotting(grid):
    rows, cols = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                q.append((r, c, 0))
            elif grid[r][c] == 1:
                fresh += 1
    time = 0
    while q:
        r, c, t = q.popleft()
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t + 1))
                time = t + 1
    return time if fresh == 0 else -1
```

```rust
use std::collections::VecDeque;

fn oranges_rotting(mut grid: Vec<Vec<i32>>) -> i32 {
    let rows = grid.len();
    let cols = grid[0].len();
    let mut q: VecDeque<(usize, usize, i32)> = VecDeque::new();
    let mut fresh = 0i32;
    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] == 2 { q.push_back((r, c, 0)); }
            else if grid[r][c] == 1 { fresh += 1; }
        }
    }
    let mut time = 0;
    while let Some((r, c, t)) = q.pop_front() {
        for (dr, dc) in [(0i32,1i32),(0,-1),(1,0),(-1,0)] {
            let nr = r as i32 + dr; let nc = c as i32 + dc;
            if nr>=0&&nc>=0&&(nr as usize)<rows&&(nc as usize)<cols
                &&grid[nr as usize][nc as usize]==1 {
                grid[nr as usize][nc as usize]=2; fresh-=1;
                q.push_back((nr as usize, nc as usize, t+1)); time=t+1;
            }
        }
    }
    if fresh == 0 { time } else { -1 }
}
```

```go
import "container/list"

func orangesRotting(grid [][]int) int {
    rows, cols := len(grid), len(grid[0])
    type cell struct{ r, c, t int }
    q := list.New()
    fresh := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == 2 { q.PushBack(cell{r,c,0}) }
            if grid[r][c] == 1 { fresh++ }
        }
    }
    time := 0
    for q.Len() > 0 {
        e := q.Front(); q.Remove(e)
        p := e.Value.(cell)
        for _, d := range [][2]int{{0,1},{0,-1},{1,0},{-1,0}} {
            nr, nc := p.r+d[0], p.c+d[1]
            if nr>=0&&nc>=0&&nr<rows&&nc<cols&&grid[nr][nc]==1 {
                grid[nr][nc]=2; fresh--
                q.PushBack(cell{nr,nc,p.t+1}); time=p.t+1
            }
        }
    }
    if fresh == 0 { return time }
    return -1
}
```

```cpp
#include <vector>
#include <queue>

int orangesRotting(std::vector<std::vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), fresh = 0, time = 0;
    std::queue<std::tuple<int,int,int>> q;
    for (int r=0;r<rows;r++) for (int c=0;c<cols;c++) {
        if (grid[r][c]==2) q.push({r,c,0});
        else if (grid[r][c]==1) fresh++;
    }
    while (!q.empty()) {
        auto [r,c,t] = q.front(); q.pop();
        for (auto [dr,dc] : std::vector<std::pair<int,int>>{{0,1},{0,-1},{1,0},{-1,0}}) {
            int nr=r+dr, nc=c+dc;
            if (nr>=0&&nc>=0&&nr<rows&&nc<cols&&grid[nr][nc]==1) {
                grid[nr][nc]=2; --fresh; q.push({nr,nc,t+1}); time=t+1;
            }
        }
    }
    return fresh==0 ? time : -1;
}
```

### 89. Walls and Gates

#### Problem
Given a grid of rooms where `-1` is a wall, `0` is a gate, and `INF` (2^31 - 1) is an empty room, fill each empty room with its distance to the nearest gate in-place. Rooms unreachable from any gate remain `INF`.

#### Pattern
**Multi-source BFS from all gates simultaneously.** **O(m·n)** time, **O(m·n)** space.

#### Explanation
Running a BFS from each gate independently would cost `O(g · m·n)` where `g` is the number of gates. Multi-source BFS seeds all gates at once and propagates outward in waves: the first time any cell is reached gives the shortest distance to any gate. The `rooms[nr][nc] == INF` condition acts as a visited check — already-filled cells are not re-enqueued. This is correct because BFS guarantees that the first time a cell is dequeued, it was reached via the shortest path (so the first fill is optimal). Walls (`-1`) are never filled because the INF check excludes them.

#### Solution

```python
from collections import deque

def wallsAndGates(rooms):
    rows, cols = len(rooms), len(rooms[0])
    INF = 2147483647
    q = deque(
        (r, c)
        for r in range(rows)
        for c in range(cols)
        if rooms[r][c] == 0
    )
    while q:
        r, c = q.popleft()
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1
                q.append((nr, nc))
```

```rust
use std::collections::VecDeque;

fn walls_and_gates(rooms: &mut Vec<Vec<i32>>) {
    let rows = rooms.len();
    let cols = rooms[0].len();
    const INF: i32 = i32::MAX;
    let mut q: VecDeque<(usize,usize)> = VecDeque::new();
    for r in 0..rows { for c in 0..cols { if rooms[r][c]==0 { q.push_back((r,c)); } } }
    while let Some((r,c)) = q.pop_front() {
        for (dr,dc) in [(0i32,1i32),(0,-1),(1,0),(-1,0)] {
            let nr=r as i32+dr; let nc=c as i32+dc;
            if nr>=0&&nc>=0&&(nr as usize)<rows&&(nc as usize)<cols {
                let (nr,nc)=(nr as usize,nc as usize);
                if rooms[nr][nc]==INF { rooms[nr][nc]=rooms[r][c]+1; q.push_back((nr,nc)); }
            }
        }
    }
}
```

```go
import "container/list"

func wallsAndGates(rooms [][]int) {
    rows, cols := len(rooms), len(rooms[0])
    const INF = 1<<31 - 1
    q := list.New()
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if rooms[r][c] == 0 { q.PushBack([2]int{r,c}) }
        }
    }
    for q.Len() > 0 {
        e := q.Front(); q.Remove(e)
        pos := e.Value.([2]int)
        r, c := pos[0], pos[1]
        for _, d := range [][2]int{{0,1},{0,-1},{1,0},{-1,0}} {
            nr, nc := r+d[0], c+d[1]
            if nr>=0&&nc>=0&&nr<rows&&nc<cols&&rooms[nr][nc]==INF {
                rooms[nr][nc]=rooms[r][c]+1; q.PushBack([2]int{nr,nc})
            }
        }
    }
}
```

```cpp
#include <vector>
#include <queue>
#include <climits>

void wallsAndGates(std::vector<std::vector<int>>& rooms) {
    int rows = rooms.size(), cols = rooms[0].size();
    std::queue<std::pair<int,int>> q;
    for (int r=0;r<rows;r++) for (int c=0;c<cols;c++) if (rooms[r][c]==0) q.push({r,c});
    while (!q.empty()) {
        auto [r,c] = q.front(); q.pop();
        for (auto [dr,dc] : std::vector<std::pair<int,int>>{{0,1},{0,-1},{1,0},{-1,0}}) {
            int nr=r+dr, nc=c+dc;
            if (nr>=0&&nc>=0&&nr<rows&&nc<cols&&rooms[nr][nc]==INT_MAX) {
                rooms[nr][nc]=rooms[r][c]+1; q.push({nr,nc});
            }
        }
    }
}
```

### 90. Course Schedule

#### Problem
Given `numCourses` and a list of prerequisite pairs `[a, b]` meaning you must take course `b` before `a`, determine if it's possible to finish all courses (i.e., the prerequisite graph has no cycle).

#### Pattern
**DFS cycle detection with three-state coloring.** **O(V+E)** time, **O(V+E)** space.

#### Explanation
A cycle in the prerequisite graph means some set of courses depends circularly on each other — impossible to finish. DFS detects cycles via a "currently visiting" set (`visiting`): if DFS reaches a node already in that set, a back-edge (cycle) is found. After successfully exploring all of a node's prerequisites, it's removed from `visiting` and its adjacency list cleared — this memoises completion and prevents re-traversal. A node with an empty adjacency list is safe (no prerequisites or already verified). The call `all(dfs(c) for c in range(numCourses))` ensures disconnected components are all checked. Kahn's BFS approach (used in problem #91) is an alternative that naturally produces a topological order.

#### Solution

```python
def canFinish(numCourses, prerequisites):
    adj = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        adj[a].append(b)
    visiting = set()
    def dfs(c):
        if c in visiting:
            return False
        if not adj[c]:
            return True
        visiting.add(c)
        for pre in adj[c]:
            if not dfs(pre):
                return False
        visiting.remove(c)
        adj[c] = []
        return True
    return all(dfs(c) for c in range(numCourses))
```

```rust
fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
    let n = num_courses as usize;
    let mut adj: Vec<Vec<usize>> = vec![vec![]; n];
    for p in &prerequisites { adj[p[0] as usize].push(p[1] as usize); }
    // 0=unvisited, 1=visiting, 2=done
    let mut state = vec![0u8; n];
    fn dfs(node: usize, adj: &Vec<Vec<usize>>, state: &mut Vec<u8>) -> bool {
        if state[node] == 1 { return false; }
        if state[node] == 2 { return true; }
        state[node] = 1;
        for &nb in &adj[node] { if !dfs(nb, adj, state) { return false; } }
        state[node] = 2;
        true
    }
    (0..n).all(|c| dfs(c, &adj, &mut state))
}
```

```go
func canFinish(numCourses int, prerequisites [][]int) bool {
    adj := make([][]int, numCourses)
    for _, p := range prerequisites { adj[p[0]] = append(adj[p[0]], p[1]) }
    // 0=unvisited, 1=visiting, 2=done
    state := make([]int, numCourses)
    var dfs func(c int) bool
    dfs = func(c int) bool {
        if state[c] == 1 { return false }
        if state[c] == 2 { return true }
        state[c] = 1
        for _, nb := range adj[c] { if !dfs(nb) { return false } }
        state[c] = 2
        return true
    }
    for c := 0; c < numCourses; c++ { if !dfs(c) { return false } }
    return true
}
```

```cpp
#include <vector>

bool canFinish(int numCourses, std::vector<std::vector<int>>& prerequisites) {
    std::vector<std::vector<int>> adj(numCourses);
    for (auto& p : prerequisites) adj[p[0]].push_back(p[1]);
    std::vector<int> state(numCourses, 0); // 0=unvisited,1=visiting,2=done
    std::function<bool(int)> dfs = [&](int c) -> bool {
        if (state[c]==1) return false;
        if (state[c]==2) return true;
        state[c]=1;
        for (int nb : adj[c]) if (!dfs(nb)) return false;
        state[c]=2;
        return true;
    };
    for (int c=0;c<numCourses;c++) if (!dfs(c)) return false;
    return true;
}
```

### 91. Course Schedule II

#### Problem
Given `numCourses` and a list of `[course, prerequisite]` pairs, return a valid order to take all courses, or an empty array if a cycle makes it impossible.

#### Pattern
**Topological sort (Kahn's BFS).** **O(V+E)** time, **O(V+E)** space.

#### Explanation
The prerequisite graph must be a DAG for a valid ordering to exist. Kahn's algorithm tracks `indegree` — the number of prerequisites each course still needs. Courses with `indegree == 0` are ready to take immediately and seed the BFS queue. Each time a course is taken, its dependents get their `indegree` decremented; when a dependent hits zero it enters the queue. If all `numCourses` are collected the topological order is valid; if the queue empties early, a cycle exists and we return `[]`. This extends Course Schedule I naturally — you just collect the order instead of only checking feasibility.

#### Solution

```python
from collections import deque

def findOrder(numCourses, prerequisites):
    adj = {}
    indegree = [0] * numCourses
    for a, b in prerequisites:
        if b not in adj:
            adj[b] = []
        adj[b].append(a)
        indegree[a] += 1
    q = deque(c for c in range(numCourses) if indegree[c] == 0)
    res = []
    while q:
        c = q.popleft()
        res.append(c)
        for nb in adj.get(c, []):
            indegree[nb] -= 1
            if indegree[nb] == 0:
                q.append(nb)
    return res if len(res) == numCourses else []
```

```rust
use std::collections::VecDeque;

fn find_order(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> Vec<i32> {
    let n = num_courses as usize;
    let mut adj = vec![vec![]; n];
    let mut indegree = vec![0i32; n];
    for p in &prerequisites {
        let (a, b) = (p[0] as usize, p[1] as usize);
        adj[b].push(a);
        indegree[a] += 1;
    }
    let mut q: VecDeque<usize> = (0..n).filter(|&c| indegree[c] == 0).collect();
    let mut res = Vec::new();
    while let Some(c) = q.pop_front() {
        res.push(c as i32);
        for &nb in &adj[c] {
            indegree[nb] -= 1;
            if indegree[nb] == 0 {
                q.push_back(nb);
            }
        }
    }
    if res.len() == n { res } else { vec![] }
}
```

```go
func findOrder(numCourses int, prerequisites [][]int) []int {
    adj := make([][]int, numCourses)
    indegree := make([]int, numCourses)
    for _, p := range prerequisites {
        a, b := p[0], p[1]
        adj[b] = append(adj[b], a)
        indegree[a]++
    }
    q := []int{}
    for c := 0; c < numCourses; c++ {
        if indegree[c] == 0 {
            q = append(q, c)
        }
    }
    res := []int{}
    for len(q) > 0 {
        c := q[0]
        q = q[1:]
        res = append(res, c)
        for _, nb := range adj[c] {
            indegree[nb]--
            if indegree[nb] == 0 {
                q = append(q, nb)
            }
        }
    }
    if len(res) == numCourses {
        return res
    }
    return []int{}
}
```

```cpp
#include <vector>
#include <queue>

std::vector<int> findOrder(int numCourses, std::vector<std::vector<int>>& prerequisites) {
    std::vector<std::vector<int>> adj(numCourses);
    std::vector<int> indegree(numCourses, 0);
    for (auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    std::queue<int> q;
    for (int c = 0; c < numCourses; ++c)
        if (indegree[c] == 0) q.push(c);
    std::vector<int> res;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        res.push_back(c);
        for (int nb : adj[c]) {
            if (--indegree[nb] == 0) q.push(nb);
        }
    }
    return (int)res.size() == numCourses ? res : std::vector<int>{};
}
```

### 92. Redundant Connection

#### Problem
Given a graph that started as a tree with one extra edge added, find and return that redundant edge. The graph has `n` nodes labeled `1` to `n`.

#### Pattern
**Union-Find (cycle detection).** **O(n α(n))** time, **O(n)** space.

#### Explanation
A tree on `n` nodes has exactly `n-1` edges; the input has `n` edges, so exactly one creates a cycle. We process edges in order and union the two endpoints. If both endpoints already share the same root — meaning they are already connected — this edge is the culprit and we return it immediately. Union by rank with path compression (via path halving) keeps each `find` nearly O(1). The problem guarantees exactly one redundant edge, so the first cycle-creating edge is the answer, and returning it preserves the "last such edge" tie-breaking rule since we process edges in order.

#### Solution

```python
def findRedundantConnection(edges):
    parent = list(range(len(edges) + 1))
    rank = [1] * (len(edges) + 1)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px == py:
            return False
        if rank[px] < rank[py]:
            px, py = py, px
        parent[py] = px
        rank[px] += rank[py] == rank[px]
        return True

    for u, v in edges:
        if not union(u, v):
            return [u, v]
```

```rust
fn find_redundant_connection(edges: Vec<Vec<i32>>) -> Vec<i32> {
    let n = edges.len() + 1;
    let mut parent: Vec<usize> = (0..n).collect();
    let mut rank = vec![1usize; n];

    fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
        while parent[x] != x {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        x
    }

    for e in &edges {
        let (u, v) = (e[0] as usize, e[1] as usize);
        let pu = find(&mut parent, u);
        let pv = find(&mut parent, v);
        if pu == pv {
            return vec![e[0], e[1]];
        }
        if rank[pu] < rank[pv] {
            parent[pu] = pv;
        } else if rank[pu] > rank[pv] {
            parent[pv] = pu;
        } else {
            parent[pv] = pu;
            rank[pu] += 1;
        }
    }
    vec![]
}
```

```go
func findRedundantConnection(edges [][]int) []int {
    n := len(edges) + 1
    parent := make([]int, n)
    rank := make([]int, n)
    for i := range parent {
        parent[i] = i
        rank[i] = 1
    }
    var find func(int) int
    find = func(x int) int {
        for parent[x] != x {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }
    for _, e := range edges {
        pu, pv := find(e[0]), find(e[1])
        if pu == pv {
            return e
        }
        if rank[pu] < rank[pv] {
            parent[pu] = pv
        } else if rank[pu] > rank[pv] {
            parent[pv] = pu
        } else {
            parent[pv] = pu
            rank[pu]++
        }
    }
    return nil
}
```

```cpp
#include <vector>

std::vector<int> findRedundantConnection(std::vector<std::vector<int>>& edges) {
    int n = (int)edges.size() + 1;
    std::vector<int> parent(n), rank_(n, 1);
    std::iota(parent.begin(), parent.end(), 0);

    std::function<int(int)> find = [&](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    for (auto& e : edges) {
        int pu = find(e[0]), pv = find(e[1]);
        if (pu == pv) return {e[0], e[1]};
        if (rank_[pu] < rank_[pv]) std::swap(pu, pv);
        parent[pv] = pu;
        if (rank_[pu] == rank_[pv]) rank_[pu]++;
    }
    return {};
}
```

### 93. Number of Connected Components in an Undirected Graph

#### Problem
Given `n` nodes and a list of undirected edges, return the number of connected components in the graph.

#### Pattern
**Union-Find.** **O(n α(n))** time, **O(n)** space.

#### Explanation
Start with `n` isolated components. For each edge `(u, v)`, attempt to union the two nodes. If they already share a root, they are in the same component and the count doesn't change; if their roots differ, we merge and decrement the component count by 1. DFS/BFS works equally well at `O(V+E)`, but Union-Find is more concise and handles dynamic connectivity queries naturally. Path compression with union by rank keeps each operation near-constant. The final component count equals `n` minus the number of successful merges.

#### Solution

```python
def countComponents(n, edges):
    parent = list(range(n))
    rank = [1] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px == py:
            return 0
        if rank[px] < rank[py]:
            px, py = py, px
        parent[py] = px
        rank[px] += rank[py] == rank[px]
        return 1

    return n - sum(union(u, v) for u, v in edges)
```

```rust
fn count_components(n: i32, edges: Vec<Vec<i32>>) -> i32 {
    let n = n as usize;
    let mut parent: Vec<usize> = (0..n).collect();
    let mut rank = vec![1usize; n];

    fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
        while parent[x] != x {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        x
    }

    let mut components = n as i32;
    for e in &edges {
        let pu = find(&mut parent, e[0] as usize);
        let pv = find(&mut parent, e[1] as usize);
        if pu != pv {
            if rank[pu] < rank[pv] {
                parent[pu] = pv;
            } else if rank[pu] > rank[pv] {
                parent[pv] = pu;
            } else {
                parent[pv] = pu;
                rank[pu] += 1;
            }
            components -= 1;
        }
    }
    components
}
```

```go
func countComponents(n int, edges [][]int) int {
    parent := make([]int, n)
    rank := make([]int, n)
    for i := range parent {
        parent[i] = i
        rank[i] = 1
    }
    var find func(int) int
    find = func(x int) int {
        for parent[x] != x {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }
    components := n
    for _, e := range edges {
        pu, pv := find(e[0]), find(e[1])
        if pu != pv {
            if rank[pu] < rank[pv] {
                parent[pu] = pv
            } else if rank[pu] > rank[pv] {
                parent[pv] = pu
            } else {
                parent[pv] = pu
                rank[pu]++
            }
            components--
        }
    }
    return components
}
```

```cpp
#include <vector>
#include <numeric>

int countComponents(int n, std::vector<std::vector<int>>& edges) {
    std::vector<int> parent(n), rank_(n, 1);
    std::iota(parent.begin(), parent.end(), 0);

    std::function<int(int)> find = [&](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    int components = n;
    for (auto& e : edges) {
        int pu = find(e[0]), pv = find(e[1]);
        if (pu != pv) {
            if (rank_[pu] < rank_[pv]) std::swap(pu, pv);
            parent[pv] = pu;
            if (rank_[pu] == rank_[pv]) rank_[pu]++;
            components--;
        }
    }
    return components;
}
```

### 94. Graph Valid Tree

#### Problem
Given `n` nodes labeled `0` to `n-1` and a list of undirected edges, determine whether they form a valid tree (connected and acyclic).

#### Pattern
**Union-Find (no cycle + connected).** **O(n α(n))** time, **O(n)** space.

#### Explanation
A valid tree on `n` nodes must satisfy exactly two conditions: it has `n-1` edges and contains no cycle. Checking the edge count first is a fast short-circuit — too many or too few edges fail immediately. Then we process each edge through Union-Find: if both endpoints already share the same root, adding this edge creates a cycle and we return `False`. If we union all `n-1` edges without conflict, the graph is both acyclic and connected (since a connected acyclic graph is exactly a tree). No need for a separate connectivity check because `n-1` edges with no cycle guarantees a spanning tree.

#### Solution

```python
def validTree(n, edges):
    if len(edges) != n - 1:
        return False
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in edges:
        pu, pv = find(u), find(v)
        if pu == pv:
            return False
        parent[pu] = pv
    return True
```

```rust
fn valid_tree(n: i32, edges: Vec<Vec<i32>>) -> bool {
    let n = n as usize;
    if edges.len() != n - 1 {
        return false;
    }
    let mut parent: Vec<usize> = (0..n).collect();

    fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
        while parent[x] != x {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        x
    }

    for e in &edges {
        let pu = find(&mut parent, e[0] as usize);
        let pv = find(&mut parent, e[1] as usize);
        if pu == pv {
            return false;
        }
        parent[pu] = pv;
    }
    true
}
```

```go
func validTree(n int, edges [][]int) bool {
    if len(edges) != n-1 {
        return false
    }
    parent := make([]int, n)
    for i := range parent {
        parent[i] = i
    }
    var find func(int) int
    find = func(x int) int {
        for parent[x] != x {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }
    for _, e := range edges {
        pu, pv := find(e[0]), find(e[1])
        if pu == pv {
            return false
        }
        parent[pu] = pv
    }
    return true
}
```

```cpp
#include <vector>
#include <numeric>

bool validTree(int n, std::vector<std::vector<int>>& edges) {
    if ((int)edges.size() != n - 1) return false;
    std::vector<int> parent(n);
    std::iota(parent.begin(), parent.end(), 0);

    std::function<int(int)> find = [&](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    for (auto& e : edges) {
        int pu = find(e[0]), pv = find(e[1]);
        if (pu == pv) return false;
        parent[pu] = pv;
    }
    return true;
}
```

### 95. Word Ladder

#### Problem
Given `beginWord`, `endWord`, and a `wordList`, return the length of the shortest transformation sequence where each step changes exactly one letter and each intermediate word must be in the list. Return `0` if no such sequence exists.

#### Pattern
**BFS (unweighted shortest path).** **O(m² * n)** time, **O(m * n)** space, where `m` is word length and `n` is dictionary size.

#### Explanation
Each word is a node; two words are adjacent if they differ by exactly one character. The problem reduces to finding the shortest path in this implicit graph — precisely what BFS solves for unweighted graphs. A naive approach tries every pair of words to build edges, costing `O(n² * m)`; instead, generate all `26 * m` one-letter mutations per word and check them against the set in `O(1)`. The `visited` set prevents revisiting words and guarantees each node is processed at most once. Checking `endWord` at generation time (not dequeue time) lets us return `steps + 1` immediately, shaving one BFS level off the loop.

#### Solution

```python
from collections import deque

def ladderLength(beginWord, endWord, wordList):
    wordSet = set(wordList)
    if endWord not in wordSet:
        return 0
    q = deque([(beginWord, 1)])
    visited = {beginWord}
    while q:
        word, steps = q.popleft()
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                next_word = word[:i] + c + word[i+1:]
                if next_word == endWord:
                    return steps + 1
                if next_word in wordSet and next_word not in visited:
                    visited.add(next_word)
                    q.append((next_word, steps + 1))
    return 0
```

```rust
use std::collections::{HashSet, VecDeque};

fn ladder_length(begin_word: String, end_word: String, word_list: Vec<String>) -> i32 {
    let word_set: HashSet<String> = word_list.into_iter().collect();
    if !word_set.contains(&end_word) {
        return 0;
    }
    let mut visited: HashSet<String> = HashSet::new();
    let mut q: VecDeque<(String, i32)> = VecDeque::new();
    q.push_back((begin_word.clone(), 1));
    visited.insert(begin_word);
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz".chars().collect();
    while let Some((word, steps)) = q.pop_front() {
        let bytes: Vec<u8> = word.bytes().collect();
        for i in 0..bytes.len() {
            for &c in &chars {
                let mut next = bytes.clone();
                next[i] = c as u8;
                let next_word = String::from_utf8(next).unwrap();
                if next_word == end_word {
                    return steps + 1;
                }
                if word_set.contains(&next_word) && !visited.contains(&next_word) {
                    visited.insert(next_word.clone());
                    q.push_back((next_word, steps + 1));
                }
            }
        }
    }
    0
}
```

```go
func ladderLength(beginWord string, endWord string, wordList []string) int {
    wordSet := make(map[string]bool)
    for _, w := range wordList {
        wordSet[w] = true
    }
    if !wordSet[endWord] {
        return 0
    }
    type entry struct {
        word  string
        steps int
    }
    visited := map[string]bool{beginWord: true}
    q := []entry{{beginWord, 1}}
    for len(q) > 0 {
        cur := q[0]
        q = q[1:]
        bs := []byte(cur.word)
        for i := 0; i < len(bs); i++ {
            orig := bs[i]
            for c := byte('a'); c <= 'z'; c++ {
                bs[i] = c
                next := string(bs)
                if next == endWord {
                    return cur.steps + 1
                }
                if wordSet[next] && !visited[next] {
                    visited[next] = true
                    q = append(q, entry{next, cur.steps + 1})
                }
            }
            bs[i] = orig
        }
    }
    return 0
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_set>
#include <queue>

int ladderLength(std::string beginWord, std::string endWord, std::vector<std::string>& wordList) {
    std::unordered_set<std::string> wordSet(wordList.begin(), wordList.end());
    if (!wordSet.count(endWord)) return 0;
    std::queue<std::pair<std::string, int>> q;
    q.push({beginWord, 1});
    std::unordered_set<std::string> visited{beginWord};
    while (!q.empty()) {
        auto [word, steps] = q.front(); q.pop();
        for (int i = 0; i < (int)word.size(); ++i) {
            char orig = word[i];
            for (char c = 'a'; c <= 'z'; ++c) {
                word[i] = c;
                if (word == endWord) return steps + 1;
                if (wordSet.count(word) && !visited.count(word)) {
                    visited.insert(word);
                    q.push({word, steps + 1});
                }
            }
            word[i] = orig;
        }
    }
    return 0;
}
```

### 96. Reconstruct Itinerary

#### Problem
Given a list of airline tickets `[from, to]`, reconstruct the full itinerary starting from `"JFK"` using all tickets exactly once. When multiple itineraries exist, return the one with the smallest lexical order.

#### Pattern
**Hierholzer's algorithm (Eulerian path, iterative DFS).** **O(E log E)** time, **O(E)** space.

#### Explanation
This is an Eulerian path problem: find a path that visits every edge exactly once. Hierholzer's algorithm does it in linear time on the edge count. By sorting destinations in reverse order and using a stack/list as an adjacency list we pop from, each `pop()` always picks the lexicographically smallest next destination greedily. A node is appended to `res` only once all its outgoing edges are exhausted. Reversing `res` at the end gives the correct forward order. The recursive DFS here has Python stack depth risk on large inputs; an iterative version with an explicit stack is safer in practice.

#### Solution

```python
def findItinerary(tickets):
    adj = {}
    for src, dst in sorted(tickets, reverse=True):
        if src not in adj:
            adj[src] = []
        adj[src].append(dst)
    res = []
    stack = ["JFK"]
    while stack:
        while adj.get(stack[-1]):
            stack.append(adj[stack[-1]].pop())
        res.append(stack.pop())
    return res[::-1]
```

```rust
use std::collections::BTreeMap;

fn find_itinerary(tickets: Vec<Vec<String>>) -> Vec<String> {
    let mut adj: BTreeMap<String, std::collections::BinaryHeap<std::cmp::Reverse<String>>> =
        BTreeMap::new();
    for t in &tickets {
        adj.entry(t[0].clone())
            .or_default()
            .push(std::cmp::Reverse(t[1].clone()));
    }
    let mut stack = vec!["JFK".to_string()];
    let mut res = Vec::new();
    while let Some(top) = stack.last().cloned() {
        if let Some(heap) = adj.get_mut(&top) {
            if let Some(std::cmp::Reverse(next)) = heap.pop() {
                stack.push(next);
                continue;
            }
        }
        res.push(stack.pop().unwrap());
    }
    res.reverse();
    res
}
```

```go
import "sort"

func findItinerary(tickets [][]string) []string {
    adj := map[string][]string{}
    for _, t := range tickets {
        adj[t[0]] = append(adj[t[0]], t[1])
    }
    for k := range adj {
        sort.Sort(sort.Reverse(sort.StringSlice(adj[k])))
    }
    var res []string
    stack := []string{"JFK"}
    for len(stack) > 0 {
        top := stack[len(stack)-1]
        if dsts := adj[top]; len(dsts) > 0 {
            stack = append(stack, dsts[len(dsts)-1])
            adj[top] = dsts[:len(dsts)-1]
        } else {
            res = append(res, top)
            stack = stack[:len(stack)-1]
        }
    }
    // reverse
    for i, j := 0, len(res)-1; i < j; i, j = i+1, j-1 {
        res[i], res[j] = res[j], res[i]
    }
    return res
}
```

```cpp
#include <vector>
#include <string>
#include <map>
#include <algorithm>

std::vector<std::string> findItinerary(std::vector<std::vector<std::string>>& tickets) {
    std::map<std::string, std::vector<std::string>> adj;
    for (auto& t : tickets)
        adj[t[0]].push_back(t[1]);
    for (auto& [k, v] : adj)
        std::sort(v.begin(), v.end(), std::greater<std::string>());
    std::vector<std::string> res;
    std::vector<std::string> stack{"JFK"};
    while (!stack.empty()) {
        std::string& top = stack.back();
        auto it = adj.find(top);
        if (it != adj.end() && !it->second.empty()) {
            stack.push_back(it->second.back());
            it->second.pop_back();
        } else {
            res.push_back(top);
            stack.pop_back();
        }
    }
    std::reverse(res.begin(), res.end());
    return res;
}
```

### 97. Min Cost to Connect All Points

#### Problem
Given an array of points on a 2-D plane, return the minimum cost to connect all points, where the cost between two points is their Manhattan distance. Each point must be connected (directly or indirectly) to every other.

#### Pattern
**Prim's MST (min-heap / lazy deletion).** **O(n² log n)** time, **O(n²)** space.

#### Explanation
This is a dense minimum spanning tree problem — the implicit graph is fully connected with `n*(n-1)/2` edges. Prim's algorithm is preferred over Kruskal's here because generating all edges explicitly would be expensive; Prim's grows the MST one node at a time by always picking the cheapest edge to a not-yet-visited node. The lazy heap approach pushes all candidate edges for a newly added node immediately, tolerating stale entries that get skipped when popped. Since every pair of points is a potential edge, the heap can hold O(n²) entries. With only `n` points Kruskal would also work but requires materializing all edges upfront.

#### Solution

```python
import heapq

def minCostConnectPoints(points):
    n = len(points)
    visited = set()
    heap = [(0, 0)]
    cost = 0
    while len(visited) < n:
        c, i = heapq.heappop(heap)
        if i in visited:
            continue
        visited.add(i)
        cost += c
        for j in range(n):
            if j not in visited:
                d = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
                heapq.heappush(heap, (d, j))
    return cost
```

```rust
use std::collections::{BinaryHeap, HashSet};
use std::cmp::Reverse;

fn min_cost_connect_points(points: Vec<Vec<i32>>) -> i32 {
    let n = points.len();
    let mut visited = HashSet::new();
    let mut heap = BinaryHeap::new();
    heap.push(Reverse((0i32, 0usize)));
    let mut cost = 0;
    while visited.len() < n {
        let Reverse((c, i)) = heap.pop().unwrap();
        if visited.contains(&i) { continue; }
        visited.insert(i);
        cost += c;
        for j in 0..n {
            if !visited.contains(&j) {
                let d = (points[i][0] - points[j][0]).abs()
                      + (points[i][1] - points[j][1]).abs();
                heap.push(Reverse((d, j)));
            }
        }
    }
    cost
}
```

```go
import "container/heap"

type intPair struct{ cost, idx int }
type pairHeap []intPair
func (h pairHeap) Len() int            { return len(h) }
func (h pairHeap) Less(i, j int) bool { return h[i].cost < h[j].cost }
func (h pairHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *pairHeap) Push(x interface{}) { *h = append(*h, x.(intPair)) }
func (h *pairHeap) Pop() interface{} {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

func abs(x int) int {
    if x < 0 { return -x }
    return x
}

func minCostConnectPoints(points [][]int) int {
    n := len(points)
    visited := make([]bool, n)
    h := &pairHeap{{0, 0}}
    heap.Init(h)
    cost := 0
    for count := 0; count < n; {
        p := heap.Pop(h).(intPair)
        if visited[p.idx] { continue }
        visited[p.idx] = true
        cost += p.cost
        count++
        for j := 0; j < n; j++ {
            if !visited[j] {
                d := abs(points[p.idx][0]-points[j][0]) + abs(points[p.idx][1]-points[j][1])
                heap.Push(h, intPair{d, j})
            }
        }
    }
    return cost
}
```

```cpp
#include <vector>
#include <queue>
#include <unordered_set>
#include <cmath>

int minCostConnectPoints(std::vector<std::vector<int>>& points) {
    int n = (int)points.size();
    std::priority_queue<std::pair<int,int>, std::vector<std::pair<int,int>>,
                        std::greater<>> heap;
    heap.push({0, 0});
    std::unordered_set<int> visited;
    int cost = 0;
    while ((int)visited.size() < n) {
        auto [c, i] = heap.top(); heap.pop();
        if (visited.count(i)) continue;
        visited.insert(i);
        cost += c;
        for (int j = 0; j < n; ++j) {
            if (!visited.count(j)) {
                int d = std::abs(points[i][0] - points[j][0])
                      + std::abs(points[i][1] - points[j][1]);
                heap.push({d, j});
            }
        }
    }
    return cost;
}
```

### 98. Network Delay Time

#### Problem
Given a directed weighted graph with `n` nodes and edges `[u, v, w]`, find the minimum time for all nodes to receive a signal sent from node `k`. Return `-1` if any node is unreachable.

#### Pattern
**Dijkstra's shortest path.** **O((V+E) log V)** time, **O(V+E)** space.

#### Explanation
The question reduces to: find the maximum single-source shortest path from `k` to all other nodes. Dijkstra's greedy approach always expands the unvisited node with the current shortest distance, guaranteeing that when a node is first popped from the min-heap its distance is finalized. We skip stale heap entries with the `if u in dist` guard (lazy deletion). After processing, if `dist` contains fewer than `n` nodes, some node was unreachable and we return `-1`; otherwise the max distance is the answer — the last node to receive the signal determines overall delay.

#### Solution

```python
import heapq

def networkDelayTime(times, n, k):
    adj = {}
    for u, v, w in times:
        if u not in adj:
            adj[u] = []
        adj[u].append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in adj.get(u, []):
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1
```

```rust
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Reverse;

fn network_delay_time(times: Vec<Vec<i32>>, n: i32, k: i32) -> i32 {
    let mut adj: HashMap<i32, Vec<(i32, i32)>> = HashMap::new();
    for t in &times {
        adj.entry(t[0]).or_default().push((t[1], t[2]));
    }
    let mut dist: HashMap<i32, i32> = HashMap::new();
    let mut heap = BinaryHeap::new();
    heap.push(Reverse((0i32, k)));
    while let Some(Reverse((d, u))) = heap.pop() {
        if dist.contains_key(&u) { continue; }
        dist.insert(u, d);
        if let Some(neighbors) = adj.get(&u) {
            for &(v, w) in neighbors {
                if !dist.contains_key(&v) {
                    heap.push(Reverse((d + w, v)));
                }
            }
        }
    }
    if dist.len() == n as usize {
        *dist.values().max().unwrap()
    } else {
        -1
    }
}
```

```go
import "container/heap"

type edge97 struct{ to, w int }
type item97 struct{ dist, node int }
type minHeap97 []item97
func (h minHeap97) Len() int            { return len(h) }
func (h minHeap97) Less(i, j int) bool { return h[i].dist < h[j].dist }
func (h minHeap97) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap97) Push(x interface{}) { *h = append(*h, x.(item97)) }
func (h *minHeap97) Pop() interface{} {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

func networkDelayTime(times [][]int, n int, k int) int {
    adj := make(map[int][]edge97)
    for _, t := range times {
        adj[t[0]] = append(adj[t[0]], edge97{t[1], t[2]})
    }
    dist := make(map[int]int)
    h := &minHeap97{{0, k}}
    heap.Init(h)
    for h.Len() > 0 {
        cur := heap.Pop(h).(item97)
        if _, ok := dist[cur.node]; ok { continue }
        dist[cur.node] = cur.dist
        for _, e := range adj[cur.node] {
            if _, ok := dist[e.to]; !ok {
                heap.Push(h, item97{cur.dist + e.w, e.to})
            }
        }
    }
    if len(dist) != n { return -1 }
    maxD := 0
    for _, d := range dist {
        if d > maxD { maxD = d }
    }
    return maxD
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <queue>
#include <climits>

int networkDelayTime(std::vector<std::vector<int>>& times, int n, int k) {
    std::unordered_map<int, std::vector<std::pair<int,int>>> adj;
    for (auto& t : times)
        adj[t[0]].push_back({t[1], t[2]});
    std::unordered_map<int, int> dist;
    std::priority_queue<std::pair<int,int>, std::vector<std::pair<int,int>>,
                        std::greater<>> heap;
    heap.push({0, k});
    while (!heap.empty()) {
        auto [d, u] = heap.top(); heap.pop();
        if (dist.count(u)) continue;
        dist[u] = d;
        for (auto& [v, w] : adj[u])
            if (!dist.count(v)) heap.push({d + w, v});
    }
    if ((int)dist.size() != n) return -1;
    int ans = 0;
    for (auto& [_, d] : dist) ans = std::max(ans, d);
    return ans;
}
```

### 99. Swim in Rising Water

#### Problem
Given an `n x n` grid where `grid[r][c]` is the elevation of cell `(r, c)`, find the minimum time `t` such that you can swim from `(0, 0)` to `(n-1, n-1)`. At time `t` you can swim through any cell with elevation at most `t`.

#### Pattern
**Dijkstra (minimax path).** **O(n² log n)** time, **O(n²)** space.

#### Explanation
Rather than minimizing the sum of weights along a path, we want to minimize the maximum elevation encountered — a minimax path problem. Dijkstra handles this naturally by replacing the "relax with sum" step with `max(current_t, grid[nr][nc])`. The min-heap always expands the reachable cell with the lowest bottleneck elevation, so when `(n-1, n-1)` is first popped, its value is the globally optimal minimax cost. An alternative is binary search on `t` with BFS/DFS feasibility check, also `O(n² log n)`, but Dijkstra solves it in one pass without the outer binary search loop.

#### Solution

```python
import heapq

def swimInWater(grid):
    n = len(grid)
    visited = {(0, 0)}
    heap = [(grid[0][0], 0, 0)]
    while heap:
        t, r, c = heapq.heappop(heap)
        if r == n - 1 and c == n - 1:
            return t
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in visited:
                visited.add((nr, nc))
                heapq.heappush(heap, (max(t, grid[nr][nc]), nr, nc))
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

fn swim_in_water(grid: Vec<Vec<i32>>) -> i32 {
    let n = grid.len();
    let mut visited = vec![vec![false; n]; n];
    let mut heap = BinaryHeap::new();
    heap.push(Reverse((grid[0][0], 0usize, 0usize)));
    visited[0][0] = true;
    let dirs = [(0i32, 1i32), (0, -1), (1, 0), (-1, 0)];
    while let Some(Reverse((t, r, c))) = heap.pop() {
        if r == n - 1 && c == n - 1 { return t; }
        for (dr, dc) in dirs {
            let nr = r as i32 + dr;
            let nc = c as i32 + dc;
            if nr >= 0 && nc >= 0 {
                let (nr, nc) = (nr as usize, nc as usize);
                if nr < n && nc < n && !visited[nr][nc] {
                    visited[nr][nc] = true;
                    heap.push(Reverse((t.max(grid[nr][nc]), nr, nc)));
                }
            }
        }
    }
    -1
}
```

```go
import "container/heap"

type swimItem struct{ t, r, c int }
type swimHeap []swimItem
func (h swimHeap) Len() int            { return len(h) }
func (h swimHeap) Less(i, j int) bool { return h[i].t < h[j].t }
func (h swimHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *swimHeap) Push(x interface{}) { *h = append(*h, x.(swimItem)) }
func (h *swimHeap) Pop() interface{} {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

func swimInWater(grid [][]int) int {
    n := len(grid)
    visited := make([][]bool, n)
    for i := range visited { visited[i] = make([]bool, n) }
    visited[0][0] = true
    h := &swimHeap{{grid[0][0], 0, 0}}
    heap.Init(h)
    dirs := [][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}}
    for h.Len() > 0 {
        cur := heap.Pop(h).(swimItem)
        if cur.r == n-1 && cur.c == n-1 { return cur.t }
        for _, d := range dirs {
            nr, nc := cur.r+d[0], cur.c+d[1]
            if nr >= 0 && nc >= 0 && nr < n && nc < n && !visited[nr][nc] {
                visited[nr][nc] = true
                t := cur.t
                if grid[nr][nc] > t { t = grid[nr][nc] }
                heap.Push(h, swimItem{t, nr, nc})
            }
        }
    }
    return -1
}
```

```cpp
#include <vector>
#include <queue>
#include <algorithm>

int swimInWater(std::vector<std::vector<int>>& grid) {
    int n = (int)grid.size();
    std::vector<std::vector<bool>> visited(n, std::vector<bool>(n, false));
    using T3 = std::tuple<int,int,int>;
    std::priority_queue<T3, std::vector<T3>, std::greater<T3>> heap;
    heap.push({grid[0][0], 0, 0});
    visited[0][0] = true;
    int dirs[4][2] = {{0,1},{0,-1},{1,0},{-1,0}};
    while (!heap.empty()) {
        auto [t, r, c] = heap.top(); heap.pop();
        if (r == n-1 && c == n-1) return t;
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nc >= 0 && nr < n && nc < n && !visited[nr][nc]) {
                visited[nr][nc] = true;
                heap.push({std::max(t, grid[nr][nc]), nr, nc});
            }
        }
    }
    return -1;
}
```

### 100. Alien Dictionary

#### Problem
Given a sorted list of words in an alien language, determine the character ordering of the alien alphabet. Return any valid ordering, or `""` if no valid ordering exists (i.e., the input is contradictory).

#### Pattern
**Topological sort (DFS cycle detection).** **O(C)** time and space, where `C` is the total number of characters across all words.

#### Explanation
Adjacent words in the sorted list reveal ordering constraints: the first position where they differ tells us `word1[j]` comes before `word2[j]` in the alien alphabet. We build a directed graph of these constraints. A valid alphabet is a topological ordering of that graph; a cycle means no valid ordering exists. The DFS uses a three-state visited map: unseen, `True` (currently in DFS stack — cycle if revisited), and `False` (fully processed). The edge case where a longer word precedes a prefix of itself (e.g., `["abc", "ab"]`) is invalid — we detect and return `""` immediately.

#### Solution

```python
def alienOrder(words):
    adj = {c: set() for w in words for c in w}
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        min_len = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
            return ""
        for j in range(min_len):
            if w1[j] != w2[j]:
                adj[w1[j]].add(w2[j])
                break
    visited = {}
    res = []

    def dfs(c):
        if c in visited:
            return visited[c]
        visited[c] = True
        for nb in adj[c]:
            if dfs(nb):
                return True
        visited[c] = False
        res.append(c)
        return False

    for c in adj:
        if dfs(c):
            return ""
    return "".join(res[::-1])
```

```rust
use std::collections::{HashMap, HashSet};

fn alien_order(words: Vec<String>) -> String {
    let mut adj: HashMap<char, HashSet<char>> = HashMap::new();
    for w in &words {
        for c in w.chars() {
            adj.entry(c).or_default();
        }
    }
    for i in 0..words.len() - 1 {
        let (w1, w2): (Vec<char>, Vec<char>) = (words[i].chars().collect(), words[i+1].chars().collect());
        let min_len = w1.len().min(w2.len());
        if w1.len() > w2.len() && w1[..min_len] == w2[..min_len] {
            return String::new();
        }
        for j in 0..min_len {
            if w1[j] != w2[j] {
                adj.entry(w1[j]).or_default().insert(w2[j]);
                break;
            }
        }
    }
    // 0=unseen, 1=in-stack, 2=done
    let mut state: HashMap<char, u8> = HashMap::new();
    let mut res: Vec<char> = Vec::new();

    fn dfs(c: char, adj: &HashMap<char, HashSet<char>>, state: &mut HashMap<char, u8>, res: &mut Vec<char>) -> bool {
        match state.get(&c) {
            Some(&1) => return true,
            Some(&2) => return false,
            _ => {}
        }
        state.insert(c, 1);
        let neighbors: Vec<char> = adj[&c].iter().cloned().collect();
        for nb in neighbors {
            if dfs(nb, adj, state, res) { return true; }
        }
        state.insert(c, 2);
        res.push(c);
        false
    }

    let chars: Vec<char> = adj.keys().cloned().collect();
    for c in chars {
        if dfs(c, &adj, &mut state, &mut res) {
            return String::new();
        }
    }
    res.iter().rev().collect()
}
```

```go
func alienOrder(words []string) string {
    adj := map[byte]map[byte]bool{}
    for _, w := range words {
        for i := 0; i < len(w); i++ {
            if _, ok := adj[w[i]]; !ok {
                adj[w[i]] = map[byte]bool{}
            }
        }
    }
    for i := 0; i < len(words)-1; i++ {
        w1, w2 := words[i], words[i+1]
        minLen := len(w1)
        if len(w2) < minLen { minLen = len(w2) }
        if len(w1) > len(w2) && w1[:minLen] == w2[:minLen] { return "" }
        for j := 0; j < minLen; j++ {
            if w1[j] != w2[j] {
                adj[w1[j]][w2[j]] = true
                break
            }
        }
    }
    // 0=unseen, 1=in-stack, 2=done
    state := map[byte]int{}
    var res []byte
    var dfs func(byte) bool
    dfs = func(c byte) bool {
        if v, ok := state[c]; ok {
            return v == 1
        }
        state[c] = 1
        for nb := range adj[c] {
            if dfs(nb) { return true }
        }
        state[c] = 2
        res = append(res, c)
        return false
    }
    for c := range adj {
        if dfs(c) { return "" }
    }
    for i, j := 0, len(res)-1; i < j; i, j = i+1, j-1 { res[i], res[j] = res[j], res[i] }
    return string(res)
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <functional>

std::string alienOrder(std::vector<std::string>& words) {
    std::unordered_map<char, std::unordered_set<char>> adj;
    for (auto& w : words)
        for (char c : w) adj[c];
    for (int i = 0; i + 1 < (int)words.size(); ++i) {
        auto& w1 = words[i]; auto& w2 = words[i+1];
        int minLen = std::min(w1.size(), w2.size());
        if (w1.size() > w2.size() && w1.substr(0, minLen) == w2.substr(0, minLen))
            return "";
        for (int j = 0; j < minLen; ++j) {
            if (w1[j] != w2[j]) { adj[w1[j]].insert(w2[j]); break; }
        }
    }
    std::unordered_map<char, int> state; // 0=unseen,1=stack,2=done
    std::string res;
    std::function<bool(char)> dfs = [&](char c) -> bool {
        auto it = state.find(c);
        if (it != state.end()) return it->second == 1;
        state[c] = 1;
        for (char nb : adj[c]) if (dfs(nb)) return true;
        state[c] = 2;
        res += c;
        return false;
    };
    for (auto& [c, _] : adj)
        if (dfs(c)) return "";
    std::reverse(res.begin(), res.end());
    return res;
}
```

### 101. Cheapest Flights Within K Stops

#### Problem
Given `n` cities, a list of directed flights `[from, to, price]`, a source `src`, destination `dst`, and an integer `k`, find the cheapest price from `src` to `dst` with at most `k` stops (i.e. at most `k+1` edges).

#### Pattern
**Bellman-Ford with stop limit.** **O(k * E)** time, **O(n)** space.

#### Explanation
Standard Dijkstra can't enforce a stop limit because it may greedily settle a node via a long path before trying a shorter-hop one. Bellman-Ford relaxes edges in `k+1` rounds, where each round represents one more edge (flight) used. Crucially we copy `prices` into `tmp` before each round so a single relaxation round only uses distances computed from the previous round — preventing multi-hop chaining within one iteration. After `k+1` rounds, `prices[dst]` holds the cheapest cost reachable in at most `k+1` edges, or infinity if unreachable.

#### Solution

```python
def findCheapestPrice(n, flights, src, dst, k):
    prices = [float('inf')] * n
    prices[src] = 0
    for _ in range(k + 1):
        tmp = prices[:]
        for u, v, w in flights:
            if prices[u] != float('inf') and prices[u] + w < tmp[v]:
                tmp[v] = prices[u] + w
        prices = tmp
    return prices[dst] if prices[dst] != float('inf') else -1
```

```rust
fn find_cheapest_price(n: i32, flights: Vec<Vec<i32>>, src: i32, dst: i32, k: i32) -> i32 {
    let n = n as usize;
    const INF: i64 = i64::MAX / 2;
    let mut prices = vec![INF; n];
    prices[src as usize] = 0;
    for _ in 0..=k {
        let mut tmp = prices.clone();
        for f in &flights {
            let (u, v, w) = (f[0] as usize, f[1] as usize, f[2] as i64);
            if prices[u] < INF && prices[u] + w < tmp[v] {
                tmp[v] = prices[u] + w;
            }
        }
        prices = tmp;
    }
    if prices[dst as usize] == INF { -1 } else { prices[dst as usize] as i32 }
}
```

```go
func findCheapestPrice(n int, flights [][]int, src int, dst int, k int) int {
    const inf = 1<<31 - 1
    prices := make([]int, n)
    for i := range prices { prices[i] = inf }
    prices[src] = 0
    for i := 0; i <= k; i++ {
        tmp := append([]int(nil), prices...)
        for _, f := range flights {
            u, v, w := f[0], f[1], f[2]
            if prices[u] != inf && prices[u]+w < tmp[v] {
                tmp[v] = prices[u] + w
            }
        }
        prices = tmp
    }
    if prices[dst] == inf { return -1 }
    return prices[dst]
}
```

```cpp
#include <vector>
#include <climits>
#include <algorithm>

int findCheapestPrice(int n, std::vector<std::vector<int>>& flights, int src, int dst, int k) {
    const int INF = INT_MAX / 2;
    std::vector<int> prices(n, INF);
    prices[src] = 0;
    for (int i = 0; i <= k; ++i) {
        std::vector<int> tmp = prices;
        for (auto& f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (prices[u] < INF && prices[u] + w < tmp[v])
                tmp[v] = prices[u] + w;
        }
        prices = tmp;
    }
    return prices[dst] == INF ? -1 : prices[dst];
}
```

### 102. Climbing Stairs

#### Problem
You can climb `1` or `2` steps at a time. Count the number of distinct ways to reach the top of a staircase with `n` steps.

#### Pattern
**DP (Fibonacci recurrence).** **O(n)** time, **O(1)** space.

#### Explanation
Let `f(n)` = number of ways to reach step `n`. From step `n`, you arrived from either step `n-1` (one step) or step `n-2` (two steps), so `f(n) = f(n-1) + f(n-2)` — exactly the Fibonacci recurrence. Base cases: `f(1) = 1`, `f(2) = 2`. We only ever need the previous two values, so rolling variables `a` and `b` give O(1) space. A naive recursive approach without memoization re-computes subproblems exponentially; even top-down memo uses O(n) space unnecessarily.

#### Solution

```python
def climbStairs(n):
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b
```

```rust
fn climb_stairs(n: i32) -> i32 {
    let (mut a, mut b) = (1i32, 1i32);
    for _ in 1..n {
        let c = a + b;
        a = b;
        b = c;
    }
    b
}
```

```go
func climbStairs(n int) int {
    a, b := 1, 1
    for i := 1; i < n; i++ {
        a, b = b, a+b
    }
    return b
}
```

```cpp
int climbStairs(int n) {
    int a = 1, b = 1;
    for (int i = 1; i < n; ++i) {
        int c = a + b;
        a = b;
        b = c;
    }
    return b;
}
```

### 103. Min Cost Climbing Stairs

#### Problem
Given an array `cost` where `cost[i]` is the cost of stepping on stair `i`, find the minimum total cost to reach the top (beyond the last index). You can start from index `0` or `1` and can take `1` or `2` steps.

#### Pattern
**DP (bottom-up, in-place).** **O(n)** time, **O(1)** space.

#### Explanation
`cost[i]` represents the cost to leave stair `i`. We build up the minimum cost to reach each stair in place: `cost[i] += min(cost[i-1], cost[i-2])`. This makes `cost[i]` the total minimum cost to step on and leave stair `i`. The "top" is one step beyond the last stair, so it's reachable from either the last or second-to-last stair — we return `min(cost[-1], cost[-2])`. Modifying the input array gives O(1) space; if we can't mutate input, two rolling variables suffice.

#### Solution

```python
def minCostClimbingStairs(cost):
    for i in range(2, len(cost)):
        cost[i] += min(cost[i - 1], cost[i - 2])
    return min(cost[-1], cost[-2])
```

```rust
fn min_cost_climbing_stairs(cost: Vec<i32>) -> i32 {
    let mut cost = cost;
    for i in 2..cost.len() {
        cost[i] += cost[i - 1].min(cost[i - 2]);
    }
    let n = cost.len();
    cost[n - 1].min(cost[n - 2])
}
```

```go
func minCostClimbingStairs(cost []int) int {
    for i := 2; i < len(cost); i++ {
        if cost[i-1] < cost[i-2] {
            cost[i] += cost[i-1]
        } else {
            cost[i] += cost[i-2]
        }
    }
    n := len(cost)
    if cost[n-1] < cost[n-2] {
        return cost[n-1]
    }
    return cost[n-2]
}
```

```cpp
#include <vector>
#include <algorithm>

int minCostClimbingStairs(std::vector<int>& cost) {
    int n = (int)cost.size();
    for (int i = 2; i < n; ++i)
        cost[i] += std::min(cost[i-1], cost[i-2]);
    return std::min(cost[n-1], cost[n-2]);
}
```

### 104. House Robber

#### Problem
Given an array of non-negative integers representing money in each house, return the maximum amount you can rob without robbing two adjacent houses.

#### Pattern
**DP (rolling variables).** **O(n)** time, **O(1)** space.

#### Explanation
At each house `i` there are two choices: skip it (best profit stays `curr`) or rob it (profit becomes `prev + nums[i]`, where `prev` is the best from two houses ago). The recurrence is `new_curr = max(curr, prev + nums[i])`. Only the two previous values are needed, so we maintain `prev` and `curr` as rolling scalars rather than a full DP array. A greedy approach (always rob the richer of adjacent houses) fails on inputs like `[2, 1, 1, 2]` where skipping two houses is optimal.

#### Solution

```python
def rob(nums):
    prev, curr = 0, 0
    for n in nums:
        prev, curr = curr, max(curr, prev + n)
    return curr
```

```rust
fn rob(nums: Vec<i32>) -> i32 {
    let (mut prev, mut curr) = (0i32, 0i32);
    for n in nums {
        let next = curr.max(prev + n);
        prev = curr;
        curr = next;
    }
    curr
}
```

```go
func rob(nums []int) int {
    prev, curr := 0, 0
    for _, n := range nums {
        next := curr
        if prev+n > next {
            next = prev + n
        }
        prev = curr
        curr = next
    }
    return curr
}
```

```cpp
#include <vector>
#include <algorithm>

int rob(std::vector<int>& nums) {
    int prev = 0, curr = 0;
    for (int n : nums) {
        int next = std::max(curr, prev + n);
        prev = curr;
        curr = next;
    }
    return curr;
}
```

### 105. House Robber II

#### Problem
Houses are arranged in a circle so the first and last are adjacent. Return the maximum amount you can rob without robbing two adjacent houses.

#### Pattern
**DP on two linear subproblems (skip first or last).** **O(n)** time, **O(1)** space.

#### Explanation
The circular constraint means you can't take both `nums[0]` and `nums[n-1]`. We handle this by splitting into two independent linear House Robber problems: one over `nums[1:]` (exclude first) and one over `nums[:-1]` (exclude last). Each subproblem is the standard linear rob with rolling variables. Taking the maximum of those two answers covers all valid cases. We also consider taking just `nums[0]` alone for the edge case where `n == 1`. This clean decomposition avoids any bespoke circular logic.

#### Solution

```python
def rob(nums):
    def rob_line(houses):
        prev, curr = 0, 0
        for n in houses:
            prev, curr = curr, max(curr, prev + n)
        return curr
    return max(nums[0], rob_line(nums[1:]), rob_line(nums[:-1]))
```

```rust
fn rob2(nums: Vec<i32>) -> i32 {
    fn rob_line(houses: &[i32]) -> i32 {
        let (mut prev, mut curr) = (0i32, 0i32);
        for &n in houses {
            let next = curr.max(prev + n);
            prev = curr;
            curr = next;
        }
        curr
    }
    let n = nums.len();
    if n == 1 { return nums[0]; }
    nums[0].max(rob_line(&nums[1..]).max(rob_line(&nums[..n-1])))
}
```

```go
func rob2(nums []int) int {
    robLine := func(houses []int) int {
        prev, curr := 0, 0
        for _, n := range houses {
            next := curr
            if prev+n > next { next = prev + n }
            prev, curr = curr, next
        }
        return curr
    }
    n := len(nums)
    if n == 1 { return nums[0] }
    a, b := robLine(nums[1:]), robLine(nums[:n-1])
    if nums[0] > a { a = nums[0] }
    if b > a { a = b }
    return a
}
```

```cpp
#include <vector>
#include <algorithm>

int rob2(std::vector<int>& nums) {
    auto rob_line = [](std::vector<int>::iterator begin, std::vector<int>::iterator end) {
        int prev = 0, curr = 0;
        for (auto it = begin; it != end; ++it) {
            int next = std::max(curr, prev + *it);
            prev = curr;
            curr = next;
        }
        return curr;
    };
    int n = (int)nums.size();
    if (n == 1) return nums[0];
    return std::max({nums[0],
                     rob_line(nums.begin() + 1, nums.end()),
                     rob_line(nums.begin(), nums.end() - 1)});
}
```

### 106. Palindromic Substrings

#### Problem
Given a string `s`, return the number of substrings that are palindromes (single characters count).

#### Pattern
**Expand Around Center.** **O(n²)** time, **O(1)** space.

#### Explanation
Every palindrome has a center: a single character (odd length) or the gap between two characters (even length). There are `2n - 1` possible centers. For each center, expand outward while the characters match, incrementing the count at each successful expansion. This is simpler and more space-efficient than Manacher's `O(n)` algorithm, which is rarely needed in interviews. A DP table approach also works but uses `O(n²)` space and gives no speed advantage over this approach. The key insight: palindromes are self-similar around their center, so expansion naturally enumerates all of them.

#### Solution

```python
def countSubstrings(s):
    count = 0
    for i in range(len(s)):
        for l, r in [(i, i), (i, i + 1)]:
            while l >= 0 and r < len(s) and s[l] == s[r]:
                count += 1
                l -= 1
                r += 1
    return count
```

```rust
fn count_substrings(s: String) -> i32 {
    let b = s.as_bytes();
    let n = b.len();
    let mut count = 0i32;
    for i in 0..n {
        // odd
        let (mut l, mut r) = (i as i32, i as i32);
        while l >= 0 && r < n as i32 && b[l as usize] == b[r as usize] {
            count += 1;
            l -= 1; r += 1;
        }
        // even
        let (mut l, mut r) = (i as i32, i as i32 + 1);
        while l >= 0 && r < n as i32 && b[l as usize] == b[r as usize] {
            count += 1;
            l -= 1; r += 1;
        }
    }
    count
}
```

```go
func countSubstrings(s string) int {
    count := 0
    n := len(s)
    expand := func(l, r int) {
        for l >= 0 && r < n && s[l] == s[r] {
            count++
            l--
            r++
        }
    }
    for i := 0; i < n; i++ {
        expand(i, i)
        expand(i, i+1)
    }
    return count
}
```

```cpp
#include <string>

int countSubstrings(std::string& s) {
    int n = (int)s.size(), count = 0;
    auto expand = [&](int l, int r) {
        while (l >= 0 && r < n && s[l] == s[r]) {
            ++count; --l; ++r;
        }
    };
    for (int i = 0; i < n; ++i) {
        expand(i, i);
        expand(i, i + 1);
    }
    return count;
}
```

### 107. Decode Ways

#### Problem
A string of digits can be decoded where `'1'→'A'`, `'2'→'B'`, ..., `'26'→'Z'`. Count the number of ways to decode a non-empty digit string `s`.

#### Pattern
**DP (top-down memoization).** **O(n)** time, **O(n)** space.

#### Explanation
At each position `i` we have two choices: decode `s[i]` as a single digit (valid as long as `s[i] != '0'`) or decode `s[i:i+2]` as a two-digit number (valid when `10 <= val <= 26`). `'0'` can never stand alone, which is the critical edge case — a leading `'0'` at any position yields zero decodings from that point. We memoize `dfs(i)` to avoid exponential recomputation; the call tree branches only when both single and double decodes are valid. The base case `dp[len(s)] = 1` represents the empty suffix having exactly one decoding (the empty string).

#### Solution

```python
def numDecodings(s):
    dp = {len(s): 1}

    def dfs(i):
        if i in dp:
            return dp[i]
        if s[i] == "0":
            return 0
        res = dfs(i + 1)
        if i + 1 < len(s) and int(s[i:i+2]) <= 26:
            res += dfs(i + 2)
        dp[i] = res
        return res

    return dfs(0)
```

```rust
fn num_decodings(s: String) -> i32 {
    let b = s.as_bytes();
    let n = b.len();
    let mut dp = vec![0i32; n + 1];
    dp[n] = 1;
    for i in (0..n).rev() {
        if b[i] == b'0' { continue; }
        dp[i] = dp[i + 1];
        if i + 1 < n {
            let two = (b[i] - b'0') as i32 * 10 + (b[i+1] - b'0') as i32;
            if two <= 26 { dp[i] += dp[i + 2]; }
        }
    }
    dp[0]
}
```

```go
func numDecodings(s string) int {
    n := len(s)
    dp := make([]int, n+1)
    dp[n] = 1
    for i := n - 1; i >= 0; i-- {
        if s[i] == '0' { continue }
        dp[i] = dp[i+1]
        if i+1 < n {
            two := int(s[i]-'0')*10 + int(s[i+1]-'0')
            if two <= 26 { dp[i] += dp[i+2] }
        }
    }
    return dp[0]
}
```

```cpp
#include <string>
#include <vector>

int numDecodings(std::string& s) {
    int n = (int)s.size();
    std::vector<int> dp(n + 1, 0);
    dp[n] = 1;
    for (int i = n - 1; i >= 0; --i) {
        if (s[i] == '0') continue;
        dp[i] = dp[i + 1];
        if (i + 1 < n) {
            int two = (s[i] - '0') * 10 + (s[i+1] - '0');
            if (two <= 26) dp[i] += dp[i + 2];
        }
    }
    return dp[0];
}
```

### 108. Coin Change

#### Problem
Given an array of coin denominations and a target `amount`, return the minimum number of coins needed to make up that amount, or `-1` if it's impossible.

#### Pattern
**DP (bottom-up unbounded knapsack).** **O(n * amount)** time, **O(amount)** space.

#### Explanation
This is the classic unbounded knapsack variant — each coin can be used any number of times. We build `dp[a]` = fewest coins to make amount `a`. The base case is `dp[0] = 0`; everything else starts at infinity. For each amount from `1` to `amount`, we try every coin: if `a - c >= 0` and `dp[a - c]` is reachable, we can reach `a` in one more coin. A greedy (always use the largest coin) fails for denominations like `[1, 3, 4]` with amount `6`, where `3+3` beats `4+1+1`. Bottom-up avoids recursive overhead and naturally builds all subproblems before they're needed.

#### Solution

```python
def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if a - c >= 0:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

```rust
fn coin_change(coins: Vec<i32>, amount: i32) -> i32 {
    let amount = amount as usize;
    let mut dp = vec![i32::MAX; amount + 1];
    dp[0] = 0;
    for a in 1..=amount {
        for &c in &coins {
            let c = c as usize;
            if c <= a && dp[a - c] != i32::MAX {
                dp[a] = dp[a].min(dp[a - c] + 1);
            }
        }
    }
    if dp[amount] == i32::MAX { -1 } else { dp[amount] }
}
```

```go
func coinChange(coins []int, amount int) int {
    const inf = 1<<31 - 1
    dp := make([]int, amount+1)
    for i := range dp { dp[i] = inf }
    dp[0] = 0
    for a := 1; a <= amount; a++ {
        for _, c := range coins {
            if c <= a && dp[a-c] != inf && dp[a-c]+1 < dp[a] {
                dp[a] = dp[a-c] + 1
            }
        }
    }
    if dp[amount] == inf { return -1 }
    return dp[amount]
}
```

```cpp
#include <vector>
#include <algorithm>
#include <climits>

int coinChange(std::vector<int>& coins, int amount) {
    std::vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int a = 1; a <= amount; ++a) {
        for (int c : coins) {
            if (c <= a && dp[a - c] != INT_MAX)
                dp[a] = std::min(dp[a], dp[a - c] + 1);
        }
    }
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}
```

### 109. Maximum Product Subarray

#### Problem
Given an integer array `nums`, find the contiguous subarray with the largest product and return that product.

#### Pattern
**DP (track running min and max).** **O(n)** time, **O(1)** space.

#### Explanation
Unlike Maximum Subarray (where negatives just reset), products can flip sign: multiplying a very negative `curMin` by a negative number can suddenly produce the largest value. So we track both `curMax` and `curMin` simultaneously. At each element we consider three candidates: start fresh with just `n`, extend the current max subarray, or extend the current min subarray (in case `n` is negative). We reset both to `1` when `n == 0` since a zero breaks any ongoing product. The answer is the running maximum of all `curMax` values. Initializing `res = max(nums)` handles single-element arrays correctly.

#### Solution

```python
def maxProduct(nums):
    res = max(nums)
    cur_min = cur_max = 1
    for n in nums:
        if n == 0:
            cur_min = cur_max = 1
            continue
        tmp = cur_max * n
        cur_max = max(n, cur_max * n, cur_min * n)
        cur_min = min(n, tmp, cur_min * n)
        res = max(res, cur_max)
    return res
```

```rust
fn max_product(nums: Vec<i32>) -> i32 {
    let mut res = *nums.iter().max().unwrap();
    let (mut cur_min, mut cur_max) = (1i32, 1i32);
    for n in nums {
        if n == 0 {
            cur_min = 1; cur_max = 1;
            continue;
        }
        let tmp = cur_max * n;
        cur_max = n.max(cur_max * n).max(cur_min * n);
        cur_min = n.min(tmp).min(cur_min * n);
        res = res.max(cur_max);
    }
    res
}
```

```go
func maxProduct(nums []int) int {
    res := nums[0]
    for _, n := range nums[1:] {
        if n > res { res = n }
    }
    curMin, curMax := 1, 1
    for _, n := range nums {
        if n == 0 {
            curMin, curMax = 1, 1
            continue
        }
        tmp := curMax * n
        curMax = max3(n, curMax*n, curMin*n)
        curMin = min3(n, tmp, curMin*n)
        if curMax > res { res = curMax }
    }
    return res
}
func max3(a, b, c int) int {
    if a < b { a = b }
    if a < c { a = c }
    return a
}
func min3(a, b, c int) int {
    if a > b { a = b }
    if a > c { a = c }
    return a
}
```

```cpp
#include <vector>
#include <algorithm>

int maxProduct(std::vector<int>& nums) {
    int res = *std::max_element(nums.begin(), nums.end());
    int cur_min = 1, cur_max = 1;
    for (int n : nums) {
        if (n == 0) { cur_min = cur_max = 1; continue; }
        int tmp = cur_max * n;
        cur_max = std::max({n, cur_max * n, cur_min * n});
        cur_min = std::min({n, tmp, cur_min * n});
        res = std::max(res, cur_max);
    }
    return res;
}
```

### 110. Word Break

#### Problem
Given a string `s` and a dictionary `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.

#### Pattern
**DP (bottom-up, right-to-left).** **O(n² * m)** time, **O(n)** space, where `m` is average word length.

#### Explanation
`dp[i]` means the suffix `s[i:]` can be fully segmented. The base case `dp[n] = True` represents the empty suffix. For each position `i` from right to left, we try every word `w` in the dictionary: if `s[i:i+len(w)] == w` and `dp[i + len(w)]` is true, then `dp[i]` is true and we can break early. A recursive approach without memoization leads to exponential recomputation; converting to a trie can improve inner loop efficiency but adds complexity. The key edge case: words can overlap in unexpected ways, but the DP naturally handles all combinations.

#### Solution

```python
def wordBreak(s, wordDict):
    dp = [False] * (len(s) + 1)
    dp[len(s)] = True
    for i in range(len(s) - 1, -1, -1):
        for w in wordDict:
            if s[i:i + len(w)] == w:
                dp[i] = dp[i + len(w)]
            if dp[i]:
                break
    return dp[0]
```

```rust
fn word_break(s: String, word_dict: Vec<String>) -> bool {
    let n = s.len();
    let mut dp = vec![false; n + 1];
    dp[n] = true;
    let sb = s.as_bytes();
    for i in (0..n).rev() {
        for w in &word_dict {
            let wn = w.len();
            if i + wn <= n && &sb[i..i+wn] == w.as_bytes() && dp[i + wn] {
                dp[i] = true;
                break;
            }
        }
    }
    dp[0]
}
```

```go
func wordBreak(s string, wordDict []string) bool {
    n := len(s)
    dp := make([]bool, n+1)
    dp[n] = true
    for i := n - 1; i >= 0; i-- {
        for _, w := range wordDict {
            wn := len(w)
            if i+wn <= n && s[i:i+wn] == w && dp[i+wn] {
                dp[i] = true
                break
            }
        }
    }
    return dp[0]
}
```

```cpp
#include <vector>
#include <string>

bool wordBreak(std::string& s, std::vector<std::string>& wordDict) {
    int n = (int)s.size();
    std::vector<bool> dp(n + 1, false);
    dp[n] = true;
    for (int i = n - 1; i >= 0; --i) {
        for (auto& w : wordDict) {
            int wn = (int)w.size();
            if (i + wn <= n && s.substr(i, wn) == w && dp[i + wn]) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[0];
}
```

### 111. Longest Increasing Subsequence

#### Problem
Given an integer array `nums`, return the length of the longest strictly increasing subsequence.

#### Pattern
**Binary search (patience sorting).** **O(n log n)** time, **O(n)** space.

#### Explanation
The `O(n²)` DP approach maintains `dp[i]` = length of LIS ending at index `i`, which is correct but slow. The faster approach maintains a `tails` array where `tails[k]` is the smallest tail value of all increasing subsequences of length `k+1`. For each number `n`, we binary search `tails` for the leftmost position where `tails[pos] >= n` and replace it with `n`. If `n` is larger than everything in `tails`, we append it. The length of `tails` at the end is the LIS length. Note: `tails` does not itself represent an actual LIS (elements might not form a valid subsequence), but its length is always correct.

#### Solution

```python
import bisect

def lengthOfLIS(nums):
    tails = []
    for n in nums:
        pos = bisect.bisect_left(tails, n)
        if pos == len(tails):
            tails.append(n)
        else:
            tails[pos] = n
    return len(tails)
```

```rust
fn length_of_lis(nums: Vec<i32>) -> i32 {
    let mut tails: Vec<i32> = Vec::new();
    for n in nums {
        let pos = tails.partition_point(|&x| x < n);
        if pos == tails.len() {
            tails.push(n);
        } else {
            tails[pos] = n;
        }
    }
    tails.len() as i32
}
```

```go
import "sort"

func lengthOfLIS(nums []int) int {
    tails := []int{}
    for _, n := range nums {
        pos := sort.SearchInts(tails, n)
        if pos == len(tails) {
            tails = append(tails, n)
        } else {
            tails[pos] = n
        }
    }
    return len(tails)
}
```

```cpp
#include <vector>
#include <algorithm>

int lengthOfLIS(std::vector<int>& nums) {
    std::vector<int> tails;
    for (int n : nums) {
        auto it = std::lower_bound(tails.begin(), tails.end(), n);
        if (it == tails.end()) tails.push_back(n);
        else *it = n;
    }
    return (int)tails.size();
}
```

### 112. Partition Equal Subset Sum

#### Problem
Given an integer array `nums`, determine whether it can be partitioned into two subsets with equal sum.

#### Pattern
**DP (0/1 knapsack, set of reachable sums).** **O(n * sum)** time, **O(sum)** space.

#### Explanation
If the total sum is odd, partitioning is impossible — return early. Otherwise, the question becomes: can any subset sum to `total / 2`? We maintain a set `dp` of all subset sums reachable so far. For each number `n`, we extend every existing reachable sum by adding `n`. This is the 0/1 knapsack: each element is used at most once, so we build the new set from the old one without in-place mutation. An optimized approach uses a bitset (shift and OR), giving the same asymptotic complexity with much better constants; the set version is clearer to reason about in interviews.

#### Solution

```python
def canPartition(nums):
    if sum(nums) % 2:
        return False
    target = sum(nums) // 2
    dp = {0}
    for n in nums:
        dp = {s + n for s in dp} | dp
    return target in dp
```

```rust
fn can_partition(nums: Vec<i32>) -> bool {
    let total: i32 = nums.iter().sum();
    if total % 2 != 0 { return false; }
    let target = (total / 2) as usize;
    let mut dp = vec![false; target + 1];
    dp[0] = true;
    for n in nums {
        let n = n as usize;
        for s in (n..=target).rev() {
            if dp[s - n] { dp[s] = true; }
        }
    }
    dp[target]
}
```

```go
func canPartition(nums []int) bool {
    total := 0
    for _, n := range nums { total += n }
    if total%2 != 0 { return false }
    target := total / 2
    dp := make([]bool, target+1)
    dp[0] = true
    for _, n := range nums {
        for s := target; s >= n; s-- {
            if dp[s-n] { dp[s] = true }
        }
    }
    return dp[target]
}
```

```cpp
#include <vector>
#include <numeric>

bool canPartition(std::vector<int>& nums) {
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    if (total % 2) return false;
    int target = total / 2;
    std::vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int n : nums) {
        for (int s = target; s >= n; --s) {
            if (dp[s - n]) dp[s] = true;
        }
    }
    return dp[target];
}
```

### 113. Unique Paths

#### Problem
A robot starts at the top-left of an `m x n` grid and can only move right or down. Count the number of unique paths to the bottom-right corner.

#### Pattern
**DP (1-D rolling row).** **O(m * n)** time, **O(n)** space.

#### Explanation
`dp[j]` represents the number of ways to reach column `j` in the current row. Initially every cell in the first row has exactly one path (only rightward moves). For each subsequent row, the value at column `j` equals the number of paths from above (`dp[j]`, unchanged) plus paths from the left (`dp[j-1]`, just updated). We update left-to-right in-place, so each update correctly uses the freshly computed left value. The mathematically closed form `C(m+n-2, m-1)` computes the answer in O(min(m,n)) but requires careful handling of large intermediate values; the DP is simpler to verify.

#### Solution

```python
def uniquePaths(m, n):
    dp = [1] * n
    for _ in range(m - 1):
        for j in range(1, n):
            dp[j] += dp[j - 1]
    return dp[-1]
```

```rust
fn unique_paths(m: i32, n: i32) -> i32 {
    let (m, n) = (m as usize, n as usize);
    let mut dp = vec![1i32; n];
    for _ in 1..m {
        for j in 1..n {
            dp[j] += dp[j - 1];
        }
    }
    dp[n - 1]
}
```

```go
func uniquePaths(m int, n int) int {
    dp := make([]int, n)
    for i := range dp { dp[i] = 1 }
    for i := 1; i < m; i++ {
        for j := 1; j < n; j++ {
            dp[j] += dp[j-1]
        }
    }
    return dp[n-1]
}
```

```cpp
#include <vector>

int uniquePaths(int m, int n) {
    std::vector<int> dp(n, 1);
    for (int i = 1; i < m; ++i)
        for (int j = 1; j < n; ++j)
            dp[j] += dp[j - 1];
    return dp[n - 1];
}
```

### 114. Longest Common Subsequence

#### Problem
Given two strings `text1` and `text2`, return the length of their longest common subsequence. A subsequence does not need to be contiguous.

#### Pattern
**2-D DP.** **O(m * n)** time, **O(m * n)** space.

#### Explanation
`dp[i][j]` = length of the LCS of `text1[i:]` and `text2[j:]`. We fill it bottom-up from the ends. When characters match, `dp[i][j] = 1 + dp[i+1][j+1]` — we consume both. When they differ, we skip one character from either string and take the better result: `dp[i][j] = max(dp[i+1][j], dp[i][j+1])`. This two-choice structure is the hallmark of subsequence DP. Space can be reduced to O(n) by keeping only two rows at a time, but the full table is easier to reason about and reconstruct the actual sequence if needed.

#### Solution

```python
def longestCommonSubsequence(text1, text2):
    dp = [[0] * (len(text2) + 1) for _ in range(len(text1) + 1)]
    for i in range(len(text1) - 1, -1, -1):
        for j in range(len(text2) - 1, -1, -1):
            if text1[i] == text2[j]:
                dp[i][j] = 1 + dp[i + 1][j + 1]
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    return dp[0][0]
```

```rust
fn longest_common_subsequence(text1: String, text2: String) -> i32 {
    let (t1, t2): (Vec<u8>, Vec<u8>) = (text1.bytes().collect(), text2.bytes().collect());
    let (m, n) = (t1.len(), t2.len());
    let mut dp = vec![vec![0i32; n + 1]; m + 1];
    for i in (0..m).rev() {
        for j in (0..n).rev() {
            if t1[i] == t2[j] {
                dp[i][j] = 1 + dp[i + 1][j + 1];
            } else {
                dp[i][j] = dp[i + 1][j].max(dp[i][j + 1]);
            }
        }
    }
    dp[0][0]
}
```

```go
func longestCommonSubsequence(text1 string, text2 string) int {
    m, n := len(text1), len(text2)
    dp := make([][]int, m+1)
    for i := range dp { dp[i] = make([]int, n+1) }
    for i := m - 1; i >= 0; i-- {
        for j := n - 1; j >= 0; j-- {
            if text1[i] == text2[j] {
                dp[i][j] = 1 + dp[i+1][j+1]
            } else if dp[i+1][j] > dp[i][j+1] {
                dp[i][j] = dp[i+1][j]
            } else {
                dp[i][j] = dp[i][j+1]
            }
        }
    }
    return dp[0][0]
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

int longestCommonSubsequence(std::string& text1, std::string& text2) {
    int m = (int)text1.size(), n = (int)text2.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    for (int i = m - 1; i >= 0; --i)
        for (int j = n - 1; j >= 0; --j)
            dp[i][j] = (text1[i] == text2[j])
                      ? 1 + dp[i+1][j+1]
                      : std::max(dp[i+1][j], dp[i][j+1]);
    return dp[0][0];
}
```

### 115. Best Time to Buy and Sell Stock with Cooldown

#### Problem
Given an array of stock prices, maximize profit where after selling you must wait one day (cooldown) before buying again. You may hold at most one share at a time.

#### Pattern
**DP with states (holding, sold, rest).** **O(n)** time, **O(1)** space.

#### Explanation
The state machine has three states: `hold` (currently own a share), `sold` (just sold — must rest tomorrow), and `rest` (in cooldown or idle, can buy). Transitions: from `hold` you can sell → `sold`; from `rest` you can buy → `hold` or stay in `rest`; from `sold` you must go to `rest`. Initialization: `hold = -prices[0]` (paid for first day's share), `sold = 0`, `rest = 0`. Each day these three states update simultaneously using previous-day values, so one pass suffices. The answer is `max(sold, rest)` since we'd never end on a `hold` state.

#### Solution

```python
def maxProfit(prices):
    hold, sold, rest = -prices[0], 0, 0
    for p in prices[1:]:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)
```

```rust
fn max_profit_cooldown(prices: Vec<i32>) -> i32 {
    let (mut hold, mut sold, mut rest) = (-prices[0], 0i32, 0i32);
    for &p in &prices[1..] {
        let (new_hold, new_sold, new_rest) = (
            hold.max(rest - p),
            hold + p,
            rest.max(sold),
        );
        hold = new_hold; sold = new_sold; rest = new_rest;
    }
    sold.max(rest)
}
```

```go
func maxProfitCooldown(prices []int) int {
    hold, sold, rest := -prices[0], 0, 0
    for _, p := range prices[1:] {
        hold, sold, rest = max2(hold, rest-p), hold+p, max2(rest, sold)
    }
    if sold > rest { return sold }
    return rest
}
func max2(a, b int) int {
    if a > b { return a }
    return b
}
```

```cpp
#include <vector>
#include <algorithm>

int maxProfitCooldown(std::vector<int>& prices) {
    int hold = -prices[0], sold = 0, rest = 0;
    for (int i = 1; i < (int)prices.size(); ++i) {
        int nh = std::max(hold, rest - prices[i]);
        int ns = hold + prices[i];
        int nr = std::max(rest, sold);
        hold = nh; sold = ns; rest = nr;
    }
    return std::max(sold, rest);
}
```

### 116. Target Sum

#### Problem
Given an integer array `nums` and an integer `target`, assign `+` or `-` to each number and return the number of ways to make the expression equal `target`.

#### Pattern
**DP (subset sum variant, dict of counts).** **O(n * S)** time, **O(S)** space, where `S` is the range of reachable sums.

#### Explanation
The naive approach explores all `2ⁿ` assignments — exponential. Instead, treat it as a DP over reachable sums: after processing each number, `dp[s]` is the number of ways to reach sum `s`. For each new number `n`, every existing sum `s` spawns two new sums: `s + n` and `s - n`. Using a dictionary avoids fixing array bounds for potentially negative sums. An equivalent algebraic trick lets you rephrase this as a 0/1 knapsack on a subset sum, but the dict-based approach is more intuitive. Edge case: if `target` isn't in `dp` after all numbers, return `0` via `dict.get`.

#### Solution

```python
def findTargetSumWays(nums, target):
    dp = {0: 1}
    for n in nums:
        next_dp = {}
        for s, count in dp.items():
            next_dp[s + n] = next_dp.get(s + n, 0) + count
            next_dp[s - n] = next_dp.get(s - n, 0) + count
        dp = next_dp
    return dp.get(target, 0)
```

```rust
use std::collections::HashMap;

fn find_target_sum_ways(nums: Vec<i32>, target: i32) -> i32 {
    let mut dp: HashMap<i32, i32> = HashMap::new();
    dp.insert(0, 1);
    for n in nums {
        let mut next = HashMap::new();
        for (&s, &cnt) in &dp {
            *next.entry(s + n).or_insert(0) += cnt;
            *next.entry(s - n).or_insert(0) += cnt;
        }
        dp = next;
    }
    *dp.get(&target).unwrap_or(&0)
}
```

```go
func findTargetSumWays(nums []int, target int) int {
    dp := map[int]int{0: 1}
    for _, n := range nums {
        next := map[int]int{}
        for s, cnt := range dp {
            next[s+n] += cnt
            next[s-n] += cnt
        }
        dp = next
    }
    return dp[target]
}
```

```cpp
#include <vector>
#include <unordered_map>

int findTargetSumWays(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> dp{{0, 1}};
    for (int n : nums) {
        std::unordered_map<int, int> next;
        for (auto& [s, cnt] : dp) {
            next[s + n] += cnt;
            next[s - n] += cnt;
        }
        dp = std::move(next);
    }
    auto it = dp.find(target);
    return it != dp.end() ? it->second : 0;
}
```

### 117. Interleaving String

#### Problem
Given strings `s1`, `s2`, and `s3`, determine whether `s3` can be formed by interleaving `s1` and `s2` (preserving the relative order of each).

#### Pattern
**2-D DP.** **O(m * n)** time, **O(m * n)** space.

#### Explanation
`dp[i][j]` = can `s3[i+j:]` be formed by interleaving `s1[i:]` and `s2[j:]`. We fill from bottom-right. Base case: `dp[m][n] = True` (both strings fully consumed). From `(i, j)`, we can advance in `s1` if `s1[i] == s3[i+j]` and `dp[i+1][j]` is true, or advance in `s2` if `s2[j] == s3[i+j]` and `dp[i][j+1]` is true. The length check `len(s1) + len(s2) != len(s3)` is a necessary early exit. Space can be reduced to `O(n)` by rolling a single row, since each row only depends on the row below and the element to its right.

#### Solution

```python
def isInterleave(s1, s2, s3):
    if len(s1) + len(s2) != len(s3):
        return False
    m, n = len(s1), len(s2)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[m][n] = True
    for i in range(m, -1, -1):
        for j in range(n, -1, -1):
            if i < m and s1[i] == s3[i + j] and dp[i + 1][j]:
                dp[i][j] = True
            if j < n and s2[j] == s3[i + j] and dp[i][j + 1]:
                dp[i][j] = True
    return dp[0][0]
```

```rust
fn is_interleave(s1: String, s2: String, s3: String) -> bool {
    let (b1, b2, b3) = (s1.as_bytes(), s2.as_bytes(), s3.as_bytes());
    let (m, n) = (b1.len(), b2.len());
    if m + n != b3.len() { return false; }
    let mut dp = vec![vec![false; n + 1]; m + 1];
    dp[m][n] = true;
    for i in (0..=m).rev() {
        for j in (0..=n).rev() {
            if i < m && b1[i] == b3[i+j] && dp[i+1][j] { dp[i][j] = true; }
            if j < n && b2[j] == b3[i+j] && dp[i][j+1] { dp[i][j] = true; }
        }
    }
    dp[0][0]
}
```

```go
func isInterleave(s1 string, s2 string, s3 string) bool {
    m, n := len(s1), len(s2)
    if m+n != len(s3) { return false }
    dp := make([][]bool, m+1)
    for i := range dp { dp[i] = make([]bool, n+1) }
    dp[m][n] = true
    for i := m; i >= 0; i-- {
        for j := n; j >= 0; j-- {
            if i < m && s1[i] == s3[i+j] && dp[i+1][j] { dp[i][j] = true }
            if j < n && s2[j] == s3[i+j] && dp[i][j+1] { dp[i][j] = true }
        }
    }
    return dp[0][0]
}
```

```cpp
#include <vector>
#include <string>

bool isInterleave(std::string& s1, std::string& s2, std::string& s3) {
    int m = (int)s1.size(), n = (int)s2.size();
    if (m + n != (int)s3.size()) return false;
    std::vector<std::vector<bool>> dp(m + 1, std::vector<bool>(n + 1, false));
    dp[m][n] = true;
    for (int i = m; i >= 0; --i) {
        for (int j = n; j >= 0; --j) {
            if (i < m && s1[i] == s3[i+j] && dp[i+1][j]) dp[i][j] = true;
            if (j < n && s2[j] == s3[i+j] && dp[i][j+1]) dp[i][j] = true;
        }
    }
    return dp[0][0];
}
```

### 118. Longest Increasing Path in a Matrix

#### Problem
Given an `m x n` integer matrix, return the length of the longest strictly increasing path. You can move in four directions (up, down, left, right) but not diagonally.

#### Pattern
**DFS with memoization.** **O(m * n)** time, **O(m * n)** space.

#### Explanation
Treat the matrix as a DAG: there is a directed edge from cell `(r, c)` to a neighbor only if the neighbor's value is strictly greater. The longest increasing path equals the longest path in this DAG, which has no cycles (values are strictly increasing). We use DFS from every cell with a memo table: `memo[(r, c)]` = the longest path starting from `(r, c)`. Because the graph is acyclic, memoization is safe — we'll never revisit a cell in the same DFS chain. Each cell is computed at most once, giving `O(m * n)` total work. No explicit visited set is needed since the strictly-greater condition prevents cycles.

#### Solution

```python
def longestIncreasingPath(matrix):
    rows, cols = len(matrix), len(matrix[0])
    memo = {}

    def dfs(r, c):
        if (r, c) in memo:
            return memo[(r, c)]
        res = 1
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                res = max(res, 1 + dfs(nr, nc))
        memo[(r, c)] = res
        return res

    return max(dfs(r, c) for r in range(rows) for c in range(cols))
```

```rust
fn longest_increasing_path(matrix: Vec<Vec<i32>>) -> i32 {
    let (rows, cols) = (matrix.len(), matrix[0].len());
    let mut memo = vec![vec![0i32; cols]; rows];

    fn dfs(r: usize, c: usize, matrix: &Vec<Vec<i32>>, memo: &mut Vec<Vec<i32>>) -> i32 {
        if memo[r][c] != 0 { return memo[r][c]; }
        let dirs: &[(i32, i32)] = &[(0, 1), (0, -1), (1, 0), (-1, 0)];
        let mut res = 1;
        for &(dr, dc) in dirs {
            let nr = r as i32 + dr;
            let nc = c as i32 + dc;
            let (rows, cols) = (matrix.len() as i32, matrix[0].len() as i32);
            if nr >= 0 && nc >= 0 && nr < rows && nc < cols {
                let (nr, nc) = (nr as usize, nc as usize);
                if matrix[nr][nc] > matrix[r][c] {
                    res = res.max(1 + dfs(nr, nc, matrix, memo));
                }
            }
        }
        memo[r][c] = res;
        res
    }

    let mut ans = 0;
    for r in 0..rows {
        for c in 0..cols {
            ans = ans.max(dfs(r, c, &matrix, &mut memo));
        }
    }
    ans
}
```

```go
func longestIncreasingPath(matrix [][]int) int {
    rows, cols := len(matrix), len(matrix[0])
    memo := make([][]int, rows)
    for i := range memo { memo[i] = make([]int, cols) }
    dirs := [][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}}
    var dfs func(r, c int) int
    dfs = func(r, c int) int {
        if memo[r][c] != 0 { return memo[r][c] }
        res := 1
        for _, d := range dirs {
            nr, nc := r+d[0], c+d[1]
            if nr >= 0 && nc >= 0 && nr < rows && nc < cols && matrix[nr][nc] > matrix[r][c] {
                if v := 1 + dfs(nr, nc); v > res { res = v }
            }
        }
        memo[r][c] = res
        return res
    }
    ans := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if v := dfs(r, c); v > ans { ans = v }
        }
    }
    return ans
}
```

```cpp
#include <vector>
#include <algorithm>
#include <functional>

int longestIncreasingPath(std::vector<std::vector<int>>& matrix) {
    int rows = (int)matrix.size(), cols = (int)matrix[0].size();
    std::vector<std::vector<int>> memo(rows, std::vector<int>(cols, 0));
    int dirs[4][2] = {{0,1},{0,-1},{1,0},{-1,0}};

    std::function<int(int,int)> dfs = [&](int r, int c) -> int {
        if (memo[r][c]) return memo[r][c];
        int res = 1;
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && matrix[nr][nc] > matrix[r][c])
                res = std::max(res, 1 + dfs(nr, nc));
        }
        return memo[r][c] = res;
    };

    int ans = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c)
            ans = std::max(ans, dfs(r, c));
    return ans;
}
```

### 119. Distinct Subsequences

#### Problem
Given strings `s` and `t`, return the number of distinct subsequences of `s` that equal `t`.

#### Pattern
**2-D DP.** **O(m * n)** time, **O(m * n)** space.

#### Explanation
`dp[i][j]` = number of ways to form `t[j:]` using the characters in `s[i:]`. Base case: `dp[i][n] = 1` for all `i` — an empty `t` can always be matched (the empty subsequence). At each cell, we can always skip `s[i]` by inheriting from `dp[i+1][j]`. If `s[i] == t[j]`, we also add `dp[i+1][j+1]` (the count of ways to match the rest of `t` using the rest of `s`). The two choices — skip or match — are the core of this DP. Numbers can be large; the problem guarantees the answer fits in a 32-bit integer.

#### Solution

```python
def numDistinct(s, t):
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][n] = 1
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            dp[i][j] = dp[i + 1][j]
            if s[i] == t[j]:
                dp[i][j] += dp[i + 1][j + 1]
    return dp[0][0]
```

```rust
fn num_distinct(s: String, t: String) -> i32 {
    let (sb, tb) = (s.as_bytes(), t.as_bytes());
    let (m, n) = (sb.len(), tb.len());
    let mut dp = vec![vec![0u64; n + 1]; m + 1];
    for i in 0..=m { dp[i][n] = 1; }
    for i in (0..m).rev() {
        for j in (0..n).rev() {
            dp[i][j] = dp[i+1][j];
            if sb[i] == tb[j] { dp[i][j] += dp[i+1][j+1]; }
        }
    }
    dp[0][0] as i32
}
```

```go
func numDistinct(s string, t string) int {
    m, n := len(s), len(t)
    dp := make([][]int, m+1)
    for i := range dp { dp[i] = make([]int, n+1) }
    for i := 0; i <= m; i++ { dp[i][n] = 1 }
    for i := m - 1; i >= 0; i-- {
        for j := n - 1; j >= 0; j-- {
            dp[i][j] = dp[i+1][j]
            if s[i] == t[j] { dp[i][j] += dp[i+1][j+1] }
        }
    }
    return dp[0][0]
}
```

```cpp
#include <vector>
#include <string>

int numDistinct(std::string& s, std::string& t) {
    int m = (int)s.size(), n = (int)t.size();
    std::vector<std::vector<long long>> dp(m + 1, std::vector<long long>(n + 1, 0));
    for (int i = 0; i <= m; ++i) dp[i][n] = 1;
    for (int i = m - 1; i >= 0; --i)
        for (int j = n - 1; j >= 0; --j) {
            dp[i][j] = dp[i+1][j];
            if (s[i] == t[j]) dp[i][j] += dp[i+1][j+1];
        }
    return (int)dp[0][0];
}
```

### 120. Edit Distance

#### Problem
Given two strings `word1` and `word2`, return the minimum number of operations (insert, delete, or replace a character) required to convert `word1` to `word2`.

#### Pattern
**2-D DP (space-optimized to 1-D).** **O(m * n)** time, **O(n)** space.

#### Explanation
The classic Levenshtein distance. `dp[i][j]` = min edits to convert `word1[:i]` to `word2[:j]`. Base cases: converting to/from an empty string costs `i` or `j` deletions/insertions. When characters match (`word1[i-1] == word2[j-1]`), no edit is needed and we inherit the diagonal `dp[i-1][j-1]`. When they differ, we take 1 + the minimum of three options: delete from `word1` (`dp[i-1][j]`), insert into `word1` (`dp[i][j-1]`), or replace (`dp[i-1][j-1]`). The 1-D rolling array reuses the single-row `dp`, tracking the "previous diagonal" in `prev` before overwriting.

#### Solution

```python
def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[j] = prev[j - 1]
            else:
                dp[j] = 1 + min(prev[j], dp[j - 1], prev[j - 1])
    return dp[n]
```

```rust
fn min_distance(word1: String, word2: String) -> i32 {
    let (b1, b2) = (word1.as_bytes(), word2.as_bytes());
    let (m, n) = (b1.len(), b2.len());
    let mut dp: Vec<i32> = (0..=n as i32).collect();
    for i in 1..=m {
        let mut prev = dp.clone();
        dp[0] = i as i32;
        for j in 1..=n {
            dp[j] = if b1[i-1] == b2[j-1] {
                prev[j-1]
            } else {
                1 + prev[j].min(dp[j-1]).min(prev[j-1])
            };
        }
        let _ = prev; // consumed
    }
    dp[n]
}
```

```go
func minDistance(word1 string, word2 string) int {
    m, n := len(word1), len(word2)
    dp := make([]int, n+1)
    for j := 0; j <= n; j++ { dp[j] = j }
    for i := 1; i <= m; i++ {
        prev := append([]int(nil), dp...)
        dp[0] = i
        for j := 1; j <= n; j++ {
            if word1[i-1] == word2[j-1] {
                dp[j] = prev[j-1]
            } else {
                dp[j] = 1 + minOf3(prev[j], dp[j-1], prev[j-1])
            }
        }
    }
    return dp[n]
}
func minOf3(a, b, c int) int {
    if a < b { b = a }
    if b < c { return b }
    return c
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

int minDistance(std::string& word1, std::string& word2) {
    int m = (int)word1.size(), n = (int)word2.size();
    std::vector<int> dp(n + 1);
    for (int j = 0; j <= n; ++j) dp[j] = j;
    for (int i = 1; i <= m; ++i) {
        std::vector<int> prev = dp;
        dp[0] = i;
        for (int j = 1; j <= n; ++j) {
            if (word1[i-1] == word2[j-1])
                dp[j] = prev[j-1];
            else
                dp[j] = 1 + std::min({prev[j], dp[j-1], prev[j-1]});
        }
    }
    return dp[n];
}
```

### 121. Burst Balloons
#### Problem
Given `n` balloons with integer values, burst them one at a time; when you burst balloon `i`, you earn `nums[i-1] * nums[i] * nums[i+1]` coins (using 1 for out-of-bounds neighbors). Return the maximum coins collectable.

#### Pattern
**Interval DP (think-last trick).** **O(n³)** time, **O(n²)** space.

#### Explanation
The naive approach tries all permutations of burst order — `O(n!)`. The key insight is to think in reverse: instead of asking "which balloon do I burst first?", ask "which balloon do I burst *last* in this interval `[l, r]`?" When balloon `i` is the last to be burst in `[l, r]`, its neighbors are exactly the sentinels at `l-1` and `r+1` (since all others in the interval are already gone), so coins are `nums[l-1] * nums[i] * nums[r+1]`. Then the subproblems `dfs(l, i-1)` and `dfs(i+1, r)` are independent. Pad `nums` with `1` sentinels on both ends so boundary cases vanish. Memoize each `(l, r)` pair; there are `O(n²)` states, each iterated over `O(n)` choices, giving `O(n³)`.

#### Solution

```python
def maxCoins(nums):
    nums = [1] + nums + [1]
    n = len(nums)
    dp = {}
    def dfs(l, r):
        if l > r:
            return 0
        if (l, r) in dp:
            return dp[(l, r)]
        dp[(l, r)] = max(
            nums[l-1] * nums[i] * nums[r+1] + dfs(l, i-1) + dfs(i+1, r)
            for i in range(l, r+1)
        )
        return dp[(l, r)]
    return dfs(1, n - 2)
```

```rust
use std::collections::HashMap;

fn max_coins(mut nums: Vec<i32>) -> i32 {
    nums.insert(0, 1);
    nums.push(1);
    let n = nums.len();
    let mut dp: HashMap<(usize, usize), i32> = HashMap::new();

    fn dfs(l: usize, r: usize, nums: &[i32], dp: &mut HashMap<(usize, usize), i32>) -> i32 {
        if l > r {
            return 0;
        }
        if let Some(&v) = dp.get(&(l, r)) {
            return v;
        }
        let mut best = 0;
        for i in l..=r {
            let coins = nums[l - 1] * nums[i] * nums[r + 1]
                + dfs(l, i.wrapping_sub(1), nums, dp)
                + dfs(i + 1, r, nums, dp);
            best = best.max(coins);
        }
        dp.insert((l, r), best);
        best
    }

    dfs(1, n - 2, &nums, &mut dp)
}
```

```go
func maxCoins(nums []int) int {
    nums = append([]int{1}, append(nums, 1)...)
    n := len(nums)
    dp := make([][]int, n)
    for i := range dp {
        dp[i] = make([]int, n)
        for j := range dp[i] {
            dp[i][j] = -1
        }
    }
    var dfs func(l, r int) int
    dfs = func(l, r int) int {
        if l > r {
            return 0
        }
        if dp[l][r] != -1 {
            return dp[l][r]
        }
        best := 0
        for i := l; i <= r; i++ {
            coins := nums[l-1]*nums[i]*nums[r+1] + dfs(l, i-1) + dfs(i+1, r)
            if coins > best {
                best = coins
            }
        }
        dp[l][r] = best
        return best
    }
    return dfs(1, n-2)
}
```

```cpp
#include <vector>
#include <functional>
#include <algorithm>

int maxCoins(std::vector<int>& nums) {
    nums.insert(nums.begin(), 1);
    nums.push_back(1);
    int n = (int)nums.size();
    std::vector<std::vector<int>> dp(n, std::vector<int>(n, -1));
    std::function<int(int, int)> dfs = [&](int l, int r) -> int {
        if (l > r) return 0;
        if (dp[l][r] != -1) return dp[l][r];
        int best = 0;
        for (int i = l; i <= r; ++i) {
            int coins = nums[l-1] * nums[i] * nums[r+1] + dfs(l, i-1) + dfs(i+1, r);
            best = std::max(best, coins);
        }
        return dp[l][r] = best;
    };
    return dfs(1, n - 2);
}
```

### 122. Regular Expression Matching
#### Problem
Given string `s` and pattern `p` with `.` (matches any char) and `*` (matches zero or more of the preceding element), return whether `p` fully matches `s`.

#### Pattern
**2-D DP (top-down memoization).** **O(m·n)** time, **O(m·n)** space.

#### Explanation
The naive recursive solution re-evaluates the same `(i, j)` state many times. The state is "does `s[i:]` match `p[j:]`?" — memoize it. The tricky case is `*`: it can match zero of the preceding character (`dp(i, j+2)`, skipping the `x*` pair) or one-or-more if the current characters agree (`first and dp(i+1, j)`, advancing `s` while staying at the same `*` pattern position). `first` checks both literal match and `.` wildcard in one expression. Base case: if `j == len(p)`, valid only when `s` is also exhausted. Because pattern consumes from left, every recursive call moves at least one index forward, bounding depth to `O(m + n)` with `O(m·n)` unique states.

#### Solution

```python
def isMatch(s, p):
    memo = {}
    def dp(i, j):
        if (i, j) in memo:
            return memo[(i, j)]
        if j == len(p):
            return i == len(s)
        first = i < len(s) and p[j] in {s[i], "."}
        if j + 1 < len(p) and p[j + 1] == "*":
            res = dp(i, j + 2) or (first and dp(i + 1, j))
        else:
            res = first and dp(i + 1, j + 1)
        memo[(i, j)] = res
        return res
    return dp(0, 0)
```

```rust
use std::collections::HashMap;

fn is_match(s: String, p: String) -> bool {
    let s: Vec<char> = s.chars().collect();
    let p: Vec<char> = p.chars().collect();
    let mut memo: HashMap<(usize, usize), bool> = HashMap::new();

    fn dp(i: usize, j: usize, s: &[char], p: &[char], memo: &mut HashMap<(usize, usize), bool>) -> bool {
        if let Some(&v) = memo.get(&(i, j)) {
            return v;
        }
        if j == p.len() {
            return i == s.len();
        }
        let first = i < s.len() && (p[j] == '.' || p[j] == s[i]);
        let res = if j + 1 < p.len() && p[j + 1] == '*' {
            dp(i, j + 2, s, p, memo) || (first && dp(i + 1, j, s, p, memo))
        } else {
            first && dp(i + 1, j + 1, s, p, memo)
        };
        memo.insert((i, j), res);
        res
    }

    dp(0, 0, &s, &p, &mut memo)
}
```

```go
func isMatch(s string, p string) bool {
    memo := map[[2]int]bool{}
    var dp func(i, j int) bool
    dp = func(i, j int) bool {
        key := [2]int{i, j}
        if v, ok := memo[key]; ok {
            return v
        }
        if j == len(p) {
            return i == len(s)
        }
        first := i < len(s) && (p[j] == '.' || p[j] == s[i])
        var res bool
        if j+1 < len(p) && p[j+1] == '*' {
            res = dp(i, j+2) || (first && dp(i+1, j))
        } else {
            res = first && dp(i+1, j+1)
        }
        memo[key] = res
        return res
    }
    return dp(0, 0)
}
```

```cpp
#include <string>
#include <vector>

bool isMatch(std::string s, std::string p) {
    int m = (int)s.size(), n = (int)p.size();
    // -1=unvisited, 0=false, 1=true
    std::vector<std::vector<int>> memo(m + 1, std::vector<int>(n + 1, -1));
    std::function<bool(int, int)> dp = [&](int i, int j) -> bool {
        if (memo[i][j] != -1) return memo[i][j];
        if (j == n) return memo[i][j] = (i == m);
        bool first = i < m && (p[j] == '.' || p[j] == s[i]);
        bool res;
        if (j + 1 < n && p[j + 1] == '*') {
            res = dp(i, j + 2) || (first && dp(i + 1, j));
        } else {
            res = first && dp(i + 1, j + 1);
        }
        return memo[i][j] = res;
    };
    return dp(0, 0);
}
```

### 123. Maximum Subarray
#### Problem
Given an integer array `nums`, find the contiguous subarray with the largest sum and return that sum. The array may contain negative numbers.

#### Pattern
**Kadane's Algorithm (greedy running sum).** **O(n)** time, **O(1)** space.

#### Explanation
A naive approach enumerates all O(n²) subarrays. Kadane's insight: the best subarray ending at position `i` is either just `nums[i]` alone, or `nums[i]` appended to the best subarray ending at `i-1`. If the running sum `cur` goes negative, it can only hurt any future subarray, so restart from `nums[i]`. This greedy decision is locally optimal and provably globally optimal. Track the overall maximum in `res` as you go. Initialize both to `nums[0]` to handle all-negative arrays correctly — returning the largest single element rather than zero.

#### Solution

```python
def maxSubArray(nums):
    res = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        res = max(res, cur)
    return res
```

```rust
fn max_sub_array(nums: Vec<i32>) -> i32 {
    let mut cur = nums[0];
    let mut res = nums[0];
    for &n in nums.iter().skip(1) {
        cur = n.max(cur + n);
        res = res.max(cur);
    }
    res
}
```

```go
func maxSubArray(nums []int) int {
    cur, res := nums[0], nums[0]
    for _, n := range nums[1:] {
        if cur+n > n {
            cur = cur + n
        } else {
            cur = n
        }
        if cur > res {
            res = cur
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

int maxSubArray(std::vector<int>& nums) {
    int cur = nums[0], res = nums[0];
    for (int i = 1; i < (int)nums.size(); ++i) {
        cur = std::max(nums[i], cur + nums[i]);
        res = std::max(res, cur);
    }
    return res;
}
```

### 124. Jump Game
#### Problem
Given an array `nums` where `nums[i]` is the maximum jump length from index `i`, return whether you can reach the last index starting from index 0.

#### Pattern
**Greedy (shrink goal leftward).** **O(n)** time, **O(1)** space.

#### Explanation
A BFS/DP approach tracks reachability for every index — O(n) space and conceptually heavier. The greedy insight: scan right-to-left, maintaining a `goal` (the leftmost index that can reach the end). If index `i` can jump to `goal` or beyond (`i + nums[i] >= goal`), then `i` itself becomes the new goal. By the time you reach index 0, if `goal == 0` then index 0 can transitively reach the end. Zeros in the array are the only real obstacles — an index with `nums[i] == 0` can't propagate the goal leftward. This single left-to-right goal-update pass is optimal.

#### Solution

```python
def canJump(nums):
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:
            goal = i
    return goal == 0
```

```rust
fn can_jump(nums: Vec<i32>) -> bool {
    let mut goal = nums.len() - 1;
    for i in (0..nums.len() - 1).rev() {
        if i + nums[i] as usize >= goal {
            goal = i;
        }
    }
    goal == 0
}
```

```go
func canJump(nums []int) bool {
    goal := len(nums) - 1
    for i := len(nums) - 2; i >= 0; i-- {
        if i+nums[i] >= goal {
            goal = i
        }
    }
    return goal == 0
}
```

```cpp
#include <vector>

bool canJump(std::vector<int>& nums) {
    int goal = (int)nums.size() - 1;
    for (int i = (int)nums.size() - 2; i >= 0; --i) {
        if (i + nums[i] >= goal) goal = i;
    }
    return goal == 0;
}
```

### 125. Jump Game II
#### Problem
Given `nums` where `nums[i]` is the max jump from index `i`, return the minimum number of jumps to reach the last index. A solution is guaranteed to exist.

#### Pattern
**Greedy BFS (implicit levels via boundary tracking).** **O(n)** time, **O(1)** space.

#### Explanation
BFS on jump levels works but requires a queue. The greedy insight models BFS levels implicitly with two pointers: `cur_end` (end of the current BFS level) and `cur_far` (farthest we can reach from any position in this level). At each index `i`, extend `cur_far`. When `i` hits `cur_end`, we must take a jump — increment `jumps` and advance `cur_end` to `cur_far`. We stop the loop at `len(nums) - 1` (not inclusive) because reaching the last index itself doesn't require an additional jump. This is equivalent to BFS expanding level by level, but uses O(1) space instead of a queue.

#### Solution

```python
def jump(nums):
    jumps = cur_end = cur_far = 0
    for i in range(len(nums) - 1):
        cur_far = max(cur_far, i + nums[i])
        if i == cur_end:
            jumps += 1
            cur_end = cur_far
    return jumps
```

```rust
fn jump(nums: Vec<i32>) -> i32 {
    let mut jumps = 0;
    let mut cur_end = 0;
    let mut cur_far = 0;
    for i in 0..nums.len() - 1 {
        cur_far = cur_far.max(i + nums[i] as usize);
        if i == cur_end {
            jumps += 1;
            cur_end = cur_far;
        }
    }
    jumps
}
```

```go
func jump(nums []int) int {
    jumps, curEnd, curFar := 0, 0, 0
    for i := 0; i < len(nums)-1; i++ {
        if i+nums[i] > curFar {
            curFar = i + nums[i]
        }
        if i == curEnd {
            jumps++
            curEnd = curFar
        }
    }
    return jumps
}
```

```cpp
#include <vector>
#include <algorithm>

int jump(std::vector<int>& nums) {
    int jumps = 0, cur_end = 0, cur_far = 0;
    for (int i = 0; i < (int)nums.size() - 1; ++i) {
        cur_far = std::max(cur_far, i + nums[i]);
        if (i == cur_end) {
            ++jumps;
            cur_end = cur_far;
        }
    }
    return jumps;
}
```

### 126. Gas Station
#### Problem
Given `gas[i]` and `cost[i]` for `n` stations in a circle, find the starting station index that allows you to complete the circuit without running dry, or return -1 if none exists.

#### Pattern
**Greedy (surplus tracking with reset).** **O(n)** time, **O(1)** space.

#### Explanation
First check feasibility: if total gas is less than total cost, no solution exists. This can be proven: the problem guarantees at most one valid start, so if the total is sufficient, exactly one exists. For the single-pass approach, track a running `tank` surplus. Whenever `tank` drops below zero, the current `start` through index `i` is invalid (any sub-segment of a failing segment also fails), so reset `tank = 0` and move `start` to `i + 1`. The last candidate `start` when the loop ends is the answer, because the feasibility check already guarantees a solution exists. No need to simulate the second loop from `start`.

#### Solution

```python
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    tank = start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            tank = 0
            start = i + 1
    return start
```

```rust
fn can_complete_circuit(gas: Vec<i32>, cost: Vec<i32>) -> i32 {
    let total: i32 = gas.iter().zip(cost.iter()).map(|(g, c)| g - c).sum();
    if total < 0 {
        return -1;
    }
    let mut tank = 0i32;
    let mut start = 0usize;
    for i in 0..gas.len() {
        tank += gas[i] - cost[i];
        if tank < 0 {
            tank = 0;
            start = i + 1;
        }
    }
    start as i32
}
```

```go
func canCompleteCircuit(gas []int, cost []int) int {
    total := 0
    for i := range gas {
        total += gas[i] - cost[i]
    }
    if total < 0 {
        return -1
    }
    tank, start := 0, 0
    for i := range gas {
        tank += gas[i] - cost[i]
        if tank < 0 {
            tank = 0
            start = i + 1
        }
    }
    return start
}
```

```cpp
#include <vector>
#include <numeric>

int canCompleteCircuit(std::vector<int>& gas, std::vector<int>& cost) {
    int total = 0;
    for (int i = 0; i < (int)gas.size(); ++i) total += gas[i] - cost[i];
    if (total < 0) return -1;
    int tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); ++i) {
        tank += gas[i] - cost[i];
        if (tank < 0) { tank = 0; start = i + 1; }
    }
    return start;
}
```

### 127. Hand of Straights
#### Problem
Given a hand of cards and a `groupSize`, determine if the cards can be rearranged into groups of `groupSize` consecutive cards.

#### Pattern
**Greedy with ordered counter.** **O(n log n)** time, **O(n)** space.

#### Explanation
If `len(hand) % groupSize != 0`, it's immediately impossible. The greedy strategy: always form groups starting from the smallest available card. Sorting the unique card values gives the correct order to process. For each smallest card with a non-zero count `n`, we need `n` groups starting there, so we consume `n` copies of each of the next `groupSize` cards. If any of those cards has fewer than `n` copies, return False. Using a plain dict with sorted keys is equivalent to using a sorted map — we visit keys in ascending order and decrement counts. A missing key means zero count, which triggers the failure.

#### Solution

```python
def isNStraightHand(hand, groupSize):
    if len(hand) % groupSize:
        return False
    count = {}
    for c in hand:
        count[c] = count.get(c, 0) + 1
    for card in sorted(count):
        if count[card] > 0:
            n = count[card]
            for i in range(card, card + groupSize):
                if count.get(i, 0) < n:
                    return False
                count[i] -= n
    return True
```

```rust
use std::collections::BTreeMap;

fn is_n_straight_hand(hand: Vec<i32>, group_size: i32) -> bool {
    if hand.len() % group_size as usize != 0 {
        return false;
    }
    let mut count: BTreeMap<i32, i32> = BTreeMap::new();
    for c in hand {
        *count.entry(c).or_insert(0) += 1;
    }
    let keys: Vec<i32> = count.keys().cloned().collect();
    for card in keys {
        let n = *count.get(&card).unwrap_or(&0);
        if n > 0 {
            for i in card..card + group_size {
                let entry = count.entry(i).or_insert(0);
                if *entry < n {
                    return false;
                }
                *entry -= n;
            }
        }
    }
    true
}
```

```go
import "sort"

func isNStraightHand(hand []int, groupSize int) bool {
    if len(hand)%groupSize != 0 {
        return false
    }
    count := map[int]int{}
    for _, c := range hand {
        count[c]++
    }
    keys := make([]int, 0, len(count))
    for k := range count {
        keys = append(keys, k)
    }
    sort.Ints(keys)
    for _, card := range keys {
        n := count[card]
        if n > 0 {
            for i := card; i < card+groupSize; i++ {
                if count[i] < n {
                    return false
                }
                count[i] -= n
            }
        }
    }
    return true
}
```

```cpp
#include <vector>
#include <map>

bool isNStraightHand(std::vector<int>& hand, int groupSize) {
    if ((int)hand.size() % groupSize != 0) return false;
    std::map<int, int> count;
    for (int c : hand) count[c]++;
    for (auto& [card, n] : count) {
        if (n > 0) {
            for (int i = card; i < card + groupSize; ++i) {
                if (count[i] < n) return false;
                count[i] -= n;
            }
        }
    }
    return true;
}
```

### 128. Merge Triplets to Form Target Triplet
#### Problem
Given a list of triplets and a `target` triplet, you can merge any triplets by taking the element-wise maximum. Return whether it's possible to form exactly `target` by merging some subset of triplets.

#### Pattern
**Greedy (filter then element-wise max).** **O(n)** time, **O(1)** space.

#### Explanation
Any triplet with an element exceeding the corresponding target element would contaminate the merge (element-wise max can only grow, never shrink), so we discard those upfront. Among the remaining "safe" triplets, the best we can do is take the element-wise max — this represents using all safe triplets simultaneously. If that maximum equals `target`, we can achieve it; otherwise we cannot. No sorting or backtracking needed: the filter and max are independent per element. Edge case: if `target` itself is not achievable, `res` will fall short on at least one dimension.

#### Solution

```python
def mergeTriplets(triplets, target):
    res = [0, 0, 0]
    for t in triplets:
        if t[0] <= target[0] and t[1] <= target[1] and t[2] <= target[2]:
            res = [max(res[i], t[i]) for i in range(3)]
    return res == target
```

```rust
fn merge_triplets(triplets: Vec<Vec<i32>>, target: Vec<i32>) -> bool {
    let mut res = [0i32; 3];
    for t in &triplets {
        if t[0] <= target[0] && t[1] <= target[1] && t[2] <= target[2] {
            for i in 0..3 {
                res[i] = res[i].max(t[i]);
            }
        }
    }
    res[0] == target[0] && res[1] == target[1] && res[2] == target[2]
}
```

```go
func mergeTriplets(triplets [][]int, target []int) bool {
    res := [3]int{}
    for _, t := range triplets {
        if t[0] <= target[0] && t[1] <= target[1] && t[2] <= target[2] {
            for i := 0; i < 3; i++ {
                if t[i] > res[i] {
                    res[i] = t[i]
                }
            }
        }
    }
    return res[0] == target[0] && res[1] == target[1] && res[2] == target[2]
}
```

```cpp
#include <vector>
#include <algorithm>

bool mergeTriplets(std::vector<std::vector<int>>& triplets, std::vector<int>& target) {
    std::vector<int> res(3, 0);
    for (auto& t : triplets) {
        if (t[0] <= target[0] && t[1] <= target[1] && t[2] <= target[2]) {
            for (int i = 0; i < 3; ++i)
                res[i] = std::max(res[i], t[i]);
        }
    }
    return res == target;
}
```

### 129. Partition Labels
#### Problem
Given string `s`, partition it into as many parts as possible such that each letter appears in at most one part. Return the list of partition sizes.

#### Pattern
**Greedy (last-occurrence boundary extension).** **O(n)** time, **O(1)** space (26-char alphabet).

#### Explanation
To ensure a character stays within one part, the part must extend at least to the last occurrence of that character. Precompute `last[c]` — the last index where each character appears — in one scan. Then do a second scan: at each index `i`, extend the current partition's `end` to `max(end, last[c])`. When `i == end`, no character in the current window has a later occurrence, so we close this partition, record its size, and start a fresh one. The alphabet size is constant (26), so the `last` dict is O(1) space. The algorithm is essentially interval merging driven by character constraints.

#### Solution

```python
def partitionLabels(s):
    last = {c: i for i, c in enumerate(s)}
    res = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])
        if i == end:
            res.append(end - start + 1)
            start = i + 1
    return res
```

```rust
fn partition_labels(s: String) -> Vec<i32> {
    let s: Vec<u8> = s.bytes().collect();
    let mut last = [0usize; 26];
    for (i, &b) in s.iter().enumerate() {
        last[(b - b'a') as usize] = i;
    }
    let mut res = Vec::new();
    let mut start = 0;
    let mut end = 0;
    for (i, &b) in s.iter().enumerate() {
        let l = last[(b - b'a') as usize];
        if l > end { end = l; }
        if i == end {
            res.push((end - start + 1) as i32);
            start = i + 1;
        }
    }
    res
}
```

```go
func partitionLabels(s string) []int {
    last := [26]int{}
    for i, c := range s {
        last[c-'a'] = i
    }
    res := []int{}
    start, end := 0, 0
    for i, c := range s {
        if last[c-'a'] > end {
            end = last[c-'a']
        }
        if i == end {
            res = append(res, end-start+1)
            start = i + 1
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

std::vector<int> partitionLabels(std::string s) {
    int last[26] = {};
    for (int i = 0; i < (int)s.size(); ++i)
        last[s[i] - 'a'] = i;
    std::vector<int> res;
    int start = 0, end = 0;
    for (int i = 0; i < (int)s.size(); ++i) {
        end = std::max(end, last[s[i] - 'a']);
        if (i == end) {
            res.push_back(end - start + 1);
            start = i + 1;
        }
    }
    return res;
}
```

### 130. Valid Parenthesis String
#### Problem
Given a string containing `(`, `)`, and `*` (which can be `(`, `)`, or empty), return whether the string can be valid.

#### Pattern
**Greedy (min/max open-count range).** **O(n)** time, **O(1)** space.

#### Explanation
A DP approach over all possible assignments of `*` is O(n²). The greedy insight: instead of tracking one exact open count, track the range `[lo, hi]` of possible open-paren counts across all valid wildcard choices. `(` increments both bounds; `)` decrements both; `*` widens the range (decrement `lo`, increment `hi`). If `hi` drops below zero, even the most optimistic interpretation has more closes than opens — impossible. Clamp `lo` to zero because a negative open count is meaningless. At the end, valid iff `lo == 0` (there exists an assignment that closes all opens).

#### Solution

```python
def checkValidString(s):
    lo = hi = 0
    for c in s:
        if c == "(":
            lo += 1; hi += 1
        elif c == ")":
            lo -= 1; hi -= 1
        else:
            lo -= 1; hi += 1
        if hi < 0:
            return False
        lo = max(lo, 0)
    return lo == 0
```

```rust
fn check_valid_string(s: String) -> bool {
    let (mut lo, mut hi) = (0i32, 0i32);
    for c in s.chars() {
        match c {
            '(' => { lo += 1; hi += 1; }
            ')' => { lo -= 1; hi -= 1; }
            _   => { lo -= 1; hi += 1; }
        }
        if hi < 0 { return false; }
        if lo < 0 { lo = 0; }
    }
    lo == 0
}
```

```go
func checkValidString(s string) bool {
    lo, hi := 0, 0
    for _, c := range s {
        switch c {
        case '(':
            lo++; hi++
        case ')':
            lo--; hi--
        default:
            lo--; hi++
        }
        if hi < 0 {
            return false
        }
        if lo < 0 {
            lo = 0
        }
    }
    return lo == 0
}
```

```cpp
#include <string>
#include <algorithm>

bool checkValidString(std::string s) {
    int lo = 0, hi = 0;
    for (char c : s) {
        if (c == '(') { lo++; hi++; }
        else if (c == ')') { lo--; hi--; }
        else { lo--; hi++; }
        if (hi < 0) return false;
        lo = std::max(lo, 0);
    }
    return lo == 0;
}
```

### 131. Insert Interval
#### Problem
Given a sorted list of non-overlapping intervals and a `newInterval`, insert it into the list (merging if necessary) and return the updated sorted list.

#### Pattern
**Linear scan with three phases.** **O(n)** time, **O(n)** space.

#### Explanation
The scan naturally falls into three phases: (1) intervals that end before `newInterval` starts — copy as-is; (2) intervals that overlap with `newInterval` — merge by expanding `newInterval`'s bounds; (3) intervals that start after `newInterval` ends — append `newInterval` then copy the rest. Because the input is already sorted, phases 1 and 3 are simply prefix/suffix copies. The merging in phase 2 works by extending `newInterval` greedily. When we first detect the new interval no longer overlaps (phase 3), we can short-circuit with a slice copy. The empty-input edge case is handled naturally — we exit the loop and append `newInterval`.

#### Solution

```python
def insert(intervals, newInterval):
    res = []
    for i, (s, e) in enumerate(intervals):
        if newInterval[1] < s:
            res.append(newInterval)
            return res + intervals[i:]
        elif newInterval[0] > e:
            res.append([s, e])
        else:
            newInterval = [min(newInterval[0], s), max(newInterval[1], e)]
    res.append(newInterval)
    return res
```

```rust
fn insert(intervals: Vec<Vec<i32>>, new_interval: Vec<i32>) -> Vec<Vec<i32>> {
    let mut res: Vec<Vec<i32>> = Vec::new();
    let mut new_iv = new_interval;
    let mut inserted = false;
    for iv in &intervals {
        if new_iv[1] < iv[0] {
            if !inserted { res.push(new_iv.clone()); inserted = true; }
            res.push(iv.clone());
        } else if new_iv[0] > iv[1] {
            res.push(iv.clone());
        } else {
            new_iv[0] = new_iv[0].min(iv[0]);
            new_iv[1] = new_iv[1].max(iv[1]);
        }
    }
    if !inserted { res.push(new_iv); }
    res
}
```

```go
func insert(intervals [][]int, newInterval []int) [][]int {
    res := [][]int{}
    for i, iv := range intervals {
        if newInterval[1] < iv[0] {
            res = append(res, newInterval)
            return append(res, intervals[i:]...)
        } else if newInterval[0] > iv[1] {
            res = append(res, iv)
        } else {
            if iv[0] < newInterval[0] { newInterval[0] = iv[0] }
            if iv[1] > newInterval[1] { newInterval[1] = iv[1] }
        }
    }
    return append(res, newInterval)
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> insert(std::vector<std::vector<int>>& intervals, std::vector<int>& newInterval) {
    std::vector<std::vector<int>> res;
    for (int i = 0; i < (int)intervals.size(); ++i) {
        if (newInterval[1] < intervals[i][0]) {
            res.push_back(newInterval);
            for (int j = i; j < (int)intervals.size(); ++j)
                res.push_back(intervals[j]);
            return res;
        } else if (newInterval[0] > intervals[i][1]) {
            res.push_back(intervals[i]);
        } else {
            newInterval[0] = std::min(newInterval[0], intervals[i][0]);
            newInterval[1] = std::max(newInterval[1], intervals[i][1]);
        }
    }
    res.push_back(newInterval);
    return res;
}
```

### 132. Merge Intervals
#### Problem
Given a list of intervals, merge all overlapping intervals and return the minimal non-overlapping list.

#### Pattern
**Sort then greedy merge.** **O(n log n)** time, **O(n)** space.

#### Explanation
Without sorting, you'd need O(n²) to find all overlapping pairs. After sorting by start time, any interval that overlaps the previous one must have its start ≤ the previous end (since starts are non-decreasing). When overlap is detected, extend the last result interval's end to the max of both ends — this handles the case where one interval is fully contained within another. When no overlap, push a new interval. Sorting dominates the runtime; the merge pass is O(n). Edge: a single interval is handled correctly since we initialize `res` with `intervals[0]`.

#### Solution

```python
def merge(intervals):
    intervals.sort()
    res = [intervals[0]]
    for s, e in intervals[1:]:
        if s <= res[-1][1]:
            res[-1][1] = max(res[-1][1], e)
        else:
            res.append([s, e])
    return res
```

```rust
fn merge(mut intervals: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    intervals.sort_by_key(|iv| iv[0]);
    let mut res: Vec<Vec<i32>> = vec![intervals[0].clone()];
    for iv in intervals.into_iter().skip(1) {
        let last = res.last_mut().unwrap();
        if iv[0] <= last[1] {
            last[1] = last[1].max(iv[1]);
        } else {
            res.push(iv);
        }
    }
    res
}
```

```go
import "sort"

func merge(intervals [][]int) [][]int {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })
    res := [][]int{intervals[0]}
    for _, iv := range intervals[1:] {
        last := res[len(res)-1]
        if iv[0] <= last[1] {
            if iv[1] > last[1] { last[1] = iv[1] }
        } else {
            res = append(res, iv)
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<std::vector<int>> merge(std::vector<std::vector<int>>& intervals) {
    std::sort(intervals.begin(), intervals.end());
    std::vector<std::vector<int>> res = {intervals[0]};
    for (int i = 1; i < (int)intervals.size(); ++i) {
        if (intervals[i][0] <= res.back()[1]) {
            res.back()[1] = std::max(res.back()[1], intervals[i][1]);
        } else {
            res.push_back(intervals[i]);
        }
    }
    return res;
}
```

### 133. Non-overlapping Intervals
#### Problem
Given intervals, return the minimum number of intervals to remove so that no two intervals overlap.

#### Pattern
**Greedy (sort by end, activity selection).** **O(n log n)** time, **O(1)** space.

#### Explanation
This is the classic activity selection problem in disguise. Sorting by end time and greedily keeping the interval that finishes earliest maximizes the number of non-overlapping intervals we keep — equivalently, minimizing removals. Why sort by end and not start? An interval with a smaller end leaves more room for subsequent intervals; keeping it is always at least as good as keeping a later-ending alternative that also starts at the same time. Walk left to right: if the current interval starts at or after `end`, keep it (update `end`); otherwise it overlaps — count it as a removal. `end` is initialized to negative infinity so the first interval is always kept.

#### Solution

```python
def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    res = 0
    end = float('-inf')
    for s, e in intervals:
        if s >= end:
            end = e
        else:
            res += 1
    return res
```

```rust
fn erase_overlap_intervals(mut intervals: Vec<Vec<i32>>) -> i32 {
    intervals.sort_by_key(|iv| iv[1]);
    let mut res = 0;
    let mut end = i32::MIN;
    for iv in &intervals {
        if iv[0] >= end {
            end = iv[1];
        } else {
            res += 1;
        }
    }
    res
}
```

```go
import "sort"

func eraseOverlapIntervals(intervals [][]int) int {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][1] < intervals[j][1]
    })
    res := 0
    end := -1 << 62
    for _, iv := range intervals {
        if iv[0] >= end {
            end = iv[1]
        } else {
            res++
        }
    }
    return res
}
```

```cpp
#include <vector>
#include <algorithm>
#include <climits>

int eraseOverlapIntervals(std::vector<std::vector<int>>& intervals) {
    std::sort(intervals.begin(), intervals.end(),
              [](auto& a, auto& b){ return a[1] < b[1]; });
    int res = 0, end = INT_MIN;
    for (auto& iv : intervals) {
        if (iv[0] >= end) end = iv[1];
        else ++res;
    }
    return res;
}
```

### 134. Meeting Rooms
#### Problem
Given a list of meeting time intervals `[start, end]`, determine if a person can attend all meetings without any overlap.

#### Pattern
**Sort then adjacent-pair check.** **O(n log n)** time, **O(1)** space.

#### Explanation
After sorting by start time, any overlap must occur between adjacent intervals — a later interval can only overlap with its predecessor because predecessors are sorted. Check each consecutive pair: if the next meeting starts before the current one ends (`intervals[i][0] < intervals[i-1][1]`), return False. If `end` equals `start` exactly, that is not an overlap (meetings are back-to-back). The sort is necessary; without it, a meeting starting much later but appearing earlier in the list could mask an overlap. An empty or single-element input trivially returns True.

#### Solution

```python
def canAttendMeetings(intervals):
    intervals.sort()
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:
            return False
    return True
```

```rust
fn can_attend_meetings(mut intervals: Vec<Vec<i32>>) -> bool {
    intervals.sort_by_key(|iv| iv[0]);
    for i in 1..intervals.len() {
        if intervals[i][0] < intervals[i-1][1] {
            return false;
        }
    }
    true
}
```

```go
import "sort"

func canAttendMeetings(intervals [][]int) bool {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })
    for i := 1; i < len(intervals); i++ {
        if intervals[i][0] < intervals[i-1][1] {
            return false
        }
    }
    return true
}
```

```cpp
#include <vector>
#include <algorithm>

bool canAttendMeetings(std::vector<std::vector<int>>& intervals) {
    std::sort(intervals.begin(), intervals.end());
    for (int i = 1; i < (int)intervals.size(); ++i) {
        if (intervals[i][0] < intervals[i-1][1]) return false;
    }
    return true;
}
```

### 135. Meeting Rooms II
#### Problem
Given meeting time intervals, return the minimum number of conference rooms required to hold all meetings simultaneously.

#### Pattern
**Min-heap of end times.** **O(n log n)** time, **O(n)** space.

#### Explanation
The minimum rooms equals the maximum number of overlapping meetings at any instant. After sorting by start time, process meetings in order: the min-heap tracks the earliest end time among all currently occupied rooms. If the next meeting starts at or after that earliest end (`heap[0] <= s`), the room is free — replace its end time with the new meeting's end (same room count). Otherwise, a new room is needed — push the new end time. `heapreplace` is an atomic pop-push that's slightly more efficient than separate operations. The heap size at the end equals the peak simultaneous count. Don't forget to import `heapq` in Python.

#### Solution

```python
import heapq

def minMeetingRooms(intervals):
    intervals.sort()
    heap = []
    for s, e in intervals:
        if heap and heap[0] <= s:
            heapq.heapreplace(heap, e)
        else:
            heapq.heappush(heap, e)
    return len(heap)
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

fn min_meeting_rooms(mut intervals: Vec<Vec<i32>>) -> i32 {
    intervals.sort_by_key(|iv| iv[0]);
    let mut heap: BinaryHeap<Reverse<i32>> = BinaryHeap::new();
    for iv in &intervals {
        if let Some(&Reverse(top)) = heap.peek() {
            if top <= iv[0] {
                heap.pop();
            }
        }
        heap.push(Reverse(iv[1]));
    }
    heap.len() as i32
}
```

```go
import (
    "container/heap"
    "sort"
)

type MinHeap []int
func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() interface{} {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

func minMeetingRooms(intervals [][]int) int {
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })
    h := &MinHeap{}
    heap.Init(h)
    for _, iv := range intervals {
        if h.Len() > 0 && (*h)[0] <= iv[0] {
            heap.Pop(h)
        }
        heap.Push(h, iv[1])
    }
    return h.Len()
}
```

```cpp
#include <vector>
#include <queue>
#include <algorithm>

int minMeetingRooms(std::vector<std::vector<int>>& intervals) {
    std::sort(intervals.begin(), intervals.end());
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
    for (auto& iv : intervals) {
        if (!heap.empty() && heap.top() <= iv[0]) heap.pop();
        heap.push(iv[1]);
    }
    return (int)heap.size();
}
```

### 136. Minimum Interval to Include Each Query
#### Problem
Given intervals and queries, for each query value return the size (`end - start + 1`) of the smallest interval containing it, or -1 if none.

#### Pattern
**Sort + sweep with min-heap.** **O((n + q) log n)** time, **O(n + q)** space.

#### Explanation
Processing queries offline (sorted) lets us sweep through intervals left to right. As we advance each query `q`, we add all intervals whose start ≤ `q` to a min-heap keyed by size. The heap always contains candidates that have started by `q`. Before reading the answer, evict stale intervals whose end < `q` (they no longer contain `q`). The top of the heap is then the smallest valid interval. Storing results in a dict keyed by query value lets us reconstruct answers in original query order at the end. Eviction is lazy — only pop when the top is invalid — so each interval is pushed and popped at most once.

#### Solution

```python
import heapq

def minInterval(intervals, queries):
    intervals.sort()
    heap = []
    res = {}
    i = 0
    for q in sorted(queries):
        while i < len(intervals) and intervals[i][0] <= q:
            s, e = intervals[i]
            heapq.heappush(heap, (e - s + 1, e))
            i += 1
        while heap and heap[0][1] < q:
            heapq.heappop(heap)
        res[q] = heap[0][0] if heap else -1
    return [res[q] for q in queries]
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use std::collections::HashMap;

fn min_interval(mut intervals: Vec<Vec<i32>>, queries: Vec<i32>) -> Vec<i32> {
    intervals.sort_by_key(|iv| iv[0]);
    let mut sorted_q: Vec<i32> = queries.clone();
    sorted_q.sort();
    let mut heap: BinaryHeap<Reverse<(i32, i32)>> = BinaryHeap::new(); // (size, end)
    let mut res_map: HashMap<i32, i32> = HashMap::new();
    let mut i = 0;
    for q in sorted_q {
        while i < intervals.len() && intervals[i][0] <= q {
            let (s, e) = (intervals[i][0], intervals[i][1]);
            heap.push(Reverse((e - s + 1, e)));
            i += 1;
        }
        while let Some(&Reverse((_, e))) = heap.peek() {
            if e < q { heap.pop(); } else { break; }
        }
        let ans = if let Some(&Reverse((sz, _))) = heap.peek() { sz } else { -1 };
        res_map.insert(q, ans);
    }
    queries.iter().map(|q| *res_map.get(q).unwrap_or(&-1)).collect()
}
```

```go
import (
    "container/heap"
    "sort"
)

type SizeEndHeap [][2]int
func (h SizeEndHeap) Len() int            { return len(h) }
func (h SizeEndHeap) Less(i, j int) bool  { return h[i][0] < h[j][0] }
func (h SizeEndHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *SizeEndHeap) Push(x interface{}) { *h = append(*h, x.([2]int)) }
func (h *SizeEndHeap) Pop() interface{} {
    old := *h; n := len(old); x := old[n-1]; *h = old[:n-1]; return x
}

func minInterval(intervals [][]int, queries []int) []int {
    sort.Slice(intervals, func(i, j int) bool { return intervals[i][0] < intervals[j][0] })
    sortedQ := make([]int, len(queries))
    copy(sortedQ, queries)
    sort.Ints(sortedQ)
    resMap := map[int]int{}
    h := &SizeEndHeap{}
    heap.Init(h)
    idx := 0
    for _, q := range sortedQ {
        for idx < len(intervals) && intervals[idx][0] <= q {
            s, e := intervals[idx][0], intervals[idx][1]
            heap.Push(h, [2]int{e - s + 1, e})
            idx++
        }
        for h.Len() > 0 && (*h)[0][1] < q {
            heap.Pop(h)
        }
        if h.Len() > 0 {
            resMap[q] = (*h)[0][0]
        } else {
            resMap[q] = -1
        }
    }
    out := make([]int, len(queries))
    for i, q := range queries {
        out[i] = resMap[q]
    }
    return out
}
```

```cpp
#include <vector>
#include <queue>
#include <algorithm>
#include <unordered_map>

std::vector<int> minInterval(std::vector<std::vector<int>>& intervals, std::vector<int>& queries) {
    std::sort(intervals.begin(), intervals.end());
    std::vector<int> sortedQ = queries;
    std::sort(sortedQ.begin(), sortedQ.end());
    // min-heap: (size, end)
    using P = std::pair<int,int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> heap;
    std::unordered_map<int,int> resMap;
    int i = 0;
    for (int q : sortedQ) {
        while (i < (int)intervals.size() && intervals[i][0] <= q) {
            int s = intervals[i][0], e = intervals[i][1];
            heap.push({e - s + 1, e});
            ++i;
        }
        while (!heap.empty() && heap.top().second < q) heap.pop();
        resMap[q] = heap.empty() ? -1 : heap.top().first;
    }
    std::vector<int> out;
    for (int q : queries) out.push_back(resMap[q]);
    return out;
}
```

### 137. Rotate Image
#### Problem
Given an `n x n` matrix, rotate it 90 degrees clockwise in-place without using extra space.

#### Pattern
**Transpose then reverse each row.** **O(n²)** time, **O(1)** space.

#### Explanation
A naive approach using a copy matrix is O(n²) space. The in-place trick decomposes the 90° clockwise rotation into two simple operations: (1) transpose — swap `matrix[i][j]` with `matrix[j][i]` for all `i < j`; (2) reverse each row horizontally. After transposing, element `(i, j)` sits at `(j, i)`, and reversing rows maps `(j, i)` to `(j, n-1-i)`, which is exactly the 90° clockwise destination of original `(i, j)`. Both steps are in-place and require only pair swaps. The loop bound `j in range(i+1, n)` avoids double-swapping the diagonal.

#### Solution

```python
def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
```

```rust
fn rotate(matrix: &mut Vec<Vec<i32>>) {
    let n = matrix.len();
    for i in 0..n {
        for j in i + 1..n {
            let tmp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = tmp;
        }
    }
    for row in matrix.iter_mut() {
        row.reverse();
    }
}
```

```go
func rotate(matrix [][]int) {
    n := len(matrix)
    for i := 0; i < n; i++ {
        for j := i + 1; j < n; j++ {
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        }
    }
    for _, row := range matrix {
        for l, r := 0, len(row)-1; l < r; l, r = l+1, r-1 {
            row[l], row[r] = row[r], row[l]
        }
    }
}
```

```cpp
#include <vector>
#include <algorithm>

void rotate(std::vector<std::vector<int>>& matrix) {
    int n = (int)matrix.size();
    for (int i = 0; i < n; ++i)
        for (int j = i + 1; j < n; ++j)
            std::swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix)
        std::reverse(row.begin(), row.end());
}
```

### 138. Spiral Matrix
#### Problem
Given an `m x n` matrix, return all elements in spiral order (right, down, left, up, repeat inward).

#### Pattern
**Shrinking boundary simulation.** **O(m·n)** time, **O(1)** extra space.

#### Explanation
Track four boundaries: `top`, `bottom`, `left`, `right`. Each iteration of the outer loop traverses one full ring: left-to-right on the top row, top-to-bottom on the right column, right-to-left on the bottom row (only if rows remain), bottom-to-top on the left column (only if columns remain). After each traversal, shrink the corresponding boundary inward. The inner guards (`if top <= bottom` and `if left <= right`) prevent double-counting the same row or column when the matrix has an odd number of rows or columns — otherwise a single remaining row would be traversed twice (once top-to-right, once bottom right-to-left).

#### Solution

```python
def spiralOrder(matrix):
    res = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        res += matrix[top][left:right+1]
        top += 1
        for r in range(top, bottom + 1):
            res.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            res += matrix[bottom][left:right+1][::-1]
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                res.append(matrix[r][left])
            left += 1
    return res
```

```rust
fn spiral_order(matrix: Vec<Vec<i32>>) -> Vec<i32> {
    let mut res = Vec::new();
    let (mut top, mut bottom) = (0i32, matrix.len() as i32 - 1);
    let (mut left, mut right) = (0i32, matrix[0].len() as i32 - 1);
    while top <= bottom && left <= right {
        for c in left..=right { res.push(matrix[top as usize][c as usize]); }
        top += 1;
        for r in top..=bottom { res.push(matrix[r as usize][right as usize]); }
        right -= 1;
        if top <= bottom {
            for c in (left..=right).rev() { res.push(matrix[bottom as usize][c as usize]); }
            bottom -= 1;
        }
        if left <= right {
            for r in (top..=bottom).rev() { res.push(matrix[r as usize][left as usize]); }
            left += 1;
        }
    }
    res
}
```

```go
func spiralOrder(matrix [][]int) []int {
    res := []int{}
    top, bottom := 0, len(matrix)-1
    left, right := 0, len(matrix[0])-1
    for top <= bottom && left <= right {
        for c := left; c <= right; c++ { res = append(res, matrix[top][c]) }
        top++
        for r := top; r <= bottom; r++ { res = append(res, matrix[r][right]) }
        right--
        if top <= bottom {
            for c := right; c >= left; c-- { res = append(res, matrix[bottom][c]) }
            bottom--
        }
        if left <= right {
            for r := bottom; r >= top; r-- { res = append(res, matrix[r][left]) }
            left++
        }
    }
    return res
}
```

```cpp
#include <vector>

std::vector<int> spiralOrder(std::vector<std::vector<int>>& matrix) {
    std::vector<int> res;
    int top = 0, bottom = (int)matrix.size() - 1;
    int left = 0, right = (int)matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; ++c) res.push_back(matrix[top][c]);
        ++top;
        for (int r = top; r <= bottom; ++r) res.push_back(matrix[r][right]);
        --right;
        if (top <= bottom) {
            for (int c = right; c >= left; --c) res.push_back(matrix[bottom][c]);
            --bottom;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; --r) res.push_back(matrix[r][left]);
            ++left;
        }
    }
    return res;
}
```

### 139. Set Matrix Zeroes
#### Problem
Given an `m x n` matrix, if any element is 0, set its entire row and column to 0, in-place.

#### Pattern
**Use first row/column as markers.** **O(m·n)** time, **O(1)** space.

#### Explanation
A naive approach stores all zero positions in a set — O(m + n) space. The trick: repurpose `matrix[r][0]` and `matrix[0][c]` as markers for "row r should be zeroed" and "column c should be zeroed". But this collides on `matrix[0][0]`, so track the first row and first column separately with two booleans before any marking. Then scan the interior (rows/cols 1+) to mark. Then zero the interior based on markers. Finally, zero the first row and column if their original booleans were set. The order matters: mark before zeroing, and handle the first row/col last to avoid using a zeroed marker prematurely.

#### Solution

```python
def setZeroes(matrix):
    rows, cols = len(matrix), len(matrix[0])
    first_row = any(matrix[0][c] == 0 for c in range(cols))
    first_col = any(matrix[r][0] == 0 for r in range(rows))
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][c] == 0:
                matrix[r][0] = matrix[0][c] = 0
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][0] == 0 or matrix[0][c] == 0:
                matrix[r][c] = 0
    if first_row:
        for c in range(cols):
            matrix[0][c] = 0
    if first_col:
        for r in range(rows):
            matrix[r][0] = 0
```

```rust
fn set_zeroes(matrix: &mut Vec<Vec<i32>>) {
    let rows = matrix.len();
    let cols = matrix[0].len();
    let first_row = (0..cols).any(|c| matrix[0][c] == 0);
    let first_col = (0..rows).any(|r| matrix[r][0] == 0);
    for r in 1..rows {
        for c in 1..cols {
            if matrix[r][c] == 0 {
                matrix[r][0] = 0;
                matrix[0][c] = 0;
            }
        }
    }
    for r in 1..rows {
        for c in 1..cols {
            if matrix[r][0] == 0 || matrix[0][c] == 0 {
                matrix[r][c] = 0;
            }
        }
    }
    if first_row { for c in 0..cols { matrix[0][c] = 0; } }
    if first_col { for r in 0..rows { matrix[r][0] = 0; } }
}
```

```go
func setZeroes(matrix [][]int) {
    rows, cols := len(matrix), len(matrix[0])
    firstRow, firstCol := false, false
    for c := 0; c < cols; c++ { if matrix[0][c] == 0 { firstRow = true } }
    for r := 0; r < rows; r++ { if matrix[r][0] == 0 { firstCol = true } }
    for r := 1; r < rows; r++ {
        for c := 1; c < cols; c++ {
            if matrix[r][c] == 0 { matrix[r][0] = 0; matrix[0][c] = 0 }
        }
    }
    for r := 1; r < rows; r++ {
        for c := 1; c < cols; c++ {
            if matrix[r][0] == 0 || matrix[0][c] == 0 { matrix[r][c] = 0 }
        }
    }
    if firstRow { for c := 0; c < cols; c++ { matrix[0][c] = 0 } }
    if firstCol { for r := 0; r < rows; r++ { matrix[r][0] = 0 } }
}
```

```cpp
#include <vector>

void setZeroes(std::vector<std::vector<int>>& matrix) {
    int rows = (int)matrix.size(), cols = (int)matrix[0].size();
    bool firstRow = false, firstCol = false;
    for (int c = 0; c < cols; ++c) if (matrix[0][c] == 0) firstRow = true;
    for (int r = 0; r < rows; ++r) if (matrix[r][0] == 0) firstCol = true;
    for (int r = 1; r < rows; ++r)
        for (int c = 1; c < cols; ++c)
            if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
    for (int r = 1; r < rows; ++r)
        for (int c = 1; c < cols; ++c)
            if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
    if (firstRow) for (int c = 0; c < cols; ++c) matrix[0][c] = 0;
    if (firstCol) for (int r = 0; r < rows; ++r) matrix[r][0] = 0;
}
```

### 140. Happy Number
#### Problem
A number is "happy" if repeatedly replacing it with the sum of squares of its digits eventually reaches 1. Return whether `n` is happy.

#### Pattern
**Floyd's cycle detection (fast/slow pointers).** **O(log n)** time per step, **O(1)** space.

#### Explanation
If `n` is not happy, the digit-square sequence enters a cycle (it's proven to always include 4). A hashset approach detects the cycle but uses O(k) space for cycle length `k`. Floyd's algorithm avoids that: run a slow pointer one step at a time and a fast pointer two steps at a time. If they meet and `fast != 1`, a cycle was detected (unhappy). If `fast == 1`, the number is happy. The `next_n` function converts to string to cleanly iterate digits — simple and correct. In practice the cycle is short, so this terminates quickly.

#### Solution

```python
def isHappy(n):
    def next_n(x):
        return sum(int(d) ** 2 for d in str(x))
    slow, fast = n, next_n(n)
    while fast != 1 and slow != fast:
        slow = next_n(slow)
        fast = next_n(next_n(fast))
    return fast == 1
```

```rust
fn is_happy(n: i32) -> bool {
    fn next_n(mut x: i32) -> i32 {
        let mut s = 0;
        while x > 0 {
            let d = x % 10;
            s += d * d;
            x /= 10;
        }
        s
    }
    let mut slow = n;
    let mut fast = next_n(n);
    while fast != 1 && slow != fast {
        slow = next_n(slow);
        fast = next_n(next_n(fast));
    }
    fast == 1
}
```

```go
func isHappy(n int) bool {
    nextN := func(x int) int {
        s := 0
        for x > 0 {
            d := x % 10
            s += d * d
            x /= 10
        }
        return s
    }
    slow, fast := n, nextN(n)
    for fast != 1 && slow != fast {
        slow = nextN(slow)
        fast = nextN(nextN(fast))
    }
    return fast == 1
}
```

```cpp
#include <functional>

bool isHappy(int n) {
    auto nextN = [](int x) {
        int s = 0;
        while (x > 0) { int d = x % 10; s += d * d; x /= 10; }
        return s;
    };
    int slow = n, fast = nextN(n);
    while (fast != 1 && slow != fast) {
        slow = nextN(slow);
        fast = nextN(nextN(fast));
    }
    return fast == 1;
}
```

### 141. Plus One
#### Problem
Given a non-negative integer represented as an array of its digits (most significant first), increment it by one and return the resulting array.

#### Pattern
**Carry propagation from least-significant digit.** **O(n)** time, **O(1)** extra space.

#### Explanation
Iterate from the least significant digit (rightmost) toward the most significant. If the current digit is less than 9, simply increment it and return — no carry propagates. If it is 9, set it to 0 (carries over) and continue left. The only case requiring an extra digit is an all-9 number (e.g., `[9,9,9]` → `[1,0,0,0]`): after the loop exits all digits are 0, so prepend a 1. This is equivalent to grade-school addition but without needing to handle general multi-digit addends.

#### Solution

```python
def plusOne(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits
```

```rust
fn plus_one(mut digits: Vec<i32>) -> Vec<i32> {
    for i in (0..digits.len()).rev() {
        if digits[i] < 9 {
            digits[i] += 1;
            return digits;
        }
        digits[i] = 0;
    }
    digits.insert(0, 1);
    digits
}
```

```go
func plusOne(digits []int) []int {
    for i := len(digits) - 1; i >= 0; i-- {
        if digits[i] < 9 {
            digits[i]++
            return digits
        }
        digits[i] = 0
    }
    return append([]int{1}, digits...)
}
```

```cpp
#include <vector>

std::vector<int> plusOne(std::vector<int>& digits) {
    for (int i = (int)digits.size() - 1; i >= 0; --i) {
        if (digits[i] < 9) { ++digits[i]; return digits; }
        digits[i] = 0;
    }
    digits.insert(digits.begin(), 1);
    return digits;
}
```

### 142. Pow(x, n)
#### Problem
Implement `pow(x, n)` — compute `x` raised to the power `n`, where `n` can be negative.

#### Pattern
**Fast exponentiation (binary exponentiation).** **O(log n)** time, **O(1)** space.

#### Explanation
Naive repeated multiplication is O(n). Binary exponentiation halves the exponent each step: if `n` is odd, multiply the result by the current `x` (capturing the "leftover" factor), then square `x` and halve `n`. This processes each bit of `n` once, giving O(log n) multiplications. Negative exponents are handled by inverting `x` and negating `n` upfront. Watch for the edge case where `n == INT_MIN` in languages with fixed-width integers: `-INT_MIN` overflows — use unsigned or cast to 64-bit before negating. Python handles this transparently with arbitrary-precision integers.

#### Solution

```python
def myPow(x, n):
    if n < 0:
        x, n = 1 / x, -n
    res = 1
    while n:
        if n % 2:
            res *= x
        x *= x
        n //= 2
    return res
```

```rust
fn my_pow(mut x: f64, mut n: i32) -> f64 {
    if n < 0 {
        x = 1.0 / x;
        // handle INT_MIN safely
        let mut res = 1.0f64;
        let mut m = -(n as i64) as u64;
        while m > 0 {
            if m & 1 == 1 { res *= x; }
            x *= x;
            m >>= 1;
        }
        return res;
    }
    let mut res = 1.0f64;
    let mut m = n as u64;
    while m > 0 {
        if m & 1 == 1 { res *= x; }
        x *= x;
        m >>= 1;
    }
    res
}
```

```go
func myPow(x float64, n int) float64 {
    if n < 0 {
        x = 1 / x
        n = -n
    }
    res := 1.0
    for n > 0 {
        if n%2 == 1 {
            res *= x
        }
        x *= x
        n /= 2
    }
    return res
}
```

```cpp
#include <cstdint>

double myPow(double x, int n) {
    long long m = n;
    if (m < 0) { x = 1.0 / x; m = -m; }
    double res = 1.0;
    while (m > 0) {
        if (m & 1) res *= x;
        x *= x;
        m >>= 1;
    }
    return res;
}
```

### 143. Multiply Strings
#### Problem
Given two non-negative integers as strings `num1` and `num2`, return their product as a string without converting them to integers directly.

#### Pattern
**Grade-school multiplication with position arithmetic.** **O(m·n)** time, **O(m + n)** space.

#### Explanation
Digit `num1[i]` and `num2[j]` contribute to positions `i+j` (tens carry) and `i+j+1` (units) in the result array (both indices from the left, with the result array of length `m+n`). Process digits right-to-left for both numbers. At each pair, multiply the digits, add to `res[p2]`, then propagate the carry to `res[p1]`. This is exactly what you do by hand. At the end, strip leading zeros and convert. The early-exit for "0" avoids leading-zero issues in the output (`lstrip("0")` on an empty product would return `""` instead of `"0"`).

#### Solution

```python
def multiply(num1, num2):
    if "0" in [num1, num2]:
        return "0"
    res = [0] * (len(num1) + len(num2))
    for i in range(len(num1) - 1, -1, -1):
        for j in range(len(num2) - 1, -1, -1):
            mul = int(num1[i]) * int(num2[j])
            p1, p2 = i + j, i + j + 1
            total = mul + res[p2]
            res[p2] = total % 10
            res[p1] += total // 10
    return "".join(map(str, res)).lstrip("0")
```

```rust
fn multiply(num1: String, num2: String) -> String {
    if num1 == "0" || num2 == "0" { return "0".to_string(); }
    let n1: Vec<u32> = num1.bytes().map(|b| (b - b'0') as u32).collect();
    let n2: Vec<u32> = num2.bytes().map(|b| (b - b'0') as u32).collect();
    let m = n1.len(); let n = n2.len();
    let mut res = vec![0u32; m + n];
    for i in (0..m).rev() {
        for j in (0..n).rev() {
            let mul = n1[i] * n2[j];
            let p2 = i + j + 1;
            let total = mul + res[p2];
            res[p2] = total % 10;
            res[i + j] += total / 10;
        }
    }
    let s: String = res.iter().map(|d| char::from_digit(*d, 10).unwrap()).collect();
    s.trim_start_matches('0').to_string()
}
```

```go
import "strings"

func multiply(num1 string, num2 string) string {
    if num1 == "0" || num2 == "0" { return "0" }
    m, n := len(num1), len(num2)
    res := make([]int, m+n)
    for i := m - 1; i >= 0; i-- {
        for j := n - 1; j >= 0; j-- {
            mul := int(num1[i]-'0') * int(num2[j]-'0')
            p2 := i + j + 1
            total := mul + res[p2]
            res[p2] = total % 10
            res[i+j] += total / 10
        }
    }
    sb := strings.Builder{}
    for _, d := range res { sb.WriteByte(byte('0' + d)) }
    return strings.TrimLeft(sb.String(), "0")
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

std::string multiply(std::string num1, std::string num2) {
    if (num1 == "0" || num2 == "0") return "0";
    int m = (int)num1.size(), n = (int)num2.size();
    std::vector<int> res(m + n, 0);
    for (int i = m - 1; i >= 0; --i) {
        for (int j = n - 1; j >= 0; --j) {
            int mul = (num1[i] - '0') * (num2[j] - '0');
            int total = mul + res[i + j + 1];
            res[i + j + 1] = total % 10;
            res[i + j] += total / 10;
        }
    }
    std::string s;
    for (int d : res) s += char('0' + d);
    auto start = s.find_first_not_of('0');
    return start == std::string::npos ? "0" : s.substr(start);
}
```

### 144. Detect Squares
#### Problem
Design a data structure supporting `add(point)` and `count(point)` — the latter returns the number of ways to form an axis-aligned square using the query point as one corner and three previously added points.

#### Pattern
**Count map + enumerate diagonal partners.** **O(1)** add, **O(n)** count per query, **O(n)** space.

#### Explanation
An axis-aligned square is fully determined by any diagonal pair of its corners. Fix the query point `(px, py)` as one corner. For every other point `(x, y)` in the set, check if it forms a valid diagonal with `(px, py)`: the distances along both axes must be equal and non-zero (`abs(py - y) == abs(px - x)` and `x != px`). If so, the other two corners are `(x, py)` and `(px, y)` — multiply their counts (duplicate points can independently contribute). Iterating over a deduplicated point set keeps the count loop at O(distinct points). Storing separate `pt_counts` and `pts` set makes it easy to handle duplicate additions.

#### Solution

```python
class DetectSquares:
    def __init__(self):
        self.pt_counts = {}
        self.pts = set()

    def add(self, point):
        p = tuple(point)
        self.pt_counts[p] = self.pt_counts.get(p, 0) + 1
        self.pts.add(p)

    def count(self, point):
        px, py = point
        res = 0
        for x, y in self.pts:
            if abs(py - y) != abs(px - x) or x == px:
                continue
            res += self.pt_counts.get((x, py), 0) * self.pt_counts.get((px, y), 0)
        return res
```

```rust
use std::collections::{HashMap, HashSet};

struct DetectSquares {
    pt_counts: HashMap<(i32, i32), i32>,
    pts: HashSet<(i32, i32)>,
}

impl DetectSquares {
    fn new() -> Self {
        Self { pt_counts: HashMap::new(), pts: HashSet::new() }
    }
    fn add(&mut self, point: Vec<i32>) {
        let p = (point[0], point[1]);
        *self.pt_counts.entry(p).or_insert(0) += 1;
        self.pts.insert(p);
    }
    fn count(&self, point: Vec<i32>) -> i32 {
        let (px, py) = (point[0], point[1]);
        let mut res = 0;
        for &(x, y) in &self.pts {
            if (py - y).abs() != (px - x).abs() || x == px { continue; }
            let c1 = *self.pt_counts.get(&(x, py)).unwrap_or(&0);
            let c2 = *self.pt_counts.get(&(px, y)).unwrap_or(&0);
            res += c1 * c2;
        }
        res
    }
}
```

```go
type DetectSquares struct {
    ptCounts map[[2]int]int
    pts      map[[2]int]bool
}

func Constructor() DetectSquares {
    return DetectSquares{ptCounts: map[[2]int]int{}, pts: map[[2]int]bool{}}
}

func (ds *DetectSquares) Add(point []int) {
    p := [2]int{point[0], point[1]}
    ds.ptCounts[p]++
    ds.pts[p] = true
}

func (ds *DetectSquares) Count(point []int) int {
    px, py := point[0], point[1]
    res := 0
    for p := range ds.pts {
        x, y := p[0], p[1]
        dx, dy := px-x, py-y
        if dx < 0 { dx = -dx }
        if dy < 0 { dy = -dy }
        if dx != dy || x == px { continue }
        res += ds.ptCounts[[2]int{x, py}] * ds.ptCounts[[2]int{px, y}]
    }
    return res
}
```

```cpp
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <cmath>
#include <string>

struct PairHash {
    size_t operator()(std::pair<int,int> p) const {
        return std::hash<long long>()((long long)p.first << 32 | (unsigned)p.second);
    }
};

class DetectSquares {
    std::unordered_map<std::pair<int,int>, int, PairHash> ptCounts;
    std::unordered_set<std::pair<int,int>, PairHash> pts;
public:
    void add(std::vector<int> point) {
        auto p = std::make_pair(point[0], point[1]);
        ptCounts[p]++;
        pts.insert(p);
    }
    int count(std::vector<int> point) {
        int px = point[0], py = point[1], res = 0;
        for (auto& [x, y] : pts) {
            if (std::abs(py - y) != std::abs(px - x) || x == px) continue;
            auto it1 = ptCounts.find({x, py}), it2 = ptCounts.find({px, y});
            int c1 = it1 != ptCounts.end() ? it1->second : 0;
            int c2 = it2 != ptCounts.end() ? it2->second : 0;
            res += c1 * c2;
        }
        return res;
    }
};
```

### 145. Single Number
#### Problem
Given an array where every element appears exactly twice except one, find that single element. Must run in O(n) time and O(1) space.

#### Pattern
**XOR (self-canceling pairs).** **O(n)** time, **O(1)** space.

#### Explanation
A hashset approach finds the answer in O(n) time but uses O(n) space. XOR is the key: `a ^ a == 0` (any value XORed with itself cancels) and `a ^ 0 == a` (identity). XOR is also commutative and associative, so XORing all elements together causes every duplicated number to cancel, leaving only the single element. No sorting, no extra memory, just one pass. This is one of the most elegant constant-space tricks in competitive programming.

#### Solution

```python
def singleNumber(nums):
    res = 0
    for n in nums:
        res ^= n
    return res
```

```rust
fn single_number(nums: Vec<i32>) -> i32 {
    nums.iter().fold(0, |acc, &n| acc ^ n)
}
```

```go
func singleNumber(nums []int) int {
    res := 0
    for _, n := range nums {
        res ^= n
    }
    return res
}
```

```cpp
#include <vector>

int singleNumber(std::vector<int>& nums) {
    int res = 0;
    for (int n : nums) res ^= n;
    return res;
}
```

### 146. Number of 1 Bits
#### Problem
Return the number of `1` bits (Hamming weight) in the binary representation of an unsigned 32-bit integer.

#### Pattern
**Bit manipulation — Brian Kernighan's trick.** **O(k)** time where k = number of set bits, **O(1)** space.

#### Explanation
A naive approach tests each of the 32 bits individually — always 32 iterations. Brian Kernighan's trick is faster: `n & (n - 1)` clears the lowest set bit of `n` in one operation. Why? Subtracting 1 flips the lowest set bit to 0 and all bits below it to 1; ANDing with the original clears those bits. Incrementing a counter each iteration counts exactly as many set bits as there are. The loop runs only `k` times (number of set bits), which is at most 32. For sparse bit patterns this is meaningfully faster, and it reads more clearly than masking each bit individually.

#### Solution

```python
def hammingWeight(n):
    res = 0
    while n:
        n &= n - 1
        res += 1
    return res
```

```rust
fn hamming_weight(n: u32) -> i32 {
    n.count_ones() as i32
}
```

```go
import "math/bits"

func hammingWeight(n uint32) int {
    return bits.OnesCount32(n)
}
```

```cpp
#include <cstdint>
#include <bit>

int hammingWeight(uint32_t n) {
    return __builtin_popcount(n);
}
```

### 147. Counting Bits
#### Problem
Given `n`, return an array `ans` of length `n + 1` where `ans[i]` is the number of `1` bits in `i`.

#### Pattern
**DP with LSB recurrence.** **O(n)** time, **O(n)** space.

#### Explanation
Computing popcount for each number independently is O(n · 32) — fine for small n but wastes prior work. The recurrence `dp[i] = dp[i >> 1] + (i & 1)` reuses already-computed results: `i >> 1` is `i` with its last bit removed (already in `dp`), and `(i & 1)` adds 1 if `i` is odd. Since `i >> 1 < i`, `dp[i >> 1]` is always available when computing `dp[i]`. Base case `dp[0] = 0` is correct. This builds the entire table in a single O(n) pass with no branching or popcount instruction needed.

#### Solution

```python
def countBits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
```

```rust
fn count_bits(n: i32) -> Vec<i32> {
    let mut dp = vec![0i32; (n + 1) as usize];
    for i in 1..=(n as usize) {
        dp[i] = dp[i >> 1] + (i & 1) as i32;
    }
    dp
}
```

```go
func countBits(n int) []int {
    dp := make([]int, n+1)
    for i := 1; i <= n; i++ {
        dp[i] = dp[i>>1] + i&1
    }
    return dp
}
```

```cpp
#include <vector>

std::vector<int> countBits(int n) {
    std::vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; ++i)
        dp[i] = dp[i >> 1] + (i & 1);
    return dp;
}
```

### 148. Reverse Bits
#### Problem
Reverse the bits of a given 32-bit unsigned integer and return the result.

#### Pattern
**Bit manipulation — shift and OR 32 times.** **O(1)** time, **O(1)** space.

#### Explanation
There are exactly 32 bits to reverse. At each step: shift `res` left by 1 to make room, then OR in the least significant bit of `n` (`n & 1`), then shift `n` right by 1 to expose the next bit. After 32 iterations, `res` holds the reversed bit pattern. This is O(1) because the loop bound is constant (32). Rust and Go expose this as a standard library intrinsic (`reverse_bits` / `bits.Reverse32`) backed by a single CPU instruction on modern hardware. Python integers are arbitrary-precision, so no special masking is needed — the problem constraints guarantee a 32-bit input.

#### Solution

```python
def reverseBits(n):
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)
        n >>= 1
    return res
```

```rust
fn reverse_bits(n: u32) -> u32 {
    n.reverse_bits()
}
```

```go
import "math/bits"

func reverseBits(num uint32) uint32 {
    return bits.Reverse32(num)
}
```

```cpp
#include <cstdint>

uint32_t reverseBits(uint32_t n) {
    uint32_t res = 0;
    for (int i = 0; i < 32; ++i) {
        res = (res << 1) | (n & 1);
        n >>= 1;
    }
    return res;
}
```

### 149. Missing Number
#### Problem
Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the one number missing from the range.

#### Pattern
**Gauss summation formula.** **O(n)** time, **O(1)** space.

#### Explanation
A sorting approach is O(n log n). A hashset approach is O(n) time but O(n) space. The Gauss formula `n * (n + 1) / 2` gives the expected sum of `0..n`. Subtracting the actual array sum leaves exactly the missing number — neat, branchless, and constant space. An XOR alternative also works: XOR all indices 0..n with all array values; every present number cancels, leaving the missing one. The Gauss approach is slightly more readable. Watch for integer overflow in languages with fixed-width types — use 64-bit integers if `n` is large.

#### Solution

```python
def missingNumber(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)
```

```rust
fn missing_number(nums: Vec<i32>) -> i32 {
    let n = nums.len() as i32;
    n * (n + 1) / 2 - nums.iter().sum::<i32>()
}
```

```go
func missingNumber(nums []int) int {
    n := len(nums)
    expected := n * (n + 1) / 2
    actual := 0
    for _, v := range nums {
        actual += v
    }
    return expected - actual
}
```

```cpp
#include <vector>
#include <numeric>

int missingNumber(std::vector<int>& nums) {
    int n = (int)nums.size();
    int expected = n * (n + 1) / 2;
    return expected - std::accumulate(nums.begin(), nums.end(), 0);
}
```

### 150. Sum of Two Integers
#### Problem
Calculate the sum of two integers `a` and `b` without using the `+` or `-` operators.

#### Pattern
**Bit manipulation (simulate full adder).** **O(1)** time, **O(1)** space.

#### Explanation
A hardware full adder computes sum and carry separately. `a ^ b` gives the sum bits with no carry; `(a & b) << 1` gives the carry bits shifted into the next position. Repeat until carry is zero — at most 32 iterations for 32-bit integers. In Python, integers are arbitrary-precision and can be negative without a fixed width, so `b` might never reach zero with naive shifting. The fix: apply `mask = 0xFFFFFFFF` to keep `b` in 32-bit range during iteration, then interpret `a` as a signed 32-bit value at the end (`a & mask` converts it). In Rust/Go/C++ the fixed-width types handle this naturally without masking.

#### Solution

```python
def getSum(a, b):
    mask = 0xFFFFFFFF
    while b & mask:
        carry = (a & b) << 1
        a ^= b
        b = carry
    return a if b == 0 else a & mask
```

```rust
fn get_sum(mut a: i32, mut b: i32) -> i32 {
    while b != 0 {
        let carry = ((a & b) as u32) << 1;
        a ^= b;
        b = carry as i32;
    }
    a
}
```

```go
func getSum(a int, b int) int {
    for b != 0 {
        carry := (a & b) << 1
        a ^= b
        b = carry
    }
    return a
}
```

```cpp
int getSum(int a, int b) {
    while (b != 0) {
        unsigned carry = (unsigned)(a & b) << 1;
        a ^= b;
        b = (int)carry;
    }
    return a;
}
```
