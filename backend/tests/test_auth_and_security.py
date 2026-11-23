import pytest
import uuid
from pydantic import ValidationError
from jose import jwt, JWTError

from app.auth.password import hash_password, verify_password
from app.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    SECRET_KEY,
    ALGORITHM,
)
from app.schemas.auth import UserRegister


def test_password_hashing_and_verification():
    pw = "SuperSecure123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_complexity_validation():
    """Verify password strength: requires >=8 chars, 1 uppercase, 1 digit."""
    # Valid
    reg = UserRegister(name="Alice", email="alice@test.com", password="ValidPassword1")
    assert reg.password == "ValidPassword1"

    # Missing uppercase -> Rejected
    with pytest.raises(ValidationError):
        UserRegister(name="Alice", email="alice@test.com", password="lowercaseonly123")

    # Missing digit -> Rejected
    with pytest.raises(ValidationError):
        UserRegister(name="Alice", email="alice@test.com", password="NoDigitsHere!")

    # Too short -> Rejected
    with pytest.raises(ValidationError):
        UserRegister(name="Alice", email="alice@test.com", password="Short1!")


def test_jwt_token_generation_and_decoding():
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, is_admin=True)
    payload = decode_token(token)

    assert payload["sub"] == user_id
    assert payload["is_admin"] is True
    assert payload["type"] == "access"
    assert "exp" in payload


def test_jwt_refresh_token():
    user_id = str(uuid.uuid4())
    token = create_refresh_token(user_id=user_id)
    payload = decode_token(token)

    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"


def test_jwt_tampered_token_rejection():
    """Verify that a tampered signature raises JWTError."""
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id)
    tampered_token = token[:-5] + "XXXXX"

    with pytest.raises(JWTError):
        decode_token(tampered_token)


def test_jwt_wrong_secret_rejection():
    """Verify that a token signed with an unauthorized secret is rejected."""
    payload = {"sub": str(uuid.uuid4()), "type": "access"}
    fake_token = jwt.encode(payload, "unauthorized-secret-key-123456789", algorithm=ALGORITHM)

    with pytest.raises(JWTError):
        decode_token(fake_token)
