from django.apps import AppConfig


class CropsConfig(AppConfig):
    name = 'crops'

    def ready(self):
        import crops.signals
