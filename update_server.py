import re

with open("hyperextract/ui/server.py", "r") as f:
    content = f.read()

# Add AgentRequest model
if "class AgentRequest(BaseModel):" not in content:
    model_str = """class TalkRequest(BaseModel):
    path: str
    query: str
    top_k: int = 3

class AgentRequest(BaseModel):
    query: str
    history: list[dict] = []
"""
    content = content.replace("class TalkRequest(BaseModel):\n    path: str\n    query: str\n    top_k: int = 3\n", model_str)

# Add Agent Chat API
if "@app.post(\"/api/agent/talk\")" not in content:
    api_str = """
@app.post("/api/agent/talk")
def talk_agent(req: AgentRequest):
    \"\"\"Run Agent chat.\"\"\"
    try:
        from hyperextract.utils.client import get_agent_client
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
        
        agent_client = get_agent_client()
        if not agent_client:
            raise HTTPException(status_code=400, detail="Agent is not configured.")
            
        messages = [SystemMessage(content="You are the Hyper-Extract Autonomous Agent. You help the user orchestrate knowledge extraction tasks and interact with the data.")]
        for msg in req.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
                
        messages.append(HumanMessage(content=req.query))
        
        response = agent_client.invoke(messages)
        
        return {
            "answer": response.content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# ==================== Static Files Mount ====================
"""
    content = content.replace("# ==================== Static Files Mount ====================\n", api_str)

with open("hyperextract/ui/server.py", "w") as f:
    f.write(content)

