(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

  // node_modules/@yume-chan/adb-credential-web/esm/index.js
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("Tango", 1);
      request.onerror = () => {
        reject(request.error);
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("Authentication", { autoIncrement: true });
      };
      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };
    });
  }
  async function saveKey(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("Authentication", "readwrite");
      const store = transaction.objectStore("Authentication");
      const putRequest = store.add(key);
      putRequest.onerror = () => {
        reject(putRequest.error);
      };
      putRequest.onsuccess = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  async function getAllKeys() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("Authentication", "readonly");
      const store = transaction.objectStore("Authentication");
      const getRequest = store.getAll();
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  var _appName;
  var AdbWebCredentialStore = class {
    constructor(appName = "Tango") {
      __privateAdd(this, _appName);
      __privateSet(this, _appName, appName);
    }
    /**
     * Generates a RSA private key and store it into LocalStorage.
     *
     * Calling this method multiple times will overwrite the previous key.
     *
     * @returns The private key in PKCS #8 format.
     */
    async generateKey() {
      const { privateKey: cryptoKey } = await crypto.subtle.generateKey({
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        // 65537
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-1"
      }, true, ["sign", "verify"]);
      const privateKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", cryptoKey));
      await saveKey(privateKey);
      return {
        buffer: privateKey,
        name: `${__privateGet(this, _appName)}@${globalThis.location.hostname}`
      };
    }
    /**
     * Yields the stored RSA private key.
     *
     * This method returns a generator, so `for await...of...` loop should be used to read the key.
     */
    async *iterateKeys() {
      for (const key of await getAllKeys()) {
        yield {
          buffer: key,
          name: `${__privateGet(this, _appName)}@${globalThis.location.hostname}`
        };
      }
    }
  };
  _appName = new WeakMap();
})();
//# sourceMappingURL=adb-credential-web.js.map
