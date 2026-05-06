---
created-on: "[[Journal/2026/April/12-Apr-Sunday]]"
ctime: 2026-04-12 20:02:45
categories:
  - "[[Categories/Algorithms|Algorithms]]"
---
### 1. Two Sum

#### Problem
Given an array and target, return indices of two numbers that add to target.
#### Pattern
Hashmap

#### Solution

``` Python
def twoSum(self, nums, target):
    seen = {}
    for i, n in enumerate(nums):
        comp = target - n
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i
```
### 2. Add Two Numbers
#### Problem
Add two numbers stored as reversed linked lists and return the sum as a linked list.
#### Pattern
Linked List traversal

#### Solution
``` Python
def addTwoNumbers(self, l1, l2):
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

### 3. Median of Two Sorted Arrays 
#### Problem
Find the median of two sorted arrays in O(log(min(m,n))) time.
#### Pattern
Binary Search
**O(log(min(m,n)))** time, **O(1)**
#### Solution
``` Python
def findMedianSortedArrays(self, nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    lo, hi = 0, m
    half = (m + n + 1) // 2

    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i

        left1 = nums1[i - 1] if i > 0 else float('-inf')
        left2 = nums2[j - 1] if j > 0 else float('-inf')
        right1 = nums1[i] if i < m else float('inf')
        right2 = nums2[j] if j < n else float('inf')

        if left1 <= right2 and left2 <= right1:
            if (m + n) % 2:
                return max(left1, left2)
            return (max(left1, left2) + min(right1, right2)) / 2
        elif left1 > right2:
            hi = i - 1
        else:
            lo = i + 1
```

### 4. Longest Palindromic Substring

#### Problem
Return the longest substring of s that is a palindrome.
#### Pattern
Expand Around Center
**O(n²)** time, **O(1)** space
#### Solution
``` Python
def longestPalindrome(self, s):
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
### 5. Coin Change II

#### Problem
Count the number of combinations that make up a given amount using coins.
#### Pattern
DP (Unbounded Knapsack)
**O(n * amount)** time, **O(amount)** space
#### Solution
``` Python
def change(self, amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1
    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin]
    return dp[amount]
```

### 6. Reverse Integer 
#### Problem
Reverse the digits of a 32-bit signed integer, returning 0 on overflow.
#### Pattern
Math
**O(log x)** time, **O(1)** space
#### Solution
``` Python
def reverse(self, x):
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

### 7. Contains Duplicate
#### Problem
Return true if any value appears at least twice in the array.
#### Pattern
Hashset
**O(n)** time, **O(n)** space
#### Solution
``` Python
def containsDuplicate(self, nums):
    return len(nums) != len(set(nums))
```

### 8. Valid Anagram
#### Problem
Return true if t is an anagram of s.
#### Pattern
Frequency Array
**O(n)** time, **O(1)** space
#### Solution
``` Python
def isAnagram(self, s, t):
    if len(s) != len(t): return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a) - ord('a')] += 1
        count[ord(b) - ord('a')] -= 1
	    return all(c == 0 for c in count)
