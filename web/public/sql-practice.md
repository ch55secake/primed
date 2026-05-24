---
type: sql-practice
---

# SQL Practice — LeetCode 50 + Hard Tier

Senior-interview-grade SQL drill. ~70 problems sourced from LeetCode's curated [SQL 50 study plan](https://leetcode.com/studyplan/top-sql-50/) plus the Hard tier of LeetCode's Database problem set. All solutions written in **Postgres** syntax (LeetCode's default is MySQL; differences are noted where relevant).

Problems are organised by primary pattern: Aggregation & Counting → Joins → Subqueries & Set Logic → Window Functions → Self-Joins & Hierarchies → Date / Time → String Manipulation → Recursive CTEs → Advanced Patterns.

*Prompts are paraphrased for educational use. Solutions are written for senior-interview Postgres prep, not as LeetCode submissions.*

---

## Aggregation & Counting

### 1. Big Countries

#### Problem

Given a `world` table of countries with area and population, return the countries that qualify as "big" — either at least 3,000,000 km² in area or at least 25,000,000 in population. Output the name, population, and area.

**Schema:**

```
world
  name        varchar  PRIMARY KEY
  continent   varchar
  area        integer
  population  bigint
  gdp         bigint
```

**Expected output (sample):**

| name        | population  | area     |
|-------------|-------------|----------|
| Afghanistan | 25500100    | 652230   |
| Algeria     | 37100000    | 2381741  |

#### Pattern

Simple filter with OR.

#### Explanation

Trivial filter. The only thing worth saying: prefer `OR` here over `UNION` of two queries — the planner can use a single sequential scan with a disjunctive predicate, and you avoid materialising and de-duplicating two result sets.

#### Solution

```sql
SELECT name, population, area
FROM world
WHERE area >= 3000000
   OR population >= 25000000;
```

*Source: LeetCode #595 — Big Countries*

---

### 2. Recyclable and Low Fat Products

#### Problem

From a `products` table with `low_fats` and `recyclable` flags (each `'Y'` or `'N'`), return the IDs of products that are both low-fat and recyclable.

**Schema:**

```
products
  product_id  integer  PRIMARY KEY
  low_fats    char(1)  CHECK (low_fats IN ('Y','N'))
  recyclable  char(1)  CHECK (recyclable IN ('Y','N'))
```

**Expected output (sample):**

| product_id |
|------------|
| 1          |
| 3          |

#### Pattern

Compound boolean filter.

#### Explanation

A single-pass `WHERE` with two `=` predicates. If this table were enormous, a partial expression index on `(low_fats, recyclable) WHERE low_fats='Y' AND recyclable='Y'` would matter; in practice it doesn't.

#### Solution

```sql
SELECT product_id
FROM products
WHERE low_fats = 'Y' AND recyclable = 'Y';
```

*Source: LeetCode #1757 — Recyclable and Low Fat Products*

---

### 3. Number of Unique Subjects Taught by Each Teacher

#### Problem

Given `teacher(teacher_id, subject_id, dept_id)`, return for each teacher the count of distinct subjects they teach. Note: the same subject taught in two departments counts once.

**Schema:**

```
teacher
  teacher_id  integer
  subject_id  integer
  dept_id     integer
  PRIMARY KEY (subject_id, dept_id)
```

**Expected output (sample):**

| teacher_id | cnt |
|------------|-----|
| 1          | 2   |
| 2          | 4   |

#### Pattern

`COUNT(DISTINCT ...)` with `GROUP BY`.

#### Explanation

`COUNT(DISTINCT subject_id)` per teacher — the natural fit. Faster than `GROUP BY teacher_id, subject_id` followed by an outer count, and reads better.

#### Solution

```sql
SELECT teacher_id, COUNT(DISTINCT subject_id) AS cnt
FROM teacher
GROUP BY teacher_id;
```

*Source: LeetCode #2356 — Number of Unique Subjects Taught by Each Teacher*

---

### 4. Find Followers Count

#### Problem

Given a `followers(user_id, follower_id)` table, return each user's follower count, sorted by `user_id` ascending.

**Schema:**

```
followers
  user_id      integer
  follower_id  integer
  PRIMARY KEY (user_id, follower_id)
```

**Expected output (sample):**

| user_id | followers_count |
|---------|-----------------|
| 0       | 2               |
| 1       | 1               |
| 2       | 1               |

#### Pattern

`GROUP BY` + `COUNT(*)`.

#### Explanation

The PK guarantees `(user_id, follower_id)` is unique, so `COUNT(*)` is sufficient — no need for `COUNT(DISTINCT)`. Knowing your constraints lets you skip needless work.

#### Solution

```sql
SELECT user_id, COUNT(*) AS followers_count
FROM followers
GROUP BY user_id
ORDER BY user_id;
```

*Source: LeetCode #1729 — Find Followers Count*

---

### 5. Classes More Than 5 Students

#### Problem

From a `courses(student, class)` table, return the names of classes that have at least 5 students.

**Schema:**

```
courses
  student  varchar
  class    varchar
  PRIMARY KEY (student, class)
```

**Expected output (sample):**

| class    |
|----------|
| Math     |

#### Pattern

`GROUP BY` + `HAVING`.

#### Explanation

`HAVING` filters groups after aggregation. The PK already guarantees student uniqueness per class, so `COUNT(*)` is fine — no `DISTINCT` needed.

#### Solution

```sql
SELECT class
FROM courses
GROUP BY class
HAVING COUNT(*) >= 5;
```

*Source: LeetCode #596 — Classes More Than 5 Students*

---

### 6. Confirmation Rate

#### Problem

Given `signups(user_id, time_stamp)` and `confirmations(user_id, time_stamp, action)` where `action` is `'confirmed'` or `'timeout'`, return each signed-up user's confirmation rate (confirmed / total messages), rounded to two decimals. Users with no messages get rate 0.00.

**Schema:**

```
signups
  user_id     integer  PRIMARY KEY
  time_stamp  timestamp

confirmations
  user_id     integer  FK → signups
  time_stamp  timestamp
  action      varchar  CHECK (action IN ('confirmed','timeout'))
  PRIMARY KEY (user_id, time_stamp)
```

**Expected output (sample):**

| user_id | confirmation_rate |
|---------|-------------------|
| 6       | 0.00              |
| 3       | 0.00              |
| 7       | 1.00              |
| 2       | 0.50              |

#### Pattern

`LEFT JOIN` + conditional aggregation.

#### Explanation

The classic "rate of X out of total" — express the numerator as `AVG((action='confirmed')::int)`. Postgres handles the bool→int cast cleanly; in MySQL you'd write `AVG(action = 'confirmed')`. `LEFT JOIN` plus `COALESCE`/grouping keeps users with no messages.

#### Solution

```sql
SELECT s.user_id,
       ROUND(COALESCE(AVG((c.action = 'confirmed')::int)::numeric, 0), 2) AS confirmation_rate
FROM signups s
LEFT JOIN confirmations c USING (user_id)
GROUP BY s.user_id;
```

*Source: LeetCode #1934 — Confirmation Rate*

---

### 7. Queries Quality and Percentage

#### Problem

From a `queries(query_name, result, position, rating)` table, for each query name return the quality (average of `rating / position`) and the poor-query percentage (rating < 3), both rounded to two decimals.

**Schema:**

```
queries
  query_name  varchar
  result      varchar
  position    integer
  rating      integer
```

**Expected output (sample):**

| query_name | quality | poor_query_percentage |
|------------|---------|-----------------------|
| Dog        | 2.50    | 0.00                  |
| Cat        | 0.66    | 33.33                 |

#### Pattern

Conditional aggregation with `AVG`.

#### Explanation

Two derived metrics in one pass. Cast to `numeric` before dividing — integer division would zero out fractional ratings. The poor-query percentage is `100 * AVG((rating < 3)::int)`.

#### Solution

```sql
SELECT query_name,
       ROUND(AVG(rating::numeric / position), 2)            AS quality,
       ROUND(100 * AVG((rating < 3)::int)::numeric, 2)      AS poor_query_percentage
FROM queries
WHERE query_name IS NOT NULL
GROUP BY query_name;
```

*Source: LeetCode #1211 — Queries Quality and Percentage*

---

### 8. Monthly Transactions I

#### Problem

For each (month, country) pair in `transactions`, return the total transaction count, the count of approved transactions, the total amount, and the approved amount. Month format `YYYY-MM`.

**Schema:**

```
transactions
  id        integer  PRIMARY KEY
  country   varchar
  state     varchar  CHECK (state IN ('approved','declined'))
  amount    integer
  trans_date date
```

**Expected output (sample):**

| month   | country | trans_count | approved_count | trans_total_amount | approved_total_amount |
|---------|---------|-------------|----------------|--------------------|-----------------------|
| 2018-12 | US      | 2           | 1              | 3000               | 1000                  |
| 2019-01 | US      | 1           | 1              | 2000               | 2000                  |

#### Pattern

`GROUP BY` on a derived month + conditional sums.

#### Explanation

`TO_CHAR(trans_date, 'YYYY-MM')` gives the month bucket. Conditional `SUM(CASE WHEN ...)` and `COUNT(... FILTER (WHERE ...))` are equivalent; `FILTER` reads better and is standard SQL.

#### Solution

```sql
SELECT TO_CHAR(trans_date, 'YYYY-MM')                    AS month,
       country,
       COUNT(*)                                          AS trans_count,
       COUNT(*) FILTER (WHERE state = 'approved')        AS approved_count,
       SUM(amount)                                       AS trans_total_amount,
       SUM(amount) FILTER (WHERE state = 'approved')     AS approved_total_amount
FROM transactions
GROUP BY 1, country;
```

*Source: LeetCode #1193 — Monthly Transactions I*

---

### 9. Average Time of Process per Machine

#### Problem

Given `activity(machine_id, process_id, activity_type, timestamp)` where `activity_type` is `'start'` or `'end'`, compute the average processing time (end − start) per machine, rounded to three decimals.

**Schema:**

```
activity
  machine_id     integer
  process_id     integer
  activity_type  varchar  CHECK (activity_type IN ('start','end'))
  timestamp      float
  PRIMARY KEY (machine_id, process_id, activity_type)
```

**Expected output (sample):**

| machine_id | processing_time |
|------------|-----------------|
| 0          | 0.712           |
| 1          | 1.103           |
| 2          | 4.456           |

#### Pattern

Self-join on `(machine_id, process_id)` or conditional aggregation.

#### Explanation

A self-join works but is wasteful — two passes plus a join. Cleaner: aggregate in one pass with `SUM(... FILTER ...)`. For each machine, average the (end − start) deltas per process.

#### Solution

```sql
SELECT machine_id,
       ROUND(
         AVG(end_ts - start_ts)::numeric,
         3
       ) AS processing_time
FROM (
  SELECT machine_id,
         process_id,
         MAX(timestamp) FILTER (WHERE activity_type = 'end')   AS end_ts,
         MAX(timestamp) FILTER (WHERE activity_type = 'start') AS start_ts
  FROM activity
  GROUP BY machine_id, process_id
) t
GROUP BY machine_id;
```

*Source: LeetCode #1661 — Average Time of Process per Machine*

---

### 10. Number of Employees Which Report to Each Employee

#### Problem

From an `employees(employee_id, name, reports_to, age)` table, for each manager who has at least one direct report return their id, name, the count of direct reports, and the average reportee age rounded to the nearest integer. Sort by `employee_id`.

**Schema:**

```
employees
  employee_id  integer  PRIMARY KEY
  name         varchar
  reports_to   integer  FK → employees(employee_id)
  age          integer
```

**Expected output (sample):**

| employee_id | name  | reports_count | average_age |
|-------------|-------|---------------|-------------|
| 1           | Alice | 1             | 31          |
| 2           | Bob   | 2             | 26          |

#### Pattern

Self-join on `reports_to = employee_id` + aggregation.

#### Explanation

Standard inner self-join: managers on the left, reports on the right. Inner join automatically drops managers with no reports. `ROUND(AVG(age))` for the integer rounding — note Postgres rounds halves away from zero, MySQL banker's-rounds.

#### Solution

```sql
SELECT m.employee_id,
       m.name,
       COUNT(*)              AS reports_count,
       ROUND(AVG(r.age))::int AS average_age
FROM employees m
JOIN employees r ON r.reports_to = m.employee_id
GROUP BY m.employee_id, m.name
ORDER BY m.employee_id;
```

*Source: LeetCode #1731 — The Number of Employees Which Report to Each Employee*

---

## Joins

### 11. Replace Employee ID with the Unique Identifier

#### Problem

Given `employees(id, name)` and `employee_uni(id, unique_id)`, return each employee's `unique_id` and `name`. If no unique id exists, show `NULL`.

**Schema:**

```
employees
  id    integer  PRIMARY KEY
  name  varchar

employee_uni
  id          integer  FK → employees(id)
  unique_id   integer
  PRIMARY KEY (id, unique_id)
```

**Expected output (sample):**

| unique_id | name     |
|-----------|----------|
| NULL      | Alice    |
| NULL      | Bob      |
| 3         | Meir     |

#### Pattern

`LEFT JOIN`.

#### Explanation

A clean left-join with employees on the left so unmatched rows are preserved. Order of tables matters semantically — left table is the "anchor" you must keep.

#### Solution

```sql
SELECT eu.unique_id, e.name
FROM employees e
LEFT JOIN employee_uni eu ON eu.id = e.id;
```

*Source: LeetCode #1378 — Replace Employee ID with the Unique Identifier*

---

### 12. Product Sales Analysis I

#### Problem

Given `sales(sale_id, product_id, year, quantity, price)` and `product(product_id, product_name)`, return for each sale the `product_name`, `year`, and `price`.

**Schema:**

```
sales
  sale_id     integer
  product_id  integer  FK → product
  year        integer
  quantity    integer
  price       integer
  PRIMARY KEY (sale_id, year)

product
  product_id    integer  PRIMARY KEY
  product_name  varchar
```

**Expected output (sample):**

| product_name | year | price |
|--------------|------|-------|
| LCPHONE      | 2018 | 5000  |
| LCPHONE      | 2019 | 5000  |

#### Pattern

Inner join.

#### Explanation

A no-frills join. `USING (product_id)` works because the column name is shared and you avoid the qualifier salad.

#### Solution

```sql
SELECT p.product_name, s.year, s.price
FROM sales s
JOIN product p USING (product_id);
```

*Source: LeetCode #1068 — Product Sales Analysis I*

---

### 13. Customer Who Visited but Did Not Make Any Transactions

#### Problem

Given `visits(visit_id, customer_id)` and `transactions(transaction_id, visit_id, amount)`, return each customer who has at least one visit with zero transactions, along with the count of such visits.

**Schema:**

```
visits
  visit_id     integer  PRIMARY KEY
  customer_id  integer

transactions
  transaction_id  integer  PRIMARY KEY
  visit_id        integer  FK → visits
  amount          integer
```

**Expected output (sample):**

| customer_id | count_no_trans |
|-------------|----------------|
| 54          | 2              |
| 30          | 1              |
| 96          | 1              |

#### Pattern

Anti-join via `LEFT JOIN ... IS NULL`.

#### Explanation

Two equivalent shapes: `LEFT JOIN transactions WHERE transaction_id IS NULL` or `WHERE NOT EXISTS (...)`. Both produce the same plan in Postgres (anti-join). I prefer `NOT EXISTS` for the intent; `LEFT JOIN ... IS NULL` is fine when you also want columns from the right side.

#### Solution

```sql
SELECT v.customer_id, COUNT(*) AS count_no_trans
FROM visits v
LEFT JOIN transactions t ON t.visit_id = v.visit_id
WHERE t.transaction_id IS NULL
GROUP BY v.customer_id;
```

*Source: LeetCode #1581 — Customer Who Visited but Did Not Make Any Transactions*

---

### 14. Students and Examinations

#### Problem

Given `students(student_id, student_name)`, `subjects(subject_name)`, and `examinations(student_id, subject_name)`, return every (student, subject) pair with the attendance count (zero allowed). Order by `student_id`, then `subject_name`.

**Schema:**

```
students
  student_id    integer  PRIMARY KEY
  student_name  varchar

subjects
  subject_name  varchar  PRIMARY KEY

examinations
  student_id    integer  FK → students
  subject_name  varchar  FK → subjects
```

**Expected output (sample):**

| student_id | student_name | subject_name | attended_exams |
|------------|--------------|--------------|----------------|
| 1          | Alice        | Math         | 3              |
| 1          | Alice        | Physics      | 2              |
| 1          | Alice        | Programming  | 1              |

#### Pattern

`CROSS JOIN` (Cartesian) + `LEFT JOIN`.

#### Explanation

Generate every (student, subject) pair via `CROSS JOIN`, then `LEFT JOIN` the exam history to count attendances. The cartesian product is the only honest way to materialise pairs that may have zero attendances.

#### Solution

```sql
SELECT st.student_id,
       st.student_name,
       su.subject_name,
       COUNT(e.student_id) AS attended_exams
FROM students st
CROSS JOIN subjects su
LEFT JOIN examinations e
       ON e.student_id   = st.student_id
      AND e.subject_name = su.subject_name
GROUP BY st.student_id, st.student_name, su.subject_name
ORDER BY st.student_id, su.subject_name;
```

*Source: LeetCode #1280 — Students and Examinations*

---

### 15. Managers with At Least 5 Direct Reports

#### Problem

From `employees(id, name, department, managerId)`, return the names of managers who have at least five direct reports.

**Schema:**

```
employees
  id          integer  PRIMARY KEY
  name        varchar
  department  varchar
  manager_id  integer  FK → employees(id)
```

**Expected output (sample):**

| name |
|------|
| John |

#### Pattern

Self-join + `HAVING COUNT(*) >= 5`.

#### Explanation

The pattern: aggregate the report side, threshold with `HAVING`, then join to the manager side for the name. You can do this in one statement with a self-join + group by; either way is fine.

#### Solution

```sql
SELECT e.name
FROM employees e
JOIN employees r ON r.manager_id = e.id
GROUP BY e.id, e.name
HAVING COUNT(*) >= 5;
```

*Source: LeetCode #570 — Managers with at Least 5 Direct Reports*

---

### 16. Employee Bonus

#### Problem

Given `employee(empId, name, supervisor, salary)` and `bonus(empId, bonus)`, return name and bonus for every employee whose bonus is less than 1000 or has no bonus row.

**Schema:**

```
employee
  emp_id     integer  PRIMARY KEY
  name       varchar
  supervisor integer
  salary     integer

bonus
  emp_id  integer  FK → employee
  bonus   integer
```

**Expected output (sample):**

| name   | bonus |
|--------|-------|
| Brad   | NULL  |
| John   | NULL  |
| Dan    | 500   |

#### Pattern

`LEFT JOIN` + `WHERE` on NULL-permitting predicate.

#### Explanation

Watch the NULL semantics: `bonus < 1000` is FALSE when bonus is NULL, so you must add `OR bonus IS NULL`. This is the kind of off-by-one that bites in interviews.

#### Solution

```sql
SELECT e.name, b.bonus
FROM employee e
LEFT JOIN bonus b USING (emp_id)
WHERE b.bonus < 1000 OR b.bonus IS NULL;
```

*Source: LeetCode #577 — Employee Bonus*

---

### 17. Article Views I

#### Problem

Given `views(article_id, author_id, viewer_id, view_date)`, return the distinct ids of authors who have viewed at least one of their own articles, sorted ascending.

**Schema:**

```
views
  article_id  integer
  author_id   integer
  viewer_id   integer
  view_date   date
```

**Expected output (sample):**

| id |
|----|
| 4  |
| 7  |

#### Pattern

Self-equality filter + `DISTINCT`.

#### Explanation

No join needed — the predicate is on the same row. `DISTINCT` because an author can view many of their own articles.

#### Solution

```sql
SELECT DISTINCT author_id AS id
FROM views
WHERE author_id = viewer_id
ORDER BY id;
```

*Source: LeetCode #1148 — Article Views I*

---

### 18. Find Customer Referee

#### Problem

From `customer(id, name, referee_id)`, return the names of customers whose `referee_id` is not 2 (including those with no referee).

**Schema:**

```
customer
  id          integer  PRIMARY KEY
  name        varchar
  referee_id  integer
```

**Expected output (sample):**

| name |
|------|
| Will |
| Jane |
| Bill |
| Zack |

#### Pattern

NULL-safe inequality.

#### Explanation

`referee_id != 2` returns UNKNOWN for NULLs, which are then dropped. To keep them: `referee_id IS DISTINCT FROM 2` (Postgres-native, NULL-safe) or `referee_id != 2 OR referee_id IS NULL`.

#### Solution

```sql
SELECT name
FROM customer
WHERE referee_id IS DISTINCT FROM 2;
```

*Source: LeetCode #584 — Find Customer Referee*

---

### 19. Project Employees I

#### Problem

Given `project(project_id, employee_id)` and `employee(employee_id, name, experience_years)`, return each project's average employee experience years rounded to two decimals.

**Schema:**

```
project
  project_id   integer
  employee_id  integer  FK → employee
  PRIMARY KEY (project_id, employee_id)

employee
  employee_id       integer  PRIMARY KEY
  name              varchar
  experience_years  integer
```

**Expected output (sample):**

| project_id | average_years |
|------------|---------------|
| 1          | 2.00          |
| 2          | 2.50          |

#### Pattern

Join + `AVG` per group.

#### Explanation

Straightforward — join, group, average. Cast to `numeric` before rounding to avoid integer division surprises.

#### Solution

```sql
SELECT p.project_id,
       ROUND(AVG(e.experience_years)::numeric, 2) AS average_years
FROM project p
JOIN employee e USING (employee_id)
GROUP BY p.project_id;
```

*Source: LeetCode #1075 — Project Employees I*

---

### 20. Sales Person

#### Problem

Given `salesperson(sales_id, name, ...)`, `company(com_id, name, ...)`, and `orders(order_id, order_date, com_id, sales_id, amount)`, return the names of salespeople who have **never** placed an order with the company named "RED".

**Schema:**

```
salesperson
  sales_id  integer  PRIMARY KEY
  name      varchar

company
  com_id  integer  PRIMARY KEY
  name    varchar

orders
  order_id    integer  PRIMARY KEY
  order_date  date
  com_id      integer  FK → company
  sales_id    integer  FK → salesperson
  amount      integer
```

**Expected output (sample):**

| name |
|------|
| Abe  |
| Pat  |

#### Pattern

Anti-join via `NOT IN` / `NOT EXISTS`.

#### Explanation

`NOT IN` is fine here only if the inner subquery cannot return NULLs (if it can, the whole predicate becomes UNKNOWN and you get zero rows). `NOT EXISTS` is NULL-safe and reads better — use that as your default.

#### Solution

```sql
SELECT name
FROM salesperson sp
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  JOIN company c ON c.com_id = o.com_id
  WHERE o.sales_id = sp.sales_id
    AND c.name = 'RED'
);
```

*Source: LeetCode #607 — Sales Person*

---

## Subqueries & Set Logic

### 21. Customers Who Bought All Products

#### Problem

Given `customer(customer_id, product_key)` and `product(product_key)`, return the customers who have bought every product in the catalogue.

**Schema:**

```
product
  product_key  integer  PRIMARY KEY

customer
  customer_id  integer
  product_key  integer  FK → product
```

**Expected output (sample):**

| customer_id |
|-------------|
| 1           |
| 3           |

#### Pattern

Division: `COUNT(DISTINCT)` per customer vs. catalogue size.

#### Explanation

Classic relational division. Group by customer, count distinct products purchased, compare to the catalogue size (a scalar subquery). The alternative `NOT EXISTS (... product NOT IN customer's set ...)` is the literal translation of the universal quantifier but is harder to read.

#### Solution

```sql
SELECT customer_id
FROM customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product);
```

*Source: LeetCode #1045 — Customers Who Bought All Products*

---

### 22. Customers Who Bought Products A and B but Not C

#### Problem

Given `customers(customer_id, customer_name)` and `orders(order_id, customer_id, product_name)`, return the customers who have bought products `'A'` and `'B'` but not `'C'`.

**Schema:**

```
customers
  customer_id    integer  PRIMARY KEY
  customer_name  varchar

orders
  order_id      integer  PRIMARY KEY
  customer_id   integer  FK → customers
  product_name  varchar
```

**Expected output (sample):**

| customer_id | customer_name |
|-------------|---------------|
| 1           | Daniel        |

#### Pattern

`GROUP BY` + `HAVING` with `BOOL_OR`/`SUM(CASE)` flags.

#### Explanation

Aggregate three booleans per customer and threshold them in one `HAVING`. `BOOL_OR` is the Postgres idiom and reads cleanly; MySQL would use `MAX(product_name='A')`. Avoid three subqueries with `EXISTS` — one pass beats three.

#### Solution

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
JOIN orders o USING (customer_id)
GROUP BY c.customer_id, c.customer_name
HAVING BOOL_OR(o.product_name = 'A')
   AND BOOL_OR(o.product_name = 'B')
   AND NOT BOOL_OR(o.product_name = 'C');
```

*Source: LeetCode #1965 / community — Customers Who Bought Products A and B but Not C*

---

### 23. Investments in 2016

#### Problem

Given `insurance(pid, tiv_2015, tiv_2016, lat, lon)`, return the sum of `tiv_2016` for policies whose `tiv_2015` value is shared by at least one other policy **and** whose `(lat, lon)` is unique. Round to two decimals.

**Schema:**

```
insurance
  pid       integer  PRIMARY KEY
  tiv_2015  float
  tiv_2016  float
  lat       float
  lon       float
```

**Expected output (sample):**

| tiv_2016 |
|----------|
| 45.00    |

#### Pattern

Window-function frequency counts.

#### Explanation

Two conditions become two `COUNT(*) OVER (PARTITION BY ...)` calls — frequency of `tiv_2015` and frequency of `(lat, lon)`. One pass, no self-joins.

#### Solution

```sql
SELECT ROUND(SUM(tiv_2016)::numeric, 2) AS tiv_2016
FROM (
  SELECT tiv_2016,
         COUNT(*) OVER (PARTITION BY tiv_2015)   AS tiv15_cnt,
         COUNT(*) OVER (PARTITION BY lat, lon)   AS loc_cnt
  FROM insurance
) t
WHERE tiv15_cnt > 1 AND loc_cnt = 1;
```

*Source: LeetCode #585 — Investments in 2016*

---

### 24. Triangle Judgment

#### Problem

Given `triangle(x, y, z)`, return for each row whether the three lengths can form a valid triangle (`'Yes'` / `'No'`).

**Schema:**

```
triangle
  x  integer
  y  integer
  z  integer
```

**Expected output (sample):**

| x  | y | z  | triangle |
|----|---|----|----------|
| 13 | 15 | 30 | No       |
| 10 | 20 | 15 | Yes      |

#### Pattern

`CASE` expression.

#### Explanation

Triangle inequality: each side must be strictly less than the sum of the other two. A `CASE` expression is the cleanest way.

#### Solution

```sql
SELECT x, y, z,
       CASE
         WHEN x + y > z AND x + z > y AND y + z > x THEN 'Yes'
         ELSE 'No'
       END AS triangle
FROM triangle;
```

*Source: LeetCode #610 — Triangle Judgment*

---

### 25. Biggest Single Number

#### Problem

From a `my_numbers(num)` table, return the largest number that appears exactly once. Return `NULL` if no such number exists.

**Schema:**

```
my_numbers
  num  integer
```

**Expected output (sample):**

| num |
|-----|
| 6   |

#### Pattern

`GROUP BY` + `HAVING` + scalar subquery.

#### Explanation

Group, keep singletons, `MAX`. Wrap in a scalar subquery so an empty result returns `NULL` rather than zero rows — important when the grader expects exactly one row.

#### Solution

```sql
SELECT (
  SELECT MAX(num)
  FROM my_numbers
  GROUP BY num
  HAVING COUNT(*) = 1
  ORDER BY 1 DESC
  LIMIT 1
) AS num;
```

*Source: LeetCode #619 — Biggest Single Number*

---

### 26. Group Sold Products by the Date

#### Problem

From `activities(sell_date, product)`, for each `sell_date` return the number of distinct products sold and an alphabetically-sorted comma-separated list of those products.

**Schema:**

```
activities
  sell_date  date
  product    varchar
```

**Expected output (sample):**

| sell_date  | num_sold | products                     |
|------------|----------|------------------------------|
| 2020-05-30 | 3        | Basketball,Headphone,T-Shirt |
| 2020-06-01 | 2        | Bible,Pencil                 |

#### Pattern

`COUNT(DISTINCT)` + `STRING_AGG`.

#### Explanation

Postgres has `STRING_AGG(expr, ',' ORDER BY expr)` which sorts within the aggregate — exactly what's needed. MySQL's equivalent is `GROUP_CONCAT(... ORDER BY ... SEPARATOR ',')`. Wrap the inner expression in `DISTINCT` to dedupe products that repeat in a day.

#### Solution

```sql
SELECT sell_date,
       COUNT(DISTINCT product)                         AS num_sold,
       STRING_AGG(DISTINCT product, ',' ORDER BY product) AS products
FROM activities
GROUP BY sell_date
ORDER BY sell_date;
```

*Source: LeetCode #1484 — Group Sold Products by the Date*

---

### 27. Customers Who Never Order

#### Problem

From `customers(id, name)` and `orders(id, customer_id)`, return the names of customers who have never placed an order.

**Schema:**

```
customers
  id    integer  PRIMARY KEY
  name  varchar

orders
  id           integer  PRIMARY KEY
  customer_id  integer  FK → customers(id)
```

**Expected output (sample):**

| customers |
|-----------|
| Henry     |
| Max       |

#### Pattern

Anti-join via `NOT EXISTS`.

#### Explanation

`NOT EXISTS` is the safest formulation — NULL-safe and the planner runs it as an anti-join. `NOT IN` would explode if any `customer_id` were NULL.

#### Solution

```sql
SELECT name AS customers
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

*Source: LeetCode #183 — Customers Who Never Order*

---

## Window Functions

### 28. Rank Scores

#### Problem

Given `scores(id, score)`, rank each score in descending order. Ties get the same rank, and the next rank is consecutive (no gaps).

**Schema:**

```
scores
  id     integer  PRIMARY KEY
  score  numeric
```

**Expected output (sample):**

| score | rank |
|-------|------|
| 4.00  | 1    |
| 4.00  | 1    |
| 3.85  | 2    |
| 3.65  | 3    |

#### Pattern

`DENSE_RANK` window function.

#### Explanation

Three window functions are easy to confuse: `RANK` leaves gaps after ties (1,1,3), `DENSE_RANK` doesn't (1,1,2), `ROW_NUMBER` breaks ties arbitrarily. The "no gaps" requirement is the giveaway.

#### Solution

```sql
SELECT score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM scores;
```

*Source: LeetCode #178 — Rank Scores*

---

### 29. Consecutive Numbers

#### Problem

Given `logs(id, num)`, return all numbers that appear at least three times consecutively (ordered by `id`).

**Schema:**

```
logs
  id   integer  PRIMARY KEY
  num  varchar
```

**Expected output (sample):**

| consecutive_nums |
|------------------|
| 1                |

#### Pattern

`LAG` × 2 (or self-join offset).

#### Explanation

For each row, compare to the two prior rows with `LAG(num, 1)` and `LAG(num, 2)`. If all three agree, the current row is the tail of a run of three. The classic alternative is a triple self-join on `id`, `id-1`, `id-2`, but that assumes contiguous ids.

#### Solution

```sql
SELECT DISTINCT num AS consecutive_nums
FROM (
  SELECT num,
         LAG(num, 1) OVER (ORDER BY id) AS p1,
         LAG(num, 2) OVER (ORDER BY id) AS p2
  FROM logs
) t
WHERE num = p1 AND num = p2;
```

*Source: LeetCode #180 — Consecutive Numbers*

---

### 30. Department Highest Salary

#### Problem

Given `employee(id, name, salary, departmentId)` and `department(id, name)`, return for each department the names of its highest-paid employees (handle ties — multiple winners possible).

**Schema:**

```
employee
  id            integer  PRIMARY KEY
  name          varchar
  salary        integer
  department_id integer  FK → department

department
  id    integer  PRIMARY KEY
  name  varchar
```

**Expected output (sample):**

| Department | Employee | Salary |
|------------|----------|--------|
| IT         | Max      | 90000  |
| Sales      | Henry    | 80000  |

#### Pattern

`RANK` partitioned by department.

#### Explanation

`RANK` is the right tool for "top with ties" — multiple winners share rank 1. `ROW_NUMBER` would pick exactly one. `MAX` per department joined back is the textbook alternative; the window form keeps it to one pass.

#### Solution

```sql
SELECT d.name AS "Department",
       e.name AS "Employee",
       e.salary AS "Salary"
FROM (
  SELECT name, salary, department_id,
         RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rk
  FROM employee
) e
JOIN department d ON d.id = e.department_id
WHERE e.rk = 1;
```

*Source: LeetCode #184 — Department Highest Salary*

---

### 31. Department Top Three Salaries

#### Problem

Given `employee(id, name, salary, departmentId)` and `department(id, name)`, return the top three distinct salaries per department (handle ties — many employees can share a rank).

**Schema:**

```
employee
  id            integer  PRIMARY KEY
  name          varchar
  salary        integer
  department_id integer  FK → department

department
  id    integer  PRIMARY KEY
  name  varchar
```

**Expected output (sample):**

| Department | Employee | Salary |
|------------|----------|--------|
| IT         | Max      | 90000  |
| IT         | Randy    | 85000  |
| IT         | Joe      | 85000  |
| IT         | Will     | 70000  |
| Sales      | Henry    | 80000  |

#### Pattern

`DENSE_RANK` partitioned by department.

#### Explanation

"Top three distinct salaries" → `DENSE_RANK` (no gaps after ties) with `rk <= 3`. The ranking is on distinct salary values, which is exactly what `DENSE_RANK` produces. Beats the legacy "correlated subquery counting higher salaries" approach by an order of magnitude in time complexity.

#### Solution

```sql
WITH ranked AS (
  SELECT name, salary, department_id,
         DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rk
  FROM employee
)
SELECT d.name AS "Department",
       e.name AS "Employee",
       e.salary AS "Salary"
FROM ranked e
JOIN department d ON d.id = e.department_id
WHERE e.rk <= 3;
```

*Source: LeetCode #185 — Department Top Three Salaries*

---

### 32. Restaurant Growth

#### Problem

Given `customer(customer_id, name, visited_on, amount)` — one row per visit per day per customer — return for each day starting from the seventh recorded day: the date, the 7-day rolling sum of amounts ending on that day, and the 7-day rolling average rounded to two decimals.

**Schema:**

```
customer
  customer_id  integer
  name         varchar
  visited_on   date
  amount       integer
```

**Expected output (sample):**

| visited_on | amount | average_amount |
|------------|--------|----------------|
| 2019-01-07 | 860    | 122.86         |
| 2019-01-08 | 840    | 120.00         |

#### Pattern

Daily roll-up + window with rows frame.

#### Explanation

Two passes: aggregate per day, then 7-day rolling sum using `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`. The `OFFSET 6` (or `WHERE row_number >= 7`) drops the leading partial windows where the rolling sum would be incomplete.

#### Solution

```sql
WITH daily AS (
  SELECT visited_on, SUM(amount) AS day_total
  FROM customer
  GROUP BY visited_on
),
rolled AS (
  SELECT visited_on,
         SUM(day_total) OVER w  AS amount,
         AVG(day_total) OVER w  AS avg_amt,
         ROW_NUMBER()  OVER (ORDER BY visited_on) AS rn
  FROM daily
  WINDOW w AS (ORDER BY visited_on ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
)
SELECT visited_on, amount, ROUND(avg_amt::numeric, 2) AS average_amount
FROM rolled
WHERE rn >= 7
ORDER BY visited_on;
```

*Source: LeetCode #1321 — Restaurant Growth*

---

### 33. Game Play Analysis IV

#### Problem

Given `activity(player_id, device_id, event_date, games_played)`, return the fraction of players who logged in the day after their first login, rounded to two decimals.

**Schema:**

```
activity
  player_id    integer
  device_id    integer
  event_date   date
  games_played integer
  PRIMARY KEY (player_id, event_date)
```

**Expected output (sample):**

| fraction |
|----------|
| 0.33     |

#### Pattern

`MIN` window + date arithmetic.

#### Explanation

For each player, find the first login date, then check if `first_login + 1` appears anywhere in their history. `EXISTS` is fine, but a window-min + self-join is also common. Divide by total distinct players.

#### Solution

```sql
WITH firsts AS (
  SELECT player_id,
         MIN(event_date) AS first_date
  FROM activity
  GROUP BY player_id
)
SELECT ROUND(
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM activity a
             WHERE a.player_id  = f.player_id
               AND a.event_date = f.first_date + INTERVAL '1 day'
           )
         )::numeric
         / COUNT(*),
         2
       ) AS fraction
FROM firsts f;
```

*Source: LeetCode #550 — Game Play Analysis IV*

---

### 34. Last Person to Fit in the Bus

#### Problem

Given `queue(person_id, person_name, weight, turn)` representing a boarding queue ordered by `turn`, return the name of the last person who can board without the running weight exceeding 1000.

**Schema:**

```
queue
  person_id    integer  PRIMARY KEY
  person_name  varchar
  weight       integer
  turn         integer
```

**Expected output (sample):**

| person_name |
|-------------|
| John Cena   |

#### Pattern

Running sum + threshold + `LIMIT 1`.

#### Explanation

Cumulative `SUM(weight) OVER (ORDER BY turn)`, then keep rows whose total is ≤ 1000 and pick the last one. `ORDER BY turn DESC LIMIT 1` is the idiomatic finish.

#### Solution

```sql
SELECT person_name
FROM (
  SELECT person_name, turn,
         SUM(weight) OVER (ORDER BY turn) AS running
  FROM queue
) t
WHERE running <= 1000
ORDER BY turn DESC
LIMIT 1;
```

*Source: LeetCode #1204 — Last Person to Fit in the Bus*

---

### 35. Movie Rating

#### Problem

Given `users`, `movies`, and `movie_rating(movie_id, user_id, rating, created_at)`, return two scalar rows: (1) the user who has rated the most movies (ties broken by name ascending), and (2) the movie with the highest average rating in February 2020 (ties broken by title ascending).

**Schema:**

```
users
  user_id  integer  PRIMARY KEY
  name     varchar

movies
  movie_id  integer  PRIMARY KEY
  title     varchar

movie_rating
  movie_id    integer  FK → movies
  user_id     integer  FK → users
  rating      integer
  created_at  date
  PRIMARY KEY (movie_id, user_id)
```

**Expected output (sample):**

| results       |
|---------------|
| Daniel        |
| Frozen 2      |

#### Pattern

Two ordered top-1 queries glued with `UNION ALL`.

#### Explanation

Two independent rankings combined with `UNION ALL` (no de-dup needed). Each side is its own `ORDER BY ... LIMIT 1`. Order matters in the final output — wrap with an outer `ORDER BY` carrying a sort key per branch if necessary.

#### Solution

```sql
(SELECT u.name AS results
 FROM movie_rating mr
 JOIN users u USING (user_id)
 GROUP BY u.name
 ORDER BY COUNT(*) DESC, u.name
 LIMIT 1)
UNION ALL
(SELECT m.title
 FROM movie_rating mr
 JOIN movies m USING (movie_id)
 WHERE mr.created_at >= DATE '2020-02-01'
   AND mr.created_at <  DATE '2020-03-01'
 GROUP BY m.title
 ORDER BY AVG(mr.rating) DESC, m.title
 LIMIT 1);
```

*Source: LeetCode #1341 — Movie Rating*

---

### 36. Nth Highest Salary

#### Problem

Given `employee(id, salary)`, return the *n*-th highest distinct salary. Return `NULL` if there are fewer than *n* distinct salaries.

**Schema:**

```
employee
  id      integer  PRIMARY KEY
  salary  integer
```

**Expected output (sample):**

| getNthHighestSalary(2) |
|------------------------|
| 200                    |

#### Pattern

`DENSE_RANK` + scalar subquery, or `OFFSET ... LIMIT 1`.

#### Explanation

Two clean ways: `OFFSET n-1 LIMIT 1` on `SELECT DISTINCT salary ORDER BY salary DESC`, or `DENSE_RANK` and filter. The `OFFSET` form is simpler and emits NULL naturally when the offset is past the end (Postgres returns zero rows; wrap in a `SELECT (...)` scalar subquery to coerce to NULL).

#### Solution

```sql
-- Postgres function form; for a plain query, swap the params for literals.
CREATE OR REPLACE FUNCTION nth_highest_salary(n integer)
RETURNS integer LANGUAGE sql AS $$
  SELECT (
    SELECT DISTINCT salary
    FROM employee
    ORDER BY salary DESC
    OFFSET GREATEST(n - 1, 0)
    LIMIT 1
  );
$$;
```

*Source: LeetCode #177 — Nth Highest Salary*

---

### 37. Second Highest Salary

#### Problem

Given `employee(id, salary)`, return the second-highest distinct salary. Return `NULL` if it doesn't exist.

**Schema:**

```
employee
  id      integer  PRIMARY KEY
  salary  integer
```

**Expected output (sample):**

| SecondHighestSalary |
|---------------------|
| 200                 |

#### Pattern

`OFFSET 1 LIMIT 1` wrapped in a scalar subquery.

#### Explanation

The scalar subquery wrap is the trick that returns `NULL` instead of zero rows when the offset overshoots — the empty inner query becomes a single NULL value at the outer level.

#### Solution

```sql
SELECT (
  SELECT DISTINCT salary
  FROM employee
  ORDER BY salary DESC
  OFFSET 1 LIMIT 1
) AS "SecondHighestSalary";
```

*Source: LeetCode #176 — Second Highest Salary*

---

## Self-Joins & Hierarchies

### 38. Rising Temperature

#### Problem

Given `weather(id, recordDate, temperature)`, return the ids of days whose temperature was higher than the previous calendar day (gaps in the date series are allowed — only adjacent calendar days count).

**Schema:**

```
weather
  id           integer  PRIMARY KEY
  record_date  date     UNIQUE
  temperature  integer
```

**Expected output (sample):**

| id |
|----|
| 2  |
| 4  |

#### Pattern

Self-join on `record_date = prev_date + 1`.

#### Explanation

The literal "previous **calendar** day" requirement rules out a `LAG` ordered by row position — you must compare on date arithmetic. Self-join is clearer than a `LAG` with a guard clause.

#### Solution

```sql
SELECT today.id
FROM weather today
JOIN weather yest
  ON yest.record_date = today.record_date - INTERVAL '1 day'
WHERE today.temperature > yest.temperature;
```

*Source: LeetCode #197 — Rising Temperature*

---

### 39. Employees Earning More Than Their Managers

#### Problem

From `employee(id, name, salary, managerId)`, return the names of employees who earn more than their direct manager.

**Schema:**

```
employee
  id          integer  PRIMARY KEY
  name        varchar
  salary      integer
  manager_id  integer
```

**Expected output (sample):**

| Employee |
|----------|
| Joe      |

#### Pattern

Self-join `employee.manager_id = manager.id`.

#### Explanation

The bread-and-butter recursive-feeling self-join. Use distinct table aliases (`e`, `m`) and the join condition handles NULL managers cleanly (inner join drops the CEO).

#### Solution

```sql
SELECT e.name AS "Employee"
FROM employee e
JOIN employee m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

*Source: LeetCode #181 — Employees Earning More Than Their Managers*

---

### 40. Exchange Seats

#### Problem

Given `seat(id, student)` with consecutive ids 1..N, swap each adjacent pair (1↔2, 3↔4, …). If N is odd, the last student stays in place. Output sorted by id.

**Schema:**

```
seat
  id       integer  PRIMARY KEY
  student  varchar
```

**Expected output (sample):**

| id | student |
|----|---------|
| 1  | Doris   |
| 2  | Abbot   |
| 3  | Green   |
| 4  | Emerson |
| 5  | Jeames  |

#### Pattern

`CASE` on parity + scalar `MAX(id)` for the odd tail.

#### Explanation

The neat one-pass trick: even rows pair down (id → id − 1), odd rows pair up (id → id + 1), and the last row stays. Compute the max id once and reuse.

#### Solution

```sql
SELECT
  CASE
    WHEN id % 2 = 0           THEN id - 1
    WHEN id = (SELECT MAX(id) FROM seat) THEN id
    ELSE id + 1
  END AS id,
  student
FROM seat
ORDER BY id;
```

*Source: LeetCode #626 — Exchange Seats*

---

### 41. Primary Department for Each Employee

#### Problem

Given `employee(employee_id, department_id, primary_flag)` where `primary_flag` is `'Y'` or `'N'`, return each employee's primary department. If an employee has exactly one department row, that one is primary by default.

**Schema:**

```
employee
  employee_id    integer
  department_id  integer
  primary_flag   char(1) CHECK (primary_flag IN ('Y','N'))
  PRIMARY KEY (employee_id, department_id)
```

**Expected output (sample):**

| employee_id | department_id |
|-------------|---------------|
| 1           | 1             |
| 2           | 1             |
| 3           | 3             |

#### Pattern

`UNION ALL` of two disjoint cases.

#### Explanation

Two disjoint sets: employees with one row (default primary) and employees with multiple rows (explicit `'Y'`). `UNION ALL` is safe because the cases can't overlap.

#### Solution

```sql
SELECT employee_id, department_id
FROM employee
WHERE primary_flag = 'Y'

UNION ALL

SELECT employee_id, MIN(department_id)
FROM employee
GROUP BY employee_id
HAVING COUNT(*) = 1;
```

*Source: LeetCode #1789 — Primary Department for Each Employee*

---

### 42. Tree Node

#### Problem

Given `tree(id, p_id)` representing a tree, label each node as `'Root'` (no parent), `'Inner'` (has parent and at least one child), or `'Leaf'` (has parent, no children).

**Schema:**

```
tree
  id    integer  PRIMARY KEY
  p_id  integer  -- NULL for the root
```

**Expected output (sample):**

| id | type  |
|----|-------|
| 1  | Root  |
| 2  | Inner |
| 3  | Leaf  |
| 4  | Leaf  |

#### Pattern

`CASE` on `p_id IS NULL` + `EXISTS` for children.

#### Explanation

Two independent boolean tests: "has parent?" (column check) and "has child?" (EXISTS). The labels follow from the truth table. Two passes is overkill — let the planner inline the EXISTS.

#### Solution

```sql
SELECT id,
  CASE
    WHEN p_id IS NULL THEN 'Root'
    WHEN EXISTS (SELECT 1 FROM tree c WHERE c.p_id = t.id) THEN 'Inner'
    ELSE 'Leaf'
  END AS type
FROM tree t;
```

*Source: LeetCode #608 — Tree Node*

---

### 43. Swap Salary

#### Problem

Given `salary(id, name, sex, salary)` with `sex` in `('m','f')`, atomically swap all `m`s to `f`s and vice versa in a single `UPDATE`.

**Schema:**

```
salary
  id      integer  PRIMARY KEY
  name    varchar
  sex     char(1)
  salary  integer
```

**Expected output (sample):**

(table contents post-update; one row per id, with sex flipped)

#### Pattern

`UPDATE` with `CASE`.

#### Explanation

A single statement avoids the classic two-statement bug where the second update reverts the first. `CASE` (or in Postgres specifically: `CASE WHEN ... ELSE ... END`) inside `SET` does both directions in one pass.

#### Solution

```sql
UPDATE salary
SET sex = CASE sex WHEN 'm' THEN 'f' ELSE 'm' END;
```

*Source: LeetCode #627 — Swap Salary*

---

### 44. Delete Duplicate Emails

#### Problem

Given `person(id, email)`, delete duplicates so that only the row with the smallest `id` per email survives.

**Schema:**

```
person
  id     integer  PRIMARY KEY
  email  varchar
```

**Expected output (sample):**

(table contents post-delete; one row per distinct email, keeping the smallest id)

#### Pattern

`DELETE ... USING` self-reference.

#### Explanation

Postgres-idiomatic: `DELETE ... USING` lets you self-join in a delete. The condition keeps `p1.id > p2.id` so the lower id always wins. MySQL would need a different syntax with a derived table to avoid "can't delete from a table you're selecting from".

#### Solution

```sql
DELETE FROM person p1
USING person p2
WHERE p1.email = p2.email
  AND p1.id    > p2.id;
```

*Source: LeetCode #196 — Delete Duplicate Emails*

---

### 45. Duplicate Emails

#### Problem

Given `person(id, email)`, return the emails that appear more than once.

**Schema:**

```
person
  id     integer  PRIMARY KEY
  email  varchar
```

**Expected output (sample):**

| Email             |
|-------------------|
| a@b.com           |

#### Pattern

`GROUP BY` + `HAVING COUNT(*) > 1`.

#### Explanation

The textbook duplicate-finder. Trivial.

#### Solution

```sql
SELECT email AS "Email"
FROM person
GROUP BY email
HAVING COUNT(*) > 1;
```

*Source: LeetCode #182 — Duplicate Emails*

---

## Date / Time

### 46. Sales Analysis III

#### Problem

Given `product(product_id, product_name, unit_price)` and `sales(seller_id, product_id, buyer_id, sale_date, quantity, price)`, return the products that were sold **only** in Q1 2019 (between 2019-01-01 and 2019-03-31 inclusive).

**Schema:**

```
product
  product_id    integer  PRIMARY KEY
  product_name  varchar
  unit_price    integer

sales
  seller_id    integer
  product_id   integer  FK → product
  buyer_id     integer
  sale_date    date
  quantity     integer
  price        integer
```

**Expected output (sample):**

| product_id | product_name |
|------------|--------------|
| 1          | S8           |

#### Pattern

`GROUP BY` + `HAVING` with `MIN`/`MAX` range check.

#### Explanation

A product qualifies iff *every* sale falls in the window. Express this with `MIN(sale_date) >= start AND MAX(sale_date) <= end`. Avoid the "any sale outside the window" anti-join — bounds are tighter and read better.

#### Solution

```sql
SELECT p.product_id, p.product_name
FROM sales s
JOIN product p USING (product_id)
GROUP BY p.product_id, p.product_name
HAVING MIN(s.sale_date) >= DATE '2019-01-01'
   AND MAX(s.sale_date) <= DATE '2019-03-31';
```

*Source: LeetCode #1084 — Sales Analysis III*

---

### 47. User Activity for the Past 30 Days I

#### Problem

Given `activity(user_id, session_id, activity_date, activity_type)`, for each day in the 30-day window ending 2019-07-27 inclusive, return the number of distinct active users that day. Skip days with zero activity.

**Schema:**

```
activity
  user_id        integer
  session_id     integer
  activity_date  date
  activity_type  varchar
```

**Expected output (sample):**

| day        | active_users |
|------------|--------------|
| 2019-07-20 | 2            |
| 2019-07-23 | 1            |
| 2019-07-27 | 3            |

#### Pattern

Date-window `WHERE` + `COUNT(DISTINCT)`.

#### Explanation

`activity_date > end - INTERVAL '30 days'` (exclusive lower bound) gives the 30-day window ending on `end`. `COUNT(DISTINCT user_id)` because the same user may have multiple sessions in a day.

#### Solution

```sql
SELECT activity_date AS day,
       COUNT(DISTINCT user_id) AS active_users
FROM activity
WHERE activity_date >  DATE '2019-07-27' - INTERVAL '30 days'
  AND activity_date <= DATE '2019-07-27'
GROUP BY activity_date;
```

*Source: LeetCode #1141 — User Activity for the Past 30 Days I*

---

### 48. Sales by Day of the Week

#### Problem

Given `orders(order_id, customer_id, order_date, item_id, quantity)` and `items(item_id, item_name)`, return for each item the total quantity sold per day of the week. Columns: `Category` (item_name), then `Monday`…`Sunday`. Every item appears in the output even if some days have zero.

**Schema:**

```
orders
  order_id     integer  PRIMARY KEY
  customer_id  integer
  order_date   date
  item_id      integer  FK → items
  quantity     integer

items
  item_id    integer  PRIMARY KEY
  item_name  varchar
```

**Expected output (sample):**

| Category | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
|----------|--------|---------|-----------|----------|--------|----------|--------|
| Bread    | 2      | 1       | 0         | 0        | 0      | 0        | 0      |
| Cheese   | 0      | 1       | 0         | 0        | 0      | 0        | 0      |

#### Pattern

Pivot via conditional sum + left join to anchor on items.

#### Explanation

Postgres has no native `PIVOT`, but `SUM(CASE WHEN dow=... THEN quantity ELSE 0 END)` is the universal pivot. `EXTRACT(ISODOW FROM date)` returns Monday=1, …, Sunday=7. `LEFT JOIN` to keep items with zero sales.

#### Solution

```sql
SELECT i.item_name AS "Category",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 1 THEN o.quantity END), 0) AS "Monday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 2 THEN o.quantity END), 0) AS "Tuesday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 3 THEN o.quantity END), 0) AS "Wednesday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 4 THEN o.quantity END), 0) AS "Thursday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 5 THEN o.quantity END), 0) AS "Friday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 6 THEN o.quantity END), 0) AS "Saturday",
       COALESCE(SUM(CASE WHEN EXTRACT(ISODOW FROM o.order_date) = 7 THEN o.quantity END), 0) AS "Sunday"
