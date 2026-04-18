# Contributing to Caldera

## Getting started

```bash
git clone https://github.com/7GMA/caldera.git
cd caldera
pnpm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up postgres -d
pnpm db:migrate
pnpm dev
```

## Conventions

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- TypeScript strict mode — no `any` without comment justification
- Tests for new provider logic (unit with mocked HTTP, see `src/tests/unit/`)

## PR checklist

- [ ] Tests added / updated
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Docs updated if public API changed
- [ ] Breaking changes listed in PR description

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
