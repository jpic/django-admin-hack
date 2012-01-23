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
        Form.objects.filter(contenttype=contenttype).exclude(name__in=names).delete()

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

class JsHackView(generic.TemplateView):
    template_name = 'admin_hack/hack.js'

    def render_to_response(self, context):
        return super(JsHackView, self).render_to_response(context,
            content_type='text/javascript')

    def get_context_data(self, **kwargs):
        c = kwargs
        url = self.request.META.get('HTTP_REFERER', '/admin/art/artist/')

        c['smuggler'] = 'smuggler' in settings.INSTALLED_APPS

        # impossible to get the model name from urlresolvers.resolve 
        # so here goes some regexp that will break when django.contrib.admin
        # change urls
        m = re.search(FORM_URL_REGEXP, url)
        if m is not None:
            model = get_model(m.group('app'), m.group('model'))
            for f in model._meta.fields:
                try:
                    if f.rel.to == Form:
                        c['change_view'] = True
                except:
                    continue

            ctype = ContentType.objects.get_for_model(model)
            c['contenttype'] = ctype
            forms = c['forms'] = Form.objects.filter(
                contenttype=ctype).select_related()
                        
            forms_dict = c['forms_dict'] = [f.to_dict() for f in forms]
            forms_pks = c['forms_pk'] = [f.pk for f in forms]
            c['forms_pk_json'] = simplejson.dumps(forms_pks)

            user_forms = self.request.user.adminhackuserprofile.forms
            try:
                last_form_pk = c['last_form_pk'] = user_forms.filter(
                        contenttype=ctype)[0].pk
            except IndexError:
                pass
        else:
            m = re.search(LIST_URL_REGEXP, url)
            if m is not None:
                c.update({
                    'list_view': True, 
                    'app': m.group('app'),
                    'model': m.group('model'),
                })
                model = get_model(m.group('app'), m.group('model'))
                c['model_verbose_name_plural'] = model._meta.verbose_name_plural

        return c