FROM items i
LEFT JOIN orders o USING (item_id)
GROUP BY i.item_name
ORDER BY i.item_name;
```

*Source: LeetCode #1741 — Sales by Day of the Week*

---

## String Manipulation

### 49. Invalid Tweets

#### Problem

From `tweets(tweet_id, content)`, return the ids of tweets whose `content` length exceeds 15 characters.

**Schema:**

```
tweets
  tweet_id  integer  PRIMARY KEY
  content   varchar
```

**Expected output (sample):**

| tweet_id |
|----------|
| 1        |

#### Pattern

`CHAR_LENGTH`.

#### Explanation

`CHAR_LENGTH` (= `LENGTH` in Postgres for `text`) counts characters. In MySQL, `LENGTH` returns bytes — use `CHAR_LENGTH` there for portability.

#### Solution

```sql
SELECT tweet_id
FROM tweets
WHERE CHAR_LENGTH(content) > 15;
```

*Source: LeetCode #1683 — Invalid Tweets*

---

### 50. Find Users With Valid Emails

#### Problem

Given `users(user_id, name, mail)`, return rows whose `mail` is a valid email — starts with a letter, followed by letters/digits/`_`/`.`/`-`, ending in literal `@leetcode.com`.

**Schema:**

```
users
  user_id  integer  PRIMARY KEY
  name     varchar
  mail     varchar
