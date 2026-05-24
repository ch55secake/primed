---
type: sql-practice
---

# SQL Practice — pgexercises

Postgres-flavoured SQL practice against a tennis country-club schema (members / facilities / bookings). 71 problems sourced from [pgexercises.com](https://pgexercises.com/) by Alisdair Owens (CC-BY-NC-SA 3.0). Solutions are the canonical site answers; explanations are written for senior-engineer interview prep.

## Schema

```
cd.members
  memid          integer        PRIMARY KEY
  surname        varchar(200)
  firstname      varchar(200)
  address        varchar(300)
  zipcode        integer
  telephone      varchar(20)
  recommendedby  integer        FK → cd.members(memid)  ON DELETE SET NULL
  joindate       timestamp

cd.facilities
  facid                integer    PRIMARY KEY
  name                 varchar(100)
  membercost           numeric
  guestcost            numeric
  initialoutlay        numeric
  monthlymaintenance   numeric

cd.bookings
  bookid     integer    PRIMARY KEY
  facid      integer    FK → cd.facilities(facid)
  memid      integer    FK → cd.members(memid)
  starttime  timestamp
  slots      integer    -- one slot = 30 minutes
```

The guest member is always `memid = 0`. Booking cost depends on whether the booker is a guest (`guestcost`) or a member (`membercost`), multiplied by `slots`.

---

### 1. Retrieve everything from a table

#### Problem
Retrieve all of the information from the `cd.facilities` table.

#### Pattern
Basic SELECT

#### Explanation
`SELECT *` returns every column. Fine for ad-hoc exploration, but in production code prefer naming columns explicitly so a schema change (added column, reordered columns) doesn't silently break callers.

#### Solution
```sql
select * from cd.facilities;
```

---

### 2. Retrieve specific columns from a table

#### Problem
Produce a list of facility names and their cost to members.

#### Pattern
Basic SELECT

#### Explanation
Name only the columns you need. Smaller projection means smaller network payload and lets the planner skip touching unused columns in some access paths (notably index-only scans).

#### Solution
```sql
select name, membercost from cd.facilities;
```

---

### 3. Control which rows are retrieved

#### Problem
Produce a list of facilities that charge a fee to members.

#### Pattern
WHERE filter

#### Explanation
`membercost > 0` filters out the free facilities. The predicate is sargable — a btree index on `membercost` could be used if the column were selective enough, though for a six-row table the planner will just seqscan.

#### Solution
```sql
select * from cd.facilities where membercost > 0;
```

---

### 4. Control which rows are retrieved — part 2

#### Problem
Produce a list of facilities that charge a fee to members and whose fee is less than 1/50th of the monthly maintenance cost. Return facid, name, membercost, monthlymaintenance.

#### Pattern
WHERE filter

#### Explanation
Two-condition filter combined with `AND`. Note the `/50.0` rather than `/50` — without the decimal, Postgres would do integer division and round the threshold down, hiding edge cases.

#### Solution
```sql
select facid, name, membercost, monthlymaintenance
    from cd.facilities
    where
        membercost > 0 and
        (membercost < monthlymaintenance/50.0);
```

---

### 5. Basic string searches

#### Problem
Produce a list of all facilities with the word 'Tennis' in their name.

#### Pattern
WHERE filter

#### Explanation
`LIKE` with `%` wildcards on both sides matches anywhere in the string. A leading wildcard kills index usage — for case-insensitive substring search on a large table you'd reach for a trigram index (`pg_trgm` + GIN).

#### Solution
```sql
select *
    from cd.facilities
    where
        name like '%Tennis%';
```

---

### 6. Matching against multiple possible values

#### Problem
Retrieve the details of facilities with ID 1 and 5, without using `OR`.

#### Pattern
WHERE filter

#### Explanation
`IN (...)` is the idiomatic alternative to a chain of `OR`s — same semantics, far more readable, and the planner expands it to either a hash lookup or an `= ANY(array)` depending on cardinality.

#### Solution
```sql
select *
    from cd.facilities
    where
        facid in (1,5);
```

---

### 7. Classify results into buckets

#### Problem
Produce a list of facilities labelled 'cheap' or 'expensive' depending on whether their monthly maintenance cost is more than $100. Return name and monthly maintenance.

#### Pattern
CASE WHEN (pivot)

#### Explanation
`CASE` is the SQL conditional expression. Use it inside `SELECT` to compute derived columns, inside `ORDER BY` for custom sort orders, and inside aggregates (`SUM(CASE WHEN ...)`) for conditional roll-ups — the workhorse of analytical SQL.

#### Solution
```sql
select name,
    case when (monthlymaintenance > 100) then
        'expensive'
    else
        'cheap'
    end as cost
    from cd.facilities;
```

---

### 8. Working with dates

#### Problem
Produce a list of members who joined after the start of September 2012. Return memid, surname, firstname, joindate.

#### Pattern
WHERE filter, Date arithmetic

#### Explanation
String comparison against a date literal works because Postgres implicitly casts `'2012-09-01'` to `timestamp` for the comparison. Use a half-open range (`>=` start, `<` next-period start) rather than `BETWEEN` so end-of-period boundary semantics are unambiguous.

#### Solution
```sql
select memid, surname, firstname, joindate
    from cd.members
    where joindate >= '2012-09-01';
```

---

### 9. Removing duplicates, and ordering results

#### Problem
Produce an ordered list of the first 10 surnames in the members table. The list must not contain duplicates.

#### Pattern
DISTINCT, ORDER BY, LIMIT

#### Explanation
`DISTINCT` deduplicates the projected columns, `ORDER BY` sorts, `LIMIT` truncates. Order matters in the pipeline: `LIMIT` runs after sort, so you get the lexicographically first 10 — not 10 arbitrary rows then sorted.

#### Solution
```sql
select distinct surname
    from cd.members
order by surname
limit 10;
```

---

### 10. Combining results from multiple queries

#### Problem
Produce a combined list of all member surnames and all facility names.

#### Pattern
Set ops (UNION / INTERSECT / EXCEPT)

#### Explanation
`UNION` concatenates two result sets and removes duplicates; `UNION ALL` skips the dedup and is cheaper if you know rows can't collide. Both sides must project the same number of columns with compatible types.

#### Solution
```sql
select surname
    from cd.members
union
select name
    from cd.facilities;
```

---

### 11. Simple aggregation

#### Problem
Get the signup date of the most recent member.

#### Pattern
MAX

#### Explanation
`MAX` over a timestamp returns the latest value. With no `GROUP BY`, the aggregate reduces the whole table to a single row.

#### Solution
```sql
select max(joindate) as latest
    from cd.members;
```

---

### 12. More aggregation

#### Problem
Get the first name, surname, and join date of the member(s) who signed up most recently.

#### Pattern
Subquery

#### Explanation
You can't reference an aggregate from `SELECT` directly alongside non-aggregated columns without grouping. The pattern is to compute the aggregate in a subquery and filter the outer query against it. This naturally handles ties — multiple members sharing the max date all come back.

#### Solution
```sql
select firstname, surname, joindate
    from cd.members
    where joindate =
        (select max(joindate)
            from cd.members);
```

---

### 13. Retrieve the start times of members' bookings

#### Problem
Produce a list of the start times for bookings by members named 'David Farrell'.

#### Pattern
INNER JOIN

#### Explanation
Classic inner join via the foreign key. Alias both tables (`bks`, `mems`) so the column references stay short and unambiguous — essential once you're chaining three or more joins.

#### Solution
```sql
select bks.starttime
    from
        cd.bookings bks
        inner join cd.members mems
            on mems.memid = bks.memid
    where
        mems.firstname='David'
        and mems.surname='Farrell';
```

---

### 14. Work out the start times of bookings for tennis courts

#### Problem
Produce a list of the start times for bookings for tennis courts on 2012-09-21. Return start time and facility name, ordered by time.

#### Pattern
INNER JOIN, WHERE filter

#### Explanation
Join bookings to facilities, filter on facility name and a half-open day range. The `IN` on `facs.name` is fine here because there are only two tennis courts; if you cared about all courts you'd filter on a category column.

#### Solution
```sql
select bks.starttime as start, facs.name as name
    from
        cd.facilities facs
        inner join cd.bookings bks
            on facs.facid = bks.facid
    where
        facs.name in ('Tennis Court 2','Tennis Court 1') and
        bks.starttime >= '2012-09-21' and
        bks.starttime < '2012-09-22'
order by bks.starttime;
```

---

### 15. Produce a list of all members who have recommended another member

#### Problem
Output a deduplicated, name-sorted list of all members who have recommended another member.

#### Pattern
Self-join

#### Explanation
`cd.members.recommendedby` references the same table — a classic adjacency-list self-join. Alias the table twice (`mems` for the recommendee, `recs` for the recommender) and join on the recommendation FK. `DISTINCT` collapses members who've recommended multiple people.

#### Solution
```sql
select distinct recs.firstname as firstname, recs.surname as surname
    from
        cd.members mems
        inner join cd.members recs
            on recs.memid = mems.recommendedby
order by surname, firstname;
```

---

### 16. Produce a list of all members, along with their recommender

#### Problem
List every member with the individual who recommended them (if any), ordered by surname then firstname.

#### Pattern
LEFT JOIN, Self-join

#### Explanation
Inner join would drop members who weren't recommended by anyone. Left join keeps every row on the left side and fills `NULL` on the right where there's no match — the standard "include the unmatched" pattern.

#### Solution
```sql
select mems.firstname as memfname, mems.surname as memsname,
       recs.firstname as recfname, recs.surname as recsname
    from
        cd.members mems
        left outer join cd.members recs
            on recs.memid = mems.recommendedby
order by memsname, memfname;
```

---

### 17. Produce a list of all members who have used a tennis court

#### Problem
List members who have used a tennis court. Output the court name and the member's full name (single column), deduplicated and ordered.

#### Pattern
INNER JOIN

#### Explanation
Three-table join: members → bookings → facilities. The `||` operator concatenates strings; in Postgres concatenating with a `NULL` yields `NULL`, so this only works because firstname/surname are NOT NULL.

#### Solution
```sql
select distinct mems.firstname || ' ' || mems.surname as member, facs.name as facility
    from
        cd.members mems
        inner join cd.bookings bks
            on mems.memid = bks.memid
        inner join cd.facilities facs
            on bks.facid = facs.facid
    where
        facs.name in ('Tennis Court 2','Tennis Court 1')
order by member, facility
```

---

### 18. Produce a list of costly bookings

#### Problem
List bookings on 2012-09-14 that cost the member or guest more than $30. Output facility, member name (single column), cost. Order by descending cost. No subqueries.

#### Pattern
INNER JOIN, CASE WHEN (pivot)

#### Explanation
Guests pay `guestcost`, members pay `membercost`. Computing the cost in a `CASE` is straightforward, but without a subquery you have to duplicate the cost calculation in the `WHERE` clause — ugly, but the constraint forces it. The next problem fixes this with a subquery.

#### Solution
```sql
select mems.firstname || ' ' || mems.surname as member,
    facs.name as facility,
    case
        when mems.memid = 0 then
            bks.slots*facs.guestcost
        else
            bks.slots*facs.membercost
    end as cost
from
    cd.members mems
    inner join cd.bookings bks
        on mems.memid = bks.memid
    inner join cd.facilities facs
        on bks.facid = facs.facid
where
    bks.starttime >= '2012-09-14' and
    bks.starttime < '2012-09-15' and (
        (mems.memid = 0 and bks.slots*facs.guestcost > 30) or
        (mems.memid != 0 and bks.slots*facs.membercost > 30)
    )
order by cost desc;
```

---

### 19. Produce a list of all members, along with their recommender, using no joins

#### Problem
Recreate the recommender-list query without any joins. Use a correlated subquery instead.

#### Pattern
Correlated subquery

#### Explanation
The inline subquery in the SELECT list runs once per outer row, parameterised by the current `mems.recommendedby`. Equivalent to a left join semantically but typically worse for performance — the planner usually can't transform it as cleanly. Useful to know, generally avoid.

#### Solution
```sql
select distinct mems.firstname || ' ' ||  mems.surname as member,
    (select recs.firstname || ' ' || recs.surname as recommender
        from cd.members recs
        where recs.memid = mems.recommendedby
    )
    from
        cd.members mems
order by member;
```

---

### 20. Produce a list of costly bookings, using a subquery

#### Problem
Same as problem 18 (bookings > $30 on 2012-09-14), but cleaner: compute the cost once in a subquery, filter on it in the outer query.

#### Pattern
Subquery

#### Explanation
The inner query produces all bookings with their computed cost; the outer query just filters on `cost > 30`. No duplication of the conditional cost expression. This is the right shape any time you'd otherwise repeat a derived expression in both `SELECT` and `WHERE`.

#### Solution
```sql
select member, facility, cost from (
    select
        mems.firstname || ' ' || mems.surname as member,
        facs.name as facility,
        case
            when mems.memid = 0 then
                bks.slots*facs.guestcost
            else
                bks.slots*facs.membercost
        end as cost
        from
            cd.members mems
            inner join cd.bookings bks
                on mems.memid = bks.memid
            inner join cd.facilities facs
                on bks.facid = facs.facid
        where
            bks.starttime >= '2012-09-14' and
            bks.starttime < '2012-09-15'
    ) as bookings
    where cost > 30
order by cost desc;
```

---

### 21. Insert some data into a table

#### Problem
Add a new facility (facid 9, 'Spa', membercost 20, guestcost 30, initialoutlay 100000, monthlymaintenance 800) to `cd.facilities`.

#### Pattern
INSERT

#### Explanation
Always name your columns in `INSERT` — positional inserts break the moment someone adds, drops, or reorders a column. The values list must match the column list one-for-one.

#### Solution
```sql
insert into cd.facilities
    (facid, name, membercost, guestcost, initialoutlay, monthlymaintenance)
    values (9, 'Spa', 20, 30, 100000, 800);
```

---

### 22. Insert multiple rows of data into a table

#### Problem
Add two facilities in a single statement: 'Spa' (facid 9) and 'Squash Court 2' (facid 10).

#### Pattern
INSERT

#### Explanation
Multi-row VALUES is one network round-trip and one transaction — much faster than N separate inserts. For bulk loads (thousands of rows), prefer `COPY` over even multi-row inserts.

#### Solution
```sql
insert into cd.facilities
    (facid, name, membercost, guestcost, initialoutlay, monthlymaintenance)
    values
        (9, 'Spa', 20, 30, 100000, 800),
        (10, 'Squash Court 2', 3.5, 17.5, 5000, 80);
```

---

### 23. Insert calculated data into a table

#### Problem
Insert the spa using a facid one greater than the current maximum.

#### Pattern
INSERT, Subquery

#### Explanation
`INSERT ... SELECT` lets you build rows from query output. Note: this pattern is racy under concurrency — two sessions could read the same max and collide. In production use a `SERIAL`/`IDENTITY` column or a sequence.

#### Solution
```sql
insert into cd.facilities
    (facid, name, membercost, guestcost, initialoutlay, monthlymaintenance)
    select (select max(facid) from cd.facilities)+1, 'Spa', 20, 30, 100000, 800;
```

---

### 24. Update some existing data

#### Problem
Fix the initial outlay of the second tennis court (facid 1) from 8000 to 10000.

#### Pattern
UPDATE

#### Explanation
Basic targeted update. Always include a `WHERE` clause — without one, `UPDATE` rewrites every row in the table. (Run it inside a transaction in production so you can `ROLLBACK` if the row count is surprising.)

#### Solution
```sql
update cd.facilities
    set initialoutlay = 10000
    where facid = 1;
```

---

### 25. Update multiple rows and columns at the same time

#### Problem
Set both tennis courts (facids 0 and 1) to membercost 6 and guestcost 30 in one statement.

#### Pattern
UPDATE

#### Explanation
Comma-separated assignments in `SET` update multiple columns at once. `IN (0,1)` widens the match to multiple rows. One statement, one transaction.

#### Solution
```sql
update cd.facilities
    set
        membercost = 6,
        guestcost = 30
    where facid in (0,1);
```

---

### 26. Update a row based on the contents of another row

#### Problem
Update tennis court 2 (facid 1) so its prices are 10% higher than tennis court 1 (facid 0). Don't hard-code prices.

#### Pattern
UPDATE with JOIN, Subquery

#### Explanation
Scalar subqueries in `SET` pull values from another row. Works, but for multi-column updates Postgres has a cleaner form: `UPDATE ... SET (a,b) = (SELECT a*1.1, b*1.1 FROM ... WHERE facid=0)` — single subquery, single scan.

#### Solution
```sql
update cd.facilities facs
    set
        membercost = (select membercost * 1.1 from cd.facilities where facid = 0),
        guestcost = (select guestcost * 1.1 from cd.facilities where facid = 0)
    where facs.facid = 1;
```

---

### 27. Delete all bookings

#### Problem
Delete every row from `cd.bookings`.

#### Pattern
DELETE

#### Explanation
`DELETE` without `WHERE` empties the table — but slowly, row by row, generating MVCC versions and WAL. For "blow it all away" prefer `TRUNCATE`: instant, no per-row work, resets the relfile. Trade-off: `TRUNCATE` can't be selectively rolled back at row level and takes a stronger lock.

#### Solution
```sql
delete from cd.bookings;
```

---

### 28. Delete a member from the cd.members table

#### Problem
Remove member 37 (who has no bookings).

#### Pattern
DELETE

#### Explanation
Standard targeted delete. If the row were referenced by a FK with no `ON DELETE` action, this would error — here it works because the member has no bookings to violate the constraint.

#### Solution
```sql
delete from cd.members where memid = 37;
```

---

### 29. Delete based on a subquery

#### Problem
Delete every member who has never made a booking.

#### Pattern
DELETE, Anti-join, IN subquery

#### Explanation
`NOT IN (subquery)` is the anti-join in disguise. Watch out: if the subquery can return `NULL`, `NOT IN` returns no rows because `x NOT IN (NULL, ...)` is `UNKNOWN`. `NOT EXISTS` (or `LEFT JOIN ... WHERE right.key IS NULL`) is safer.

#### Solution
```sql
delete from cd.members where memid not in (select memid from cd.bookings);
```

---

### 30. Count the number of facilities

#### Problem
Count the rows in `cd.facilities`.

#### Pattern
COUNT

#### Explanation
`COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of `col`; `COUNT(DISTINCT col)` counts distinct non-NULL values. They are not interchangeable — interviewers love this distinction.

#### Solution
```sql
select count(*) from cd.facilities;
```

---

### 31. Count the number of expensive facilities

#### Problem
Count facilities with a guest cost of 10 or more.

#### Pattern
COUNT, WHERE filter

#### Explanation
Filter first with `WHERE`, then count. `WHERE` runs before aggregation so the count only sees matching rows.

#### Solution
```sql
select count(*) from cd.facilities where guestcost >= 10;
```

---

### 32. Count the number of recommendations each member makes

#### Problem
Per recommender, count how many members they've recommended. Order by recommender ID.

#### Pattern
GROUP BY, COUNT

#### Explanation
`GROUP BY recommendedby` collapses rows that share a recommender, then `COUNT(*)` counts members in each group. `WHERE recommendedby IS NOT NULL` excludes members who weren't recommended by anyone — otherwise they'd form a phantom NULL group.

#### Solution
```sql
select recommendedby, count(*)
    from cd.members
    where recommendedby is not null
    group by recommendedby
order by recommendedby;
```

---

### 33. List the total slots booked per facility

#### Problem
For each facility, sum the slots booked. Output facid and total, sorted by facid.

#### Pattern
GROUP BY, SUM

#### Explanation
Group by the dimension you want one row per, aggregate everything else. Every non-aggregated column in `SELECT` must appear in `GROUP BY` (or be functionally dependent on the group key, which Postgres allows when grouping by a primary key).

#### Solution
```sql
select facid, sum(slots) as "Total Slots"
    from cd.bookings
    group by facid
order by facid;
```

---

### 34. List the total slots booked per facility in a given month

#### Problem
For September 2012 only, sum slots per facility. Order by total slots.

#### Pattern
GROUP BY, SUM, WHERE filter

#### Explanation
`WHERE` filters rows before the grouping; the aggregate runs over the filtered set. `ORDER BY sum(slots)` is legal — Postgres re-evaluates the aggregate in the sort step (or, more typically, sorts by the pre-computed aggregate column).

#### Solution
```sql
select facid, sum(slots) as "Total Slots"
    from cd.bookings
    where
        starttime >= '2012-09-01'
        and starttime < '2012-10-01'
    group by facid
order by sum(slots);
```

---

### 35. List the total slots booked per facility per month

#### Problem
For 2012, sum slots per facility per month. Output facid, month, slots, sorted by facid then month.

#### Pattern
GROUP BY, EXTRACT

#### Explanation
Group by two dimensions: facility and the extracted month. `EXTRACT(month FROM ...)` returns 1..12. For more flexibility (e.g. year+month rollups across multiple years), `DATE_TRUNC('month', ts)` keeps the full date and is usually a better hammer.

#### Solution
```sql
select facid, extract(month from starttime) as month, sum(slots) as "Total Slots"
    from cd.bookings
    where extract(year from starttime) = 2012
    group by facid, month
order by facid, month;
```

---

### 36. Find the count of members who have made at least one booking

#### Problem
Count distinct members (including guests) who have made any booking.

#### Pattern
COUNT, DISTINCT

#### Explanation
`COUNT(DISTINCT memid)` collapses duplicates first, then counts. Faster than `SELECT COUNT(*) FROM (SELECT DISTINCT memid ...)` and clearer.

#### Solution
```sql
select count(distinct memid) from cd.bookings
```

---

### 37. List facilities with more than 1000 slots booked

#### Problem
Sum slots per facility, return only facilities with totals over 1000. Output facid and total, ordered by facid.

#### Pattern
GROUP BY, HAVING

#### Explanation
`WHERE` filters rows before aggregation; `HAVING` filters groups after. You can't put aggregates in `WHERE` — they don't exist yet at that stage of the query.

#### Solution
```sql
select facid, sum(slots) as "Total Slots"
        from cd.bookings
        group by facid
        having sum(slots) > 1000
        order by facid
```

---

### 38. Find the total revenue of each facility

#### Problem
Compute total revenue per facility, accounting for the guest/member cost difference. Output facility name and revenue, ordered by revenue.

#### Pattern
INNER JOIN, GROUP BY, SUM, CASE WHEN (pivot)

#### Explanation
`SUM` over a `CASE` expression is the conditional-aggregate idiom — you can compute multiple metrics in one pass by using one `SUM(CASE WHEN ...)` per metric. Cleaner than two queries unioned together.

#### Solution
```sql
select facs.name, sum(slots * case
            when memid = 0 then facs.guestcost
            else facs.membercost
        end) as revenue
    from cd.bookings bks
    inner join cd.facilities facs
        on bks.facid = facs.facid
    group by facs.name
order by revenue;
```

---

### 39. Find facilities with a total revenue less than 1000

#### Problem
Same revenue computation as problem 38, but return only facilities under 1000 in revenue.

#### Pattern
Subquery, GROUP BY

#### Explanation
You could use `HAVING SUM(...) < 1000`, but the published solution wraps the aggregate in a subquery and filters in the outer query. Both work; the subquery form is sometimes clearer when the aggregate expression is gnarly and would otherwise be repeated.

#### Solution
```sql
select name, revenue from (
    select facs.name, sum(case
                when memid = 0 then slots * facs.guestcost
                else slots * membercost
            end) as revenue
        from cd.bookings bks
        inner join cd.facilities facs
            on bks.facid = facs.facid
        group by facs.name
    ) as agg where revenue < 1000
order by revenue;
```

---

### 40. Output the facility id that has the highest number of slots booked

#### Problem
Return the single facility with the most slots booked.

#### Pattern
GROUP BY, ORDER BY, LIMIT

#### Explanation
Sort descending, take one. Simple but doesn't handle ties — if two facilities are tied for first you arbitrarily get one. See problem 47 for the tie-safe version using window functions.

#### Solution
```sql
select facid, sum(slots) as "Total Slots"
    from cd.bookings
    group by facid
order by sum(slots) desc
LIMIT 1;
```

---

### 41. List the total slots booked per facility per month, part 2

#### Problem
For 2012, return slots per facility per month, plus per-facility totals (NULL month), plus a grand total (NULL facid and month). Sort by facid then month.

#### Pattern
GROUP BY, ROLLUP

#### Explanation
`GROUP BY ROLLUP(a, b)` produces grouping for `(a,b)`, `(a)`, and `()` — useful for hierarchical subtotals in one pass. `CUBE` is the cross-product variant. Both are SQL:2003 standard and supported in Postgres since 9.5.

#### Solution
```sql
select facid, extract(month from starttime) as month, sum(slots) as slots
    from cd.bookings
    where
        starttime >= '2012-01-01'
        and starttime < '2013-01-01'
    group by rollup(facid, month)
order by facid, month;
```

---

### 42. List the total hours booked per named facility

#### Problem
Per facility, sum slots and convert to hours (slot = 30 min). Output facid, name, hours formatted to two decimal places, ordered by facid.

#### Pattern
GROUP BY, SUM

#### Explanation
`to_char` does numeric formatting with a picture string. The `D` is the locale-aware decimal separator; `9999...9` are optional digit placeholders. `TRIM` strips the leading space `to_char` leaves where a `-` would otherwise go for negatives.

#### Solution
```sql
select facs.facid, facs.name,
    trim(to_char(sum(bks.slots)/2.0, '9999999999999999D99')) as "Total Hours"
    from cd.bookings bks
    inner join cd.facilities facs
        on facs.facid = bks.facid
    group by facs.facid, facs.name
order by facs.facid;
```

---

### 43. List each member's first booking after September 1st 2012

#### Problem
Per member, return surname, firstname, memid, and earliest booking after 2012-09-01. Order by member ID.

#### Pattern
INNER JOIN, GROUP BY, MIN

#### Explanation
`MIN(starttime)` per member after grouping. Filter with `WHERE` before grouping — you only want bookings from September onward to be considered when computing the minimum.

#### Solution
```sql
select mems.surname, mems.firstname, mems.memid, min(bks.starttime) as starttime
    from cd.bookings bks
    inner join cd.members mems on
        mems.memid = bks.memid
    where starttime >= '2012-09-01'
    group by mems.surname, mems.firstname, mems.memid
order by mems.memid;
```

---

### 44. Produce a list of member names, with each row containing the total member count

#### Problem
List every member with a column showing the total member count on each row. Order by join date.

#### Pattern
Window function

#### Explanation
`COUNT(*) OVER ()` with an empty window applies the aggregate over the whole result set without collapsing rows — every row gets the same count. Window functions are the way to attach aggregates alongside detail rows.

#### Solution
```sql
select count(*) over(), firstname, surname
    from cd.members
order by joindate
```

---

### 45. Produce a numbered list of members

#### Problem
Number members 1..N ordered by join date. Member IDs aren't necessarily sequential.

#### Pattern
ROW_NUMBER

#### Explanation
`ROW_NUMBER() OVER (ORDER BY ...)` assigns a unique 1-based rank to each row. Unlike `RANK`/`DENSE_RANK`, it gives unique numbers even when the ordering key has ties — useful for pagination and stable per-row IDs in an output.

#### Solution
```sql
select row_number() over(order by joindate), firstname, surname
    from cd.members
order by joindate
```

---

### 46. Output the facility id that has the highest number of slots booked, again

#### Problem
Return the facility with the most slots booked, but include all ties.

#### Pattern
RANK, Window function

#### Explanation
`RANK() OVER (ORDER BY ... DESC)` assigns rank 1 to the top, with ties sharing the same rank. Filtering on `rank = 1` in an outer query returns all winners. `LIMIT 1` from problem 40 silently drops ties — `RANK` is the correct tool when ties matter.

#### Solution
```sql
select facid, total from (
    select facid, sum(slots) total, rank() over (order by sum(slots) desc) rank
            from cd.bookings
        group by facid
    ) as ranked
    where rank = 1
```

---

### 47. Rank members by (rounded) hours used

#### Problem
Per member, sum hours used (rounded to nearest ten), rank by rounded hours. Output firstname, surname, hours, rank. Sort by rank then surname then firstname.

#### Pattern
GROUP BY, RANK, Window function

#### Explanation
The `((sum+10)/20)*10` trick rounds to the nearest 10 using integer division — `+10` shifts so values land in the right bucket, `/20*10` truncates and scales. Cleaner alternative: `round(sum(slots)/2.0/10)*10`. The window aggregate runs over the grouped rows.

#### Solution
```sql
select firstname, surname,
    ((sum(bks.slots)+10)/20)*10 as hours,
    rank() over (order by ((sum(bks.slots)+10)/20)*10 desc) as rank
from cd.bookings bks
inner join cd.members mems
    on bks.memid = mems.memid
group by mems.memid
order by rank, surname, firstname;
```

---

### 48. Find the top three revenue generating facilities

#### Problem
Top three facilities by revenue, including ties. Output name and rank, sorted by rank then name.

#### Pattern
RANK, Window function, Subquery

#### Explanation
Same shape as problem 46 but with a `<= 3` filter instead of `= 1`. Using `RANK` instead of `LIMIT 3` correctly handles ties at the boundary — if facilities 3, 4, and 5 are tied for third you get all three. `DENSE_RANK` would also work; choice depends on whether you want gaps after ties.

#### Solution
```sql
select name, rank from (
    select facs.name as name, rank() over (order by sum(case
                when memid = 0 then slots * facs.guestcost
                else slots * membercost
            end) desc) as rank
        from cd.bookings bks
        inner join cd.facilities facs
            on bks.facid = facs.facid
        group by facs.name
    ) as subq
    where rank <= 3
order by rank;
```

---

### 49. Classify facilities by value

#### Problem
Split facilities into thirds by revenue, labelled 'high', 'average', 'low'. Order by classification then name.

#### Pattern
Window function, CASE WHEN (pivot)

#### Explanation
`NTILE(3)` divides rows into three roughly-equal buckets based on the `ORDER BY`. The outer `CASE` maps the bucket integer to a label. This is the standard quantile-bucketing pattern; `NTILE(4)` for quartiles, `NTILE(100)` for percentiles.

#### Solution
```sql
select name, case when class=1 then 'high'
        when class=2 then 'average'
        else 'low'
        end revenue
    from (
        select facs.name as name, ntile(3) over (order by sum(case
                when memid = 0 then slots * facs.guestcost
                else slots * membercost
            end) desc) as class
        from cd.bookings bks
        inner join cd.facilities facs
            on bks.facid = facs.facid
        group by facs.name
    ) as subq
order by class, name;
```

---

### 50. Calculate the payback time for each facility

#### Problem
Given 3 complete months of data, compute months-to-payback per facility (initial outlay divided by monthly profit after maintenance). Output name and months, sorted by name.

#### Pattern
GROUP BY, INNER JOIN

#### Explanation
Monthly revenue = total revenue / 3. Monthly profit = monthly revenue − monthlymaintenance. Payback = initial outlay / monthly profit. Watch out for facilities with profit ≤ 0 (division by zero or negative payback) — production code would guard with a CASE.

#### Solution
```sql
select  facs.name as name,
    facs.initialoutlay/((sum(case
            when memid = 0 then slots * facs.guestcost
            else slots * membercost
        end)/3) - facs.monthlymaintenance) as months
    from cd.bookings bks
    inner join cd.facilities facs
        on bks.facid = facs.facid
    group by facs.facid
order by name;
```

---

### 51. Calculate a rolling average of total revenue

#### Problem
For each day in August 2012, the 15-day trailing average of total revenue. Output date and revenue, sorted by date. Account for zero-revenue days.

#### Pattern
Running total, Correlated subquery, INTERVAL

#### Explanation
A `generate_series` produces every date so days with no revenue still appear. A correlated subquery sums revenue in the trailing 15-day window. A window function with `RANGE BETWEEN INTERVAL '14 days' PRECEDING AND CURRENT ROW` would be the modern, more performant approach — the published solution predates wider `RANGE` window support.

#### Solution
```sql
select  dategen.date,
    (
        select sum(case
            when memid = 0 then slots * facs.guestcost
            else slots * membercost
        end) as rev

        from cd.bookings bks
        inner join cd.facilities facs
            on bks.facid = facs.facid
        where bks.starttime > dategen.date - interval '14 days'
            and bks.starttime < dategen.date + interval '1 day'
    )/15 as revenue
    from
    (
        select  cast(generate_series(timestamp '2012-08-01',
            '2012-08-31','1 day') as date) as date
    )  as dategen
order by dategen.date;
```

---

### 52. Produce a timestamp for 1 a.m. on the 31st of August 2012

#### Problem
Return the timestamp `2012-08-31 01:00:00`.

#### Pattern
Date arithmetic

#### Explanation
`timestamp 'literal'` is the explicit cast form. Postgres parses ISO-8601 strings straight into timestamps; the explicit keyword removes any doubt about the type.

#### Solution
```sql
select timestamp '2012-08-31 01:00:00';
```

---

### 53. Subtract timestamps from each other

#### Problem
Subtract `2012-07-30 01:00:00` from `2012-08-31 01:00:00`.

#### Pattern
INTERVAL, Date arithmetic

#### Explanation
Subtracting two timestamps returns an `interval`. Be aware: intervals are not calendar-aware in all directions — `interval '1 month'` added to Jan 31 lands on Feb 28/29, but subtracting timestamps gives an interval in days/hours, not months.

#### Solution
```sql
select timestamp '2012-08-31 01:00:00' - timestamp '2012-07-30 01:00:00' as interval;
```

---

### 54. Generate a list of all the dates in October 2012

#### Problem
Output every date in October 2012.

#### Pattern
Date arithmetic

#### Explanation
`generate_series(start, stop, step)` is a set-returning function. With timestamps it yields a row per step — invaluable for filling calendar tables, building dimension tables, or padding sparse time series with zero rows.

#### Solution
```sql
select generate_series(timestamp '2012-10-01', timestamp '2012-10-31', interval '1 day') as ts;
```

---

### 55. Get the day of the month from a timestamp

#### Problem
Extract the day-of-month integer from `2012-08-31`.

#### Pattern
EXTRACT

#### Explanation
`EXTRACT(field FROM source)` pulls integer fields out of dates/timestamps/intervals. Common fields: `year`, `month`, `day`, `hour`, `dow` (day of week), `doy` (day of year), `epoch` (seconds since 1970).

#### Solution
```sql
select extract(day from timestamp '2012-08-31');
```

---

### 56. Work out the number of seconds between timestamps

#### Problem
Seconds between `2012-08-31 01:00:00` and `2012-09-02 00:00:00`.

#### Pattern
EXTRACT, INTERVAL

#### Explanation
Subtract to get an interval, then `EXTRACT(EPOCH FROM interval)` to get seconds as a double. `EPOCH` on a timestamp gives seconds-since-1970; on an interval it gives total seconds in the interval.

#### Solution
```sql
select extract(epoch from (timestamp '2012-09-02 00:00:00' - '2012-08-31 01:00:00'));
```

---

### 57. Work out the number of days in each month of 2012

#### Problem
For each month in 2012, output month number and an interval column with the month's length.

#### Pattern
INTERVAL, EXTRACT, Date arithmetic

#### Explanation
Generate one row per month, compute `(next month) - (this month)` to get an interval covering the whole month. This automatically handles leap years and the varying month lengths — no hard-coded 28/30/31 logic.

#### Solution
```sql
select extract(month from cal.month) as month,
    (cal.month + interval '1 month') - cal.month as length
from
    (
        select generate_series(timestamp '2012-01-01', timestamp '2012-12-01', interval '1 month') as month
    ) cal
order by month;
```

---

### 58. Work out the number of days remaining in the month

#### Problem
For `2012-02-11 01:00:00`, return the days remaining in the month (today counts as a whole day). Output a single interval.

#### Pattern
DATE_TRUNC, INTERVAL

#### Explanation
`DATE_TRUNC('month', ts)` rounds down to month start; adding `interval '1 month'` gives the first of next month. Subtracting `DATE_TRUNC('day', ts)` (today at midnight) gives the remaining interval, with today counting as whole.

#### Solution
```sql
select (date_trunc('month',ts.testts) + interval '1 month')
        - date_trunc('day', ts.testts) as remaining
    from (select timestamp '2012-02-11 01:00:00' as testts) ts
```

---

### 59. Work out the end time of bookings

#### Problem
Last 10 bookings by end time then start time. Return start and end time.

#### Pattern
INTERVAL, Date arithmetic, ORDER BY, LIMIT

#### Explanation
`slots * interval '30 minutes'` multiplies an interval — yes, that works, Postgres scales the interval by the integer. End time is just `starttime + duration`. Order by computed column is fine; Postgres re-evaluates the expression for the sort.

#### Solution
```sql
select starttime, starttime + slots*(interval '30 minutes') endtime
    from cd.bookings
    order by endtime desc, starttime desc
    limit 10
```

---

### 60. Return a count of bookings for each month

#### Problem
Bookings per month, sorted by month.

#### Pattern
DATE_TRUNC, GROUP BY, COUNT

#### Explanation
`DATE_TRUNC('month', ts)` is the canonical way to bucket by month — it returns a timestamp at month start, preserving the year, so years aren't conflated. `EXTRACT(MONTH ...)` would collapse Jan 2012 and Jan 2013 into the same bucket.

#### Solution
```sql
select date_trunc('month', starttime) as month, count(*)
    from cd.bookings
    group by month
    order by month
```

---

### 61. Work out the utilisation percentage for each facility by month

#### Problem
Utilisation = (slots used / slots available) * 100, per facility per month, rounded to 1 dp. Sort by name then month. Opening hours: 8am to 8:30pm (25 half-hour slots/day).

#### Pattern
DATE_TRUNC, GROUP BY, Date arithmetic

#### Explanation
Available slots per day = 25 (8am to 8:30pm in 30-min slots). Multiply by days-in-month — computed as `(month+1month) - month` cast to date difference. Cast to numeric for `round(..., 1)` to work (`round` on integer ignores the precision argument).

#### Solution
```sql
select name, month,
    round((100*slots)/
        cast(
            25*(cast((month + interval '1 month') as date)
            - cast (month as date)) as numeric),1) as utilisation
    from  (
        select facs.name as name, date_trunc('month', starttime) as month, sum(slots) as slots
            from cd.bookings bks
            inner join cd.facilities facs
                on bks.facid = facs.facid
            group by facs.facid, month
    ) as inn
order by name, month
```

---

### 62. Format the names of members

#### Problem
Output every member's name formatted 'Surname, Firstname'.

#### Pattern
String manipulation (substring, position, concat)

#### Explanation
`||` is SQL-standard string concatenation. Postgres also supports `CONCAT(a, b, ...)` which differs in one important way: `CONCAT` treats `NULL` as empty string, while `||` returns `NULL` if any operand is `NULL`. Pick consciously.

#### Solution
```sql
select surname || ', ' || firstname as name from cd.members
```

---

### 63. Find facilities by a name prefix

#### Problem
Facilities whose name starts with 'Tennis'.

#### Pattern
WHERE filter, String manipulation (substring, position, concat)

#### Explanation
`LIKE 'prefix%'` with a trailing-only wildcard *can* use a btree index on the column — Postgres recognises the prefix and uses index range scan, unlike `'%suffix'` which forces a full scan or a trigram index.

#### Solution
```sql
select * from cd.facilities where name like 'Tennis%';
```

---

### 64. Perform a case-insensitive search

#### Problem
Facilities whose name starts with 'tennis', case-insensitively.

#### Pattern
WHERE filter, String manipulation (substring, position, concat)

#### Explanation
`UPPER(col) LIKE 'TENNIS%'` works but kills index usage on `name`. Alternatives: `ILIKE 'tennis%'` (Postgres extension), `name ~* '^tennis'` (case-insensitive regex), or an expression index on `UPPER(name)` if this query is hot.

#### Solution
```sql
select * from cd.facilities where upper(name) like 'TENNIS%';
```

---

### 65. Find telephone numbers with parentheses

#### Problem
Members whose telephone contains parentheses. Return memid and telephone, sorted by memid.

#### Pattern
WHERE filter, String manipulation (substring, position, concat)

#### Explanation
`~` is Postgres' POSIX regex match operator. The character class `[()]` matches either paren. Regex is overkill here — `telephone LIKE '%(%'` would also work — but the regex syntax generalises to more complex patterns.

#### Solution
```sql
select memid, telephone from cd.members where telephone ~ '\[()\]';
```

---

### 66. Pad zip codes with leading zeroes

#### Problem
Zip codes padded to 5 chars with leading zeroes, ordered by the padded string.

#### Pattern
String manipulation (substring, position, concat)

#### Explanation
`LPAD(str, len, padchar)` left-pads a string to the target length. The cast to `char(5)` first ensures the integer is treated as a string. `to_char(zipcode, 'FM00000')` is the more idiomatic Postgres-native way to zero-pad numbers.

#### Solution
```sql
select lpad(cast(zipcode as char(5)),5,'0') zip from cd.members order by zip
```

---

### 67. Count the number of members whose surname starts with each letter of the alphabet

#### Problem
Per first-letter of surname, count members. Sort by letter. Skip zero-count letters.

#### Pattern
GROUP BY, String manipulation (substring, position, concat)

#### Explanation
`SUBSTR(str, start, length)` extracts a substring (1-indexed). Group by the derived column — Postgres allows referring to the alias in `GROUP BY` (some other DBs require repeating the expression).

#### Solution
```sql
select substr(mems.surname,1,1) as letter, count(*) as count
    from cd.members mems
    group by letter
    order by letter
```

---

### 68. Clean up telephone numbers

#### Problem
Strip `-`, `(`, `)`, and space from telephone numbers. Output memid and cleaned number, sorted by memid.

#### Pattern
String manipulation (substring, position, concat)

#### Explanation
`TRANSLATE(str, from, to)` does character-by-character substitution. When `to` is shorter than `from`, the extra `from` characters are simply removed — perfect for stripping a fixed character set. Faster than chained `REPLACE` calls.

#### Solution
```sql
select memid, translate(telephone, '-() ', '') as telephone
    from cd.members
    order by memid;
```

---

### 69. Find the upward recommendation chain for member ID 27

#### Problem
For member 27, return their recommender, that person's recommender, and so on up the chain. Output memid, firstname, surname, ordered by descending memid.

#### Pattern
Recursive CTE

#### Explanation
A recursive CTE has two parts: the anchor (the seed row) and the recursive term (joins back to the CTE itself). `UNION ALL` is required (not `UNION` — Postgres needs the all-form for recursion). Termination happens when the recursive term returns zero rows.

#### Solution
```sql
with recursive recommenders(recommender) as (
    select recommendedby from cd.members where memid = 27
    union all
    select mems.recommendedby
        from recommenders recs
        inner join cd.members mems
            on mems.memid = recs.recommender
)
select recs.recommender, mems.firstname, mems.surname
    from recommenders recs
    inner join cd.members mems
        on recs.recommender = mems.memid
order by memid desc
```

---

### 70. Find the downward recommendation chain for member ID 1

#### Problem
For member 1, return everyone they recommended, then those people's recommendations, all the way down. Output memid and name, sorted by ascending memid.

#### Pattern
Recursive CTE

#### Explanation
Mirror image of the previous problem: walk down the tree instead of up. Anchor selects direct recommendees; recursive term joins each recommendee's recommendees. Watch out for cycles in real-world recommendation graphs — guard with a visited-set column or a depth cap.

#### Solution
```sql
with recursive recommendeds(memid) as (
    select memid from cd.members where recommendedby = 1
    union all
    select mems.memid
        from recommendeds recs
        inner join cd.members mems
            on mems.recommendedby = recs.memid
)
select recs.memid, mems.firstname, mems.surname
    from recommendeds recs
    inner join cd.members mems
        on recs.memid = mems.memid
order by memid
```

---

### 71. Produce a CTE that can return the upward recommendation chain for any member

#### Problem
Build a recursive CTE that yields `(member, recommender)` pairs for every member's full upward chain, then demonstrate by selecting chains for members 12 and 22.

#### Pattern
Recursive CTE

#### Explanation
Generalise problem 69: the anchor seeds with every `(recommendedby, memid)` pair, the recursive term walks up while preserving the originating `member` column. This is the right shape when you want a reusable hierarchy lookup — compute the full closure once, then filter by member in the outer query.

#### Solution
```sql
with recursive recommenders(recommender, member) as (
    select recommendedby, memid
        from cd.members
    union all
    select mems.recommendedby, recs.member
        from recommenders recs
        inner join cd.members mems
            on mems.memid = recs.recommender
)
select recs.member member, recs.recommender, mems.firstname, mems.surname
    from recommenders recs
    inner join cd.members mems
        on recs.recommender = mems.memid
    where recs.member = 22 or recs.member = 12
order by recs.member asc, recs.recommender desc
```
