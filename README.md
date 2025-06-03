# arXiv-arxived

Process AI papers from arxiv

**TODO**

- [x] List PDFs programatically from arXiv
- [ ] Upload these PDFs to S3 every 24 hours


## Setup

```bash
npm install
```

## List PDFs

```bash
npm run list

> arxiv-arxived@1.0.0 list
> node list-arxiv.js

Fetching data from arXiv API...

Total entries: 200
=================================

1. Title: EXP-Bench: Can AI Conduct AI Research Experiments?
   Published: 2025-05-30T16:46:29Z
   PDF URL: http://arxiv.org/pdf/2505.24785v2

2. Title: AutoChemSchematic AI: A Closed-Loop, Physics-Aware Agentic Framework for
  Auto-Generating Chemical Process and Instrumentation Diagrams
   Published: 2025-05-30T13:32:00Z
   PDF URL: http://arxiv.org/pdf/2505.24584v2
...
```