```

**Expected output (sample):**

| user_id | name      | mail                  |
|---------|-----------|-----------------------|
| 1       | Winston   | winston@leetcode.com  |
| 3       | Annabelle | bella-@leetcode.com   |

#### Pattern

POSIX regex with `~`.

#### Explanation

Postgres `~` is case-sensitive POSIX regex (Postgres-native, no extension needed). Anchor with `^` and `$`. The character class `[A-Za-z0-9_.-]` covers the allowed inner characters; the leading character must be a letter.

#### Solution

```sql
SELECT user_id, name, mail
FROM users
WHERE mail ~ '^[A-Za-z][A-Za-z0-9_.\-]*@leetcode\.com$';
```

*Source: LeetCode #1517 — Find Users With Valid Emails*

---

### 51. Fix Names in a Table

#### Problem

Given `users(user_id, name)` where the name's casing is inconsistent, return rows with the name capitalised: first letter upper, rest lower. Order by `user_id`.

**Schema:**

```
users
  user_id  integer  PRIMARY KEY
  name     varchar
```

**Expected output (sample):**

| user_id | name  |
|---------|-------|
| 1       | Alice |
| 2       | Bob   |

#### Pattern

`INITCAP` or manual `UPPER`/`LOWER` slice.

#### Explanation

Postgres has `INITCAP` but it also lowercases letters after every non-alphanumeric — fine for single-word names, surprising for "mary-jane". Safer for a single-word constraint: explicit slice with `UPPER(LEFT(...,1)) || LOWER(SUBSTRING(...,2))`.

#### Solution

```sql
SELECT user_id,
       UPPER(LEFT(name, 1)) || LOWER(SUBSTRING(name FROM 2)) AS name
