from django.conf.urls.defaults import *
from django.contrib.auth.decorators import login_required
from django.views import generic

import models
import views

urlpatterns = patterns('',
    url(
        r'^parser/form/$',
        views.parser_form, {
        }, 'yourlabs_exchange_parser_form'
    ),
    url(
        r'^process/$',
        login_required(generic.ListView.as_view(
            model=models.Process, paginate_by = 10)),
        name='yourlabs_exchange_process_list'
    ),
    url(
        r'^process/(?P<pk>[0-9]+)/$',
        login_required(generic.DetailView.as_view(
            model=models.Process)),
        name='yourlabs_exchange_process_detail'
    ),
)
