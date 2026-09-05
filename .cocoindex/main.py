"""
Semantic code index for Magic T-treats.

    .cocoindex\\index.cmd              build or refresh the index
    python main.py query "rate limit"  search it

WHY LANCEDB AND NOT POSTGRES

The sibling index in `python-projects/migration` stores vectors in Postgres +
pgvector, run from Docker. Neither is available on this machine: Docker is not
installed at all, and the native PostgreSQL 17 service has no pgvector and no
credentials on file. LanceDB is embedded — it is a directory, not a server — so
the index has no infrastructure to install, start or keep running.

The index lives in `.cocoindex/index/` and is git-ignored. It is derived data:
delete it and re-run to rebuild.

WHAT IS INDEXED

Source, SQL and prose: `src/`, `supabase/`, `scripts/` and the Markdown at the
repo root. Not `public/` (photographs and video), `node_modules`, `.next` or
`out` — none of which anyone searches by meaning, and all of which would bloat
the index by orders of magnitude.
"""

from __future__ import annotations

import asyncio
import pathlib
import sys
from dataclasses import dataclass
from typing import Annotated, AsyncIterator

from numpy.typing import NDArray

import cocoindex as coco
from cocoindex.connectors import lancedb, localfs
from cocoindex.ops.sentence_transformers import SentenceTransformerEmbedder
from cocoindex.ops.text import RecursiveSplitter, detect_code_language
from cocoindex.resources.chunk import Chunk
from cocoindex.resources.file import FileLike, PatternFilePathMatcher
from cocoindex.resources.id import IdGenerator

HERE = pathlib.Path(__file__).resolve().parent
PROJECT_DIR = HERE.parent
DB_URI = str(HERE / "index")
TABLE_NAME = "magic_t_treats_code"
TOP_K = 8
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

DB = coco.ContextKey[lancedb.LanceAsyncConnection]("magic_t_treats_db")
EMBEDDER = coco.ContextKey[SentenceTransformerEmbedder]("embedder", detect_change=True)
SPLITTER = RecursiveSplitter()


@dataclass
class CodeChunk:
    id: int
    filename: str
    code: str
    embedding: Annotated[NDArray, EMBEDDER]
    start_line: int
    end_line: int


@coco.lifespan
async def coco_lifespan(builder: coco.EnvironmentBuilder) -> AsyncIterator[None]:
    connection = await lancedb.connect_async(DB_URI)
    builder.provide(DB, connection)
    builder.provide(EMBEDDER, SentenceTransformerEmbedder(EMBED_MODEL))
    yield


@coco.fn
async def process_chunk(
    chunk: Chunk,
    filename: pathlib.PurePath,
    id_gen: IdGenerator,
    table: lancedb.TableTarget[CodeChunk],
) -> None:
    embedding = await coco.use_context(EMBEDDER).embed(chunk.text)
    table.declare_row(
        row=CodeChunk(
            id=await id_gen.next_id(chunk.text),
            filename=str(filename),
            code=chunk.text,
            embedding=embedding,
            start_line=chunk.start.line,
            end_line=chunk.end.line,
        ),
    )


@coco.fn(memo=True)
async def process_file(
    file: FileLike,
    table: lancedb.TableTarget[CodeChunk],
) -> None:
    text = await file.read_text()
    language = detect_code_language(filename=str(file.file_path.path.name))
    chunks = SPLITTER.split(
        text,
        chunk_size=1000,
        min_chunk_size=300,
        chunk_overlap=200,
        language=language,
    )
    id_gen = IdGenerator()
    await coco.map(process_chunk, chunks, file.file_path.path, id_gen, table)


@coco.fn
async def app_main(sourcedir: pathlib.Path) -> None:
    target_table = await lancedb.mount_table_target(
        DB,
        table_name=TABLE_NAME,
        table_schema=await lancedb.TableSchema.from_class(
            CodeChunk, primary_key=["id"]
        ),
    )

    files = localfs.walk_dir(
        sourcedir,
        recursive=True,
        path_matcher=PatternFilePathMatcher(
            included_patterns=[
                "**/*.ts", "**/*.tsx",
                "**/*.mjs", "**/*.js",
                "**/*.sql",
                "**/*.css",
                "*.md", "**/*.md",
            ],
            excluded_patterns=[
                # Dependencies and build output: enormous, and not ours.
                "**/node_modules/**",
                "**/.next/**",
                "**/out/**",
                "**/.git/**",
                "**/.cocoindex/**",
                # Binary media. Nobody searches a photograph by meaning.
                "**/public/**",
                "**/.fold-shots/**",
                # Generated or lock files: noise that crowds out real matches.
                "**/package-lock.json",
                "**/next-env.d.ts",
            ],
        ),
    )
    await coco.mount_each(process_file, files.items(), target_table)


app = coco.App(
    coco.AppConfig(name="magic_t_treats_index"),
    app_main,
    sourcedir=PROJECT_DIR,
)


# --- query ------------------------------------------------------------------


def relative_filename(filename: str) -> str:
    """Absolute paths are unreadable in results; show them repo-relative."""
    try:
        return pathlib.Path(filename).resolve().relative_to(PROJECT_DIR).as_posix()
    except Exception:
        return filename


async def query_once(table, embedder: SentenceTransformerEmbedder, q: str, top_k: int = TOP_K) -> None:
    qv = await embedder.embed(q)
    # `AsyncTable.search` is itself a coroutine, so it has to be awaited before
    # the builder methods exist. Chaining straight off it yields a coroutine.
    search = await table.search(qv)
    rows = await search.limit(top_k).to_list()

    if not rows:
        print("  no matches — has the index been built?")
        return

    for row in rows:
        # LanceDB returns L2 distance in `_distance`; smaller is closer.
        distance = float(row.get("_distance", 0.0))
        rel = relative_filename(row["filename"])
        print(f"\n[{distance:.3f}] {rel} (L{row['start_line']}-L{row['end_line']})")
        print("-" * 78)
        code = row["code"]
        print(code[:500] + ("..." if len(code) > 500 else ""))


async def query() -> None:
    embedder = SentenceTransformerEmbedder(EMBED_MODEL)
    connection = await lancedb.connect_async(DB_URI)
    table = await connection.open_table(TABLE_NAME)

    if len(sys.argv) > 2:
        await query_once(table, embedder, " ".join(sys.argv[2:]))
        return

    while True:
        q = input("\nQuery (empty to quit): ").strip()
        if not q:
            break
        await query_once(table, embedder, q)


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "query":
    asyncio.run(query())