FROM users
ORDER BY user_id;
```

*Source: LeetCode #1667 — Fix Names in a Table*

---

### 52. Patients With a Condition

#### Problem

Given `patients(patient_id, patient_name, conditions)` where `conditions` is a space-separated string of codes, return patients with at least one condition starting with `'DIAB1'`.

**Schema:**

```
patients
  patient_id     integer  PRIMARY KEY
  patient_name   varchar
  conditions     varchar
```

**Expected output (sample):**

| patient_id | patient_name | conditions       |
|------------|--------------|------------------|
| 2          | Alice        | DIAB100 MYOP     |
| 4          | Bob          | ACNE DIAB100     |

#### Pattern

Two `LIKE` checks (start and word-boundary).

#### Explanation

The naive `LIKE '%DIAB1%'` would match `'XDIAB1'` — a false positive. The fix is two patterns ORed: `LIKE 'DIAB1%'` (start of string) and `LIKE '% DIAB1%'` (after a space).

#### Solution

```sql
SELECT patient_id, patient_name, conditions
FROM patients
WHERE conditions LIKE 'DIAB1%'
   OR conditions LIKE '% DIAB1%';
```

*Source: LeetCode #1527 — Patients With a Condition*

---

### 53. Not Boring Movies

#### Problem

From `cinema(id, movie, description, rating)`, return rows where the id is odd and the description is not `'boring'`, sorted by `rating` descending.

**Schema:**

```
cinema
  id           integer  PRIMARY KEY
  movie        varchar
  description  varchar
  rating       numeric
