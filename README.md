# 🚀 CS202 Compiler Optimization Pipeline

A compiler design project that constructs **Control Flow Graphs (CFGs)** from C programs, performs **static program analysis**, and applies multiple compiler optimization passes through an interactive web interface and command-line tool.

## ✨ Features

- Control Flow Graph (CFG) generation
- Interactive web interface
- Command Line Interface (CLI)
- Live Variable Analysis
- Reaching Definitions Analysis
- Constant Folding
- Constant Propagation
- Dead Code Elimination
- Unreachable Code Removal
- Loop Detection and Loop Invariant Code Motion (LICM)
- Graphviz-based CFG visualization

---

## 📂 Project Structure

```text
cs202_project/
│── app.py
│── main.py
│── pipeline.py
│── sample.c
│── requirements.txt
├── cfg/
├── analysis/
├── optimizations/
├── templates/
└── static/
```

---

## 🏗️ Architecture

```text
C Source Code
      │
      ▼
CFG Construction
      │
      ▼
Static Analysis
      │
      ▼
Optimization Pipeline
      │
      ▼
Optimized CFG + Analysis Report
```

---

## ⚙️ Technologies Used

- Python 3
- Flask
- NetworkX
- Graphviz
- HTML
- CSS
- JavaScript

---

## 🚀 Installation

```bash
git clone https://github.com/your-username/cs202-compiler-optimizer.git
cd cs202-compiler-optimizer
pip install -r requirements.txt
```

---

## ▶️ Running

### Web Interface

```bash
python main.py --web
```

Open: `http://localhost:5000`

### Command Line

```bash
python main.py sample.c
```

---

## 📊 Optimization Passes

- Constant Folding
- Constant Propagation
- Dead Code Elimination
- Unreachable Code Removal
- Loop Invariant Code Motion (LICM)

---

## 📈 Analyses

- Live Variable Analysis
- Reaching Definitions
- Uninitialized Variable Detection
- Loop Detection
- CFG Construction

---

## 🎯 Future Improvements

- SSA Form
- Register Allocation
- Function Inlining
- Copy Propagation
- Common Subexpression Elimination

---

## 👨‍💻 Author

**Sandesh Bairagi**

B.Tech in Computer Science and Engineering  
Indian Institute of Technology Ropar

---

## 📄 License

This project is intended for academic and educational purposes.
