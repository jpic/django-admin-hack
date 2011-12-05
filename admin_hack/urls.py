from django.conf import settings
from django.conf.urls.defaults import *
from django.views import generic
from django.views.decorators.csrf import csrf_exempt

import views

urlpatterns = patterns('',
    url(
        r'^js/$',
        views.JsHackView.as_view(),
        name='admin_hack_js_hack'
    ),
    url(
        r'^export/$',
        views.ExportView.as_view(),
        name='admin_hack_export',
    ),
    url(
        r'^userprofile/(?P<pk>[0-9]+)/update/$',
        csrf_exempt(views.AdminHackUserProfileUpdateView.as_view()),
        name='admin_hack_user_profile_update',
    ),
)
