"""Deterministic fallback engines: resume parsing, quiz bank, project
evaluation, reality-check templates and dashboard insights.

These run whenever no LLM key is configured or the LLM call fails, so the
demo never breaks.
"""
import re
from typing import Any

# ---------------------------------------------------------------------------
# Skill alias dictionary (resume parsing fallback)
# ---------------------------------------------------------------------------
SKILL_ALIASES: dict[str, list[str]] = {
    "SQL": ["sql", "mysql", "postgres", "postgresql", "database"],
    "Python": ["python", "pandas", "numpy"],
    "Statistics": ["statistics", "probability", "statistical"],
    "Power BI": ["power bi", "powerbi", "dax"],
    "Excel": ["excel", "spreadsheet", "vlookup", "pivot"],
    "Data Visualization": ["visualization", "dashboards", "charts", "d3"],
    "Machine Learning": ["machine learning", "scikit", "sklearn", "ml "],
    "JavaScript": ["javascript", "js", "es6"],
    "React": ["react", "jsx"],
    "Node.js": ["node", "express", "npm"],
    "Java": ["java", "spring"],
    "Communication": ["communication", "presentation", "public speaking"],
    "Aptitude": ["aptitude", "reasoning", "quantitative"],
    "Welding": ["welding", "welder", "mig", "tig", "arc welding"],
    "Electrician Skills": ["electrician", "wiring", "electrical"],
    "Tailoring": ["tailoring", "sewing", "stitching"],
    "Digital Marketing": ["digital marketing", "seo", "sem", "google ads"],
    "Tally": ["tally", "accounting", "bookkeeping"],
}

SECTION_HINTS = ["experience", "education", "projects", "skills", "certification"]

def parse_resume_fallback(text: str, known_skills: list[str]) -> dict:
    low = text.lower()
    found = []
    for skill, aliases in SKILL_ALIASES.items():
        for a in [skill.lower()] + aliases:
            if re.search(re.escape(a), low):
                # estimate level from context words around the alias
                level = 45
                if re.search(rf"{re.escape(a)}[^.]*?(expert|advanced|strong)", low):
                    level = 75
                elif re.search(rf"{re.escape(a)}[^.]*?(basic|beginner|familiar)", low):
                    level = 30
                found.append({"name": skill, "level": level})
                break
    # also catch skills in DB but not in alias dict
    for name in known_skills:
        if name.lower() in low and not any(f["name"] == name for f in found):
            found.append({"name": name, "level": 45})
    exp_match = re.search(r"(\d+)\+?\s*(years?|yrs?|months?)", low)
    exp_months = 0
    if exp_match:
        n = int(exp_match.group(1))
        exp_months = n * 12 if "month" not in exp_match.group(2) else n
    return {"skills": found, "experienceMonths": min(exp_months, 240)}


