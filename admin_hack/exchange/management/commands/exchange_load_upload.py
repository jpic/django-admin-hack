from django.core.management.base import BaseCommand, CommandError

from admin_hack.exchange.models import Upload

class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            max_rows = int(args[1])
        except IndexError:
            max_rows = None
        Upload.objects.get(pk=args[0]).load(max_rows=max_rows)
