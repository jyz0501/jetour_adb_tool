(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // node_modules/@yume-chan/async/esm/promise-resolver.js
  var _promise, _resolve, _reject, _state;
  var PromiseResolver = class {
    constructor() {
      __privateAdd(this, _promise);
      __privateAdd(this, _resolve);
      __privateAdd(this, _reject);
      __privateAdd(this, _state, "running");
      __publicField(this, "resolve", (value) => {
        __privateGet(this, _resolve).call(this, value);
        __privateSet(this, _state, "resolved");
      });
      __publicField(this, "reject", (reason) => {
        __privateGet(this, _reject).call(this, reason);
        __privateSet(this, _state, "rejected");
      });
      __privateSet(this, _promise, new Promise((resolve, reject) => {
        __privateSet(this, _resolve, resolve);
        __privateSet(this, _reject, reject);
      }));
    }
    get promise() {
      return __privateGet(this, _promise);
    }
    get state() {
      return __privateGet(this, _state);
    }
  };
  _promise = new WeakMap();
  _resolve = new WeakMap();
  _reject = new WeakMap();
  _state = new WeakMap();

  // node_modules/@yume-chan/async/esm/maybe-promise.js
  function isPromiseLike(value) {
    return typeof value === "object" && value !== null && "then" in value;
  }

  // node_modules/@yume-chan/struct/esm/bipedal.js
  function advance(iterator, next) {
    while (true) {
      const { done, value } = iterator.next(next);
      if (done) {
        return value;
      }
      if (isPromiseLike(value)) {
        return value.then((value2) => advance(iterator, { resolved: value2 }), (error) => advance(iterator, { error }));
      }
      next = value;
    }
  }
  // @__NO_SIDE_EFFECTS__
  function bipedal(fn, bindThis) {
    function result(...args) {
      const iterator = fn.call(this, function* (value) {
        if (isPromiseLike(value)) {
          const result2 = yield value;
          if ("resolved" in result2) {
            return result2.resolved;
          } else {
            throw result2.error;
          }
        }
        return value;
      }, ...args);
      return advance(iterator, void 0);
    }
    if (bindThis) {
      return result.bind(bindThis);
    } else {
      return result;
    }
  }

  // node_modules/@yume-chan/struct/esm/field/serialize.js
  function defaultFieldSerializer(serializer) {
    return (source, context) => {
      if ("buffer" in context) {
        const buffer2 = serializer(source, context);
        context.buffer.set(buffer2, context.index);
        return buffer2.length;
      } else {
        return serializer(source, context);
      }
    };
  }
  function byobFieldSerializer(size, serializer) {
    return (source, context) => {
      if ("buffer" in context) {
        context.index ?? (context.index = 0);
        serializer(source, context);
        return size;
      } else {
        const buffer2 = new Uint8Array(size);
        serializer(source, {
          buffer: buffer2,
          index: 0,
          littleEndian: context.littleEndian
        });
        return buffer2;
      }
    };
  }

  // node_modules/@yume-chan/struct/esm/field/factory.js
  // @__NO_SIDE_EFFECTS__
  function _field(size, type, serialize, deserialize, options) {
    const field2 = {
      size,
      type,
      serialize: type === "default" ? defaultFieldSerializer(serialize) : byobFieldSerializer(size, serialize),
      deserialize: bipedal(deserialize),
      omitInit: options?.omitInit
    };
    if (options?.init) {
      field2.init = options.init;
    }
    return field2;
  }
  var field = _field;

  // node_modules/@yume-chan/struct/esm/buffer.js
  var EmptyUint8Array = new Uint8Array(0);
  function copyMaybeDifferentLength(dest, source, index, length) {
    if (source.length < length) {
      dest.set(source, index);
      dest.fill(0, index + source.length, index + length);
    } else if (source.length === length) {
      dest.set(source, index);
    } else {
      dest.set(source.subarray(0, length), index);
    }
  }
  // @__NO_SIDE_EFFECTS__
  function buffer(lengthOrField, converter) {
    if (typeof lengthOrField === "number") {
      let serialize;
      let deserialize2;
      let init2;
      if (lengthOrField === 0) {
        serialize = () => {
        };
        if (converter) {
          deserialize2 = function* () {
            return converter.convert(EmptyUint8Array);
          };
        } else {
          deserialize2 = function* () {
            return EmptyUint8Array;
          };
        }
      } else {
        serialize = (value, { buffer: buffer2, index }) => copyMaybeDifferentLength(buffer2, value, index, lengthOrField);
        if (converter) {
          deserialize2 = function* (then, reader) {
            const array = reader.readExactly(lengthOrField);
            return converter.convert(yield* then(array));
          };
          init2 = (value) => converter.back(value);
        } else {
          deserialize2 = function* (_then, reader) {
            const array = reader.readExactly(lengthOrField);
            return array;
          };
        }
      }
      return field(lengthOrField, "byob", serialize, deserialize2, { init: init2 });
    }
    if ((typeof lengthOrField === "object" || typeof lengthOrField === "function") && "serialize" in lengthOrField) {
      let deserialize2;
      let init2;
      if (converter) {
        deserialize2 = function* (then, reader, context) {
          const length = yield* then(lengthOrField.deserialize(reader, context));
          const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
          return converter.convert(yield* then(array));
        };
        init2 = (value) => converter.back(value);
      } else {
        deserialize2 = function* (then, reader, context) {
          const length = yield* then(lengthOrField.deserialize(reader, context));
          const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
          return array;
        };
      }
      return field(lengthOrField.size, "default", (value, { littleEndian }) => {
        if (lengthOrField.type === "default") {
          const lengthBuffer = lengthOrField.serialize(value.length, {
            littleEndian
          });
          if (value.length === 0) {
            return lengthBuffer;
          }
          const result = new Uint8Array(lengthBuffer.length + value.length);
          result.set(lengthBuffer, 0);
          result.set(value, lengthBuffer.length);
          return result;
        } else {
          const result = new Uint8Array(lengthOrField.size + value.length);
          lengthOrField.serialize(value.length, {
            buffer: result,
            index: 0,
            littleEndian
          });
          result.set(value, lengthOrField.size);
          return result;
        }
      }, deserialize2, { init: init2 });
    }
    if (typeof lengthOrField === "string") {
      let deserialize2;
      let init2;
      if (converter) {
        deserialize2 = function* (then, reader, { dependencies }) {
          const length = dependencies[lengthOrField];
          const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
          return converter.convert(yield* then(array));
        };
        init2 = (value, dependencies) => {
          const array = converter.back(value);
          dependencies[lengthOrField] = array.length;
          return array;
        };
      } else {
        deserialize2 = function* (_then, reader, { dependencies }) {
          const length = dependencies[lengthOrField];
          const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
          return array;
        };
        init2 = (value, dependencies) => {
          const array = value;
          dependencies[lengthOrField] = array.length;
          return array;
        };
      }
      return field(0, "default", (source) => source, deserialize2, { init: init2 });
    }
    let deserialize;
    let init;
    if (converter) {
      deserialize = function* (then, reader, { dependencies }) {
        const rawLength = dependencies[lengthOrField.field];
        const length = lengthOrField.convert(rawLength);
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
        return converter.convert(yield* then(array));
      };
      init = (value, dependencies) => {
        const array = converter.back(value);
        dependencies[lengthOrField.field] = lengthOrField.back(array.length);
        return array;
      };
    } else {
      deserialize = function* (_then, reader, { dependencies }) {
        const rawLength = dependencies[lengthOrField.field];
        const length = lengthOrField.convert(rawLength);
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
        return array;
      };
      init = (value, dependencies) => {
        const array = value;
        dependencies[lengthOrField.field] = lengthOrField.back(array.length);
        return array;
      };
    }
    return field(0, "default", (source) => source, deserialize, { init });
  }

  // node_modules/@yume-chan/struct/esm/readable.js
  var ExactReadableEndedError = class extends Error {
    constructor() {
      super("ExactReadable ended");
    }
  };
  var _data, _position;
  var Uint8ArrayExactReadable = class {
    constructor(data) {
      __privateAdd(this, _data);
      __privateAdd(this, _position);
      __privateSet(this, _data, data);
      __privateSet(this, _position, 0);
    }
    get position() {
      return __privateGet(this, _position);
    }
    readExactly(length) {
      if (__privateGet(this, _position) + length > __privateGet(this, _data).length) {
        throw new ExactReadableEndedError();
      }
      const result = __privateGet(this, _data).subarray(__privateGet(this, _position), __privateGet(this, _position) + length);
      __privateSet(this, _position, __privateGet(this, _position) + length);
      return result;
    }
  };
  _data = new WeakMap();
  _position = new WeakMap();

  // node_modules/@yume-chan/struct/esm/struct.js
  var StructDeserializeError = class extends Error {
    constructor(message) {
      super(message);
    }
  };
  var StructNotEnoughDataError = class extends StructDeserializeError {
    constructor() {
      super("The underlying readable was ended before the struct was fully deserialized");
    }
  };
  var StructEmptyError = class extends StructDeserializeError {
    constructor() {
      super("The underlying readable doesn't contain any more struct");
    }
  };
  // @__NO_SIDE_EFFECTS__
  function struct(fields, options) {
    const fieldList = Object.entries(fields);
    let size = 0;
    let byob = true;
    for (const [, field2] of fieldList) {
      size += field2.size;
      if (byob && field2.type !== "byob") {
        byob = false;
      }
    }
    const littleEndian = options.littleEndian;
    const extra = options.extra ? Object.getOwnPropertyDescriptors(options.extra) : void 0;
    return {
      littleEndian,
      fields,
      extra: options.extra,
      type: byob ? "byob" : "default",
      size,
      serialize(source, bufferOrContext) {
        const temp = { ...source };
        for (const [key, field2] of fieldList) {
          if (key in temp && "init" in field2) {
            const result = field2.init?.(temp[key], temp);
            temp[key] = result;
          }
        }
        const sizes = new Array(fieldList.length);
        const buffers = new Array(fieldList.length);
        {
          const context2 = { littleEndian };
          for (const [index2, [key, field2]] of fieldList.entries()) {
            if (field2.type === "byob") {
              sizes[index2] = field2.size;
            } else {
              buffers[index2] = field2.serialize(temp[key], context2);
              sizes[index2] = buffers[index2].length;
            }
          }
        }
        const size2 = sizes.reduce((sum, size3) => sum + size3, 0);
        let externalBuffer;
        let buffer2;
        let index;
        if (bufferOrContext instanceof Uint8Array) {
          if (bufferOrContext.length < size2) {
            throw new Error("Buffer too small");
          }
          externalBuffer = true;
          buffer2 = bufferOrContext;
          index = 0;
        } else if (typeof bufferOrContext === "object" && "buffer" in bufferOrContext) {
          externalBuffer = true;
          buffer2 = bufferOrContext.buffer;
          index = bufferOrContext.index ?? 0;
          if (buffer2.length - index < size2) {
            throw new Error("Buffer too small");
          }
        } else {
          externalBuffer = false;
          buffer2 = new Uint8Array(size2);
          index = 0;
        }
        const context = {
          buffer: buffer2,
          index,
          littleEndian
        };
        for (const [index2, [key, field2]] of fieldList.entries()) {
          if (buffers[index2]) {
            buffer2.set(buffers[index2], context.index);
          } else {
            field2.serialize(temp[key], context);
          }
          context.index += sizes[index2];
        }
        if (externalBuffer) {
          return size2;
        } else {
          return buffer2;
        }
      },
      deserialize: bipedal(function* (then, reader) {
        const startPosition = reader.position;
        const result = {};
        const context = {
          dependencies: result,
          littleEndian
        };
        try {
          for (const [key, field2] of fieldList) {
            result[key] = yield* then(field2.deserialize(reader, context));
          }
        } catch (e) {
          if (!(e instanceof ExactReadableEndedError)) {
            throw e;
          }
          if (reader.position === startPosition) {
            throw new StructEmptyError();
          } else {
            throw new StructNotEnoughDataError();
          }
        }
        if (extra) {
          Object.defineProperties(result, extra);
        }
        if (options.postDeserialize) {
          return options.postDeserialize.call(result, result);
        } else {
          return result;
        }
      })
    };
  }

  // node_modules/@yume-chan/struct/esm/extend.js
  // @__NO_SIDE_EFFECTS__
  function extend(base, fields, options) {
    return struct(Object.assign({}, base.fields, fields), {
      littleEndian: options?.littleEndian ?? base.littleEndian,
      extra: base.extra,
      postDeserialize: options?.postDeserialize
    });
  }

  // node_modules/@yume-chan/no-data-view/esm/int32.js
  // @__NO_SIDE_EFFECTS__
  function getInt32(buffer2, offset, littleEndian) {
    return littleEndian ? buffer2[offset] | buffer2[offset + 1] << 8 | buffer2[offset + 2] << 16 | buffer2[offset + 3] << 24 : buffer2[offset] << 24 | buffer2[offset + 1] << 16 | buffer2[offset + 2] << 8 | buffer2[offset + 3];
  }
  function setInt32(buffer2, offset, value, littleEndian) {
    if (littleEndian) {
      buffer2[offset] = value;
      buffer2[offset + 1] = value >> 8;
      buffer2[offset + 2] = value >> 16;
      buffer2[offset + 3] = value >> 24;
    } else {
      buffer2[offset] = value >> 24;
      buffer2[offset + 1] = value >> 16;
      buffer2[offset + 2] = value >> 8;
      buffer2[offset + 3] = value;
    }
  }

  // node_modules/@yume-chan/no-data-view/esm/uint32.js
  // @__NO_SIDE_EFFECTS__
  function getUint32(buffer2, offset, littleEndian) {
    return littleEndian ? (buffer2[offset] | buffer2[offset + 1] << 8 | buffer2[offset + 2] << 16 | buffer2[offset + 3] << 24) >>> 0 : (buffer2[offset] << 24 | buffer2[offset + 1] << 16 | buffer2[offset + 2] << 8 | buffer2[offset + 3]) >>> 0;
  }
  function setUint32(buffer2, offset, value, littleEndian) {
    if (littleEndian) {
      buffer2[offset] = value;
      buffer2[offset + 1] = value >> 8;
      buffer2[offset + 2] = value >> 16;
      buffer2[offset + 3] = value >> 24;
    } else {
      buffer2[offset] = value >> 24;
      buffer2[offset + 1] = value >> 16;
      buffer2[offset + 2] = value >> 8;
      buffer2[offset + 3] = value;
    }
  }

  // node_modules/@yume-chan/struct/esm/number.js
  // @__NO_SIDE_EFFECTS__
  function number(size, serialize, deserialize) {
    const fn = (() => fn);
    Object.assign(fn, field(size, "byob", serialize, deserialize));
    return fn;
  }
  var u32 = /* @__PURE__ */ number(4, (value, { buffer: buffer2, index, littleEndian }) => {
    setUint32(buffer2, index, value, littleEndian);
  }, function* (then, reader, { littleEndian }) {
    const data = yield* then(reader.readExactly(4));
    return getUint32(data, 0, littleEndian);
  });
  var s32 = /* @__PURE__ */ number(4, (value, { buffer: buffer2, index, littleEndian }) => {
    setInt32(buffer2, index, value, littleEndian);
  }, function* (then, reader, { littleEndian }) {
    const data = yield* then(reader.readExactly(4));
    return getInt32(data, 0, littleEndian);
  });

  // node_modules/@yume-chan/stream-extra/esm/stream.js
  var { AbortController } = globalThis;
  var ReadableStream = /* @__PURE__ */ (() => {
    const { ReadableStream: ReadableStream2 } = globalThis;
    if (!ReadableStream2.from) {
      ReadableStream2.from = function(iterable) {
        const iterator = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
        return new ReadableStream2({
          async pull(controller) {
            const result = await iterator.next();
            if (result.done) {
              controller.close();
              return;
            }
            controller.enqueue(result.value);
          },
          async cancel(reason) {
            await iterator.return?.(reason);
          }
        });
      };
    }
    if (!ReadableStream2.prototype[Symbol.asyncIterator] || !ReadableStream2.prototype.values) {
      ReadableStream2.prototype.values = async function* (options) {
        const reader = this.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              return;
            }
            yield value;
          }
        } finally {
          if (!options?.preventCancel) {
            await reader.cancel();
          }
          reader.releaseLock();
        }
      };
      ReadableStream2.prototype[Symbol.asyncIterator] = // eslint-disable-next-line @typescript-eslint/unbound-method
      ReadableStream2.prototype.values;
    }
    return ReadableStream2;
  })();
  var { WritableStream, TransformStream } = globalThis;

  // node_modules/@yume-chan/stream-extra/esm/try-close.js
  function tryClose(controller) {
    try {
      controller.close();
      return true;
    } catch {
      return false;
    }
  }

  // node_modules/@yume-chan/stream-extra/esm/consumable/readable.js
  var ConsumableReadableStream = class _ConsumableReadableStream extends ReadableStream {
    static async enqueue(controller, chunk) {
      const output = new Consumable(chunk);
      controller.enqueue(output);
      await output.consumed;
    }
    constructor(source, strategy) {
      let wrappedController;
      let wrappedStrategy;
      if (strategy) {
        wrappedStrategy = {};
        if ("highWaterMark" in strategy) {
          wrappedStrategy.highWaterMark = strategy.highWaterMark;
        }
        if ("size" in strategy) {
          wrappedStrategy.size = (chunk) => {
            return strategy.size(chunk.value);
          };
        }
      }
      super({
        start(controller) {
          wrappedController = {
            enqueue(chunk) {
              return _ConsumableReadableStream.enqueue(controller, chunk);
            },
            close() {
              controller.close();
            },
            error(reason) {
              controller.error(reason);
            }
          };
          return source.start?.(wrappedController);
        },
        pull() {
          return source.pull?.(wrappedController);
        },
        cancel(reason) {
          return source.cancel?.(reason);
        }
      }, wrappedStrategy);
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/consumable/wrap-byte-readable.js
  var ConsumableWrapByteReadableStream = class extends ReadableStream {
    constructor(stream, chunkSize, min) {
      const reader = stream.getReader({ mode: "byob" });
      let array = new Uint8Array(chunkSize);
      super({
        async pull(controller) {
          const { done, value } = await reader.read(array, { min });
          if (done) {
            controller.close();
            return;
          }
          await ConsumableReadableStream.enqueue(controller, value);
          array = new Uint8Array(value.buffer);
        },
        cancel(reason) {
          return reader.cancel(reason);
        }
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/consumable/wrap-writable.js
  var ConsumableWrapWritableStream = class extends WritableStream {
    constructor(stream) {
      const writer = stream.getWriter();
      super({
        write(chunk) {
          return chunk.tryConsume((chunk2) => writer.write(chunk2));
        },
        abort(reason) {
          return writer.abort(reason);
        },
        close() {
          return writer.close();
        }
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/consumable/writable.js
  var ConsumableWritableStream = class extends WritableStream {
    static async write(writer, value) {
      const consumable = new Consumable(value);
      await writer.write(consumable);
      await consumable.consumed;
    }
    constructor(sink, strategy) {
      let wrappedStrategy;
      if (strategy) {
        wrappedStrategy = {};
        if ("highWaterMark" in strategy) {
          wrappedStrategy.highWaterMark = strategy.highWaterMark;
        }
        if ("size" in strategy) {
          wrappedStrategy.size = (chunk) => {
            return strategy.size(chunk instanceof Consumable ? chunk.value : chunk);
          };
        }
      }
      super({
        start(controller) {
          return sink.start?.(controller);
        },
        write(chunk, controller) {
          return chunk.tryConsume((chunk2) => sink.write?.(chunk2, controller));
        },
        abort(reason) {
          return sink.abort?.(reason);
        },
        close() {
          return sink.close?.();
        }
      }, wrappedStrategy);
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/task.js
  var { console } = globalThis;
  var createTask = /* @__PURE__ */ (() => console?.createTask?.bind(console) ?? (() => ({
    run(callback) {
      return callback();
    }
  })))();

  // node_modules/@yume-chan/stream-extra/esm/consumable.js
  var _task, _resolver;
  var Consumable = class {
    constructor(value) {
      __privateAdd(this, _task);
      __privateAdd(this, _resolver);
      __publicField(this, "value");
      __publicField(this, "consumed");
      __privateSet(this, _task, createTask("Consumable"));
      this.value = value;
      __privateSet(this, _resolver, new PromiseResolver());
      this.consumed = __privateGet(this, _resolver).promise;
    }
    consume() {
      __privateGet(this, _resolver).resolve();
    }
    error(error) {
      __privateGet(this, _resolver).reject(error);
    }
    tryConsume(callback) {
      try {
        let result = __privateGet(this, _task).run(() => callback(this.value));
        if (isPromiseLike(result)) {
          result = result.then((value) => {
            __privateGet(this, _resolver).resolve();
            return value;
          }, (e) => {
            __privateGet(this, _resolver).reject(e);
            throw e;
          });
        } else {
          __privateGet(this, _resolver).resolve();
        }
        return result;
      } catch (e) {
        __privateGet(this, _resolver).reject(e);
        throw e;
      }
    }
  };
  _task = new WeakMap();
  _resolver = new WeakMap();
  __publicField(Consumable, "WritableStream", ConsumableWritableStream);
  __publicField(Consumable, "WrapWritableStream", ConsumableWrapWritableStream);
  __publicField(Consumable, "ReadableStream", ConsumableReadableStream);
  __publicField(Consumable, "WrapByteReadableStream", ConsumableWrapByteReadableStream);

  // node_modules/@yume-chan/stream-extra/esm/maybe-consumable/index.js
  var maybe_consumable_exports = {};
  __export(maybe_consumable_exports, {
    WrapWritableStream: () => MaybeConsumableWrapWritableStream,
    WritableStream: () => MaybeConsumableWritableStream,
    getValue: () => getValue,
    tryConsume: () => tryConsume
  });

  // node_modules/@yume-chan/stream-extra/esm/maybe-consumable/utils.js
  function getValue(value) {
    return value instanceof Consumable ? value.value : value;
  }
  function tryConsume(value, callback) {
    if (value instanceof Consumable) {
      return value.tryConsume(callback);
    } else {
      return callback(value);
    }
  }

  // node_modules/@yume-chan/stream-extra/esm/maybe-consumable/wrap-writable.js
  var MaybeConsumableWrapWritableStream = class extends WritableStream {
    constructor(stream) {
      const writer = stream.getWriter();
      super({
        write(chunk) {
          return tryConsume(chunk, (chunk2) => writer.write(chunk2));
        },
        abort(reason) {
          return writer.abort(reason);
        },
        close() {
          return writer.close();
        }
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/maybe-consumable/writable.js
  var MaybeConsumableWritableStream = class extends WritableStream {
    constructor(sink, strategy) {
      let wrappedStrategy;
      if (strategy) {
        wrappedStrategy = {};
        if ("highWaterMark" in strategy) {
          wrappedStrategy.highWaterMark = strategy.highWaterMark;
        }
        if ("size" in strategy) {
          wrappedStrategy.size = (chunk) => {
            return strategy.size(chunk instanceof Consumable ? chunk.value : chunk);
          };
        }
      }
      super({
        start(controller) {
          return sink.start?.(controller);
        },
        write(chunk, controller) {
          return tryConsume(chunk, (chunk2) => sink.write?.(chunk2, controller));
        },
        abort(reason) {
          return sink.abort?.(reason);
        },
        close() {
          return sink.close?.();
        }
      }, wrappedStrategy);
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/wrap-readable.js
  function getWrappedReadableStream(wrapper, controller) {
    if ("start" in wrapper) {
      return wrapper.start(controller);
    } else if (typeof wrapper === "function") {
      return wrapper(controller);
    } else {
      return wrapper;
    }
  }
  var _reader;
  var WrapReadableStream = class extends ReadableStream {
    constructor(wrapper, strategy) {
      super({
        start: async (controller) => {
          const readable = await getWrappedReadableStream(wrapper, controller);
          this.readable = readable;
          __privateSet(this, _reader, this.readable.getReader());
        },
        pull: async (controller) => {
          const { done, value } = await __privateGet(this, _reader).read().catch((e) => {
            if ("error" in wrapper) {
              wrapper.error(e);
            }
            throw e;
          });
          if (done) {
            controller.close();
            if ("close" in wrapper) {
              await wrapper.close?.();
            }
          } else {
            controller.enqueue(value);
          }
        },
        cancel: async (reason) => {
          await __privateGet(this, _reader).cancel(reason);
          if ("cancel" in wrapper) {
            await wrapper.cancel?.(reason);
          }
        }
      }, strategy);
      __publicField(this, "readable");
      __privateAdd(this, _reader);
    }
  };
  _reader = new WeakMap();

  // node_modules/@yume-chan/stream-extra/esm/duplex.js
  var NOOP = () => {
  };
  var _readableControllers, _writers, _writableClosed, _closed, _options;
  var DuplexStreamFactory = class {
    constructor(options) {
      __privateAdd(this, _readableControllers, []);
      __privateAdd(this, _writers, []);
      __privateAdd(this, _writableClosed, false);
      __privateAdd(this, _closed, new PromiseResolver());
      __privateAdd(this, _options);
      __privateSet(this, _options, options ?? {});
    }
    get writableClosed() {
      return __privateGet(this, _writableClosed);
    }
    get closed() {
      return __privateGet(this, _closed).promise;
    }
    wrapReadable(readable, strategy) {
      return new WrapReadableStream({
        start: (controller) => {
          __privateGet(this, _readableControllers).push(controller);
          return readable;
        },
        cancel: async () => {
          await this.close();
        },
        close: async () => {
          await this.dispose();
        }
      }, strategy);
    }
    createWritable(stream) {
      const writer = stream.getWriter();
      __privateGet(this, _writers).push(writer);
      return new WritableStream({
        write: async (chunk) => {
          await writer.write(chunk);
        },
        abort: async (reason) => {
          await writer.abort(reason);
          await this.close();
        },
        close: async () => {
          await writer.close().catch(NOOP);
          await this.close();
        }
      });
    }
    async close() {
      if (__privateGet(this, _writableClosed)) {
        return;
      }
      __privateSet(this, _writableClosed, true);
      if (await __privateGet(this, _options).close?.() !== false) {
        await this.dispose();
      }
      for (const writer of __privateGet(this, _writers)) {
        writer.close().catch(NOOP);
      }
    }
    async dispose() {
      __privateSet(this, _writableClosed, true);
      __privateGet(this, _closed).resolve();
      for (const controller of __privateGet(this, _readableControllers)) {
        tryClose(controller);
      }
      await __privateGet(this, _options).dispose?.();
    }
  };
  _readableControllers = new WeakMap();
  _writers = new WeakMap();
  _writableClosed = new WeakMap();
  _closed = new WeakMap();
  _options = new WeakMap();

  // node_modules/@yume-chan/stream-extra/esm/pipe-from.js
  function pipeFrom(writable, pair) {
    const writer = pair.writable.getWriter();
    const pipe = pair.readable.pipeTo(writable);
    return new WritableStream({
      async write(chunk) {
        await writer.write(chunk);
      },
      async close() {
        await writer.close();
        await pipe;
      }
    });
  }

  // node_modules/@yume-chan/event/esm/event-emitter.js
  var EventEmitter = class {
    constructor() {
      __publicField(this, "listeners", []);
      __publicField(this, "event", (listener, thisArg, ...args) => {
        const info = {
          listener,
          thisArg,
          args
        };
        return this.addEventListener(info);
      });
      this.event = this.event.bind(this);
    }
    addEventListener(info) {
      this.listeners.push(info);
      const remove = () => {
        const index = this.listeners.indexOf(info);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      };
      remove.dispose = remove;
      return remove;
    }
    fire(e) {
      for (const info of this.listeners.slice()) {
        info.listener.call(info.thisArg, e, ...info.args);
      }
    }
    dispose() {
      this.listeners.length = 0;
    }
  };

  // node_modules/@yume-chan/event/esm/sticky-event-emitter.js
  var Undefined = /* @__PURE__ */ Symbol("undefined");
  var _value;
  var StickyEventEmitter = class extends EventEmitter {
    constructor() {
      super(...arguments);
      __privateAdd(this, _value, Undefined);
    }
    addEventListener(info) {
      if (__privateGet(this, _value) !== Undefined) {
        info.listener.call(info.thisArg, __privateGet(this, _value), ...info.args);
      }
      return super.addEventListener(info);
    }
    fire(e) {
      __privateSet(this, _value, e);
      super.fire(e);
    }
  };
  _value = new WeakMap();

  // node_modules/@yume-chan/adb/esm/utils/array-buffer.js
  function toLocalUint8Array(value) {
    if (value.buffer instanceof ArrayBuffer) {
      return value;
    }
    const copy = new Uint8Array(value.length);
    copy.set(value);
    return copy;
  }

  // node_modules/@yume-chan/adb/esm/utils/no-op.js
  function unreachable(...args) {
    throw new Error("Unreachable. Arguments:\n" + args.join("\n"));
  }

  // node_modules/@yume-chan/adb/esm/daemon/packet.js
  var AdbPacketHeader = struct({
    command: u32,
    arg0: u32,
    arg1: u32,
    payloadLength: u32,
    checksum: u32,
    magic: s32
  }, { littleEndian: true });
  var AdbPacket = extend(AdbPacketHeader, {
    payload: buffer("payloadLength")
  });
  var AdbPacketSerializeStream = class extends TransformStream {
    constructor() {
      const headerBuffer = new Uint8Array(AdbPacketHeader.size);
      super({
        transform: async (chunk, controller) => {
          await chunk.tryConsume(async (chunk2) => {
            const init = chunk2;
            init.payloadLength = init.payload.length;
            AdbPacketHeader.serialize(init, headerBuffer);
            await Consumable.ReadableStream.enqueue(controller, headerBuffer);
            if (init.payloadLength) {
              await Consumable.ReadableStream.enqueue(controller, init.payload);
            }
          });
        }
      });
    }
  };

  // node_modules/@yume-chan/adb/esm/server/observer.js
  function unorderedRemove(array, index) {
    if (index < 0 || index >= array.length) {
      return;
    }
    array[index] = array[array.length - 1];
    array.length -= 1;
  }

  // node_modules/@yume-chan/adb-daemon-webusb/esm/error.js
  var DeviceBusyError = class extends Error {
    constructor(cause) {
      super("The device is already in used by another program", {
        cause
      });
    }
  };

  // node_modules/@yume-chan/adb-daemon-webusb/esm/utils.js
  function isErrorName(e, name) {
    return typeof e === "object" && e !== null && "name" in e && e.name === name;
  }
  function isUsbInterfaceFilter(filter) {
    return filter.classCode !== void 0 && filter.subclassCode !== void 0 && filter.protocolCode !== void 0;
  }
  function matchUsbInterfaceFilter(alternate, filter) {
    return alternate.interfaceClass === filter.classCode && alternate.interfaceSubclass === filter.subclassCode && alternate.interfaceProtocol === filter.protocolCode;
  }
  function findUsbInterface(device, filter) {
    for (const configuration of device.configurations) {
      for (const interface_ of configuration.interfaces) {
        for (const alternate of interface_.alternates) {
          if (matchUsbInterfaceFilter(alternate, filter)) {
            return { configuration, interface_, alternate };
          }
        }
      }
    }
    return void 0;
  }
  function padNumber(value) {
    return value.toString(16).padStart(4, "0");
  }
  function getSerialNumber(device) {
    if (device.serialNumber) {
      return device.serialNumber;
    }
    return padNumber(device.vendorId) + "x" + padNumber(device.productId);
  }
  function findUsbEndpoints(endpoints) {
    if (endpoints.length === 0) {
      throw new TypeError("No endpoints given");
    }
    let inEndpoint;
    let outEndpoint;
    for (const endpoint of endpoints) {
      switch (endpoint.direction) {
        case "in":
          inEndpoint = endpoint;
          if (outEndpoint) {
            return { inEndpoint, outEndpoint };
          }
          break;
        case "out":
          outEndpoint = endpoint;
          if (inEndpoint) {
            return { inEndpoint, outEndpoint };
          }
          break;
      }
    }
    if (!inEndpoint) {
      throw new TypeError("No input endpoint found.");
    }
    if (!outEndpoint) {
      throw new TypeError("No output endpoint found.");
    }
    throw new Error("unreachable");
  }
  function matchFilter(device, filter) {
    if (filter.vendorId !== void 0 && device.vendorId !== filter.vendorId) {
      return false;
    }
    if (filter.productId !== void 0 && device.productId !== filter.productId) {
      return false;
    }
    if (filter.serialNumber !== void 0 && getSerialNumber(device) !== filter.serialNumber) {
      return false;
    }
    if (isUsbInterfaceFilter(filter)) {
      return findUsbInterface(device, filter) || false;
    }
    return true;
  }
  function matchFilters(device, filters, exclusionFilters) {
    if (exclusionFilters && exclusionFilters.length > 0) {
      if (matchFilters(device, exclusionFilters)) {
        return false;
      }
    }
    for (const filter of filters) {
      const result = matchFilter(device, filter);
      if (result) {
        return result;
      }
    }
    return false;
  }

  // node_modules/@yume-chan/adb-daemon-webusb/esm/device.js
  var AdbDefaultInterfaceFilter = {
    classCode: 255,
    subclassCode: 66,
    protocolCode: 1
  };
  function mergeDefaultAdbInterfaceFilter(filters) {
    if (!filters || filters.length === 0) {
      return [AdbDefaultInterfaceFilter];
    } else {
      return filters.map((filter) => ({
        ...filter,
        classCode: filter.classCode ?? AdbDefaultInterfaceFilter.classCode,
        subclassCode: filter.subclassCode ?? AdbDefaultInterfaceFilter.subclassCode,
        protocolCode: filter.protocolCode ?? AdbDefaultInterfaceFilter.protocolCode
      }));
    }
  }
  var _device, _inEndpoint, _outEndpoint, _readable, _writable, _AdbDaemonWebUsbConnection_instances, transferIn_fn;
  var AdbDaemonWebUsbConnection = class {
    constructor(device, inEndpoint, outEndpoint, usbManager) {
      __privateAdd(this, _AdbDaemonWebUsbConnection_instances);
      __privateAdd(this, _device);
      __privateAdd(this, _inEndpoint);
      __privateAdd(this, _outEndpoint);
      __privateAdd(this, _readable);
      __privateAdd(this, _writable);
      __privateSet(this, _device, device);
      __privateSet(this, _inEndpoint, inEndpoint);
      __privateSet(this, _outEndpoint, outEndpoint);
      let closed2 = false;
      const duplex = new DuplexStreamFactory({
        close: async () => {
          try {
            closed2 = true;
            await device.raw.close();
          } catch {
          }
        },
        dispose: () => {
          closed2 = true;
          usbManager.removeEventListener("disconnect", handleUsbDisconnect);
        }
      });
      function handleUsbDisconnect(e) {
        if (e.device === device.raw) {
          duplex.dispose().catch(unreachable);
        }
      }
      usbManager.addEventListener("disconnect", handleUsbDisconnect);
      __privateSet(this, _readable, duplex.wrapReadable(new ReadableStream({
        pull: async (controller) => {
          const packet = await __privateMethod(this, _AdbDaemonWebUsbConnection_instances, transferIn_fn).call(this);
          if (packet) {
            controller.enqueue(packet);
          } else {
            controller.close();
          }
        }
      }, { highWaterMark: 0 })));
      const zeroMask = outEndpoint.packetSize - 1;
      __privateSet(this, _writable, pipeFrom(duplex.createWritable(new maybe_consumable_exports.WritableStream({
        write: async (chunk) => {
          try {
            await device.raw.transferOut(outEndpoint.endpointNumber, toLocalUint8Array(chunk));
            if (zeroMask && (chunk.length & zeroMask) === 0) {
              await device.raw.transferOut(outEndpoint.endpointNumber, EmptyUint8Array);
            }
          } catch (e) {
            if (closed2) {
              return;
            }
            throw e;
          }
        }
      })), new AdbPacketSerializeStream()));
    }
    get device() {
      return __privateGet(this, _device);
    }
    get inEndpoint() {
      return __privateGet(this, _inEndpoint);
    }
    get outEndpoint() {
      return __privateGet(this, _outEndpoint);
    }
    get readable() {
      return __privateGet(this, _readable);
    }
    get writable() {
      return __privateGet(this, _writable);
    }
  };
  _device = new WeakMap();
  _inEndpoint = new WeakMap();
  _outEndpoint = new WeakMap();
  _readable = new WeakMap();
  _writable = new WeakMap();
  _AdbDaemonWebUsbConnection_instances = new WeakSet();
  transferIn_fn = async function() {
    try {
      while (true) {
        const result = await __privateGet(this, _device).raw.transferIn(__privateGet(this, _inEndpoint).endpointNumber, __privateGet(this, _inEndpoint).packetSize);
        if (result.data.byteLength !== 24) {
          continue;
        }
        const buffer2 = new Uint8Array(result.data.buffer);
        const stream = new Uint8ArrayExactReadable(buffer2);
        const packet = AdbPacketHeader.deserialize(stream);
        if (packet.magic !== (packet.command ^ 4294967295)) {
          continue;
        }
        if (packet.payloadLength !== 0) {
          const result2 = await __privateGet(this, _device).raw.transferIn(__privateGet(this, _inEndpoint).endpointNumber, packet.payloadLength);
          packet.payload = new Uint8Array(result2.data.buffer);
        } else {
          packet.payload = EmptyUint8Array;
        }
        return packet;
      }
    } catch (e) {
      if (isErrorName(e, "NetworkError")) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 100);
        });
        if (closed) {
          return void 0;
        }
      }
      throw e;
    }
  };
  var _interface, _usbManager, _raw, _serial, _AdbDaemonWebUsbDevice_instances, claimInterface_fn;
  var _AdbDaemonWebUsbDevice = class _AdbDaemonWebUsbDevice {
    /**
     * Create a new instance of `AdbDaemonWebUsbConnection` using a specified `USBDevice` instance
     *
     * @param device The `USBDevice` instance obtained elsewhere.
     * @param filters The filters to use when searching for ADB interface. Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     */
    constructor(device, interface_, usbManager) {
      __privateAdd(this, _AdbDaemonWebUsbDevice_instances);
      __privateAdd(this, _interface);
      __privateAdd(this, _usbManager);
      __privateAdd(this, _raw);
      __privateAdd(this, _serial);
      __privateSet(this, _raw, device);
      __privateSet(this, _serial, getSerialNumber(device));
      __privateSet(this, _interface, interface_);
      __privateSet(this, _usbManager, usbManager);
    }
    get raw() {
      return __privateGet(this, _raw);
    }
    get serial() {
      return __privateGet(this, _serial);
    }
    get name() {
      return __privateGet(this, _raw).productName;
    }
    /**
     * Open the device and create a new connection to the ADB Daemon.
     */
    async connect() {
      const { inEndpoint, outEndpoint } = await __privateMethod(this, _AdbDaemonWebUsbDevice_instances, claimInterface_fn).call(this);
      return new AdbDaemonWebUsbConnection(this, inEndpoint, outEndpoint, __privateGet(this, _usbManager));
    }
  };
  _interface = new WeakMap();
  _usbManager = new WeakMap();
  _raw = new WeakMap();
  _serial = new WeakMap();
  _AdbDaemonWebUsbDevice_instances = new WeakSet();
  claimInterface_fn = async function() {
    if (!__privateGet(this, _raw).opened) {
      await __privateGet(this, _raw).open();
    }
    const { configuration, interface_, alternate } = __privateGet(this, _interface);
    if (__privateGet(this, _raw).configuration?.configurationValue !== configuration.configurationValue) {
      await __privateGet(this, _raw).selectConfiguration(configuration.configurationValue);
    }
    if (!interface_.claimed) {
      try {
        await __privateGet(this, _raw).claimInterface(interface_.interfaceNumber);
      } catch (e) {
        if (isErrorName(e, "NetworkError")) {
          throw new _AdbDaemonWebUsbDevice.DeviceBusyError(e);
        }
        throw e;
      }
    }
    if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
      await __privateGet(this, _raw).selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting);
    }
    return findUsbEndpoints(alternate.endpoints);
  };
  __publicField(_AdbDaemonWebUsbDevice, "DeviceBusyError", DeviceBusyError);
  var AdbDaemonWebUsbDevice = _AdbDaemonWebUsbDevice;

  // node_modules/@yume-chan/adb-daemon-webusb/esm/observer.js
  var _filters, _exclusionFilters, _usbManager2, _onDeviceAdd, _onDeviceRemove, _onListChange, _AdbDaemonWebUsbDeviceObserver_instances, convertDevice_fn, _handleConnect, _handleDisconnect;
  var _AdbDaemonWebUsbDeviceObserver = class _AdbDaemonWebUsbDeviceObserver {
    constructor(usb, initial, options = {}) {
      __privateAdd(this, _AdbDaemonWebUsbDeviceObserver_instances);
      __privateAdd(this, _filters);
      __privateAdd(this, _exclusionFilters);
      __privateAdd(this, _usbManager2);
      __privateAdd(this, _onDeviceAdd, new EventEmitter());
      __publicField(this, "onDeviceAdd", __privateGet(this, _onDeviceAdd).event);
      __privateAdd(this, _onDeviceRemove, new EventEmitter());
      __publicField(this, "onDeviceRemove", __privateGet(this, _onDeviceRemove).event);
      __privateAdd(this, _onListChange, new StickyEventEmitter());
      __publicField(this, "onListChange", __privateGet(this, _onListChange).event);
      __publicField(this, "current", []);
      __privateAdd(this, _handleConnect, (e) => {
        const device = __privateMethod(this, _AdbDaemonWebUsbDeviceObserver_instances, convertDevice_fn).call(this, e.device);
        if (!device) {
          return;
        }
        if (this.current.some((item) => item.raw === device.raw)) {
          return;
        }
        const next = this.current.slice();
        next.push(device);
        this.current = next;
        __privateGet(this, _onDeviceAdd).fire([device]);
        __privateGet(this, _onListChange).fire(this.current);
      });
      __privateAdd(this, _handleDisconnect, (e) => {
        const index = this.current.findIndex((device) => device.raw === e.device);
        if (index !== -1) {
          const device = this.current[index];
          const next = this.current.slice();
          unorderedRemove(next, index);
          this.current = next;
          __privateGet(this, _onDeviceRemove).fire([device]);
          __privateGet(this, _onListChange).fire(this.current);
        }
      });
      __privateSet(this, _filters, mergeDefaultAdbInterfaceFilter(options.filters));
      __privateSet(this, _exclusionFilters, options.exclusionFilters);
      __privateSet(this, _usbManager2, usb);
      this.current = initial.map((device) => __privateMethod(this, _AdbDaemonWebUsbDeviceObserver_instances, convertDevice_fn).call(this, device)).filter((device) => !!device);
      __privateGet(this, _onListChange).fire(this.current);
      __privateGet(this, _usbManager2).addEventListener("connect", __privateGet(this, _handleConnect));
      __privateGet(this, _usbManager2).addEventListener("disconnect", __privateGet(this, _handleDisconnect));
    }
    static async create(usb, options = {}) {
      const devices = await usb.getDevices();
      return new _AdbDaemonWebUsbDeviceObserver(usb, devices, options);
    }
    stop() {
      __privateGet(this, _usbManager2).removeEventListener("connect", __privateGet(this, _handleConnect));
      __privateGet(this, _usbManager2).removeEventListener("disconnect", __privateGet(this, _handleDisconnect));
      __privateGet(this, _onDeviceAdd).dispose();
      __privateGet(this, _onDeviceRemove).dispose();
      __privateGet(this, _onListChange).dispose();
    }
  };
  _filters = new WeakMap();
  _exclusionFilters = new WeakMap();
  _usbManager2 = new WeakMap();
  _onDeviceAdd = new WeakMap();
  _onDeviceRemove = new WeakMap();
  _onListChange = new WeakMap();
  _AdbDaemonWebUsbDeviceObserver_instances = new WeakSet();
  convertDevice_fn = function(device) {
    const interface_ = matchFilters(device, __privateGet(this, _filters), __privateGet(this, _exclusionFilters));
    if (!interface_) {
      return void 0;
    }
    return new AdbDaemonWebUsbDevice(device, interface_, __privateGet(this, _usbManager2));
  };
  _handleConnect = new WeakMap();
  _handleDisconnect = new WeakMap();
  var AdbDaemonWebUsbDeviceObserver = _AdbDaemonWebUsbDeviceObserver;

  // node_modules/@yume-chan/adb-daemon-webusb/esm/manager.js
  var _usbManager3;
  var _AdbDaemonWebUsbDeviceManager = class _AdbDaemonWebUsbDeviceManager {
    /**
     * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
     * @param usbManager A WebUSB compatible interface.
     */
    constructor(usbManager) {
      __privateAdd(this, _usbManager3);
      __privateSet(this, _usbManager3, usbManager);
    }
    /**
     * Call `USB#requestDevice()` to prompt the user to select a device.
     */
    async requestDevice(options = {}) {
      const filters = mergeDefaultAdbInterfaceFilter(options.filters);
      try {
        const device = await __privateGet(this, _usbManager3).requestDevice({
          filters,
          exclusionFilters: options.exclusionFilters
        });
        const interface_ = matchFilters(device, filters, options.exclusionFilters);
        if (!interface_) {
          return void 0;
        }
        __privateGet(this, _usbManager3).dispatchEvent(new USBConnectionEvent("connect", { device }));
        return new AdbDaemonWebUsbDevice(device, interface_, __privateGet(this, _usbManager3));
      } catch (e) {
        if (isErrorName(e, "NotFoundError")) {
          return void 0;
        }
        throw e;
      }
    }
    /**
     * Get all connected and requested devices that match the specified filters.
     */
    async getDevices(options = {}) {
      const filters = mergeDefaultAdbInterfaceFilter(options.filters);
      const devices = await __privateGet(this, _usbManager3).getDevices();
      const result = [];
      for (const device of devices) {
        const interface_ = matchFilters(device, filters, options.exclusionFilters);
        if (interface_) {
          result.push(new AdbDaemonWebUsbDevice(device, interface_, __privateGet(this, _usbManager3)));
        }
      }
      return result;
    }
    trackDevices(options = {}) {
      return AdbDaemonWebUsbDeviceObserver.create(__privateGet(this, _usbManager3), options);
    }
  };
  _usbManager3 = new WeakMap();
  /**
   * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
   *
   * May be `undefined` if current runtime does not support WebUSB.
   */
  __publicField(_AdbDaemonWebUsbDeviceManager, "BROWSER", /* @__PURE__ */ (() => typeof globalThis.navigator !== "undefined" && globalThis.navigator.usb ? new _AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb) : void 0)());
  var AdbDaemonWebUsbDeviceManager = _AdbDaemonWebUsbDeviceManager;
})();
//# sourceMappingURL=adb-daemon-webusb.js.map
