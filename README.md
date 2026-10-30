# CodingCamp-26October26-AndrewDzanuarAlfiansyah

## Expense & Budget Visualizer

A clean, client-side web app for tracking expenses and visualizing spending by category. No backend required — all data is stored in the browser via Local Storage.

### Features

- **Input Form** — Add transactions with Item Name, Amount, and Category (Food, Transport, Fun). All fields are validated before submission.
- **Transaction List** — Scrollable list showing every transaction with name, amount, and a colored category badge. Delete individual items or clear all.
- **Total Balance** — Displays the running total of all expenses at the top. Updates automatically on every add or delete.
- **Pie Chart** — Visual breakdown of spending by category, powered by Chart.js. Updates in real time as transactions change.

### Tech Stack

- HTML for structure
- CSS for styling (`css/style.css`)
- Vanilla JavaScript for logic (`js/app.js`)
- [Chart.js](https://www.chartjs.org/) loaded via CDN for the pie chart
- Browser Local Storage API for data persistence

### Project Structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

### How to Run

Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari). No build step or server needed.