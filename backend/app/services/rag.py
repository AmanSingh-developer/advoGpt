from openai import AsyncOpenAI
from typing import List, Dict, Optional
from app.config import settings
from app.services.vector_store import vector_store
from app.services.document_processor import document_processor
from app.services.knowledge_base import INDIAN_LAW_KNOWLEDGE


class RAGService:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.knowledge_base_initialized = False

    async def initialize(self):
        if not self.knowledge_base_initialized:
            await self._load_knowledge_base()
            self.knowledge_base_initialized = True

    async def _load_knowledge_base(self):
        for i, doc in enumerate(INDIAN_LAW_KNOWLEDGE):
            await vector_store.add_document(
                text=doc["text"],
                metadata=doc["metadata"],
                doc_id=f"kb_{i}"
            )

    async def add_user_document(self, file_path: str, filename: str, user_id: str) -> Dict:
        documents = await document_processor.process_file(
            file_path=file_path,
            source_name=filename,
            doc_type="user_upload"
        )

        for doc in documents:
            doc["metadata"]["user_id"] = user_id

        await vector_store.add_documents(documents)

        return {
            "chunks": len(documents),
            "source": filename
        }

    async def search_knowledge(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        filter_dict = {"category": category} if category else None

        results = await vector_store.search(
            query=query,
            top_k=top_k,
            filter_dict=filter_dict
        )

        return results

    async def get_context(self, query: str, user_id: str = None, top_k: int = 5) -> str:
        filter_dict = {"user_id": user_id} if user_id else None

        knowledge_results = await vector_store.search(
            query=query,
            top_k=top_k,
            filter_dict=filter_dict
        )

        if not knowledge_results:
            return ""

        context_parts = []
        for result in knowledge_results:
            source = result.get("source", "Unknown")
            text = result.get("text", "")
            context_parts.append(f"[Source: {source}]\n{text}")

        return "\n\n".join(context_parts)

    async def generate_response(
        self,
        query: str,
        user_id: str = None,
        conversation_history: List[Dict] = None,
        use_rag: bool = True
    ) -> Dict:
        context = ""
        if use_rag:
            context = await self.get_context(query, user_id)

        system_prompt = """You are an expert legal advisor specializing in Indian law. 
You provide helpful, accurate, and lawful legal guidance based on Indian laws including IPC, CrPC, Indian Constitution, and various acts.
Always clarify that you are not a substitute for professional legal advice.
Cite relevant sections and acts when applicable."""

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if context:
            messages.append({
                "role": "system",
                "content": f"Relevant legal knowledge and documents:\n\n{context}"
            })

        if conversation_history:
            for msg in conversation_history[-5:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        messages.append({"role": "user", "content": query})

        response = await self.openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )

        return {
            "answer": response.choices[0].message.content,
            "sources": [r["source"] for r in await vector_store.search(query, top_k=3)] if use_rag else []
        }


rag_service = RAGService()
