import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap'
import { getConfig } from '../lib/config'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

type ServiceStatus = { ok: boolean }
type StatusResponse = { db: ServiceStatus; redis: ServiceStatus; minio: ServiceStatus; ml: ServiceStatus; timestamp: string }
type MetricsResponse = { latencies: { db: number; redis: number; minio: number; ml: number }, system: { uptimeSec: number; totalMem: number; freeMem: number; usedMem: number; processRss: number; processHeapUsed: number; processCpuPercent: number; cores: number; load1: number; load5: number; load15: number }, timestamp: string }

export default function MetricsContent() {
  const { apiBase } = getConfig()
  const [history, setHistory] = useState<StatusResponse[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)
  const [metricsHistory, setMetricsHistory] = useState<MetricsResponse[]>([])

  const fetchOnce = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get<StatusResponse>(`${apiBase}/status`)
      setHistory(prev => [...prev.slice(-60), data])
      const { data: m } = await axios.get<MetricsResponse>(`${apiBase}/metrics`)
      setMetricsHistory(prev => [...prev.slice(-60), m])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOnce()
    timerRef.current = window.setInterval(fetchOnce, 5000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [apiBase])

  const labels = useMemo(() => history.map(h => new Date(h.timestamp).toLocaleTimeString()), [history])
  const toNum = (ok: boolean) => (ok ? 1 : 0)

  const data = useMemo(() => ({
    labels,
    datasets: [
      { label: 'Postgres', data: history.map(h => toNum(h.db.ok)), borderColor: '#198754' },
      { label: 'Redis', data: history.map(h => toNum(h.redis.ok)), borderColor: '#0d6efd' },
      { label: 'MinIO', data: history.map(h => toNum(h.minio.ok)), borderColor: '#6f42c1' },
      { label: 'ML', data: history.map(h => toNum(h.ml.ok)), borderColor: '#fd7e14' },
    ],
  }), [history, labels])

  const options = { responsive: true, scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } } }

  const latest = history.at(-1)
  const latencyLabels = useMemo(() => metricsHistory.map(m => new Date(m.timestamp).toLocaleTimeString()), [metricsHistory])
  const latencyData = useMemo(() => ({
    labels: latencyLabels,
    datasets: [
      { label: 'DB ms', data: metricsHistory.map(m => m.latencies.db), borderColor: '#198754' },
      { label: 'Redis ms', data: metricsHistory.map(m => m.latencies.redis), borderColor: '#0d6efd' },
      { label: 'MinIO ms', data: metricsHistory.map(m => m.latencies.minio), borderColor: '#6f42c1' },
      { label: 'ML ms', data: metricsHistory.map(m => m.latencies.ml), borderColor: '#fd7e14' },
    ],
  }), [metricsHistory, latencyLabels])
  const cpuMemLabels = latencyLabels
  const cpuData = useMemo(() => ({
    labels: cpuMemLabels,
    datasets: [
      { label: 'CPU % (process)', data: metricsHistory.map(m => Number(m.system.processCpuPercent?.toFixed?.(2) ?? 0)), borderColor: '#dc3545' },
      { label: 'Load1 / cores', data: metricsHistory.map(m => m.system.cores ? (m.system.load1 / m.system.cores) * 100 : 0), borderColor: '#20c997' },
    ],
  }), [metricsHistory, cpuMemLabels])
  const memData = useMemo(() => ({
    labels: cpuMemLabels,
    datasets: [
      { label: 'RSS (MB)', data: metricsHistory.map(m => Math.round(m.system.processRss / 1024 / 1024)), borderColor: '#6610f2' },
      { label: 'Used Mem (GB)', data: metricsHistory.map(m => Number((m.system.usedMem / 1024 / 1024 / 1024).toFixed(2))), borderColor: '#0dcaf0' },
    ],
  }), [metricsHistory, cpuMemLabels])

  return (
    <>
      <Row className="mb-3">
        <Col><h3>Métriques de disponibilité</h3></Col>
        <Col xs="auto"><Button onClick={fetchOnce} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Rafraîchir'}</Button></Col>
      </Row>
      <Card className="mb-3">
        <Card.Body>
          <Line data={data} options={options as any} />
        </Card.Body>
      </Card>
      <Row className="mb-3">
        <Col><h3>Latence (ms)</h3></Col>
      </Row>
      <Card className="mb-3">
        <Card.Body>
          <Line data={latencyData} options={{ responsive: true } as any} />
        </Card.Body>
      </Card>
      <Row className="mb-3"><Col><h3>CPU</h3></Col></Row>
      <Card className="mb-3"><Card.Body><Line data={cpuData} options={{ responsive: true } as any} /></Card.Body></Card>
      <Row className="mb-3"><Col><h3>Mémoire</h3></Col></Row>
      <Card className="mb-3"><Card.Body><Line data={memData} options={{ responsive: true } as any} /></Card.Body></Card>
      <Row className="g-3">
        <Col md={3}><Card><Card.Body>Postgres: {latest ? <Badge bg={latest.db.ok ? 'success' : 'danger'}>{latest.db.ok ? 'OK' : 'Down'}</Badge> : '—'}</Card.Body></Card></Col>
        <Col md={3}><Card><Card.Body>Redis: {latest ? <Badge bg={latest.redis.ok ? 'success' : 'danger'}>{latest.redis.ok ? 'OK' : 'Down'}</Badge> : '—'}</Card.Body></Card></Col>
        <Col md={3}><Card><Card.Body>MinIO: {latest ? <Badge bg={latest.minio.ok ? 'success' : 'danger'}>{latest.minio.ok ? 'OK' : 'Down'}</Badge> : '—'}</Card.Body></Card></Col>
        <Col md={3}><Card><Card.Body>ML: {latest ? <Badge bg={latest.ml.ok ? 'success' : 'danger'}>{latest.ml.ok ? 'OK' : 'Down'}</Badge> : '—'}</Card.Body></Card></Col>
      </Row>
    </>
  )
}


