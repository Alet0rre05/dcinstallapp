#!/usr/bin/env bash
# Build de Render para el backend
set -o errexit

pip install -r requirements.txt

# Las migraciones se generan UNA vez en local y se commitean (ver README).
if ! ls apps/core/migrations/0001_*.py >/dev/null 2>&1; then
  echo "ERROR: faltan las migraciones de apps/core. Ejecutá 'python manage.py makemigrations core' en local y commitealas." >&2
  exit 1
fi

python manage.py collectstatic --no-input
python manage.py migrate --no-input
