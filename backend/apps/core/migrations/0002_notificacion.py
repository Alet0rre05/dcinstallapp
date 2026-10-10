import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Notificacion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("TICKET_MENSAJE", "Mensaje en un ticket"),
                            ("TICKET_CERRADO", "Ticket cerrado"),
                            ("TICKET_REABIERTO", "Ticket reabierto"),
                            ("VENCIMIENTOS", "Vencimientos"),
                        ],
                        max_length=20,
                    ),
                ),
                ("titulo", models.CharField(max_length=80)),
                ("mensaje", models.CharField(blank=True, max_length=255)),
                ("enlace", models.CharField(blank=True, max_length=200)),
                ("clave", models.CharField(blank=True, max_length=80)),
                ("leida", models.BooleanField(db_index=True, default=False)),
                (
                    "creada",
                    models.DateTimeField(
                        db_index=True, default=django.utils.timezone.now
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificaciones",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-creada", "-id"],
            },
        ),
        migrations.AddConstraint(
            model_name="notificacion",
            constraint=models.UniqueConstraint(
                condition=models.Q(("clave", ""), _negated=True),
                fields=("usuario", "clave"),
                name="uniq_notif_clave_por_usuario",
            ),
        ),
    ]
