import { Container, Nav, Navbar, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap'
import { Routes, Route, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { getConfig } from './lib/config'
import MetricsContent from './pages/MetricsContent'
import SettingsContent from './pages/SettingsContent'
import TasksLogsContent from './pages/TasksLogsContent'

type ServiceStatus = { ok: boolean; error?: string; [k: string]: unknown }
type StatusResponse = { db: ServiceStatus; redis: ServiceStatus; minio: ServiceStatus; ml: ServiceStatus; timestamp: string }

function StatusBadge({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return <Badge bg="secondary">—</Badge>
  return ok ? <Badge bg="success">OK</Badge> : <Badge bg="danger">Down</Badge>
}

function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { apiBase } = getConfig()

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get<StatusResponse>(`${apiBase}/status`)
      setStatus(data)
    } catch (e) {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const runAction = async (key: string, path: string) => {
    setActionLoading(key)
    try {
      await axios.post(`${apiBase}${path}`)
      await fetchStatus()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Container fluid className="py-3">
      <Row>
        <Col>
          <h2 className="mb-3">Dashboard de contrôle</h2>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={fetchStatus} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Rafraîchir'}
          </Button>
        </Col>
      </Row>
      <Row className="g-3">
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>PostgreSQL</Card.Title>
              <Card.Text>Base de données</Card.Text>
              <StatusBadge ok={status?.db?.ok} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Redis</Card.Title>
              <Card.Text>Cache / file d'attente</Card.Text>
              <StatusBadge ok={status?.redis?.ok} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>MinIO</Card.Title>
              <Card.Text>Stockage objets</Card.Text>
              <StatusBadge ok={status?.minio?.ok} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Service ML</Card.Title>
              <Card.Text>Embeddings / Reco</Card.Text>
              <StatusBadge ok={status?.ml?.ok} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Actions rapides</Card.Title>
              <div className="d-flex gap-2 flex-wrap">
                <Button variant="warning" disabled={actionLoading!==null} onClick={() => runAction('flush','/actions/flush-cache')}>
                  {actionLoading==='flush' ? '...' : 'Vider cache Redis'}
                </Button>
                <Button variant="info" disabled={actionLoading!==null} onClick={() => runAction('minio','/actions/minio-test-bucket')}>
                  {actionLoading==='minio' ? '...' : 'Créer bucket MinIO'}
                </Button>
                <Button variant="secondary" disabled={actionLoading!==null} onClick={() => runAction('seed','/actions/seed')}>
                  {actionLoading==='seed' ? '...' : 'Seeder la base'}
                </Button>
                <Button variant="primary" disabled={actionLoading!==null} onClick={() => runAction('reindex','/actions/reindex')}>
                  {actionLoading==='reindex' ? '...' : 'Reconstruire index ML'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Dernier statut</Card.Title>
              <div className="text-muted small">{status?.timestamp ? new Date(status.timestamp).toLocaleString() : '—'}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default function App() {
  return (
    <>
      <Navbar bg="dark" data-bs-theme="dark" expand="lg">
        <Container fluid>
          <Navbar.Brand as={Link} to="/">Plateforme IA</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/metrics">Métriques</Nav.Link>
            <Nav.Link as={Link} to="/settings">Paramètres</Nav.Link>
            <Nav.Link as={Link} to="/tasks">Tâches & Logs</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </>
  )
}

function Metrics() {
  return (
    <Container className="py-3">
      <MetricsContent />
    </Container>
  )
}

function Tasks() {
  return (
    <Container className="py-3">
      <TasksLogsContent />
    </Container>
  )
}

function Settings() {
  return (
    <Container className="py-3">
      <SettingsContent />
    </Container>
  )
}
