import type { User } from './types'

export const users: User[] = [
  {
    id: 'user-001',
    name: 'Adrian Nastase',
    email: 'adrian@asns.ro',
    avatar: undefined,
    role: 'admin',
    businessLines: ['all'],
    initials: 'AN',
  },
  {
    id: 'user-002',
    name: 'Maria Popescu',
    email: 'maria@asns.ro',
    avatar: undefined,
    role: 'manager',
    businessLines: ['agency', 'fudly'],
    initials: 'MP',
  },
  {
    id: 'user-003',
    name: 'Ion Dumitrescu',
    email: 'ion@asns.ro',
    avatar: undefined,
    role: 'operator',
    businessLines: ['climaticpro'],
    initials: 'ID',
  },
  {
    id: 'user-004',
    name: 'Elena Vasilescu',
    email: 'elena@asns.ro',
    avatar: undefined,
    role: 'viewer',
    businessLines: ['all'],
    initials: 'EV',
  },
]

export const currentUser = users[0]!
