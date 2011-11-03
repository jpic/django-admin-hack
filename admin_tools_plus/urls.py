from django.conf import settings
from django.conf.urls.defaults import *
from django.views import generic

import views

urlpatterns = patterns('',
    url(
        r'^form/hack/$',
        views.FormHackView.as_view(),
        name='admin_tools_plus_form_hack'
    ),
)
