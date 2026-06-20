from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from classifier import classify_emergency

app = FastAPI(title="GhostNet AI Economic Agent", version="2.0.0")

# In-memory resource pool matching project spec
resource_pool = {
    "AMBULANCE": 2,
    "MEDICAL_KIT": 5,
    "FOOD_PACKETS": 100,
    "RESCUE_TEAMS": 3,
    "SHELTER_SPACE": 10
}

# Base totals to compute scarcity factors
resource_totals = {
    "AMBULANCE": 2,
    "MEDICAL_KIT": 5,
    "FOOD_PACKETS": 100,
    "RESCUE_TEAMS": 3,
    "SHELTER_SPACE": 10
}

# Base opportunity costs for each resource
resource_base_costs = {
    "AMBULANCE": 80,
    "RESCUE_TEAMS": 70,
    "SHELTER_SPACE": 40,
    "MEDICAL_KIT": 25,
    "FOOD_PACKETS": 5
}

# Utility payoff associated with emergency priorities
priority_utility = {
    "CRITICAL": 100,
    "HIGH": 75,
    "MEDIUM": 45,
    "LOW": 15
}

allocated_counts = {
    "AMBULANCE": 0,
    "MEDICAL_KIT": 0,
    "FOOD_PACKETS": 0,
    "RESCUE_TEAMS": 0,
    "SHELTER_SPACE": 0
}

class AnalyzeRequest(BaseModel):
    text: str

class AllocateRequest(BaseModel):
    category: str
    priority: str
    resourceNeeded: str
    text: str

@app.get("/agent/resources")
def get_resources():
    return {
        "available": resource_pool,
        "allocated": allocated_counts,
        "base_costs": resource_base_costs
    }

@app.post("/agent/resources/reset")
def reset_resources():
    global resource_pool, allocated_counts
    for key in resource_totals:
        resource_pool[key] = resource_totals[key]
        allocated_counts[key] = 0
    return {"status": "success", "resources": resource_pool}

