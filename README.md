# Noyer

Plug design pour la validation de la V1

## Lancer toute l'application (Docker Compose)

```
cp .env.example .env   # puis remplacer les mots de passe et la clé secrète
docker compose up --build
```

- Front : http://localhost:3000, API : http://localhost:8000/api (santé : `/api/health/`).
- Services : `mariadb`, `redis`, `back` (migrate, collectstatic, gunicorn), `worker`, `front`.
- Volumes persistants : `mariadb_data` (données), `media` (photos téléversées), `redis_data`.
  `docker compose down` les conserve ; seul `docker compose down -v` les supprime.
