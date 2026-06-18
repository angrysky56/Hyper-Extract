"""UI command for Hyper-Extract CLI."""

import time
import webbrowser
import threading
from typing import Optional
import typer
from rich.console import Console

from hyperextract.utils.logging import get_logger

logger = get_logger("he.ui")
console = Console()


def open_browser_after_delay(url: str, delay: float = 1.0) -> None:
    """Open default browser to the UI URL after a short delay."""
    time.sleep(delay)
    try:
        console.print(f"[dim]Opening browser to {url}...[/dim]")
        webbrowser.open(url)
    except Exception as e:
        console.print(f"[yellow]Warning: Failed to auto-open browser: {e}[/yellow]")
        console.print(f"[bold]Please open browser manually at: {url}[/bold]")


def start_ui_server(
    port: int = 8000,
    host: str = "127.0.0.1",
    open_browser: bool = True,
):
    """Start the Hyper-Extract Web UI server."""
    import uvicorn
    from hyperextract.ui.server import app

    url = f"http://{host}:{port}"

    console.print()
    console.print("[bold cyan]==================================================[/bold cyan]")
    console.print("[bold cyan]         Hyper-Extract Professional Web UI       [/bold cyan]")
    console.print("[bold cyan]==================================================[/bold cyan]")
    console.print()
    console.print(f"  [green]Backend API Server:[/green]  {url}/api")
    console.print(f"  [green]Web Interface URL:[/green]  {url}")
    console.print()
    console.print("[dim]Press Ctrl+C to stop the server[/dim]")
    console.print()

    if open_browser:
        # Start browser opener thread
        thread = threading.Thread(target=open_browser_after_delay, args=(url, 1.2))
        thread.daemon = True
        thread.start()

    # Disable default access logging of uvicorn to keep logs clean
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=False,
    )
