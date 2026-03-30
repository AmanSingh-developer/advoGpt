import strawberry
from app.graphql.types.auth import AuthPayload, LoginInput, SignupInput, UserType, MessageResponse
from app.database import get_db
from sqlalchemy import select
from app.models import User
from app.utils import hash_password, verify_password, create_access_token
from sqlalchemy.exc import IntegrityError


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(self, input: SignupInput) -> AuthPayload:
        try:
            async for db in get_db():
                existing_user = await db.execute(
                    select(User).where(User.email == input.email)
                )
                if existing_user.scalar_one_or_none():
                    raise Exception("Email already registered")

                password_hash = hash_password(input.password)

                new_user = User(
                    email=input.email,
                    password=password_hash,
                    first_name=input.first_name,
                    last_name=input.last_name,
                    role_type="user",
                )

                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)

                token = create_access_token(str(new_user.id), new_user.email)

                return AuthPayload(
                    token=token,
                    user=UserType(
                        id=new_user.id,
                        email=new_user.email,
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        role_type=new_user.role_type,
                    ),
                )
        except IntegrityError:
            raise Exception("Email already registered")
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def login(self, input: LoginInput) -> AuthPayload:
        try:
            async for db in get_db():
                result = await db.execute(
                    select(User).where(User.email == input.email)
                )
                user = result.scalar_one_or_none()

                if not user:
                    raise Exception("Invalid email or password")

                if not verify_password(input.password, user.password):
                    raise Exception("Invalid email or password")

                token = create_access_token(str(user.id), user.email)

                return AuthPayload(
                    token=token,
                    user=UserType(
                        id=user.id,
                        email=user.email,
                        first_name=user.first_name,
                        last_name=user.last_name,
                        role_type=user.role_type,
                    ),
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def logout(self) -> MessageResponse:
        return MessageResponse(success=True, message="Logged out successfully")
