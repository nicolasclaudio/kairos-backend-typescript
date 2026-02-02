# Infrastructure Layer

Este directorio contiene las implementaciones concretas de:

- **Repositorios**: Implementaciones de acceso a datos (Postgres)
- **APIs Externas**: Integraciones con servicios externos (Telegram Bot API)
- **Adaptadores**: Implementaciones de interfaces del dominio

## Estructura sugerida

```
infrastructure/
├── repositories/
│   ├── user.repository.ts
│   ├── task.repository.ts
│   └── goal.repository.ts
├── telegram/
│   ├── telegram.client.ts
│   └── telegram.handlers.ts
└── database/
    └── postgres.client.ts
```