```

### 9. Group Anagrams
#### Problem
Group an array of strings by their anagram equivalence class.
#### Pattern
Hashmap keyed by sorted string
**O(n * k log k)** time, **O(n)** space
#### Solution
``` Python
def groupAnagrams(self, strs):
    groups = {}
    for s in strs:
        key = tuple(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

### 10. Top K Frequent Elements
#### Problem
Return the k most frequent elements in an array.
#### Pattern
Bucket Sort
**O(n)** time, **O(n)** space
#### Solution
``` Python
def topKFrequent(self, nums, k):
    count = {}
    for n in nums: count[n] = count.get(n, 0) + 1
    buckets = [[] for _ in range(len(nums) + 1)]
    for n, c in count.items():
        buckets[c].append(n)
    res = []
    for i in range(len(buckets) - 1, 0, -1):
        res.extend(buckets[i])
        if len(res) >= k:
            return res[:k]
```

### 11. Encode and Decode Strings
#### Problem
Design an algorithm to serialize and deserialize a list of strings.
#### Pattern
Length-prefix encoding
**O(n)** time, **O(n)** space
#### Solution
``` Python
def encode(self, strs):
    return "".join(f"{len(s)}#{s}" for s in strs)

def decode(self, s):
    res, i = [], 0
    while i < len(s):
        j = s.index("#", i)
        length = int(s[i:j])
        res.append(s[j+1:j+1+length])
        i = j + 1 + length
    return res
```

### 12. Product of Array Except Self
#### Problem
Return an array where each element is the product of all other elements.
#### Pattern
Prefix & suffix products
**O(n)** time, **O(1)** extra space
#### Solution
``` Python
def productExceptSelf(self, nums):
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

### 13. Valid Sudoku
#### Problem
Determine if a 9×9 board is a valid (not necessarily solved) Sudoku.
#### Pattern
Hashset per row/col/box
**O(1)** time/space (fixed 9x9)
#### Solution
``` Python
def isValidSudoku(self, board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == ".": continue
            b = (r // 3) * 3 + (c // 3)
            if v in rows[r] or v in cols[c] or v in boxes[b]:
                return False
            rows[r].add(v); cols[c].add(v); boxes[b].add(v)
    return True
```

### 14. Longest Consecutive Sequence
#### Problem
Find the length of the longest sequence of consecutive integers in O(n).
#### Pattern
Hashset, find sequence starts
**O(n)** time, **O(n)** space
#### Solution
``` Python
def longestConsecutive(self, nums):
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

### 15. Valid Palindrome
#### Problem
Check if a string is a palindrome ignoring non-alphanumeric characters and case.
#### Pattern
Two Pointers
**O(n)** time, **O(1)** space
#### Solution
``` Python
def isPalindrome(self, s):
    l, r = 0, len(s) - 1
    while l < r:
        while l < r and not s[l].isalnum(): l += 1
        while l < r and not s[r].isalnum(): r -= 1
        if s[l].lower() != s[r].lower(): return False
        l += 1; r -= 1
    return True
```

### 16. Two Sum II
#### Problem
Find two numbers in a sorted array that sum to a target, using O(1) space.
#### Pattern
Two Pointers (sorted input)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def twoSum(self, numbers, target):
    l, r = 0, len(numbers) - 1
    while l < r:
        s = numbers[l] + numbers[r]
        if s == target: return [l+1, r+1]
        elif s < target: l += 1
        else: r -= 1
```

### 17. 3Sum
#### Problem
Find all unique triplets in an array that sum to zero.
#### Pattern
Sort + Two Pointers
**O(n²)** time, **O(1)** space
#### Solution
``` Python
def threeSum(self, nums):
    nums.sort()
    res = []
    for i, n in enumerate(nums):
        if i > 0 and n == nums[i-1]: continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = n + nums[l] + nums[r]
            if s == 0:
                res.append([n, nums[l], nums[r]])
                l += 1
                while l < r and nums[l] == nums[l-1]: l += 1
            elif s < 0: l += 1
            else: r -= 1
    return res
```

### 18. Container With Most Water
#### Problem
Find two lines that together with the x-axis form the largest container.
#### Pattern
Two Pointers, move smaller side
**O(n)** time, **O(1)** space
#### Solution
``` Python
def maxArea(self, height):
    l, r = 0, len(height) - 1
    res = 0
    while l < r:
        res = max(res, min(height[l], height[r]) * (r - l))
        if height[l] < height[r]: l += 1
        else: r -= 1
    return res
```

### 19. Trapping Rain Water
#### Problem
Compute how much water can be trapped between elevation bars.
#### Pattern
Two Pointers, track max left/right
**O(n)** time, **O(1)** space
#### Solution
``` Python
def trap(self, height):
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

### 20. Best Time to Buy and Sell Stock
#### Problem
Find the maximum profit from one buy and one sell.
#### Pattern
Sliding Window (track min price)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def maxProfit(self, prices):
    buy, profit = prices[0], 0
    for p in prices[1:]:
        profit = max(profit, p - buy)
        buy = min(buy, p)
    return profit
```

### 21. Longest Substring Without Repeating Characters
#### Problem
Find the length of the longest substring with no repeated characters.
#### Pattern
Sliding Window + Hashset
**O(n)** time, **O(n)** space
#### Solution
``` Python
def lengthOfLongestSubstring(self, s):
    seen = set()
    l = res = 0
    for r, c in enumerate(s):
        while c in seen:
            seen.remove(s[l]); l += 1
        seen.add(c)
        res = max(res, r - l + 1)
    return res
```

### 22. Longest Repeating Character Replacement
#### Problem
Find the longest substring achievable by replacing at most k characters with any letter.
#### Pattern
Sliding Window, track max freq char
**O(n)** time, **O(1)** space
#### Solution
``` Python
def characterReplacement(self, s, k):
    count = {}
    l = res = 0
    for r, c in enumerate(s):
        count[c] = count.get(c, 0) + 1
        while (r - l + 1) - max(count.values()) > k:
            count[s[l]] -= 1; l += 1
        res = max(res, r - l + 1)
    return res
```

### 23. Permutation in String
#### Problem
Return true if any permutation of s1 is a substring of s2.
#### Pattern
Sliding Window, fixed-size frequency match
**O(n)** time, **O(1)** space
#### Solution
``` Python
def checkInclusion(self, s1, s2):
    if len(s1) > len(s2): return False
    s1_count = [0] * 26
    window = [0] * 26
    for c in s1: s1_count[ord(c) - ord('a')] += 1
    for c in s2[:len(s1)]: window[ord(c) - ord('a')] += 1
    if s1_count == window: return True
    for i in range(len(s1), len(s2)):
        window[ord(s2[i]) - ord('a')] += 1
        window[ord(s2[i - len(s1)]) - ord('a')] -= 1
        if s1_count == window: return True
    return False
```

### 24. Minimum Window Substring
#### Problem
Find the smallest window in s containing all characters of t.
#### Pattern
Sliding Window, shrink when valid
**O(n)** time, **O(n)** space
#### Solution
``` Python
def minWindow(self, s, t):
    need = {}
    for c in t: need[c] = need.get(c, 0) + 1
    missing = len(t)
    l = start = end = 0
    for r, c in enumerate(s, 1):
        if need[c] > 0: missing -= 1
        need[c] -= 1
        if missing == 0:
            while need[s[l]] < 0:
                need[s[l]] += 1; l += 1
            if not end or r - l < end - start:
                start, end = l, r
            need[s[l]] += 1; missing += 1; l += 1
    return s[start:end]
```

### 25. Sliding Window Maximum
#### Problem
Return the maximum value in each sliding window of size k.
#### Pattern
Monotonic Deque
**O(n)** time, **O(k)** space
#### Solution
``` Python
def maxSlidingWindow(self, nums, k):
    dq = deque()
    res = []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n: dq.pop()
        dq.append(i)
        if dq[0] == i - k: dq.popleft()
        if i >= k - 1: res.append(nums[dq[0]])
    return res
```

### 26. Valid Parentheses
#### Problem
Determine if a string of brackets is correctly opened and closed.
#### Pattern
Stack
**O(n)** time, **O(n)** space
#### Solution
``` Python
def isValid(self, s):
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for c in s:
        if c in pairs:
            if not stack or stack[-1] != pairs[c]: return False
            stack.pop()
        else:
            stack.append(c)
    return not stack
```

### 27. Min Stack
#### Problem
Design a stack that supports push, pop, top, and retrieving the minimum in O(1).
#### Pattern
Stack with parallel min stack
**O(1)** all ops
#### Solution
``` Python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []
    def push(self, val):
        self.stack.append(val)
        self.min_stack.append(min(val, self.min_stack[-1] if self.min_stack else val))
    def pop(self):
        self.stack.pop(); self.min_stack.pop()
    def top(self): return self.stack[-1]
    def getMin(self): return self.min_stack[-1]
```

### 28. Evaluate Reverse Polish Notation
#### Problem
Evaluate an arithmetic expression in reverse Polish notation.
#### Pattern
Stack
**O(n)** time, **O(n)** space
#### Solution
``` Python
def evalRPN(self, tokens):
    stack = []
    for t in tokens:
        if t in "+-*/":
            b, a = stack.pop(), stack.pop()
            if t == "+": stack.append(a + b)
            elif t == "-": stack.append(a - b)
            elif t == "*": stack.append(a * b)
            else: stack.append(int(a / b))  # truncate toward zero
        else:
            stack.append(int(t))
    return stack[0]
```

### 29. Generate Parentheses
#### Problem
Generate all combinations of n pairs of well-formed parentheses.
#### Pattern
Backtracking / Stack
**O(4ⁿ/√n)** time
#### Solution
``` Python
def generateParenthesis(self, n):
    res = []
    def bt(s, open, close):
        if len(s) == 2 * n: res.append(s); return
        if open < n: bt(s + "(", open + 1, close)
        if close < open: bt(s + ")", open, close + 1)
    bt("", 0, 0)
    return res
```

### 30. Daily Temperatures
#### Problem
For each day, return how many days until a warmer temperature.
#### Pattern
Monotonic Stack
**O(n)** time, **O(n)** space
#### Solution
``` Python
def dailyTemperatures(self, temperatures):
    res = [0] * len(temperatures)
    stack = []
    for i, t in enumerate(temperatures):
        while stack and t > temperatures[stack[-1]]:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
```

### 31. Car Fleet
#### Problem
Count the number of car fleets that arrive at the destination.
#### Pattern
Monotonic Stack (sort by position)
**O(n log n)** time, **O(n)** space
#### Solution
``` Python
def carFleet(self, target, position, speed):
    pairs = sorted(zip(position, speed), reverse=True)
    stack = []
    for pos, spd in pairs:
        t = (target - pos) / spd
        if not stack or t > stack[-1]:
            stack.append(t)
    return len(stack)
```

### 32. Largest Rectangle in Histogram
#### Problem
Find the area of the largest rectangle that fits in a histogram.
#### Pattern
Monotonic Stack
**O(n)** time, **O(n)** space
#### Solution
``` Python
def largestRectangleArea(self, heights):
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

### 33. Binary Search
#### Problem
Search for a target in a sorted array and return its index.
#### Pattern
Binary Search
**O(log n)** time, **O(1)** space
#### Solution
``` Python
def search(self, nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        m = (l + r) // 2
        if nums[m] == target: return m
        elif nums[m] < target: l = m + 1
        else: r = m - 1
    return -1
```

### 34. Search a 2D Matrix
#### Problem
Search for a target in a matrix where rows and columns are sorted.
#### Pattern
Binary Search on flattened matrix
**O(log(m*n))** time, **O(1)** space
#### Solution
``` Python
def searchMatrix(self, matrix, target):
    m, n = len(matrix), len(matrix[0])
    l, r = 0, m * n - 1
    while l <= r:
        mid = (l + r) // 2
        val = matrix[mid // n][mid % n]
        if val == target: return True
        elif val < target: l = mid + 1
        else: r = mid - 1
    return False
```

### 35. Koko Eating Bananas
#### Problem
Find the minimum eating speed to finish all piles within h hours.
#### Pattern
Binary Search on answer
**O(n log m)** time, **O(1)** space
#### Solution
``` Python
def minEatingSpeed(self, piles, h):
    l, r = 1, max(piles)
    while l < r:
        m = (l + r) // 2
        if sum((p + m - 1) // m for p in piles) <= h:
            r = m
        else:
            l = m + 1
    return l
```

### 36. Find Minimum in Rotated Sorted Array
#### Problem
Find the minimum element in a rotated sorted array.
#### Pattern
Binary Search
**O(log n)** time, **O(1)** space
#### Solution
``` Python
def findMin(self, nums):
    l, r = 0, len(nums) - 1
    while l < r:
        m = (l + r) // 2
        if nums[m] > nums[r]: l = m + 1
        else: r = m
    return nums[l]
```

### 37. Search in Rotated Sorted Array
#### Problem
Search for a target in a rotated sorted array in O(log n).
#### Pattern
Binary Search, determine sorted half
**O(log n)** time, **O(1)** space
#### Solution
``` Python
def search(self, nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        m = (l + r) // 2
        if nums[m] == target: return m
        if nums[l] <= nums[m]:
            if nums[l] <= target < nums[m]: r = m - 1
            else: l = m + 1
        else:
            if nums[m] < target <= nums[r]: l = m + 1
            else: r = m - 1
    return -1
```

### 38. Time Based Key-Value Store
#### Problem
Design a key-value store that retrieves the value at or before a given timestamp.
#### Pattern
Binary Search on sorted timestamps
**O(log n)** per get
#### Solution
``` Python
class TimeMap:
    def __init__(self): self.store = {}
    def set(self, key, value, timestamp):
        if key not in self.store: self.store[key] = []
        self.store[key].append((timestamp, value))
    def get(self, key, timestamp):
        vals = self.store[key]
        l, r = 0, len(vals) - 1
        res = ""
        while l <= r:
            m = (l + r) // 2
            if vals[m][0] <= timestamp:
                res = vals[m][1]; l = m + 1
            else: r = m - 1
        return res
```

### 39. Reverse Linked List
#### Problem
Reverse a singly linked list in-place.
#### Pattern
Iterative pointer reversal
**O(n)** time, **O(1)** space
#### Solution
``` Python
def reverseList(self, head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
```

### 40. Merge Two Sorted Lists
#### Problem
Merge two sorted linked lists into one sorted list.
#### Pattern
Iterative merge with dummy head
**O(n+m)** time, **O(1)** space
#### Solution
``` Python
def mergeTwoLists(self, l1, l2):
    dummy = curr = ListNode()
    while l1 and l2:
        if l1.val <= l2.val: curr.next = l1; l1 = l1.next
        else: curr.next = l2; l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
```

### 41. Reorder List
#### Problem
Reorder a linked list as L0→Ln→L1→Ln-1→L2→Ln-2…
#### Pattern
Find middle + reverse second half + merge
**O(n)** time, **O(1)** space
#### Solution
``` Python
def reorderList(self, head):
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
    second = slow.next
    slow.next = None
    prev = None
    while second:
        nxt = second.next; second.next = prev; prev = second; second = nxt
    first, second = head, prev
    while second:
        t1, t2 = first.next, second.next
        first.next = second; second.next = t1
        first = t1; second = t2
```

### 42. Remove Nth Node From End of List
#### Problem
Remove the nth node from the end of a linked list in one pass.
#### Pattern
Two Pointers (fast n ahead of slow)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def removeNthFromEnd(self, head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1): fast = fast.next
    while fast:
        fast = fast.next; slow = slow.next
    slow.next = slow.next.next
    return dummy.next
```

### 43. Copy List with Random Pointer
#### Problem
Deep-copy a linked list where each node has a next and random pointer.
#### Pattern
Hashmap old→new node
**O(n)** time, **O(n)** space
#### Solution
``` Python
def copyRandomList(self, head):
    old_to_new = {None: None}
    cur = head
    while cur:
        old_to_new[cur] = Node(cur.val); cur = cur.next
    cur = head
    while cur:
        old_to_new[cur].next = old_to_new[cur.next]
        old_to_new[cur].random = old_to_new[cur.random]
        cur = cur.next
    return old_to_new[head]
```

### 44. Linked List Cycle
#### Problem
Determine if a linked list has a cycle in it.
#### Pattern
Floyd's Cycle Detection (fast/slow pointers)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def hasCycle(self, head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

### 45. Find the Duplicate Number
#### Problem
Find the one duplicate in an array of n+1 integers in [1,n] without modifying the array.
#### Pattern
Floyd's Cycle Detection
**O(n)** time, **O(1)** space
#### Solution
``` Python
def findDuplicate(self, nums):
    slow = fast = nums[0]
    while True:
        slow = nums[slow]; fast = nums[nums[fast]]
        if slow == fast: break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]; fast = nums[fast]
    return slow
```

### 46. LRU Cache
#### Problem
Design a data structure that implements a Least Recently Used cache.
#### Pattern
Hashmap + Doubly Linked List
**O(1)** get/put
#### Solution
``` Python
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = {}
        self.left = Node(0, 0)   # LRU
        self.right = Node(0, 0)  # MRU
        self.left.next = self.right; self.right.prev = self.left
    def remove(self, node):
        node.prev.next = node.next; node.next.prev = node.prev
    def insert(self, node):
        node.prev = self.right.prev; node.next = self.right
        self.right.prev.next = node; self.right.prev = node
    def get(self, key):
        if key in self.cache:
            self.remove(self.cache[key]); self.insert(self.cache[key])
            return self.cache[key].val
        return -1
    def put(self, key, value):
        if key in self.cache: self.remove(self.cache[key])
        self.cache[key] = Node(key, value); self.insert(self.cache[key])
        if len(self.cache) > self.cap:
            lru = self.left.next; self.remove(lru); del self.cache[lru.key]
```

### 47. Merge K Sorted Lists
#### Problem
Merge k sorted linked lists into one sorted linked list.
#### Pattern
Min Heap
**O(n log k)** time, **O(k)** space
#### Solution
``` Python
def mergeKLists(self, lists):
    heap = []
    for i, node in enumerate(lists):
        if node: heapq.heappush(heap, (node.val, i, node))
    dummy = curr = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node; curr = curr.next
        if node.next: heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

### 48. Reverse Nodes in K-Group
#### Problem
Reverse every k nodes of a linked list as a group.
#### Pattern
Iterative group reversal
**O(n)** time, **O(1)** space
#### Solution
``` Python
def reverseKGroup(self, head, k):
    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        kth = self.getKth(group_prev, k)
        if not kth: break
        group_next = kth.next
        prev, curr = group_next, group_prev.next
        while curr != group_next:
            nxt = curr.next; curr.next = prev; prev = curr; curr = nxt
        tmp = group_prev.next
        group_prev.next = kth; group_prev = tmp
    return dummy.next

def getKth(self, curr, k):
    while curr and k > 0:
        curr = curr.next; k -= 1
    return curr
```

### 49. Invert Binary Tree
#### Problem
Mirror a binary tree by swapping left and right children recursively.
#### Pattern
DFS / BFS
**O(n)** time, **O(n)** space
#### Solution
``` Python
def invertTree(self, root):
    if not root: return None
    root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
    return root
```

### 50. Maximum Depth of Binary Tree
#### Problem
Return the maximum depth (number of nodes along the longest root-to-leaf path).
#### Pattern
DFS
**O(n)** time, **O(h)** space
#### Solution
``` Python
def maxDepth(self, root):
    if not root: return 0
    return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))
```

### 51. Diameter of Binary Tree
#### Problem
Find the length of the longest path between any two nodes in a tree.
#### Pattern
DFS, track max at each node
**O(n)** time, **O(h)** space
#### Solution
``` Python
def diameterOfBinaryTree(self, root):
    self.res = 0
    def dfs(node):
        if not node: return 0
        l, r = dfs(node.left), dfs(node.right)
        self.res = max(self.res, l + r)
        return 1 + max(l, r)
    dfs(root)
    return self.res
```

### 52. Balanced Binary Tree
#### Problem
Determine if a binary tree is height-balanced.
#### Pattern
DFS, return -1 on imbalance
**O(n)** time, **O(h)** space
#### Solution
``` Python
def isBalanced(self, root):
    def dfs(node):
        if not node: return 0
        l, r = dfs(node.left), dfs(node.right)
        if l == -1 or r == -1 or abs(l - r) > 1: return -1
        return 1 + max(l, r)
    return dfs(root) != -1
```

### 53. Same Tree
#### Problem
Check if two binary trees are identical in structure and node values.
#### Pattern
DFS
**O(n)** time, **O(h)** space
#### Solution
``` Python
def isSameTree(self, p, q):
    if not p and not q: return True
    if not p or not q or p.val != q.val: return False
    return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
```

### 54. Subtree of Another Tree
#### Problem
Check if one binary tree is a subtree of another.
#### Pattern
DFS + isSameTree
**O(m*n)** time
#### Solution
``` Python
def isSubtree(self, root, subRoot):
    if not root: return False
    if self.isSameTree(root, subRoot): return True
    return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
```

### 55. Lowest Common Ancestor of a Binary Search Tree
#### Problem
Find the lowest node that is an ancestor of both p and q in a BST.
#### Pattern
BST property traversal
**O(h)** time, **O(1)** space
#### Solution
``` Python
def lowestCommonAncestor(self, root, p, q):
    while root:
        if p.val < root.val and q.val < root.val: root = root.left
        elif p.val > root.val and q.val > root.val: root = root.right
        else: return root
```

### 56. Binary Tree Level Order Traversal
#### Problem
Return node values level by level from left to right.
#### Pattern
BFS
**O(n)** time, **O(n)** space
#### Solution
``` Python
def levelOrder(self, root):
    if not root: return []
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

### 57. Binary Tree Right Side View
#### Problem
Return the values visible when looking at the tree from the right side.
#### Pattern
BFS, take last node per level
**O(n)** time, **O(n)** space
#### Solution
``` Python
def rightSideView(self, root):
    if not root: return []
    res, q = [], deque([root])
    while q:
        for i in range(len(q)):
            node = q.popleft()
            if i == len(q): res.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        if not res or res[-1] != node.val: res.append(node.val)
    return res
```

### 58. Count Good Nodes in Binary Tree
#### Problem
Count nodes where no node on the path from root is greater.
#### Pattern
DFS with running max
**O(n)** time, **O(h)** space
#### Solution
``` Python
def goodNodes(self, root):
    def dfs(node, max_val):
        if not node: return 0
        res = 1 if node.val >= max_val else 0
        m = max(max_val, node.val)
        return res + dfs(node.left, m) + dfs(node.right, m)
    return dfs(root, root.val)
```

### 59. Validate Binary Search Tree
#### Problem
Determine if a binary tree is a valid BST.
#### Pattern
DFS with min/max bounds
**O(n)** time, **O(h)** space
#### Solution
``` Python
def isValidBST(self, root):
    def valid(node, lo, hi):
        if not node: return True
        if not (lo < node.val < hi): return False
        return valid(node.left, lo, node.val) and valid(node.right, node.val, hi)
    return valid(root, float('-inf'), float('inf'))
```

### 60. Kth Smallest Element in a BST
#### Problem
Find the kth smallest value in a BST using inorder traversal.
#### Pattern
Inorder DFS (sorted order)
**O(n)** time, **O(h)** space
#### Solution
``` Python
def kthSmallest(self, root, k):
    stack = []
    curr = root
    while stack or curr:
        while curr: stack.append(curr); curr = curr.left
        curr = stack.pop()
        k -= 1
        if k == 0: return curr.val
        curr = curr.right
```

### 61. Construct Binary Tree from Preorder and Inorder Traversal
#### Problem
Rebuild a binary tree given its preorder and inorder traversals.
#### Pattern
Recursive divide, hashmap for inorder index
**O(n)** time, **O(n)** space
#### Solution
``` Python
def buildTree(self, preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}
    self.pre = 0
    def build(l, r):
        if l > r: return None
        root = TreeNode(preorder[self.pre]); self.pre += 1
        mid = idx[root.val]
        root.left = build(l, mid - 1)
        root.right = build(mid + 1, r)
        return root
    return build(0, len(inorder) - 1)
```

### 62. Binary Tree Maximum Path Sum
#### Problem
Find the maximum path sum between any two nodes in a binary tree.
#### Pattern
DFS, track global max
**O(n)** time, **O(h)** space
#### Solution
``` Python
def maxPathSum(self, root):
    self.res = root.val
    def dfs(node):
        if not node: return 0
        l = max(dfs(node.left), 0)
        r = max(dfs(node.right), 0)
        self.res = max(self.res, node.val + l + r)
        return node.val + max(l, r)
    dfs(root)
    return self.res
```

### 63. Serialize and Deserialize Binary Tree
#### Problem
Convert a binary tree to a string and back.
#### Pattern
BFS / preorder with null markers
**O(n)** time, **O(n)** space
#### Solution
``` Python
def serialize(self, root):
    res = []
    def dfs(node):
        if not node: res.append("N"); return
        res.append(str(node.val))
        dfs(node.left); dfs(node.right)
    dfs(root)
    return ",".join(res)

def deserialize(self, data):
    vals = data.split(",")
    self.i = 0
    def dfs():
        if vals[self.i] == "N":
            self.i += 1
            return None
        node = TreeNode(int(vals[self.i]))
        self.i += 1
        node.left = dfs()
        node.right = dfs()
        return node
    return dfs()
```

### 64. Implement Trie (Prefix Tree)
#### Problem
Build a trie supporting insert, search, and startsWith operations.
#### Pattern
Trie with TrieNode children dict
**O(n)** per insert/search
#### Solution
``` Python
class Trie:
    def __init__(self): self.children = {}; self.end = False
    def insert(self, word):
        node = self
        for c in word:
            node.children.setdefault(c, Trie())
            node = node.children[c]
        node.end = True
    def search(self, word):
        node = self
        for c in word:
            if c not in node.children: return False
            node = node.children[c]
        return node.end
    def startsWith(self, prefix):
        node = self
        for c in prefix:
            if c not in node.children: return False
            node = node.children[c]
        return True
```

### 65. Design Add and Search Words Data Structure
#### Problem
Design a word dictionary supporting wildcard search with '.'.
#### Pattern
Trie + DFS for wildcard '.'
**O(m)** add, **O(26^m)** worst search
#### Solution
``` Python
class WordDictionary:
    def __init__(self): self.children = {}; self.end = False
    def addWord(self, word):
        node = self
        for c in word:
            node.children.setdefault(c, WordDictionary())
            node = node.children[c]
        node.end = True
    def search(self, word):
        node = self
        for i, c in enumerate(word):
            if c == ".":
                return any(child.search(word[i+1:]) for child in node.children.values())
            if c not in node.children: return False
            node = node.children[c]
        return node.end
```

### 66. Word Search II
#### Problem
Find all words from a dictionary that exist in a character grid.
#### Pattern
Trie + DFS backtracking on board
**O(m * n * 4^l)** time
#### Solution
``` Python
def findWords(self, board, words):
    root = {}
    for word in words:
        node = root
        for c in word:
            node = node.setdefault(c, {})
        node["#"] = word
    res = set()
    rows, cols = len(board), len(board[0])
    def dfs(node, r, c):
        if "#" in node: res.add(node["#"])
        if r < 0 or c < 0 or r >= rows or c >= cols: return
        tmp, board[r][c] = board[r][c], "#"
        if tmp in node:
            for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
                dfs(node[tmp], r+dr, c+dc)
        board[r][c] = tmp
    for r in range(rows):
        for c in range(cols):
            dfs(root, r, c)
    return list(res)
```

### 67. Kth Largest Element in a Stream
#### Problem
Design a class that finds the kth largest element in a stream.
#### Pattern
Min Heap of size k
**O(log k)** per add
#### Solution
``` Python
class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = nums
        heapq.heapify(self.heap)
        while len(self.heap) > k: heapq.heappop(self.heap)
    def add(self, val):
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k: heapq.heappop(self.heap)
        return self.heap[0]
```

### 68. Last Stone Weight
#### Problem
Smash the two heaviest stones repeatedly; return the last remaining weight.
#### Pattern
Max Heap (negate values)
**O(n log n)** time
#### Solution
``` Python
def lastStoneWeight(self, stones):
    heap = [-s for s in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        a, b = -heapq.heappop(heap), -heapq.heappop(heap)
        if a != b: heapq.heappush(heap, -(a - b))
    return -heap[0] if heap else 0
```

### 69. K Closest Points to Origin
#### Problem
Return the k points closest to the origin.
#### Pattern
Max Heap of size k
**O(n log k)** time
#### Solution
``` Python
def kClosest(self, points, k):
    heap = []
    for x, y in points:
        dist = -(x*x + y*y)
        heapq.heappush(heap, (dist, x, y))
        if len(heap) > k: heapq.heappop(heap)
    return [[x, y] for _, x, y in heap]
```

### 70. Kth Largest Element in an Array
#### Problem
Find the kth largest element in an unsorted array.
#### Pattern
Min Heap of size k
**O(n log k)** time, **O(k)** space
#### Solution
``` Python
def findKthLargest(self, nums, k):
    heap = nums[:k]
    heapq.heapify(heap)
    for n in nums[k:]:
        if n > heap[0]:
            heapq.heapreplace(heap, n)
    return heap[0]
```

### 71. Task Scheduler
#### Problem
Find the minimum intervals needed to execute all tasks with a cooldown n.
#### Pattern
Greedy with max heap + cooldown queue
**O(n log n)** time
#### Solution
``` Python
def leastInterval(self, tasks, n):
    count = {}
    for t in tasks: count[t] = count.get(t, 0) + 1
    heap = [-c for c in count.values()]
    heapq.heapify(heap)
    queue = deque()  # (-count, available_at_time)
    time = 0
    while heap or queue:
        time += 1
        if heap:
            cnt = 1 + heapq.heappop(heap)
            if cnt: queue.append((cnt, time + n))
        if queue and queue[0][1] == time:
            heapq.heappush(heap, queue.popleft()[0])
    return time
```

### 72. Design Twitter
#### Problem
Design a simplified Twitter with post, follow, unfollow, and news feed.
#### Pattern
Heap merge of per-user tweet lists
**O(k log n)** getNewsFeed
#### Solution
``` Python
class Twitter:
    def __init__(self):
        self.count = 0
        self.tweets = {}
        self.following = {}
    def postTweet(self, userId, tweetId):
        if userId not in self.tweets: self.tweets[userId] = []
        self.tweets[userId].append((self.count, tweetId))
        self.count -= 1
    def getNewsFeed(self, userId):
        heap = []
        users = self.following.get(userId, set()) | {userId}
        for u in users:
            if self.tweets[u]:
                idx = len(self.tweets[u]) - 1
                cnt, tid = self.tweets[u][idx]
                heapq.heappush(heap, (cnt, tid, u, idx - 1))
        res = []
        while heap and len(res) < 10:
            cnt, tid, u, idx = heapq.heappop(heap)
            res.append(tid)
            if idx >= 0:
                c, t = self.tweets[u][idx]
                heapq.heappush(heap, (c, t, u, idx - 1))
        return res
    def follow(self, f, e):
        if f not in self.following: self.following[f] = set()
        self.following[f].add(e)
    def unfollow(self, f, e): self.following.get(f, set()).discard(e)
```

### 73. Find Median from Data Stream
#### Problem
Design a data structure that supports adding numbers and finding the median.
#### Pattern
Two Heaps (max-heap left, min-heap right)
**O(log n)** add, **O(1)** findMedian
#### Solution
``` Python
class MedianFinder:
    def __init__(self):
        self.small = []  # max heap (negated)
        self.large = []  # min heap
    def addNum(self, num):
        heapq.heappush(self.small, -num)
        if self.small and self.large and -self.small[0] > self.large[0]:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.small) > len(self.large) + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))
    def findMedian(self):
        if len(self.small) > len(self.large): return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2
