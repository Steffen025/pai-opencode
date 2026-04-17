---
name: Documents
description: Document processing skills for DOCX, PDF, PPTX, and XLSX. USE WHEN document, Word doc, PDF file, presentation, spreadsheet, tracked changes, form filling, financial model, slide deck, or any task that involves creating, editing, analyzing, or converting document files.
---

# Documents - Document Processing Skills

**Category for skills that create, edit, read, and transform document files across the four primary office formats.**

## Skills in This Category

| Skill | Format | Primary Use |
|-------|--------|-------------|
| **Docx** | Word documents | Create, edit with tracked changes, extract text, redlining workflows |
| **Pdf** | PDF files | Create, merge/split, extract text/tables, fill forms, OCR, watermarks |
| **Pptx** | PowerPoint presentations | Create from HTML, edit with OOXML, work with templates |
| **Xlsx** | Excel spreadsheets | Create with formulas, data analysis, financial modeling |

## Routing Logic

When a user request mentions:

### Word Documents (.docx)
- "Create Word doc", "new docx", "write a letter/memo/report" → **Docx** (creation workflows)
- "Edit Word document", "tracked changes", "redlining", "document review" → **Docx** (OOXML)
- "Read Word document", "extract text from docx" → **Docx** (pandoc)

### PDFs (.pdf)
- "Create PDF", "generate PDF" → **Pdf** (reportlab)
- "Merge PDFs", "split PDF", "combine files" → **Pdf** (pypdf)
- "Extract text from PDF", "read PDF", "PDF tables" → **Pdf** (pdfplumber)
- "Fill PDF form", "complete form" → **Pdf** (forms workflow)
- "Large PDF processing" → **Pdf** (ProcessLargePdfGemini3 workflow)

### Presentations (.pptx)
- "Create presentation", "new slides", "pitch deck" → **Pptx** (html2pptx)
- "Edit presentation", "modify slides" → **Pptx** (OOXML)
- "Use presentation template" → **Pptx** (template workflow)

### Spreadsheets (.xlsx, .csv)
- "Create spreadsheet", "Excel file" → **Xlsx** (openpyxl)
- "Edit spreadsheet", "modify Excel" → **Xlsx** (openpyxl)
- "Financial model", "formulas" → **Xlsx** (financial workflow)
- "Data analysis", "read Excel" → **Xlsx** (pandas)

## Document Processing Best Practices

### DOCX Best Practices
1. **Tracked Changes** — Use redlining workflow for professional document review
2. **Minimal Edits** — Only mark text that actually changes, preserve original RSIDs
3. **Batch Changes** — Group related edits (3-10 changes) for efficient processing
4. **Verification** — Always convert to markdown to verify changes applied correctly

### PDF Best Practices
1. **Library Selection** — `pypdf` for basic ops, `pdfplumber` for text/tables, `reportlab` for creation
2. **OCR for Scanned** — Use `pytesseract` + `pdf2image` for scanned documents
3. **Form Filling** — Follow forms workflow for programmatic form completion
4. **Command Line** — Use `qpdf`/`pdftotext` for simple operations

### PPTX Best Practices
1. **Design First** — Analyze content and choose appropriate colors/layouts before coding
2. **Web-Safe Fonts** — Only use web-safe fonts (Arial, Helvetica, Times, etc.)
3. **Visual Verification** — Always generate thumbnails to inspect layout issues
4. **Template Analysis** — Create inventory before using templates to understand structure

### XLSX Best Practices
1. **Use Formulas** — ALWAYS use Excel formulas, NEVER hardcode calculated values
2. **Zero Errors** — Deliver with zero formula errors (#REF!, #DIV/0!, etc.)
3. **Recalculate** — Run `recalc.py` after creating/editing to update formula values
4. **Financial Standards** — Follow color coding (blue inputs, black formulas, green links)

## When to Use This Category

- User references a `.docx`, `.pdf`, `.pptx`, `.xlsx`, or `.csv` file by path or name
- User asks to create, edit, analyze, or convert any office document
- User mentions redlining, tracked changes, form filling, financial modeling, or slide creation
- User wants to extract structured data (text, tables, images) from documents

## When NOT to Use This Category

- Plain text file operations → use basic file tools
- HTML/Markdown content → use content skills
- Google Docs/Sheets via API → separate integration
- Code file operations → use development skills

## Integration with Other Skills

- **Research** — extract data from research documents (PDFs, XLSX)
- **Media** — create images for document illustrations
- **Content** — produce published document artifacts (reports, newsletters as PDF/DOCX)

---

*Documents Pack — Office document creation, editing, and analysis*
