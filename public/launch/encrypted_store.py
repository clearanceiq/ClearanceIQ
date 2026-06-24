"""
Encrypted storage module for JSON dicts using Fernet symmetric encryption.

This module provides save/load capabilities for encrypted JSON dictionaries
stored on disk. It handles directory creation and key management.

Dependencies: cryptography>=3.0 (fernet)
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, Union

try:
    from cryptography.fernet import Fernet
except ImportError as e:
    raise ImportError(
        "cryptography package is required. Install with: pip install cryptography"
    ) from e


class EncryptedStore:
    """
    Manager for encrypted JSON file storage using Fernet.

    Attributes:
        store_dir (Path): Base directory for encrypted files.
        key_path (Path): Path to the Fernet key file.
    """

    def __init__(self, key_path: Optional[str] = None, store_dir: Optional[str] = None) -> None:
        """
        Initialize the encrypted store.

        Args:
            key_path: Path to the Fernet key file. Defaults to %USERPROFILE%\.keys\master.key.
            store_dir: Directory for encrypted files. Defaults to C:/Users/Najmi/data/sealed/.
        """
        if key_path is None:
            key_path = os.path.join(os.environ.get('USERPROFILE', os.getcwd()), '.keys', 'master.key')
        if store_dir is None:
            store_dir = Path('C:/Users/Najmi/data/sealed')

        self.key_path = Path(key_path)
        self.store_dir = Path(store_dir)

        # Ensure store directory exists
        self.store_dir.mkdir(parents=True, exist_ok=True)

        # Ensure key directory exists
        self.key_path.parent.mkdir(parents=True, exist_ok=True)

        # Load or generate the Fernet key
        self._key = self._load_or_generate_key()
        self._fernet = Fernet(self._key)

    def _load_or_generate_key(self) -> bytes:
        """
        Load the Fernet key from disk, or generate a new one if missing.

        Returns:
            bytes: The Fernet key bytes.
        """
        if self.key_path.exists():
            return self.key_path.read_bytes()
        else:
            # Generate a new key and persist it
            new_key = Fernet.generate_key()
            self.key_path.write_bytes(new_key)
            return new_key

    def _file_path(self, name: str) -> Path:
        """
        Build the full file path for a given record name.

        Args:
            name: Identifier for the encrypted record.

        Returns:
            Path: Full path to the encrypted file.
        """
        safe_name = f"{name}.enc"
        return self.store_dir / safe_name

    def save(self, name: str, data: Dict) -> None:
        """
        Encrypt and save a dictionary to disk.

        Args:
            name: Identifier for the record.
            data: Dictionary to encrypt and store.
        """
        serialized = json.dumps(data, sort_keys=True).encode('utf-8')
        encrypted = self._fernet.encrypt(serialized)
        target = self._file_path(name)
        target.write_bytes(encrypted)

    def load(self, name: str) -> Optional[Dict]:
        """
        Load and decrypt a dictionary from disk.

        Args:
            name: Identifier for the record.

        Returns:
            Decrypted dictionary, or None if the record does not exist.
        """
        target = self._file_path(name)
        if not target.exists():
            return None
        try:
            encrypted = target.read_bytes()
            decrypted = self._fernet.decrypt(encrypted)
            return json.loads(decrypted.decode('utf-8'))
        except Exception:
            # If decryption fails (bad key, corrupted data), return None
            return None
