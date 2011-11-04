from django.conf import settings
from django.conf.urls.defaults import *
from django.views import generic

import views

urlpatterns = patterns('',
    url(
        r'^js/$',
        views.JsHackView.as_view(),
        name='admin_hack_js_hack'
    ),
)
