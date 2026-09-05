import hashlib
import json


def compute_hash(day_record: dict, previous_hash: str) -> str:
    record_string = json.dumps(day_record, sort_keys=True)
    combined = previous_hash + record_string
    return hashlib.sha256(combined.encode()).hexdigest()


def verify_hash(day_record: dict, previous_hash: str, stored_hash: str) -> bool:
    recalculated = compute_hash(day_record, previous_hash)
    return recalculated == stored_hash


def build_ledger_chain(day_records: list[dict]) -> list[dict]:
    chain = []
    previous_hash = "0"

    for record in day_records:
        current_hash = compute_hash(record, previous_hash)
        chain.append({
            **record,
            "hash": current_hash,
            "previous_hash": previous_hash
        })
        previous_hash = current_hash

    return chain


if __name__ == "__main__":
    record1 = {"day_record_id": 1, "day_number": 1, "wage_amount": 850}
    hash1 = compute_hash(record1, previous_hash="0")
    print("Hash 1:", hash1)

    record2 = {"day_record_id": 2, "day_number": 2, "wage_amount": 900}
    hash2 = compute_hash(record2, previous_hash=hash1)
    print("Hash 2:", hash2)

    is_valid = verify_hash(record1, previous_hash="0", stored_hash=hash1)
    print("Is record1 valid?", is_valid)

    tampered_record = {"day_record_id": 1, "day_number": 1, "wage_amount": 9999}
    is_valid_tampered = verify_hash(tampered_record, previous_hash="0", stored_hash=hash1)
    print("Is tampered record valid?", is_valid_tampered)

    records = [
        {"day_record_id": 1, "day_number": 1, "wage_amount": 850},
        {"day_record_id": 2, "day_number": 2, "wage_amount": 900},
        {"day_record_id": 3, "day_number": 3, "wage_amount": 800},
    ]
    chain = build_ledger_chain(records)
    print("\nFull ledger chain:")
    for entry in chain:
        print(entry)