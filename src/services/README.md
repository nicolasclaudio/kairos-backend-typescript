# Services Layer

Este directorio contiene los casos de uso de la aplicación:

- **Task Service**: Gestión de tareas (crear, actualizar, completar)
- **Goal Service**: Gestión de metas
- **User Service**: Gestión de usuarios
- **Planning Service**: Planificación y scheduling

## Estructura sugerida

```
services/
├── task.service.ts
├── goal.service.ts
├── user.service.ts
└── planning.service.ts
```

Cada servicio orquesta la lógica de negocio utilizando:
- Los repositorios (infrastructure)
- La lógica pura (core)
- Los tipos del dominio (domain)
