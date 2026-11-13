import sqlite3

from django.apps import AppConfig
from django.db.backends.signals import connection_created


def configure_sqlite_batches(sender, connection, **kwargs):
    if connection.vendor == "sqlite" and hasattr(connection.connection, "getlimit"):
        connection.features.max_query_params = connection.connection.getlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER)


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "DC INSTALL"

    def ready(self):
        connection_created.connect(configure_sqlite_batches)