# ---------------------------------------------------------------------------
# Curated question bank (quiz fallback) — 6 questions per skill
# ---------------------------------------------------------------------------
QUESTION_BANK: dict[str, list[dict]] = {
    "SQL": [
        {"q": "Which SQL clause filters rows BEFORE grouping?", "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], "answerIdx": 0},
        {"q": "Which join returns ALL rows from the left table?", "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"], "answerIdx": 1},
        {"q": "COUNT(*) counts…", "options": ["Distinct values", "All rows including NULLs", "Only non-null values", "Columns"], "answerIdx": 1},
        {"q": "A primary key must be…", "options": ["Nullable", "Unique & non-null", "Indexed only", "A foreign key"], "answerIdx": 1},
        {"q": "Which statement removes all rows but keeps the table?", "options": ["DROP TABLE", "DELETE without WHERE", "TRUNCATE", "ALTER TABLE"], "answerIdx": 2},
        {"q": "GROUP BY is used with aggregate functions to…", "options": ["Sort rows", "Join tables", "Summarize per group", "Filter columns"], "answerIdx": 2},
    ],
    "Python": [
        {"q": "Which data type is immutable?", "options": ["list", "dict", "tuple", "set"], "answerIdx": 2},
        {"q": "How do you start a function definition?", "options": ["func", "def", "function", "lambda only"], "answerIdx": 1},
        {"q": "What does len([1,2,3]) return?", "options": ["2", "3", "4", "Error"], "answerIdx": 1},
        {"q": "Which is used to handle exceptions?", "options": ["if/else", "try/except", "for/while", "switch"], "answerIdx": 1},
        {"q": "pandas is mainly used for…", "options": ["Web design", "Data analysis", "Gaming", "Networking"], "answerIdx": 1},
        {"q": "What does range(3) produce?", "options": ["[1,2,3]", "[0,1,2]", "[0,1,2,3]", "3"], "answerIdx": 1},
    ],
    "Statistics": [
        {"q": "The middle value of a sorted dataset is the…", "options": ["Mean", "Median", "Mode", "Range"], "answerIdx": 1},
        {"q": "Standard deviation measures…", "options": ["Central tendency", "Spread of data", "Correlation", "Probability"], "answerIdx": 1},
        {"q": "A p-value below 0.05 usually means…", "options": ["Result is significant", "Result is wrong", "Sample is large", "Data is normal"], "answerIdx": 0},
        {"q": "Correlation ranges between…", "options": ["0 and 1", "-1 and 1", "0 and 100", "-∞ and ∞"], "answerIdx": 1},
        {"q": "The most frequent value is the…", "options": ["Mean", "Median", "Mode", "Std dev"], "answerIdx": 2},
        {"q": "A histogram shows…", "options": ["Distribution of a variable", "Time series", "Correlation matrix", "Geography"], "answerIdx": 0},
    ],
    "Power BI": [
        {"q": "DAX is used for…", "options": ["Data transforms & measures", "Styling reports", "Scheduling refresh", "Connecting printers"], "answerIdx": 0},
        {"q": "Power Query is used to…", "options": ["Clean & shape data", "Write SQL", "Design visuals", "Publish to web"], "answerIdx": 0},
        {"q": "A star schema has a central…", "options": ["Fact table", "Dimension table", "Matrix", "Report"], "answerIdx": 0},
        {"q": "Which visual best shows trend over time?", "options": ["Pie chart", "Line chart", "Card", "Table"], "answerIdx": 1},
        {"q": "Measures in Power BI are…", "options": ["Calculated at query time", "Stored columns", "Images", "Static text"], "answerIdx": 0},
        {"q": "To filter across all visuals you use…", "options": ["Slicers", "Bookmarks", "Tooltips", "Themes"], "answerIdx": 0},
    ],
    "Excel": [
        {"q": "VLOOKUP looks for a value in the…", "options": ["First column of a range", "Last row", "Any column", "Chart"], "answerIdx": 0},
        {"q": "Which formula adds cells A1:A10?", "options": ["=TOTAL(A1:A10)", "=SUM(A1:A10)", "=ADD(A1:A10)", "=A1:A10"], "answerIdx": 1},
        {"q": "A pivot table is used to…", "options": ["Summarize data", "Draw shapes", "Send emails", "Print"], "answerIdx": 0},
        {"q": "Absolute reference is written as…", "options": ["A1", "$A$1", "A$1$", "#A1"], "answerIdx": 1},
        {"q": "IF(A1>10,\"Yes\",\"No\") returns…", "options": ["Yes if A1>10 else No", "Always Yes", "Error", "10"], "answerIdx": 0},
        {"q": "Conditional formatting…", "options": ["Formats cells based on rules", "Merges cells", "Sorts data", "Creates charts"], "answerIdx": 0},
    ],
    "JavaScript": [
        {"q": "Which declares a block-scoped variable?", "options": ["var", "let", "define", "static"], "answerIdx": 1},
        {"q": "typeof [] returns…", "options": ["\"array\"", "\"object\"", "\"list\"", "\"undefined\""], "answerIdx": 1},
        {"q": "Array.map is used to…", "options": ["Transform each item", "Filter items", "Sort items", "Loop only"], "answerIdx": 0},
        {"q": "=== differs from == because it…", "options": ["Compares type too", "Is faster", "Works on arrays", "Is deprecated"], "answerIdx": 0},
        {"q": "A Promise represents…", "options": ["A future value", "A loop", "A CSS class", "A DOM node"], "answerIdx": 0},
        {"q": "JSON.parse converts…", "options": ["String to object", "Object to string", "Number to array", "Null to zero"], "answerIdx": 0},
    ],
    "React": [
        {"q": "Components in React are…", "options": ["Functions or classes returning UI", "CSS files", "Database tables", "HTML pages"], "answerIdx": 0},
        {"q": "useState is a…", "options": ["Hook", "Component", "Prop", "Reducer"], "answerIdx": 0},
        {"q": "Props are…", "options": ["Inputs to components", "State updates", "CSS classes", "Routes"], "answerIdx": 0},
        {"q": "The virtual DOM is used to…", "options": ["Minimize real DOM updates", "Style components", "Fetch data", "Route pages"], "answerIdx": 0},
        {"q": "useEffect handles…", "options": ["Side effects", "Rendering", "Styling", "Routing"], "answerIdx": 0},
        {"q": "Keys in lists help React…", "options": ["Identify items across renders", "Sort items", "Style items", "Fetch items"], "answerIdx": 0},
    ],
    "Digital Marketing": [
        {"q": "SEO stands for…", "options": ["Search Engine Optimization", "Social Engagement Online", "Sales Email Outreach", "Site Encryption Options"], "answerIdx": 0},
        {"q": "CTR measures…", "options": ["Clicks per impression", "Cost per sale", "Total followers", "Page speed"], "answerIdx": 0},
        {"q": "Google Ads charges mainly by…", "options": ["CPC/CPM", "Monthly rent", "Word count", "Followers"], "answerIdx": 0},
        {"q": "A keyword with high volume & low competition is…", "options": ["A good target", "Impossible", "Irrelevant", "Penalized"], "answerIdx": 0},
        {"q": "Organic traffic comes from…", "options": ["Unpaid search results", "Paid ads", "Email", "SMS"], "answerIdx": 0},
        {"q": "A landing page should…", "options": ["Have one clear call-to-action", "Link everywhere", "Autoplay music", "Hide pricing"], "answerIdx": 0},
    ],
    "Tally": [
        {"q": "Tally is primarily used for…", "options": ["Accounting & GST", "Video editing", "Web design", "Gaming"], "answerIdx": 0},
        {"q": "A ledger in Tally records…", "options": ["Transactions per account", "Employee names", "Inventory photos", "Tax Slabs only"], "answerIdx": 0},
        {"q": "GST returns are filed…", "options": ["Monthly/quarterly", "Every 5 years", "Never", "Daily"], "answerIdx": 0},
        {"q": "Voucher entry is used to…", "options": ["Record transactions", "Print reports", "Create users", "Design invoices"], "answerIdx": 0},
        {"q": "Balance sheet shows…", "options": ["Assets & liabilities", "Sales only", "Cash only", "Payroll"], "answerIdx": 0},
        {"q": "TallyPrime can…", "options": ["Generate GST reports", "Edit videos", "Design logos", "Host websites"], "answerIdx": 0},
    ],
    "Communication": [
        {"q": "Active listening means…", "options": ["Fully focusing & responding", "Waiting to talk", "Multitasking", "Nodding silently"], "answerIdx": 0},
        {"q": "In emails, the subject line should be…", "options": ["Clear & specific", "Empty", "\"Hi\"", "ALL CAPS"], "answerIdx": 0},
        {"q": "Body language is part of…", "options": ["Non-verbal communication", "Written skill", "Aptitude", "Negotiation only"], "answerIdx": 0},
        {"q": "The STAR method is used for…", "options": ["Answering interview questions", "Writing SQL", "Filing GST", "Typing speed"], "answerIdx": 0},
        {"q": "To persuade, lead with…", "options": ["Benefits to the listener", "Your problems", "Jargon", "Deadlines"], "answerIdx": 0},
        {"q": "Good feedback is…", "options": ["Specific & actionable", "Generic praise", "Public criticism", "Silent"], "answerIdx": 0},
    ],
    "Aptitude": [
        {"q": "If 5 workers finish a job in 12 days, 10 workers take…", "options": ["6 days", "12 days", "24 days", "3 days"], "answerIdx": 0},
        {"q": "15% of 200 is…", "options": ["30", "15", "35", "25"], "answerIdx": 0},
        {"q": "Next in series: 2, 6, 12, 20, …", "options": ["30", "28", "26", "32"], "answerIdx": 0},
        {"q": "A train 100m long at 20 m/s crosses a pole in…", "options": ["5 s", "10 s", "20 s", "2 s"], "answerIdx": 0},
        {"q": "Simple interest on ₹1000 at 10% for 2 years is…", "options": ["₹200", "₹100", "₹20", "₹220"], "answerIdx": 0},
        {"q": "Odd one out: 3, 5, 7, 9, 11", "options": ["9", "3", "5", "11"], "answerIdx": 0},
    ],
    "Machine Learning": [
        {"q": "Supervised learning needs…", "options": ["Labelled data", "Unlabelled data", "GPU cluster", "No data"], "answerIdx": 0},
        {"q": "Overfitting means the model…", "options": ["Memorizes training data", "Is too simple", "Has no data", "Is slow"], "answerIdx": 0},
        {"q": "Train/test split is used to…", "options": ["Evaluate generalization", "Save memory", "Speed training", "Clean data"], "answerIdx": 0},
        {"q": "Regression predicts…", "options": ["Continuous values", "Categories", "Images", "Text"], "answerIdx": 0},
        {"q": "Accuracy is a poor metric when…", "options": ["Classes are imbalanced", "Data is small", "Features are many", "Model is linear"], "answerIdx": 0},
        {"q": "Scikit-learn is a…", "options": ["ML library", "Database", "Web framework", "OS"], "answerIdx": 0},
    ],
    "Node.js": [
        {"q": "Node.js is…", "options": ["JavaScript runtime", "Database", "CSS framework", "Web server only"], "answerIdx": 0},
        {"q": "npm installs…", "options": ["Packages", "Processors", "Protocols", "Ports"], "answerIdx": 0},
        {"q": "Express is a…", "options": ["Web framework", "Database", "Language", "OS"], "answerIdx": 0},
        {"q": "async/await handles…", "options": ["Asynchronous code", "Styling", "Routing", "Compression"], "answerIdx": 0},
        {"q": "REST APIs commonly use…", "options": ["JSON over HTTP", "FTP", "SMTP", "Bluetooth"], "answerIdx": 0},
        {"q": "Middleware in Express…", "options": ["Processes requests in sequence", "Renders HTML", "Stores data", "Compiles JS"], "answerIdx": 0},
    ],
    "Java": [
        {"q": "Java is…", "options": ["Compiled & interpreted", "Only interpreted", "Only compiled", "A markup language"], "answerIdx": 0},
        {"q": "JVM stands for…", "options": ["Java Virtual Machine", "Java Verified Module", "Joint Variable Mode", "Java Vision Model"], "answerIdx": 0},
        {"q": "Which is NOT OOP?", "options": ["Encryption", "Inheritance", "Polymorphism", "Encapsulation"], "answerIdx": 0},
        {"q": "String in Java is…", "options": ["Immutable", "Mutable", "A primitive", "An array"], "answerIdx": 0},
        {"q": "To handle exceptions Java uses…", "options": ["try/catch", "onerror", "rescue", "trap"], "answerIdx": 0},
        {"q": "main() signature is…", "options": ["public static void main(String[] a)", "def main():", "function main()", "start()"], "answerIdx": 0},
    ],
    "Welding": [
        {"q": "MIG welding uses…", "options": ["A continuous wire electrode", "Carbon rods", "Laser", "Glue"], "answerIdx": 0},
        {"q": "Before welding, metal must be…", "options": ["Clean of rust/oil", "Wet", "Painted", "Hot"], "answerIdx": 0},
        {"q": "The welding helmet protects…", "options": ["Eyes & face from arc", "Hands", "Feet", "Ears only"], "answerIdx": 0},
        {"q": "TIG welding is best for…", "options": ["Precision thin metals", "Rusty pipes", "Wood", "Plastic"], "answerIdx": 0},
        {"q": "Porosity in a weld is caused by…", "options": ["Gas entrapment", "Too much heat only", "Slow speed", "Shiny metal"], "answerIdx": 0},
        {"q": "Arc welding joins metals using…", "options": ["Electric arc heat", "Friction", "Adhesive", "Pressure only"], "answerIdx": 0},
    ],
    "Electrician Skills": [
        {"q": "Household wiring in India is typically…", "options": ["230V single phase", "11kV", "12V", "440V three phase"], "answerIdx": 0},
        {"q": "MCB protects against…", "options": ["Overload & short circuit", "Rain", "Theft", "Noise"], "answerIdx": 0},
        {"q": "Before any repair, first…", "options": ["Switch off the supply", "Wet the wires", "Call media", "Pull wires"], "answerIdx": 0},
        {"q": "Earth wire is usually coloured…", "options": ["Green/yellow", "Red", "Black", "Blue"], "answerIdx": 0},
        {"q": "A multimeter measures…", "options": ["Voltage/current/resistance", "Weight", "Length", "Speed"], "answerIdx": 0},
        {"q": "Insulation prevents…", "options": ["Electric shock/leakage", "Heating only", "Noise", "Rust"], "answerIdx": 0},
    ],
}
GENERIC_QA = [
    {"q": "Best first step to master any new skill?", "options": ["Structured practice", "Random videos", "Waiting", "Skipping basics"], "answerIdx": 0},
    {"q": "Which proves skill best to employers?", "options": ["A real project", "Only theory", "Bookmarks", "Screenshots"], "answerIdx": 0},
    {"q": "Learning 1 hour daily for 30 days gives…", "options": ["~30 hours practice", "Nothing", "A job", "A certificate"], "answerIdx": 0},
    {"q": "After finishing a course you should…", "options": ["Test yourself & build", "Stop learning", "Delete notes", "Only rewatch"], "answerIdx": 0},
    {"q": "Which shows real learning progress?", "options": ["Assessment scores over time", "Video count", "Playlists saved", "Watch hours"], "answerIdx": 0},
    {"q": "Feedback on mistakes should be…", "options": ["Welcome & analyzed", "Ignored", "Feared", "Hidden"], "answerIdx": 0},
]

