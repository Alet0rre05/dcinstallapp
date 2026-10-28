const DB_NAME = "dcinstall-mobile";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache", { keyPath: "key" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStore(name, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    action(tx.objectStore(name));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export const offlineUserId = () => localStorage.getItem("dci_user_id") || "anon";
const cacheKey = (key) => `${offlineUserId()}:${key}`;

export async function cacheRead(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("cache").objectStore("cache").get(cacheKey(key));
    request.onsuccess = () => { db.close(); resolve(request.result?.value); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function cacheWrite(key, value) {
  return writeStore("cache", (store) => store.put({ key: cacheKey(key), value, savedAt: Date.now() }));
}

export async function guardarControlPendiente(body) {
  const id = body.idempotency_key || crypto.randomUUID();
  await writeStore("queue", (store) => store.put({ id, userId: offlineUserId(), body: { ...body, idempotency_key: id }, createdAt: new Date().toISOString(), status: "pending", error: "" }));
  window.dispatchEvent(new Event("dci-sync-updated"));
  return { id, offline_pending: true };
}

export async function pendientes() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("queue").objectStore("queue").getAll();
    request.onsuccess = () => { db.close(); resolve((request.result || []).filter((x) => x.userId === offlineUserId())); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function syncPendingControls(postControl) {
  if (!navigator.onLine) return { synced: 0, pending: (await pendientes()).length };
  const queue = await pendientes();
  let synced = 0;
  for (const item of queue) {
    try {
      await postControl(item.body);
      await writeStore("queue", (store) => store.delete(item.id));
      synced += 1;
    } catch (error) {
      if (!error.status || error.status >= 500) break;
      await writeStore("queue", (store) => store.put({ ...item, status: "error", error: error.message }));
    }
  }
  window.dispatchEvent(new Event("dci-sync-updated"));
  return { synced, pending: (await pendientes()).length };
}

export async function guardarConjuntoOffline(data) {
  await cacheWrite("/mobile/offline-dataset/", data);
  return data;
}

export async function limpiarDatosOffline() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["cache", "queue"], "readwrite");
    tx.objectStore("cache").clear();
    const queue = tx.objectStore("queue");
    const request = queue.getAll();
    request.onsuccess = () => request.result.filter((x) => x.userId === offlineUserId()).forEach((x) => queue.delete(x.id));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function limpiarCacheOfflineUsuario() {
  const prefijo = `${offlineUserId()}:`;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache", "readwrite");
    const store = tx.objectStore("cache");
    const request = store.getAllKeys();
    request.onsuccess = () => request.result.filter((key) => String(key).startsWith(prefijo)).forEach((key) => store.delete(key));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
