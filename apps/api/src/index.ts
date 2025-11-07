import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client as PgClient } from 'pg';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Helpers to check services
async function checkPostgres() {
  const client = new PgClient({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'app',
    password: process.env.PGPASSWORD || 'app',
    database: process.env.PGDATABASE || 'app',
  });
  try {
    await client.connect();
    const result = await client.query('SELECT 1 as ok');
    await client.end();
    return { ok: true, detail: result.rows[0] };
  } catch (err: unknown) {
    try { await client.end(); } catch {}
    return { ok: false, error: (err as Error).message };
  }
}

async function checkRedis() {
  const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379) });
  try {
    const pong = await redis.ping();
    await redis.quit();
    return { ok: pong === 'PONG' };
  } catch (err: unknown) {
    try { await redis.quit(); } catch {}
    return { ok: false, error: (err as Error).message };
  }
}

async function checkMinio() {
  const minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minio',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio12345',
  });
  try {
    const buckets = await minio.listBuckets();
    return { ok: true, buckets: buckets.map(b => b.name) };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkML() {
  const url = process.env.ML_BASE_URL || 'http://localhost:8000/health';
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { ok: Boolean(data?.ok) };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

app.get('/status', async (_req, res) => {
  const [db, redis, minio, ml] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
    checkML(),
  ]);
  res.json({ db, redis, minio, ml, timestamp: new Date().toISOString() });
});

// Simple in-memory log buffer
type LogItem = { ts: string; level: 'info' | 'error'; message: string; meta?: unknown }
const logs: LogItem[] = []
function addLog(level: LogItem['level'], message: string, meta?: unknown) {
  logs.push({ ts: new Date().toISOString(), level, message, meta })
  if (logs.length > 500) logs.splice(0, logs.length - 500)
}

// Measure latency helpers
async function measure<T>(label: string, fn: () => Promise<T>) {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    return { ok: true, ms, result }
  } catch (err: unknown) {
    const ms = Date.now() - start
    return { ok: false, ms, error: (err as Error).message }
  }
}

// CPU usage snapshot for process-level percent between requests
let lastCpu = { usage: process.cpuUsage(), time: Date.now() }

app.get('/metrics', async (_req, res) => {
  const [db, redis, minio, ml] = await Promise.all([
    measure('db', checkPostgres),
    measure('redis', checkRedis),
    measure('minio', checkMinio),
    measure('ml', checkML),
  ]);
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const processMem = process.memoryUsage()
  const now = Date.now()
  const cur = process.cpuUsage()
  const deltaUser = cur.user - lastCpu.usage.user
  const deltaSys = cur.system - lastCpu.usage.system
  const elapsedMs = Math.max(1, now - lastCpu.time)
  // cpuUsage is in microseconds; percent per core-equivalent
  const processCpuPercent = ((deltaUser + deltaSys) / 1000) / elapsedMs * 100
  lastCpu = { usage: cur, time: now }
  const cores = os.cpus()?.length || 1
  const load = os.loadavg?.() || [0,0,0]
  res.json({
    latencies: { db: db.ms, redis: redis.ms, minio: minio.ms, ml: ml.ms },
    system: {
      uptimeSec: Math.floor(process.uptime()),
      totalMem,
      freeMem,
      usedMem,
      processRss: processMem.rss,
      processHeapUsed: processMem.heapUsed,
      processCpuPercent,
      cores,
      load1: load[0],
      load5: load[1],
      load15: load[2],
    },
    timestamp: new Date().toISOString(),
  })
})

app.get('/logs', (_req, res) => {
  res.json({ items: logs.slice(-200) })
})

