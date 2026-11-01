"""Default WhatsApp message wording (English and Tamil). {name} {plan} {date} {amount} {gym} are filled per member."""

TEMPLATES = {
    "en": {
        "renewal": (
            "Hi {name}, your {plan} membership at {gym} ends on {date}.\n"
            "Renew before then to keep training without a break.\n"
            "Reply here or visit the front desk to renew."
        ),
        "fee": (
            "Hi {name}, a balance of ₹{amount} is pending for your {plan} plan at {gym}.\n"
            "Please pay at the desk or by UPI.\nThank you!"
        ),
        "expired": (
            "Hi {name}, your {plan} membership at {gym} ended on {date}.\n"
            "We miss you! Renew this week and get back on track."
        ),
        "welcome": (
            "Welcome to {gym}, {name}! 💪\nYour {plan} membership is active till {date}.\n"
            "See you at the gym!"
        ),
        "receipt": "Hi {name}, we received ₹{amount} for your {plan} plan at {gym}. Thank you!",
    },
    "ta": {
        "renewal": (
            "வணக்கம் {name}, {gym}-ல் உங்கள் {plan} உறுப்பினர் காலம் {date} அன்று முடிகிறது.\n"
            "இடைவெளி இல்லாமல் பயிற்சியைத் தொடர, அதற்கு முன் புதுப்பித்துக் கொள்ளுங்கள்."
        ),
        "fee": (
            "வணக்கம் {name}, உங்கள் {plan} திட்டத்திற்கு ₹{amount} நிலுவையில் உள்ளது.\n"
            "தயவுசெய்து கவுண்டரில் அல்லது UPI மூலம் செலுத்தவும். நன்றி!"
        ),
        "expired": (
            "வணக்கம் {name}, {gym}-ல் உங்கள் {plan} உறுப்பினர் காலம் {date} அன்று முடிந்தது.\n"
            "இந்த வாரம் புதுப்பித்து மீண்டும் பயிற்சியைத் தொடங்குங்கள்!"
        ),
        "welcome": (
            "வணக்கம் {name}, {gym}-க்கு வரவேற்கிறோம்! 💪\nஉங்கள் {plan} உறுப்பினர் காலம் {date} வரை உள்ளது."
        ),
        "receipt": "வணக்கம் {name}, உங்கள் {plan} திட்டத்திற்கு ₹{amount} பெற்றோம். நன்றி!",
    },
}
