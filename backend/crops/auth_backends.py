from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.db.models import Q

class EmailOrSurnameBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Query user by email or surname
            user = User.objects.get(Q(email=username) | Q(last_name=username))
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None