```

**Expected output (sample):**

| id | movie     | description | rating |
|----|-----------|-------------|--------|
| 5  | House     | great       | 8.90   |
| 1  | War       | great 3D    | 8.90   |

#### Pattern

Modulo filter + ordering.

#### Explanation

Trivial. `id % 2 = 1` for odd. Stable behaviour requires the explicit `ORDER BY`; without it the engine can return rows in any order.

#### Solution

```sql
SELECT id, movie, description, rating
FROM cinema
WHERE id % 2 = 1
  AND description <> 'boring'
ORDER BY rating DESC;
```

*Source: LeetCode #620 — Not Boring Movies*

---

## Recursive CTEs

### 54. All People Report to the Given Manager

#### Problem

Given `employees(employee_id, employee_name, manager_id)`, return the ids of every employee in the reporting subtree of manager 1 — direct reports, indirect reports, and so on. Exclude manager 1.

**Schema:**

```
employees
  employee_id    integer  PRIMARY KEY
  employee_name  varchar
  manager_id     integer
```

**Expected output (sample):**

| employee_id |
|-------------|
| 2           |
| 77          |
| 4           |

#### Pattern

Recursive CTE.

#### Explanation

The textbook hierarchy traversal: anchor at manager 1's direct reports, recursively join children. The depth-3 cap mentioned in the original problem is handled by either bounded recursion or by simply continuing until no new rows are added (postgres terminates naturally).

#### Solution

```sql
WITH RECURSIVE subordinates AS (
  SELECT employee_id
  FROM employees
  WHERE manager_id = 1 AND employee_id <> 1

  UNION

  SELECT e.employee_id
  FROM employees e
  JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT employee_id FROM subordinates;
```

*Source: LeetCode #1303 — Find the Team Size / 1972 / community: All People Report to the Given Manager*

---

### 55. Find the Start and End Number of Continuous Ranges

#### Problem

Given `logs(log_id)` containing a set of integers, return all maximal continuous ranges as (`start_id`, `end_id`) pairs.

**Schema:**

```
logs
  log_id  integer  PRIMARY KEY
```

**Expected output (sample):**

| start_id | end_id |
|----------|--------|
| 1        | 3      |
| 7        | 8      |
| 10       | 10     |

#### Pattern

Gaps-and-islands via `log_id - ROW_NUMBER`.

#### Explanation

The canonical trick: for any contiguous run of integers, `log_id - ROW_NUMBER() OVER (ORDER BY log_id)` is constant within the run. Group by that derived constant and take min/max.

#### Solution

```sql
SELECT MIN(log_id) AS start_id,
       MAX(log_id) AS end_id
FROM (
  SELECT log_id,
         log_id - ROW_NUMBER() OVER (ORDER BY log_id) AS grp
  FROM logs
) t
GROUP BY grp
ORDER BY start_id;
```

*Source: LeetCode #1285 — Find the Start and End Number of Continuous Ranges*

---

### 56. Friend Requests Acceptance Rate

#### Problem

Given `friend_request(sender_id, send_to_id, request_date)` and `request_accepted(requester_id, accepter_id, accept_date)`, return the overall acceptance rate (accepted / sent), rounded to two decimals. Each request is unique by `(sender, recipient)`; each acceptance is unique by `(requester, accepter)`. If there are no requests, return 0.00.

**Schema:**

```
friend_request
  sender_id     integer
  send_to_id    integer
  request_date  date

request_accepted
  requester_id  integer
  accepter_id   integer
  accept_date   date
```

**Expected output (sample):**

| accept_rate |
|-------------|
| 0.80        |

#### Pattern

Two `COUNT(DISTINCT)` scalars + division.

#### Explanation

Two scalar subqueries — distinct pairs sent vs. distinct pairs accepted. Guard against zero divisor with a `CASE`. Don't try to join the tables: the relationship is set-cardinality, not row-by-row.

#### Solution

```sql
SELECT ROUND(
  CASE
    WHEN (SELECT COUNT(DISTINCT (sender_id, send_to_id)) FROM friend_request) = 0
      THEN 0
    ELSE (SELECT COUNT(DISTINCT (requester_id, accepter_id)) FROM request_accepted)::numeric
       / (SELECT COUNT(DISTINCT (sender_id, send_to_id)) FROM friend_request)
  END, 2
) AS accept_rate;
```

*Source: LeetCode #597 — Friend Requests I: Overall Acceptance Rate*

---

### 57. Friend Suggestions

#### Problem

Given `friendship(user1_id, user2_id)` (undirected — each pair stored once), suggest for each user the friends-of-friends who are not themselves and not already direct friends. Return `(user_id, suggested_id)` pairs.

**Schema:**

```
friendship
  user1_id  integer
  user2_id  integer
  PRIMARY KEY (user1_id, user2_id)
```

**Expected output (sample):**

| user_id | suggested_id |
|---------|--------------|
| 1       | 4            |
| 2       | 5            |

#### Pattern

Undirected adjacency unfold + 2-hop traversal.

#### Explanation

The undirected pairs are stored once but need to expand both ways — `UNION ALL` the (a→b) and (b→a) versions, then join twice for friends-of-friends, excluding self and direct friends.

#### Solution

```sql
WITH edges AS (
  SELECT user1_id AS a, user2_id AS b FROM friendship
  UNION ALL
  SELECT user2_id, user1_id FROM friendship
),
direct AS (SELECT * FROM edges)
SELECT DISTINCT e1.a AS user_id, e2.b AS suggested_id
FROM edges e1
JOIN edges e2 ON e1.b = e2.a
WHERE e2.b <> e1.a
  AND NOT EXISTS (
    SELECT 1 FROM direct d
    WHERE d.a = e1.a AND d.b = e2.b
  );
```

*Source: LeetCode community — Friend Suggestions*

---

## Hard / Advanced Patterns

### 58. Trips and Users

#### Problem

Given `trips(id, client_id, driver_id, city_id, status, request_at)` and `users(users_id, banned, role)`, where `status` is one of `'completed'`, `'cancelled_by_driver'`, `'cancelled_by_client'`, return the daily cancellation rate (cancelled / total) for unbanned clients and unbanned drivers, between 2013-10-01 and 2013-10-03 inclusive. Round to two decimals. Days with no qualifying trips are omitted.

**Schema:**

```
trips
  id           integer  PRIMARY KEY
  client_id    integer  FK → users(users_id)
  driver_id    integer  FK → users(users_id)
  city_id      integer
  status       varchar
  request_at   date

users
  users_id  integer  PRIMARY KEY
  banned    varchar  CHECK (banned IN ('Yes','No'))
  role      varchar
```

**Expected output (sample):**

| Day        | Cancellation Rate |
|------------|-------------------|
| 2013-10-01 | 0.33              |
| 2013-10-02 | 0.00              |
| 2013-10-03 | 0.50              |

#### Pattern

Multi-condition filtering + conditional aggregation.

#### Explanation

Three-way filter (client unbanned, driver unbanned, date in range) plus a ratio computed in one pass with `AVG((status<>'completed')::int)`. Two `NOT IN` lookups (banned clients, banned drivers) are clean and the planner handles them efficiently with indexes on `users.users_id`.

#### Solution

```sql
SELECT request_at AS "Day",
       ROUND(AVG((status <> 'completed')::int)::numeric, 2) AS "Cancellation Rate"
FROM trips
WHERE request_at BETWEEN DATE '2013-10-01' AND DATE '2013-10-03'
  AND client_id NOT IN (SELECT users_id FROM users WHERE banned = 'Yes')
  AND driver_id NOT IN (SELECT users_id FROM users WHERE banned = 'Yes')
GROUP BY request_at
ORDER BY request_at;
```

*Source: LeetCode #262 — Trips and Users*

---

### 59. Human Traffic of Stadium

#### Problem

Given `stadium(id, visit_date, people)`, return all rows from runs of three or more consecutive days where `people >= 100`. Order by `visit_date`.

**Schema:**

```
stadium
  id          integer  PRIMARY KEY
  visit_date  date     UNIQUE
  people      integer
```

**Expected output (sample):**

| id | visit_date | people |
|----|------------|--------|
| 5  | 2017-01-05 | 145    |
| 6  | 2017-01-06 | 1455   |
| 7  | 2017-01-07 | 199    |
| 8  | 2017-01-09 | 188    |

#### Pattern

Gaps-and-islands on filtered rows.

#### Explanation

Filter to `people >= 100`, then assign each row a group key by `id - ROW_NUMBER()` over the remaining rows. Group by that key, keep groups of size ≥ 3, and join the qualifying rows back.

#### Solution

```sql
WITH busy AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM stadium
  WHERE people >= 100
),
qualifying AS (
  SELECT grp FROM busy GROUP BY grp HAVING COUNT(*) >= 3
)
SELECT b.id, b.visit_date, b.people
FROM busy b
JOIN qualifying q USING (grp)
ORDER BY b.visit_date;
```

*Source: LeetCode #601 — Human Traffic of Stadium*

---

### 60. Median Employee Salary

#### Problem

Given `employee(id, company, salary)`, return the median salary row(s) per company. If the row count is even, return the two middle rows; if odd, the single middle row.

**Schema:**

```
employee
  id       integer  PRIMARY KEY
  company  varchar
  salary   integer