// Actions
app.post('/actions/flush-cache', async (_req, res) => {
  const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379) });
  try {
    const result = await redis.flushall();
    await redis.quit();
    addLog('info', 'Redis cache flushed')
    res.json({ ok: true, result });
  } catch (err: unknown) {
    try { await redis.quit(); } catch {}
    addLog('error', 'Redis flush failed', { error: (err as Error).message })
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post('/actions/reindex', async (_req, res) => {
  // Placeholder: call ML service to (re)build embeddings/index
  try {
    const mlBase = (process.env.ML_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const resp = await fetch(`${mlBase}/reindex`, { method: 'POST' });
    const data = await resp.json().catch(() => ({}));
    addLog('info', 'ML reindex triggered via passthrough', { ok: resp.ok })
    res.json({ ok: resp.ok, data });
  } catch (err: unknown) {
    addLog('error', 'ML reindex failed', { error: (err as Error).message })
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post('/actions/seed', async (_req, res) => {
  // Placeholder: implement DB seed logic here (Prisma or SQL)
  res.json({ ok: true, message: 'Seed executed (placeholder)' });
});

app.post('/actions/minio-test-bucket', async (_req, res) => {
  const minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minio',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio12345',
  });
  const bucket = process.env.MINIO_BUCKET || 'uploads';
  try {
    const exists = await minio.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await minio.makeBucket(bucket, 'us-east-1');
    }
    addLog('info', 'MinIO bucket ensured', { bucket })
    res.json({ ok: true, bucket });
  } catch (err: unknown) {
    addLog('error', 'MinIO bucket ensure failed', { error: (err as Error).message })
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Simple simulated task queue for ML reindex
type Task = { id: string; type: 'reindex-ml'; status: 'queued'|'running'|'completed'|'failed'|'cancelled'; progress: number; createdAt: string; updatedAt: string; error?: string }
const tasks = new Map<string, Task>()

app.post('/tasks/reindex-ml', async (_req, res) => {
  const id = Math.random().toString(36).slice(2)
  const now = new Date().toISOString()
  const task: Task = { id, type: 'reindex-ml', status: 'queued', progress: 0, createdAt: now, updatedAt: now }
  tasks.set(id, task)
  addLog('info', 'Task created', { id, type: task.type })

  // attempt to trigger real ML reindex endpoint in background
  ;(async () => {
    try {
      const mlBase = (process.env.ML_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
      const resp = await fetch(`${mlBase}/reindex`, { method: 'POST' })
      const data = await resp.json().catch(() => ({} as any))
      addLog('info', 'ML reindex invoked', { ok: resp.ok, data })
    } catch (e: unknown) {
      addLog('error', 'ML reindex invocation failed', { error: (e as Error).message })
    }
  })()

  // simulate progress
  setTimeout(() => {
    const t = tasks.get(id)
    if (!t) return
    t.status = 'running'; t.updatedAt = new Date().toISOString(); tasks.set(id, t)
    let p = 0
    const interval = setInterval(() => {
      const cur = tasks.get(id)
      if (!cur || cur.status !== 'running') { clearInterval(interval); return }
      p += Math.floor(Math.random()*15) + 5
      cur.progress = Math.min(100, p)
      cur.updatedAt = new Date().toISOString()
      if (cur.progress >= 100) { cur.status = 'completed'; clearInterval(interval) }
      tasks.set(id, cur)
    }, 800)
  }, 300)

  res.status(202).json({ ok: true, id })
})

app.get('/tasks/:id', (req, res) => {
  const t = tasks.get(req.params.id)
  if (!t) return res.status(404).json({ ok: false, error: 'Not found' })
  res.json({ ok: true, task: t })
})

app.post('/tasks/:id/cancel', (req, res) => {
  const t = tasks.get(req.params.id)
  if (!t) return res.status(404).json({ ok: false, error: 'Not found' })
  if (t.status === 'running' || t.status === 'queued') {
    t.status = 'cancelled'; t.updatedAt = new Date().toISOString(); tasks.set(t.id, t)
    addLog('info', 'Task cancelled', { id: t.id })
  }
  res.json({ ok: true, task: t })
})

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`[api] listening on ${port}`));
