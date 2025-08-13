// OPFS driver for localForage.

function _getKeyPrefix(options, defaultConfig) {
    let keyPrefix = options.name + '/';
    if (options.storeName !== defaultConfig.storeName) {
        keyPrefix += options.storeName + '/';
    }
    return keyPrefix;
}

function _normalizeKey(key) {
  if (typeof key !== 'string') {
    console.warn(`${key} used as a key, but it is not a string.`);
    return String(key);
  }
  return key;
}

function _splitPath(path) {
  return path.split('/').filter(e => e !== '');
}

async function _openDir(path, options={}) {
  let dir = await navigator.storage.getDirectory();
  for (const entry of _splitPath(path)) {
    dir = await dir.getDirectoryHandle(entry, options);
  }
  return dir;
}

async function _mkdirAll(path) {
  return _openDir(path, { create: true })
}

async function _openDirBase(path, options={}) {
  let dir = await navigator.storage.getDirectory();
  const entries = _splitPath(path);
  for (const entry of entries.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(entry, options);
  }
  const base = entries[entries.length - 1];
  return { dir, base };
}

async function _openFile(path, options={}) {
  const { dir, base } = await _openDirBase(path, options);
  return dir.getFileHandle(base, options);
}

async function _walkDir(dir, dirPath, iter) {
  for await (const [name, handle] of dir.entries()) {
    const path = dirPath === '' ? name : dirPath + '/' + name;
    let value;
    if (handle instanceof FileSystemDirectoryHandle) {
      value = await _walkDir(handle, path, iter);
    } else {
      value = await iter(handle, path);
    }
    if (value !== void 0) {
      return value;
    }
  }
}

// Types to be supported:
//
// - Array
// - ArrayBuffer
// - Blob
// - Float32Array
// - Float64Array
// - Int8Array
// - Int16Array
// - Int32Array
// - Number
// - Object
// - Uint8Array
// - Uint8ClampedArray
// - Uint16Array
// - Uint32Array
// - String

async function _serialize(value) {
  // TODO: serialize value;
  return value;
}

async function _deserialize(blob) {
  // TODO: serialize value;
  return blob.text();
}

async function _initStorage(options) {
  await _support();
  let dbInfo = {};
  if (options) {
    for (let i in options) {
      dbInfo[i] = options[i];
    }
  }
  dbInfo.pathPrefix = _getKeyPrefix(options, this._defaultConfig);
  this._dbInfo = dbInfo;
  // create directories for pathPrefix
  await _mkdirAll(dbInfo.pathPrefix);
  return;
}

async function _support() {
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch (err) {
    console.error('OPFS is not available', err)
    throw err;
  }
}

async function iterate(iterator, callback) {
  try {
    await this.ready();
    const dir = await _openDir(this._dbInfo.pathPrefix);
    let iterationNumber = 1;
    const value = await _walkDir(dir, '', async (fileHandle, path) => {
      const file = await fileHandle.getFile();
      const value = await _deserialize(file);
      return await iterator(value, path, iterationNumber++);
    });
    if (callback) {
      callback(null, value);
    }
    return value;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function getItem(key, callback) {
  try {
    await this.ready();
    const path = this._dbInfo.pathPrefix + _normalizeKey(key);
    const handle = await _openFile(path);
    const file = await handle.getFile();
    const value = await _deserialize(file);
    if (callback) {
      callback(null, value);
    }
    return value;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function setItem(key, value, callback) {
  if (value === undefined) {
    value = null;
  }
  try {
    await this.ready();
    const path = this._dbInfo.pathPrefix + _normalizeKey(key);
    const handle = await _openFile(path, { create: true });
    const writable = await handle.createWritable()
    await writable.write(await _serialize(value));
    await writable.close();
    if (callback) {
      callback(null, value);
    }
    return value;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function removeItem(key, callback) {
  try {
    await this.ready();
    const path = this._dbInfo.pathPrefix + _normalizeKey(key);
    const { dir, base } = await _openDirBase(path);
    await dir.removeEntry(base);
    if (callback) {
      callback(null, undefined);
    }
    return;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function clear(callback) {
  try {
    await this.ready();
    const path = this._dbInfo.pathPrefix;
    const dir = await _openDir(path);
    for await (const [name, handle] of dir.entries()) {
      await dir.removeEntry(name, { recursive: true });
    }
    if (callback) {
      callback(null, undefined);
    }
    return;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function length(callback) {
  try {
    await this.ready();
    const dir = await _openDir(this._dbInfo.pathPrefix);
    let count = 0;
    const value = await _walkDir(dir, '', (fileHandle, path) => {
      count++;
    });
    if (callback) {
      callback(null, count);
    }
    return count;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function key(n, callback) {
  try {
    await this.ready();
    const dir = await _openDir(this._dbInfo.pathPrefix);
    let value = await _walkDir(dir, '', async (fileHandle, path) => {
      if (n == 0) {
        return path;
      }
      n--;
      return;
    });
    if (value === void 0) {
      value = null;
    }
    if (callback) {
      callback(null, value);
    }
    return value;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function keys(callback) {
  try {
    await this.ready();
    const keys = [];
    const dir = await _openDir(this._dbInfo.pathPrefix);
    const value = await _walkDir(dir, '', (fileHandle, path) => {
      keys.push(path);
    })
    if (callback) {
      callback(null, keys);
    }
    return keys;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
}

async function dropInstance(options, callback) {
  options = (typeof options !== 'function' && options) || {};
  if (!options.name) {
    const currentConfig = this.config();
    options.name = options.name || currentConfig.name;
    options.storeName = options.storeName || currentConfig.storeName;
  }

  try {
    if (!options.name) {
      throw new Error('Invalid arguments');
    }
    const path = (!options.storeName) ? `${options.name}` : _getKeyPrefix(options, this._defaultConfig);
    if (_splitPath(path).length > 0) {
      const { dir, base } = await _openDirBase(path);
      await dir.removeEntry(base, { recursive: true });
    } else {
      // Remove all root entries.
      const dir = await navigator.storage.getDirectory();
      for await (const [name, handle] of dir.entries()) {
        await dir.removeEntry(name, { recursive: true });
      }
    }
    if (callback) {
      callback(null, undefined);
    }
    return path;
  } catch (err) {
    if (callback) {
      callback(err)
    }
    throw err;
  }
}

const opfsDriver = {
  _driver: 'opfsDriver',
  _initStorage: _initStorage,
  _support: await _support(),
  iterate: iterate,
  getItem: getItem,
  setItem: setItem,
  removeItem: removeItem,
  clear: clear,
  length: length,
  key: key,
  keys: keys,
  dropInstance: dropInstance
};

export default opfsDriver;