```

**Expected output (sample):**

| id | company | salary |
|----|---------|--------|
| 5  | A       | 7500   |
| 8  | B       | 6000   |
| 11 | B       | 5000   |

#### Pattern

Window-based median: row-number + total count.

#### Explanation

For each row, compute its rank within company by salary and the company's row count. The median rows satisfy `2 * rn ∈ {count, count+1, count+2}` — three positions that cover both odd and even cases.

#### Solution

```sql
SELECT id, company, salary
FROM (
  SELECT id, company, salary,
         ROW_NUMBER() OVER (PARTITION BY company ORDER BY salary, id) AS rn,
         COUNT(*)     OVER (PARTITION BY company)                     AS cnt
  FROM employee
) t
WHERE 2 * rn IN (cnt, cnt + 1, cnt + 2);
```

*Source: LeetCode #569 — Median Employee Salary*

---

### 61. Find Median Given Frequency of Numbers

#### Problem

Given `numbers(num, frequency)` representing a multiset, return the median value. The dataset can be very large (frequencies in the thousands).

**Schema:**

```
numbers
  num        integer  PRIMARY KEY
  frequency  integer
```

**Expected output (sample):**

| median |
|--------|
| 2.5000 |

#### Pattern

Cumulative frequency + median position.

#### Explanation

Sort by `num`, compute the running sum of frequencies, and find rows where the cumulative range straddles the median position. Works in one pass even for billions of logical elements — that's the whole point of the frequency encoding.

#### Solution

```sql
WITH cum AS (
  SELECT num, frequency,
         SUM(frequency) OVER (ORDER BY num)                  AS running,
         SUM(frequency) OVER ()                              AS total
  FROM numbers
)
SELECT AVG(num)::numeric(10, 4) AS median
FROM cum
WHERE running       >= total / 2.0
  AND running - frequency <= total / 2.0;
