# 📊 Agent Analytics Dashboard

An interactive, modern React application for visualizing **agent performance metrics** from a CSV file.

This dashboard provides dynamic histograms and intelligent filtering for KPIs such as:
- 🔊 Number of Outbound Calls
- 📵 Number of No Answers
- 🕒 Percentage Available

Also includes:
- 🚨 At-risk agent identification
- 📈 Top/bottom performance metrics

---

## 🚀 Features

- 📤 Upload CSV file (no backend needed)
- 📊 Recharts-based histograms for each agent metric
- 🧠 Highlighted "At-Risk Agents" (bottom 50% in calls & availability, top 50% in no answers)
- 📱 Mobile-responsive layout
- ⚡ Instant insights after upload

---

## 📁 CSV Format Required

Your uploaded CSV should contain the following columns (column names can be fuzzy, as long as positionally correct):

| Column | Description |
|--------|-------------|
| Column B | `Agent Name` |
| Column D | `Sum of Outbound Calls` |
| Column E | `Sum of No Answers` |
| Column I | `Percentage Available` (as % string, e.g. `34.56%`) |

> ⚠️ CSV header must be in row 2, i.e. skip the first row when parsing.

---

## 🖥️ Usage

### 🧪 Local Development

```bash
npm install
npm start