```

### 74. Subsets
#### Problem
Return all possible subsets of a set of distinct integers.
#### Pattern
Backtracking
**O(n * 2ⁿ)** time
#### Solution
``` Python
def subsets(self, nums):
    res = []
    def bt(i, subset):
        if i == len(nums): res.append(subset[:]); return
        subset.append(nums[i]); bt(i+1, subset)
        subset.pop(); bt(i+1, subset)
    bt(0, [])
    return res
```

### 75. Combination Sum
#### Problem
Find all combinations of candidates that sum to target (reuse allowed).
#### Pattern
Backtracking (reuse allowed)
**O(2^(t/m))** time
#### Solution
``` Python
def combinationSum(self, candidates, target):
    res = []
    def bt(i, curr, total):
        if total == target: res.append(curr[:]); return
        if i >= len(candidates) or total > target: return
        curr.append(candidates[i]); bt(i, curr, total + candidates[i])
        curr.pop(); bt(i+1, curr, total)
    bt(0, [], 0)
    return res
```

### 76. Permutations
#### Problem
Return all permutations of a list of distinct integers.
#### Pattern
Backtracking with visited set
**O(n! * n)** time
#### Solution
``` Python
def permute(self, nums):
    res = []
    def bt(perm):
        if len(perm) == len(nums): res.append(perm[:]); return
        for n in nums:
            if n not in perm:
                perm.append(n); bt(perm); perm.pop()
    bt([])
    return res