```

*Source: LeetCode #571 — Find Median Given Frequency of Numbers*

---

### 62. Tournament Winners

#### Problem

Given `players(player_id, group_id)` and `matches(match_id, first_player, second_player, first_score, second_score)`, return the winner per group — the player with the highest total score. Ties go to the smallest `player_id`.

**Schema:**

```
players
  player_id  integer  PRIMARY KEY
  group_id   integer

matches
  match_id       integer  PRIMARY KEY
  first_player   integer  FK → players
  second_player  integer  FK → players
  first_score    integer
  second_score   integer
```

**Expected output (sample):**

| group_id | player_id |
|----------|-----------|
| 1        | 15        |
| 2        | 35        |
| 3        | 40        |

#### Pattern

Union-unfold scores + top-1 per group with tie-break.

#### Explanation

Unfold each match into two score rows via `UNION ALL`, sum per player, join group, then top-1 per group with `ROW_NUMBER` ordered by `(total DESC, player_id ASC)`. Cleaner than a `MAX`-then-rejoin which can't break ties by id.

#### Solution

```sql
WITH scores AS (
  SELECT first_player  AS player_id, first_score  AS score FROM matches
  UNION ALL
  SELECT second_player,                second_score        FROM matches
),
totals AS (
  SELECT p.group_id, p.player_id, COALESCE(SUM(s.score), 0) AS total
  FROM players p
  LEFT JOIN scores s USING (player_id)
  GROUP BY p.group_id, p.player_id
)
SELECT group_id, player_id
FROM (
  SELECT group_id, player_id,
         ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY total DESC, player_id) AS rn
  FROM totals
) t
WHERE rn = 1
ORDER BY group_id;
```

*Source: LeetCode #1194 — Tournament Winners*

---

### 63. Report Contiguous Dates

#### Problem

Given `failed(fail_date)` and `succeeded(success_date)` with no overlap between the two sets and all dates within 2019, return each maximal contiguous run as (`period_state`, `start_date`, `end_date`) where `period_state` is `'failed'` or `'succeeded'`.

**Schema:**

```
failed
  fail_date  date  PRIMARY KEY

succeeded
  success_date  date  PRIMARY KEY
```

**Expected output (sample):**

| period_state | start_date | end_date   |
|--------------|------------|------------|
| succeeded    | 2019-01-01 | 2019-01-03 |
| failed       | 2019-01-04 | 2019-01-05 |
| succeeded    | 2019-01-06 | 2019-01-06 |

#### Pattern

Union + gaps-and-islands keyed by `(state, date - row_number)`.

#### Explanation

Unify into one stream with a state label. Within each state, contiguous date runs are isolated by `date - ROW_NUMBER()` partitioned on state. Group by `(state, key)`.

#### Solution

```sql
WITH days AS (
  SELECT 'failed'    AS period_state, fail_date AS d
  FROM failed WHERE fail_date BETWEEN DATE '2019-01-01' AND DATE '2019-12-31'
  UNION ALL
  SELECT 'succeeded', success_date
  FROM succeeded WHERE success_date BETWEEN DATE '2019-01-01' AND DATE '2019-12-31'
),
keyed AS (
  SELECT period_state, d,
         d - (ROW_NUMBER() OVER (PARTITION BY period_state ORDER BY d) || ' days')::interval AS grp
  FROM days
)
SELECT period_state, MIN(d) AS start_date, MAX(d) AS end_date
FROM keyed
GROUP BY period_state, grp
ORDER BY start_date;
```

*Source: LeetCode #1225 — Report Contiguous Dates*

---

### 64. Capital Gain/Loss

#### Problem

Given `stocks(stock_name, operation, operation_day, price)` where each `'Buy'` is paired with a future `'Sell'` for the same stock, return the net capital gain/loss per stock (sum of sell prices minus sum of buy prices).

**Schema:**

```
stocks
  stock_name     varchar
  operation      varchar  CHECK (operation IN ('Buy','Sell'))
  operation_day  integer
  price          integer
  PRIMARY KEY (stock_name, operation_day)
```

**Expected output (sample):**

| stock_name | capital_gain_loss |
|------------|-------------------|
| Corona     | -45               |
| Leetcode   | 850               |

#### Pattern

Signed aggregation.

#### Explanation

A buy is a negative cashflow, a sell a positive one. Express this with a single `SUM(CASE WHEN operation='Sell' THEN price ELSE -price END)`. No join, no window — one pass.

#### Solution

```sql
SELECT stock_name,
       SUM(CASE WHEN operation = 'Sell' THEN price ELSE -price END) AS capital_gain_loss
FROM stocks
GROUP BY stock_name;
```

*Source: LeetCode #1393 — Capital Gain/Loss*

---

### 65. Find Cumulative Salary of an Employee

#### Problem

Given `employee(id, month, salary)`, for each employee at each month, return the sum of salaries for the latest three months **excluding the most recent month** (the most recent month is hidden — could be in-progress payroll). Skip employees with only one record. Order by `id` ascending, `month` descending.

**Schema:**

```
employee
  id      integer
  month   integer
  salary  integer
  PRIMARY KEY (id, month)
