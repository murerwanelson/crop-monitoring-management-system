from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.contrib.sessions.models import Session
from django.utils.timezone import now
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class EmailOrSurnameBackend(ModelBackend):
    """
    Authenticate using either Email or Surname (last_name).
    Handles dynamic IP changes by invalidating old sessions.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)

        try:
            # Check if the username matches an email or a last_name (surname)
            user = User.objects.get(Q(email=username) | Q(last_name__iexact=username))
            logger.debug(f"User found: {user}")
        except User.DoesNotExist:
            logger.debug("User does not exist.")
            return None
        except User.MultipleObjectsReturned:
            logger.debug("Multiple users found with the same surname.")
            return None

        if user.check_password(password):
            logger.debug("Password check passed.")
            if self.user_can_authenticate(user):
                return user
        else:
            logger.debug("Password check failed.")
        return None

    def invalidate_old_sessions(self, user):
        """Invalidate old sessions for the user to handle dynamic IP changes."""
        sessions = Session.objects.filter(expire_date__gte=now())
        for session in sessions:
            data = session.get_decoded()
            if data.get('_auth_user_id') == str(user.id):
                session.delete()
