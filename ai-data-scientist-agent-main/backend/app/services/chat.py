from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.core.config import get_settings
from app.services.storage import storage_service


class DatasetChatService:
    def _vectorstore_dir(self, dataset_id: str) -> Path:
        path = storage_service.artifact_path(dataset_id) / "vectorstore"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _dataset_documents(self, dataframe: pd.DataFrame) -> list[Document]:
        documents: list[Document] = []
        profile_lines = [
            f"Columns: {', '.join(dataframe.columns)}",
            f"Rows: {len(dataframe)}",
        ]
        numeric_columns = dataframe.select_dtypes(include="number").columns.tolist()
        if numeric_columns:
            describe = dataframe[numeric_columns].describe().round(3)
            profile_lines.append("Numeric summary:")
            profile_lines.extend(describe.to_string().splitlines())
        documents.append(Document(page_content="\n".join(profile_lines), metadata={"source": "dataset_profile"}))

        for row_index, row in dataframe.head(250).iterrows():
            row_text = "\n".join([f"{column}: {row[column]}" for column in dataframe.columns])
            documents.append(
                Document(
                    page_content=f"Row {row_index}\n{row_text}",
                    metadata={"source": f"row_{row_index}"},
                )
            )
        return documents

    def _load_or_create_vectorstore(self, dataset_id: str, dataframe: pd.DataFrame, embeddings: OpenAIEmbeddings) -> FAISS:
        vectorstore_dir = self._vectorstore_dir(dataset_id)
        index_file = vectorstore_dir / "index.faiss"
        if index_file.exists():
            return FAISS.load_local(
                str(vectorstore_dir),
                embeddings,
                allow_dangerous_deserialization=True,
            )

        documents = self._dataset_documents(dataframe)
        vectorstore = FAISS.from_documents(documents, embeddings)
        vectorstore.save_local(str(vectorstore_dir))
        return vectorstore

    def answer(self, dataset_id: str, question: str) -> dict[str, Any]:
        settings = get_settings()
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured on the backend")

        dataframe = storage_service.load_dataframe(dataset_id)
        embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
        vectorstore = self._load_or_create_vectorstore(dataset_id, dataframe, embeddings)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.1,
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You answer questions about an uploaded tabular dataset. Use only the retrieved context. If the answer is unavailable, say so clearly.",
                ),
                (
                    "human",
                    "Question: {input}\n\nRetrieved dataset context:\n{context}",
                ),
            ]
        )

        document_chain = create_stuff_documents_chain(llm, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        result = retrieval_chain.invoke({"input": question})
        context_documents = result.get("context", [])
        sources = [doc.metadata.get("source", "dataset") for doc in context_documents]

        return {
            "dataset_id": dataset_id,
            "answer": result["answer"],
            "sources": sources,
        }


chat_service = DatasetChatService()
