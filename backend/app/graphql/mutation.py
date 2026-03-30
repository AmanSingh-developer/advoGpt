import strawberry

@strawberry.type
class Mutation:
    @strawberry.mutation
    def test(self) -> str:
        return "Mutation working"