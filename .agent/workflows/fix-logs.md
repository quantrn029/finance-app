---
description: Analyze logs.txt and find the root causes, then fix all of them
---

1. Read the content of `logs.txt` to identify recent errors.
2. Analyze the errors to determine the root cause (e.g., missing files, syntax errors, database connection issues).
3. Locate the relevant files and lines of code mentioned in the logs.
4. Apply fixes to the code to resolve the identified errors.
5. If the logs are clean or no actionable errors are found, notify the user.
6. After fixing, restart the server if necessary (or let the user know).

// turbo
7. Run `npm run build` to verify fixes if applicable.