```

**Expected output (sample):**

| id | month | Salary |
|----|-------|--------|
| 1  | 3     | 90     |
| 1  | 2     | 50     |
| 1  | 1     | 20     |

#### Pattern

Window rolling sum + filter on rank.

#### Explanation

For each employee, rank months descending; drop the top-1 (most recent); over the remaining rows, compute `SUM(salary) OVER (... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` ordered by month ascending so the "latest three months including current" becomes a backward window.

#### Solution

```sql
WITH ranked AS (
  SELECT id, month, salary,
         ROW_NUMBER() OVER (PARTITION BY id ORDER BY month DESC) AS rn_desc
  FROM employee
),
kept AS (
  SELECT id, month, salary
  FROM ranked
  WHERE rn_desc > 1   -- drop latest
)
SELECT id, month,
       SUM(salary) OVER (
         PARTITION BY id ORDER BY month
         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ) AS "Salary"
FROM kept
ORDER BY id, month DESC;
```

*Source: LeetCode #579 — Find Cumulative Salary of an Employee*

---

### 66. Strong Friendship

#### Problem

Given `friendship(user1_id, user2_id)` (undirected, stored once with `user1_id < user2_id`), return pairs of users who share at least three common friends, with their common-friends count.

**Schema:**

```
friendship
  user1_id  integer
  user2_id  integer
  PRIMARY KEY (user1_id, user2_id)
```

**Expected output (sample):**

| user1_id | user2_id | common_friend |
|----------|----------|---------------|
| 1        | 2        | 3             |
| 1        | 3        | 3             |

#### Pattern

Adjacency unfold + intersection count.

#### Explanation

Build a directed-view of friendships, then for each direct-friendship pair count common neighbours via an inner join on a shared third user. Threshold at 3. The undirected storage means you need the `UNION ALL` unfold.

#### Solution

```sql
WITH edges AS (
  SELECT user1_id AS a, user2_id AS b FROM friendship
  UNION ALL
  SELECT user2_id, user1_id FROM friendship
)
SELECT f.user1_id, f.user2_id, COUNT(*) AS common_friend
FROM friendship f
JOIN edges e1 ON e1.a = f.user1_id
JOIN edges e2 ON e2.a = f.user2_id AND e2.b = e1.b
GROUP BY f.user1_id, f.user2_id
HAVING COUNT(*) >= 3
ORDER BY f.user1_id, f.user2_id;
```

*Source: LeetCode #1949 — Strong Friendship*

---

### 67. Market Analysis I

#### Problem

Given `users(user_id, join_date, favorite_brand)`, `orders(order_id, order_date, item_id, buyer_id, seller_id)`, and `items(item_id, item_brand)`, return for every user their `user_id`, `join_date`, and the number of orders placed in 2019.

**Schema:**

```
users
  user_id          integer  PRIMARY KEY
  join_date        date
  favorite_brand   varchar

orders
  order_id    integer  PRIMARY KEY
  order_date  date
  item_id     integer
  buyer_id    integer  FK → users
  seller_id   integer  FK → users

items
  item_id     integer  PRIMARY KEY
  item_brand  varchar
```

**Expected output (sample):**

| buyer_id | join_date  | orders_in_2019 |
|----------|------------|----------------|
| 1        | 2018-01-01 | 1              |
| 2        | 2018-02-09 | 2              |

#### Pattern

`LEFT JOIN` with year-scoped predicate inside the join condition.

#### Explanation

Subtle: the year predicate must be on the **join** clause, not the `WHERE`. If you put it in `WHERE`, NULL `order_date`s from non-buyers get filtered out and you lose the zero-order users.

#### Solution

```sql
SELECT u.user_id AS buyer_id,
       u.join_date,
       COUNT(o.order_id) AS orders_in_2019
FROM users u
LEFT JOIN orders o
       ON o.buyer_id = u.user_id
      AND o.order_date >= DATE '2019-01-01'
      AND o.order_date <  DATE '2020-01-01'
GROUP BY u.user_id, u.join_date;
```

*Source: LeetCode #1158 — Market Analysis I*

---

### 68. Market Analysis II

#### Problem

Using the same schema as Market Analysis I, return for each user whether their **second-ever** sold item's brand matches their `favorite_brand` (`'yes'` / `'no'`). Users with fewer than two sales return `'no'`.

**Schema:** *(see #67)*

**Expected output (sample):**

| seller_id | 2nd_item_fav_brand |
|-----------|--------------------|
| 1         | no                 |
| 2         | yes                |

#### Pattern

`ROW_NUMBER` over seller history + `LEFT JOIN`.

#### Explanation

Rank each seller's sales chronologically; pick row 2; compare its brand to `favorite_brand`. `LEFT JOIN` so sellers with < 2 sales get a NULL that collapses to `'no'`.

#### Solution

```sql
WITH ranked AS (
  SELECT seller_id, item_id,
         ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY order_date, order_id) AS rn
  FROM orders
)
SELECT u.user_id AS seller_id,
       CASE
         WHEN i.item_brand = u.favorite_brand THEN 'yes'
         ELSE 'no'
       END AS "2nd_item_fav_brand"
FROM users u
LEFT JOIN ranked r ON r.seller_id = u.user_id AND r.rn = 2
LEFT JOIN items  i ON i.item_id   = r.item_id;
```

*Source: LeetCode #1159 — Market Analysis II*

---

### 69. Page Recommendations II

#### Problem

Given `friendship(user1_id, user2_id)` (undirected, one row per pair) and `likes(user_id, page_id)`, for each user return the pages liked by at least one friend that the user hasn't liked themselves, along with the count of friends who liked each page. Sort by `user_id` ascending, then `friends_likes` descending.

**Schema:**

```
friendship
  user1_id  integer
  user2_id  integer
  PRIMARY KEY (user1_id, user2_id)

likes
  user_id  integer
  page_id  integer
  PRIMARY KEY (user_id, page_id)
```

**Expected output (sample):**

| user_id | page_id | friends_likes |
|---------|---------|---------------|
| 1       | 88      | 2             |
| 1       | 23      | 1             |

#### Pattern

Adjacency unfold + anti-join.

#### Explanation

Unfold friendship both directions, join to friends' likes, then anti-join against the user's own likes. Group and count. Two `LEFT JOIN ... IS NULL` is fine; `NOT EXISTS` is fine. Either way, deduplicate within the friends' likes per page first.

#### Solution

```sql
WITH edges AS (
  SELECT user1_id AS u, user2_id AS f FROM friendship
  UNION ALL
  SELECT user2_id, user1_id FROM friendship
),
friend_likes AS (
  SELECT DISTINCT e.u AS user_id, l.page_id, l.user_id AS friend_id
  FROM edges e
  JOIN likes l ON l.user_id = e.f
)
SELECT fl.user_id, fl.page_id, COUNT(DISTINCT fl.friend_id) AS friends_likes
FROM friend_likes fl
WHERE NOT EXISTS (
  SELECT 1 FROM likes l2
  WHERE l2.user_id = fl.user_id AND l2.page_id = fl.page_id
)
GROUP BY fl.user_id, fl.page_id
ORDER BY fl.user_id, friends_likes DESC;
```

*Source: LeetCode #1729 / community — Page Recommendations II*

---

### 70. Number of Transactions per Visit

#### Problem

Given `visits(user_id, visit_date)` and `transactions(user_id, transaction_date, amount)` (a single visit can have many transactions on the same date), return a frequency distribution: for each `transactions_count` from 0 up to the maximum observed, how many visits had exactly that many transactions.

**Schema:**

```
visits
  user_id     integer
  visit_date  date

transactions
  user_id           integer
  transaction_date  date
  amount            integer
```

**Expected output (sample):**

| transactions_count | visits_count |
|--------------------|--------------|
| 0                  | 4            |
| 1                  | 5            |
| 2                  | 1            |
| 3                  | 0            |

#### Pattern

Visit-level counts joined with a `generate_series` range.

#### Explanation

Two-step problem: first count transactions per visit (with `LEFT JOIN`, including zero-transaction visits), then bin by count. The missing piece — empty bins like `3` — needs a dense range from `generate_series(0, max_count)` joined with the histogram.

#### Solution

```sql
WITH per_visit AS (
  SELECT v.user_id, v.visit_date,
         COUNT(t.user_id) AS tx_cnt
  FROM visits v
  LEFT JOIN transactions t
         ON t.user_id          = v.user_id
        AND t.transaction_date = v.visit_date
  GROUP BY v.user_id, v.visit_date
),
hist AS (
  SELECT tx_cnt, COUNT(*) AS visits_count
  FROM per_visit
  GROUP BY tx_cnt
),
bounds AS (
  SELECT COALESCE(MAX(tx_cnt), 0) AS hi FROM per_visit
)
SELECT g.n            AS transactions_count,
       COALESCE(h.visits_count, 0) AS visits_count
FROM bounds b,
     generate_series(0, b.hi) AS g(n)
LEFT JOIN hist h ON h.tx_cnt = g.n
ORDER BY transactions_count;
```

*Source: LeetCode #1336 — Number of Transactions per Visit*

---

### 71. Find the Quiet Students in All Exams

#### Problem

Given `student(student_id, student_name)` and `exam(exam_id, student_id, score)`, return the "quiet" students — those who took at least one exam and in every exam they took, their score is strictly between (not equal to) the minimum and maximum of that exam.

**Schema:**

```
student
  student_id    integer  PRIMARY KEY
  student_name  varchar

exam
  exam_id     integer
  student_id  integer  FK → student
  score       integer
  PRIMARY KEY (exam_id, student_id)
```

**Expected output (sample):**

| student_id | student_name |
|------------|--------------|
| 2          | Quiet Stu    |

#### Pattern

Window MIN/MAX per exam + universal-quantifier filter.

#### Explanation

Per-exam `MIN`/`MAX` via window. A student qualifies iff *every* one of their exams has score strictly between extremes — express as "no exam where they're at an extreme" via `NOT EXISTS`.

#### Solution

```sql
WITH scored AS (
  SELECT exam_id, student_id, score,
         MIN(score) OVER (PARTITION BY exam_id) AS lo,
         MAX(score) OVER (PARTITION BY exam_id) AS hi
  FROM exam
)
SELECT s.student_id, s.student_name
FROM student s
WHERE EXISTS (SELECT 1 FROM scored WHERE student_id = s.student_id)
  AND NOT EXISTS (
    SELECT 1 FROM scored sc
    WHERE sc.student_id = s.student_id
      AND (sc.score = sc.lo OR sc.score = sc.hi)
  )
ORDER BY s.student_id;
```

*Source: LeetCode #1412 — Find the Quiet Students in All Exams*

---

### 72. Game Play Analysis V

#### Problem

Given `activity(player_id, device_id, event_date, games_played)`, define each player's "install date" as the date of their first activity. For each install date, return the install count (distinct players who installed that day) and the Day-1 retention rate — the fraction of those players who also played on `install_date + 1`, rounded to two decimals.

**Schema:**

```
activity
  player_id     integer
  device_id     integer
  event_date    date
  games_played integer
  PRIMARY KEY (player_id, event_date)
```

**Expected output (sample):**

| install_dt | installs | Day1_retention |
|------------|----------|----------------|
| 2016-03-01 | 1        | 1.00           |
| 2017-06-25 | 1        | 0.00           |

#### Pattern

First-event window + Day-1 lookup.

#### Explanation

Get each player's install date, group those by date for install counts, then `LEFT JOIN` back to `activity` on `event_date = install_date + 1` for retention.

#### Solution

```sql
WITH installs AS (
  SELECT player_id, MIN(event_date) AS install_dt
  FROM activity
  GROUP BY player_id
)
SELECT i.install_dt,
       COUNT(*)                                              AS installs,
       ROUND(
         AVG((a.event_date IS NOT NULL)::int)::numeric, 2
       )                                                     AS "Day1_retention"
FROM installs i
LEFT JOIN activity a
       ON a.player_id  = i.player_id
      AND a.event_date = i.install_dt + INTERVAL '1 day'
GROUP BY i.install_dt
ORDER BY i.install_dt;
```

*Source: LeetCode community — Game Play Analysis V*

---
