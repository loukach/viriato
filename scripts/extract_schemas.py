#!/usr/bin/env python3
"""
Extract schemas from all downloaded Portuguese Parliament datasets
"""
import json
from pathlib import Path
from collections import defaultdict
from typing import Any, Dict, List, Set

# Base directories
BASE_DIR = Path(__file__).parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
SCHEMAS_DIR = BASE_DIR / "data" / "schemas"

# Ensure directories exist
SCHEMAS_DIR.mkdir(parents=True, exist_ok=True)


def get_type(value: Any) -> str:
    """Get the type of a value"""
    if value is None:
        return "null"
    elif isinstance(value, bool):
        return "boolean"
    elif isinstance(value, int):
        return "integer"
    elif isinstance(value, float):
        return "number"
    elif isinstance(value, str):
        return "string"
    elif isinstance(value, list):
        return "array"
    elif isinstance(value, dict):
        return "object"
    else:
        return "unknown"


def extract_schema(obj: Any, depth: int = 0, max_depth: int = 5) -> Dict:
    """
    Recursively extract schema from a JSON object
    """
    if depth > max_depth:
        return {"type": "...", "note": "max_depth_reached"}

    obj_type = get_type(obj)

    if obj_type == "array":
        if not obj:
            return {"type": "array", "items": "empty"}

        # Sample first few items to understand array structure
        sample_size = min(3, len(obj))
        item_schemas = [extract_schema(item, depth + 1, max_depth) for item in obj[:sample_size]]

        # If all items have same structure, use first one
        return {
            "type": "array",
            "items": item_schemas[0],
            "count": len(obj)
        }

    elif obj_type == "object":
        properties = {}
        for key, value in obj.items():
            properties[key] = extract_schema(value, depth + 1, max_depth)

        return {
            "type": "object",
            "properties": properties
        }

    else:
        # Primitive type
        schema = {"type": obj_type}

        # Add sample value for strings (truncated)
        if obj_type == "string" and obj:
            sample = obj[:100] if len(obj) > 100 else obj
            schema["sample"] = sample

        return schema


def analyze_dataset(file_path: Path) -> Dict:
    """
    Analyze a single dataset file and extract its schema
    """
    print(f"Analyzing {file_path.name}...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Get basic info
        data_type = get_type(data)

        result = {
            "filename": file_path.name,
            "size_bytes": file_path.stat().st_size,
            "size_mb": round(file_path.stat().st_size / 1024 / 1024, 2),
            "root_type": data_type
        }

        # Extract schema
        if data_type == "array":
            result["item_count"] = len(data)
            if data:
                result["item_schema"] = extract_schema(data[0], max_depth=4)
        elif data_type == "object":
            result["schema"] = extract_schema(data, max_depth=4)

        # Look for potential ID fields and foreign keys
        id_fields = set()
        if data_type == "array" and data:
            first_item = data[0]
            if isinstance(first_item, dict):
                for key in first_item.keys():
                    key_lower = key.lower()
                    if 'id' in key_lower or key_lower.endswith('numero'):
                        id_fields.add(key)

        if id_fields:
            result["potential_id_fields"] = sorted(id_fields)

        print(f"  [OK] {result.get('item_count', 'N/A')} items, {result['size_mb']} MB")
        return result

    except Exception as e:
        print(f"  [ERROR] {e}")
        return {
            "filename": file_path.name,
            "error": str(e)
        }


def main():
    """
    Main schema extraction function
    """
    print("=" * 60)
    print("Portuguese Parliament Data Schema Extractor")
    print("=" * 60)
    print()

    # Find all JSON files
    json_files = sorted(RAW_DATA_DIR.glob("*.txt"))

    if not json_files:
        print("No JSON files found in data/raw/")
        return

    print(f"Found {len(json_files)} datasets\n")

    # Analyze each dataset
    all_schemas = {}

    for json_file in json_files:
        schema = analyze_dataset(json_file)
        dataset_name = json_file.stem.replace('_json', '')
        all_schemas[dataset_name] = schema

        # Save individual schema
        schema_file = SCHEMAS_DIR / f"{dataset_name}_schema.json"
        with open(schema_file, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)

        print()

    # Save combined schemas
    combined_file = SCHEMAS_DIR / "all_schemas.json"
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_schemas, f, indent=2, ensure_ascii=False)

    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Analyzed datasets: {len(all_schemas)}")
    print(f"Schemas saved to: {SCHEMAS_DIR}")
    print(f"Combined schema: {combined_file}")
    print()

    # Print summary table
    print("Dataset Summary:")
    print(f"{'Dataset':<40} {'Items':<10} {'Size (MB)':<10}")
    print("-" * 60)

    total_size = 0
    total_items = 0

    for name, schema in sorted(all_schemas.items()):
        items = schema.get('item_count', 'N/A')
        size = schema.get('size_mb', 0)
        total_size += size

        if isinstance(items, int):
            total_items += items
            items_str = str(items)
        else:
            items_str = str(items)

        print(f"{name:<40} {items_str:<10} {size:<10.2f}")

    print("-" * 60)
    print(f"{'TOTAL':<40} {total_items:<10} {total_size:<10.2f}")


if __name__ == "__main__":
    main()
