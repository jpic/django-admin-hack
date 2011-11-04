from django import template
from django.utils import simplejson
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def as_json(data):
    return mark_safe(simplejson.dumps(data))
