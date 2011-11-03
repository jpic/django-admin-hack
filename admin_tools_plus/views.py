import re

from django.db.models import get_model
from django.views import generic
from django.contrib.contenttypes.models import ContentType
from django.utils import simplejson

from models import *

FORM_URL_REGEXP = r'/(?P<app>[a-z]+)/(?P<model>[a-z]+)/([0-9]+|(add))/$'

class FormHackView(generic.TemplateView):
    template_name = 'admin_tools_plus/form_hack.js'

    def render_to_response(self, context):
        return super(FormHackView, self).render_to_response(context,
            content_type='text/javascript')

    def get_context_data(self, **kwargs):
        c = kwargs
        url = self.request.META.get('HTTP_REFERER', '/admin/art/artist/3/')

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

            c['forms_json'] = simplejson.dumps(forms_dict)

        return c
