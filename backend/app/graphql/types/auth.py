import strawberry
from typing import Optional
import uuid


@strawberry.type
class UserType:
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role_type: str


@strawberry.type
class AuthPayload:
    token: str
    user: UserType


@strawberry.type
class MessageResponse:
    success: bool
    message: str


@strawberry.input
class LoginInput:
    email: str
    password: str


@strawberry.input
class SignupInput:
    email: str
    password: str
    first_name: str
    last_name: str
