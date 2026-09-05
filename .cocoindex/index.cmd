@echo off
REM Build or refresh the semantic code index for Magic T-treats.
REM
REM No Docker and no database server: the vectors live in LanceDB, which is
REM just the `index\` directory next to this file. Re-running is incremental,
REM so only changed files are re-embedded.
REM
REM   index.cmd                       refresh the index
REM   index.cmd "how are orders totalled"   refresh, then run one query

cd /d "%~dp0"

REM CocoIndex keeps its own incremental state here. It is a local file, not a
REM database URL, and it must be set or the CLI refuses to start.
set "COCOINDEX_DB=%~dp0state.db"

echo Indexing Magic T-treats...
cocoindex update main.py
if errorlevel 1 (
    echo.
    echo Indexing failed.
    exit /b 1
)

echo.
if "%~1"=="" (
    echo Done. Try: python main.py query "how are order totals calculated"
) else (
    python main.py query %*
)
