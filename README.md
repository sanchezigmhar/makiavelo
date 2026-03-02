# MakiCore - Plataforma Integral Makiavelo

## Inicio Rápido

### Con Docker (Recomendado)
```bash
docker-compose up -d
```
- Frontend: http://localhost:4000
- Backend API: http://localhost:4001/api/v1
- PostgreSQL: localhost:5433
- Redis: localhost:6380

### Sin Docker

#### 1. Base de datos
Instalar PostgreSQL 16+ y Redis 7+, luego crear la BD:
```sql
CREATE DATABASE makicore;
```

#### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

#### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### Credenciales por defecto
- **Admin**: admin@makiavelo.com / admin123
- **PIN rápido**: 1234

## Stack Tecnológico
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand, Socket.IO
- **Backend**: NestJS, Prisma ORM, PostgreSQL, Redis, JWT
- **Infra**: Docker, AWS (ECS, RDS, S3)
