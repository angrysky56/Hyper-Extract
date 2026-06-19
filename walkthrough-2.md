# UI Data Ingestion Improvements

The Hyper-Extract Web UI has been updated to support much more intuitive and powerful data ingestion! You can now effortlessly import local files and whole directories instead of having to paste massive text blobs.

### UI Frontend Updates
- **Path-Based Submission:** Added a "Local File or Directory Path" toggle in the extraction form.
- **Form State Adjustments:** Replaced raw `textarea` strings with dynamic toggling between `input_text` and `input_path` via React hooks.
- **Agent Configuration Panel:** Added a new configuration card in the System Configuration tab to manage the Autonomous Agent Model settings (Provider, Model Name, API Key, Base URL).

### System Configuration Updates
- **Dual Model Architecture:** Extended the configuration manager to support three distinct model endpoints: LLM (for extraction), Embedder (for vectors), and Agent (for reasoning and autonomous processing).
- **CLI Commands:** Added `he config agent` to configure agent settings via the command line.
- **Client Factory:** Added `get_agent_client` utility in `hyperextract/utils/client.py` to seamlessly spawn the configured agent.
- **Defaults:** Configured the default agent model to use OpenRouter's `meta-llama/llama-3-8b-instruct:free`.

## Verification Results

### Testing
- `test_client.py` executed successfully across all 35 tests, verifying that the dynamic client factory supports the new agent configuration schema without breaking LLM or Embedder generation logic.

### User Interface Check
- UI assets compiled correctly (`npm run build`).
- Agent Configuration tab appears correctly in the dashboard alongside the LLM and Embedder configurations.
- Config endpoints (`/api/config/agent`) respond correctly.

2. **Feed Knowledge Abstract Updates:**
   The Incremental Feed feature now explicitly prompts you to choose between using a Local Path or pasting Text, routing to the appropriate data ingestion endpoint.

3. **Backend Support for Native Paths:**
   Updated the FastAPI `ParseRequest` and `FeedRequest` schemas to accept `input_path` dynamically alongside `input_text`. Implemented an extraction handler in `server.py` to seamlessly read user-specified files directly off the local disk, keeping memory overhead low.

> [!IMPORTANT]
> Because backend API logic was modified, you will need to **restart your running `he ui` terminal process** for the backend to recognize the new `input_path` endpoint fields. Once restarted, reload your browser and enjoy the new direct-path ingestion!
