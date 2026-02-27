import pytest
from fastapi import HTTPException

from app.routers import vendor_upload


class DummyProcess:
    def __init__(self, returncode: int, stdout: bytes = b"", stderr: bytes = b""):
        self.returncode = returncode
        self._stdout = stdout
        self._stderr = stderr

    async def communicate(self):
        return self._stdout, self._stderr


@pytest.mark.asyncio
async def test_scan_path_with_clamav_detects_malware(monkeypatch, tmp_path):
    file_path = tmp_path / "infected.txt"
    file_path.write_text("EICAR")
    monkeypatch.setattr(vendor_upload, "_clamav_command_args", lambda: ["clamdscan"])

    async def fake_exec(*args, **kwargs):
        return DummyProcess(1, b"FOUND", b"")

    monkeypatch.setattr(vendor_upload.asyncio, "create_subprocess_exec", fake_exec)
    with pytest.raises(HTTPException) as exc:
        await vendor_upload._scan_path_with_clamav(file_path)
    assert exc.value.status_code == 400
    assert not file_path.exists()


@pytest.mark.asyncio
async def test_scan_path_with_clamav_reports_unavailable(monkeypatch, tmp_path):
    file_path = tmp_path / "error.txt"
    file_path.write_text("test")
    monkeypatch.setattr(vendor_upload, "_clamav_command_args", lambda: ["clamdscan"])

    async def fake_exec(*args, **kwargs):
        return DummyProcess(2, b"", b"ERROR")

    monkeypatch.setattr(vendor_upload.asyncio, "create_subprocess_exec", fake_exec)
    with pytest.raises(HTTPException) as exc:
        await vendor_upload._scan_path_with_clamav(file_path)
    assert exc.value.status_code == 503
    assert not file_path.exists()
