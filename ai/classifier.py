import re

CATEGORIES = ["MEDICAL", "FOOD", "SHELTER", "MISSING_PERSON", "SAFETY"]
PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
RESOURCES = {
    "MEDICAL": {"CRITICAL": "AMBULANCE", "HIGH": "AMBULANCE", "MEDIUM": "MEDICAL_KIT", "LOW": "MEDICAL_KIT"},
    "FOOD": {"CRITICAL": "FOOD_PACKETS", "HIGH": "FOOD_PACKETS", "MEDIUM": "FOOD_PACKETS", "LOW": "FOOD_PACKETS"},
    "SHELTER": {"CRITICAL": "SHELTER_SPACE", "HIGH": "SHELTER_SPACE", "MEDIUM": "SHELTER_SPACE", "LOW": "SHELTER_SPACE"},
    "MISSING_PERSON": {"CRITICAL": "RESCUE_TEAMS", "HIGH": "RESCUE_TEAMS", "MEDIUM": "RESCUE_TEAMS", "LOW": "RESCUE_TEAMS"},
    "SAFETY": {"CRITICAL": "RESCUE_TEAMS", "HIGH": "RESCUE_TEAMS", "MEDIUM": "RESCUE_TEAMS", "LOW": "RESCUE_TEAMS"}
}

def classify_emergency(text: str) -> dict:
    text_lower = text.lower()
    
    # Category matches (count keyword occurrences)
    keywords = {
        "MEDICAL": ["bleed", "bleeding", "doctor", "hospital", "wound", "injured", "injury", "broken", "pain", "heart", "breath", "breathing", "medic", "ambulance", "cut", "blood", "medical", "doctor"],
        "FOOD": ["food", "water", "hungry", "starve", "starving", "dehydrated", "dehydration", "drink", "ration", "rations", "supplies", "eat", "meal"],
        "SHELTER": ["shelter", "house", "storm", "cold", "freezing", "roof", "sleeping", "stay", "home", "building", "weather"],
        "MISSING_PERSON": ["child", "lost", "missing", "find", "husband", "wife", "kid", "kids", "family", "search", "trapped", "rubble", "collapse"],
        "SAFETY": ["fire", "smoke", "flood", "thief", "looting", "collapse", "danger", "hazard", "threat", "alert", "warning", "police", "security"]
    }
    
    category_scores = {cat: 0 for cat in CATEGORIES}
    for cat, kw_list in keywords.items():
        for kw in kw_list:
            matches = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
            category_scores[cat] += matches
            
    # Choose category with highest match score
    max_cat = max(category_scores, key=category_scores.get)
    if category_scores[max_cat] == 0:
        if "help" in text_lower or "please" in text_lower:
            max_cat = "MEDICAL"
        else:
            # Substring matches search as a fallback
            sub_scores = {cat: 0 for cat in CATEGORIES}
            for cat, kw_list in keywords.items():
                for kw in kw_list:
                    if kw in text_lower:
                        sub_scores[cat] += 1
            max_sub_cat = max(sub_scores, key=sub_scores.get)
            if sub_scores[max_sub_cat] > 0:
                max_cat = max_sub_cat
            else:
                max_cat = "MEDICAL" # Default fallback

    # Priority matches
    critical_triggers = [
        "bleed badly", "bleeding badly", "bleeding heavily", "unconscious", "not breathing",
        "heart attack", "trapped under", "rubble", "drowning", "trapped in fire", "dying", "critical"
    ]
    high_triggers = [
        "injured", "broken bone", "severe pain", "no water", "freezing", "looting", "fire",
        "bleeding", "severe", "hurt", "danger"
    ]
    medium_triggers = [
        "need food", "need water", "need shelter", "lost", "missing", "supplies", "hungry"
    ]
    
    priority = "LOW"
    reason = "Standard priority emergency request."
    
    if any(trigger in text_lower for trigger in critical_triggers):
        priority = "CRITICAL"
        reason = "Message contains life-threatening or immediate critical keywords."
    elif any(trigger in text_lower for trigger in high_triggers):
        priority = "HIGH"
        reason = "Message indicates severe injury, immediate safety risks, or exposure issues."
    elif any(trigger in text_lower for trigger in medium_triggers):
        priority = "MEDIUM"
        reason = "Message requests basic survival provisions (food, shelter) or missing person search."
    elif "small food problem" in text_lower or "scratched" in text_lower or "low" in text_lower:
        priority = "LOW"
        reason = "Message indicates a minor or non-urgent issue."
    else:
        # Fallback keyword logic
        if max_cat == "MEDICAL":
            priority = "HIGH"
            reason = "Classified as MEDICAL category, treated as high priority by default."
        elif max_cat in ["SHELTER", "SAFETY"]:
            priority = "MEDIUM"
            reason = f"Classified as {max_cat}, requiring timely but non-critical intervention."
        else:
            priority = "LOW"
            reason = "Standard request, no high-priority keywords detected."

    resource = RESOURCES[max_cat][priority]
    
    return {
        "category": max_cat,
        "priority": priority,
        "resourceNeeded": resource,
        "reason": reason
    }
