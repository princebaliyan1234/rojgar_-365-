def validate_price(price: float, floor: float, ceiling: float) -> str | None:
    """
    Returns a warning message if price is outside the union's band,
    otherwise returns None.
    """
    # your logic here
    if price>ceiling:
        return f"Price is above the union's ceiling of ₹{ceiling} "

    if price<floor:
        return f"Price is below the union's Floor of ₹{floor}"
    return None
if __name__ =="__main__":
    print(validate_price(850,700,950)) #no warning 

    print(validate_price(1000,700,950)) #ceiling warning

    print(validate_price(650,700,950)) #floor warning