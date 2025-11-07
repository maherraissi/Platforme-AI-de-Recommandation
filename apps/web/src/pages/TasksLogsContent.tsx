import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Card, Button, Row, Col, ProgressBar, Table, Badge, Spinner } from 'react-bootstrap'
import { getConfig } from '../lib/config'

type Task = { id: string; type: 'reindex-ml'; status: 'queued'|'running'|'completed'|'failed'|'cancelled'; progress: number; createdAt: string; updatedAt: string; error?: string }
type LogsResponse = { items: { ts: string; level: 'info'|'error'; message: string; meta?: any }[] }

export default function TasksLogsContent() {
  const { apiBase } = getConfig()
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [logs, setLogs] = useState<LogsResponse['items']>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  const fetchLogs = async () => {
    const { data } = await axios.get<LogsResponse>(`${apiBase}/logs`)
    setLogs(data.items.reverse())
  }

  const pollTask = async (id: string) => {
    const { data } = await axios.get<{ ok: boolean; task: Task }>(`${apiBase}/tasks/${id}`)
    setCurrentTask(data.task)
  }

  const startReindex = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post<{ ok: boolean; id: string }>(`${apiBase}/tasks/reindex-ml`)
      setCurrentTask({ id: data.id, type: 'reindex-ml', status: 'queued', progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      timerRef.current = window.setInterval(async () => {
        await pollTask(data.id)
      }, 800)
    } finally {
      setLoading(false)
    }
  }

  const cancelTask = async () => {
    if (!currentTask) return
    await axios.post(`${apiBase}/tasks/${currentTask.id}/cancel`)
    await pollTask(currentTask.id)
  }

  useEffect(() => {
    fetchLogs()
    const logTimer = window.setInterval(fetchLogs, 3000)
    return () => {
      window.clearInterval(logTimer)
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [apiBase])

  const t = currentTask
  return (
    <Row className="g-3">
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Tâche d'indexation ML</Card.Title>
            <div className="d-flex gap-2">
              <Button onClick={startReindex} disabled={!!t && (t.status==='running'||t.status==='queued') || loading}>
                {loading ? <Spinner size="sm" /> : 'Démarrer reindex'}
              </Button>
              <Button variant="outline-danger" onClick={cancelTask} disabled={!t || (t.status!=='running' && t.status!=='queued')}>Annuler</Button>
            </div>
            <div className="mt-3">
              {t ? (
                <>
                  <div className="d-flex justify-content-between">
                    <div>Status: <Badge bg={t.status==='completed'?'success':t.status==='failed'?'danger':t.status==='cancelled'?'secondary':'warning'}>{t.status}</Badge></div>
                    <div>{t.progress}%</div>
                  </div>
                  <ProgressBar className="mt-2" now={t.progress} animated={t.status==='running'||t.status==='queued'} />
                </>
              ) : (
                <div className="text-muted">Aucune tâche en cours</div>
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Logs récents</Card.Title>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <Table size="sm" hover>
                <thead>
                  <tr><th>Heure</th><th>Niveau</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {logs.map((l, idx) => (
                    <tr key={idx}>
                      <td>{new Date(l.ts).toLocaleTimeString()}</td>
                      <td><Badge bg={l.level==='error'?'danger':'secondary'}>{l.level}</Badge></td>
                      <td>{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}


