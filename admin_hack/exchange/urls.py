from django.conf.urls.defaults import *
from django.views import generic

import views

urlpatterns = patterns('',
    url(
        r'^parser/form/$',
        views.parser_form, {
        }, 'yourlabs_exchange_parser_form'
    ),
)
