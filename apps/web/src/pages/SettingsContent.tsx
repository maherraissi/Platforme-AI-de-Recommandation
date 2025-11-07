import { useState } from 'react'
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap'
import { getConfig, setConfig } from '../lib/config'

export default function SettingsContent() {
  const initial = getConfig()
  const [apiBase, setApiBase] = useState(initial.apiBase)
  const [mlBase, setMlBase] = useState(initial.mlBase)
  const [saved, setSaved] = useState(false)

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    setConfig({ apiBase, mlBase })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Row>
      <Col md={8}>
        <Card>
          <Card.Body>
            <Card.Title>Paramètres</Card.Title>
            <Form onSubmit={onSave}>
              <Form.Group className="mb-3">
                <Form.Label>API Base URL</Form.Label>
                <Form.Control value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="http://localhost:3001" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>ML Base URL</Form.Label>
                <Form.Control value={mlBase} onChange={e => setMlBase(e.target.value)} placeholder="http://localhost:8000" />
              </Form.Group>
              <Button type="submit" variant="primary">Enregistrer</Button>
            </Form>
            {saved && <Alert className="mt-3" variant="success">Sauvegardé</Alert>}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}


