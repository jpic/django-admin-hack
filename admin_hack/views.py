import re

from django.conf import settings
from django import http
from django.db.models import get_model
from django.views import generic
from django.contrib.contenttypes.models import ContentType
from django.utils import simplejson

from models import *
from forms import *

FORM_URL_REGEXP = r'/(?P<app>[a-z]+)/(?P<model>[a-z]+)/([0-9]+|(add))/$'
LIST_URL_REGEXP = r'/(?P<app>[a-z]+)/(?P<model>[a-z]+)/$'

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
        self.model = get_model(request.GET.get('app'), request.GET.get('model'))
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
            c['change_view'] = True
            model = get_model(m.group('app'), m.group('model'))
            ctype = ContentType.objects.get_for_model(model)
            forms = c['forms'] = Form.objects.filter(
                contenttype=ctype).select_related()
                        
            forms_dict = c['forms_dict'] = [f.to_dict() for f in forms]

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
