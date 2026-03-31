from pinecone import Pinecone, ServerlessSpec
from openai import AsyncOpenAI
from app.config import settings


class VectorStore:
    def __init__(self):
        self.client = None
        self.index = None
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def initialize(self):
        pinecone_api_key = settings.PINECONE_API_KEY
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not configured")

        self.client = Pinecone(api_key=pinecone_api_key)

        index_name = settings.PINECONE_INDEX

        if index_name not in self.client.list_indexes().names():
            self.client.create_index(
                index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=settings.PINECONE_CLOUD,
                    region=settings.PINECONE_REGION
                )
            )

        self.index = self.client.Index(index_name)
        return self.index

    async def get_embedding(self, text: str) -> list[float]:
        response = await self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding

    async def add_document(self, text: str, metadata: dict, doc_id: str = None):
        if not self.index:
            await self.initialize()

        if not doc_id:
            import uuid
            doc_id = str(uuid.uuid4())

        embedding = await self.get_embedding(text)

        self.index.upsert([
            {
                "id": doc_id,
                "values": embedding,
                "metadata": metadata
            }
        ])
        return doc_id

    async def add_documents(self, documents: list[dict]):
        if not self.index:
            await self.initialize()

        import uuid
        vectors = []

        for doc in documents:
            embedding = await self.get_embedding(doc["text"])
            vectors.append({
                "id": doc.get("id", str(uuid.uuid4())),
                "values": embedding,
                "metadata": doc.get("metadata", {})
            })

        if vectors:
            self.index.upsert(vectors)

    async def search(self, query: str, top_k: int = 5, namespace: str = None, filter_dict: dict = None) -> list[dict]:
        if not self.index:
            await self.initialize()

        query_embedding = await self.get_embedding(query)

        search_params = {
            "vector": query_embedding,
            "top_k": top_k,
            "include_metadata": True
        }

        if namespace:
            search_params["namespace"] = namespace
        if filter_dict:
            search_params["filter"] = filter_dict

        results = self.index.query(**search_params)

        return [
            {
                "id": match["id"],
                "score": match["score"],
                "text": match["metadata"].get("text", ""),
                "source": match["metadata"].get("source", ""),
                "metadata": match["metadata"]
            }
            for match in results.get("matches", [])
        ]

    async def delete(self, doc_id: str, namespace: str = None):
        if not self.index:
            await self.initialize()

        self.index.delete(ids=[doc_id], namespace=namespace)

    async def delete_all(self, namespace: str = None):
        if not self.index:
            await self.initialize()

        self.index.delete(delete_all=True, namespace=namespace)


vector_store = VectorStore()
