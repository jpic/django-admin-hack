from django.db import transaction
import re

from django.conf import settings
from django import http
from django.db.models import get_model
from django.views import generic
from django.contrib.contenttypes.models import ContentType
from django.utils import simplejson

from models import *
from forms import *

FORM_URL_REGEXP = r'/(?P<app>[a-z]+)/(?P<model>[a-z]+)/([0-9]+|(add))/'
LIST_URL_REGEXP = r'/(?P<app>[a-z]+)/(?P<model>[a-z]+)/$'

class AdminHackFormResetView(generic.View):
    def post(self, request, *args, **kwargs):
        name = request.POST['name']
        ctype = ContentType.objects.get(pk=request.POST['ctype'])
        Form.objects.get(name=name, contenttype=ctype).delete()
        return http.HttpResponse()

class AdminHackFormsUpdateView(generic.View):
    def post(self, request, *args, **kwargs):
        data = simplejson.loads(request.POST['forms'])

        for form_dict in data:
            if 'pk' in form_dict.keys():
                form = Form.objects.get(pk=form_dict['pk'])
            else:
                contenttype = ContentType.objects.get(pk=form_dict['contenttype']['pk'])
                try:
                    form = Form.objects.get(name=form_dict['name'], contenttype=contenttype)
                except Form.DoesNotExist:
                    form = Form(name=form_dict['name'], contenttype=contenttype)
                    form.save()

            form.from_dict(form_dict)
            form.save()


        contenttype = ContentType.objects.get(pk=form_dict['contenttype']['pk'])

        names = [f['name'] for f in data]
        Field.objects.filter(form=Form.objects.filter(contenttype=contenttype).exclude(name__in=names)).delete()

        forms = Form.objects.filter(contenttype=contenttype).select_related('field')
        response = http.HttpResponse(simplejson.dumps([f.to_dict() for f in forms]), 
            status=201)
        
        return response

class AdminHackUserProfileUpdateView(generic.UpdateView):
    form_class = AdminHackUserProfileForm
    model = AdminHackUserProfile

    def form_valid(self, form):
        self.object = form.save()
        return http.HttpResponse('OK', status=200)

    def form_invalid(self, form):
        return http.HttpResponse(form.errors, status=500)

class ExportView(generic.TemplateView):
    template_name = 'admin_hack/export.html'

    def get_context_data(self, **kwargs):
        self.model = get_model(self.request.GET.get('app'), self.request.GET.get('model'))
        self.queryset = self.model.objects.filter(
            pk__in=self.request.GET.get('pk'))

        return {
            'model': self.model,
            'queryset': self.queryset,
        }