```

### 77. Subsets II
#### Problem
Return all unique subsets from an array that may contain duplicates.
#### Pattern
Backtracking, skip duplicates
**O(n * 2ⁿ)** time
#### Solution
``` Python
def subsetsWithDup(self, nums):
    nums.sort(); res = []
    def bt(i, subset):
        res.append(subset[:])
        for j in range(i, len(nums)):
            if j > i and nums[j] == nums[j-1]: continue
            subset.append(nums[j]); bt(j+1, subset); subset.pop()
    bt(0, [])
    return res
```

### 78. Combination Sum II
#### Problem
Find all unique combinations summing to target where each number used once.
#### Pattern
Backtracking, skip duplicates, no reuse
**O(2ⁿ)** time
#### Solution
``` Python
def combinationSum2(self, candidates, target):
    candidates.sort(); res = []
    def bt(i, curr, total):
        if total == target: res.append(curr[:]); return
        for j in range(i, len(candidates)):
            if j > i and candidates[j] == candidates[j-1]: continue
            if total + candidates[j] > target: break
            curr.append(candidates[j]); bt(j+1, curr, total + candidates[j]); curr.pop()
    bt(0, [], 0)
    return res
```

### 79. Word Search
#### Problem
Determine if a word exists in a grid by moving to adjacent cells.
#### Pattern
DFS backtracking on grid
**O(m * n * 4^l)** time
#### Solution
``` Python
def exist(self, board, word):
    rows, cols = len(board), len(board[0])
    def dfs(r, c, i):
        if i == len(word): return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]: return False
        tmp, board[r][c] = board[r][c], "#"
        res = any(dfs(r+dr, c+dc, i+1) for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)])
        board[r][c] = tmp
        return res
    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

