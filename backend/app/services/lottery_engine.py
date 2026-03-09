"""
Priority-weighted lottery engine using Efraimidis & Spirakis weighted reservoir sampling.
"""
import uuid
import random
from typing import Optional
from app.models.candidate import PriorityType

PRIORITY_WEIGHTS: dict[str, int] = {
    PriorityType.DISABLED: 5,
    PriorityType.MILITARY_RESERVES: 4,
    PriorityType.LOCAL_RESIDENT: 3,
    PriorityType.YOUNG_COUPLE: 2,
    PriorityType.STANDARD: 1,
}


def run_lottery(
    candidates: list[dict],  # [{id, priority}]
    total_units: int,
    seed: Optional[str] = None,
) -> tuple[list[dict], str]:
    """
    Run weighted lottery using Efraimidis & Spirakis algorithm.
    Returns (results, seed) where results = [{candidateId, lotteryNumber, status}]
    """
    actual_seed = seed or str(uuid.uuid4())
    rng = random.Random(actual_seed)

    scored = []
    for c in candidates:
        weight = PRIORITY_WEIGHTS.get(c["priority"], 1)
        score = rng.random() ** (1.0 / weight)
        scored.append({**c, "score": score})

    # Sort descending by score (higher score = earlier pick)
    scored.sort(key=lambda x: x["score"], reverse=True)

    results = []
    for index, c in enumerate(scored):
        lottery_number = index + 1
        status = "WINNER" if index < total_units else "WAITLIST"
        results.append({
            "candidateId": c["id"],
            "lotteryNumber": lottery_number,
            "status": status,
        })

    return results, actual_seed
