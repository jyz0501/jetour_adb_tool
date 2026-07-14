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

  // node_modules/@yume-chan/struct/esm/buffer.js
  var EmptyUint8Array = new Uint8Array(0);

  // node_modules/@yume-chan/struct/esm/readable.js
  var ExactReadableEndedError = class extends Error {
    constructor() {
      super("ExactReadable ended");
    }
  };

  // node_modules/@yume-chan/struct/esm/struct.js
  var StructDeserializeError = class extends Error {
    constructor(message) {
      super(message);
    }
  };
  var StructEmptyError = class extends StructDeserializeError {
    constructor() {
      super("The underlying readable doesn't contain any more struct");
    }
  };

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

  // node_modules/@yume-chan/stream-extra/esm/push-readable.js
  var PushReadableStream = class extends ReadableStream {
    /**
     * Create a new `PushReadableStream` from a source.
     *
     * @param source If `source` returns a `Promise`, the stream will be closed
     * when the `Promise` is resolved, and be errored when the `Promise` is rejected.
     * @param strategy
     */
    constructor(source, strategy, logger) {
      let waterMarkLow;
      let zeroHighWaterMarkAllowEnqueue = false;
      const abortController = new AbortController();
      super({
        start: (controller) => {
          const result = source({
            abortSignal: abortController.signal,
            enqueue: async (chunk) => {
              logger?.({
                source: "producer",
                operation: "enqueue",
                value: chunk,
                phase: "start"
              });
              if (abortController.signal.aborted) {
                logger?.({
                  source: "producer",
                  operation: "enqueue",
                  value: chunk,
                  phase: "ignored"
                });
                return;
              }
              if (controller.desiredSize === null) {
                controller.enqueue(chunk);
                return;
              }
              if (zeroHighWaterMarkAllowEnqueue) {
                zeroHighWaterMarkAllowEnqueue = false;
                controller.enqueue(chunk);
                logger?.({
                  source: "producer",
                  operation: "enqueue",
                  value: chunk,
                  phase: "complete"
                });
                return;
              }
              if (controller.desiredSize <= 0) {
                logger?.({
                  source: "producer",
                  operation: "enqueue",
                  value: chunk,
                  phase: "waiting"
                });
                waterMarkLow = new PromiseResolver();
                await waterMarkLow.promise;
                if (abortController.signal.aborted) {
                  logger?.({
                    source: "producer",
                    operation: "enqueue",
                    value: chunk,
                    phase: "ignored"
                  });
                  return;
                }
              }
              controller.enqueue(chunk);
              logger?.({
                source: "producer",
                operation: "enqueue",
                value: chunk,
                phase: "complete"
              });
            },
            close() {
              logger?.({
                source: "producer",
                operation: "close",
                explicit: true,
                phase: "start"
              });
              if (abortController.signal.aborted) {
                logger?.({
                  source: "producer",
                  operation: "close",
                  explicit: true,
                  phase: "ignored"
                });
                return;
              }
              controller.close();
              logger?.({
                source: "producer",
                operation: "close",
                explicit: true,
                phase: "complete"
              });
            },
            error(e) {
              logger?.({
                source: "producer",
                operation: "error",
                explicit: true,
                phase: "start"
              });
              controller.error(e);
              logger?.({
                source: "producer",
                operation: "error",
                explicit: true,
                phase: "complete"
              });
            }
          });
          if (result && "then" in result) {
            result.then(() => {
              logger?.({
                source: "producer",
                operation: "close",
                explicit: false,
                phase: "start"
              });
              try {
                controller.close();
                logger?.({
                  source: "producer",
                  operation: "close",
                  explicit: false,
                  phase: "complete"
                });
              } catch {
                logger?.({
                  source: "producer",
                  operation: "close",
                  explicit: false,
                  phase: "ignored"
                });
              }
            }, (e) => {
              logger?.({
                source: "producer",
                operation: "error",
                explicit: false,
                phase: "start"
              });
              controller.error(e);
              logger?.({
                source: "producer",
                operation: "error",
                explicit: false,
                phase: "complete"
              });
            });
          }
        },
        pull: () => {
          logger?.({
            source: "consumer",
            operation: "pull",
            phase: "start"
          });
          if (waterMarkLow) {
            waterMarkLow.resolve();
          } else if (strategy?.highWaterMark === 0) {
            zeroHighWaterMarkAllowEnqueue = true;
          }
          logger?.({
            source: "consumer",
            operation: "pull",
            phase: "complete"
          });
        },
        cancel: (reason) => {
          logger?.({
            source: "consumer",
            operation: "cancel",
            phase: "start"
          });
          abortController.abort(reason);
          waterMarkLow?.resolve();
          logger?.({
            source: "consumer",
            operation: "cancel",
            phase: "complete"
          });
        }
      }, strategy);
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/try-close.js
  function tryClose(controller) {
    try {
      controller.close();
      return true;
    } catch {
      return false;
    }
  }
  async function tryCancel(stream) {
    try {
      await stream.cancel();
      return true;
    } catch {
      return false;
    }
  }

  // node_modules/@yume-chan/stream-extra/esm/buffered.js
  var _buffered, _bufferedOffset, _bufferedLength, _position, _BufferedReadableStream_instances, readBuffered_fn, readSource_fn;
  var BufferedReadableStream = class {
    constructor(stream) {
      __privateAdd(this, _BufferedReadableStream_instances);
      __privateAdd(this, _buffered);
      // PERF: `subarray` is slow
      // don't use it until absolutely necessary
      __privateAdd(this, _bufferedOffset, 0);
      __privateAdd(this, _bufferedLength, 0);
      __privateAdd(this, _position, 0);
      __publicField(this, "stream");
      __publicField(this, "reader");
      __publicField(this, "readExactly", bipedal(function* (then, length) {
        let result;
        let index = 0;
        const initial = __privateMethod(this, _BufferedReadableStream_instances, readBuffered_fn).call(this, length);
        if (initial) {
          if (initial.length === length) {
            return initial;
          }
          result = new Uint8Array(length);
          result.set(initial, index);
          index += initial.length;
          length -= initial.length;
        } else {
          result = new Uint8Array(length);
        }
        while (length > 0) {
          const value = yield* then(__privateMethod(this, _BufferedReadableStream_instances, readSource_fn).call(this, length));
          result.set(value, index);
          index += value.length;
          length -= value.length;
        }
        return result;
      }));
      this.stream = stream;
      this.reader = stream.getReader();
    }
    get position() {
      return __privateGet(this, _position);
    }
    iterateExactly(length) {
      let state = __privateGet(this, _buffered) ? 0 : 1;
      return {
        next: () => {
          switch (state) {
            case 0: {
              const value = __privateMethod(this, _BufferedReadableStream_instances, readBuffered_fn).call(this, length);
              if (value.length === length) {
                state = 2;
              } else {
                length -= value.length;
                state = 1;
              }
              return { done: false, value };
            }
            case 1:
              state = 3;
              return {
                done: false,
                value: __privateMethod(this, _BufferedReadableStream_instances, readSource_fn).call(this, length).then((value) => {
                  if (value.length === length) {
                    state = 2;
                  } else {
                    length -= value.length;
                    state = 1;
                  }
                  return value;
                })
              };
            case 2:
              return { done: true, value: void 0 };
            case 3:
              throw new Error("Can't call `next` before previous Promise resolves");
            default:
              throw new Error("unreachable");
          }
        }
      };
    }
    /**
     * Return a readable stream with unconsumed data (if any) and
     * all data from the wrapped stream.
     * @returns A `ReadableStream`
     */
    release() {
      if (__privateGet(this, _bufferedLength) > 0) {
        return new PushReadableStream(async (controller) => {
          const buffered = __privateGet(this, _buffered).subarray(__privateGet(this, _bufferedOffset));
          await controller.enqueue(buffered);
          controller.abortSignal.addEventListener("abort", () => {
            void tryCancel(this.reader);
          });
          while (true) {
            const { done, value } = await this.reader.read();
            if (done) {
              return;
            }
            await controller.enqueue(value);
          }
        });
      } else {
        this.reader.releaseLock();
        return this.stream;
      }
    }
    async cancel(reason) {
      await this.reader.cancel(reason);
    }
  };
  _buffered = new WeakMap();
  _bufferedOffset = new WeakMap();
  _bufferedLength = new WeakMap();
  _position = new WeakMap();
  _BufferedReadableStream_instances = new WeakSet();
  readBuffered_fn = function(length) {
    if (!__privateGet(this, _buffered)) {
      return void 0;
    }
    const value = __privateGet(this, _buffered).subarray(__privateGet(this, _bufferedOffset), __privateGet(this, _bufferedOffset) + length);
    if (__privateGet(this, _bufferedLength) > length) {
      __privateSet(this, _position, __privateGet(this, _position) + length);
      __privateSet(this, _bufferedOffset, __privateGet(this, _bufferedOffset) + length);
      __privateSet(this, _bufferedLength, __privateGet(this, _bufferedLength) - length);
      return value;
    }
    __privateSet(this, _position, __privateGet(this, _position) + __privateGet(this, _bufferedLength));
    __privateSet(this, _buffered, void 0);
    __privateSet(this, _bufferedOffset, 0);
    __privateSet(this, _bufferedLength, 0);
    return value;
  };
  readSource_fn = async function(length) {
    const { done, value } = await this.reader.read();
    if (done) {
      throw new ExactReadableEndedError();
    }
    if (value.length > length) {
      __privateSet(this, _buffered, value);
      __privateSet(this, _bufferedOffset, length);
      __privateSet(this, _bufferedLength, value.length - length);
      __privateSet(this, _position, __privateGet(this, _position) + length);
      return value.subarray(0, length);
    }
    __privateSet(this, _position, __privateGet(this, _position) + value.length);
    return value;
  };

  // node_modules/@yume-chan/stream-extra/esm/buffered-transform.js
  var _readable, _writable;
  var BufferedTransformStream = class {
    constructor(transform) {
      __privateAdd(this, _readable);
      __privateAdd(this, _writable);
      let bufferedStreamController;
      let writableStreamController;
      const buffered = new BufferedReadableStream(new PushReadableStream((controller) => {
        bufferedStreamController = controller;
      }));
      __privateSet(this, _readable, new ReadableStream({
        async pull(controller) {
          try {
            const value = await transform(buffered);
            controller.enqueue(value);
          } catch (e) {
            if (e instanceof StructEmptyError) {
              controller.close();
              return;
            }
            throw e;
          }
        },
        cancel: (reason) => {
          return writableStreamController.error(reason);
        }
      }));
      __privateSet(this, _writable, new WritableStream({
        start(controller) {
          writableStreamController = controller;
        },
        async write(chunk) {
          await bufferedStreamController.enqueue(chunk);
        },
        abort() {
          bufferedStreamController.close();
        },
        close() {
          bufferedStreamController.close();
        }
      }));
    }
    get readable() {
      return __privateGet(this, _readable);
    }
    get writable() {
      return __privateGet(this, _writable);
    }
  };
  _readable = new WeakMap();
  _writable = new WeakMap();

  // node_modules/@yume-chan/stream-extra/esm/concat.js
  var _result, _resolver, _writable2, _readableController, _readable2;
  var ConcatStringStream = class {
    constructor() {
      // PERF: rope (concat strings) is faster than `[].join('')`
      __privateAdd(this, _result, "");
      __privateAdd(this, _resolver, new PromiseResolver());
      __privateAdd(this, _writable2, new WritableStream({
        write: (chunk) => {
          __privateSet(this, _result, __privateGet(this, _result) + chunk);
        },
        close: () => {
          __privateGet(this, _resolver).resolve(__privateGet(this, _result));
          __privateGet(this, _readableController).enqueue(__privateGet(this, _result));
          __privateGet(this, _readableController).close();
        },
        abort: (reason) => {
          __privateGet(this, _resolver).reject(reason);
          __privateGet(this, _readableController).error(reason);
        }
      }));
      __privateAdd(this, _readableController);
      __privateAdd(this, _readable2, new ReadableStream({
        start: (controller) => {
          __privateSet(this, _readableController, controller);
        }
      }));
      void Object.defineProperties(__privateGet(this, _readable2), {
        then: {
          get: () => __privateGet(this, _resolver).promise.then.bind(__privateGet(this, _resolver).promise)
        },
        catch: {
          get: () => __privateGet(this, _resolver).promise.catch.bind(__privateGet(this, _resolver).promise)
        },
        finally: {
          get: () => __privateGet(this, _resolver).promise.finally.bind(__privateGet(this, _resolver).promise)
        }
      });
    }
    get writable() {
      return __privateGet(this, _writable2);
    }
    get readable() {
      return __privateGet(this, _readable2);
    }
  };
  _result = new WeakMap();
  _resolver = new WeakMap();
  _writable2 = new WeakMap();
  _readableController = new WeakMap();
  _readable2 = new WeakMap();
  var _segments, _resolver2, _writable3, _readableController2, _readable3;
  var ConcatBufferStream = class {
    constructor() {
      __privateAdd(this, _segments, []);
      __privateAdd(this, _resolver2, new PromiseResolver());
      __privateAdd(this, _writable3, new WritableStream({
        write: (chunk) => {
          __privateGet(this, _segments).push(chunk);
        },
        close: () => {
          let result;
          let offset = 0;
          switch (__privateGet(this, _segments).length) {
            case 0:
              result = EmptyUint8Array;
              break;
            case 1:
              result = __privateGet(this, _segments)[0];
              break;
            default:
              result = new Uint8Array(__privateGet(this, _segments).reduce((prev, item) => prev + item.length, 0));
              for (const segment of __privateGet(this, _segments)) {
                result.set(segment, offset);
                offset += segment.length;
              }
              break;
          }
          __privateGet(this, _resolver2).resolve(result);
          __privateGet(this, _readableController2).enqueue(result);
          __privateGet(this, _readableController2).close();
        },
        abort: (reason) => {
          __privateGet(this, _resolver2).reject(reason);
          __privateGet(this, _readableController2).error(reason);
        }
      }));
      __privateAdd(this, _readableController2);
      __privateAdd(this, _readable3, new ReadableStream({
        start: (controller) => {
          __privateSet(this, _readableController2, controller);
        }
      }));
      void Object.defineProperties(__privateGet(this, _readable3), {
        then: {
          get: () => __privateGet(this, _resolver2).promise.then.bind(__privateGet(this, _resolver2).promise)
        },
        catch: {
          get: () => __privateGet(this, _resolver2).promise.catch.bind(__privateGet(this, _resolver2).promise)
        },
        finally: {
          get: () => __privateGet(this, _resolver2).promise.finally.bind(__privateGet(this, _resolver2).promise)
        }
      });
    }
    get writable() {
      return __privateGet(this, _writable3);
    }
    get readable() {
      return __privateGet(this, _readable3);
    }
  };
  _segments = new WeakMap();
  _resolver2 = new WeakMap();
  _writable3 = new WeakMap();
  _readableController2 = new WeakMap();
  _readable3 = new WeakMap();

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
  var _task, _resolver3;
  var Consumable = class {
    constructor(value) {
      __privateAdd(this, _task);
      __privateAdd(this, _resolver3);
      __publicField(this, "value");
      __publicField(this, "consumed");
      __privateSet(this, _task, createTask("Consumable"));
      this.value = value;
      __privateSet(this, _resolver3, new PromiseResolver());
      this.consumed = __privateGet(this, _resolver3).promise;
    }
    consume() {
      __privateGet(this, _resolver3).resolve();
    }
    error(error) {
      __privateGet(this, _resolver3).reject(error);
    }
    tryConsume(callback) {
      try {
        let result = __privateGet(this, _task).run(() => callback(this.value));
        if (isPromiseLike(result)) {
          result = result.then((value) => {
            __privateGet(this, _resolver3).resolve();
            return value;
          }, (e) => {
            __privateGet(this, _resolver3).reject(e);
            throw e;
          });
        } else {
          __privateGet(this, _resolver3).resolve();
        }
        return result;
      } catch (e) {
        __privateGet(this, _resolver3).reject(e);
        throw e;
      }
    }
  };
  _task = new WeakMap();
  _resolver3 = new WeakMap();
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

  // node_modules/@yume-chan/stream-extra/esm/distribution.js
  var _capacity, _buffer, _offset, _available;
  var BufferCombiner = class {
    constructor(size) {
      __privateAdd(this, _capacity);
      __privateAdd(this, _buffer);
      __privateAdd(this, _offset);
      __privateAdd(this, _available);
      __privateSet(this, _capacity, size);
      __privateSet(this, _buffer, new Uint8Array(size));
      __privateSet(this, _offset, 0);
      __privateSet(this, _available, size);
    }
    /**
     * Pushes data to the combiner.
     * @param data The input data to be split or combined.
     * @returns
     * A generator that yields buffers of specified size.
     * It may yield the same buffer multiple times, consume the data before calling `next`.
     */
    *push(data) {
      let offset = 0;
      let available = data.length;
      if (__privateGet(this, _offset) !== 0) {
        if (available >= __privateGet(this, _available)) {
          __privateGet(this, _buffer).set(data.subarray(0, __privateGet(this, _available)), __privateGet(this, _offset));
          offset += __privateGet(this, _available);
          available -= __privateGet(this, _available);
          yield __privateGet(this, _buffer);
          __privateSet(this, _offset, 0);
          __privateSet(this, _available, __privateGet(this, _capacity));
          if (available === 0) {
            return;
          }
        } else {
          __privateGet(this, _buffer).set(data, __privateGet(this, _offset));
          __privateSet(this, _offset, __privateGet(this, _offset) + available);
          __privateSet(this, _available, __privateGet(this, _available) - available);
          return;
        }
      }
      while (available >= __privateGet(this, _capacity)) {
        const end = offset + __privateGet(this, _capacity);
        yield data.subarray(offset, end);
        offset = end;
        available -= __privateGet(this, _capacity);
      }
      if (available > 0) {
        __privateGet(this, _buffer).set(data.subarray(offset), __privateGet(this, _offset));
        __privateSet(this, _offset, __privateGet(this, _offset) + available);
        __privateSet(this, _available, __privateGet(this, _available) - available);
      }
    }
    flush() {
      if (__privateGet(this, _offset) === 0) {
        return void 0;
      }
      const output = __privateGet(this, _buffer).subarray(0, __privateGet(this, _offset));
      __privateSet(this, _offset, 0);
      __privateSet(this, _available, __privateGet(this, _capacity));
      return output;
    }
  };
  _capacity = new WeakMap();
  _buffer = new WeakMap();
  _offset = new WeakMap();
  _available = new WeakMap();
  var DistributionStream = class extends TransformStream {
    constructor(size, combine = false) {
      const combiner = combine ? new BufferCombiner(size) : void 0;
      super({
        async transform(chunk, controller) {
          await maybe_consumable_exports.tryConsume(chunk, async (chunk2) => {
            if (combiner) {
              for (const buffer of combiner.push(chunk2)) {
                await Consumable.ReadableStream.enqueue(controller, buffer);
              }
            } else {
              let offset = 0;
              let available = chunk2.length;
              while (available > 0) {
                const end = offset + size;
                await Consumable.ReadableStream.enqueue(controller, chunk2.subarray(offset, end));
                offset = end;
                available -= size;
              }
            }
          });
        },
        flush(controller) {
          if (combiner) {
            const data = combiner.flush();
            if (data) {
              controller.enqueue(data);
            }
          }
        }
      });
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

  // node_modules/@yume-chan/stream-extra/esm/encoding.js
  var Global = globalThis;
  var TextDecoderStream = Global.TextDecoderStream;
  var TextEncoderStream = Global.TextEncoderStream;

  // node_modules/@yume-chan/stream-extra/esm/inspect.js
  var InspectStream = class extends TransformStream {
    constructor(callback) {
      super({
        transform(chunk, controller) {
          callback(chunk);
          controller.enqueue(chunk);
        }
      });
    }
  };

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

  // node_modules/@yume-chan/stream-extra/esm/split-string.js
  var SplitStringStream = class extends TransformStream {
    constructor(separator) {
      let remaining = void 0;
      super({
        transform(chunk, controller) {
          if (remaining) {
            chunk = remaining + chunk;
            remaining = void 0;
          }
          let start = 0;
          while (start < chunk.length) {
            const index = chunk.indexOf(separator, start);
            if (index === -1) {
              remaining = chunk.substring(start);
              break;
            }
            controller.enqueue(chunk.substring(start, index));
            start = index + 1;
          }
        },
        flush(controller) {
          if (remaining) {
            controller.enqueue(remaining);
          }
        }
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/struct-deserialize.js
  var StructDeserializeStream = class extends BufferedTransformStream {
    constructor(struct) {
      super((stream) => {
        return struct.deserialize(stream);
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/struct-serialize.js
  var StructSerializeStream = class extends TransformStream {
    constructor(struct) {
      super({
        transform(chunk, controller) {
          controller.enqueue(struct.serialize(chunk));
        }
      });
    }
  };

  // node_modules/@yume-chan/stream-extra/esm/wrap-writable.js
  async function getWrappedWritableStream(start) {
    if ("start" in start) {
      return await start.start();
    } else if (typeof start === "function") {
      return await start();
    } else {
      return start;
    }
  }
  var _writer;
  var _WrapWritableStream = class _WrapWritableStream extends WritableStream {
    constructor(start) {
      super({
        start: async () => {
          const writable = await getWrappedWritableStream(start);
          this.writable = writable;
          __privateSet(this, _writer, this.writable.getWriter());
        },
        write: async (chunk) => {
          await __privateGet(this, _writer).write(chunk);
        },
        abort: async (reason) => {
          await __privateGet(this, _writer).abort(reason);
          if (start !== this.writable && "close" in start) {
            await start.close?.();
          }
        },
        close: async () => {
          await __privateGet(this, _writer).close();
          if (start !== this.writable && "close" in start) {
            await start.close?.();
          }
        }
      });
      __publicField(this, "writable");
      __privateAdd(this, _writer);
    }
    bePipedThroughFrom(transformer) {
      let promise;
      return new _WrapWritableStream({
        start: () => {
          promise = transformer.readable.pipeTo(this);
          return transformer.writable;
        },
        async close() {
          await promise;
        }
      });
    }
  };
  _writer = new WeakMap();
  var WrapWritableStream = _WrapWritableStream;
})();
//# sourceMappingURL=stream-extra.js.map
