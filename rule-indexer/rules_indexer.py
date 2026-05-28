import os
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pega_deserializer import RuleDeserializer

class RulesIndexer:
    def __init__(self, rules_dir: str, output_dir: str):
        self.rules_dir = rules_dir
        self.output_dir = output_dir
        self.deserializer = RuleDeserializer()
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

    def run(self):
        print(f"[RulesIndexer] Scanning rules folder: {self.rules_dir}...")
        
        rules_list = []
        references_list = []
        
        if not os.path.exists(self.rules_dir):
            print(f"[RulesIndexer] Error: Folder {self.rules_dir} does not exist.")
            return

        for filename in os.listdir(self.rules_dir):
            if filename.endswith(".json"):
                file_path = os.path.join(self.rules_dir, filename)
                try:
                    rule = self.deserializer.deserialize(file_path)
                    
                    # Append base rule metadata
                    rules_list.append({
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["rule_name"],
                        "rule_class": rule["rule_class"],
                        "functional_area": rule["functional_area"]
                    })
                    
                    # Append references mapping
                    for ref in rule["references"]:
                        references_list.append({
                            "source_rule_id": rule["rule_id"],
                            "referenced_rule_id": ref
                        })
                except Exception as e:
                    print(f"[RulesIndexer] Failed to index {filename}: {e}")

        # 1. Compile base rules to Parquet
        if rules_list:
            df_rules = pd.DataFrame(rules_list)
            table_rules = pa.Table.from_pandas(df_rules)
            pq.write_table(table_rules, os.path.join(self.output_dir, "rules_myproject.parquet"))
            print(f"[RulesIndexer] Compiled rules_myproject.parquet ({len(rules_list)} records).")
            
        # 2. Compile references to Parquet
        if references_list:
            df_refs = pd.DataFrame(references_list)
            table_refs = pa.Table.from_pandas(df_refs)
            pq.write_table(table_refs, os.path.join(self.output_dir, "rulereferences_myproject.parquet"))
            print(f"[RulesIndexer] Compiled rulereferences_myproject.parquet ({len(references_list)} records).")

if __name__ == "__main__":
    # Create simple mock rules for testing if not existing
    mock_rules_dir = os.path.join(os.getcwd(), "mock-rules")
    if not os.path.exists(mock_rules_dir):
        os.makedirs(mock_rules_dir, exist_ok=True)
        # Mock Rule 1: NextBestAction Channel Wrapper
        with open(os.path.join(mock_rules_dir, "mzAddChannelWrapper.json"), "w") as f:
            f.write('{"id": "RULE-101", "name": "mzAddChannelWrapper", "class": "Rule-Decision-Strategy", "functionalArea": "Email", "references": ["RULE-102"], "conditions": []}')
        # Mock Rule 2: Eligibility Strategy
        with open(os.path.join(mock_rules_dir, "CashbackEligibility.json"), "w") as f:
            f.write('{"id": "RULE-102", "name": "CashbackEligibility", "class": "Rule-Decision-Strategy", "functionalArea": "Eligibility", "references": [], "conditions": ["Age > 21"]}')
            
    indexer = RulesIndexer(mock_rules_dir, os.path.join(os.getcwd(), ".index"))
    indexer.run()
