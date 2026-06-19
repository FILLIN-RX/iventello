import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { User, Role } from '../../../shared/types'

export default function GestionUsers() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    window.api.auth.getUsers().then(setUsers)
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des utilisateurs</CardTitle>
        <Button>Nouvel utilisateur</Button>
      </CardHeader>
      <CardContent>
        {users.map(u => (
          <div key={u.id} className="flex justify-between border-b py-2">
            <span>{u.nom} {u.prenom} ({u.role})</span>
            <Button variant="outline" size="sm">Modifier</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