### 80. Palindrome Partitioning
#### Problem
Partition a string such that every substring is a palindrome; return all ways.
#### Pattern
Backtracking + palindrome check
**O(n * 2ⁿ)** time
#### Solution
``` Python
def partition(self, s):
    res = []
    def is_palindrome(l, r):
        while l < r:
            if s[l] != s[r]: return False
            l += 1; r -= 1
        return True
    def bt(i, part):
        if i == len(s): res.append(part[:]); return
        for j in range(i, len(s)):
            if is_palindrome(i, j):
                part.append(s[i:j+1]); bt(j+1, part); part.pop()
    bt(0, [])
    return res
```

### 81. Letter Combinations of a Phone Number
#### Problem
Return all possible letter combinations for a phone number string.
#### Pattern
Backtracking
**O(4ⁿ * n)** time
#### Solution
``` Python
def letterCombinations(self, digits):
    if not digits: return []
    phone = {"2":"abc","3":"def","4":"ghi","5":"jkl","6":"mno","7":"pqrs","8":"tuv","9":"wxyz"}
    res = []
    def bt(i, curr):
        if i == len(digits): res.append(curr); return
        for c in phone[digits[i]]:
            bt(i+1, curr+c)
    bt(0, "")
    return res
```

### 82. N-Queens
#### Problem
Place n queens on an n×n chessboard so no two queens attack each other.
#### Pattern
Backtracking with col/diagonal sets
**O(n!)** time
#### Solution
``` Python
def solveNQueens(self, n):
    cols = set(); pos_diag = set(); neg_diag = set()
    res = []; board = [["."]*n for _ in range(n)]
    def bt(r):
        if r == n: res.append(["".join(row) for row in board]); return
        for c in range(n):
            if c in cols or (r+c) in pos_diag or (r-c) in neg_diag: continue
            cols.add(c); pos_diag.add(r+c); neg_diag.add(r-c)
            board[r][c] = "Q"; bt(r+1); board[r][c] = "."
            cols.remove(c); pos_diag.remove(r+c); neg_diag.remove(r-c)
    bt(0)
    return res
```

### 83. Number of Islands
#### Problem
Count the number of islands (connected groups of '1's) in a grid.
#### Pattern
DFS / BFS flood fill
**O(m*n)** time, **O(m*n)** space
#### Solution
``` Python
def numIslands(self, grid):
    count = 0
    def dfs(r, c):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]) or grid[r][c] != "1": return
        grid[r][c] = "0"
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]: dfs(r+dr, c+dc)
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == "1": dfs(r, c); count += 1
    return count
```

### 84. Clone Graph
#### Problem
Return a deep copy of a connected undirected graph.
#### Pattern
DFS with hashmap old→new
**O(V+E)** time
#### Solution
``` Python
def cloneGraph(self, node):
    old_to_new = {}
    def dfs(n):
        if n in old_to_new: return old_to_new[n]
        copy = Node(n.val)
        old_to_new[n] = copy
        for nb in n.neighbors: copy.neighbors.append(dfs(nb))
        return copy
    return dfs(node) if node else None
```

### 85. Max Area of Island
#### Problem
Find the maximum area of an island in a binary grid.
#### Pattern
DFS flood fill, return size
**O(m*n)** time
#### Solution
``` Python
def maxAreaOfIsland(self, grid):
    def dfs(r, c):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]) or grid[r][c] == 0: return 0
        grid[r][c] = 0
        return 1 + sum(dfs(r+dr, c+dc) for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)])
    return max(dfs(r, c) for r in range(len(grid)) for c in range(len(grid[0])))
```

### 86. Pacific Atlantic Water Flow
#### Problem
Find cells from which water can flow to both the Pacific and Atlantic ocean.
#### Pattern
Reverse BFS from each ocean
**O(m*n)** time
#### Solution
``` Python
def pacificAtlantic(self, heights):
    rows, cols = len(heights), len(heights[0])
    def bfs(starts):
        q = deque(starts); visited = set(starts)
        while q:
            r, c = q.popleft()
            for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
                nr, nc = r+dr, c+dc
                if 0<=nr<rows and 0<=nc<cols and (nr,nc) not in visited and heights[nr][nc] >= heights[r][c]:
                    visited.add((nr,nc)); q.append((nr,nc))
        return visited
    pacific = bfs([(0,c) for c in range(cols)] + [(r,0) for r in range(rows)])
    atlantic = bfs([(rows-1,c) for c in range(cols)] + [(r,cols-1) for r in range(rows)])
    return [[r,c] for r,c in pacific & atlantic]
```

### 87. Surrounded Regions
#### Problem
Capture all 'O' regions not connected to the board's border.
#### Pattern
BFS/DFS from border O's, mark safe
**O(m*n)** time
#### Solution
``` Python
def solve(self, board):
    rows, cols = len(board), len(board[0])
    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != "O": return
        board[r][c] = "S"
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]: dfs(r+dr, c+dc)
    for r in range(rows):
        for c in range(cols):
            if board[r][c] == "O" and (r in [0, rows-1] or c in [0, cols-1]):
                dfs(r, c)
    for r in range(rows):
        for c in range(cols):
            board[r][c] = "O" if board[r][c] == "S" else "X"
```

### 88. Rotting Oranges
#### Problem
Find the minimum minutes until no fresh orange remains, or -1 if impossible.
#### Pattern
Multi-source BFS
**O(m*n)** time
#### Solution
``` Python
def orangesRotting(self, grid):
    rows, cols = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2: q.append((r, c, 0))
            elif grid[r][c] == 1: fresh += 1
    time = 0
    while q:
        r, c, t = q.popleft()
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2; fresh -= 1
                q.append((nr, nc, t+1)); time = t + 1
    return time if fresh == 0 else -1
```

### 89. Walls and Gates
#### Problem
Fill each empty room with its distance to the nearest gate.
#### Pattern
Multi-source BFS from gates
**O(m*n)** time
#### Solution
``` Python
def wallsAndGates(self, rooms):
    rows, cols = len(rooms), len(rooms[0])
    INF = 2147483647
    q = deque([(r,c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0])
    while q:
        r, c = q.popleft()
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1; q.append((nr, nc))
```

### 90. Course Schedule
#### Problem
Determine if it's possible to finish all courses given prerequisites (cycle detection).
#### Pattern
DFS cycle detection (topological sort)
**O(V+E)** time
#### Solution
``` Python
def canFinish(self, numCourses, prerequisites):
    adj = {}
    for a, b in prerequisites:
        if a not in adj: adj[a] = []
        adj[a].append(b)
    visiting = set()
    def dfs(c):
        if c in visiting: return False
        if not adj.get(c): return True
        visiting.add(c)
        for pre in adj.get(c, []):
            if not dfs(pre): return False
        visiting.remove(c); adj[c] = []
        return True
    return all(dfs(c) for c in range(numCourses))
```

