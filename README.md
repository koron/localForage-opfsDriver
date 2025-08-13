# OPFS Driver for localForage

[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) Driver for [localForage](https://github.com/localForage/localForage).

Usage:

```javascript
import opfsDriver from './opfsdriver.js';

await localForage.defineDriver(opfsDriver);
localforage.config({ driver: 'opfsDriver' });
```
