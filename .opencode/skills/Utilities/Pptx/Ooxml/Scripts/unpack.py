#!/usr/bin/env python3
"""Unpack and format XML contents of Office files (.docx, .pptx, .xlsx)"""

import random
import shutil
import sys
import defusedxml.minidom
import zipfile
from pathlib import Path

# Get command line arguments
if len(sys.argv) != 3:
    print("Usage: python unpack.py <office_file> <output_dir>", file=sys.stderr)
    sys.exit(1)
input_file, output_dir = sys.argv[1], sys.argv[2]

# Extract and format (safe extraction — guards against zip-slip)
output_path = Path(output_dir)
output_path.mkdir(parents=True, exist_ok=True)
resolved_output = output_path.resolve()
with zipfile.ZipFile(input_file) as zf:
    for member in zf.infolist():
        member_path = resolved_output / member.filename
        try:
            member_path.resolve().relative_to(resolved_output)
        except ValueError:
            raise ValueError(
                f"Unsafe zip entry rejected (zip-slip): {member.filename}"
            ) from None
        if member.is_dir():
            member_path.mkdir(parents=True, exist_ok=True)
        else:
            member_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, member_path.open("wb") as dst:
                shutil.copyfileobj(src, dst)

# Pretty print all XML files
xml_files = list(output_path.rglob("*.xml")) + list(output_path.rglob("*.rels"))
for xml_file in xml_files:
    content = xml_file.read_bytes()
    dom = defusedxml.minidom.parseString(content)
    xml_file.write_bytes(dom.toprettyxml(indent="  ", encoding="ascii"))

# For .docx files, suggest an RSID for tracked changes
if input_file.endswith(".docx"):
    suggested_rsid = "".join(random.choices("0123456789ABCDEF", k=8))
    print(f"Suggested RSID for edit session: {suggested_rsid}")