@app.post("/agent/analyze")
def analyze_text(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    result = classify_emergency(req.text)
    return result

@app.post("/agent/allocate")
def allocate_resource(req: AllocateRequest):
    global resource_pool, allocated_counts
    
    resource_type = req.resourceNeeded.upper()
    priority = req.priority.upper()
    
    if resource_type not in resource_pool:
        resource_type = "RESCUE_TEAMS"

    available = resource_pool[resource_type]
    total = resource_totals[resource_type]
    
    # Calculate scarcity index (1.0 = fully depleted, 0.0 = fully available)
    scarcity_factor = 1.0 - (available / total) if total > 0 else 1.0
    
    # Calculate dynamic opportunity cost
    base_cost = resource_base_costs.get(resource_type, 50)
    dynamic_cost = base_cost * (1.0 + (2.0 * scarcity_factor))
    
    # Calculate triage utility payoff
    utility = priority_utility.get(priority, 30)

    # 1. Depleted Resource Substitution Flow
    if available == 0:
        # Economic substitution logic: try to allocate a lower-cost or alternative resource package
        if resource_type == "AMBULANCE" and resource_pool["MEDICAL_KIT"] > 0:
            # Substitute Ambulance with a Medical Kit
            resource_pool["MEDICAL_KIT"] -= 1
            allocated_counts["MEDICAL_KIT"] += 1
            sub_id = f"MEDICAL_KIT #{allocated_counts['MEDICAL_KIT']}"
            
            return {
                "allocated": True,
                "resource": sub_id,
                "action": f"Substituted: Dispatched {sub_id}",
                "reason": f"Ambulances depleted. Economic agent substituted with Medical Kit (Utility payoff: {utility} vs substitute cost: {resource_base_costs['MEDICAL_KIT']}).",
                "economics": {
                    "utilityScore": utility,
                    "scarcityCost": dynamic_cost,
                    "decision": "SUBSTITUTED",
                    "originalResource": resource_type
                }
            }
        elif resource_type == "RESCUE_TEAMS" and resource_pool["MEDICAL_KIT"] > 0:
            # Substitute Rescue Team with a Medical Kit
            resource_pool["MEDICAL_KIT"] -= 1
            allocated_counts["MEDICAL_KIT"] += 1
            sub_id = f"MEDICAL_KIT #{allocated_counts['MEDICAL_KIT']}"
            return {
                "allocated": True,
                "resource": sub_id,
                "action": f"Substituted: Dispatched {sub_id}",
                "reason": f"Rescue Teams depleted. Economic agent substituted with Medical Kit to maintain support.",
                "economics": {
                    "utilityScore": utility,
                    "scarcityCost": dynamic_cost,
                    "decision": "SUBSTITUTED",
                    "originalResource": resource_type
                }
            }
        else:
            # Depleted and no substitutes available
            action = f"Queue for {resource_type}"
            reason = f"Inventory depleted. Emergency queued. Opportunity cost to force allocation is infinite."
            return {
                "allocated": False,
                "resource": "None (Queued)",
                "action": action,
                "reason": reason,
                "economics": {
                    "utilityScore": utility,
                    "scarcityCost": dynamic_cost,
                    "decision": "QUEUED",
                    "originalResource": resource_type
                }
            }

    # 2. Resource Conservation Check
    # If the triage utility payoff is lower than the scarcity-adjusted opportunity cost,
    # the economic agent rejects the premium resource to save it for future critical emergencies,
    # attempting a cheaper substitution instead.
    if utility < dynamic_cost:
        # Example: Low priority asking for an Ambulance
        if resource_type == "AMBULANCE" and resource_pool["MEDICAL_KIT"] > 0:
            resource_pool["MEDICAL_KIT"] -= 1
            allocated_counts["MEDICAL_KIT"] += 1
            sub_id = f"MEDICAL_KIT #{allocated_counts['MEDICAL_KIT']}"
            
            return {
                "allocated": True,
                "resource": sub_id,
                "action": f"Downgraded: Dispatched {sub_id}",
                "reason": f"Ambulance conserved (opportunity cost {dynamic_cost:.1f} exceeds payoff {utility}). Substituted with Medical Kit.",
                "economics": {
                    "utilityScore": utility,
                    "scarcityCost": dynamic_cost,
                    "decision": "CONSERVED_AND_SUBSTITUTED",
                    "originalResource": resource_type
                }
            }
        elif resource_type == "RESCUE_TEAMS" and resource_pool["FOOD_PACKETS"] > 0 and priority == "LOW":
            resource_pool["FOOD_PACKETS"] -= 1
            allocated_counts["FOOD_PACKETS"] += 1
            sub_id = f"FOOD_PACKETS #{allocated_counts['FOOD_PACKETS']}"
            
            return {
                "allocated": True,
                "resource": sub_id,
                "action": f"Downgraded: Dispatched {sub_id}",
                "reason": f"Rescue Team conserved (opportunity cost {dynamic_cost:.1f} exceeds payoff {utility}). Dispatched Food Packets.",
                "economics": {
                    "utilityScore": utility,
                    "scarcityCost": dynamic_cost,
                    "decision": "CONSERVED_AND_SUBSTITUTED",
                    "originalResource": resource_type
                }
            }

    # 3. Successful Allocation Flow
    resource_pool[resource_type] -= 1
    allocated_counts[resource_type] += 1
    allocated_id = f"{resource_type} #{allocated_counts[resource_type]}"
    
    action = f"Dispatched {allocated_id}"
    reason = f"Approved allocation. Utility payoff ({utility}) matches or exceeds scarcity cost ({dynamic_cost:.1f})."
    
    return {
        "allocated": True,
        "resource": allocated_id,
        "action": action,
        "reason": reason,
        "economics": {
            "utilityScore": utility,
            "scarcityCost": dynamic_cost,
            "decision": "APPROVED",
            "originalResource": resource_type
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
