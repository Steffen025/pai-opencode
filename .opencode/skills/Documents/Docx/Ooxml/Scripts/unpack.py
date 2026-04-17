#!/usr/bin/env python3
"""Unpack and format XML contents of Office files (.docx, .pptx, .xlsx)"""

import random
import sys
import defusedxml.minidom
import zipfile
from pathlib import Path

# Get command line arguments
if len(sys.argv) != 3:
    print("Usage: python unpack.py <office_file> <output_dir>", file=sys.stderr)
    sys.exit(1)
input_file, output_dir = sys.argv[1], sys.argv[2]

# Extract and format
output_path = Path(output_dir)
output_path.mkdir(parents=True, exist_ok=True)

# Safe extraction: prevent zip-slip by validating all member paths
out_resolved = output_path.resolve()
with zipfile.ZipFile(input_file) as zf:
    for member in zf.namelist():
        member_path = (output_path / member).resolve()
        try:
            member_path.relative_to(out_resolved)
        except ValueError as err:
            raise ValueError(f"Unsafe zip entry rejected (zip-slip): {member}") from err
    zf.extractall(output_path)

# Pretty print all XML files
xml_files = list(output_path.rglob("*.xml")) + list(output_path.rglob("*.rels"))
for xml_file in xml_files:
    content = xml_file.read_text(encoding="utf-8")
    dom = defusedxml.minidom.parseString(content)
    xml_file.write_bytes(dom.toprettyxml(indent="  ", encoding="ascii"))

# For .docx files, suggest an RSID for tracked changes
if input_file.endswith(".docx"):
    suggested_rsid = "".join(random.choices("0123456789ABCDEF", k=8))  # noqa: S311 — local-only, non-cryptographic RSID for user hinting, not stored or reused
    print(f"Suggested RSID for edit session: {suggested_rsid}")