### 91. Course Schedule II
#### Problem
Return a valid course order given prerequisites, or empty if impossible.
#### Pattern
Topological sort (Kahn's BFS)
**O(V+E)** time
#### Solution
``` Python
def findOrder(self, numCourses, prerequisites):
    adj = {}
    indegree = [0] * numCourses
    for a, b in prerequisites:
        if b not in adj: adj[b] = []
        adj[b].append(a); indegree[a] += 1
    q = deque(c for c in range(numCourses) if indegree[c] == 0)
    res = []
    while q:
        c = q.popleft(); res.append(c)
        for nb in adj.get(c, []):
            indegree[nb] -= 1
            if indegree[nb] == 0: q.append(nb)
    return res if len(res) == numCourses else []
```

### 92. Redundant Connection
#### Problem
Find the edge that, when removed, makes a graph a tree.
#### Pattern
Union-Find
**O(n α(n))** time
#### Solution
``` Python
def findRedundantConnection(self, edges):
    parent = list(range(len(edges) + 1))
    rank = [1] * (len(edges) + 1)
    def find(x):
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def union(x, y):
        px, py = find(x), find(y)
        if px == py: return False
        if rank[px] < rank[py]: px, py = py, px
        parent[py] = px; rank[px] += rank[py] == rank[px]
        return True
    for u, v in edges:
        if not union(u, v): return [u, v]
```

### 93. Number of Connected Components in an Undirected Graph
#### Problem
Count the number of connected components in an undirected graph.
#### Pattern
Union-Find
**O(n α(n))** time
#### Solution
``` Python
def countComponents(self, n, edges):
    parent = list(range(n)); rank = [1] * n
    def find(x):
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def union(x, y):
        px, py = find(x), find(y)
        if px == py: return 0
        if rank[px] < rank[py]: px, py = py, px
        parent[py] = px; rank[px] += rank[py] == rank[px]
        return 1
    return n - sum(union(u, v) for u, v in edges)
```

### 94. Graph Valid Tree
#### Problem
Determine if n nodes and given edges form a valid tree.
#### Pattern
Union-Find (no cycle + connected)
**O(n α(n))** time
#### Solution
``` Python
def validTree(self, n, edges):
    if len(edges) != n - 1: return False
    parent = list(range(n))
    def find(x):
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for u, v in edges:
        pu, pv = find(u), find(v)
        if pu == pv: return False
        parent[pu] = pv
    return True
```

### 95. Word Ladder
#### Problem
Find the shortest transformation sequence from beginWord to endWord changing one letter at a time.
#### Pattern
BFS, each step changes one letter
**O(m² * n)** time
#### Solution
``` Python
def ladderLength(self, beginWord, endWord, wordList):
    wordSet = set(wordList)
    if endWord not in wordSet: return 0
    q = deque([(beginWord, 1)])
    visited = {beginWord}
    while q:
        word, steps = q.popleft()
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                next_word = word[:i] + c + word[i+1:]
                if next_word == endWord: return steps + 1
                if next_word in wordSet and next_word not in visited:
                    visited.add(next_word); q.append((next_word, steps+1))
    return 0
```

### 96. Reconstruct Itinerary
#### Problem
Reconstruct an itinerary from a list of airline tickets using all tickets exactly once.
#### Pattern
Hierholzer's algorithm (Eulerian path, DFS)
**O(E log E)** time
#### Solution
``` Python
def findItinerary(self, tickets):
    adj = {}
    for src, dst in sorted(tickets, reverse=True):
        if src not in adj: adj[src] = []
        adj[src].append(dst)
    res = []
    def dfs(src):
        while adj.get(src): dfs(adj[src].pop())
        res.append(src)
    dfs("JFK")
    return res[::-1]
```

### 97. Min Cost to Connect All Points
#### Problem
Find the minimum cost to connect all points using Manhattan distance (MST).
#### Pattern
Prim's MST (min heap)
**O(n² log n)** time
#### Solution
``` Python
def minCostConnectPoints(self, points):
    n = len(points)
    visited = set()
    heap = [(0, 0)]
    cost = 0
    while len(visited) < n:
        c, i = heapq.heappop(heap)
        if i in visited: continue
        visited.add(i); cost += c
        for j in range(n):
            if j not in visited:
                d = abs(points[i][0]-points[j][0]) + abs(points[i][1]-points[j][1])
                heapq.heappush(heap, (d, j))
    return cost
```

### 98. Network Delay Time
#### Problem
Find the time for all nodes to receive a signal sent from node k (Dijkstra).
#### Pattern
Dijkstra's shortest path
**O((V+E) log V)** time
#### Solution
``` Python
def networkDelayTime(self, times, n, k):
    adj = {}
    for u, v, w in times:
        if u not in adj: adj[u] = []
        adj[u].append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist: continue
        dist[u] = d
        for v, w in adj.get(u, []):
            if v not in dist: heapq.heappush(heap, (d+w, v))
    return max(dist.values()) if len(dist) == n else -1
```

### 99. Swim in Rising Water
#### Problem
Find the minimum time to swim from top-left to bottom-right as water rises.
#### Pattern
Dijkstra / Binary Search + BFS
**O(n² log n)** time
#### Solution
``` Python
def swimInWater(self, grid):
    n = len(grid)
    visited = set([(0, 0)])
    heap = [(grid[0][0], 0, 0)]
    while heap:
        t, r, c = heapq.heappop(heap)
        if r == n-1 and c == n-1: return t
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<n and 0<=nc<n and (nr,nc) not in visited:
                visited.add((nr,nc))
                heapq.heappush(heap, (max(t, grid[nr][nc]), nr, nc))
```

### 100. Alien Dictionary
#### Problem
Derive the order of characters in an alien language from a sorted word list.
#### Pattern
Topological sort from character ordering
**O(V+E)** time
#### Solution
``` Python
def alienOrder(self, words):
    adj = {c: set() for w in words for c in w}
    for i in range(len(words)-1):
        w1, w2 = words[i], words[i+1]
        min_len = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]: return ""
        for j in range(min_len):
            if w1[j] != w2[j]: adj[w1[j]].add(w2[j]); break
    visited = {}; res = []
    def dfs(c):
        if c in visited: return visited[c]
        visited[c] = True
        for nb in adj[c]:
            if dfs(nb): return True
        visited[c] = False; res.append(c)
    for c in adj:
        if dfs(c): return ""
    return "".join(res[::-1])
```

### 101. Cheapest Flights Within K Stops
#### Problem
Find the cheapest price from src to dst with at most k stops.
#### Pattern
Bellman-Ford (k+1 relaxations)
**O(k * E)** time
#### Solution
``` Python
def findCheapestPrice(self, n, flights, src, dst, k):
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

### 102. Climbing Stairs
#### Problem
Count the number of distinct ways to climb n stairs (1 or 2 steps at a time).
#### Pattern
DP (Fibonacci)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def climbStairs(self, n):
    a, b = 1, 1
    for _ in range(n - 1): a, b = b, a + b
    return b
```

### 103. Min Cost Climbing Stairs
#### Problem
Find the minimum cost to reach the top of the staircase.
#### Pattern
DP
**O(n)** time, **O(1)** space
#### Solution
``` Python
def minCostClimbingStairs(self, cost):
    for i in range(2, len(cost)):
        cost[i] += min(cost[i-1], cost[i-2])
    return min(cost[-1], cost[-2])
```

### 104. House Robber
#### Problem
Maximize money robbed from non-adjacent houses.
#### Pattern
DP
**O(n)** time, **O(1)** space
#### Solution
``` Python
def rob(self, nums):
    prev, curr = 0, 0
    for n in nums: prev, curr = curr, max(curr, prev + n)
    return curr
```

### 105. House Robber II
#### Problem
Maximize money robbed from houses arranged in a circle (first and last adjacent).
#### Pattern
DP on two linear subproblems (skip first or last)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def rob(self, nums):
    def rob_line(houses):
        prev, curr = 0, 0
        for n in houses: prev, curr = curr, max(curr, prev + n)
        return curr
    return max(nums[0], rob_line(nums[1:]), rob_line(nums[:-1]))
```

### 106. Palindromic Substrings
#### Problem
Count the number of palindromic substrings in a string.
#### Pattern
Expand Around Center
**O(n²)** time, **O(1)** space
#### Solution
``` Python
def countSubstrings(self, s):
    count = 0
    for i in range(len(s)):
        for l, r in [(i, i), (i, i+1)]:
            while l >= 0 and r < len(s) and s[l] == s[r]:
                count += 1; l -= 1; r += 1
    return count
```

### 107. Decode Ways
#### Problem
Count the number of ways to decode a digit string into letters (A=1…Z=26).
#### Pattern
DP
**O(n)** time, **O(1)** space
#### Solution
``` Python
def numDecodings(self, s):
    dp = {len(s): 1}
    def dfs(i):
        if i in dp: return dp[i]
        if s[i] == "0": return 0
        res = dfs(i + 1)
        if i + 1 < len(s) and int(s[i:i+2]) <= 26: res += dfs(i+2)
        dp[i] = res
        return res
    return dfs(0)
```

### 108. Coin Change
#### Problem
Find the fewest coins needed to make up an amount, or -1 if impossible.
#### Pattern
DP (BFS / bottom-up)
**O(n * amount)** time, **O(amount)** space
#### Solution
``` Python
def coinChange(self, coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if a - c >= 0: dp[a] = min(dp[a], dp[a-c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

### 109. Maximum Product Subarray
#### Problem
Find the contiguous subarray with the largest product.
#### Pattern
DP, track min and max
**O(n)** time, **O(1)** space
#### Solution
``` Python
def maxProduct(self, nums):
    res = max(nums)
    curMin = curMax = 1
    for n in nums:
        if n == 0: curMin = curMax = 1; continue
        tmp = curMax * n
        curMax = max(n, curMax * n, curMin * n)
        curMin = min(n, tmp, curMin * n)
        res = max(res, curMax)
    return res
```

### 110. Word Break
#### Problem
Determine if a string can be segmented into words from a dictionary.
#### Pattern
DP
**O(n² * m)** time
#### Solution
``` Python
def wordBreak(self, s, wordDict):
    dp = [False] * (len(s) + 1)
    dp[len(s)] = True
    for i in range(len(s) - 1, -1, -1):
        for w in wordDict:
            if s[i:i+len(w)] == w: dp[i] = dp[i+len(w)]
            if dp[i]: break
    return dp[0]
```

### 111. Longest Increasing Subsequence
#### Problem
Find the length of the longest strictly increasing subsequence.
#### Pattern
DP / Binary Search (patience sorting)
**O(n log n)** time
#### Solution
``` Python
def lengthOfLIS(self, nums):
    tails = []
    for n in nums:
        lo, hi = 0, len(tails)
        while lo < hi:
            mid = (lo + hi) // 2
            if tails[mid] < n: lo = mid + 1
            else: hi = mid
        if lo == len(tails): tails.append(n)
        else: tails[lo] = n
    return len(tails)
```

### 112. Partition Equal Subset Sum
#### Problem
Determine if an array can be partitioned into two subsets with equal sum.
#### Pattern
DP (0/1 Knapsack), bitset trick
**O(n * sum)** time
#### Solution
``` Python
def canPartition(self, nums):
    if sum(nums) % 2: return False
    target = sum(nums) // 2
    dp = {0}
    for n in nums:
        dp = {s + n for s in dp} | dp
    return target in dp
```

### 113. Unique Paths
#### Problem
Count the number of unique paths from top-left to bottom-right of an m×n grid.
#### Pattern
DP (or math: C(m+n-2, m-1))
**O(m*n)** time, **O(n)** space
#### Solution
``` Python
def uniquePaths(self, m, n):
    dp = [1] * n
    for _ in range(m - 1):
        for j in range(1, n): dp[j] += dp[j-1]
    return dp[-1]
```

### 114. Longest Common Subsequence
#### Problem
Find the length of the longest common subsequence of two strings.
#### Pattern
2-D DP
**O(m*n)** time, **O(m*n)** space
#### Solution
``` Python
def longestCommonSubsequence(self, text1, text2):
    dp = [[0] * (len(text2)+1) for _ in range(len(text1)+1)]
    for i in range(len(text1)-1, -1, -1):
        for j in range(len(text2)-1, -1, -1):
            if text1[i] == text2[j]: dp[i][j] = 1 + dp[i+1][j+1]
            else: dp[i][j] = max(dp[i+1][j], dp[i][j+1])
    return dp[0][0]
```

### 115. Best Time to Buy and Sell Stock with Cooldown
#### Problem
Maximize profit with a cooldown of one day after selling.
#### Pattern
DP with states (holding, sold, cooldown)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def maxProfit(self, prices):
    hold, sold, rest = -prices[0], 0, 0
    for p in prices[1:]:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)
```

### 116. Target Sum
#### Problem
Count ways to assign + or - to each number to reach the target sum.
#### Pattern
DP (subset sum variant)
**O(n * sum)** time
#### Solution
``` Python
def findTargetSumWays(self, nums, target):
    dp = {0: 1}
    for n in nums:
        next_dp = {}
        for s, count in dp.items():
            next_dp[s+n] = next_dp.get(s+n, 0) + count
            next_dp[s-n] = next_dp.get(s-n, 0) + count
        dp = next_dp
    return dp[target]
```

### 117. Interleaving String
#### Problem
Determine if s3 is formed by interleaving s1 and s2.
#### Pattern
2-D DP
**O(m*n)** time, **O(m*n)** space
#### Solution
``` Python
def isInterleave(self, s1, s2, s3):
    if len(s1) + len(s2) != len(s3): return False
    dp = [[False] * (len(s2)+1) for _ in range(len(s1)+1)]
    dp[len(s1)][len(s2)] = True
    for i in range(len(s1), -1, -1):
        for j in range(len(s2), -1, -1):
            if i < len(s1) and s1[i] == s3[i+j] and dp[i+1][j]: dp[i][j] = True
            if j < len(s2) and s2[j] == s3[i+j] and dp[i][j+1]: dp[i][j] = True
    return dp[0][0]
```

### 118. Longest Increasing Path in a Matrix
#### Problem
Find the longest strictly increasing path in a matrix.
#### Pattern
DFS with memoization
**O(m*n)** time
#### Solution
``` Python
def longestIncreasingPath(self, matrix):
    rows, cols = len(matrix), len(matrix[0])
    memo = {}
    def dfs(r, c):
        if (r, c) in memo: return memo[(r, c)]
        res = 1
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and matrix[nr][nc] > matrix[r][c]:
                res = max(res, 1 + dfs(nr, nc))
        memo[(r, c)] = res
        return res
    return max(dfs(r, c) for r in range(rows) for c in range(cols))
```

### 119. Distinct Subsequences
#### Problem
Count distinct subsequences of s that equal t.
#### Pattern
2-D DP
**O(m*n)** time
#### Solution
``` Python
def numDistinct(self, s, t):
    dp = [[0] * (len(t)+1) for _ in range(len(s)+1)]
    for i in range(len(s)+1): dp[i][len(t)] = 1
    for i in range(len(s)-1, -1, -1):
        for j in range(len(t)-1, -1, -1):
            dp[i][j] = dp[i+1][j]
            if s[i] == t[j]: dp[i][j] += dp[i+1][j+1]
    return dp[0][0]
```

### 120. Edit Distance
#### Problem
Find the minimum edits (insert/delete/replace) to convert word1 to word2.
#### Pattern
2-D DP
**O(m*n)** time
#### Solution
``` Python
def minDistance(self, word1, word2):
    m, n = len(word1), len(word2)
    dp = list(range(n+1))
    for i in range(1, m+1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n+1):
            if word1[i-1] == word2[j-1]: dp[j] = prev[j-1]
            else: dp[j] = 1 + min(prev[j], dp[j-1], prev[j-1])
    return dp[n]
```

### 121. Burst Balloons
#### Problem
Maximize coins collected by bursting balloons in the optimal order.
#### Pattern
Interval DP
**O(n³)** time
#### Solution
``` Python
def maxCoins(self, nums):
    nums = [1] + nums + [1]
    n = len(nums)
    dp = {}
    def dfs(l, r):
        if l > r: return 0
        if (l, r) in dp: return dp[(l, r)]
        dp[(l, r)] = max(nums[l-1] * nums[i] * nums[r+1] + dfs(l, i-1) + dfs(i+1, r) for i in range(l, r+1))
        return dp[(l, r)]
    return dfs(1, n-2)
```

### 122. Regular Expression Matching
#### Problem
Implement regex matching with '.' and '*'.
#### Pattern
2-D DP (top-down memo)
**O(m*n)** time
#### Solution
``` Python
def isMatch(self, s, p):
    memo = {}
    def dp(i, j):
        if (i, j) in memo: return memo[(i, j)]
        if j == len(p): return i == len(s)
        first = i < len(s) and p[j] in {s[i], "."}
        if j+1 < len(p) and p[j+1] == "*":
            res = dp(i, j+2) or (first and dp(i+1, j))
        else:
            res = first and dp(i+1, j+1)
        memo[(i, j)] = res
        return res
    return dp(0, 0)
```

### 123. Maximum Subarray
#### Problem
Find the contiguous subarray with the largest sum (Kadane's).
#### Pattern
Kadane's Algorithm
**O(n)** time, **O(1)** space
#### Solution
``` Python
def maxSubArray(self, nums):
    res = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        res = max(res, cur)
    return res
```

### 124. Jump Game
#### Problem
Determine if you can reach the last index from the first given jump lengths.
#### Pattern
Greedy, track max reachable index
**O(n)** time, **O(1)** space
#### Solution
``` Python
def canJump(self, nums):
    goal = len(nums) - 1
    for i in range(len(nums)-2, -1, -1):
        if i + nums[i] >= goal: goal = i
    return goal == 0
```

### 125. Jump Game II
#### Problem
Find the minimum number of jumps to reach the last index.
#### Pattern
Greedy BFS (track current/next boundary)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def jump(self, nums):
    jumps = cur_end = cur_far = 0
    for i in range(len(nums)-1):
        cur_far = max(cur_far, i + nums[i])
        if i == cur_end:
            jumps += 1; cur_end = cur_far
    return jumps
```

### 126. Gas Station
#### Problem
Find the starting gas station index to complete a circular route, or -1.
#### Pattern
Greedy (circular), track surplus
**O(n)** time, **O(1)** space
#### Solution
``` Python
def canCompleteCircuit(self, gas, cost):
    if sum(gas) < sum(cost): return -1
    tank = start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0: tank = 0; start = i + 1
    return start
```

### 127. Hand of Straights
#### Problem
Determine if a hand of cards can be rearranged into groups of consecutive cards.
#### Pattern
Greedy, ordered counter
**O(n log n)** time
#### Solution
``` Python
def isNStraightHand(self, hand, groupSize):
    if len(hand) % groupSize: return False
    count = {}
    for c in hand: count[c] = count.get(c, 0) + 1
    for card in sorted(count):
        if count[card] > 0:
            n = count[card]
            for i in range(card, card + groupSize):
                if count[i] < n: return False
                count[i] -= n
    return True
```

### 128. Merge Triplets to Form Target Triplet
#### Problem
Check if target triplet can be formed by merging valid triplets.
#### Pattern
Greedy, filter valid triplets
**O(n)** time, **O(1)** space
#### Solution
``` Python
def mergeTriplets(self, triplets, target):
    res = [0, 0, 0]
    for t in triplets:
        if t[0] <= target[0] and t[1] <= target[1] and t[2] <= target[2]:
            res = [max(res[i], t[i]) for i in range(3)]
    return res == target
```

### 129. Partition Labels
#### Problem
Partition a string into as many parts as possible so each letter appears in one part.
#### Pattern
Greedy, last occurrence of each char
**O(n)** time, **O(1)** space
#### Solution
``` Python
def partitionLabels(self, s):
    last = {c: i for i, c in enumerate(s)}
    res = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])
        if i == end:
            res.append(end - start + 1); start = i + 1
    return res
```

### 130. Valid Parenthesis String
#### Problem
Check if a string with '(', ')' and '*' (wildcard) can be valid.
#### Pattern
Greedy, track min/max open count
**O(n)** time, **O(1)** space
#### Solution
``` Python
def checkValidString(self, s):
    lo = hi = 0
    for c in s:
        if c == "(": lo += 1; hi += 1
        elif c == ")": lo -= 1; hi -= 1
        else: lo -= 1; hi += 1
        if hi < 0: return False
        lo = max(lo, 0)
    return lo == 0
```

### 131. Insert Interval
#### Problem
Insert a new interval into a sorted non-overlapping interval list and merge.
#### Pattern
Linear scan, 3 phases
**O(n)** time, **O(n)** space
#### Solution
``` Python
def insert(self, intervals, newInterval):
    res = []
    for i, (s, e) in enumerate(intervals):
        if newInterval[1] < s:
            res.append(newInterval); return res + intervals[i:]
        elif newInterval[0] > e:
            res.append([s, e])
        else:
            newInterval = [min(newInterval[0], s), max(newInterval[1], e)]
    res.append(newInterval)
    return res
```

### 132. Merge Intervals
#### Problem
Merge all overlapping intervals.
#### Pattern
Sort + greedy merge
**O(n log n)** time
#### Solution
``` Python
def merge(self, intervals):
    intervals.sort()
    res = [intervals[0]]
    for s, e in intervals[1:]:
        if s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)
        else: res.append([s, e])
    return res
```

### 133. Non-overlapping Intervals
#### Problem
Find the minimum number of intervals to remove to eliminate all overlaps.
#### Pattern
Greedy, sort by end, count removals
**O(n log n)** time
#### Solution
``` Python
def eraseOverlapIntervals(self, intervals):
    intervals.sort(key=lambda x: x[1])
    res = 0; end = float('-inf')
    for s, e in intervals:
        if s >= end: end = e
        else: res += 1
    return res
```

### 134. Meeting Rooms
#### Problem
Determine if a person can attend all meetings (no overlap).
#### Pattern
Sort, check adjacent overlap
**O(n log n)** time
#### Solution
``` Python
def canAttendMeetings(self, intervals):
    intervals.sort()
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]: return False
    return True
```

### 135. Meeting Rooms II
#### Problem
Find the minimum number of meeting rooms required.
#### Pattern
Min heap of end times
**O(n log n)** time
#### Solution
``` Python
def minMeetingRooms(self, intervals):
    intervals.sort()
    heap = []
    for s, e in intervals:
        if heap and heap[0] <= s: heapq.heapreplace(heap, e)
        else: heapq.heappush(heap, e)
    return len(heap)
```

### 136. Minimum Interval to Include Each Query
#### Problem
For each query, find the size of the smallest interval containing it.
#### Pattern
Sort intervals + queries, min heap
**O((n+q) log n)** time
#### Solution
``` Python
def minInterval(self, intervals, queries):
    intervals.sort()
    heap = []  # (size, end)
    res = {}
    i = 0
    for q in sorted(queries):
        while i < len(intervals) and intervals[i][0] <= q:
            s, e = intervals[i]
            heapq.heappush(heap, (e - s + 1, e))
            i += 1
        while heap and heap[0][1] < q: heapq.heappop(heap)
        res[q] = heap[0][0] if heap else -1
    return [res[q] for q in queries]
```

### 137. Rotate Image
#### Problem
Rotate an n×n matrix 90 degrees clockwise in-place.
#### Pattern
Transpose then reverse rows
**O(n²)** time, **O(1)** space
#### Solution
``` Python
def rotate(self, matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i+1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix: row.reverse()
```

### 138. Spiral Matrix
#### Problem
Return all elements of a matrix in spiral order.
#### Pattern
Shrink boundaries
**O(m*n)** time, **O(1)** space
#### Solution
``` Python
def spiralOrder(self, matrix):
    res = []
    top, bottom, left, right = 0, len(matrix)-1, 0, len(matrix[0])-1
    while top <= bottom and left <= right:
        res += matrix[top][left:right+1]; top += 1
        for r in range(top, bottom+1): res.append(matrix[r][right]); right -= 1
        if top <= bottom: res += matrix[bottom][left:right+1][::-1]; bottom -= 1
        if left <= right:
            for r in range(bottom, top-1, -1): res.append(matrix[r][left]); left += 1
    return res
```

### 139. Set Matrix Zeroes
#### Problem
Set entire row and column to zero if an element is zero, in-place.
#### Pattern
Use first row/col as markers
**O(m*n)** time, **O(1)** space
#### Solution
``` Python
def setZeroes(self, matrix):
    rows, cols = len(matrix), len(matrix[0])
    first_row = any(matrix[0][c] == 0 for c in range(cols))
    first_col = any(matrix[r][0] == 0 for r in range(rows))
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][c] == 0: matrix[r][0] = matrix[0][c] = 0
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][0] == 0 or matrix[0][c] == 0: matrix[r][c] = 0
    if first_row:
        for c in range(cols): matrix[0][c] = 0
    if first_col:
        for r in range(rows): matrix[r][0] = 0
```

### 140. Happy Number
#### Problem
Determine if a number eventually reaches 1 by repeatedly summing squared digits.
#### Pattern
Fast/slow pointer on sum-of-squares sequence
**O(log n)** time
#### Solution
``` Python
def isHappy(self, n):
    def next_n(x): return sum(int(d)**2 for d in str(x))
    slow, fast = n, next_n(n)
    while fast != 1 and slow != fast:
        slow = next_n(slow); fast = next_n(next_n(fast))
    return fast == 1
```

### 141. Plus One
#### Problem
Increment a number represented as an array of digits by one.
#### Pattern
Math carry propagation
**O(n)** time
#### Solution
``` Python
def plusOne(self, digits):
    for i in range(len(digits)-1, -1, -1):
        if digits[i] < 9: digits[i] += 1; return digits
        digits[i] = 0
    return [1] + digits
```

### 142. Pow(x, n)
#### Problem
Implement fast exponentiation x^n.
#### Pattern
Fast exponentiation
**O(log n)** time, **O(1)** space
#### Solution
``` Python
def myPow(self, x, n):
    if n < 0: x, n = 1/x, -n
    res = 1
    while n:
        if n % 2: res *= x
        x *= x; n //= 2
    return res
```

### 143. Multiply Strings
#### Problem
Multiply two non-negative integers represented as strings without using big integers.
#### Pattern
Grade-school multiplication
**O(m*n)** time
#### Solution
``` Python
def multiply(self, num1, num2):
    if "0" in [num1, num2]: return "0"
    res = [0] * (len(num1) + len(num2))
    for i in range(len(num1)-1, -1, -1):
        for j in range(len(num2)-1, -1, -1):
            mul = int(num1[i]) * int(num2[j])
            p1, p2 = i+j, i+j+1
            total = mul + res[p2]
            res[p2] = total % 10; res[p1] += total // 10
    return "".join(map(str, res)).lstrip("0")
```

### 144. Detect Squares
#### Problem
Design a data structure to count axis-aligned squares given a stream of points.
#### Pattern
Count points, enumerate diagonal pairs
**O(n)** add, **O(n)** count
#### Solution
``` Python
class DetectSquares:
    def __init__(self):
        self.pt_counts = {}
        self.pts = set()
    def add(self, point):
        p = tuple(point)
        self.pt_counts[p] = self.pt_counts.get(p, 0) + 1
        self.pts.add(tuple(point))
    def count(self, point):
        px, py = point
        res = 0
        for x, y in self.pts:
            if abs(py - y) != abs(px - x) or x == px or y == py: continue
            res += self.pt_counts.get((x, py), 0) * self.pt_counts.get((px, y), 0)
        return res
```

### 145. Single Number
#### Problem
Find the element that appears only once when all others appear twice.
#### Pattern
XOR (self-canceling)
**O(n)** time, **O(1)** space
#### Solution
``` Python
def singleNumber(self, nums):
    res = 0
    for n in nums: res ^= n
    return res
```

### 146. Number of 1 Bits
#### Problem
Count the number of set bits (Hamming weight) in an integer.
#### Pattern
Bit manipulation, n & (n-1) clears lowest set bit
**O(1)** time
#### Solution
``` Python
def hammingWeight(self, n):
    res = 0
    while n:
        n &= n - 1; res += 1
    return res
```

### 147. Counting Bits
#### Problem
Return an array of bit counts for every number from 0 to n.
#### Pattern
DP, use LSB and shift
**O(n)** time, **O(n)** space
#### Solution
``` Python
def countBits(self, n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
```

### 148. Reverse Bits
#### Problem
Reverse the bits of a 32-bit unsigned integer.
#### Pattern
Bit manipulation, shift and OR
**O(1)** time
#### Solution
``` Python
def reverseBits(self, n):
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)
        n >>= 1
    return res
```

### 149. Missing Number
#### Problem
Find the missing number in an array containing [0, n] with one missing.
#### Pattern
XOR or Gauss formula
**O(n)** time, **O(1)** space
#### Solution
``` Python
def missingNumber(self, nums):
    return len(nums) * (len(nums)+1) // 2 - sum(nums)
```

### 150. Sum of Two Integers
#### Problem
Calculate the sum of two integers without using + or -.
#### Pattern
Bit manipulation (simulate adder)
**O(1)** time
#### Solution
``` Python
def getSum(self, a, b):
    mask = 0xFFFFFFFF
    while b & mask:
        carry = (a & b) << 1
        a ^= b; b = carry
    return a if b == 0 else a & mask
```
