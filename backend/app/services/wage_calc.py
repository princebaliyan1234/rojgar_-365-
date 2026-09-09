from app.models import Booking, WorkerProfile


def calculate_wage(booking: Booking, profile: WorkerProfile) -> float:
    if booking.type == "custom_offer":
        return booking.price

    # standard gig — flat day-rate, same amount per completed day
    return profile.price