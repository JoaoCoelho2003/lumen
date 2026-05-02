import base64
import hashlib
import hmac
import secrets
from typing import Any, Dict, Optional

from jose import jwt
from jose.exceptions import JWTError


class NextAuthJWT:
    def __init__(self, secret: str):
        self.secret = secret
        self.algorithms = ["HS256"]

    def decode(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(
                token,
                self.secret,
                algorithms=self.algorithms,
                options={"verify_aud": False},
            )
        except JWTError:
            return None


_PBKDF2_ITERATIONS = 390000
_PBKDF2_ALGORITHM = "sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        _PBKDF2_ITERATIONS,
    )
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_{_PBKDF2_ALGORITHM}${_PBKDF2_ITERATIONS}${salt_b64}${digest_b64}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algorithm_part, iterations_part, salt_b64, digest_b64 = hashed_password.split("$", 3)
        if not algorithm_part.startswith("pbkdf2_"):
            return False

        algorithm = algorithm_part.removeprefix("pbkdf2_")
        iterations = int(iterations_part)
        salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
        expected_digest = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
        actual_digest = hashlib.pbkdf2_hmac(
            algorithm,
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(actual_digest, expected_digest)
    except Exception:
        return False
