from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Observation, UserProfile, AuditLog

@receiver(post_save, sender=Observation)
def log_observation_save(sender, instance, created, **kwargs):
    action = "Created Observation" if created else "Updated Observation"
    AuditLog.objects.create(
        user=instance.data_collector,
        action=action,
        resource_type="Observation",
        resource_id=str(instance.id),
        details={"field_id": instance.field.field_id, "date": str(instance.observation_date)}
    )

@receiver(post_delete, sender=Observation)
def log_observation_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        user=instance.data_collector,
        action="Deleted Observation",
        resource_type="Observation",
        resource_id=str(instance.id),
        details={"field_id": instance.field.field_id}
    )

@receiver(post_save, sender=UserProfile)
def log_role_change(sender, instance, created, **kwargs):
    if not created:
        AuditLog.objects.create(
            user=instance.user,
            action="Role Changed",
            resource_type="UserProfile",
            resource_id=str(instance.id),
            details={"new_role": instance.role}
        )
