from django import http
from django.views.decorators.csrf import csrf_exempt
from django.views import generic

from models import *
from utils import *

@csrf_exempt
def parser_form(request):
    template = Template.objects.get(pk=request.POST['pk'])
    response = template.parser.configuration_form(request)
    template.save()
    return response
