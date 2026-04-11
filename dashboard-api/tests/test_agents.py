import pytest
from fastapi.testclient import TestClient

from dashboard_api.main import create_app


@pytest.fixture
def client(db_path):
    app = create_app(db_path)
    return TestClient(app)


def test_list_agents_by_run(client):
    resp = client.get("/api/agents?run_id=run_abc12345")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8
    agents = [a["agent"] for a in data]
    assert "brainiac" in agents
    assert "cyborg" in agents


def test_list_agents_no_run_id(client):
    resp = client.get("/api/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8


def test_get_transcript(client, db_path):
    import sqlite3
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT id FROM agent_runs LIMIT 1").fetchone()
    agent_run_id = row[0]
    conn.execute(
        """INSERT INTO agent_transcripts (agent_run_id, prompt_text, response_text,
           full_transcript, model, total_input_tokens, total_output_tokens)
           VALUES (?, 'test prompt', 'test response', 'full transcript text',
           'claude-opus-4-6', 1000, 500)""",
        (agent_run_id,),
    )
    conn.commit()
    conn.close()

    resp = client.get(f"/api/agents/{agent_run_id}/transcript")
    assert resp.status_code == 200
    data = resp.json()
    assert data["prompt_text"] == "test prompt"
    assert data["full_transcript"] == "full transcript text"


def test_get_transcript_not_found(client):
    resp = client.get("/api/agents/99999/transcript")
    assert resp.status_code == 404