def quiz_fallback(skill: str) -> dict:
    qs = QUESTION_BANK.get(skill, GENERIC_QA)[:6]
    return {"questions": qs}


# ---------------------------------------------------------------------------
# Project evaluation fallback
# ---------------------------------------------------------------------------
KEYWORDS_BY_SKILL: dict[str, list[str]] = {
    "SQL": ["sql", "query", "database", "schema", "join", "postgres", "mysql"],
    "Python": ["python", "pandas", "script", "numpy"],
    "Statistics": ["statistic", "regression", "correlation", "probability", "hypothesis"],
    "Power BI": ["power bi", "powerbi", "dax", "dashboard"],
    "Excel": ["excel", "pivot", "vlookup", "spreadsheet"],
    "Data Visualization": ["chart", "graph", "visualization", "dashboard", "plot"],
    "Machine Learning": ["model", "prediction", "machine learning", "classification", "training data"],
    "JavaScript": ["javascript", "js", "react", "frontend"],
    "React": ["react", "component", "hooks", "jsx"],
    "Node.js": ["node", "express", "api", "backend"],
    "Java": ["java", "spring"],
    "Digital Marketing": ["campaign", "seo", "ads", "social media", "ctr"],
    "Tally": ["tally", "gst", "ledger", "accounting"],
    "Communication": ["presentation", "demo", "report", "documentation"],
    "Welding": ["weld", "fabrication", "joint"],
    "Electrician Skills": ["wiring", "circuit", "installation"],
}

