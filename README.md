# arXiv-arxived

Process AI papers from arxiv

- [x] List PDFs programatically from arXiv
- [x] Be able to upload to a specific S3 bucket

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

## Upload PDFs to an S3 bucket

> [!NOTE]  
> S3 bucket is currently hardcoded to `arxiv-ai`

It is required to use the `awscli` to configure the right IAM user (with the right S3 user policy to upload objects):

```json
{
    "Sid": "s3",
    "Effect": "Allow",
    "Action": [
        "s3:*"
    ],
    "Resource": [
        "arn:aws:s3:::arxiv-ai",
        "arn:aws:s3:::arxiv-ai/*"
    ]
}
```

### Steps

1. `brew install awscli`
2. `aws configure`
3. Use your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
4. Make sure you've got a bucket named `arxiv-ai`


## Clean up bucket completely

> [!NOTE]  
> S3 bucket is currently hardcoded to `arxiv-ai`

```bash
npm run delete-all
```
