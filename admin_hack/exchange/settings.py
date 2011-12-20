from django.conf import settings

EXCHANGE_PARSER_CHOICES = getattr(settings, 'EXCHANGE_PARSER_CHOICES', (
    ('exchange.parsers.CsvParser', 'CSV'),
))