def evaluate_project_fallback(title: str, description: str, skills: list[dict]) -> dict:
    low = f"{title} {description}".lower()
    evaluation = []
    for s in skills[:8]:
        kws = KEYWORDS_BY_SKILL.get(s["name"], [s["name"].lower()])
        hits = sum(1 for k in kws if k in low)
        if hits >= 2:
            evaluation.append({"skillId": s["id"], "verdict": "validated", "feedback": f"Description strongly demonstrates {s['name']} ({hits} relevant signals)."})
        elif hits == 1:
            evaluation.append({"skillId": s["id"], "verdict": "needs-improvement", "feedback": f"{s['name']} mentioned but lightly — add concrete details, metrics or repo evidence."})
        # zero hits: not evaluated (skill not really part of this project)
    if not evaluation:
        evaluation = [{"skillId": skills[0]["id"], "verdict": "needs-improvement", "feedback": "Add specifics: dataset used, techniques applied, measurable outcome."}] if skills else []
    return {"evaluation": evaluation}


# ---------------------------------------------------------------------------
# Insights fallback
# ---------------------------------------------------------------------------
def insights_fallback(stats: list[dict], context: dict) -> dict:
    if not stats:
        return {"insights": ["Not enough non-placement data yet to compute patterns."]}
    top = stats[0]
    lines = [
        f"Top blocker: {top['label']} — {top['pct']}% of not-placed trainees ({top['count']} of {sum(s['count'] for s in stats)}).",
    ]
    if len(stats) > 1:
        second = stats[1]
        lines.append(f"Second factor: {second['label']} ({second['pct']}%). Addressing the top two could shift most of the cohort toward placement.")
    lines.append("Recommended curriculum action: strengthen the weakest-assessed skills in the latest cohorts and add local employer tie-ups in low-placement districts.")
    return {"insights": lines}
