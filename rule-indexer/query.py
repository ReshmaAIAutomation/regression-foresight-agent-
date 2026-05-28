import sys
import os
import json
import duckdb

def query_rule_references(rule_name: str, index_dir: str) -> str:
    rules_path = os.path.join(index_dir, "rules_myproject.parquet")
    refs_path = os.path.join(index_dir, "rulereferences_myproject.parquet")

    if not os.path.exists(rules_path) or not os.path.exists(refs_path):
        # Fallback return if index files aren't compiled yet
        return json.dumps({
            "status": "error",
            "message": "Parquet index files not found. Run indexer first.",
            "results": []
        })

    # Connect to local DuckDB and run SQL joins on Parquet files
    conn = duckdb.connect(database=':memory:')
    
    query = f"""
    SELECT 
        r.rule_id, 
        r.rule_name, 
        r.rule_class, 
        r.functional_area,
        ref.referenced_rule_id
    FROM '{rules_path}' r
    LEFT JOIN '{refs_path}' ref ON r.rule_id = ref.source_rule_id
    WHERE r.rule_name = '{rule_name}'
    """
    
    try:
        df = conn.execute(query).df()
        results = df.to_dict(orient="records")
        return json.dumps({
            "status": "success",
            "rule_name": rule_name,
            "results": results
        }, indent=2)
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": str(e),
            "results": []
        })

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "mzAddChannelWrapper"
    index_folder = os.path.join(os.getcwd(), ".index")
    output = query_rule_references(target, index_folder)
    print(output)
